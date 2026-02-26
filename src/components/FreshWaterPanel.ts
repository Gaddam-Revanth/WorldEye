import { Panel } from './Panel';
import type { FreshWaterData, FreshWaterCountryData } from '@/services/fresh-water-data';
import { getWaterStressColor, getTrendIcon } from '@/services/fresh-water-data';
import { escapeHtml } from '@/utils/sanitize';

export class FreshWaterPanel extends Panel {
  private freshWaterData: FreshWaterData | null = null;
  private selectedRegion: string = 'global';

  constructor() {
    super({ id: 'fresh-water', title: '💧 Fresh Water Resources' });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.content.addEventListener('click', (e) => {
      const regionBtn = (e.target as HTMLElement).closest('.water-region-btn') as HTMLElement | null;
      if (regionBtn?.dataset.region) {
        this.selectedRegion = regionBtn.dataset.region;
        this.render();
      }

      const countryRow = (e.target as HTMLElement).closest('.water-country-row') as HTMLElement | null;
      if (countryRow?.dataset.country) {
        const countryCode = countryRow.dataset.country!; // asserted because checked above
        const country = this.freshWaterData?.countries.find(c => c.countryCode === countryCode);
        if (country) {
          this.showCountryDetail(country);
        }
      }
    });
  }

  public setData(data: FreshWaterData): void {
    this.freshWaterData = data;
    this.selectedRegion = 'global';
    this.render();
  }

  private render(): void {
    if (!this.freshWaterData) {
      this.showLoading();
      return;
    }

    const html = this.selectedRegion === 'global'
      ? this.renderGlobalView()
      : this.renderRegionalView();

    this.setContent(html);
  }

  private renderGlobalView(): string {
    if (!this.freshWaterData) return '';
    const stats = this.freshWaterData.globalStats;

    const criticalCountriesHtml = stats.criticalCountries
      .slice(0, 5)
      .map(cc => {
        const country = this.freshWaterData?.countries.find(c => c.countryCode === cc);
        return country ? `<span class="water-crisis-badge">${escapeHtml(country.countryName)}</span>` : '';
      })
      .join('');

    const regionBtns = stats.regionalData
      .map(r => {
        const short = (r.region?.split(' ')[0]) || '';
        return `
        <button class="water-region-btn ${this.selectedRegion === r.region ? 'active' : ''}" data-region="${escapeHtml(r.region)}">
          ${escapeHtml(short)}
          <span class="stress-level" style="background-color: ${this.getRegionColor(r.averageStress)};"></span>
        </button>
      `;
      })
      .join('');

    const topCountriesByStress = [...(this.freshWaterData?.countries || [])]
      .sort((a, b) => {
        const stressOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
        return (stressOrder[b.waterStressLevel as keyof typeof stressOrder] || 0) -
               (stressOrder[a.waterStressLevel as keyof typeof stressOrder] || 0);
      })
      .slice(0, 10)
      .map(c => `
        <div class="water-country-row" data-country="${escapeHtml(c.countryCode)}" style="cursor: pointer; border-radius: 4px;">
          <div class="water-country-info">
            <span class="water-country-name">${escapeHtml(c.countryName)}</span>
            <span class="water-stress-indicator" style="background-color: ${getWaterStressColor(c.waterStressLevel)};"></span>
            <span class="water-stress-text">${this.formatStressLevel(c.waterStressLevel)}</span>
          </div>
          <div class="water-country-metrics">
            <span class="water-metric">Per Capita: ${c.perCapitaWater.toLocaleString()} m³</span>
            <span class="water-metric">Cost: $${c.costPerCubicMeter.toFixed(2)}/m³</span>
            <span class="water-trend">${getTrendIcon(c.trend)} ${c.trend}</span>
          </div>
        </div>
      `)
      .join('');

    return `
      <div class="fresh-water-panel">
        <div class="water-global-stats">
          <div class="water-stat-card">
            <div class="water-stat-label">Global Water Stress</div>
            <div class="water-stat-value">${stats.globalAverageStress.toFixed(1)}%</div>
            <div class="water-stat-bar">
              <div class="water-stat-bar-fill" style="width: ${stats.globalAverageStress}%; background-color: ${this.getRegionColor(stats.globalAverageStress)};"></div>
            </div>
          </div>
          <div class="water-stat-card">
            <div class="water-stat-label">Total Renewable Water</div>
            <div class="water-stat-value">${stats.totalRenewableWater.toFixed(1)}B km³</div>
            <div class="water-stat-subtext">Per year globally</div>
          </div>
          <div class="water-stat-card">
            <div class="water-stat-label">Population Without Access</div>
            <div class="water-stat-value">${stats.affectedPopulation}M</div>
            <div class="water-stat-subtext">Need clean water access</div>
          </div>
          <div class="water-stat-card">
            <div class="water-stat-label">Critical Situations</div>
            <div class="water-stat-value">${stats.criticalCountries.length}</div>
            <div class="water-stat-subtext">Countries in crisis</div>
          </div>
        </div>

        <div class="water-critical-countries">
          <h4>🚨 Critical Water Stress Countries</h4>
          <div class="water-crisis-badges">
            ${criticalCountriesHtml}
          </div>
        </div>

        <div class="water-regional-filters">
          <h4>Regional Breakdown</h4>
          <div class="water-region-buttons">
            ${regionBtns}
          </div>
        </div>

        <div class="water-top-countries">
          <h4>Top Countries by Water Stress</h4>
          <div class="water-countries-list">
            ${topCountriesByStress}
          </div>
        </div>

        <div class="water-footer">
          <small>💧 Data from World Bank AQUASTAT & UN-Water • Updated ${new Date(this.freshWaterData.timestamp).toLocaleDateString()}</small>
        </div>
      </div>
    `;
  }

  private renderRegionalView(): string {
    if (!this.freshWaterData) return '';
    
    const region = this.freshWaterData.globalStats.regionalData
      .find(r => r.region === this.selectedRegion);
    
    if (!region) return this.renderGlobalView();

    const regionCountries = this.getCountriesByRegion(this.selectedRegion);

    return `
      <div class="fresh-water-panel">
        <div class="water-regional-header">
          <h3>${escapeHtml(this.selectedRegion)}</h3>
          <button class="water-region-btn" data-region="global">← Back to Global</button>
        </div>

        <div class="water-regional-stats">
          <div class="water-stat-card">
            <div class="water-stat-label">Average Water Stress</div>
            <div class="water-stat-value">${region.averageStress}%</div>
          </div>
          <div class="water-stat-card">
            <div class="water-stat-label">Countries</div>
            <div class="water-stat-value">${region.countries}</div>
          </div>
          <div class="water-stat-card">
            <div class="water-stat-label">Affected Population</div>
            <div class="water-stat-value">${region.affectedPopulation}M</div>
          </div>
        </div>

        <div class="water-countries-list">
          ${regionCountries
            .map(c => `
              <div class="water-country-row" data-country="${escapeHtml(c.countryCode)}" style="cursor: pointer;">
                <div class="water-country-info">
                  <span class="water-country-name">${escapeHtml(c.countryName)}</span>
                  <span class="water-stress-indicator" style="background-color: ${getWaterStressColor(c.waterStressLevel)};"></span>
                  <span class="water-stress-text">${this.formatStressLevel(c.waterStressLevel)}</span>
                </div>
                <div class="water-country-metrics">
                  <span class="water-metric">Total: ${c.totalRenewableWater} km³</span>
                  <span class="water-metric">Per Capita: ${c.perCapitaWater.toLocaleString()} m³</span>
                  <span class="water-metric">Cost: $${c.costPerCubicMeter.toFixed(2)}/m³</span>
                  <span class="water-metric">Access: ${c.accessPercentage}%</span>
                </div>
              </div>
            `)
            .join('')}
        </div>
      </div>
    `;
  }

  private showCountryDetail(country: FreshWaterCountryData): void {
    const html = `
      <div class="water-country-detail">
        <div class="water-detail-header">
          <h2>${escapeHtml(country.countryName)}</h2>
          <div class="water-stress-badge" style="background-color: ${getWaterStressColor(country.waterStressLevel)};">
            ${this.formatStressLevel(country.waterStressLevel)}
          </div>
        </div>

        <div class="water-detail-stats">
          <div class="detail-stat">
            <label>Total Renewable Water</label>
            <value>${country.totalRenewableWater} km³/year</value>
          </div>
          <div class="detail-stat">
            <label>Per Capita Availability</label>
            <value>${country.perCapitaWater.toLocaleString()} m³/person/year</value>
          </div>
          <div class="detail-stat">
            <label>Cost of Fresh Water</label>
            <value>$${country.costPerCubicMeter.toFixed(2)}/m³</value>
          </div>
          <div class="detail-stat">
            <label>Population with Access</label>
            <value>${country.accessPercentage}%</value>
          </div>
          <div class="detail-stat">
            <label>Trend</label>
            <value>${getTrendIcon(country.trend)} ${country.trend}</value>
          </div>
          <div class="detail-stat">
            <label>Last Updated</label>
            <value>${new Date(country.lastUpdated).toLocaleDateString()}</value>
          </div>
        </div>

        <div class="water-detail-analysis">
          <h4>Water Status Analysis</h4>
          <p>${this.generateCountryAnalysis(country)}</p>
        </div>
      </div>
    `;
    this.setContent(html);
  }

  private getCountriesByRegion(region: string): FreshWaterCountryData[] {
    const regionMap: Record<string, string[]> = {
      'Sub-Saharan Africa': ['NG', 'KE'],
      'Middle East & North Africa': ['EG', 'SA', 'AE', 'IL'],
      'South Asia': ['IN', 'PK'],
      'East Asia & Pacific': ['CN', 'ID', 'AU', 'JP'],
      'Europe & Central Asia': ['RU', 'GB', 'DE'],
      'Americas': ['BR', 'US', 'CA', 'MX'],
    };

    const countryCodes = regionMap[region] || [];
    return (this.freshWaterData?.countries || [])
      .filter(c => countryCodes.includes(c.countryCode));
  }

  private formatStressLevel(level: string): string {
    const levels: Record<string, string> = {
      low: '✅ Low Stress',
      moderate: '⚠️ Moderate',
      high: '🔴 High Stress',
      critical: '🚨 Critical',
    };
    return levels[level] || level;
  }

  private getRegionColor(stress: number): string {
    if (stress < 20) return '#22c55e'; // green
    if (stress < 40) return '#eab308'; // yellow
    if (stress < 60) return '#f97316'; // orange
    return '#dc2626'; // red
  }

  private generateCountryAnalysis(country: FreshWaterCountryData): string {
    let analysis = '';

    if (country.waterStressLevel === 'critical') {
      analysis += `${escapeHtml(country.countryName)} faces critical water scarcity. `;
      if (country.trend === 'declining') {
        analysis += 'The situation is deteriorating and requires immediate intervention. ';
      }
    } else if (country.waterStressLevel === 'high') {
      analysis += `${escapeHtml(country.countryName)} experiences high water stress. `;
      if (country.trend === 'declining') {
        analysis += 'Resources are decreasing and action is needed. ';
      }
    } else if (country.waterStressLevel === 'moderate') {
      analysis += `${escapeHtml(country.countryName)} has moderate water availability. `;
    } else {
      analysis += `${escapeHtml(country.countryName)} enjoys abundant water resources. `;
    }

    if (country.accessPercentage < 85) {
      analysis += `However, only ${country.accessPercentage}% of the population has access to clean water. `;
    }

    analysis += `Water costs $${country.costPerCubicMeter.toFixed(2)} per cubic meter. `;
    analysis += `With ${country.perCapitaWater.toLocaleString()} m³ available per capita annually, `;

    if (country.perCapitaWater < 700) {
      analysis += 'the country is approaching water scarcity threshold.';
    } else if (country.perCapitaWater < 1700) {
      analysis += 'water availability is limited.';
    } else {
      analysis += 'water availability is adequate.';
    }

    return analysis;
  }
}
