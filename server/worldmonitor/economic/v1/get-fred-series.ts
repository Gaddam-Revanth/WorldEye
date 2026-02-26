/**
 * RPC: getFredSeries -- Federal Reserve Economic Data (FRED) time series
 * Port from api/fred-data.js
 */

declare const process: { env: Record<string, string | undefined> };

import type {
  ServerContext,
  GetFredSeriesRequest,
  GetFredSeriesResponse,
  FredSeries,
  FredObservation,
} from '../../../../src/generated/server/worldmonitor/economic/v1/service_server';

import { cachedFetchJson } from '../../../_shared/redis';

const FRED_API_BASE = 'https://api.stlouisfed.org/fred';
const REDIS_CACHE_KEY = 'economic:fred:v1';
const REDIS_CACHE_TTL = 3600; // 1 hr — FRED data updates infrequently

// Mock data for local development
function generateMockFredSeries(seriesId: string, limit: number): FredSeries {
  const mockMetadata: Record<string, { title: string; units: string; frequency: string; baseValue: number }> = {
    'WALCL': { title: 'Fed Total Assets', units: 'Billions of U.S. Dollars', frequency: 'Weekly', baseValue: 7100 },
    'FEDFUNDS': { title: 'Effective Federal Funds Rate', units: 'Percent', frequency: 'Daily', baseValue: 5.33 },
    'T10Y2Y': { title: '10-Year Minus 2-Year Treasury Spread', units: 'Percent', frequency: 'Daily', baseValue: 0.50 },
    'UNRATE': { title: 'Civilian Unemployment Rate', units: 'Percent', frequency: 'Monthly', baseValue: 3.85 },
    'CPIAUCSL': { title: 'Consumer Price Index for All Urban Consumers', units: 'Index 1982-1984=100', frequency: 'Monthly', baseValue: 312.5 },
    'DGS10': { title: '10-Year Treasury Rate', units: 'Percent', frequency: 'Daily', baseValue: 4.25 },
    'VIXCLS': { title: 'CBOE Volatility Index', units: 'Index', frequency: 'Daily', baseValue: 18.5 },
  };

  const meta = mockMetadata[seriesId] || { title: seriesId, units: 'Value', frequency: 'Daily', baseValue: 100 };
  const limiter = limit > 0 ? Math.min(limit, 120) : 120;
  
  const observations: FredObservation[] = Array.from({ length: limiter }, (_, i) => {
    const daysAgo = limiter - i;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const value = meta.baseValue + (Math.sin(daysAgo / 10) * 2) + Math.random() * 1;
    return {
      date: date.toISOString().split('T')[0],
      value: Math.max(0, value),
    };
  });

  return {
    seriesId,
    title: meta.title,
    units: meta.units,
    frequency: meta.frequency,
    observations,
  };
}

async function fetchFredSeries(req: GetFredSeriesRequest): Promise<FredSeries | undefined> {
  try {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) return undefined;

    const limit = req.limit > 0 ? Math.min(req.limit, 1000) : 120;

    // Fetch observations and series metadata in parallel
    const obsParams = new URLSearchParams({
      series_id: req.seriesId,
      api_key: apiKey,
      file_type: 'json',
      sort_order: 'desc',
      limit: String(limit),
    });

    const metaParams = new URLSearchParams({
      series_id: req.seriesId,
      api_key: apiKey,
      file_type: 'json',
    });

    const [obsResponse, metaResponse] = await Promise.all([
      fetch(`${FRED_API_BASE}/series/observations?${obsParams}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      }),
      fetch(`${FRED_API_BASE}/series?${metaParams}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      }),
    ]);

    if (!obsResponse.ok) return undefined;

    const obsData = await obsResponse.json() as { observations?: Array<{ date: string; value: string }> };

    const observations: FredObservation[] = (obsData.observations || [])
      .map((obs) => {
        const value = parseFloat(obs.value);
        if (isNaN(value) || obs.value === '.') return null;
        return { date: obs.date, value };
      })
      .filter((o): o is FredObservation => o !== null)
      .reverse(); // oldest first

    let title = req.seriesId;
    let units = '';
    let frequency = '';

    if (metaResponse.ok) {
      const metaData = await metaResponse.json() as { seriess?: Array<{ title?: string; units?: string; frequency?: string }> };
      const meta = metaData.seriess?.[0];
      if (meta) {
        title = meta.title || req.seriesId;
        units = meta.units || '';
        frequency = meta.frequency || '';
      }
    }

    return {
      seriesId: req.seriesId,
      title,
      units,
      frequency,
      observations,
    };
  } catch {
    return undefined;
  }
}

export async function getFredSeries(
  _ctx: ServerContext,
  req: GetFredSeriesRequest,
): Promise<GetFredSeriesResponse> {
  try {
    const cacheKey = `${REDIS_CACHE_KEY}:${req.seriesId}:${req.limit || 0}`;
    const result = await cachedFetchJson<GetFredSeriesResponse>(cacheKey, REDIS_CACHE_TTL, async () => {
      const series = await fetchFredSeries(req);
      // If FRED_API_KEY is not available, generate mock data
      if (!series && !process.env.FRED_API_KEY) {
        const mockSeries = generateMockFredSeries(req.seriesId, req.limit);
        return { series: mockSeries };
      }
      return series ? { series } : null;
    });
    // Fallback to mock data if result is empty and no API key
    if (!result?.series && !process.env.FRED_API_KEY) {
      const mockSeries = generateMockFredSeries(req.seriesId, req.limit);
      return { series: mockSeries };
    }
    return result || { series: undefined };
  } catch {
    // On error, try mock data if no API key
    if (!process.env.FRED_API_KEY) {
      const mockSeries = generateMockFredSeries(req.seriesId, req.limit);
      return { series: mockSeries };
    }
    return { series: undefined };
  }
}
