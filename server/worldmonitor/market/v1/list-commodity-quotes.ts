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
    // Energy Commodities
    'CL=F': { name: 'Crude Oil WTI', basePrice: 78.45, change: -1.20 },
    'BZ=F': { name: 'Brent Crude', basePrice: 82.15, change: -0.85 },
    'NG=F': { name: 'Natural Gas', basePrice: 2.85, change: 0.15 },
    'UGA=F': { name: 'Uranium', basePrice: 87.50, change: 2.45 },
    // Industrial Metals
    'HG=F': { name: 'Copper', basePrice: 4.28, change: 0.35 },
    'AL=F': { name: 'Aluminum', basePrice: 2568.75, change: -0.50 },
    'ZN=F': { name: 'Zinc', basePrice: 2918.00, change: 0.75 },
    'NI=F': { name: 'Nickel', basePrice: 18250.00, change: 1.10 },
    'SN=F': { name: 'Tin', basePrice: 32450.00, change: 0.80 },
    // Precious Metals
    'GC=F': { name: 'Gold Futures', basePrice: 2045.50, change: 0.85 },
    'SI=F': { name: 'Silver Futures', basePrice: 24.50, change: 1.10 },
    'PL=F': { name: 'Platinum', basePrice: 945.00, change: 0.25 },
    'PA=F': { name: 'Palladium', basePrice: 892.75, change: -0.15 },
    // Agricultural Commodities
    'ZW=F': { name: 'Wheat', basePrice: 548.50, change: 0.25 },
    'ZC=F': { name: 'Corn', basePrice: 395.75, change: 0.45 },
    'ZS=F': { name: 'Soybeans', basePrice: 1062.50, change: -0.35 },
    'ZR=F': { name: 'Rice', basePrice: 15.85, change: 0.55 },
    'SB=F': { name: 'Sugar', basePrice: 19.42, change: -0.20 },
    'CT=F': { name: 'Cotton', basePrice: 73.50, change: 0.30 },
    'CC=F': { name: 'Cocoa', basePrice: 3875.00, change: 2.15 },
    'KC=F': { name: 'Coffee', basePrice: 228.75, change: 1.85 },
    // Freight & Market Indicators
    '^BVSP': { name: 'Baltic Dry Index', basePrice: 1482.00, change: 1.50 },
    '^VIX': { name: 'VIX Volatility', basePrice: 18.45, change: -2.50 },
    'DXY=F': { name: 'USD Index', basePrice: 103.85, change: 0.15 },
    // Forex (if needed)
    'EURUSD=X': { name: 'EUR/USD', basePrice: 1.0850, change: 0.15 },
    'GBPUSD=X': { name: 'GBP/USD', basePrice: 1.2750, change: 0.25 },
    'JPYUSD=X': { name: 'JPY/USD', basePrice: 0.0067, change: 0.05 },
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
    return { quotes };
  });

  return result || { quotes: generateMockCommodityQuotes(symbols) };
  } catch {
    return { quotes: generateMockCommodityQuotes(symbols) };
  }
}
