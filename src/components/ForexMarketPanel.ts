import { Panel } from './Panel';
import { escapeHtml } from '@/utils/sanitize';

// ─── Pair definitions ───────────────────────────────────────────────────────

interface ForexPair {
  symbol: string;       // display symbol e.g. "EUR/USD"
  base: string;         // ISO 4217 base currency
  quote: string;        // ISO 4217 quote currency
  description: string;
  group: 'major' | 'minor' | 'inr';
}

const FOREX_PAIRS: ForexPair[] = [
  // ── Majors ──────────────────────────────────────────────────────────────
  { symbol: 'EUR/USD', base: 'EUR', quote: 'USD', description: 'Euro / US Dollar', group: 'major' },
  { symbol: 'GBP/USD', base: 'GBP', quote: 'USD', description: 'British Pound / US Dollar', group: 'major' },
  { symbol: 'AUD/USD', base: 'AUD', quote: 'USD', description: 'Australian Dollar / US Dollar', group: 'major' },
  { symbol: 'NZD/USD', base: 'NZD', quote: 'USD', description: 'New Zealand Dollar / US Dollar', group: 'major' },
  { symbol: 'USD/JPY', base: 'USD', quote: 'JPY', description: 'US Dollar / Japanese Yen', group: 'major' },
  { symbol: 'USD/CAD', base: 'USD', quote: 'CAD', description: 'US Dollar / Canadian Dollar', group: 'major' },
  { symbol: 'USD/CHF', base: 'USD', quote: 'CHF', description: 'US Dollar / Swiss Franc', group: 'major' },

  // ── Minors / Crosses ────────────────────────────────────────────────────
  { symbol: 'EUR/GBP', base: 'EUR', quote: 'GBP', description: 'Euro / British Pound', group: 'minor' },
  { symbol: 'EUR/AUD', base: 'EUR', quote: 'AUD', description: 'Euro / Australian Dollar', group: 'minor' },
  { symbol: 'EUR/NZD', base: 'EUR', quote: 'NZD', description: 'Euro / New Zealand Dollar', group: 'minor' },
  { symbol: 'EUR/JPY', base: 'EUR', quote: 'JPY', description: 'Euro / Japanese Yen', group: 'minor' },
  { symbol: 'EUR/CAD', base: 'EUR', quote: 'CAD', description: 'Euro / Canadian Dollar', group: 'minor' },
  { symbol: 'EUR/CHF', base: 'EUR', quote: 'CHF', description: 'Euro / Swiss Franc', group: 'minor' },
  { symbol: 'GBP/AUD', base: 'GBP', quote: 'AUD', description: 'British Pound / Australian Dollar', group: 'minor' },
  { symbol: 'GBP/NZD', base: 'GBP', quote: 'NZD', description: 'British Pound / New Zealand Dollar', group: 'minor' },
  { symbol: 'GBP/JPY', base: 'GBP', quote: 'JPY', description: 'British Pound / Japanese Yen', group: 'minor' },
  { symbol: 'GBP/CAD', base: 'GBP', quote: 'CAD', description: 'British Pound / Canadian Dollar', group: 'minor' },
  { symbol: 'GBP/CHF', base: 'GBP', quote: 'CHF', description: 'British Pound / Swiss Franc', group: 'minor' },
  { symbol: 'AUD/NZD', base: 'AUD', quote: 'NZD', description: 'Australian Dollar / New Zealand Dollar', group: 'minor' },
  { symbol: 'AUD/JPY', base: 'AUD', quote: 'JPY', description: 'Australian Dollar / Japanese Yen', group: 'minor' },
  { symbol: 'AUD/CAD', base: 'AUD', quote: 'CAD', description: 'Australian Dollar / Canadian Dollar', group: 'minor' },
  { symbol: 'AUD/CHF', base: 'AUD', quote: 'CHF', description: 'Australian Dollar / Swiss Franc', group: 'minor' },
  { symbol: 'NZD/JPY', base: 'NZD', quote: 'JPY', description: 'New Zealand Dollar / Japanese Yen', group: 'minor' },
  { symbol: 'NZD/CAD', base: 'NZD', quote: 'CAD', description: 'New Zealand Dollar / Canadian Dollar', group: 'minor' },
  { symbol: 'NZD/CHF', base: 'NZD', quote: 'CHF', description: 'New Zealand Dollar / Swiss Franc', group: 'minor' },
  { symbol: 'CAD/JPY', base: 'CAD', quote: 'JPY', description: 'Canadian Dollar / Japanese Yen', group: 'minor' },
  { symbol: 'CAD/CHF', base: 'CAD', quote: 'CHF', description: 'Canadian Dollar / Swiss Franc', group: 'minor' },
  { symbol: 'CHF/JPY', base: 'CHF', quote: 'JPY', description: 'Swiss Franc / Japanese Yen', group: 'minor' },

  // ── INR Pairs ───────────────────────────────────────────────────────────
  { symbol: 'INR/AUD', base: 'INR', quote: 'AUD', description: 'Indian Rupee / Australian Dollar', group: 'inr' },
  { symbol: 'INR/CAD', base: 'INR', quote: 'CAD', description: 'Indian Rupee / Canadian Dollar', group: 'inr' },
  { symbol: 'INR/CHF', base: 'INR', quote: 'CHF', description: 'Indian Rupee / Swiss Franc', group: 'inr' },
  { symbol: 'INR/CNY', base: 'INR', quote: 'CNY', description: 'Indian Rupee / Chinese Yuan', group: 'inr' },
  { symbol: 'INR/EUR', base: 'INR', quote: 'EUR', description: 'Indian Rupee / Euro', group: 'inr' },
  { symbol: 'INR/GBP', base: 'INR', quote: 'GBP', description: 'Indian Rupee / British Pound', group: 'inr' },
  { symbol: 'INR/HKD', base: 'INR', quote: 'HKD', description: 'Indian Rupee / Hong Kong Dollar', group: 'inr' },
  { symbol: 'INR/ILS', base: 'INR', quote: 'ILS', description: 'Indian Rupee / Israeli Shekel', group: 'inr' },
  { symbol: 'INR/JPY', base: 'INR', quote: 'JPY', description: 'Indian Rupee / Japanese Yen', group: 'inr' },
  { symbol: 'INR/KRW', base: 'INR', quote: 'KRW', description: 'Indian Rupee / South Korean Won', group: 'inr' },
  { symbol: 'INR/MXN', base: 'INR', quote: 'MXN', description: 'Indian Rupee / Mexican Peso', group: 'inr' },
  { symbol: 'INR/MYR', base: 'INR', quote: 'MYR', description: 'Indian Rupee / Malaysian Ringgit', group: 'inr' },
  { symbol: 'INR/NOK', base: 'INR', quote: 'NOK', description: 'Indian Rupee / Norwegian Krone', group: 'inr' },
  { symbol: 'INR/NZD', base: 'INR', quote: 'NZD', description: 'Indian Rupee / New Zealand Dollar', group: 'inr' },
  { symbol: 'INR/PKR', base: 'INR', quote: 'PKR', description: 'Indian Rupee / Pakistani Rupee', group: 'inr' },
  { symbol: 'INR/PLN', base: 'INR', quote: 'PLN', description: 'Indian Rupee / Polish Zloty', group: 'inr' },
  { symbol: 'INR/SEK', base: 'INR', quote: 'SEK', description: 'Indian Rupee / Swedish Krona', group: 'inr' },
  { symbol: 'INR/THB', base: 'INR', quote: 'THB', description: 'Indian Rupee / Thai Baht', group: 'inr' },
  { symbol: 'INR/TWD', base: 'INR', quote: 'TWD', description: 'Indian Rupee / Taiwan Dollar', group: 'inr' },
  { symbol: 'INR/USD', base: 'INR', quote: 'USD', description: 'Indian Rupee / US Dollar', group: 'inr' },
  { symbol: 'INR/ZAR', base: 'INR', quote: 'ZAR', description: 'Indian Rupee / South African Rand', group: 'inr' },
];

// ─── State ─────────────────────────────────────────────────────────────────

interface PriceEntry {
  price: number | null;
  prev: number | null;    // last known price before current update (for % change)
  error: boolean;
  lastUpdated: number;
}

type PriceMap = Map<string, PriceEntry>;

type GroupFilter = 'all' | 'major' | 'minor' | 'inr';

// ─── Constant for Frankfurter ───────────────────────────────────────────────
// Frankfurter proxies the ECB daily rate list — free, no key required.
// Rates update once per business day at ~16:00 CET; we poll every 60 s so we
// pick up the fresh day's rate quickly after it publishes.
const FRANKFURTER_BASE = 'https://api.frankfurter.app';

// Currencies the Frankfurter API supports directly
const FRANKFURTER_SUPPORTED = new Set([
  'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP',
  'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR',
  'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD',
  'ZAR',
]);

// ─── Panel class ───────────────────────────────────────────────────────────

export class ForexMarketPanel extends Panel {
  private prices: PriceMap = new Map();
  private loading = true;
  private error: string | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private activeGroup: GroupFilter = 'major';
  private lastFetchTs = 0;
  private isFetching = false;

  constructor() {
    super({ id: 'forex-market', title: '💱 Forex Market', showCount: false });
    void this.fetchAll();
    // Refresh every 60 seconds
    this.refreshInterval = setInterval(() => { void this.fetchAll(); }, 60_000);
    // Tick the "last updated" timer every 5 s without re-fetching
    this.tickInterval = setInterval(() => { this.renderPanel(); }, 5_000);
  }

  public override destroy(): void {
    if (this.refreshInterval) { clearInterval(this.refreshInterval); this.refreshInterval = null; }
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
    super.destroy();
  }

  // ─── Data Fetching ───────────────────────────────────────────────────────

  /**
   * Fetch all rates by batching on base currencies.
   * We ask Frankfurter for "latest?from=BASE" and pick up all
   * quote currencies in one call per unique base.
   */
  private async fetchAll(): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      // Group pairs by base currency so we make one call per base
      const byBase = new Map<string, ForexPair[]>();
      for (const p of FOREX_PAIRS) {
        if (!FRANKFURTER_SUPPORTED.has(p.base) || !FRANKFURTER_SUPPORTED.has(p.quote)) continue;
        if (!byBase.has(p.base)) byBase.set(p.base, []);
        byBase.get(p.base)!.push(p);
      }

      // Collect all unique quote currencies per base to build &to= query param (reduces payload)
      const fetches = Array.from(byBase.entries()).map(async ([base, pairs]) => {
        const quotes = [...new Set(pairs.map(p => p.quote))].join(',');
        const url = `${FRANKFURTER_BASE}/latest?from=${base}&to=${quotes}`;
        try {
          const resp = await fetch(url, { signal: this.signal });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data: { rates: Record<string, number> } = await resp.json() as { rates: Record<string, number> };
          for (const pair of pairs) {
            const rate = data.rates[pair.quote];
            const prev = this.prices.get(pair.symbol);
            this.prices.set(pair.symbol, {
              price: rate ?? null,
              prev: prev?.price ?? null,
              error: rate === undefined,
              lastUpdated: Date.now(),
            });
          }
        } catch (err) {
          if (this.isAbortError(err)) return;
          // Mark pairs for this base as errored (but don't wipe good prev data)
          for (const pair of pairs) {
            const existing = this.prices.get(pair.symbol);
            this.prices.set(pair.symbol, {
              price: existing?.price ?? null,
              prev: existing?.prev ?? null,
              error: true,
              lastUpdated: existing?.lastUpdated ?? 0,
            });
          }
        }
      });

      await Promise.allSettled(fetches);
      this.lastFetchTs = Date.now();
      this.error = null;
    } catch (err) {
      if (this.isAbortError(err)) return;
      this.error = err instanceof Error ? err.message : 'Fetch failed';
    } finally {
      this.isFetching = false;
      this.loading = false;
      this.renderPanel();
    }
  }

  // ─── Rendering ──────────────────────────────────────────────────────────

  private renderPanel(): void {
    if (this.loading) {
      this.showLoading('Fetching forex rates…');
      return;
    }

    if (this.error && this.prices.size === 0) {
      this.showError(`Failed to load rates: ${this.error}`);
      return;
    }

    const elapsed = this.lastFetchTs ? Math.round((Date.now() - this.lastFetchTs) / 1000) : null;
    const updatedLabel = elapsed !== null
      ? elapsed < 60
        ? `${elapsed}s ago`
        : `${Math.floor(elapsed / 60)}m ago`
      : '';

    const visiblePairs = this.activeGroup === 'all'
      ? FOREX_PAIRS
      : FOREX_PAIRS.filter(p => p.group === this.activeGroup);

    const rows = visiblePairs.map(p => this.renderRow(p)).join('');

    const html = `
      <div class="forex-panel-wrap">
        <div class="forex-toolbar">
          <div class="forex-tabs">
            ${(['major', 'minor', 'inr', 'all'] as GroupFilter[]).map(g => `
              <button class="forex-tab${this.activeGroup === g ? ' active' : ''}" data-group="${g}">
                ${g === 'major' ? '🌐 Majors' : g === 'minor' ? '🔀 Crosses' : g === 'inr' ? '🇮🇳 INR' : '📋 All'}
              </button>
            `).join('')}
          </div>
          <div class="forex-meta">
            ${this.isFetching ? '<span class="forex-refreshing">⟳ Updating…</span>' : ''}
            ${updatedLabel ? `<span class="forex-updated">Updated ${escapeHtml(updatedLabel)}</span>` : ''}
            <span class="forex-source">ECB via Frankfurter</span>
          </div>
        </div>
        <div class="forex-table-wrap">
          <table class="forex-table">
            <thead>
              <tr>
                <th class="fx-col-pair">Pair</th>
                <th class="fx-col-desc">Description</th>
                <th class="fx-col-price">Price</th>
                <th class="fx-col-chg">Change</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="forex-footer">
          <span>Rates sourced from the European Central Bank (ECB) · Updated daily ~16:00 CET · ${visiblePairs.length} pairs shown</span>
        </div>
      </div>
    `;

    this.setContent(html);

    // Attach tab click events after render
    this.content.querySelectorAll('.forex-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeGroup = (btn as HTMLElement).dataset.group as GroupFilter;
        this.renderPanel();
      });
    });
  }

  private renderRow(pair: ForexPair): string {
    const entry = this.prices.get(pair.symbol);

    if (!entry || entry.price === null) {
      const isErr = entry?.error;
      return `
        <tr class="forex-row forex-row-pending">
          <td class="fx-col-pair"><span class="fx-symbol">${escapeHtml(pair.symbol)}</span></td>
          <td class="fx-col-desc"><span class="fx-desc">${escapeHtml(pair.description)}</span></td>
          <td class="fx-col-price fx-price-dash">${isErr ? '—' : '…'}</td>
          <td class="fx-col-chg fx-price-dash">—</td>
        </tr>
      `;
    }

    const { price, prev } = entry;
    const decimals = this.decimalsFor(pair);
    const priceStr = price.toFixed(decimals);

    // pct change vs previous fetch (ECB doesn't provide intraday OHLC)
    let changeHtml = '<span class="fx-change fx-neutral">—</span>';
    if (prev !== null && prev !== 0) {
      const pct = ((price - prev) / prev) * 100;
      const dir = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
      const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '';
      const absStr = Math.abs(pct).toFixed(4);
      changeHtml = `<span class="fx-change fx-${dir}">${arrow}${absStr}%</span>`;
    }

    const flash = prev !== null && prev !== price ? ' fx-flash' : '';

    return `
      <tr class="forex-row${flash}">
        <td class="fx-col-pair"><span class="fx-symbol">${escapeHtml(pair.symbol)}</span></td>
        <td class="fx-col-desc"><span class="fx-desc">${escapeHtml(pair.description)}</span></td>
        <td class="fx-col-price"><span class="fx-price">${escapeHtml(priceStr)}</span></td>
        <td class="fx-col-chg">${changeHtml}</td>
      </tr>
    `;
  }

  /** Return appropriate decimal precision for a currency pair */
  private decimalsFor(pair: ForexPair): number {
    const jpyQuote = pair.quote === 'JPY' || pair.quote === 'KRW';
    const highPrecision = ['INR', 'MXN', 'NOK', 'SEK', 'HUF', 'PLN', 'CZK', 'TWD', 'THB', 'PKR', 'MYR'];
    if (jpyQuote) return 3;
    if (highPrecision.includes(pair.quote)) return 4;
    return 5;
  }
}
