# 🎯 Intelligence Augmentation Systems - Complete Documentation

## Overview

WorldEye now includes four advanced intelligence augmentation systems that work together to provide enhanced event analysis, deduplication, satellite integration, and anomaly detection. These systems can be used independently or together through the integrated `intelligence-augmentation` service.

---

## 🚨 1. Custom Alert Rules Engine

### What It Does
Creates custom alert rules that trigger on specific event patterns. Rules are persisted in browser storage and evaluated against all incoming events in real-time.

### Features
- **Flexible Conditions**: Match events by title, source, threat level, category, source count, velocity, keywords
- **Logic Gates**: Use ANY (OR) or ALL (AND) logic to combine conditions
- **Persistent Storage**: Rules saved to IndexedDB, survive browser restarts
- **Trigger Tracking**: Records when rules are triggered for analytics
- **Import/Export**: Share rule configurations as JSON

### Service API

#### Initialize
```typescript
import { initAlertRules } from '@/services/alert-rules';

await initAlertRules();
```

#### Create a Rule
```typescript
import { createAlertRule, type AlertRuleCondition } from '@/services/alert-rules';

const conditions: AlertRuleCondition[] = [
  {
    type: 'threatLevel',
    operator: 'equals',
    value: 'critical',
  },
  {
    type: 'keyword',
    operator: 'contains',
    value: 'nuclear',
    caseSensitive: false,
  },
];

const rule = await createAlertRule(
  'Critical Nuclear Threats',
  conditions,
  'ALL', // Both conditions must match
  'Alert on critical nuclear-related events',
  '#ff0000', // Red highlight color
);
```

#### Condition Types
- **title**: Match against event primary title
- **source**: Match against event primary source
- **threatLevel**: 'critical' | 'high' | 'medium' | 'low' | 'info'
- **category**: Event category (conflict, disaster, cyber, etc.)
- **sourceCount**: Number of sources reporting (numeric comparison)
- **velocity**: 'normal' | 'elevated' | 'spike'
- **keyword**: Search in title and all items

#### Operators
- **contains**: Substring match
- **equals**: Exact match
- **startsWith**: Prefix match
- **endsWith**: Suffix match
- **regex**: Regular expression match
- **greaterThan**: Numeric comparison (>)
- **lessThan**: Numeric comparison (<)

#### Evaluate Events
```typescript
import { evaluateEventAgainstRules, recordAlertTrigger } from '@/services/alert-rules';

const triggeredRules = evaluateEventAgainstRules(event);

for (const rule of triggeredRules) {
  console.log(`Rule triggered: ${rule.name}`);
  await recordAlertTrigger(rule.id);

  // Send notification, highlight event, etc.
}
```

#### Manage Rules
```typescript
import { 
  getAllAlertRules, 
  getAlertRule, 
  updateAlertRule, 
  deleteAlertRule,
  toggleAlertRule,
  exportRules,
  importRules 
} from '@/services/alert-rules';

// Get all rules
const rules = getAllAlertRules();

// Update a rule
await updateAlertRule(ruleId, { enabled: false });

// Enable/disable
await toggleAlertRule(ruleId, true);

// Export for sharing
const json = exportRules();

// Import rules
const importedCount = await importRules(rulesJson);
```

---

## 🔄 2. Event Deduplication

### What It Does
Detects duplicate events that report the same story from multiple sources and merges them into one event with combined metadata.

### Features
- **Multi-Metric Similarity**: Uses Levenshtein distance, Jaccard similarity, location-based matching
- **Time-Window Filtering**: Only considers events within 24 hours (configurable)
- **Source Merging**: Combines and deduplicates sources
- **Smart Ranking**: Keeps top sources by tier
- **Statistics**: Tracks deduplication metrics over time

### Service API

#### Initialize
```typescript
import { initDeduplication } from '@/services/event-deduplication';

await initDeduplication();
```

#### Deduplicate Events
```typescript
import { deduplicateEvents } from '@/services/event-deduplication';

const events = [...]; // Your events
const dedupedEvents = await deduplicateEvents(events);

console.log(`Reduced from ${events.length} to ${dedupedEvents.length} events`);
```

#### Get Statistics
```typescript
import { getDeduplicationStats, resetDeduplicationStats } from '@/services/event-deduplication';

const stats = getDeduplicationStats();
console.log({
  totalProcessed: stats.totalEventsProcessed,
  duplicatesFound: stats.duplicatesFound,
  eventsAfterDedup: stats.eventsAfterDedup,
  mergedGroups: stats.mergedGroups,
  lastRun: stats.lastRun,
});

// Reset stats
await resetDeduplicationStats();
```

### Similarity Thresholds
- Threshold: **0.75** (75% similarity = duplicate)
- Weights:
  - Title similarity: 40%
  - Source similarity: 20%
  - Location similarity: 20%
  - Time proximity: 20%

### Time Window
- Default: **24 hours**
- Events older than 24 hours won't be deduplicated against newer events

---

## 🛰️ 3. Satellite Data Integration

### What It Does
Enriches events with real-time satellite data including thermal anomalies, flood risk, crop health, and air quality.

### Features
- **Multi-Source Integration**: NASA FIRMS, NOAA, Copernicus, Sentinel Hub
- **Multiple Data Types**:
  - Thermal anomalies (fire detection)
  - Flood risk assessment
  - Crop health (NDVI index)
  - Air quality (AOD - Aerosol Optical Depth)
- **Risk Assessment**: Composite risk scoring combining all data
- **Image Tiles**: True-color satellite imagery and thermal overlays
- **Smart Caching**: Reduces API calls with time-based caching

### Service API

#### Initialize
```typescript
import { initSatelliteService } from '@/services/satellite-integration';

await initSatelliteService({
  nasaApiKey: process.env.VITE_NASA_API_KEY,
  noaaEnabled: true,
  copernicusEnabled: true,
  updateIntervalMs: 3600000, // 1 hour
  maxCacheSizeEvents: 1000,
});
```

#### Get Satellite Context
```typescript
import { getSatelliteContext } from '@/services/satellite-integration';

const context = await getSatelliteContext(event, 100); // 100km radius

console.log({
  anomalies: context.nearbyAnomalies,
  images: context.recentImages,
  summary: context.summary,
  risks: context.riskAssessment,
});
```

#### Satellite Context Structure
```typescript
{
  eventId: string;
  eventLat: number;
  eventLon: number;
  radiusKm: number;
  
  nearbyAnomalies: Array<{
    id: string;
    type: 'thermal_anomalies' | 'flood_risk' | 'crop_health' | 'air_quality';
    lat: number;
    lon: number;
    timestamp: Date;
    value: number;
    unit: string;
    provider: 'NASA_FIRMS' | 'NOAA' | 'Copernicus' | 'SentinelHub';
    confidence: number; // 0-1
    metadata: Record<string, unknown>;
  }>;
  
  recentImages: Array<{
    id: string;
    type: SatelliteDataType;
    lat: number;
    lon: number;
    timestamp: Date;
    provider: string;
    confidence: number;
    resolution: number; // meters per pixel
    url: string; // Image or tile server URL
    metadata: Record<string, unknown>;
  }>;
  
  summary: string;
  
  riskAssessment: {
    thermalRisk: number; // 0-1
    floodRisk: number; // 0-1
    cropStressRisk: number; // 0-1
    airQualityRisk: number; // 0-1
    overallRisk: number; // 0-1
  };
}
```

#### Data Types
- **thermal_anomalies**: Fire hotspots from NASA FIRMS/MODIS
- **flood_risk**: Water anomalies and flood likelihood from NOAA
- **crop_health**: NDVI vegetation index from Sentinel-2
- **air_quality**: AOD (aerosol optical depth) from NASA

#### Get Service Status
```typescript
import { getSatelliteServiceStatus, clearSatelliteCache } from '@/services/satellite-integration';

const status = getSatelliteServiceStatus();
console.log({
  enabled: status.enabled,
  providers: status.providers,
  cacheSize: status.cacheSize,
});

// Clear cache if needed
clearSatelliteCache();
```

---

## 🤖 4. Anomaly Detection ML Model

### What It Does
Uses statistical and machine learning techniques to detect unusual patterns in event data that might indicate escalation or emerging crises.

### Features
- **7 Anomaly Types**:
  1. **Velocity Spike**: Sudden increase in reporting frequency
  2. **Geographic Convergence**: Multiple events clustering in same area
  3. **Threat Escalation**: Increasing severity over time
  4. **Source Concentration**: Unusual source reporting patterns
  5. **Temporal Anomaly**: Unexpected timing patterns
  6. **Sentiment Shift**: Abrupt change in event sentiment
  7. **Cluster Explosion**: Rapid exponential event clustering

- **Baseline Learning**: Automatically learns normal patterns from historical data
- **Risk Levels**: Low, Medium, High, Critical
- **Escalation Prediction**: Forecasts event escalation probability for next 24 hours
- **Interpretable Results**: Human-readable explanations for each anomaly

### Service API

#### Initialize
```typescript
import { initAnomalyDetection } from '@/services/anomaly-detection';

await initAnomalyDetection({
  anomalyThreshold: 0.7, // 0-1 score to flag as anomalous
  minSamplesForBaseline: 30,
  baselineWindowHours: 168, // 1 week
  velocitySpikeMultiplier: 2.5, // Standard deviations
  convergenceRadiusKm: 100,
  minEventsForConvergence: 3,
  threatEscalationThreshold: 1.5, // 50% severity increase
  enablePredictiveMode: true,
  predictionWindowHours: 24,
});
```

#### Analyze Event for Anomalies
```typescript
import { analyzeEventAnomalies } from '@/services/anomaly-detection';

const recentEvents = [...]; // Last N events
const anomalies = await analyzeEventAnomalies(event, recentEvents);

console.log({
  eventId: anomalies.eventId,
  overallScore: anomalies.overallAnomalyScore, // 0-1
  isAnomalous: anomalies.isAnomalous,
  riskLevel: anomalies.riskLevel, // low/medium/high/critical
  interpretation: anomalies.interpretation,
  anomalies: anomalies.anomalies, // Array of detected anomalies
});
```

#### Event Anomalies Structure
```typescript
{
  eventId: string;
  timestamp: Date;
  
  anomalies: Array<{
    type: AnomalyType;
    score: number; // 0-1
    likelihood: number; // 0-1
    baseline: number; // Expected value
    current: number; // Observed value
    deviation: number; // Standard deviations from baseline
    metadata: Record<string, unknown>;
  }>;
  
  overallAnomalyScore: number; // 0-1, average of all anomalies
  isAnomalous: boolean; // true if score >= threshold
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  interpretation: string; // Human-readable explanation
}
```

#### Predict Escalation
```typescript
import { predictEventEscalation } from '@/services/anomaly-detection';

const prediction = predictEventEscalation(event, 24); // Next 24 hours

console.log({
  probability: prediction.probability, // 0-1
  expectedThreatLevel: prediction['expected threat level'],
  indicators: prediction.indicators, // Array of escalation indicators
});

if (prediction.probability > 0.6) {
  console.warn('HIGH ESCALATION RISK');
}
```

#### Anomaly Types Explained

**Velocity Spike**
- Detects sudden increase in reporting frequency
- Indicates emerging or rapidly developing story
- Evidence: High frequency of similar articles

**Geographic Convergence**
- Multiple events clustering within 100km radius
- Suggests concentrated area of instability
- Evidence: sourceCount increases, events co-located

**Threat Escalation**
- Event threat level increases compared to recent history
- Suggests situation is deteriorating
- Evidence: Severity score increases by >50%

**Source Concentration**
- One source dominates reporting (>50% of articles)
- May indicate propaganda or sensor malfunction
- Evidence: Uneven source distribution

**Temporal Anomaly**
- Update frequency breaks expected patterns
- Too rapid (updates every 10 mins) or too slow
- Evidence: Timing deviation from baseline

**Sentiment Shift**
- Sudden change in event sentiment/confidence
- May indicate perception change or disinformation
- Evidence: Confidence score shifts >0.3

**Cluster Explosion**
- Events appear at exponentially increasing rate
- Indicates rapidly spreading situation
- Evidence: Last hour has 2x+ normal event rate

---

## 🔗 5. Integrated Intelligence Augmentation

### What It Does
Coordinates all four systems to provide comprehensive event enrichment in one call.

### Features
- **One-Call Augmentation**: Run all systems with single function
- **Parallel Execution**: Fetches satellite, analyzes anomalies concurrently
- **Error Resilience**: Continues even if one system fails
- **Enriched Events**: Returns events with all augmentation data attached

### Service API

#### Initialize Everything
```typescript
import { initIntelligenceAugmentation } from '@/services/intelligence-augmentation';

await initIntelligenceAugmentation();
```

#### Augment Events
```typescript
import { augmentEvents, type EnrichedEvent } from '@/services/intelligence-augmentation';

const events = [...]; // Your events array
const enrichedEvents = await augmentEvents(events);

// Each enriched event includes:
enrichedEvents.forEach(event => {
  console.log({
    // Original event data
    ...event,
    
    // NEW: Augmentation data
    _augmented: {
      triggeredAlerts: [
        { ruleId, ruleName, highlightColor }
      ],
      satelliteContext: { /* SatelliteContext */ },
      anomalies: { /* EventAnomalies */ },
      escalationPrediction: { probability, indicators },
    },
  });
});
```

#### Enriched Event Structure
```typescript
interface EnrichedEvent extends ClusteredEvent {
  _augmented: {
    triggeredAlerts: Array<{
      ruleId: string;
      ruleName: string;
      highlightColor?: string;
    }>;
    satelliteContext?: SatelliteContext;
    anomalies?: EventAnomalies;
    escalationPrediction?: {
      probability: number;
      indicators: string[];
    };
  };
}
```

#### Get Augmentation Stats
```typescript
import { getAugmentationStats } from '@/services/intelligence-augmentation';

const stats = getAugmentationStats();
console.log({
  deduplication: stats.deduplication,
  initialized: stats.initialized,
});
```

---

## 📋 Integration Checklist

### To integrate into your application:

- [ ] **1. Initialize Systems**
  ```typescript
  import { initIntelligenceAugmentation } from '@/services/intelligence-augmentation';
  await initIntelligenceAugmentation(); // In app startup
  ```

- [ ] **2. Replace Event Processing**
  ```typescript
  // BEFORE
  const events = await fetchNews();
  
  // AFTER
  const events = await fetchNews();
  const enrichedEvents = await augmentEvents(events);
  ```

- [ ] **3. Update Event Display**
  Use `_augmented` data for:
  - Highlighting events with alert colors
  - Showing anomaly badges/indicators
  - Displaying satellite imagery overlays
  - Showing escalation warnings

- [ ] **4. Create Alert Rules UI**
  Allow users to:
  - Create/edit/delete rules
  - Test rules against events
  - Import/export rule sets
  - See trigger history

- [ ] **5. Display Deduplication Stats**
  Show users:
  - Events deduplicated
  - Data quality improvements
  - Merged event details

- [ ] **6. Configure Satellite Data**
  Add settings for:
  - API keys (NASA, Sentinel Hub)
  - Enabled providers
  - Update frequency
  - Cache size

- [ ] **7. Monitor Anomalies**
  Create dashboard showing:
  - Anomaly scores by type
  - High-risk events
  - Escalation forecasts
  - Baseline statistics

---

## 🧪 Testing & Examples

All features have example code in:
```typescript
import * as examples from '@/services/AUGMENTATION_EXAMPLES';

// Run examples
await examples.exampleFullAugmentation(events);
```

---

## 📊 Performance Notes

- **Event Deduplication**: O(n²) similarity comparison; fast for <1000 events
- **Anomaly Detection**: O(n) baseline calculation; incremental updates
- **Satellite Fetching**: ~500-2000ms depends on API latency; cached
- **Alert Evaluation**: O(n*m) where n=events, m=rules; typically <100ms batch

### Memory Usage
- Alert rules: ~10KB per rule
- Deduplication baselines: ~5KB
- Anomaly baselines: ~20KB per metric
- Satellite cache: ~1MB per 100 event contexts

---

## 🆘 Troubleshooting

**Q: Alerts not triggering?**
- Check if rules are enabled: `getAllAlertRules().filter(r => r.enabled)`
- Verify conditions match event data types
- Check console for evaluation errors

**Q: Deduplication not working?**
- Threshold is 0.75; increase if too strict
- Check time window (default 24h)
- Ensure events have title and source data

**Q: Satellite data not loading?**
- Check if service is initialized
- Verify API keys are set (NASA, Copernicus)
- Check browser console for fetch errors
- Mock data is returned if providers disabled

**Q: Anomaly scores seem wrong?**
- Baselines need 30+ samples to be accurate
- Check if predictionWindowHours is set correctly
- Verify convergenceRadiusKm matches your use case

---

## 📚 API Reference

### Quick Links to Main Functions

#### Alert Rules
- `initAlertRules()` - Initialize
- `createAlertRule()` - Create alert
- `evaluateEventAgainstRules()` - Evaluate
- `getAllAlertRules()` - Get all
- `deleteAlertRule()` - Delete

#### Deduplication
- `initDeduplication()` - Initialize
- `deduplicateEvents()` - Deduplicate batch
- `getDeduplicationStats()` - Get stats

#### Satellite Integration
- `initSatelliteService()` - Initialize
- `getSatelliteContext()` - Get data
- `getSatelliteServiceStatus()` - Get status

#### Anomaly Detection
- `initAnomalyDetection()` - Initialize
- `analyzeEventAnomalies()` - Analyze
- `predictEventEscalation()` - Predict
- `getEventAnomalies()` - Get anomalies

#### Intelligence Augmentation
- `initIntelligenceAugmentation()` - Initialize all
- `augmentEvents()` - Augment batch
- `getAugmentationStats()` - Get stats

---

## 📝 Configuration Files

Each system can be configured, see:
- `/src/config/ml-config.ts` - ML settings (for future)
- Each service file has constants at the top

---

Generated: February 26, 2026 | Version: 1.0
