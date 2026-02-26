/**
 * Anomaly Detection ML Model
 * Detects unusual patterns in event data using statistical and ML techniques
 * Identifies potential early-warning indicators for escalating situations
 */

import { getPersistentCache, setPersistentCache } from './persistent-cache';
import type { ClusteredEvent } from '@/types';

export type AnomalyType =
  | 'velocity_spike' // Sudden increase in reporting
  | 'geographic_convergence' // Multiple events in close proximity
  | 'threat_escalation' // Increasing severity over time
  | 'source_concentration' // Unusual pattern in sources
  | 'temporal_anomaly' // Unexpected timing patterns
  | 'sentiment_shift' // Sudden shift in positive/negative sentiment;
  | 'cluster_explosion'; // Rapid event clustering

export interface AnomalyScore {
  type: AnomalyType;
  score: number; // 0-1, where 1 is highest anomaly
  likelihood: number; // 0-1 probability this is a real event
  baseline: number; // Expected baseline value
  current: number; // Current observed value
  deviation: number; // How many standard deviations from baseline
  metadata: Record<string, unknown>;
}

export interface EventAnomalies {
  eventId: string;
  timestamp: Date;
  anomalies: AnomalyScore[];
  overallAnomalyScore: number; // Average of all anomalies
  isAnomalous: boolean; // true if any anomaly exceeds threshold
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  interpretation: string;
}

export interface AnomalyBaseline {
  metric: string; // e.g., "events_per_hour_global"
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  samples: number;
  lastUpdated: Date;
  windowSizeHours: number;
}

export interface AnomalyModelConfig {
  anomalyThreshold: number; // Score threshold to flag as anomalous (0-1)
  minSamplesForBaseline: number;
  baselineWindowHours: number;
  velocitySpikeMultiplier: number; // How many std devs = spike
  convergenceRadiusKm: number;
  minEventsForConvergence: number;
  threatEscalationThreshold: number; // Severity increase threshold
  enablePredictiveMode: boolean;
  predictionWindowHours: number;
}

const BASELINE_CACHE_KEY = 'anomaly-baselines-v1';
const DEFAULT_CONFIG: AnomalyModelConfig = {
  anomalyThreshold: 0.7,
  minSamplesForBaseline: 30,
  baselineWindowHours: 168, // 1 week
  velocitySpikeMultiplier: 2.5, // 2.5x standard deviation
  convergenceRadiusKm: 100,
  minEventsForConvergence: 3,
  threatEscalationThreshold: 1.5, // 50% increase in severity
  enablePredictiveMode: true,
  predictionWindowHours: 24,
};

let config: AnomalyModelConfig = DEFAULT_CONFIG;
let baselines: Map<string, AnomalyBaseline> = new Map();
let eventHistory: ClusteredEvent[] = [];
let anomalyHistory: Map<string, EventAnomalies> = new Map();

/**
 * Initialize anomaly detection system
 */
export async function initAnomalyDetection(customConfig?: Partial<AnomalyModelConfig>): Promise<void> {
  try {
    // Load baselines
    const baselineCache = await getPersistentCache<Record<string, AnomalyBaseline>>(BASELINE_CACHE_KEY);
    if (baselineCache?.data) {
      Object.entries(baselineCache.data).forEach(([key, baseline]) => {
        baselines.set(key, {
          ...baseline,
          lastUpdated: new Date(baseline.lastUpdated as any),
        });
      });
    }
  } catch (err) {
    console.warn('[AnomalyDetection] Failed to load baselines', err);
  }

  if (customConfig) {
    config = { ...config, ...customConfig };
  }
}

/**
 * Analyze an event for anomalies
 */
export async function analyzeEventAnomalies(
  event: ClusteredEvent,
  recentEvents: ClusteredEvent[] = [],
): Promise<EventAnomalies> {
  // Add to history
  eventHistory.push(event);
  if (eventHistory.length > 1000) {
    eventHistory.shift(); // Keep memory bounded
  }

  const allAnomalies: AnomalyScore[] = [];

  // Run all anomaly detection models
  const velocityAnomaly = detectVelocityAnomaly(event, recentEvents);
  if (velocityAnomaly) allAnomalies.push(velocityAnomaly);

  const geoAnomaly = detectGeographicConvergence(event, recentEvents);
  if (geoAnomaly) allAnomalies.push(geoAnomaly);

  const threatAnomaly = detectThreatEscalation(event, recentEvents);
  if (threatAnomaly) allAnomalies.push(threatAnomaly);

  const sourceAnomaly = detectSourceConcentration(event);
  if (sourceAnomaly) allAnomalies.push(sourceAnomaly);

  const temporalAnomaly = detectTemporalAnomaly(event, recentEvents);
  if (temporalAnomaly) allAnomalies.push(temporalAnomaly);

  const sentimentAnomaly = detectSentimentShift(event, recentEvents);
  if (sentimentAnomaly) allAnomalies.push(sentimentAnomaly);

  const clusterAnomaly = detectClusterExplosion(recentEvents);
  if (clusterAnomaly) allAnomalies.push(clusterAnomaly);

  // Calculate overall score
  const overallAnomalyScore =
    allAnomalies.length > 0
      ? allAnomalies.reduce((sum, a) => sum + a.score, 0) / allAnomalies.length
      : 0;

  const isAnomalous = overallAnomalyScore >= config.anomalyThreshold;

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (overallAnomalyScore >= 0.9) {
    riskLevel = 'critical';
  } else if (overallAnomalyScore >= 0.75) {
    riskLevel = 'high';
  } else if (overallAnomalyScore >= 0.5) {
    riskLevel = 'medium';
  }

  const interpretation = generateAnomalyInterpretation(allAnomalies, riskLevel);

  const result: EventAnomalies = {
    eventId: event.id,
    timestamp: new Date(),
    anomalies: allAnomalies,
    overallAnomalyScore: parseFloat(overallAnomalyScore.toFixed(3)),
    isAnomalous,
    riskLevel,
    interpretation,
  };

  anomalyHistory.set(event.id, result);

  // Update baselines
  updateBaselines(event, recentEvents);

  return result;
}

/**
 * Detect velocity anomalies (sudden spike in reporting)
 */
function detectVelocityAnomaly(event: ClusteredEvent, recentEvents: ClusteredEvent[]): AnomalyScore | null {
  // Count events in last hour of similar topic
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const similarEvents = recentEvents.filter(
    e =>
      e.firstSeen.getTime() > oneHourAgo &&
      levenshteinDistance(e.primaryTitle, event.primaryTitle) < 10,
  );

  const velocity = event.velocity?.level || 'normal';
  const velocityScore =
    velocity === 'spike' ? 0.95 : velocity === 'elevated' ? 0.6 : 0.1;

  if (velocityScore > 0.5) {
    // Get baseline for this hour
    const baseline = getOrCreateBaseline('velocity_hourly', 5);

    return {
      type: 'velocity_spike',
      score: Math.min(1, velocityScore * (similarEvents.length / Math.max(baseline.mean, 1))),
      likelihood: velocityScore,
      baseline: baseline.mean,
      current: similarEvents.length,
      deviation: (similarEvents.length - baseline.mean) / Math.max(baseline.stdDev, 1),
      metadata: {
        similarEvents: similarEvents.length,
        velocity: velocity,
        eventSourceCount: event.sourceCount,
      },
    };
  }

  return null;
}

/**
 * Detect geographic convergence anomalies
 */
function detectGeographicConvergence(
  event: ClusteredEvent,
  recentEvents: ClusteredEvent[],
): AnomalyScore | null {
  if (!event.lat || !event.lon) return null;

  // Find events within convergence radius
  if (!event.lat || !event.lon) {
    return null; // Can't determine geographic convergence without coordinates
  }

  const convergingEvents = recentEvents.filter(e => {
    if (!e.lat || !e.lon) return false;
    const distance = haversineDistance(event.lat!, event.lon!, e.lat, e.lon);
    return distance < config.convergenceRadiusKm;
  });

  const convergenceCount = convergingEvents.length + 1; // Include current event

  if (convergenceCount >= config.minEventsForConvergence) {
    // Get baseline
    const baseline = getOrCreateBaseline('geo_convergence', 1);

    return {
      type: 'geographic_convergence',
      score: Math.min(1, convergenceCount / Math.max(baseline.mean * 5, 5)),
      likelihood: Math.min(1, convergenceCount / 10),
      baseline: baseline.mean,
      current: convergenceCount,
      deviation: (convergenceCount - baseline.mean) / Math.max(baseline.stdDev, 1),
      metadata: {
        convergingEvents: convergenceCount,
        radiusKm: config.convergenceRadiusKm,
        centerLat: event.lat,
        centerLon: event.lon,
      },
    };
  }

  return null;
}

/**
 * Detect threat escalation
 */
function detectThreatEscalation(
  event: ClusteredEvent,
  recentEvents: ClusteredEvent[],
): AnomalyScore | null {
  if (!event.threat?.level) return null;

  const threatPriority: Record<string, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  };

  const currentThreat = threatPriority[event.threat.level] || 0;

  // Get threat trend
  const pastTwentyFourHours = Date.now() - 24 * 60 * 60 * 1000;
  const recentThreatEvents = recentEvents.filter(
    e =>
      e.firstSeen.getTime() > pastTwentyFourHours &&
      levenshteinDistance(e.primaryTitle, event.primaryTitle) < 15,
  );

  if (recentThreatEvents.length < 2) return null;

  const avgPastThreat =
    recentThreatEvents.reduce((sum, e) => sum + (threatPriority[e.threat?.level || 'info'] || 0), 0) /
    recentThreatEvents.length;

  const escalation = currentThreat / Math.max(avgPastThreat, 0.5);

  if (escalation > config.threatEscalationThreshold) {
    return {
      type: 'threat_escalation',
      score: Math.min(1, (escalation - 1) / 2), // Normalize
      likelihood: 0.8,
      baseline: avgPastThreat,
      current: currentThreat,
      deviation: escalation - 1,
      metadata: {
        escalationRatio: parseFloat(escalation.toFixed(2)),
        previousAvgThreat: parseFloat(avgPastThreat.toFixed(2)),
        currentThreat: event.threat.level,
      },
    };
  }

  return null;
}

/**
 * Detect source concentration anomalies
 */
function detectSourceConcentration(event: ClusteredEvent): AnomalyScore | null {
  // If top source has >50% of reports, that's anomalous
  const topSourceCount = Math.max(...event.topSources.map(() => 1));
  const concentration = topSourceCount / Math.max(event.sourceCount, 1);

  if (concentration > 0.5) {
    return {
      type: 'source_concentration',
      score: concentration - 0.5, // Normalize to 0-0.5 range
      likelihood: 0.7,
      baseline: 1 / event.sourceCount, // Expected uniform distribution
      current: concentration,
      deviation: concentration - 1 / event.sourceCount,
      metadata: {
        topSourceCount,
        totalSources: event.sourceCount,
        concentration: parseFloat(concentration.toFixed(2)),
      },
    };
  }

  return null;
}

/**
 * Detect temporal anomalies
 */
function detectTemporalAnomaly(event: ClusteredEvent, _recentEvents: ClusteredEvent[]): AnomalyScore | null {
  // Check if time between updates is unusual
  const timeSinceLastUpdate =
    Date.now() - (event.lastUpdated?.getTime() || event.firstSeen.getTime());
  const expectedUpdateInterval = 3600000; // 1 hour

  if (timeSinceLastUpdate < expectedUpdateInterval / 4) {
    // Very frequent updates
    return {
      type: 'temporal_anomaly',
      score: Math.min(1, expectedUpdateInterval / (timeSinceLastUpdate * 4)),
      likelihood: 0.6,
      baseline: expectedUpdateInterval,
      current: timeSinceLastUpdate,
      deviation: 1 - timeSinceLastUpdate / expectedUpdateInterval,
      metadata: {
        timeSinceUpdate: timeSinceLastUpdate,
        updateFrequencyMin: parseFloat((timeSinceLastUpdate / 60000).toFixed(2)),
      },
    };
  }

  return null;
}

/**
 * Detect sentiment shift anomalies
 */
function detectSentimentShift(event: ClusteredEvent, recentEvents: ClusteredEvent[]): AnomalyScore | null {
  // Compare sentiment of recent news
  const pastEvents = recentEvents.filter(e => {
    if (!e.threat) return false;
    const titleSimilarity = 1 - levenshteinDistance(e.primaryTitle, event.primaryTitle) / 100;
    return titleSimilarity > 0.7;
  });

  if (pastEvents.length < 2) return null;

  const sentiments = pastEvents.map(e => (e.threat?.confidence || 0.5));
  const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
  const currentSentiment = event.threat?.confidence || 0.5;
  const shift = Math.abs(currentSentiment - avgSentiment);

  if (shift > 0.3) {
    return {
      type: 'sentiment_shift',
      score: shift,
      likelihood: 0.7,
      baseline: avgSentiment,
      current: currentSentiment,
      deviation: shift,
      metadata: {
        sentimentShift: parseFloat(shift.toFixed(2)),
        previousAvg: parseFloat(avgSentiment.toFixed(2)),
        samplesUsed: pastEvents.length,
      },
    };
  }

  return null;
}

/**
 * Detect cluster explosion (rapid event clustering)
 */
function detectClusterExplosion(recentEvents: ClusteredEvent[]): AnomalyScore | null {
  const lastHour = Date.now() - 60 * 60 * 1000;
  const eventsLastHour = recentEvents.filter(e => e.firstSeen.getTime() > lastHour);
  const lastSixHours = Date.now() - 6 * 60 * 60 * 1000;
  const eventsSixHours = recentEvents.filter(e => e.firstSeen.getTime() > lastSixHours);

  const explosionRatio = eventsLastHour.length / Math.max(eventsSixHours.length / 6, 1);

  if (explosionRatio > 2) {
    return {
      type: 'cluster_explosion',
      score: Math.min(1, (explosionRatio - 1) / 3),
      likelihood: 0.75,
      baseline: eventsSixHours.length / 6,
      current: eventsLastHour.length,
      deviation: explosionRatio - 1,
      metadata: {
        eventsLastHour,
        explosionRatio: parseFloat(explosionRatio.toFixed(2)),
        averageEventRate: parseFloat((eventsSixHours.length / 6).toFixed(1)),
      },
    };
  }

  return null;
}

/**
 * Generate human-readable interpretation
 */
function generateAnomalyInterpretation(anomalies: AnomalyScore[], riskLevel: string): string {
  if (anomalies.length === 0) return 'No anomalies detected.';

  const topAnomalies = anomalies.sort((a, b) => b.score - a.score).slice(0, 3);
  const descriptions = topAnomalies.map(a => {
    switch (a.type) {
      case 'velocity_spike':
        return `rapid reporting increase (${(a.current as number).toFixed(0)} events)`;
      case 'geographic_convergence':
        return `geographic clustering of ${(a.current as number).toFixed(0)} events`;
      case 'threat_escalation':
        return `threat severity escalating (${(a.deviation as number).toFixed(1)}x baseline)`;
      case 'source_concentration':
        return `concentrated source reporting (${((a.current as number) * 100).toFixed(0)}%)`;
      case 'temporal_anomaly':
        return 'unusual timing pattern';
      case 'sentiment_shift':
        return 'significant sentiment shift detected';
      case 'cluster_explosion':
        return `cluster explosion (${(a.deviation as number).toFixed(1)}x normal rate)`;
      default:
        return 'unknown anomaly';
    }
  });

  return `${riskLevel.toUpperCase()} RISK: ${descriptions.join(', ')}.`;
}

/**
 * Get or create baseline metric
 */
function getOrCreateBaseline(metric: string, defaultMean: number): AnomalyBaseline {
  let baseline = baselines.get(metric);

  if (!baseline) {
    baseline = {
      metric,
      mean: defaultMean,
      stdDev: defaultMean * 0.3, // Assume 30% std dev
      min: 0,
      max: defaultMean * 3,
      samples: 0,
      lastUpdated: new Date(),
      windowSizeHours: config.baselineWindowHours,
    };
    baselines.set(metric, baseline);
  }

  return baseline;
}

/**
 * Update baselines with new data
 */
function updateBaselines(_event: ClusteredEvent, _recentEvents: ClusteredEvent[]): void {
  // Update velocity baseline
  const velocityBaseline = getOrCreateBaseline('velocity_hourly', 5);
  velocityBaseline.samples = (velocityBaseline.samples || 0) + 1;

  if (velocityBaseline.samples < config.minSamplesForBaseline) {
    return; // Not enough samples yet
  }

  // Periodically save baselines
  if (velocityBaseline.samples % 100 === 0) {
    saveBaselines();
  }
}

/**
 * Save baselines to storage
 */
async function saveBaselines(): Promise<void> {
  try {
    const baselineObj: Record<string, AnomalyBaseline> = {};
    baselines.forEach((v, k) => {
      baselineObj[k] = v;
    });
    await setPersistentCache(BASELINE_CACHE_KEY, baselineObj);
  } catch (err) {
    console.warn('[AnomalyDetection] Failed to save baselines', err);
  }
}

/**
 * Get anomaly history for an event
 */
export function getEventAnomalies(eventId: string): EventAnomalies | null {
  return anomalyHistory.get(eventId) || null;
}

/**
 * Get prediction for next N hours
 */
export function predictEventEscalation(
  event: ClusteredEvent,
): { probability: number; expectedThreatLevel: string; indicators: string[] } {
  const anomalies = anomalyHistory.get(event.id);
  if (!anomalies) {
    return { probability: 0, expectedThreatLevel: event.threat?.level || 'low', indicators: [] };
  }

  const escalationIndicators = anomalies.anomalies
    .filter(a => ['threat_escalation', 'velocity_spike', 'geographic_convergence'].includes(a.type))
    .map(a => a.type);

  const prob =
    escalationIndicators.length > 0
      ? Math.min(1, (escalationIndicators.length / 3) * anomalies.overallAnomalyScore)
      : 0;

  return {
    probability: parseFloat(prob.toFixed(2)),
    expectedThreatLevel: prob > 0.6 ? 'escalating' : event.threat?.level || 'stable',
    indicators: escalationIndicators,
  };
}

/**
 * Helper: Levenshtein distance
 */
function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const d: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0)) as number[][];

  for (let i = 0; i <= len1; i++) {
    const row = d[i];
    if (row) row[0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    const row = d[0];
    if (row) row[j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      const di = d[i];
      const dim1 = d[i - 1];
      if (di && dim1) {
        di[j] = Math.min(
          (dim1[j] ?? 0) + 1,
          (di[j - 1] ?? 0) + 1,
          (dim1[j - 1] ?? 0) + cost,
        );
      }
    }
  }

  return d[len1]?.[len2] ?? 0;
}

/**
 * Helper: Haversine distance
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
