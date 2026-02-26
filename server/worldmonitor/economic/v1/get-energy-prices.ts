/**
 * RPC: getEnergyPrices -- EIA Open Data API v2
 * Energy commodity price data (WTI, Brent, etc.)
 */

declare const process: { env: Record<string, string | undefined> };

import type {
  ServerContext,
  GetEnergyPricesRequest,
  GetEnergyPricesResponse,
  EnergyPrice,
} from '../../../../src/generated/server/worldmonitor/economic/v1/service_server';

import { CHROME_UA } from '../../../_shared/constants';
import { cachedFetchJson } from '../../../_shared/redis';

const REDIS_CACHE_KEY = 'economic:energy:v1';
const REDIS_CACHE_TTL = 3600; // 1 hr — weekly EIA data

interface EiaSeriesConfig {
  commodity: string;
  name: string;
  unit: string;
  apiPath: string;
  seriesFacet: string;
}

const EIA_SERIES: EiaSeriesConfig[] = [
  {
    commodity: 'wti',
    name: 'WTI Crude Oil',
    unit: '$/barrel',
    apiPath: '/v2/petroleum/pri/spt/data/',
    seriesFacet: 'RWTC',
  },
  {
    commodity: 'brent',
    name: 'Brent Crude Oil',
    unit: '$/barrel',
    apiPath: '/v2/petroleum/pri/spt/data/',
    seriesFacet: 'RBRTE',
  },
];

async function fetchEiaSeries(
  config: EiaSeriesConfig,
  apiKey: string,
): Promise<EnergyPrice | null> {
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      'data[]': 'value',
      frequency: 'weekly',
      'facets[series][]': config.seriesFacet,
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      length: '2',
    });

    const response = await fetch(`https://api.eia.gov${config.apiPath}?${params}`, {
      headers: { Accept: 'application/json', 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json() as {
      response?: { data?: Array<{ period?: string; value?: number }> };
    };

    const rows = data.response?.data;
    if (!rows || rows.length === 0) return null;

    const current = rows[0]!;
    const previous = rows[1];

    const price = current.value ?? 0;
    const prevPrice = previous?.value ?? price;
    const change = prevPrice !== 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
    const priceAt = current.period ? new Date(current.period).getTime() : Date.now();

    return {
      commodity: config.commodity,
      name: config.name,
      price,
      unit: config.unit,
      change: Math.round(change * 10) / 10,
      priceAt: Number.isFinite(priceAt) ? priceAt : Date.now(),
    };
  } catch {
    return null;
  }
}

async function fetchEnergyPrices(commodities: string[]): Promise<EnergyPrice[]> {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) return [];

  const series = commodities.length > 0
    ? EIA_SERIES.filter((s) => commodities.includes(s.commodity))
    : EIA_SERIES;

  const results = await Promise.all(series.map((s) => fetchEiaSeries(s, apiKey)));
  return results.filter((p): p is EnergyPrice => p !== null);
}

// Mock data for local development (when EIA_API_KEY is not available)
function generateMockEnergyPrices(commodities?: string[]): EnergyPrice[] {
  const mockData: Record<string, { name: string; basePrice: number; change: number; unit: string }> = {
    'wti': { name: 'WTI Crude Oil', basePrice: 78.45, change: -1.20, unit: '$/barrel' },
    'brent': { name: 'Brent Crude Oil', basePrice: 82.50, change: -0.85, unit: '$/barrel' },
  };

  const series = commodities && commodities.length > 0
    ? EIA_SERIES.filter((s) => commodities.includes(s.commodity))
    : EIA_SERIES;

  return series.map((s) => {
    const mock = mockData[s.commodity];
    if (!mock) return null;
    return {
      commodity: s.commodity,
      name: mock.name,
      price: mock.basePrice,
      unit: mock.unit,
      change: mock.change,
      priceAt: Date.now(),
    };
  }).filter((p): p is EnergyPrice => p !== null);
}

export async function getEnergyPrices(
  _ctx: ServerContext,
  req: GetEnergyPricesRequest,
): Promise<GetEnergyPricesResponse> {
  try {
    const cacheKey = `${REDIS_CACHE_KEY}:${[...req.commodities].sort().join(',') || 'all'}`;
    const result = await cachedFetchJson<GetEnergyPricesResponse>(cacheKey, REDIS_CACHE_TTL, async () => {
      const prices = await fetchEnergyPrices(req.commodities);
      // If no API key, use mock data
      if (!process.env.EIA_API_KEY && (!prices || prices.length === 0)) {
        return { prices: generateMockEnergyPrices(req.commodities) };
      }
      return prices.length > 0 ? { prices } : null;
    });
    // Fallback to mock data if result is empty and no API key
    if (!result?.prices || result.prices.length === 0) {
      if (!process.env.EIA_API_KEY) {
        return { prices: generateMockEnergyPrices(req.commodities) };
      }
    }
    return result || { prices: [] };
  } catch {
    // On error, try mock data if no API key
    if (!process.env.EIA_API_KEY) {
      return { prices: generateMockEnergyPrices(req.commodities) };
    }
    return { prices: [] };
  }
}
