import { resolve } from 'node:path';
import { expect, test, expectLoadError } from './fixtures';

const LOGO = resolve(import.meta.dirname, '../../public/assets/DomainConnectBlackSmall.png');

function names(page: import('@playwright/test').Page) {
  return page.locator('tbody tr td:first-child a');
}

test.describe('Service providers list (service-providers.html)', () => {
  test('lists every service provider in export order with templates and reach', async ({
    page,
  }) => {
    await page.goto('service-providers.html');
    await expect(names(page)).toHaveText(['Example Service', 'Acme Mail Inc.', 'unnamed.example']);
    const acme = page.locator('tbody tr', { hasText: 'Acme Mail Inc.' });
    await expect(acme.locator('td').first()).toContainText('mail.acme.example');
    await expect(acme).not.toContainText('6,900');
    await expect(
      acme.getByTitle('6,900 of 12K scanned domains in the partial scan of 01-06-2026'),
    ).toHaveText('57.5%');
    await expect(page.getByTestId('caveats')).toContainText('share of the scanned domains');
  });

  test('lists a provider without a name once, by its id', async ({ page }) => {
    await page.goto('service-providers.html');
    const unnamed = page.locator('tbody tr', { hasText: 'unnamed.example' });
    await expect(unnamed.locator('td').first()).toHaveText('unnamed.example');
  });

  test('shows supported, DNS providers and dates on wide screens', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'columns hidden at phone width');
    await page.goto('service-providers.html');
    const cells = page.locator('tbody tr', { hasText: 'Example Service' }).locator('td');
    await expect(cells).toHaveText([/Example Service/, '2', '1', '4', /2017/, /2026/, '59.6%']);
  });

  test('links the name to the card', async ({ page }) => {
    // The card loads the logo from the service provider's host; the example hosts do not exist.
    await page.route('https://*/logo.png', (route) => route.fulfill({ path: LOGO }));
    await page.goto('service-providers.html');
    await page.getByRole('link', { name: 'Acme Mail Inc.' }).click();
    await expect(page).toHaveURL(/service-provider\.html\?id=mail\.acme\.example$/);
    await expect(page.getByTestId('card-title')).toContainText('Acme Mail');
  });

  test('links the templates count to its templates in the templates list', async ({ page }) => {
    await page.goto('service-providers.html');
    const acme = page.locator('tbody tr', { hasText: 'Acme Mail Inc.' });
    await acme.getByRole('link', { name: '2' }).click();
    await expect(page).toHaveURL(/templates\.html\?spid=mail\.acme\.example$/);
    await expect(page.getByRole('heading', { name: 'Templates of Acme Mail Inc.' })).toBeVisible();
  });

  test('pre-fills the search from ?q= and keeps it in the URL', async ({ page }) => {
    await page.goto('service-providers.html?q=acme');
    const search = page.getByRole('searchbox');
    await expect(search).toHaveValue('acme');
    await expect(names(page)).toHaveText(['Acme Mail Inc.']);
    await search.fill('unnamed');
    await expect(names(page)).toHaveText(['unnamed.example']);
    await expect(page).toHaveURL(/service-providers\.html\?q=unnamed$/);
  });

  test('says so when no service provider matches', async ({ page }) => {
    await page.goto('service-providers.html?q=nothing-matches');
    await expect(page.locator('tbody')).toContainText('No service provider to show');
  });

  test('sorts by reach, smallest first on the second click', async ({ page }) => {
    await page.goto('service-providers.html');
    const reach = page.getByRole('button', { name: /REACH/ });
    await reach.click();
    await expect(names(page).first()).toHaveText('Example Service');
    await reach.click();
    await expect(names(page).first()).toHaveText('unnamed.example');
  });

  test('shows unknown reach as a dash', async ({ page }) => {
    await page.route('**/data/service-providers.json', async (route) => {
      const file = await (await route.fetch()).json();
      for (const row of file.tables.service_providers.rows) {
        Object.assign(row, { reach_domains: null, reach_pct: null });
      }
      await route.fulfill({ json: file });
    });
    await page.goto('service-providers.html');
    const acme = page.locator('tbody tr', { hasText: 'Acme Mail Inc.' });
    await expect(acme.locator('td').last()).toHaveText('–');
  });

  test.describe('load failure', () => {
    test.use({ expectErrors: true });

    test('shows an error state when the list is unavailable', async ({ page }) => {
      await page.route('**/data/service-providers.json', (route) => route.fulfill({ status: 500 }));
      await page.goto('service-providers.html');
      await expectLoadError(page);
    });
  });

  test('shows name, templates and reach at phone width', async ({ page }, testInfo) => {
    await page.goto('service-providers.html');
    const headers = page.locator('thead th:visible');
    if (testInfo.project.name === 'mobile') {
      await expect(headers).toHaveText([/PROVIDER/, /TEMPLATES/, /REACH/]);
    } else {
      await expect(headers).toHaveCount(7);
    }
    const table = await page
      .locator('.table-wrapper')
      .evaluate((w) => w.scrollWidth - w.clientWidth);
    expect(table).toBeLessThanOrEqual(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
