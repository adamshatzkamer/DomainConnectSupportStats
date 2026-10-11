import { expect, test, expectLoadError } from './fixtures';

function names(page: import('@playwright/test').Page) {
  return page.locator('tbody tr td:first-child a');
}

test.describe('DNS providers list (dns-providers.html)', () => {
  test('lists the visible providers in export order with their support and domains', async ({
    page,
  }) => {
    await page.goto('dns-providers.html');
    await expect(names(page)).toHaveText(['Cloudflare', 'IONOS', 'Plesk']);
    const cloudflare = page.locator('tbody tr', { hasText: 'Cloudflare' });
    await expect(cloudflare).toContainText('api.cloudflare.com');
    await expect(cloudflare).toContainText(/3\s*60.0%/);
    await expect(cloudflare).toContainText(/1\s*20.0%\s*1\s*20.0%/);
    await expect(cloudflare).not.toContainText('4,000');
    await expect(
      cloudflare.getByTitle('4,000 of 12K scanned domains in the partial scan of 01-06-2026'),
    ).toHaveText('33.3%');
    await expect(page.getByTestId('caveats')).toContainText('share of every template (5)');
    await expect(page.getByTestId('caveats')).toContainText('last attempt');
  });

  test('shows statuses as badges with the raw value on hover', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'status columns hidden at phone width');
    await page.goto('dns-providers.html?all=1');
    const plesk3 = page.locator('tbody tr').nth(3);
    await expect(plesk3.locator('.badge', { hasText: 'HTTP error' })).toHaveAttribute(
      'title',
      /^http_error/,
    );
    await expect(plesk3.locator('.badge', { hasText: 'Given up' })).toHaveAttribute(
      'title',
      /^dead/,
    );
    const small = page.locator('tbody tr', { hasText: 'Small Registrar' });
    await expect(small.locator('.badge', { hasText: 'Not checked yet' })).toHaveAttribute(
      'title',
      /^null/,
    );
  });

  test('hides given-up, never-probed and zero-domain providers behind a toggle in the URL', async ({
    page,
  }) => {
    await page.goto('dns-providers.html');
    const toggle = page.getByTestId('show-all');
    await expect(page.getByText('Show all (3 hidden')).toBeVisible();
    await toggle.check();
    await expect(names(page)).toHaveCount(6);
    await expect(page).toHaveURL(/dns-providers\.html\?all=1$/);
    await page.reload();
    await expect(names(page)).toHaveCount(6);
    await expect(page.getByTestId('show-all')).toBeChecked();
  });

  test('filters to one stack and links back to all providers', async ({ page }) => {
    await page.goto('dns-providers.html?stack=plesk.com&all=1');
    await expect(names(page)).toHaveText(['Plesk', 'Plesk']);
    await expect(
      page.getByRole('heading', { name: 'DNS providers of stack plesk.com' }),
    ).toBeVisible();
    await page.getByTestId('stack-filter').getByRole('link', { name: 'All DNS providers' }).click();
    await expect(page).toHaveURL(/dns-providers\.html\?all=1$/);
    await expect(names(page)).toHaveCount(6);
  });

  test('says so when a stack has no provider to show', async ({ page }) => {
    await page.goto('dns-providers.html?stack=unknown.example');
    await expect(page.locator('tbody')).toContainText('No DNS provider of stack unknown.example');
  });

  test('pre-fills the search from ?q= and keeps it in the URL', async ({ page }) => {
    await page.goto('dns-providers.html?q=ionos');
    const search = page.getByRole('searchbox');
    await expect(search).toHaveValue('ionos');
    await expect(names(page)).toHaveText(['IONOS']);
    await search.fill('cloud');
    await expect(names(page)).toHaveText(['Cloudflare']);
    await expect(page).toHaveURL(/dns-providers\.html\?q=cloud$/);
  });

  test('sorts by a column, largest first, then smallest first', async ({ page }) => {
    await page.goto('dns-providers.html?all=1');
    const domains = page.getByRole('button', { name: /DOMAINS/ });
    await domains.click();
    await expect(names(page).first()).toHaveText('Cloudflare');
    await domains.click();
    await expect(names(page).first()).toHaveText('Quiet Host');
  });

  test('shows a never-probed DNS provider as not probed yet', async ({ page }) => {
    await page.goto('dns-providers.html?all=1');
    const never = page.locator('tbody tr', { hasText: 'Small Registrar' });
    await expect(never).toContainText('Not probed yet');
  });

  test('links names to DNS provider cards and stacks to stack cards', async ({ page }) => {
    await page.goto('dns-providers.html');
    const row = page.locator('tbody tr', { hasText: 'Cloudflare' });
    // The stack column is hidden at phone width, so it is found by its href, not its role.
    await expect(row.locator('a', { hasText: 'cloudflare.com' })).toHaveAttribute(
      'href',
      './stack.html?id=cloudflare.com',
    );
    await row.getByRole('link', { name: 'Cloudflare', exact: true }).click();
    await expect(page).toHaveURL(/dns-provider\.html\?id=1$/);
    await expect(page.getByTestId('card-title')).toContainText('Cloudflare');
  });

  test('shows no stack link for a provider without a stack', async ({ page }) => {
    await page.goto('dns-providers.html?all=1');
    const row = page.locator('tbody tr', { hasText: 'Small Registrar' });
    await expect(row.locator('td').nth(1)).toHaveText('–');
    await expect(row.locator('td').nth(1).getByRole('link')).toHaveCount(0);
  });

  test.describe('a long list', () => {
    // The example's rows repeated to 1,000 visible DNS providers, named `Provider 1` … in order.
    test.beforeEach(async ({ page }) => {
      await page.route('**/data/dns-providers.json', async (route) => {
        const file = await (await route.fetch()).json();
        const table = file.tables.dns_providers;
        const visible = table.rows.filter(
          (r: { dns_provider_id: number }) => r.dns_provider_id === 1,
        );
        table.rows = Array.from({ length: 1000 }, (_, i) => ({
          ...visible[0],
          dns_provider_id: i + 1,
          name: `Provider ${i + 1}`,
        }));
        await route.fulfill({ json: file });
      });
    });

    test('shows 20 rows per page and pages through them', async ({ page }) => {
      await page.goto('dns-providers.html');
      await expect(names(page)).toHaveCount(20);
      await expect(page.getByTestId('page-range')).toHaveText('1–20 of 1,000');
      await expect(page.getByTestId('row-count')).toHaveText('1,000 of 1,000');
      await page.getByRole('button', { name: /Next/ }).click();
      await expect(names(page).first()).toHaveText('Provider 21');
      await expect(page.getByText('Page 2 of 50')).toBeVisible();
    });

    test('shows more rows per page on request', async ({ page }) => {
      await page.goto('dns-providers.html');
      const size = page.getByRole('combobox', { name: 'Rows per page' });
      await size.selectOption('100');
      await expect(names(page)).toHaveCount(100);
      await size.selectOption('all');
      await expect(names(page)).toHaveCount(1000);
    });

    test('goes back to the first page on search', async ({ page }) => {
      await page.goto('dns-providers.html');
      await page.getByRole('button', { name: /Next/ }).click();
      await page.getByRole('searchbox').fill('Provider 1');
      await expect(names(page).first()).toHaveText('Provider 1');
      await expect(page.getByTestId('page-range')).toHaveText('1–20 of 112');
    });

    test('fits the pager to the screen', async ({ page }) => {
      await page.goto('dns-providers.html');
      await expect(page.getByTestId('page-range')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });

  test.describe('load failure', () => {
    test.use({ expectErrors: true });

    test('shows an error state when the list is unavailable', async ({ page }) => {
      await page.route('**/data/dns-providers.json', (route) => route.fulfill({ status: 500 }));
      await page.goto('dns-providers.html');
      await expectLoadError(page);
    });
  });

  test('shows name, support and domains only at phone width', async ({ page }, testInfo) => {
    await page.goto('dns-providers.html');
    const headers = page.locator('thead th:visible');
    if (testInfo.project.name === 'mobile') {
      await expect(headers).toHaveText([/NAME/, /SUPPORTED/, /DOMAINS/]);
      const overflow = await page
        .locator('.table-wrapper')
        .evaluate((w) => w.scrollWidth - w.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    } else {
      await expect(headers).toHaveCount(8);
    }
  });

  test('fits the screen without horizontal page scroll', async ({ page }) => {
    await page.goto('dns-providers.html?all=1');
    await expect(names(page)).toHaveCount(6);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
