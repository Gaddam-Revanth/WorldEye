/**
 * Intelligence Augmentation Systems - Integration Guide & Examples
 * 
 * This file documents how to use the four new features in the WorldEye application
 */

// ============================================================================
// 1. ALERT RULES ENGINE
// ============================================================================

/**
 * EXAMPLE: Setting up custom alert rules
 * 
 * This system allows users to create custom alerts that trigger on specific
 * event patterns. Rules are stored persistently and evaluated in real-time.
 */

import {
  createAlertRule,
  evaluateEventAgainstRules,
  type AlertRuleCondition,
} from '@/services/alert-rules';
import type { ClusteredEvent } from '@/types';

/**
 * Example 1: Create a rule to alert on all military-related events with high severity
 */
async function exampleAlertRule1() {
  const conditions: AlertRuleCondition[] = [
    {
      type: 'threatLevel',
      operator: 'equals',
      value: 'high',
    },
    {
      type: 'category',
      operator: 'equals',
      value: 'military',
    },
  ];

  const rule = await createAlertRule(
    'Military High-Threat Alert',
    conditions,
    'ALL', // All conditions must match
    'Alerts on military events classified as high-threat',
    '#ff0000',
  );

  console.log('Created rule:', rule.id);
}

/**
 * Example 2: Create a rule to track escalation in specific region
 */
async function exampleAlertRule2() {
  const conditions: AlertRuleCondition[] = [
    {
      type: 'keyword',
      operator: 'contains',
      value: 'Middle East',
      caseSensitive: false,
    },
    {
      type: 'sourceCount',
      operator: 'greaterThan',
      value: 5, // More than 5 sources reporting
    },
  ];

  const rule = await createAlertRule(
    'Middle East Regional Escalation',
    conditions,
    'ALL',
    'Triggers when 5+ sources report on Middle East events',
    '#ff6600',
  );

  console.log('Rule created:', rule.id);
}

/**
 * Example 3: Evaluate events against all rules
 */
async function exampleEvaluateRules(event: ClusteredEvent) {
  const triggeredRules = evaluateEventAgainstRules(event);

  if (triggeredRules.length > 0) {
    console.log(`Event triggered ${triggeredRules.length} rules:`);
    for (const rule of triggeredRules) {
      console.log(`- ${rule.name} (${rule.id})`);

      // Trigger notification
      if (rule.actions.notify) {
        sendNotification(rule.name);
      }
    }
  }
}

// ============================================================================
// 2. EVENT DEDUPLICATION
// ============================================================================

/**
 * EXAMPLE: Deduplicating events
 * 
 * This system detects and merges duplicate events that report the same story
 * from multiple sources. Uses multiple similarity metrics.
 */

import {
  deduplicateEvents,
  getDeduplicationStats,
} from '@/services/event-deduplication';

/**
 * Example: Deduplicate a batch of events
 */
async function exampleDeduplication(events: ClusteredEvent[]) {
  const dedupedEvents = await deduplicateEvents(events);

  console.log(`
    Original events: ${events.length}
    After deduplication: ${dedupedEvents.length}
  `);

  const stats = getDeduplicationStats();
  console.log('Deduplication Stats:', {
    totalProcessed: stats.totalEventsProcessed,
    duplicatesFound: stats.duplicatesFound,
    totalMerged: stats.mergedGroups,
  });

  return dedupedEvents;
}

// ============================================================================
// 3. SATELLITE DATA INTEGRATION
// ============================================================================

/**
 * EXAMPLE: Enriching events with satellite data
 * 
 * This system fetches real-time satellite imagery and data:
 * - Thermal anomalies (fire detection)
 * - Flood risk
 * - Crop health (NDVI)
 * - Air quality (AOD)
 */

import {
  getSatelliteContext,
  initSatelliteService,
} from '@/services/satellite-integration';

/**
 * Example 1: Initialize satellite service with custom config
 */
async function exampleSatelliteInit() {
  await initSatelliteService({
    nasaApiKey: import.meta.env.VITE_NASA_API_KEY,
    noaaEnabled: true,
    copernicusEnabled: true,
    updateIntervalMs: 3600000, // 1 hour
  });
}

/**
 * Example 2: Get satellite context for an event
 */
async function exampleGetSatelliteData(event: ClusteredEvent) {
  const context = await getSatelliteContext(event, 100); // 100km radius

  console.log('Satellite Context:', {
    eventId: context.eventId,
    anomaliesCount: context.nearbyAnomalies.length,
    imagesCount: context.recentImages.length,
    riskAssessment: context.riskAssessment,
    summary: context.summary,
  });

  // Display risk levels
  console.log('Risk Assessment:', {
    thermal: `${(context.riskAssessment.thermalRisk * 100).toFixed(0)}%`,
    flood: `${(context.riskAssessment.floodRisk * 100).toFixed(0)}%`,
    cropStress: `${(context.riskAssessment.cropStressRisk * 100).toFixed(0)}%`,
    airQuality: `${(context.riskAssessment.airQualityRisk * 100).toFixed(0)}%`,
    overall: `${(context.riskAssessment.overallRisk * 100).toFixed(0)}%`,
  });

  return context;
}

// ============================================================================
// 4. ANOMALY DETECTION ML MODEL
// ============================================================================

/**
 * EXAMPLE: Detecting anomalies in event patterns
 * 
 * This system uses statistical and ML techniques to detect:
 * - Velocity spikes (sudden increase in reporting)
 * - Geographic convergence (multiple events in same area)
 * - Threat escalation (increasing severity)
 * - Source concentration (unusual source patterns)
 * - Temporal anomalies (unexpected timing)
 * - Sentiment shifts
 * - Cluster explosions (rapid event clustering)
 */

import {
  analyzeEventAnomalies,
  predictEventEscalation,
} from '@/services/anomaly-detection';

/**
 * Example 1: Analyze an event for anomalies
 */
async function exampleAnomalyDetection(event: ClusteredEvent, recentEvents: ClusteredEvent[]) {
  const eventAnomalies = await analyzeEventAnomalies(event, recentEvents);

  console.log('Anomaly Analysis:', {
    eventId: event.id,
    overallScore: eventAnomalies.overallAnomalyScore,
    isAnomalous: eventAnomalies.isAnomalous,
    riskLevel: eventAnomalies.riskLevel,
    anomaliesCount: eventAnomalies.anomalies.length,
    interpretation: eventAnomalies.interpretation,
  });

  // Process each anomaly
  for (const anomaly of eventAnomalies.anomalies) {
    console.log(`  - ${anomaly.type}:`, {
      score: anomaly.score,
      likelihood: anomaly.likelihood,
      deviation: anomaly.deviation,
      metadata: anomaly.metadata,
    });
  }

  return eventAnomalies;
}

/**
 * Example 2: Predict escalation
 */
async function examplePredictEscalation(event: ClusteredEvent) {
  const prediction = predictEventEscalation(event); // Next 24 hours

  console.log('Escalation Prediction (24h):', {
    probability: `${(prediction.probability * 100).toFixed(0)}%`,
    expectedThreat: prediction.expectedThreatLevel,
    indicators: prediction.indicators,
  });

  if (prediction.probability > 0.6) {
    console.warn('⚠️  HIGH ESCALATION RISK DETECTED');
  }

  return prediction;
}

// ============================================================================
// 5. INTEGRATED INTELLIGENCE AUGMENTATION
// ============================================================================

/**
 * EXAMPLE: Using all systems together
 * 
 * The intelligence-augmentation service coordinates all four systems
 * to provide comprehensive event enrichment.
 */

import {
  initIntelligenceAugmentation,
  augmentEvents,
  type EnrichedEvent,
} from '@/services/intelligence-augmentation';

/**
 * Example: Augment events with all intelligence layers
 */
async function exampleFullAugmentation(events: ClusteredEvent[]): Promise<EnrichedEvent[]> {
  // Initialize all systems
  await initIntelligenceAugmentation();

  // Augment events (this runs all four systems)
  const enrichedEvents = await augmentEvents(events);

  for (const event of enrichedEvents) {
    console.log(`\n📊 Event: ${event.primaryTitle}`);

    // Show alerts
    if (event._augmented.triggeredAlerts.length > 0) {
      console.log('  🚨 Triggered Alerts:');
      for (const alert of event._augmented.triggeredAlerts) {
        console.log(`    - ${alert.ruleName}`);
      }
    }

    // Show anomalies
    if (event._augmented.anomalies) {
      console.log(
        `  ⚠️  Anomalies: ${event._augmented.anomalies.overallAnomalyScore.toFixed(2)} ` +
        `(${event._augmented.anomalies.riskLevel})`,
      );
    }

    // Show satellite data
    if (event._augmented.satelliteContext) {
      const sat = event._augmented.satelliteContext;
      console.log(`  🛰️  Satellite: ${sat.nearbyAnomalies.length} anomalies, ` +
        `Risk ${(sat.riskAssessment.overallRisk * 100).toFixed(0)}%`);
    }

    // Show escalation prediction
    if (event._augmented.escalationPrediction) {
      const pred = event._augmented.escalationPrediction;
      console.log(`  📈 Escalation Risk: ${(pred.probability * 100).toFixed(0)}%`);
    }
  }

  return enrichedEvents;
}

// ============================================================================
// INTEGRATION WITH EXISTING SYSTEMS
// ============================================================================

/**
 * Integration point: In the news loading/fetching service
 * 
 * Add this to the news fetching pipeline:
 */

async function integrateIntoNewsLoading(events: ClusteredEvent[]) {
  // Existing code...
  // const events = await fetchNews();

  // NEW: Augment with intelligence
  const enrichedEvents = await augmentEvents(events);

  // Use enriched events with all augmentation data
  return enrichedEvents;
}

/**
 * Integration point: In map layer rendering
 * 
 * Use augmentation data to color/highlight events:
 */

function getEventMarkerColor(event: EnrichedEvent): string {
  // Check for triggered alerts
  if (event._augmented.triggeredAlerts.length > 0) {
    const firstAlert = event._augmented.triggeredAlerts[0];
    if (firstAlert && firstAlert.highlightColor) return firstAlert.highlightColor;
  }

  // Check for anomalies
  if (event._augmented.anomalies?.isAnomalous) {
    const scores = {
      low: '#ffff00',
      medium: '#ff8800',
      high: '#ff0000',
      critical: '#800000',
    } as const;
    const risk = event._augmented.anomalies.riskLevel as keyof typeof scores;
    return scores[risk] || '#ff0000';
  }

  // Default coloring
  return '#0000ff';
}

/**
 * Integration point: In event detail panel
 * 
 * Display augmentation data in the UI:
 */

function displayEventAugmentation(event: EnrichedEvent): string {
  let html = '<div class="augmented-data">';

  // Alerts section
  if (event._augmented.triggeredAlerts.length > 0) {
    html += '<section><h3>⚠️  Triggered Alerts</h3><ul>';
    for (const alert of event._augmented.triggeredAlerts) {
      html += `<li>${alert.ruleName}</li>`;
    }
    html += '</ul></section>';
  }

  // Anomalies section
  if (event._augmented.anomalies) {
    html += `<section><h3>🔍 Anomaly Analysis</h3>
      <p>Risk Level: <strong>${event._augmented.anomalies.riskLevel}</strong></p>
      <p>${event._augmented.anomalies.interpretation}</p>
    </section>`;
  }

  // Satellite section
  if (event._augmented.satelliteContext) {
    const sat = event._augmented.satelliteContext;
    html += `<section><h3>🛰️  Satellite Data</h3>
      <p>${sat.summary}</p>
      <details>
        <summary>Risk Assessment</summary>
        <ul>
          <li>Thermal: ${(sat.riskAssessment.thermalRisk * 100).toFixed(0)}%</li>
          <li>Flood: ${(sat.riskAssessment.floodRisk * 100).toFixed(0)}%</li>
          <li>Crop Stress: ${(sat.riskAssessment.cropStressRisk * 100).toFixed(0)}%</li>
          <li>Air Quality: ${(sat.riskAssessment.airQualityRisk * 100).toFixed(0)}%</li>
        </ul>
      </details>
    </section>`;
  }

  html += '</div>';
  return html;
}

// ============================================================================
// HELPER FUNCTIONS (Placeholder)
// ============================================================================

function sendNotification(message: string) {
  // try to use the browser Notification API if available; otherwise
  // fall back to console.log so examples still work in Node tests.
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(message);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          new Notification(message);
        } else {
          console.log(`📢 Notification (denied): ${message}`);
        }
      });
    } else {
      console.log(`📢 Notification (denied): ${message}`);
    }
  } else {
    console.log(`📢 Notification: ${message}`);
  }
}

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

export {
  exampleAlertRule1,
  exampleAlertRule2,
  exampleEvaluateRules,
  exampleDeduplication,
  exampleSatelliteInit,
  exampleGetSatelliteData,
  exampleAnomalyDetection,
  examplePredictEscalation,
  exampleFullAugmentation,
  integrateIntoNewsLoading,
  getEventMarkerColor,
  displayEventAugmentation,
};
