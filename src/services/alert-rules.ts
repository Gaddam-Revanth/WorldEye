/**
 * Alert Rules Engine
 * Manages custom alert rules and evaluates events against them
 */

import { getPersistentCache, setPersistentCache } from './persistent-cache';
import type { ClusteredEvent } from '@/types';

export type AlertRuleOperator = 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex' | 'greaterThan' | 'lessThan';
export type AlertRuleConditionType = 'title' | 'source' | 'threatLevel' | 'category' | 'sourceCount' | 'velocity' | 'keyword';

export interface AlertRuleCondition {
  type: AlertRuleConditionType;
  operator: AlertRuleOperator;
  value: string | number;
  caseSensitive?: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions: AlertRuleCondition[];
  conditionLogic: 'ALL' | 'ANY'; // ALL = and, ANY = or
  actions: {
    notify: boolean;
    extractToPanel?: string; // Optional panel name
    highlightColor?: string; // Highlight color
  };
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AlertRuleStorage {
  rules: AlertRule[];
  version: number;
  lastUpdated: number;
}

const ALERT_RULES_CACHE_KEY = 'alert-rules-v1';

let cachedRules: Map<string, AlertRule> = new Map();

/**
 * Initialize alert rules from persistent storage
 */
export async function initAlertRules(): Promise<void> {
  try {
    const stored = await getPersistentCache<AlertRuleStorage>(ALERT_RULES_CACHE_KEY);
    if (stored?.data?.rules) {
      cachedRules = new Map(stored.data.rules.map(r => [r.id, r]));
    }
  } catch (err) {
    console.warn('[AlertRules] Failed to load rules from storage', err);
    cachedRules = new Map();
  }
}

/**
 * Get all alert rules
 */
export function getAllAlertRules(): AlertRule[] {
  return Array.from(cachedRules.values());
}

/**
 * Get alert rule by ID
 */
export function getAlertRule(id: string): AlertRule | null {
  return cachedRules.get(id) || null;
}

/**
 * Create a new alert rule
 */
export async function createAlertRule(
  name: string,
  conditions: AlertRuleCondition[],
  conditionLogic: 'ALL' | 'ANY' = 'ALL',
  description?: string,
  highlightColor?: string,
): Promise<AlertRule> {
  const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const rule: AlertRule = {
    id,
    name,
    description,
    enabled: true,
    conditions,
    conditionLogic,
    actions: {
      notify: true,
      highlightColor,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    triggerCount: 0,
  };

  cachedRules.set(id, rule);
  await saveRulesToStorage();
  return rule;
}

/**
 * Update an alert rule
 */
export async function updateAlertRule(
  id: string,
  updates: Partial<Omit<AlertRule, 'id' | 'createdAt' | 'triggerCount'>>,
): Promise<AlertRule | null> {
  const rule = cachedRules.get(id);
  if (!rule) return null;

  const updated: AlertRule = {
    ...rule,
    ...updates,
    updatedAt: new Date(),
  };

  cachedRules.set(id, updated);
  await saveRulesToStorage();
  return updated;
}

/**
 * Delete an alert rule
 */
export async function deleteAlertRule(id: string): Promise<boolean> {
  const deleted = cachedRules.delete(id);
  if (deleted) {
    await saveRulesToStorage();
  }
  return deleted;
}

/**
 * Enable/disable an alert rule
 */
export async function toggleAlertRule(id: string, enabled: boolean): Promise<AlertRule | null> {
  return updateAlertRule(id, { enabled });
}

/**
 * Evaluate a single event against all enabled rules
 */
export function evaluateEventAgainstRules(event: ClusteredEvent): AlertRule[] {
  const triggeredRules: AlertRule[] = [];

  for (const rule of cachedRules.values()) {
    if (!rule.enabled) continue;

    if (evaluateEvent(event, rule)) {
      triggeredRules.push(rule);
    }
  }

  return triggeredRules;
}

/**
 * Evaluate if an event matches a rule
 */
function evaluateEvent(event: ClusteredEvent, rule: AlertRule): boolean {
  const matches = rule.conditions.map(condition => evaluateCondition(event, condition));

  if (rule.conditionLogic === 'ALL') {
    return matches.every(m => m);
  } else {
    return matches.some(m => m);
  }
}

/**
 * Evaluate a single condition against an event
 */
function evaluateCondition(event: ClusteredEvent, condition: AlertRuleCondition): boolean {
  switch (condition.type) {
    case 'title':
      return evaluateStringCondition(
        event.primaryTitle,
        condition.operator,
        String(condition.value),
        condition.caseSensitive,
      );

    case 'source':
      return evaluateStringCondition(
        event.primarySource,
        condition.operator,
        String(condition.value),
        condition.caseSensitive,
      );

    case 'threatLevel':
      return event.threat?.level === condition.value;

    case 'category':
      return event.threat?.category === condition.value;

    case 'sourceCount':
      return evaluateNumericCondition(event.sourceCount, condition.operator, Number(condition.value));

    case 'velocity':
      return !!event.velocity && evaluateStringCondition(
        event.velocity.level,
        condition.operator,
        String(condition.value),
      );

    case 'keyword':
      return (
        event.primaryTitle.toLowerCase().includes(String(condition.value).toLowerCase()) ||
        event.allItems.some(item =>
          item.title.toLowerCase().includes(String(condition.value).toLowerCase()),
        )
      );

    default:
      return false;
  }
}

/**
 * Evaluate string conditions
 */
function evaluateStringCondition(
  value: string,
  operator: AlertRuleOperator,
  compareValue: string,
  caseSensitive?: boolean,
): boolean {
  const cs = caseSensitive ?? false;
  const val = cs ? value : value.toLowerCase();
  const comp = cs ? compareValue : compareValue.toLowerCase();

  switch (operator) {
    case 'contains':
      return val.includes(comp);
    case 'equals':
      return val === comp;
    case 'startsWith':
      return val.startsWith(comp);
    case 'endsWith':
      return val.endsWith(comp);
    case 'regex':
      try {
        const regex = new RegExp(comp, caseSensitive ? '' : 'i');
        return regex.test(value);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Evaluate numeric conditions
 */
function evaluateNumericCondition(value: number, operator: AlertRuleOperator, compareValue: number): boolean {
  switch (operator) {
    case 'equals':
      return value === compareValue;
    case 'greaterThan':
      return value > compareValue;
    case 'lessThan':
      return value < compareValue;
    default:
      return false;
  }
}

/**
 * Record rule trigger
 */
export async function recordAlertTrigger(ruleId: string): Promise<void> {
  const rule = cachedRules.get(ruleId);
  if (rule) {
    rule.lastTriggered = new Date();
    rule.triggerCount++;
    await saveRulesToStorage();
  }
}

/**
 * Save rules to persistent storage
 */
async function saveRulesToStorage(): Promise<void> {
  try {
    const storage: AlertRuleStorage = {
      rules: Array.from(cachedRules.values()),
      version: 1,
      lastUpdated: Date.now(),
    };

    await setPersistentCache(ALERT_RULES_CACHE_KEY, storage);
  } catch (err) {
    console.warn('[AlertRules] Failed to save rules to storage', err);
  }
}

/**
 * Export rules as JSON
 */
export function exportRules(): string {
  return JSON.stringify(
    {
      rules: Array.from(cachedRules.values()),
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

/**
 * Import rules from JSON
 */
export async function importRules(jsonString: string): Promise<number> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed.rules)) {
      throw new Error('Invalid rules format: expected array of rules');
    }

    let imported = 0;
    for (const rule of parsed.rules) {
      if (rule.id && rule.name && rule.conditions) {
        // Regenerate ID to avoid conflicts
        const newId = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newRule: AlertRule = {
          ...rule,
          id: newId,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt),
        };
        cachedRules.set(newId, newRule);
        imported++;
      }
    }

    await saveRulesToStorage();
    return imported;
  } catch (err) {
    console.warn('[AlertRules] Failed to import rules', err);
    return 0;
  }
}
