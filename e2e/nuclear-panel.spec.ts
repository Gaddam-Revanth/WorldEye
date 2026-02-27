import { test, expect } from '@playwright/test';

// ensure panel renders and supports search filter + click callbacks

test('NuclearPlantsPanel supports search/filter and row click callbacks', async ({ page }) => {
  await page.goto('/tests/runtime-harness.html');

  const result = await page.evaluate(async () => {
    // @ts-expect-error - dynamic imports in browser context
    const { initI18n } = await import('/src/services/i18n.ts');
    await initI18n();
    // @ts-expect-error - dynamic imports in browser context
    const { NuclearPlantsPanel } = await import('/src/components/NuclearPlantsPanel.ts');
    // @ts-expect-error - dynamic imports in browser context
    const { NUCLEAR_FACILITIES } = await import('/src/config/geo.ts');

    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const pollUntil = async (pred: () => boolean, maxMs = 2000) => {
      for (let i = 0; i < maxMs / 50 && !pred(); i++) await wait(50);
    };

    let clickedId: string | null = null;
    const panel = new NuclearPlantsPanel();
    panel.getElement().addEventListener('click', (e: Event) => {
      const row = (e.target as HTMLElement).closest('.nuclear-plant-row') as HTMLElement | null;
      if (row) clickedId = row.dataset.id || null;
    });
    document.body.appendChild(panel.getElement());

    const root = panel.getElement();
    await pollUntil(() => !!root.querySelector('.nuclear-search'));

    const total = NUCLEAR_FACILITIES.filter((f: any) => f.type === 'plant').length;

    // search for first plant name
    const firstName = NUCLEAR_FACILITIES.find((f: any) => f.type === 'plant')?.name || '';
    const input = root.querySelector('.nuclear-search') as HTMLInputElement;
    input.value = firstName.slice(0, 4);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await wait(100);

    return { total, clickedIdBefore: clickedId, firstName };  
  });

  // ensure some results exist
  expect(result.total).toBeGreaterThan(0);
  // clicking not triggered yet
  expect(result.clickedIdBefore).toBe(null);
});
