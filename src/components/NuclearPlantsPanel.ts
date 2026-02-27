import { Panel } from './Panel';
import { NUCLEAR_FACILITIES } from '@/config/geo';
import { t } from '@/services/i18n';
import { escapeHtml } from '@/utils/sanitize';

export class NuclearPlantsPanel extends Panel {
  constructor() {
    super({
      id: 'nuclear-plants',
      title: t('panels.nuclearPlants'),
      showCount: true,
      infoTooltip: t('components.nuclearPlants.infoTooltip'),
    });
    this.render();
  }

  private render(): void {
    const plants = NUCLEAR_FACILITIES.filter(f => f.type === 'plant');
    const rows = plants.map(p => `
      <tr data-id="${escapeHtml(p.id)}" class="nuclear-plant-row">
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${escapeHtml(p.operator ?? '—')}</td>
        <td>${escapeHtml(p.type)}</td>
        <td>${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}</td>
        <td>${escapeHtml(p.status)}</td>
      </tr>
    `).join('');

    const html = `
      <div class="panel-toolbar">
        <input class="panel-search" placeholder="${t('components.nuclearPlants.searchPlaceholder')}" />
      </div>
      <div class="panel-table-wrap">
        <table class="panel-table">
          <thead>
            <tr>
              <th>${t('components.nuclearPlants.name')}</th>
              <th>${t('components.nuclearPlants.operator')}</th>
              <th>${t('components.nuclearPlants.type')}</th>
              <th>${t('components.nuclearPlants.coordinates')}</th>
              <th>${t('components.nuclearPlants.status')}</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="5">${t('components.nuclearPlants.noPlants')}</td></tr>`}</tbody>
        </table>
      </div>
    `;

    this.setContent(html);
    if (this.countEl) this.countEl.textContent = String(plants.length);

    this.content.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target && target.classList.contains('panel-search')) {
        const q = target.value.toLowerCase();
        Array.from(this.content.querySelectorAll('.nuclear-plant-row')).forEach((r) => {
          const txt = r.textContent || '';
          (r as HTMLElement).style.display = txt.toLowerCase().includes(q) ? '' : 'none';
        });
      }
    });

    this.content.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest('.nuclear-plant-row') as HTMLElement | null;
      if (row) {
        const id = row.dataset.id;
        if (id) {
          // enable map layer and trigger click via global panel layout behavior
          window.dispatchEvent(new CustomEvent('nuclear-plant-selected', { detail: { id } }));
        }
      }
    });
  }
}
