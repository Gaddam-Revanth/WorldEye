# 🎯 Intelligence Augmentation - Quick Reference

## 30-Second Quickstart

```typescript
// 1. Initialize (do this once on app startup)
import { initIntelligenceAugmentation } from '@/services/intelligence-augmentation';
await initIntelligenceAugmentation();

// 2. Augment your events (do this for every event batch)
import { augmentEvents } from '@/services/intelligence-augmentation';
const enrichedEvents = await augmentEvents(events);

// 3. Use the data
enrichedEvents.forEach(e => {
  e._augmented.triggeredAlerts;      // Alert rules matches
  e._augmented.anomalies;             // Anomaly analysis
  e._augmented.satelliteContext;      // Satellite data
  e._augmented.escalationPrediction;  // Forecast
});
```

---

## System Overview

```
┌─────────────────────────────────────────────────────┐
│   Intelligence Augmentation Service                  │
├─────────────────────────────────────────────────────┤
│  ⚡ Alert Rules    │  🔄 Deduplication              │
│  🛰️  Satellite     │  🤖 Anomaly Detection          │
└─────────────────────────────────────────────────────┘
           ↓
    EnrichedEvent {
      ...event,
      _augmented: {
        triggeredAlerts:[]
        satelliteContext: {...}
        anomalies: {...}
        escalationPrediction: {...}
      }
    }
```

---

## 1️⃣ Alert Rules (Trigger on patterns)

### Basic Usage
```typescript
import { createAlertRule, evaluateEventAgainstRules } from '@/services/alert-rules';

// Create rule
const rule = await createAlertRule(
  'Military High Threats',           // name
  [
    { type: 'threatLevel', operator: 'equals', value: 'high' },
    { type: 'category', operator: 'equals', value: 'military' },
  ],
  'ALL'                              // condition: AND/OR
);

// Evaluate
const triggered = evaluateEventAgainstRules(event);
if (triggered.length > 0) {
  console.log('Alerts triggered:', triggered.map(r => r.name));
}
```

### Condition Types
```
'title' | 'source' | 'threatLevel' | 'category' | 
'sourceCount' | 'velocity' | 'keyword'
```

### Operators
```
'contains' | 'equals' | 'startsWith' | 'endsWith' | 
'regex' | 'greaterThan' | 'lessThan'
```

### CRUD Operations
```typescript
getAllAlertRules()                          // Get all
getAlertRule(id)                            // Get one
createAlertRule(...)                        // Create
updateAlertRule(id, updates)                // Update
deleteAlertRule(id)                         // Delete
toggleAlertRule(id, enabled)                // Enable/disable
recordAlertTrigger(ruleId)                  // Track trigger
exportRules()                               // Export as JSON
importRules(json)                           // Import from JSON
```

---

## 2️⃣ Deduplication (Merge duplicates)

### Basic Usage
```typescript
import { deduplicateEvents, getDeduplicationStats } from '@/services/event-deduplication';

// Deduplicate
const dedupedEvents = await deduplicateEvents(events);

// Get stats
const stats = getDeduplicationStats();
console.log(`Removed ${stats.duplicatesFound} duplicates`);
```

### How It Works
- Compares titles (Levenshtein: 40% weight)
- Compares sources (Jaccard: 20% weight)  
- Compares locations (Distance: 20% weight)
- Compares times (Proximity: 20% weight)
- **Threshold**: 75% similarity = duplicate
- **Time window**: 24 hours

---

## 3️⃣ Satellite Data (Enrich with satellite info)

### Basic Usage
```typescript
import { getSatelliteContext } from '@/services/satellite-integration';

// Get satellite data
const context = await getSatelliteContext(event, 100); // 100km radius

console.log({
  anomalies: context.nearbyAnomalies,      // Detected issues
  images: context.recentImages,             // Satellite imagery
  summary: context.summary,                 // Text summary
  risk: context.riskAssessment,            // Risk scores
});
```

### Data Types
```
thermal_anomalies     🔥 Fire detection
flood_risk            🌊 Water anomalies
crop_health           🌾 Vegetation NDVI
air_quality           💨 Aerosol optical depth
```

### Risk Scores (0-1)
```
thermalRisk       0.0 - 1.0
floodRisk         0.0 - 1.0
cropStressRisk    0.0 - 1.0
airQualityRisk    0.0 - 1.0
overallRisk       Average of above
```

---

## 4️⃣ Anomaly Detection (Detect unusual patterns)

### Basic Usage
```typescript
import { analyzeEventAnomalies, predictEventEscalation } from '@/services/anomaly-detection';

// Analyze anomalies
const analysis = await analyzeEventAnomalies(event, recentEvents);

console.log({
  overallScore: analysis.overallAnomalyScore,   // 0-1
  isAnomalous: analysis.isAnomalous,            // true/false
  riskLevel: analysis.riskLevel,                // low/medium/high/critical
  interpretation: analysis.interpretation,     // Human-readable
});

// Predict escalation
const pred = predictEventEscalation(event, 24);  // Next 24 hours
console.log(`Escalation risk: ${pred.probability * 100}%`);
```

### Anomaly Types
```
velocity_spike              ⚡ Sudden reporting increase
geographic_convergence      📍 Events clustering
threat_escalation          📈 Severity increasing
source_concentration       📰 Unusual source patterns
temporal_anomaly           ⏰ Unexpected timing
sentiment_shift            💭 Sentiment change
cluster_explosion          💥 Rapid clustering
```

### Risk Levels
```
low      💚 No anomalies
medium   💛 Some anomalies
high     🧡 Multiple anomalies
critical 🔴 High risk situation
```

---

## 🔄 Full Integration

### In Your News Processing
```typescript
// BEFORE
const events = await fetchNews();
displayEvents(events);

// AFTER
const events = await fetchNews();
const enriched = await augmentEvents(events);
displayEnrichedEvents(enriched);
```

### Display Enriched Data
```typescript
function displayEvent(event: EnrichedEvent) {
  // Highlighting based on alerts
  const color = event._augmented.triggeredAlerts.length > 0
    ? event._augmented.triggeredAlerts[0].highlightColor
    : 'default';

  // Show anomaly badge
  const badge = event._augmented.anomalies?.isAnomalous
    ? `Anomaly: ${event._augmented.anomalies.riskLevel}`
    : '';

  // Show escalation warning
  const warning = event._augmented.escalationPrediction?.probability > 0.6
    ? `⚠️ ${Math.round(event._augmented.escalationPrediction.probability * 100)}% escalation risk`
    : '';

  // Show satellite indicator
  const satellite = event._augmented.satelliteContext
    ? `🛰️ Risk: ${Math.round(event._augmented.satelliteContext.riskAssessment.overallRisk * 100)}%`
    : '';

  return { color, badge, warning, satellite };
}
```

---

## 🛠️ Configuration

### Environment Variables
```env
VITE_NASA_API_KEY=xxx
VITE_SENTINEL_HUB_CLIENT_ID=xxx
VITE_SENTINEL_HUB_CLIENT_SECRET=xxx
VITE_ENABLE_ALERT_RULES=true
VITE_ENABLE_DEDUPLICATION=true
VITE_ENABLE_SATELLITE_DATA=true
VITE_ENABLE_ANOMALY_DETECTION=true
```

### Custom Config
```typescript
import { initAnomalyDetection } from '@/services/anomaly-detection';

await initAnomalyDetection({
  anomalyThreshold: 0.7,          // Adjust sensitivity
  baselineWindowHours: 168,        // History window
  velocitySpikeMultiplier: 2.5,   // Spike threshold
  convergenceRadiusKm: 100,        // Geo-cluster radius
  threatEscalationThreshold: 1.5,  // Severity multiplier
  enablePredictiveMode: true,
  predictionWindowHours: 24,
});
```

---

## 📊 Statistics & Monitoring

```typescript
import { getAugmentationStats } from '@/services/intelligence-augmentation';

const stats = getAugmentationStats();
console.log({
  deduplication: {
    totalProcessed: 1000,
    duplicatesFound: 150,
    eventsAfterDedup: 850,
    mergedGroups: 45,
  },
  initialized: true,
});
```

---

## ⚙️ Type Quick ref

```typescript
// Alert Rules
AlertRule         {id, name, enabled, conditions, actions, ...}
AlertRuleCondition {type, operator, value}

// Deduplication
DeduplicationScore {titleSimilarity, sourceSimilarity, ...}
DeduplicationStats {totalProcessed, duplicatesFound, ...}

// Satellite
SatelliteContext  {eventId, anomalies, images, riskAssessment, ...}
SatelliteImage    {id, type, url, provider, confidence, ...}
SatelliteDataPoint {id, type, value, unit, provider, ...}

// Anomaly
EventAnomalies    {eventId, anomalies[], score, riskLevel, ...}
AnomalyScore      {type, score, likelihood, baseline, current, ...}

// Integration
EnrichedEvent extends ClusteredEvent {
  _augmented: {
    triggeredAlerts: Array<{ruleId, ruleName, color}>
    satelliteContext?: SatelliteContext
    anomalies?: EventAnomalies
    escalationPrediction?: {probability, indicators}
  }
}
```

---

## 🚀 Common Tasks

### Create an Alert for High-Risk Events
```typescript
const rule = await createAlertRule(
  'High Risk Events',
  [{ type: 'threatLevel', operator: 'equals', value: 'critical' }],
  'ALL'
);
```

### Get Duplicate Count
```typescript
const before = events.length;
const after = (await deduplicateEvents(events)).length;
console.log(`Duplicates: ${before - after}`);
```

### Check Satellite Risk
```typescript
const sat = await getSatelliteContext(event);
if (sat.riskAssessment.overallRisk > 0.7) {
  console.warn('High satellite risk detected');
}
```

### Detect Escalation
```typescript
const analysis = await analyzeEventAnomalies(event, recentEvents);
const forecast = predictEventEscalation(event);
if (forecast.probability > 0.6) {
  console.warn('Escalation forecast:', forecast.indicators);
}
```

---

## 📚 Documentation Links

- **Full API**: `docs/INTELLIGENCE_AUGMENTATION.md`
- **Config**: `docs/AUGMENTATION_CONFIG.md`
- **Examples**: `src/services/AUGMENTATION_EXAMPLES.ts`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`

---

## ⚡ Performance Tips

1. **Batch Operations**: Process events in groups of 50-100
2. **Defer Satellite Queries**: Load satellite data async after priority tasks
3. **Cache Results**: Reuse `SatelliteContext` for 1 hour
4. **Limit History**: Only analyze last 24 hours for anomalies
5. **Workers**: Run deduplication in Web Worker for large batches

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Alerts not triggering | Check `getAllAlertRules()` - rules enabled? |
| Duplicates not merging | Verify title similarity >75%, time <24h |
| Satellite data missing | Check API keys in `.env.local` |
| Anomalies wrong | Need 30+ events for baseline learning |
| Out of memory | Clear dedup stats: `resetDeduplicationStats()` |
| Slow performance | Process events in batches of 100 |

---

**Last Updated**: February 26, 2026
