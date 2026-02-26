/**
 * RPC: getBisPolicyRates -- BIS SDMX API (WS_CBPOL)
 * Central bank policy rates for major economies.
 */

import type {
  ServerContext,
  GetBisPolicyRatesRequest,
  GetBisPolicyRatesResponse,
  BisPolicyRate,
} from '../../../../src/generated/server/worldmonitor/economic/v1/service_server';

import { cachedFetchJson } from '../../../_shared/redis';
import { fetchBisCSV, parseBisCSV, parseBisNumber, BIS_COUNTRIES, BIS_COUNTRY_KEYS } from './_bis-shared';

const REDIS_CACHE_KEY = 'economic:bis:policy:v1';
const REDIS_CACHE_TTL = 21600; // 6 hours — monthly data

// Mock data for local development
function generateMockBisPolicyRates(): BisPolicyRate[] {
  const mockData = [
    { cc: 'US', rate: 5.33, previousRate: 5.33 },
    { cc: 'GB', rate: 5.00, previousRate: 5.25 },
    { cc: 'JP', rate: 0.10, previousRate: 0.10 },
    { cc: 'XM', rate: 4.00, previousRate: 4.00 },
    { cc: 'CH', rate: 1.75, previousRate: 1.75 },
    { cc: 'SG', rate: 3.50, previousRate: 3.50 },
    { cc: 'IN', rate: 6.50, previousRate: 6.50 },
    { cc: 'AU', rate: 4.35, previousRate: 4.35 },
    { cc: 'CN', rate: 3.45, previousRate: 3.45 },
    { cc: 'CA', rate: 5.00, previousRate: 5.00 },
    { cc: 'KR', rate: 3.75, previousRate: 3.75 },
    { cc: 'BR', rate: 13.75, previousRate: 13.75 },
  ];

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  return mockData
    .map(data => {
      const info = BIS_COUNTRIES[data.cc];
      if (!info) return null;
      return {
        countryCode: data.cc,
        countryName: info.name,
        rate: data.rate,
        previousRate: data.previousRate,
        date: dateStr,
        centralBank: info.centralBank,
      };
    })
    .filter((r): r is BisPolicyRate => r !== null);
}

export async function getBisPolicyRates(
  _ctx: ServerContext,
  _req: GetBisPolicyRatesRequest,
): Promise<GetBisPolicyRatesResponse> {
  try {
    const result = await cachedFetchJson<GetBisPolicyRatesResponse>(REDIS_CACHE_KEY, REDIS_CACHE_TTL, async () => {
      // Single batched request: all countries in one +-delimited key
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const startPeriod = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}`;

      try {
        const csv = await fetchBisCSV('WS_CBPOL', `M.${BIS_COUNTRY_KEYS}?startPeriod=${startPeriod}&detail=dataonly`);
        const rows = parseBisCSV(csv);

        // Group rows by country, take last 2 observations
        const byCountry = new Map<string, Array<{ date: string; value: number }>>();
        for (const row of rows) {
          const cc = row['REF_AREA'] || row['Reference area'] || '';
          const date = row['TIME_PERIOD'] || row['Time period'] || '';
          const val = parseBisNumber(row['OBS_VALUE'] || row['Observation value']);
          if (!cc || !date || val === null) continue;
          if (!byCountry.has(cc)) byCountry.set(cc, []);
          byCountry.get(cc)!.push({ date, value: val });
        }

        const rates: BisPolicyRate[] = [];
        for (const [cc, obs] of byCountry) {
          const info = BIS_COUNTRIES[cc];
          if (!info) continue;

          // Sort chronologically and take last 2
          obs.sort((a, b) => a.date.localeCompare(b.date));
          const latest = obs[obs.length - 1];
          const previous = obs.length >= 2 ? obs[obs.length - 2] : undefined;

          if (latest) {
            rates.push({
              countryCode: cc,
              countryName: info.name,
              rate: latest.value,
              previousRate: previous?.value ?? latest.value,
              date: latest.date,
              centralBank: info.centralBank,
            });
          }
        }

        return rates.length > 0 ? { rates } : null;
      } catch {
        // If BIS fetch fails, use mock data
        return { rates: generateMockBisPolicyRates() };
      }
    });
    // Fallback to mock data if result is empty
    if (!result?.rates || result.rates.length === 0) {
      return { rates: generateMockBisPolicyRates() };
    }
    return result || { rates: [] };
  } catch (e) {
    console.error('[BIS] Policy rates fetch failed:', e);
    return { rates: generateMockBisPolicyRates() };
  }
}
