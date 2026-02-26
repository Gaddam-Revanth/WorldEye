/**
 * Event Deduplication Service
 * Detects and merges duplicate events using similarity metrics
 */

import { getPersistentCache, setPersistentCache } from './persistent-cache';
import type { ClusteredEvent, NewsItem } from '@/types';

export type SimilarityMetric = 'levenshtein' | 'jaccardWords' | 'semanticHash';

export interface DeduplicationScore {
  titleSimilarity: number;
  sourceSimilarity: number;
  locationSimilarity: number;
  timeSimilarity: number;
  overallScore: number;
  metrics: {
    titleMethod: SimilarityMetric;
    sourceMethod: SimilarityMetric;
  };
}

export interface DuplicateGroup {
  id: string;
  primaryEvent: ClusteredEvent;
  duplicates: Array<{
    event: ClusteredEvent;
    score: DeduplicationScore;
  }>;
  mergedAt: Date;
  isMerged: boolean;
}

export interface DeduplicationStats {
  totalEventsProcessed: number;
  duplicatesFound: number;
  eventsAfterDedup: number;
  mergedGroups: number;
  lastRun: Date;
}

const DEDUP_STATS_CACHE_KEY = 'event-dedup-stats-v1';
const SIMILARITY_THRESHOLD = 0.75; // 75% similarity = duplicate
const TIME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

let deduplicationStats: DeduplicationStats = {
  totalEventsProcessed: 0,
  duplicatesFound: 0,
  eventsAfterDedup: 0,
  mergedGroups: 0,
  lastRun: new Date(),
};

/**
 * Initialize deduplication system
 */
export async function initDeduplication(): Promise<void> {
  try {
    const cached = await getPersistentCache<DeduplicationStats>(DEDUP_STATS_CACHE_KEY);
    if (cached?.data) {
      deduplicationStats = cached.data;
    }
  } catch (err) {
    console.warn('[Deduplication] Failed to load stats', err);
  }
}

/**
 * Deduplicate a batch of events
 */
export async function deduplicateEvents(events: ClusteredEvent[]): Promise<ClusteredEvent[]> {
  if (events.length < 2) {
    deduplicationStats.totalEventsProcessed += events.length;
    return events;
  }

  const groups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();

  for (let i = 0; i < events.length; i++) {
    const evt = events[i]!;
    if (processedIds.has(evt.id)) continue;

    const primaryEvent = evt;
    const group: DuplicateGroup = {
      id: `group-${primaryEvent.id}`,
      primaryEvent,
      duplicates: [],
      mergedAt: new Date(),
      isMerged: false,
    };

    for (let j = i + 1; j < events.length; j++) {
      const evtJ = events[j]!;
      if (processedIds.has(evtJ.id)) continue;

      const score = calculateSimilarityScore(primaryEvent, evtJ);

      if (score.overallScore >= SIMILARITY_THRESHOLD) {
        group.duplicates.push({
          event: evtJ,
          score,
        });
        group.isMerged = true;
        processedIds.add(evtJ.id);
      }
    }

    groups.push(group);
    processedIds.add(primaryEvent.id);
  }

  // Merge duplicate events in each group
  const dedupedEvents = groups.map(g => mergeEventGroup(g));

  // Update statistics
  deduplicationStats.totalEventsProcessed += events.length;
  deduplicationStats.duplicatesFound += Array.from(processedIds).length - dedupedEvents.length;
  deduplicationStats.eventsAfterDedup = dedupedEvents.length;
  deduplicationStats.mergedGroups += groups.filter(g => g.isMerged).length;
  deduplicationStats.lastRun = new Date();

  await saveDeduplicationStats();

  return dedupedEvents;
}

/**
 * Calculate similarity score between two events
 */
function calculateSimilarityScore(event1: ClusteredEvent, event2: ClusteredEvent): DeduplicationScore {
  // Time-based filtering: events older than 24 hours are not duplicates
  const timeDiff = Math.abs(event1.firstSeen.getTime() - event2.firstSeen.getTime());
  if (timeDiff > TIME_WINDOW_MS) {
    return {
      titleSimilarity: 0,
      sourceSimilarity: 0,
      locationSimilarity: 0,
      timeSimilarity: 0,
      overallScore: 0,
      metrics: { titleMethod: 'levenshtein', sourceMethod: 'jaccardWords' },
    };
  }

  // Calculate individual similarities
  const titleSimilarity = calculateStringSimilarity(event1.primaryTitle, event2.primaryTitle);
  const sourceSimilarity = calculateSourceSimilarity(event1.topSources, event2.topSources);
  const locationSimilarity = calculateLocationSimilarity(event1, event2);
  const timeSimilarity = 1 - Math.min(timeDiff / TIME_WINDOW_MS, 1);

  // Weighted average
  const overallScore =
    titleSimilarity * 0.4 +
    sourceSimilarity * 0.2 +
    locationSimilarity * 0.2 +
    timeSimilarity * 0.2;

  return {
    titleSimilarity,
    sourceSimilarity,
    locationSimilarity,
    timeSimilarity,
    overallScore,
    metrics: { titleMethod: 'levenshtein', sourceMethod: 'jaccardWords' },
  };
}

/**
 * Calculate Levenshtein distance-based similarity (0-1)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;

  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);

  return 1 - distance / maxLen;
}

/**
 * Levenshtein distance algorithm
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
          (dim1[j] ?? 0) + 1, // deletion
          (di[j - 1] ?? 0) + 1, // insertion
          (dim1[j - 1] ?? 0) + cost, // substitution
        );
      }
    }
  }

  return d[len1]?.[len2] ?? 0;
}

/**
 * Calculate Jaccard similarity for sources
 */
function calculateSourceSimilarity(
  sources1: Array<{ name: string; tier: number; url: string }>,
  sources2: Array<{ name: string; tier: number; url: string }>,
): number {
  if (sources1.length === 0 || sources2.length === 0) return 0;

  const set1 = new Set(sources1.map(s => s.name.toLowerCase()));
  const set2 = new Set(sources2.map(s => s.name.toLowerCase()));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Calculate location-based similarity
 */
function calculateLocationSimilarity(event1: ClusteredEvent, event2: ClusteredEvent): number {
  if (!event1.lat || !event1.lon || !event2.lat || !event2.lon) {
    return 0; // No coordinates available
  }

  const distance = calculateHaversineDistance(event1.lat, event1.lon, event2.lat, event2.lon);
  const maxDistance = 50; // km

  return Math.max(0, 1 - distance / maxDistance);
}

/**
 * Haversine distance (km)
 */
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

/**
 * Merge a group of duplicate events into one
 */
function mergeEventGroup(group: DuplicateGroup): ClusteredEvent {
  if (group.duplicates.length === 0) {
    return group.primaryEvent;
  }

  const merged = { ...group.primaryEvent };

  // Gather all items and sources
  const allItems: NewsItem[] = [...merged.allItems];
  const sourceSet = new Map<string, { name: string; tier: number; url: string }>();

  merged.topSources.forEach(s => sourceSet.set(s.name.toLowerCase(), s));

  for (const dup of group.duplicates) {
    allItems.push(...dup.event.allItems);
    dup.event.topSources.forEach(s => sourceSet.set(s.name.toLowerCase(), s));
  }

  // Sort items by date (newest first)
  allItems.sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0));

  // Update merged event
  merged.allItems = allItems;
  merged.topSources = Array.from(sourceSet.values())
    .sort((a, b) => a.tier - b.tier)
    .slice(0, 5); // Keep top 5 sources
  merged.sourceCount = sourceSet.size;
  merged.lastUpdated = new Date(Math.max(
    merged.lastUpdated.getTime(),
    ...group.duplicates.map(d => d.event.lastUpdated.getTime()),
  ));

  // Merge metadata
  if (!merged.lat && !merged.lon && group.duplicates.some(d => d.event.lat && d.event.lon)) {
    const locEvent = group.duplicates.find(d => d.event.lat && d.event.lon);
    if (locEvent) {
      merged.lat = locEvent.event.lat;
      merged.lon = locEvent.event.lon;
    }
  }

  return merged;
}

/**
 * Get deduplication statistics
 */
export function getDeduplicationStats(): DeduplicationStats {
  return { ...deduplicationStats };
}

/**
 * Reset deduplication statistics
 */
export async function resetDeduplicationStats(): Promise<void> {
  deduplicationStats = {
    totalEventsProcessed: 0,
    duplicatesFound: 0,
    eventsAfterDedup: 0,
    mergedGroups: 0,
    lastRun: new Date(),
  };
  await saveDeduplicationStats();
}

/**
 * Save deduplication statistics
 */
async function saveDeduplicationStats(): Promise<void> {
  try {
    await setPersistentCache(DEDUP_STATS_CACHE_KEY, deduplicationStats);
  } catch (err) {
    console.warn('[Deduplication] Failed to save stats', err);
  }
}
