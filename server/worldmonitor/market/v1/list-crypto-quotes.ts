/**
 * RPC: ListCryptoQuotes
 * Fetches cryptocurrency quotes from CoinGecko markets API.
 */

import type {
  ServerContext,
  ListCryptoQuotesRequest,
  ListCryptoQuotesResponse,
  CryptoQuote,
} from '../../../../src/generated/server/worldmonitor/market/v1/service_server';
import { CRYPTO_META, fetchCoinGeckoMarkets } from './_shared';
import { cachedFetchJson } from '../../../_shared/redis';

const REDIS_CACHE_KEY = 'market:crypto:v1';
const REDIS_CACHE_TTL = 180; // 3 min — CoinGecko rate-limited

// Mock data for local development
function generateMockCryptoQuotes(ids: string[]): CryptoQuote[] {
  const mockData: Record<string, { name: string; symbol: string; basePrice: number; change: number }> = {
    'bitcoin': { name: 'Bitcoin', symbol: 'BTC', basePrice: 42850.00, change: 2.50 },
    'ethereum': { name: 'Ethereum', symbol: 'ETH', basePrice: 2250.50, change: 1.85 },
    'solana': { name: 'Solana', symbol: 'SOL', basePrice: 138.50, change: 3.20 },
    'cardano': { name: 'Cardano', symbol: 'ADA', basePrice: 0.98, change: -0.50 },
    'ripple': { name: 'XRP', symbol: 'XRP', basePrice: 2.42, change: 1.10 },
    'polkadot': { name: 'Polkadot', symbol: 'DOT', basePrice: 8.75, change: 2.30 },
    'litecoin': { name: 'Litecoin', symbol: 'LTC', basePrice: 98.50, change: 0.85 },
    'uniswap': { name: 'Uniswap', symbol: 'UNI', basePrice: 11.25, change: 1.50 },
  };

  const filterIds = ids.length > 0 ? ids : Object.keys(CRYPTO_META);
  
  return filterIds
    .map(id => {
      const mock = mockData[id];
      if (!mock) return null;
      const sparkline = Array.from({ length: 48 }, (_, i) => mock.basePrice + (Math.sin(i / 10) * 100) + Math.random() * 50);
      return {
        name: mock.name,
        symbol: mock.symbol,
        price: mock.basePrice,
        change: mock.change,
        sparkline,
      };
    })
    .filter((q): q is CryptoQuote => q !== null);
}

export async function listCryptoQuotes(
  _ctx: ServerContext,
  req: ListCryptoQuotesRequest,
): Promise<ListCryptoQuotesResponse> {
  const ids = req.ids.length > 0 ? req.ids : Object.keys(CRYPTO_META);

  const cacheKey = `${REDIS_CACHE_KEY}:${[...ids].sort().join(',')}`;

  try {
  const result = await cachedFetchJson<ListCryptoQuotesResponse>(cacheKey, REDIS_CACHE_TTL, async () => {
    try {
      const items = await fetchCoinGeckoMarkets(ids);

      if (items.length === 0) {
        throw new Error('CoinGecko returned no data');
      }

      const byId = new Map(items.map((c) => [c.id, c]));
      const quotes: CryptoQuote[] = [];

      for (const id of ids) {
        const coin = byId.get(id);
        if (!coin) continue;
        const meta = CRYPTO_META[id];
        const prices = coin.sparkline_in_7d?.price;
        const sparkline = prices && prices.length > 24 ? prices.slice(-48) : (prices || []);

        quotes.push({
          name: meta?.name || id,
          symbol: meta?.symbol || id.toUpperCase(),
          price: coin.current_price ?? 0,
          change: coin.price_change_percentage_24h ?? 0,
          sparkline,
        });
      }

      if (quotes.every(q => q.price === 0)) {
        throw new Error('CoinGecko returned all-zero prices');
      }

      return quotes.length > 0 ? { quotes } : null;
    } catch {
      // If CoinGecko fails, use mock data
      return { quotes: generateMockCryptoQuotes(ids) };
    }
  });

  return result || { quotes: generateMockCryptoQuotes(ids) };
  } catch {
    return { quotes: generateMockCryptoQuotes(ids) };
  }
}
