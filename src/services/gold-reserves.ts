import { GOLD_RESERVES, type GoldReserve } from '@/config/gold';

const CACHE_KEY = 'gold-reserves-cache';

export async function fetchGoldReserves(): Promise<GoldReserve[]> {
  // try local cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as GoldReserve[];
    }
  } catch {}

  // attempt to fetch from World Bank API
  try {
    const url = 'https://api.worldbank.org/v2/country/all/indicator/FR.GOLD.RESV.CD?format=json&date=2023&per_page=300';
    const res = await fetch(url);
    const json = await res.json();
    if (Array.isArray(json) && Array.isArray(json[1])) {
      const list = (json[1] as any[])
        .map((item) => ({
          country: item.country?.value ?? '',
          value: item.value ?? 0,
        }))
        .filter((r) => r.country);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      } catch {}
      return list;
    }
  } catch (err) {
    console.warn('[GoldReserves] fetch failed', err);
  }

  // fallback to static data
  return GOLD_RESERVES;
}
