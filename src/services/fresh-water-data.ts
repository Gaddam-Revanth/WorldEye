/**
 * Fresh Water Resources Data Service
 * Provides global fresh water availability, stress, and cost data by country.
 * Water is indeed the next gold - this service tracks freshwater resources worldwide.
 */

import { createCircuitBreaker } from '@/utils';

// allow use of process.env in browser builds without node types
declare const process: any;

// ---- Types ----

export interface FreshWaterCountryData {
  countryCode: string;
  countryName: string;
  totalRenewableWater: number; // cubic kilometers per year
  waterStressLevel: 'low' | 'moderate' | 'high' | 'critical'; // 0-10%, 10-20%, 20-40%, >40%
  perCapitaWater: number; // cubic meters per person per year
  costPerCubicMeter: number; // USD
  accessPercentage: number; // % of population with access
  trend: 'improving' | 'stable' | 'declining'; // based on historical trends
  lastUpdated: string; // ISO date
}

export interface FreshWaterGlobalStats {
  globalAverageStress: number; // percentage
  totalRenewableWater: number; // billion cubic km
  affectedPopulation: number; // millions without access
  criticalCountries: string[]; // country codes in water stress
  regionalData: Array<{
    region: string;
    averageStress: number;
    countries: number;
    affectedPopulation: number;
  }>;
}

export interface FreshWaterData {
  timestamp: string;
  globalStats: FreshWaterGlobalStats;
  countries: FreshWaterCountryData[];
}

// ---- Circuit Breaker ----

const freshWaterBreaker = createCircuitBreaker<FreshWaterData>({
  name: 'Fresh Water Data',
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours
  persistCache: true,
});

// ---- World Bank API Helper ----

async function fetchWorldBankPerCapita(): Promise<Record<string, number>> {
  const url = 'https://api.worldbank.org/v2/country/all/indicator/ER.H2O.INTR.PC?format=json&per_page=500&date=2020';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`World Bank request failed: ${resp.status}`);
  const json = await resp.json();
  const map: Record<string, number> = {};
  if (Array.isArray(json) && json[1]) {
    for (const item of json[1]) {
      if (item?.country?.id && item.value != null) {
        map[item.country.id] = item.value;
      }
    }
  }
  return map;
}

// ---- Mock Data (World Bank / AQUASTAT compatible) ----
// Static data source: World Bank indicator ER.H2O.INTR.PC provides
// renewable freshwater per capita (m³/person/year). Free public API
// is available at https://api.worldbank.org/v2/country/all/indicator/ER.H2O.INTR.PC
// The service can optionally pull these values during fetch if the
// environment variable `USE_WORLD_BANK_WATER` is truthy. This preserves
// the existing mock dataset while giving realistic numbers when
// connectivity is available.

const MOCK_FRESH_WATER_DATA: FreshWaterCountryData[] = [
  // High water-rich countries
  { countryCode: 'BR', countryName: 'Brazil', totalRenewableWater: 8233, waterStressLevel: 'low', perCapitaWater: 41950, costPerCubicMeter: 1.25, accessPercentage: 98.2, trend: 'stable', lastUpdated: '2025-12-01' },
  { countryCode: 'RU', countryName: 'Russia', totalRenewableWater: 4507, waterStressLevel: 'low', perCapitaWater: 30784, costPerCubicMeter: 0.95, accessPercentage: 99.5, trend: 'stable', lastUpdated: '2025-12-01' },
  { countryCode: 'CA', countryName: 'Canada', totalRenewableWater: 2902, waterStressLevel: 'low', perCapitaWater: 88790, costPerCubicMeter: 1.85, accessPercentage: 99.8, trend: 'stable', lastUpdated: '2025-12-01' },
  { countryCode: 'US', countryName: 'United States', totalRenewableWater: 2841, waterStressLevel: 'moderate', perCapitaWater: 8589, costPerCubicMeter: 2.10, accessPercentage: 99.1, trend: 'declining', lastUpdated: '2025-12-01' },
  { countryCode: 'ID', countryName: 'Indonesia', totalRenewableWater: 2838, waterStressLevel: 'moderate', perCapitaWater: 10530, costPerCubicMeter: 1.45, accessPercentage: 91.2, trend: 'stable', lastUpdated: '2025-12-01' },
  
  // Moderate water availability
  { countryCode: 'IN', countryName: 'India', totalRenewableWater: 1944, waterStressLevel: 'high', perCapitaWater: 1357, costPerCubicMeter: 0.75, accessPercentage: 86.4, trend: 'declining', lastUpdated: '2025-12-01' },
  { countryCode: 'CN', countryName: 'China', totalRenewableWater: 2812, waterStressLevel: 'high', perCapitaWater: 1984, costPerCubicMeter: 1.55, accessPercentage: 95.2, trend: 'declining', lastUpdated: '2025-12-01' },
  { countryCode: 'AU', countryName: 'Australia', totalRenewableWater: 492, waterStressLevel: 'high', perCapitaWater: 19290, costPerCubicMeter: 2.45, accessPercentage: 97.8, trend: 'declining', lastUpdated: '2025-12-01' },
  { countryCode: 'GB', countryName: 'United Kingdom', totalRenewableWater: 147, waterStressLevel: 'low', perCapitaWater: 2240, costPerCubicMeter: 2.65, accessPercentage: 99.6, trend: 'stable', lastUpdated: '2025-12-01' },
  { countryCode: 'DE', countryName: 'Germany', totalRenewableWater: 188, waterStressLevel: 'low', perCapitaWater: 2289, costPerCubicMeter: 3.10, accessPercentage: 99.7, trend: 'stable', lastUpdated: '2025-12-01' },
  
  // Water stress countries
  { countryCode: 'EG', countryName: 'Egypt', totalRenewableWater: 58, waterStressLevel: 'critical', perCapitaWater: 552, costPerCubicMeter: 0.85, accessPercentage: 76.3, trend: 'declining', lastUpdated: '2025-12-01' },
  { countryCode: 'PK', countryName: 'Pakistan', totalRenewableWater: 246, waterStressLevel: 'critical', perCapitaWater: 1115, costPerCubicMeter: 0.50, accessPercentage: 82.1, trend: 'declining', lastUpdated: '2025-12-01' },
  { countryCode: 'SA', countryName: 'Saudi Arabia', totalRenewableWater: 2.4, waterStressLevel: 'critical', perCapitaWater: 81, costPerCubicMeter: 3.75, accessPercentage: 94.5, trend: 'declining', lastUpdated: '2025-12-01' },
  { countryCode: 'AE', countryName: 'United Arab Emirates', totalRenewableWater: 0.15, waterStressLevel: 'critical', perCapitaWater: 14, costPerCubicMeter: 4.50, accessPercentage: 98.2, trend: 'declining', lastUpdated: '2025-12-01' },
  { countryCode: 'IL', countryName: 'Israel', totalRenewableWater: 1.9, waterStressLevel: 'critical', perCapitaWater: 229, costPerCubicMeter: 2.85, accessPercentage: 96.8, trend: 'stable', lastUpdated: '2025-12-01' },
  
  // Additional major countries
  { countryCode: 'JP', countryName: 'Japan', totalRenewableWater: 430, waterStressLevel: 'moderate', perCapitaWater: 3383, costPerCubicMeter: 2.15, accessPercentage: 99.8, trend: 'stable', lastUpdated: '2025-12-01' },
  { countryCode: 'FR', countryName: 'France', totalRenewableWater: 211, waterStressLevel: 'low', perCapitaWater: 3284, costPerCubicMeter: 2.95, accessPercentage: 99.8, trend: 'stable', lastUpdated: '2025-12-01' },
  { countryCode: 'MX', countryName: 'Mexico', totalRenewableWater: 432, waterStressLevel: 'high', perCapitaWater: 3381, costPerCubicMeter: 1.35, accessPercentage: 92.3, trend: 'declining', lastUpdated: '2025-12-01' },
  { countryCode: 'NG', countryName: 'Nigeria', totalRenewableWater: 286, waterStressLevel: 'moderate', perCapitaWater: 1338, costPerCubicMeter: 0.65, accessPercentage: 79.2, trend: 'declining', lastUpdated: '2025-12-01' },
  { countryCode: 'KE', countryName: 'Kenya', totalRenewableWater: 30, waterStressLevel: 'high', perCapitaWater: 544, costPerCubicMeter: 1.15, accessPercentage: 67.4, trend: 'declining', lastUpdated: '2025-12-01' },
];

// ---- Main Functions ----

export async function fetchFreshWaterData(): Promise<FreshWaterData> {
  return freshWaterBreaker.execute(
    async () => {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let countries = MOCK_FRESH_WATER_DATA;

      // optionally enhance per-capita values using the World Bank API – guard for
      // environments where `process` isn't defined (e.g. browser) and avoid
      // needing Node type definitions in the frontend code.
      const useWb = typeof process !== 'undefined' && !!process.env?.USE_WORLD_BANK_WATER;
      if (useWb) {
        try {
          const wbMap = await fetchWorldBankPerCapita();
          countries = countries.map(c => {
            const per = wbMap[c.countryCode];
            if (per != null) {
              // derive stress level based on per-capita thresholds
              let level: FreshWaterCountryData['waterStressLevel'] = 'low';
              if (per < 700) level = 'critical';
              else if (per < 1700) level = 'high';
              else if (per < 4000) level = 'moderate';
              return { ...c, perCapitaWater: per, waterStressLevel: level };
            }
            return c;
          });
        } catch (wbErr) {
          console.warn('[FreshWater] world bank fetch failed, using mock values', wbErr);
        }
      }
      
      // Calculate global statistics
      const criticalCountries = countries
        .filter(c => c.waterStressLevel === 'critical')
        .map(c => c.countryCode);
      
      const totalStress = countries.reduce((sum, c) => sum + (
        c.waterStressLevel === 'low' ? 0 :
        c.waterStressLevel === 'moderate' ? 20 :
        c.waterStressLevel === 'high' ? 30 : 50
      ), 0);
      
      const globalAverageStress = totalStress / countries.length;
      const totalRenewableWater = countries.reduce((sum, c) => sum + c.totalRenewableWater, 0) / 1000; // to billion km³
      
      const regionalData = [
        {
          region: 'Sub-Saharan Africa',
          averageStress: 35,
          countries: 5,
          affectedPopulation: 320,
        },
        {
          region: 'Middle East & North Africa',
          averageStress: 55,
          countries: 4,
          affectedPopulation: 180,
        },
        {
          region: 'South Asia',
          averageStress: 42,
          countries: 3,
          affectedPopulation: 550,
        },
        {
          region: 'East Asia & Pacific',
          averageStress: 28,
          countries: 3,
          affectedPopulation: 200,
        },
        {
          region: 'Europe & Central Asia',
          averageStress: 15,
          countries: 3,
          affectedPopulation: 50,
        },
        {
          region: 'Americas',
          averageStress: 20,
          countries: 3,
          affectedPopulation: 80,
        },
      ];
      
      const affectedPopulation = countries
        .filter(c => c.accessPercentage < 90)
        .reduce((sum, c) => sum + (100 - c.accessPercentage), 0);
      
      return {
        timestamp: new Date().toISOString(),
        globalStats: {
          globalAverageStress,
          totalRenewableWater,
          affectedPopulation: Math.round(affectedPopulation * 10), // rough estimate
          criticalCountries,
          regionalData,
        },
        countries,
      };
    },
    {
      timestamp: new Date().toISOString(),
      globalStats: {
        globalAverageStress: 28.5,
        totalRenewableWater: 34.2,
        affectedPopulation: 2200,
        criticalCountries: ['EG', 'SA', 'AE', 'IL', 'PK'],
        regionalData: [],
      },
      countries: MOCK_FRESH_WATER_DATA,
    }
  );
}

export function getFreshWaterStatus(): string {
  return freshWaterBreaker.getStatus();
}

export function getWaterStressColor(level: string): string {
  switch (level) {
    case 'low': return '#22c55e'; // green
    case 'moderate': return '#eab308'; // yellow
    case 'high': return '#f97316'; // orange
    case 'critical': return '#dc2626'; // red
    default: return '#64748b'; // slate
  }
}

export function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'improving': return '📈';
    case 'declining': return '📉';
    case 'stable': return '→';
    default: return '•';
  }
}
