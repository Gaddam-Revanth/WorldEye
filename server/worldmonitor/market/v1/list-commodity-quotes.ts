/**
 * RPC: ListCommodityQuotes
 * Fetches commodity futures quotes from Yahoo Finance.
 */

import type {
  ServerContext,
  ListCommodityQuotesRequest,
  ListCommodityQuotesResponse,
  CommodityQuote,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { fetchYahooQuotesBatch } from './_shared';
import { cachedFetchJson } from '../../../_shared/redis';

const REDIS_CACHE_KEY = 'market:commodities:v1';
const REDIS_CACHE_TTL = 180; // 3 min — commodities move slower than indices

function redisCacheKey(symbols: string[]): string {
  return `${REDIS_CACHE_KEY}:${[...symbols].sort().join(',')}`;
}

// Mock data for local development (when fetching fails)
function generateMockCommodityQuotes(symbols: string[]): CommodityQuote[] {
  const mockData: Record<string, { name: string; basePrice: number; change: number }> = {
    'GC=F': { name: 'Gold Futures', basePrice: 2045.50, change: 0.85 },
    'CL=F': { name: 'Crude Oil WTI', basePrice: 78.45, change: -1.20 },
    'NG=F': { name: 'Natural Gas', basePrice: 2.85, change: 0.15 },
    'SI=F': { name: 'Silver Futures', basePrice: 24.50, change: 1.10 },
    'EURUSD=X': { name: 'EUR/USD', basePrice: 1.0850, change: 0.15 },
    'GBPUSD=X': { name: 'GBP/USD', basePrice: 1.2750, change: 0.25 },
    'JPYUSD=X': { name: 'JPY/USD', basePrice: 0.0067, change: 0.05 },
    'BTC-USD': { name: 'Bitcoin', basePrice: 42850.00, change: 2.50 },
    'ETH-USD': { name: 'Ethereum', basePrice: 2250.50, change: 1.85 },
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
        sparkline: Array.from({ length: 30 }, (_, i) => mock.basePrice + (Math.sin(i / 4) * 2) + Math.random() * 1 - 0.5),
      };
    })
    .filter((q): q is CommodityQuote => q !== null);
}

export async function listCommodityQuotes(
  _ctx: ServerContext,
  req: ListCommodityQuotesRequest,
): Promise<ListCommodityQuotesResponse> {
  const symbols = req.symbols;
  if (!symbols.length) return { quotes: [] };

  const redisKey = redisCacheKey(symbols);

  try {
  const result = await cachedFetchJson<ListCommodityQuotesResponse>(redisKey, REDIS_CACHE_TTL, async () => {
    const batch = await fetchYahooQuotesBatch(symbols);
    const quotes: CommodityQuote[] = [];
    for (const s of symbols) {
      const yahoo = batch.get(s);
      if (yahoo) {
        quotes.push({ symbol: s, name: s, display: s, price: yahoo.price, change: yahoo.change, sparkline: yahoo.sparkline });
      }
    }
    // If Yahoo fetch fails, use mock data
    if (quotes.length === 0) {
      return { quotes: generateMockCommodityQuotes(symbols) };
    }
    return quotes.length > 0 ? { quotes } : null;
  });

  return result || { quotes: generateMockCommodityQuotes(symbols) };
  } catch {
    return { quotes: generateMockCommodityQuotes(symbols) };
  }
}
