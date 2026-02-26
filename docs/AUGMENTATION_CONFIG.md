# Intelligence Augmentation Systems - Configuration Guide

## Environment Variables

Add these to your `.env.local` file:

```env
# Satellite Integration APIs
VITE_NASA_API_KEY=your_nasa_api_key
VITE_SENTINEL_HUB_CLIENT_ID=your_sentinel_client_id
VITE_SENTINEL_HUB_CLIENT_SECRET=your_sentinel_client_secret

# Feature Flags
VITE_ENABLE_ALERT_RULES=true
VITE_ENABLE_DEDUPLICATION=true
VITE_ENABLE_SATELLITE_DATA=true
VITE_ENABLE_ANOMALY_DETECTION=true
```

## Getting API Keys

### NASA FIRMS (Fire Detection)
1. Visit: https://firms.modaps.eosdis.nasa.gov/api/
2. Register for free
3. Get API key from dashboard
4. Set as `VITE_NASA_API_KEY`

### Sentinel Hub (Copernicus Satellite Data)
1. Register: https://www.sentinel-hub.com/
2. Create OAuth application
3. Get Client ID and Secret
4. Set `VITE_SENTINEL_HUB_CLIENT_ID` and `VITE_SENTINEL_HUB_CLIENT_SECRET`

### NOAA (Weather/Flood Data)
- Public API, no key needed
- Already integrated and enabled by default

## Service Configuration

### Alert Rules Engine

Default configuration (in code):
```typescript
{
  anomalyThreshold: 0.7, // 70% match threshold
  minSamplesForBaseline: 30,
  baselineWindowHours: 168, // 1 week
}
```

Custom configuration:
```typescript
import { initAlertRules, createAlertRule } from '@/services/alert-rules';

await initAlertRules();

// Create rules with custom settings
const rule = await createAlertRule(
  'My Rule',
  conditions,
  'ALL',
  'Description',
  '#ff0000', // Color
);
```

### Event Deduplication

Default configuration:
- **Similarity Threshold**: 0.75 (75%)
- **Time Window**: 24 hours
- **Weighting**:
  - Title similarity: 40%
  - Source overlap: 20%
  - Location proximity: 20%
  - Time proximity: 20%

To customize:
```typescript
import { initDeduplication } from '@/services/event-deduplication';

// Currently no custom config, but can add to service if needed
await initDeduplication();
```

### Satellite Data Integration

Configuration options:
```typescript
import { initSatelliteService } from '@/services/satellite-integration';

await initSatelliteService({
  nasaApiKey: process.env.VITE_NASA_API_KEY,
  noaaEnabled: true,
  copernicusEnabled: true,
  sentinelHubClientId: process.env.VITE_SENTINEL_HUB_CLIENT_ID,
  sentinelHubClientSecret: process.env.VITE_SENTINEL_HUB_CLIENT_SECRET,
  updateIntervalMs: 3600000, // 1 hour (in milliseconds)
  maxCacheSizeEvents: 1000, // Max events to cache
});
```

### Anomaly Detection

Configuration options:
```typescript
import { initAnomalyDetection } from '@/services/anomaly-detection';

await initAnomalyDetection({
  anomalyThreshold: 0.7, // 0-1, threshold to flag anomalous
  minSamplesForBaseline: 30, // Min events to establish baseline
  baselineWindowHours: 168, // 1 week of historical data
  velocitySpikeMultiplier: 2.5, // Standard deviations
  convergenceRadiusKm: 100, // Geo-clustering radius
  minEventsForConvergence: 3, // Min events to trigger geo anomaly
  threatEscalationThreshold: 1.5, // 50% severity increase = anomaly
  enablePredictiveMode: true, // Enable escalation forecasting
  predictionWindowHours: 24, // Forecast horizon
});
```

## Startup Integration

In your main app initialization:

```typescript
// src/main.ts or similar
import { initIntelligenceAugmentation } from '@/services/intelligence-augmentation';

async function initializeApp() {
  // ... other initialization code ...

  // Initialize all intelligence systems
  try {
    await initIntelligenceAugmentation();
    console.log('✅ Intelligence systems initialized');
  } catch (err) {
    console.warn('⚠️  Failed to initialize intelligence systems', err);
    // App can still run without these systems
  }
}

initializeApp();
```

## Storage & Persistence

All systems use browser IndexedDB for persistence:

- **Alert Rules**: `alert-rules-v1`
- **Deduplication Stats**: `event-dedup-stats-v1`
- **Satellite Config**: `satellite-config-v1`
- **Anomaly Baselines**: `anomaly-baselines-v1`

### Clearing Storage

To clear cached data:
```typescript
// Clear all stored data
const dbs = ['alert-rules-v1', 'event-dedup-stats-v1', 'satellite-config-v1', 'anomaly-baselines-v1'];
for (const db of dbs) {
  const request = indexedDB.deleteDatabase(db);
}
```

## Performance Tuning

### For Large Event Batches

```typescript
// Process in chunks to avoid UI blocking
async function processLargeEventBatch(events: ClusteredEvent[]) {
  const BATCH_SIZE = 100;
  const results = [];

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const augmented = await augmentEvents(batch);
    results.push(...augmented);

    // Allow UI to update between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
```

### Memory Optimization

```typescript
// Clear old anomaly history periodically
import { getEventAnomalies } from '@/services/anomaly-detection';

// Clear cache
satelliteCache.clear(); // In satellite-integration.ts

// Reduce baseline window to save memory
await initAnomalyDetection({
  baselineWindowHours: 24, // Instead of 168 (1 week)
  maxCacheSizeEvents: 100, // Smaller cache
});
```

## Monitoring & Debugging

### Log Augmentation Stats

```typescript
import { getAugmentationStats } from '@/services/intelligence-augmentation';

const stats = getAugmentationStats();
console.log('Augmentation Stats:', stats);
```

### Enable Verbose Logging

Add to console in browser DevTools:
```javascript
// Monitor alert rule evaluations
localStorage.setItem('debug', 'alert-rules:*');

// Monitor deduplication
localStorage.setItem('debug', 'deduplication:*');

// Monitor satellite fetches
localStorage.setItem('debug', 'satellite:*');

// Monitor anomalies
localStorage.setItem('debug', 'anomaly:*');
```

## Testing

### Unit Tests

All services include inline documentation examples:
```typescript
import * as examples from '@/services/AUGMENTATION_EXAMPLES';

// Run example tests
await examples.exampleFullAugmentation(testEvents);
```

### Integration Tests

```typescript
import { augmentEvents } from '@/services/intelligence-augmentation';

async function testAugmentation() {
  const testEvents = [
    // Your test event data
  ];

  const results = await augmentEvents(testEvents);
  
  console.assert(results.length === testEvents.length);
  console.assert(results[0]._augmented !== undefined);
}
```

## Reducing Bundle Size

The individual systems are modular. You can import only what you need:

```typescript
// Only import alert rules
import { createAlertRule } from '@/services/alert-rules';

// Only import deduplication
import { deduplicateEvents } from '@/services/event-deduplication';

// Don't import the integrated service if you don't need it
```

Each module is self-contained and can be tree-shaken if unused.

## Troubleshooting Configuration

### Q: "Failed to fetch satellite data"
**A**: Check if NASA API key is set and valid:
```typescript
console.log(process.env.VITE_NASA_API_KEY); // Should be set
```

### Q: "IndexedDB quota exceeded"
**A**: Increase allowed storage or clear old data:
```typescript
// Request persistent storage (if supported)
if (navigator.storage?.persist) {
  await navigator.storage.persist();
}
```

### Q: "Anomaly detection baselines not updating"
**A**: Ensure at least 30 sample events have been processed:
```typescript
const stats = getDeduplicationStats();
console.log(`Processed: ${stats.totalEventsProcessed} events`);
```

## Production Deployment

### Security Best Practices

1. **API Keys**: Never commit API keys, use environment variables only
2. **CORS**: Ensure satellite API endpoints have CORS enabled
3. **Rate Limiting**: Consider implementing request throttling for APIs
4. **Cache Isolation**: Use separate cache per user if multi-tenant

### Performance in Production

1. **Lazy Load**: Initialize systems after main app is ready
2. **Batch Deduplication**: Process events in chunks
3. **Cache TTL**: Adjust satellite cache timeout based on server load
4. **Monitoring**: Log system health and performance metrics

### Recommended Settings for Production

```typescript
await initIntelligenceAugmentation();

// Production-optimized config
await initSatelliteService({
  nasaApiKey: process.env.VITE_NASA_API_KEY,
  noaaEnabled: true,
  copernicusEnabled: false, // Requires auth, disable if unavailable
  updateIntervalMs: 7200000, // 2 hours to reduce API calls
  maxCacheSizeEvents: 500,
});

await initAnomalyDetection({
  anomalyThreshold: 0.75, // Stricter to reduce false positives
  baselineWindowHours: 336, // 14 days for stability
  velocitySpikeMultiplier: 3.0, // Higher threshold
});
```

---

Generated: February 26, 2026 | Version: 1.0
