import { test as base, expect, type Page } from '@playwright/test';

/** The deploy writes `registry/registry.json`; the example registry has none, so it is routed. */
export const REGISTRY_SOURCE = { repository: 'Domain-Connect/DnsProviders', commit: 'abc1234' };

/** The analytics hosts: never reached from a test; every test answers them with nothing. */
export const ANALYTICS_HOSTS = /^https:\/\/(gc\.zgo\.at|[^/]+\.goatcounter\.com)\//;

/**
 * Every page test fails on an uncaught page error or a console error. A test that provokes an
 * error on purpose sets `expectErrors` to true.
 */
export const test = base.extend<{
  expectErrors: boolean;
  consoleErrors: string[];
  registrySource: void;
  analytics: void;
}>({
  expectErrors: [false, { option: true }],
  registrySource: [
    async ({ page }, use) => {
      await page.route('**/registry/registry.json', (route) =>
        route.fulfill({ json: REGISTRY_SOURCE }),
      );
      await use();
    },
    { auto: true },
  ],
  analytics: [
    async ({ page }, use) => {
      await page.route(ANALYTICS_HOSTS, (route) =>
        route.fulfill({ contentType: 'text/javascript', body: '' }),
      );
      await use();
    },
    { auto: true },
  ],
  consoleErrors: [
    async ({ page, expectErrors }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`console: ${m.text()}`);
      });
      await use(errors);
      if (!expectErrors) expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const PAGES = [
  'index',
  'dns-providers',
  'stacks',
  'service-providers',
  'templates',
  'dns-provider',
  'stack',
  'service-provider',
  'template',
  'leaderboards',
] as const;

/** The page-level error state: plain text, no file URL. */
export async function expectLoadError(
  page: Page,
  text = 'The data is not available at the moment. Try again later.',
) {
  const error = page.getByTestId('load-error');
  await expect(error).toContainText(text);
  await expect(error).not.toContainText('.json');
}
