// Base configuration shared across all variants
import type { PanelConfig, MapLayers } from '@/types';

// Shared exports (re-exported by all variants)
export { SECTORS, COMMODITIES, MARKET_SYMBOLS } from '../markets';
export { UNDERSEA_CABLES } from '../geo';
export { AI_DATA_CENTERS } from '../ai-datacenters';

// Refresh intervals - shared across all variants
export const REFRESH_INTERVALS = {
  feeds: 3 * 60 * 1000,       // 3 min (faster news)
  markets: 2 * 60 * 1000,     // 2 min
  crypto: 2 * 60 * 1000,      // 2 min
  predictions: 3 * 60 * 1000, // 3 min
  ais: 5 * 60 * 1000,         // 5 min (faster vessel tracking)
};

// Monitor colors - shared
export const MONITOR_COLORS = [
  '#44ff88',
  '#ff8844',
  '#4488ff',
  '#ff44ff',
  '#ffff44',
  '#ff4444',
  '#44ffff',
  '#88ff44',
  '#ff88ff',
  '#88ffff',
];

// Storage keys - shared
export const STORAGE_KEYS = {
  panels: 'worldmonitor-panels',
  monitors: 'worldmonitor-monitors',
  mapLayers: 'worldmonitor-layers',
  disabledFeeds: 'worldmonitor-disabled-feeds',
  liveChannels: 'worldmonitor-live-channels',
} as const;

// Type definitions for variant configs
export interface VariantConfig {
  name: string;
  description: string;
  panels: Record<string, PanelConfig>;
  mapLayers: MapLayers;
  mobileMapLayers: MapLayers;
}
