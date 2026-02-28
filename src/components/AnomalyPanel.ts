import { Panel } from './Panel';
import { escapeHtml } from '@/utils/sanitize';
import type { EnrichedEvent } from '@/services/intelligence-augmentation';

type Tab = 'live' | 'escalation' | 'baselines';

export class AnomalyPanel extends Panel {
  private currentTab: Tab = 'live';
  private events: EnrichedEvent[] = [];

  constructor() {
    super({ id: 'anomaly-detection', title: '🔮 Anomaly Detection', showCount: false });
    this.renderPanel();
  }

  public setData(events: EnrichedEvent[]) {
    this.events = events;
    this.renderPanel();
  }

  private renderPanel() {
    const tabsHtml = `
      <div class="an-tabs">
        <button class="an-tab ${this.currentTab === 'live' ? 'active' : ''}" data-tab="live">Live Anomalies</button>
        <button class="an-tab ${this.currentTab === 'escalation' ? 'active' : ''}" data-tab="escalation">Escalation Radar</button>
        <button class="an-tab ${this.currentTab === 'baselines' ? 'active' : ''}" data-tab="baselines">Baselines</button>
      </div>
    `;

    let contentHtml = '';
    if (this.currentTab === 'live') {
      contentHtml = this.renderLiveAnomalies();
    } else if (this.currentTab === 'escalation') {
      contentHtml = this.renderEscalationRadar();
    } else if (this.currentTab === 'baselines') {
      contentHtml = this.renderBaselinesInfo();
    }

    const html = `
      <div class="an-panel-wrap">
        ${tabsHtml}
        <div class="an-content">
          ${contentHtml}
        </div>
      </div>
    `;

    this.setContent(html);
    this.attachEventListeners();
  }

  private renderLiveAnomalies(): string {
    const anomalousEvents = this.events.filter(e => e._augmented?.anomalies.isAnomalous);

    if (anomalousEvents.length === 0) {
      return '<div class="an-empty">No anomalies detected yet — baselines are being established.</div>';
    }

    const rows = anomalousEvents.map(e => {
      const a = e._augmented!.anomalies;
      const scorePct = Math.min(100, Math.round(a.score * 100));
      let riskStr = 'Low';
      let riskClass = 'low';

      if (a.score > 0.8) { riskStr = 'Critical'; riskClass = 'critical'; }
      else if (a.score > 0.6) { riskStr = 'High'; riskClass = 'high'; }
      else if (a.score > 0.4) { riskStr = 'Medium'; riskClass = 'medium'; }

      const pills = a.types.map((t: string) => `<span class="an-pill">${t}</span>`).join('');

      return `
        <div class="an-card">
          <div class="an-card-header">
            <div class="an-card-title">${escapeHtml(e.primaryTitle)}</div>
            <div class="an-risk-badge ${riskClass}">${riskStr}</div>
          </div>
          <div class="an-score-bar">
            <div class="an-score-fill ${riskClass}" style="width: ${scorePct}%"></div>
          </div>
          <div class="an-card-meta">
            Score: ${scorePct}% · ${pills}
          </div>
        </div>
      `;
    }).join('');

    return `<div class="an-list">${rows}</div>`;
  }

  private renderEscalationRadar(): string {
    const escalatingEvents = this.events.filter(e =>
      e._augmented?.escalationPrediction && e._augmented.escalationPrediction.probability > 0.4
    );

    if (escalatingEvents.length === 0) {
      return '<div class="an-empty">No high-probability escalations detected.</div>';
    }

    const rows = escalatingEvents.map(e => {
      const esc = e._augmented!.escalationPrediction!;
      const probPct = Math.round(esc.probability * 100);
      const factorsHtml = esc.indicators.map((f: string) => `<li>${escapeHtml(f)}</li>`).join('');

      return `
        <div class="an-card escalation">
          <div class="an-card-title">${escapeHtml(e.primaryTitle)}</div>
          <div class="an-radar-stats">
            <div class="an-prob-circle ${probPct > 70 ? 'high' : 'medium'}">
              <span>${probPct}%</span>
              <small>escalation</small>
            </div>
            <ul class="an-factors">
              ${factorsHtml}
            </ul>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="an-list">${rows}</div>`;
  }

  private renderBaselinesInfo(): string {
    return `
      <div class="an-baselines-info">
        <h3>How Anomalies are Detected</h3>
        <p>
          WorldEye utilizes a temporal baseline engine to establish expected norms for different geographic regions and event categories.
          Anomalies trigger when current reporting volumes, sentiment polarity shifts, or spatial clustering significantly deviates from these baselines.
        </p>
        <ul class="an-factor-list">
          <li><strong>Velocity Spike:</strong> A sudden surge in reporting speed vs typical baseline.</li>
          <li><strong>Geospatial Convergence:</strong> Activity localized in highly unexpected coordinates.</li>
          <li><strong>Sentiment Shift:</strong> A sharp swing from positive to negative sentiment in localized news.</li>
        </ul>
      </div>
    `;
  }

  private attachEventListeners() {
    this.content.querySelectorAll('.an-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentTab = (e.currentTarget as HTMLElement).dataset.tab as Tab;
        this.renderPanel();
      });
    });
  }
}
