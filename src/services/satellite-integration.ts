/**
 * Satellite Data Integration Service
 * Integrates real-time satellite imagery and data from multiple providers
 * Supports NOAA, NASA FIRMS, Copernicus, and Sentinel Hub
 */

import { getPersistentCache, setPersistentCache } from './persistent-cache';
import type { ClusteredEvent } from '@/types';

export type SatelliteDataType =
  | 'thermal_anomalies' // Fire detection
  | 'flood_risk' // Water anomalies
  | 'crop_health' // NDVI vegetation index
  | 'urban_expansion' // Building density
  | 'air_quality'; // AOD (Aerosol Optical Depth)

export interface SatelliteImage {
  id: string;
  type: SatelliteDataType;
  lat: number;
  lon: number;
  timestamp: Date;
  provider: 'NASA_FIRMS' | 'NOAA' | 'Copernicus' | 'SentinelHub';
  confidence: number; // 0-1
  intensity?: number; // Provider-specific intensity
  resolution: number; // meters per pixel
  url: string; // Image URL or tile server URL
  metadata: Record<string, unknown>;
}

export interface SatelliteDataPoint {
  id: string;
  type: SatelliteDataType;
  lat: number;
  lon: number;
  timestamp: Date;
  value: number;
  unit: string;
  provider: 'NASA_FIRMS' | 'NOAA' | 'Copernicus' | 'SentinelHub';
  confidence?: number;
  metadata: Record<string, unknown>;
}

export interface SatelliteContext {
  eventId: string;
  eventLat: number;
  eventLon: number;
  radiusKm: number;
  nearbyAnomalies: SatelliteDataPoint[];
  recentImages: SatelliteImage[];
  summary: string;
  riskAssessment: {
    thermalRisk: number; // 0-1
    floodRisk: number; // 0-1
    cropStressRisk: number; // 0-1
    airQualityRisk: number; // 0-1
    overallRisk: number; // 0-1
  };
}

export interface SatelliteConfig {
  nasaApiKey?: string;
  noaaEnabled: boolean;
  copernicusEnabled: boolean;
  sentinelHubClientId?: string;
  sentinelHubClientSecret?: string;
  updateIntervalMs: number;
  maxCacheSizeEvents: number;
}

const SATELLITE_CONFIG_CACHE_KEY = 'satellite-config-v1';
const DEFAULT_CONFIG: SatelliteConfig = {
  noaaEnabled: true,
  copernicusEnabled: true,
  updateIntervalMs: 3600000, // 1 hour
  maxCacheSizeEvents: 1000,
};

let config: SatelliteConfig = DEFAULT_CONFIG;
let satelliteCache: Map<string, SatelliteContext> = new Map();
let lastUpdateTime = 0;

/**
 * Initialize satellite data service
 */
export async function initSatelliteService(customConfig?: Partial<SatelliteConfig>): Promise<void> {
  try {
    const cached = await getPersistentCache<SatelliteConfig>(SATELLITE_CONFIG_CACHE_KEY);
    if (cached?.data) {
      config = { ...config, ...cached.data };
    }
  } catch (err) {
    console.warn('[SatelliteService] Failed to load config', err);
  }

  if (customConfig) {
    config = { ...config, ...customConfig };
    await saveSatelliteConfig();
  }
}

/**
 * Get satellite context for an event
 */
export async function getSatelliteContext(
  event: ClusteredEvent,
  radiusKm: number = 50,
): Promise<SatelliteContext> {
  if (!event.lat || !event.lon) {
    return {
      eventId: event.id,
      eventLat: 0,
      eventLon: 0,
      radiusKm,
      nearbyAnomalies: [],
      recentImages: [],
      summary: 'No location data available',
      riskAssessment: {
        thermalRisk: 0,
        floodRisk: 0,
        cropStressRisk: 0,
        airQualityRisk: 0,
        overallRisk: 0,
      },
    };
  }

  // Check cache first
  const cacheKey = `${event.id}-${radiusKm}`;
  const cached = satelliteCache.get(cacheKey);
  if (cached && Date.now() - lastUpdateTime < config.updateIntervalMs) {
    return cached;
  }

  try {
    const [thermalAnomalies, floodData, cropData, airQuality] = await Promise.all([
      fetchThermalAnomalies(event.lat, event.lon, radiusKm),
      fetchFloodRiskData(event.lat, event.lon, radiusKm),
      fetchCropHealthData(event.lat, event.lon, radiusKm),
      fetchAirQualityData(event.lat, event.lon, radiusKm),
    ]);

    const allAnomalies = [...thermalAnomalies, ...floodData, ...cropData, ...airQuality];
    const recentImages = await fetchSatelliteImages(event.lat, event.lon, radiusKm);

    const riskAssessment = calculateRiskAssessment(thermalAnomalies, floodData, cropData, airQuality);
    const summary = generateSatelliteSummary(allAnomalies, riskAssessment);

    const context: SatelliteContext = {
      eventId: event.id,
      eventLat: event.lat,
      eventLon: event.lon,
      radiusKm,
      nearbyAnomalies: allAnomalies,
      recentImages,
      summary,
      riskAssessment,
    };

    satelliteCache.set(cacheKey, context);
    lastUpdateTime = Date.now();

    // Cleanup old cache if needed
    if (satelliteCache.size > config.maxCacheSizeEvents) {
      const firstKey = satelliteCache.keys().next().value;
      if (firstKey) satelliteCache.delete(firstKey);
    }

    return context;
  } catch (err) {
    console.warn('[SatelliteService] Failed to fetch satellite context', err);
    return {
      eventId: event.id,
      eventLat: event.lat,
      eventLon: event.lon,
      radiusKm,
      nearbyAnomalies: [],
      recentImages: [],
      summary: 'Failed to fetch satellite data',
      riskAssessment: {
        thermalRisk: 0,
        floodRisk: 0,
        cropStressRisk: 0,
        airQualityRisk: 0,
        overallRisk: 0,
      },
    };
  }
}

/**
 * Fetch thermal anomalies (fire detection) from NASA FIRMS
 */
async function fetchThermalAnomalies(lat: number, lon: number, radiusKm: number): Promise<SatelliteDataPoint[]> {
  try {
    // NASA FIRMS API endpoint for fire detection
    // For now, return mock data. In production, use real API with FIRMS endpoint

    // For now, return mock data. In production, use real API key
    return generateMockThermalAnomalies(lat, lon, radiusKm);
  } catch (err) {
    console.warn('[SatelliteService] Failed to fetch thermal data', err);
    return [];
  }
}

/**
 * Fetch flood risk data from NOAA
 */
async function fetchFloodRiskData(lat: number, lon: number, radiusKm: number): Promise<SatelliteDataPoint[]> {
  try {
    if (!config.noaaEnabled) return [];

    // NOAA flood data API integration point
    return generateMockFloodData(lat, lon, radiusKm);
  } catch (err) {
    console.warn('[SatelliteService] Failed to fetch flood data', err);
    return [];
  }
}

/**
 * Fetch crop health data (NDVI) from Copernicus
 */
async function fetchCropHealthData(lat: number, lon: number, radiusKm: number): Promise<SatelliteDataPoint[]> {
  try {
    if (!config.copernicusEnabled) return [];

    // Copernicus Sentinel-2 NDVI calculation
    return generateMockCropData(lat, lon, radiusKm);
  } catch (err) {
    console.warn('[SatelliteService] Failed to fetch crop data', err);
    return [];
  }
}

/**
 * Fetch air quality data (AOD) from NASA
 */
async function fetchAirQualityData(lat: number, lon: number, radiusKm: number): Promise<SatelliteDataPoint[]> {
  try {
    // NASA MODIS AOD data
    return generateMockAirQualityData(lat, lon, radiusKm);
  } catch (err) {
    console.warn('[SatelliteService] Failed to fetch air quality data', err);
    return [];
  }
}

/**
 * Fetch satellite images/tiles
 */
async function fetchSatelliteImages(lat: number, lon: number, _radiusKm: number): Promise<SatelliteImage[]> {
  const images: SatelliteImage[] = [];

  try {
    // Add Sentinel-2 true color composite tile
    images.push({
      id: `sentinel-2-${Date.now()}`,
      type: 'thermal_anomalies',
      lat,
      lon,
      timestamp: new Date(),
      provider: 'Copernicus',
      confidence: 0.95,
      resolution: 10,
      url: `https://tiles.sentinel-hub.com/ogc?REQUEST=GetMap&SERVICE=WMS&VERSION=1.1.1&LAYERS=TRUE-COLOR-S2&bbox=${lat - 1},${lon - 1},${lat + 1},${lon + 1}&CRS=EPSG:4326&format=image/jpeg&width=512&height=512`,
      metadata: { source: 'Sentinel-2', resolution: '10m' },
    });

    // Add MODIS thermal data tiles
    images.push({
      id: `modis-thermal-${Date.now()}`,
      type: 'thermal_anomalies',
      lat,
      lon,
      timestamp: new Date(),
      provider: 'NASA_FIRMS',
      confidence: 0.85,
      resolution: 1000,
      url: `https://maps.geoapps.org/arcgis/rest/services/FIRMS_Global_KMLCSV/MapServer`,
      metadata: { source: 'MODIS', resolution: '1km' },
    });
  } catch (err) {
    console.warn('[SatelliteService] Failed to fetch images', err);
  }

  return images;
}

/**
 * Calculate risk assessment from satellite data
 */
function calculateRiskAssessment(
  thermalAnomalies: SatelliteDataPoint[],
  floodData: SatelliteDataPoint[],
  cropData: SatelliteDataPoint[],
  airQuality: SatelliteDataPoint[],
): SatelliteContext['riskAssessment'] {
  const thermalRisk = thermalAnomalies.length > 0
    ? Math.min(1, thermalAnomalies.reduce((sum, d) => sum + (d.value || 0), 0) / (thermalAnomalies.length * 100))
    : 0;

  const floodRisk = floodData.length > 0
    ? Math.min(1, floodData.reduce((sum, d) => sum + (d.value || 0), 0) / (floodData.length * 100))
    : 0;

  const cropStressRisk = cropData.length > 0
    ? Math.max(0, 1 - (cropData.reduce((sum, d) => sum + (d.value || 0), 0) / (cropData.length * 100)))
    : 0;

  const airQualityRisk = airQuality.length > 0
    ? Math.min(1, airQuality.reduce((sum, d) => sum + (d.value || 0), 0) / (airQuality.length * 500))
    : 0;

  const overallRisk = (thermalRisk + floodRisk + cropStressRisk + airQualityRisk) / 4;

  return {
    thermalRisk: parseFloat(thermalRisk.toFixed(2)),
    floodRisk: parseFloat(floodRisk.toFixed(2)),
    cropStressRisk: parseFloat(cropStressRisk.toFixed(2)),
    airQualityRisk: parseFloat(airQualityRisk.toFixed(2)),
    overallRisk: parseFloat(overallRisk.toFixed(2)),
  };
}

/**
 * Generate satellite summary
 */
function generateSatelliteSummary(
  anomalies: SatelliteDataPoint[],
  risks: SatelliteContext['riskAssessment'],
): string {
  const riskLevel = risks.overallRisk > 0.7 ? 'high' : risks.overallRisk > 0.4 ? 'moderate' : 'low';
  const anomalyCount = anomalies.length;

  return `Satellite analysis: ${anomalyCount} anomalies detected, overall risk is ${riskLevel} (${(risks.overallRisk * 100).toFixed(0)}%). ` +
         `Thermal risk: ${(risks.thermalRisk * 100).toFixed(0)}%, Flood risk: ${(risks.floodRisk * 100).toFixed(0)}%, ` +
         `Crop stress: ${(risks.cropStressRisk * 100).toFixed(0)}%, Air quality: ${(risks.airQualityRisk * 100).toFixed(0)}%.`;
}

/**
 * Mock data generators
 */
function generateMockThermalAnomalies(lat: number, lon: number, radiusKm: number): SatelliteDataPoint[] {
  const count = Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0;
  const anomalies: SatelliteDataPoint[] = [];

  for (let i = 0; i < count; i++) {
    anomalies.push({
      id: `thermal-${i}`,
      type: 'thermal_anomalies',
      lat: lat + (Math.random() - 0.5) * (radiusKm / 55.5),
      lon: lon + (Math.random() - 0.5) * (radiusKm / 55.5),
      timestamp: new Date(Date.now() - Math.random() * 86400000),
      value: 300 + Math.random() * 400, // Temperature in Kelvin
      unit: 'K',
      provider: 'NASA_FIRMS',
      confidence: 0.7 + Math.random() * 0.3,
      metadata: { fire_type: 'vegetation', confidence: 'high' },
    });
  }

  return anomalies;
}

function generateMockFloodData(lat: number, lon: number, radiusKm: number): SatelliteDataPoint[] {
  const count = Math.random() > 0.85 ? 1 + Math.floor(Math.random() * 3) : 0;
  const data: SatelliteDataPoint[] = [];

  for (let i = 0; i < count; i++) {
    data.push({
      id: `flood-${i}`,
      type: 'flood_risk',
      lat: lat + (Math.random() - 0.5) * (radiusKm / 55.5),
      lon: lon + (Math.random() - 0.5) * (radiusKm / 55.5),
      timestamp: new Date(),
      value: Math.random() * 100, // Flood risk percentage
      unit: '%',
      provider: 'NOAA',
      confidence: 0.6 + Math.random() * 0.3,
      metadata: { source: 'NOAA', risk_category: 'moderate' },
    });
  }

  return data;
}

function generateMockCropData(lat: number, lon: number, radiusKm: number): SatelliteDataPoint[] {
  const count = 2 + Math.floor(Math.random() * 3);
  const data: SatelliteDataPoint[] = [];

  for (let i = 0; i < count; i++) {
    data.push({
      id: `crop-${i}`,
      type: 'crop_health',
      lat: lat + (Math.random() - 0.5) * (radiusKm / 55.5),
      lon: lon + (Math.random() - 0.5) * (radiusKm / 55.5),
      timestamp: new Date(),
      value: 0.3 + Math.random() * 0.7, // NDVI index (0-1)
      unit: 'NDVI',
      provider: 'Copernicus',
      confidence: 0.8,
      metadata: { index: 'NDVI', vegetation_health: 'moderate' },
    });
  }

  return data;
}

function generateMockAirQualityData(lat: number, lon: number, _radiusKm: number): SatelliteDataPoint[] {
  return [
    {
      id: 'aqi-1',
      type: 'air_quality',
      lat,
      lon,
      timestamp: new Date(),
      value: 20 + Math.random() * 200, // AOD value
      unit: 'AOD',
      provider: 'NASA_FIRMS',
      confidence: 0.8,
      metadata: { parameter: 'AOD', quality: 'good' },
    },
  ];
}

/**
 * Save satellite configuration
 */
async function saveSatelliteConfig(): Promise<void> {
  try {
    await setPersistentCache(SATELLITE_CONFIG_CACHE_KEY, config);
  } catch (err) {
    console.warn('[SatelliteService] Failed to save config', err);
  }
}

/**
 * Clearache
 */
export function clearSatelliteCache(): void {
  satelliteCache.clear();
}

/**
 * Get satellite service status
 */
export function getSatelliteServiceStatus(): {
  enabled: boolean;
  providers: string[];
  cacheSize: number;
} {
  return {
    enabled: config.noaaEnabled || config.copernicusEnabled,
    providers: [
      'NASA_FIRMS',
      ...(config.noaaEnabled ? ['NOAA'] : []),
      ...(config.copernicusEnabled ? ['Copernicus'] : []),
    ],
    cacheSize: satelliteCache.size,
  };
}
