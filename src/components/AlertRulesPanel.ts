import { Panel } from './Panel';
import { escapeHtml } from '@/utils/sanitize';
import {
  getAllAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
  AlertRule,
  AlertRuleCondition,
  AlertRuleConditionType,
  AlertRuleOperator,
} from '@/services/alert-rules';
import type { EnrichedEvent } from '@/services/intelligence-augmentation';

type Tab = 'rules' | 'create' | 'history';

export class AlertRulesPanel extends Panel {
  private currentTab: Tab = 'rules';
  private rules: AlertRule[] = [];
  private editingRuleId: string | null = null;
  private enrichedEvents: EnrichedEvent[] = [];

  constructor() {
    super({ id: 'alert-rules', title: '🚨 Alert Rules Engine', showCount: false });
    this.refreshRules();
  }

  public setData(events: EnrichedEvent[]) {
    this.enrichedEvents = events;
    if (this.currentTab === 'history') {
      this.renderPanel();
    }
  }

  private refreshRules() {
    this.rules = getAllAlertRules().sort((a, b) => b.triggerCount - a.triggerCount);
    this.renderPanel();
  }

  private renderPanel() {
    const tabsHtml = `
      <div class="ar-tabs">
        <button class="ar-tab ${this.currentTab === 'rules' ? 'active' : ''}" data-tab="rules">Active Rules</button>
        <button class="ar-tab ${this.currentTab === 'create' ? 'active' : ''}" data-tab="create">
          ${this.editingRuleId ? 'Edit Rule' : '+ New Rule'}
        </button>
        <button class="ar-tab ${this.currentTab === 'history' ? 'active' : ''}" data-tab="history">Trigger History</button>
      </div>
    `;

    let contentHtml = '';
    if (this.currentTab === 'rules') {
      contentHtml = this.renderRulesList();
    } else if (this.currentTab === 'create') {
      contentHtml = this.renderCreateForm();
    } else if (this.currentTab === 'history') {
      contentHtml = this.renderHistory();
    }

    const html = `
      <div class="ar-panel-wrap">
        ${tabsHtml}
        <div class="ar-content">
          ${contentHtml}
        </div>
      </div>
    `;

    this.setContent(html);
    this.attachEventListeners();
  }

  private renderRulesList(): string {
    if (this.rules.length === 0) {
      return '<div class="ar-empty">No alert rules configured. Create one to get started.</div>';
    }

    const rows = this.rules.map(rule => {
      const conditionsStr = rule.conditions.map(c => `${c.type} ${c.operator} ${c.value}`).join(rule.conditionLogic === 'ALL' ? ' AND ' : ' OR ');
      const datesStr = rule.lastTriggered
        ? `Triggered: ${new Date(rule.lastTriggered).toLocaleString()}`
        : 'Never triggered';

      return `
        <div class="ar-card ${!rule.enabled ? 'disabled' : ''}">
          <div class="ar-card-header">
            <div class="ar-card-title">
              <span class="ar-status-dot ${rule.enabled ? 'on' : 'off'}"></span>
              ${escapeHtml(rule.name)}
            </div>
            <div class="ar-card-actions">
              <button class="ar-btn-icon btn-toggle" data-id="${rule.id}">
                ${rule.enabled ? '⏸ Pause' : '▶️ Resume'}
              </button>
              <button class="ar-btn-icon btn-edit" data-id="${rule.id}">✏️</button>
              <button class="ar-btn-icon btn-delete" data-id="${rule.id}">🗑️</button>
            </div>
          </div>
          <div class="ar-card-body">
            ${rule.description ? `<div class="ar-card-desc">${escapeHtml(rule.description)}</div>` : ''}
            <div class="ar-card-logic">${escapeHtml(conditionsStr)}</div>
            <div class="ar-card-meta">
              <span>Triggers: <strong>${rule.triggerCount}</strong></span>
              <span>${datesStr}</span>
              ${rule.actions.highlightColor ? `<span style="color: ${rule.actions.highlightColor}">■ Color Tag</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="ar-list">${rows}</div>`;
  }

  private renderCreateForm(): string {
    const editRule = this.editingRuleId ? this.rules.find(r => r.id === this.editingRuleId) : null;
    const firstCond = editRule?.conditions[0] || { type: 'keyword', operator: 'contains', value: '' };

    const presetsHtml = `
      <div class="ar-presets">
        <label>Presets</label>
        <div class="ar-preset-buttons">
          <button class="ar-preset-btn" data-preset="protest">Large Protest</button>
          <button class="ar-preset-btn" data-preset="bank">Bank Stress</button>
          <button class="ar-preset-btn" data-preset="air">Air Quality</button>
          <button class="ar-preset-btn" data-preset="cyber">Cyber Attack</button>
        </div>
      </div>
    `;

    return `
      <div class="ar-form">
        ${!this.editingRuleId ? presetsHtml : ''}
        <label>Rule Name</label>
        <input type="text" id="ar-f-name" class="ar-input" value="${escapeHtml(editRule?.name || '')}" placeholder="e.g. Critical Cyber Threats">
        
        <label>Description (Optional)</label>
        <input type="text" id="ar-f-desc" class="ar-input" value="${escapeHtml(editRule?.description || '')}" placeholder="Description of the rule">
        
        <div class="ar-form-row">
          <div class="ar-col">
            <label>Condition Type</label>
            <select id="ar-f-type" class="ar-input">
              <option value="keyword" ${firstCond.type === 'keyword' ? 'selected' : ''}>Keyword Match</option>
              <option value="threatLevel" ${firstCond.type === 'threatLevel' ? 'selected' : ''}>Threat Level</option>
              <option value="source" ${firstCond.type === 'source' ? 'selected' : ''}>Source Name</option>
              <option value="velocity" ${firstCond.type === 'velocity' ? 'selected' : ''}>Reporting Velocity</option>
            </select>
          </div>
          <div class="ar-col">
            <label>Operator</label>
            <select id="ar-f-op" class="ar-input">
              <option value="contains" ${firstCond.operator === 'contains' ? 'selected' : ''}>Contains</option>
              <option value="equals" ${firstCond.operator === 'equals' ? 'selected' : ''}>Equals</option>
            </select>
          </div>
        </div>
        
        <label>Value</label>
        <input type="text" id="ar-f-val" class="ar-input" value="${escapeHtml(String(firstCond.value || ''))}" placeholder="Value to match">
        
        <label>Highlight Color</label>
        <select id="ar-f-color" class="ar-input">
          <option value="">None</option>
          <option value="#ff4444" ${editRule?.actions.highlightColor === '#ff4444' ? 'selected' : ''}>Red</option>
          <option value="#ffaa00" ${editRule?.actions.highlightColor === '#ffaa00' ? 'selected' : ''}>Orange</option>
          <option value="#44ff88" ${editRule?.actions.highlightColor === '#44ff88' ? 'selected' : ''}>Green</option>
        </select>
        
        <div class="ar-form-actions">
          ${this.editingRuleId ? `<button id="ar-btn-cancel" class="ar-btn secondary">Cancel</button>` : ''}
          <button id="ar-btn-save" class="ar-btn primary">Save Rule</button>
        </div>
      </div>
    `;
  }

  private renderHistory(): string {
    // Find all triggered alerts across all recent events
    const triggers: { event: EnrichedEvent, rule: any }[] = [];
    for (const e of this.enrichedEvents) {
      if (e._augmented?.triggeredAlerts && e._augmented.triggeredAlerts.length > 0) {
        for (const r of e._augmented.triggeredAlerts) {
          triggers.push({ event: e, rule: r });
        }
      }
    }

    if (triggers.length === 0) {
      return '<div class="ar-empty">No recent alerts triggered.</div>';
    }

    const rows = triggers.map(t => {
      const colorStyle = t.rule.highlightColor ? `border-left-color: ${t.rule.highlightColor};` : '';
      return `
        <div class="ar-trigger-card" style="${colorStyle}">
          <div class="ar-trigger-header">
            <div class="ar-trigger-rule">${escapeHtml(t.rule.ruleName)}</div>
            <button class="ar-btn-brief btn-brief" data-id="${t.event.id}">Brief</button>
          </div>
          <div class="ar-trigger-event">${escapeHtml(t.event.primaryTitle)}</div>
          <div class="ar-trigger-meta">
            ${new Date(t.event.lastUpdated || t.event.firstSeen).toLocaleTimeString()}
            · Threat: ${t.event.threat?.level || 'info'}
          </div>
        </div>
      `;
    }).join('');

    return `<div class="ar-list">${rows}</div>`;
  }

  private attachEventListeners() {
    this.content.querySelectorAll('.ar-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentTab = (e.currentTarget as HTMLElement).dataset.tab as Tab;
        if (this.currentTab !== 'create') {
          this.editingRuleId = null;
        }
        this.renderPanel();
      });
    });

    this.content.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        const rule = this.rules.find(r => r.id === id);
        if (rule && id) {
          await toggleAlertRule(id, !rule.enabled);
          this.refreshRules();
        }
      });
    });

    this.content.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id;
        if (id && confirm('Delete this rule?')) {
          await deleteAlertRule(id);
          this.refreshRules();
        }
      });
    });

    this.content.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.editingRuleId = (e.currentTarget as HTMLElement).dataset.id || null;
        this.currentTab = 'create';
        this.renderPanel();
      });
    });

    this.content.querySelectorAll('.btn-brief').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eventId = (e.currentTarget as HTMLElement).dataset.id;
        if (eventId) {
          window.dispatchEvent(new CustomEvent('wm-open-event-story', { detail: { eventId } }));
        }
      });
    });

    const saveBtn = this.content.querySelector('#ar-btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const name = (this.content.querySelector('#ar-f-name') as HTMLInputElement).value.trim();
        const desc = (this.content.querySelector('#ar-f-desc') as HTMLInputElement).value.trim();
        const type = (this.content.querySelector('#ar-f-type') as HTMLSelectElement).value as AlertRuleConditionType;
        const op = (this.content.querySelector('#ar-f-op') as HTMLSelectElement).value as AlertRuleOperator;
        const val = (this.content.querySelector('#ar-f-val') as HTMLInputElement).value.trim();
        const color = (this.content.querySelector('#ar-f-color') as HTMLSelectElement).value;

        if (!name || !val) {
          alert('Name and Value are required');
          return;
        }

        const condition: AlertRuleCondition = { type, operator: op, value: val };

        if (this.editingRuleId) {
          await updateAlertRule(this.editingRuleId, {
            name,
            description: desc,
            conditions: [condition],
            actions: { notify: true, highlightColor: color }
          });
        } else {
          await createAlertRule(name, [condition], 'ALL', desc, color);
        }

        this.editingRuleId = null;
        this.currentTab = 'rules';
        this.refreshRules();
      });
    }

    const cancelBtn = this.content.querySelector('#ar-btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.editingRuleId = null;
        this.currentTab = 'rules';
        this.renderPanel();
      });
    }

    this.content.querySelectorAll('.ar-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = (e.currentTarget as HTMLElement).dataset.preset;
        const nameInput = this.content.querySelector('#ar-f-name') as HTMLInputElement;
        const typeSelect = this.content.querySelector('#ar-f-type') as HTMLSelectElement;
        const opSelect = this.content.querySelector('#ar-f-op') as HTMLSelectElement;
        const valInput = this.content.querySelector('#ar-f-val') as HTMLInputElement;
        const colorSelect = this.content.querySelector('#ar-f-color') as HTMLSelectElement;

        switch (preset) {
          case 'protest':
            nameInput.value = 'Large Protests Detected';
            typeSelect.value = 'keyword';
            opSelect.value = 'contains';
            valInput.value = 'protest, demonstration, unrest';
            colorSelect.value = '#ffaa00';
            break;
          case 'bank':
            nameInput.value = 'Financial Stress Signals';
            typeSelect.value = 'keyword';
            opSelect.value = 'contains';
            valInput.value = 'bank, liquidity, default, stress';
            colorSelect.value = '#ff4444';
            break;
          case 'air':
            nameInput.value = 'Air Quality Warning';
            typeSelect.value = 'keyword';
            opSelect.value = 'contains';
            valInput.value = 'unhealthy, pollution, haze, smog';
            colorSelect.value = '#ffaa00';
            break;
          case 'cyber':
            nameInput.value = 'Cyber Attack Alert';
            typeSelect.value = 'keyword';
            opSelect.value = 'contains';
            valInput.value = 'cyber, hack, breach, ransomware, ddos';
            colorSelect.value = '#ff4444';
            break;
        }
      });
    });
  }
}
