import { Panel } from './Panel';
import { fetchGoldReserves } from '@/services/gold-reserves';
import { t } from '@/services/i18n';
import { escapeHtml } from '@/utils/sanitize';

function formatTons(tons?: number): string {
  if (tons === undefined) return 'N/A';
  return `${tons.toFixed(1)} t`;
}

function formatValue(val: number): string {
  if (val === 0) return t('components.goldReserves.noData');
  // convert to billions/trillions with suffix
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  return `$${(val / 1e6).toFixed(1)}M`;
}

export class GoldReservesPanel extends Panel {
  constructor() {
    super({
      id: 'gold-reserves',
      title: t('panels.goldReserves'),
      showCount: true,
      infoTooltip: t('components.goldReserves.infoTooltip'),
    });
    this.render();
  }

  private async render(): Promise<void> {
    const data = await fetchGoldReserves();
    data.sort((a, b) => b.value - a.value);

    const rows = data
      .map(
        (d) => `
      <tr data-country="${escapeHtml(d.country)}" class="gold-row">
        <td><strong>${escapeHtml(d.country)}</strong></td>
        <td>${formatTons(d.tons)}</td>
        <td>${formatValue(d.value)}</td>
      </tr>
    `
      )
      .join('');

    const html = `
      <div class="panel-toolbar">
        <input class="panel-search" placeholder="${t('components.goldReserves.searchPlaceholder')}" />
      </div>
      <div class="panel-table-wrap">
        <table class="panel-table">
          <thead>
            <tr>
              <th>${t('components.goldReserves.country')}</th>
              <th>${t('components.goldReserves.tons')}</th>
              <th>${t('components.goldReserves.reserves')}</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="3">${t('components.goldReserves.noData')}</td></tr>`}</tbody>
        </table>
      </div>
    `;

    this.setContent(html);
    if (this.countEl) this.countEl.textContent = String(data.length);

    this.content.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target && target.classList.contains('panel-search')) {
        const q = target.value.toLowerCase();
        Array.from(this.content.querySelectorAll('.gold-row')).forEach((r) => {
          const txt = r.textContent || '';
          (r as HTMLElement).style.display = txt.toLowerCase().includes(q) ? '' : 'none';
        });
      }
    });

    this.content.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest('.gold-row') as HTMLElement | null;
      if (row) {
        const country = row.dataset.country;
        if (country) {
          window.dispatchEvent(
            new CustomEvent('gold-country-selected', { detail: { country } })
          );
        }
      }
    });
  }
}
