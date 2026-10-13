import { ANALYTICS_HOSTS, expect, test } from './fixtures';

const ENDPOINT = 'https://domain-connect.goatcounter.com/count';

for (const [url, path] of [
  ['index.html', '/index.html'],
  ['dns-providers.html?stack=plesk.com&q=a', '/dns-providers.html'],
  ['dns-provider.html?id=3', '/dns-provider.html?id=3'],
  ['template.html?spid=unnamed.example&sid=x', '/template.html?spid=unnamed.example&sid=x'],
] as const) {
  test(`${url} counts ${path}`, async ({ page }) => {
    await page.goto(url);
    const script = page.locator('script[data-goatcounter]');
    await expect(script).toHaveAttribute('src', 'https://gc.zgo.at/count.js');
    await expect(script).toHaveAttribute('data-goatcounter', ENDPOINT);
    expect(await page.evaluate(() => window.goatcounter?.path)).toBe(path);
  });
}

test.describe('with the analytics hosts blocked', () => {
  test.use({ expectErrors: true });

  for (const url of ['index.html', 'stack.html?id=plesk.com', 'methodology.html']) {
    test(`${url} works`, async ({ page, consoleErrors }) => {
      await page.route(ANALYTICS_HOSTS, (route) => route.abort('blockedbyclient'));
      await page.goto(url);
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByTestId('load-error')).toHaveCount(0);
      if (url !== 'methodology.html')
        await expect(page.getByTestId('data-annotation')).toBeVisible();
      expect(consoleErrors.filter((e) => !e.includes('Failed to load resource'))).toEqual([]);
    });
  }
});
