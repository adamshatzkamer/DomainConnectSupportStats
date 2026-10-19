import { resolve } from 'node:path';
import { expect, test, expectLoadError } from './fixtures';

const LOGO = resolve(import.meta.dirname, '../../public/assets/DomainConnectBlackSmall.png');

function names(page: import('@playwright/test').Page) {
  return page.locator('tbody tr td:nth-child(2) a');
}

/** The example export has no never-probed template: `template2` becomes one. */
async function withNeverProbed(page: import('@playwright/test').Page) {
  await page.route('**/data/templates.json', async (route) => {
    const file = await (await route.fetch()).json();
    for (const row of file.tables.service_templates.rows) {
      if (row.service_id === 'template2') {
        Object.assign(row, {
          supported_count: 0,
          supported_pct: 0,
          unsupported_count: 0,
          unsupported_pct: 0,
          undetermined_count: 5,
          undetermined_pct: 100,
        });
      }
    }
    await route.fulfill({ json: file });
  });
}

test.describe('Templates list (templates.html)', () => {
  test('lists every template in export order with its support and reach', async ({ page }) => {
    await page.goto('templates.html');
    await expect(names(page)).toHaveText([
      'Example Website',
      'Domain Verification',
      'Acme Mail',
      'x',
      'Example Verification',
    ]);
    const website = page.locator('tbody tr', { hasText: 'Example Website' });
    await expect(website).toContainText('template1');
    await expect(website).toContainText(/4\s*100.0%/);
    await expect(website).not.toContainText('of 10');
    await expect(website).not.toContainText('7,150');
    await expect(
      website.getByTitle('7,150 of 12K scanned domains in the partial scan of 01-06-2026'),
    ).toHaveText('59.6%');
    await expect(page.getByText('Show all (0 hidden')).toBeVisible();
    await expect(page.getByTestId('caveats')).toContainText('supporting at least one template (4)');
  });

  test('links the service provider first', async ({ page }) => {
    await page.goto('templates.html');
    const verify = page.locator('tbody tr', { hasText: 'Domain Verification' });
    await expect(verify.locator('td').first().getByRole('link')).toHaveText('Acme Mail Inc.');
    await expect(verify.getByRole('link', { name: 'Acme Mail Inc.' })).toHaveAttribute(
      'href',
      './service-provider.html?id=mail.acme.example',
    );
  });

  test('shows the added date and not supported on wide screens', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'columns hidden at phone width');
    await page.goto('templates.html');
    const verify = page.locator('tbody tr', { hasText: 'Domain Verification' });
    await expect(verify.getByTitle('25-03-2026', { exact: false })).toHaveText('25-03-2026');
    await expect(verify).toContainText(/2\s*50.0%\s*2\s*50.0%/);
  });

  test('links the template to its card', async ({ page }) => {
    // The card loads the logo from the service provider's host; the example hosts do not exist.
    await page.route('https://*/logo.png', (route) => route.fulfill({ path: LOGO }));
    await page.goto('templates.html');
    await page.getByRole('link', { name: 'Acme Mail', exact: true }).click();
    await expect(page).toHaveURL(/template\.html\?spid=mail\.acme\.example&sid=mail$/);
    await expect(page.getByTestId('card-title')).toContainText('Acme Mail');
  });

  test('hides never-probed templates behind a toggle in the URL', async ({ page }) => {
    await withNeverProbed(page);
    await page.goto('templates.html');
    await expect(names(page)).toHaveCount(4);
    await expect(page.getByText('Show all (1 hidden: never probed)')).toBeVisible();
    await page.getByTestId('show-all').check();
    await expect(page).toHaveURL(/templates\.html\?all=1$/);
    const row = page.locator('tbody tr', { hasText: 'Example Verification' });
    await expect(row.locator('td').nth(3)).toHaveText('Not probed yet');
    await expect(row.locator('td').nth(4)).toHaveText('–');
    await page.reload();
    await expect(names(page)).toHaveCount(5);
  });

  test('filters to one service provider and links back to all templates', async ({ page }) => {
    await page.goto('templates.html?spid=mail.acme.example');
    await expect(names(page)).toHaveText(['Domain Verification', 'Acme Mail']);
    await expect(page.getByRole('heading', { name: 'Templates of Acme Mail Inc.' })).toBeVisible();
    const filter = page.getByTestId('spid-filter');
    await expect(filter.getByRole('link', { name: 'Acme Mail Inc.' })).toHaveAttribute(
      'href',
      './service-provider.html?id=mail.acme.example',
    );
    await filter.getByRole('link', { name: 'All templates' }).click();
    await expect(page).toHaveURL(/templates\.html$/);
    await expect(names(page)).toHaveCount(5);
  });

  test('says so when a service provider has no template to show', async ({ page }) => {
    await page.goto('templates.html?spid=unknown.example');
    await expect(page.locator('tbody')).toContainText(
      'No template of service provider unknown.example',
    );
  });

  test('pre-fills the search from ?q= and keeps it in the URL', async ({ page }) => {
    await page.goto('templates.html?q=verification');
    const search = page.getByRole('searchbox');
    await expect(search).toHaveValue('verification');
    await expect(names(page)).toHaveText(['Domain Verification', 'Example Verification']);
    await search.fill('website');
    await expect(names(page)).toHaveText(['Example Website']);
    await expect(page).toHaveURL(/templates\.html\?q=website$/);
  });

  test('sorts by reach, largest first, then smallest first', async ({ page }) => {
    await page.goto('templates.html');
    const reach = page.getByRole('button', { name: /REACH/ });
    await reach.click();
    await expect(names(page).first()).toHaveText('Example Website');
    await reach.click();
    await expect(names(page).first()).not.toHaveText('Example Website');
  });

  test.describe('load failure', () => {
    test.use({ expectErrors: true });

    test('shows an error state when the list is unavailable', async ({ page }) => {
      await page.route('**/data/templates.json', (route) => route.fulfill({ status: 500 }));
      await page.goto('templates.html');
      await expectLoadError(page);
    });
  });

  test('shows provider, template, support and reach at phone width', async ({ page }, testInfo) => {
    await page.goto('templates.html');
    const headers = page.locator('thead th:visible');
    if (testInfo.project.name === 'mobile') {
      await expect(headers).toHaveText([/PROVIDER/, /TEMPLATE/, /SUPPORTED/, /REACH/]);
    } else {
      await expect(headers).toHaveCount(6);
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
