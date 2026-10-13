import { ANALYTICS_HOSTS, expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const ENDPOINT = 'https://dcss.dc.paulonet.eu/count';
const SITE = 'Domain Connect Support Statistics';

/** The page view sent to the endpoint: path and title. count.js skips localhost unless allowed. */
async function countedView(page: Page, url: string) {
  await page.addInitScript(() => (window.goatcounter = { allow_local: true }));
  const beacon = page.waitForRequest((r) => r.url().startsWith(`${ENDPOINT}?`));
  await page.goto(url);
  const query = new URL((await beacon).url()).searchParams;
  return { path: query.get('p'), title: query.get('t') };
}

for (const [url, path, title] of [
  ['index.html', '/index.html', `Overview - ${SITE}`],
  [
    'dns-providers.html?stack=plesk.com&q=a',
    '/dns-providers.html',
    `plesk.com - DNS providers - ${SITE}`,
  ],
  ['dns-provider.html?id=3', '/dns-provider.html?id=3', `Plesk - DNS provider - ${SITE}`],
  ['stack.html?id=plesk.com', '/stack.html?id=plesk.com', `Plesk - Stack - ${SITE}`],
  [
    'service-provider.html?id=unnamed.example',
    '/service-provider.html?id=unnamed.example',
    `unnamed.example - Service provider - ${SITE}`,
  ],
  [
    'template.html?spid=unnamed.example&sid=x',
    '/template.html?spid=unnamed.example&sid=x',
    `Unnamed template - Template - ${SITE}`,
  ],
] as const) {
  test(`${url} counts ${path} as "${title}"`, async ({ page }) => {
    expect(await countedView(page, url)).toEqual({ path, title });
    await expect(page).toHaveTitle(title);
  });
}

test('an unnamed DNS provider counts as such', async ({ page }) => {
  await page.route('**/data/dns-providers/3.json', async (route) => {
    const file = await (await route.fetch()).json();
    file.tables.provider.rows[0].name = null;
    await route.fulfill({ json: file });
  });
  expect((await countedView(page, 'dns-provider.html?id=3')).title).toBe(
    `Unnamed DNS provider - DNS provider - ${SITE}`,
  );
});

test.describe('not found or failing', () => {
  test.use({ expectErrors: true });

  test('a card not found counts with the page title', async ({ page }) => {
    expect(await countedView(page, 'stack.html?id=nope.example')).toEqual({
      path: '/stack.html?id=nope.example',
      title: `Stack - ${SITE}`,
    });
  });

  test('a card without its parameters counts with the page title', async ({ page }) => {
    expect(await countedView(page, 'template.html?spid=unnamed.example')).toEqual({
      path: '/template.html?spid=unnamed.example',
      title: `Template - ${SITE}`,
    });
  });

  test('a card failing to load counts with the page title', async ({ page }) => {
    await page.route('**/data/stacks/plesk.com.json', (route) => route.fulfill({ status: 500 }));
    expect(await countedView(page, 'stack.html?id=plesk.com')).toEqual({
      path: '/stack.html?id=plesk.com',
      title: `Stack - ${SITE}`,
    });
  });
});

test('count.js comes from the site', async ({ page, baseURL }) => {
  await page.goto('stack.html?id=plesk.com');
  const script = page.locator('script[data-goatcounter]');
  await expect(script).toHaveAttribute('data-goatcounter', ENDPOINT);
  const src = await script.evaluate((s: HTMLScriptElement) => s.src);
  expect(src).toBe(new URL('goatcounter/count.v5.js', baseURL).href);
  expect((await page.request.get(src)).ok()).toBe(true);
});

test.describe('with the endpoint blocked', () => {
  test.use({ expectErrors: true });

  for (const url of ['index.html', 'stack.html?id=plesk.com', 'methodology.html']) {
    test(`${url} works`, async ({ page, consoleErrors }) => {
      await page.addInitScript(() => (window.goatcounter = { allow_local: true }));
      await page.route(ANALYTICS_HOSTS, (route) => route.abort('blockedbyclient'));
      const beacon = page.waitForRequest((r) => r.url().startsWith(`${ENDPOINT}?`));
      await page.goto(url);
      await beacon;
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByTestId('load-error')).toHaveCount(0);
      if (url !== 'methodology.html')
        await expect(page.getByTestId('data-annotation')).toBeVisible();
      expect(consoleErrors.filter((e) => !e.includes('Failed to load resource'))).toEqual([]);
    });
  }
});
