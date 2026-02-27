/**
 * RPC: ListMarketQuotes
 * Fetches stock/index quotes from Finnhub (stocks) and Yahoo Finance (indices/futures).
 */

declare const process: { env: Record<string, string | undefined> };

import type {
  ServerContext,
  ListMarketQuotesRequest,
  ListMarketQuotesResponse,
  MarketQuote,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { YAHOO_ONLY_SYMBOLS, fetchFinnhubQuote, fetchYahooQuotesBatch } from './_shared';
import { cachedFetchJson } from '../../../_shared/redis';

const REDIS_CACHE_KEY = 'market:quotes:v1';
const REDIS_CACHE_TTL = 120; // 2 min — shared across all Vercel instances

const quotesCache = new Map<string, { data: ListMarketQuotesResponse; timestamp: number }>();
const QUOTES_CACHE_TTL = 120_000; // 2 minutes (in-memory fallback)

function cacheKey(symbols: string[]): string {
  return [...symbols].sort().join(',');
}

function redisCacheKey(symbols: string[]): string {
  return `${REDIS_CACHE_KEY}:${[...symbols].sort().join(',')}`;
}

// Mock data for local development (when API keys are not available)
function generateMockQuotes(symbols: string[]): MarketQuote[] {
  const mockData: Record<string, { name: string; basePrice: number; change: number }> = {
    'AAPL': { name: 'Apple Inc.', basePrice: 190.50, change: 1.25 },
    'GOOGL': { name: 'Alphabet Inc.', basePrice: 142.80, change: -0.85 },
    'MSFT': { name: 'Microsoft Corp.', basePrice: 375.40, change: 2.15 },
    'TSLA': { name: 'Tesla Inc.', basePrice: 238.90, change: -1.50 },
    'AMZN': { name: 'Amazon.com Inc.', basePrice: 181.20, change: 0.95 },
    'META': { name: 'Meta Platforms Inc.', basePrice: 485.30, change: 3.20 },
    'NVDA': { name: 'NVIDIA Corp.', basePrice: 875.50, change: 4.10 },
    'SPY': { name: 'S&P 500 ETF', basePrice: 450.75, change: 0.75 },
  };

  return symbols
    .map(symbol => {
      const mock = mockData[symbol];
      if (!mock) return null;
      return {
        symbol,
        name: mock.name,
        display: symbol,
        price: mock.basePrice,
        change: mock.change,
        sparkline: Array.from({ length: 30 }, (_, i) => mock.basePrice + (Math.sin(i / 5) * 5) + Math.random() * 2 - 1),
      };
    })
    .filter((q): q is MarketQuote => q !== null);
}

export async function listMarketQuotes(
  _ctx: ServerContext,
  req: ListMarketQuotesRequest,
): Promise<ListMarketQuotesResponse> {
  const now = Date.now();
  const key = cacheKey(req.symbols);

  // Layer 1: in-memory cache (same instance)
  const memCached = quotesCache.get(key);
  if (memCached && now - memCached.timestamp < QUOTES_CACHE_TTL) {
    return memCached.data;
  }

  const redisKey = redisCacheKey(req.symbols);

  try {
  const result = await cachedFetchJson<ListMarketQuotesResponse>(redisKey, REDIS_CACHE_TTL, async () => {
    const apiKey = process.env.FINNHUB_API_KEY;
    const symbols = req.symbols;
    if (!symbols.length) return { quotes: [], finnhubSkipped: !apiKey, skipReason: !apiKey ? 'FINNHUB_API_KEY not configured' : '' };

    const finnhubSymbols = symbols.filter((s) => !YAHOO_ONLY_SYMBOLS.has(s));
    const yahooSymbols = symbols.filter((s) => YAHOO_ONLY_SYMBOLS.has(s));

    const quotes: MarketQuote[] = [];

    // If FINNHUB API key missing, skip Finnhub but still fetch Yahoo-only symbols.
    if (!apiKey) {
      // Try to fetch Yahoo symbols via Yahoo even when FINNHUB_API_KEY is not configured
      if (yahooSymbols.length > 0) {
        const batch = await fetchYahooQuotesBatch(yahooSymbols);
        for (const s of yahooSymbols) {
          const yahoo = batch.get(s);
          if (yahoo) {
            quotes.push({
              symbol: s,
              name: s,
              display: s,
              price: yahoo.price,
              change: yahoo.change,
              sparkline: yahoo.sparkline,
            });
          }
        }
      }

      // For symbols that would be fetched from Finnhub, fall back to mock data
      if (finnhubSymbols.length > 0) {
        const mockQuotes = generateMockQuotes(finnhubSymbols);
        quotes.push(...mockQuotes);
      }

      return { quotes, finnhubSkipped: true, skipReason: 'FINNHUB_API_KEY not configured' };
    }

    // Fetch Finnhub quotes (only if API key is set)
    if (finnhubSymbols.length > 0 && apiKey) {
      const results = await Promise.all(
        finnhubSymbols.map((s) => fetchFinnhubQuote(s, apiKey)),
      );
      for (const r of results) {
        if (r) {
          quotes.push({
            symbol: r.symbol,
            name: r.symbol,
            display: r.symbol,
            price: r.price,
            change: r.changePercent,
            sparkline: [],
          });
        }
      }
    }

    // Fetch Yahoo Finance quotes for indices/futures (staggered to avoid 429)
    if (yahooSymbols.length > 0) {
      const batch = await fetchYahooQuotesBatch(yahooSymbols);
      for (const s of yahooSymbols) {
        const yahoo = batch.get(s);
        if (yahoo) {
          quotes.push({
            symbol: s,
            name: s,
            display: s,
            price: yahoo.price,
            change: yahoo.change,
            sparkline: yahoo.sparkline,
          });
        }
      }
    }

    // Stale-while-revalidate: if Yahoo rate-limited and no fresh data, serve cached
    if (quotes.length === 0 && memCached) {
      return memCached.data;
    }

    if (quotes.length === 0) return null;

    return { quotes, finnhubSkipped: !apiKey, skipReason: !apiKey ? 'FINNHUB_API_KEY not configured' : '' };
  });

  if (result?.quotes?.length) {
    quotesCache.set(key, { data: result, timestamp: now });
  }

  return result || memCached?.data || { quotes: [], finnhubSkipped: false, skipReason: '' };
  } catch {
    return memCached?.data || { quotes: [], finnhubSkipped: false, skipReason: '' };
  }
}
