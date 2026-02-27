import { test, expect } from '@playwright/test';

// verify panel fetches data and supports search/filter behavior

test('GoldReservesPanel loads live data and responds to search', async ({ page }) => {
  // intercept world bank API to return predictable sample
  await page.route('**/worldbank.org/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([null, [
        { country: { value: 'Testland' }, value: 123000000000 },
        { country: { value: 'Examplestan' }, value: 456000000000 }
      ]])
    });
  });

  await page.goto('/tests/runtime-harness.html');

  const result = await page.evaluate(async () => {
    // @ts-expect-error - dynamic imports
    const { initI18n } = await import('/src/services/i18n.ts');
    await initI18n();
    // @ts-expect-error
    const { GoldReservesPanel } = await import('/src/components/GoldReservesPanel.ts');

    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const pollUntil = async (pred: () => boolean, maxMs = 3000) => {
      for (let i = 0; i < maxMs / 50 && !pred(); i++) await wait(50);
    };

    const panel = new GoldReservesPanel();
    document.body.appendChild(panel.getElement());
    const root = panel.getElement();

    await pollUntil(() => !!root.querySelector('.gold-search'));
    // after API returns rows
    await pollUntil(() => root.querySelectorAll('tbody tr').length > 0);

    const rowCount = root.querySelectorAll('tbody tr').length;

    // search for 'Test' should filter to one row
    const input = root.querySelector('.gold-search') as HTMLInputElement;
    input.value = 'Test';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(100);
    const filtered = root.querySelectorAll('tbody tr').length;

    return { rowCount, filtered };
  });

  expect(result.rowCount).toBeGreaterThan(0);
  expect(result.filtered).toBe(1);
});
