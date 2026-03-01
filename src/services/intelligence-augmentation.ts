/**
 * Intelligence Augmentation Service
 * Integrates alert rules, event deduplication, satellite data, and anomaly detection
 */

import { initAlertRules, evaluateEventAgainstRules, recordAlertTrigger } from './alert-rules';
import { initDeduplication, deduplicateEvents, getDeduplicationStats } from './event-deduplication';
import { initSatelliteService, getSatelliteContext } from './satellite-integration';
import { initAnomalyDetection, analyzeEventAnomalies, predictEventEscalation, type EventAnomalies } from './anomaly-detection';
import type { ClusteredEvent } from '@/types';

export interface EnrichedEvent extends ClusteredEvent {
  _augmented: {
    triggeredAlerts: Array<{
      ruleId: string;
      ruleName: string;
      highlightColor?: string;
    }>;
    deduplicationInfo?: {
      isDuplicate: boolean;
      mergedFrom: number;
    };
    satelliteContext?: any; // SatelliteContext type
    anomalies: EventAnomalies;
    escalationPrediction?: {
      probability: number;
      indicators: string[];
    };
  };
}

let isInitialized = false;

/**
 * Initialize all intelligence augmentation systems
 */
export async function initIntelligenceAugmentation(): Promise<void> {
  if (isInitialized) return;

  try {
    await Promise.all([
      initAlertRules(),
      initDeduplication(),
      initSatelliteService(),
      initAnomalyDetection(),
    ]);

    console.log('[IntelligenceAugmentation] All systems initialized');
    isInitialized = true;
  } catch (err) {
    console.error('[IntelligenceAugmentation] Failed to initialize', err);
    throw err;
  }
}

/**
 * Augment a batch of events with intelligence
 */
export async function augmentEvents(events: ClusteredEvent[]): Promise<EnrichedEvent[]> {
  if (!isInitialized) {
    await initIntelligenceAugmentation();
  }

  try {
    // Step 1: Deduplicate events
    const dedupedEvents = await deduplicateEvents(events);

    // Step 2: Augment each event
    const enrichedEvents = await Promise.all(
      dedupedEvents.map(async (event) => augmentSingleEvent(event, dedupedEvents)),
    );

    return enrichedEvents;
  } catch (err) {
    console.error('[IntelligenceAugmentation] Failed to augment events', err);
    // Return base augmented events on error
    return events.map(e => ({
      ...e,
      _augmented: {
        triggeredAlerts: [],
        deduplicationInfo: { isDuplicate: false, mergedFrom: 0 },
        anomalies: {
          eventId: e.id,
          timestamp: e.firstSeen,
          anomalies: [],
          overallAnomalyScore: 0,
          isAnomalous: false,
          riskLevel: 'low',
          interpretation: 'Augmentation failed',
        },
      },
    }));
  }
}

/**
 * Augment a single event with all intelligence layers
 */
async function augmentSingleEvent(event: ClusteredEvent, allEvents: ClusteredEvent[]): Promise<EnrichedEvent> {
  const recentEvents = allEvents.filter(e => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    return e.firstSeen.getTime() > hourAgo && e.id !== event.id;
  });

  // Get triggered alerts
  const triggeredRules = evaluateEventAgainstRules(event);
  for (const rule of triggeredRules) {
    await recordAlertTrigger(rule.id);
  }

  // Get satellite context
  let satelliteContext;
  try {
    satelliteContext = await getSatelliteContext(event, 50);
  } catch (err) {
    console.warn('[IntelligenceAugmentation] Failed to get satellite context', err);
  }

  // Get anomalies
  let anomalies: EventAnomalies = {
    eventId: event.id,
    timestamp: event.firstSeen,
    anomalies: [],
    overallAnomalyScore: 0,
    isAnomalous: false,
    riskLevel: 'low',
    interpretation: 'Anomaly detection skipped',
  };
  let escalationPrediction;
  try {
    const res = await analyzeEventAnomalies(event, recentEvents);
    if (res) anomalies = res;
    escalationPrediction = predictEventEscalation(event);
  } catch (err) {
    console.warn('[IntelligenceAugmentation] Failed to analyze anomalies', err);
  }

  const enriched: EnrichedEvent = {
    ...event,
    _augmented: {
      triggeredAlerts: triggeredRules.map(r => ({
        ruleId: r.id,
        ruleName: r.name,
        highlightColor: r.actions.highlightColor,
      })),
      satelliteContext,
      anomalies,
      escalationPrediction,
    },
  };

  return enriched;
}

/**
 * Get augmentation statistics
 */
export function getAugmentationStats() {
  return {
    deduplication: getDeduplicationStats(),
    initialized: isInitialized,
  };
}

/**
 * Reset all augmentation caches (useful for testing)
 */
export async function resetAugmentationCaches(): Promise<void> {
  // Note: Reset calls would go here for each service
  // This is a placeholder for now
}

/**
 * Export event with augmentation data
 */
export function exportAugmentedEvent(event: EnrichedEvent): Record<string, unknown> {
  return {
    ...event,
    _augmented: event._augmented,
  };
}
