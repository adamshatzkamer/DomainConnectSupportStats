import { expect, test, expectLoadError } from './fixtures';

function names(page: import('@playwright/test').Page) {
  return page.locator('tbody tr td:first-child a');
}

test.describe('Stacks list (stacks.html)', () => {
  test('lists every stack in export order with deployments, support and domains', async ({
    page,
  }) => {
    await page.goto('stacks.html');
    await expect(names(page)).toHaveText(['Cloudflare', 'IONOS', 'Plesk', 'Quiet Host']);
    const plesk = page.locator('tbody tr', { hasText: 'Plesk' });
    await expect(plesk.locator('td').first()).toContainText('plesk.com');
    await expect(plesk).toContainText('40.0%');
    await expect(plesk).not.toContainText('33.3%');
    await expect(plesk).not.toContainText('1,150');
    await expect(
      plesk.getByTitle('1,150 of 12K scanned domains in the partial scan of 01-06-2026'),
    ).toHaveText('9.6%');
    await expect(plesk.getByTestId('range-bar')).toBeVisible();
    await expect(page.getByTestId('caveats')).toContainText('without a stack are not listed');
  });

  test('links the name to the card', async ({ page }) => {
    await page.goto('stacks.html');
    await page.getByRole('link', { name: 'Plesk' }).click();
    await expect(page).toHaveURL(/stack\.html\?id=plesk\.com$/);
    await expect(page.getByTestId('card-title')).toContainText('Plesk');
  });

  test('links the deployments count to the stack in the DNS providers list', async ({ page }) => {
    await page.goto('stacks.html');
    await page
      .locator('tbody tr', { hasText: 'Plesk' })
      .getByRole('link', { name: '2', exact: true })
      .click();
    await expect(page).toHaveURL(/dns-providers\.html\?stack=plesk\.com$/);
    await expect(page.getByTestId('stack-filter')).toBeVisible();
  });

  test('filters by search', async ({ page }) => {
    await page.goto('stacks.html');
    await page.getByRole('searchbox').fill('ionos');
    await expect(names(page)).toHaveText(['IONOS']);
    await page.getByRole('searchbox').fill('nothing-matches');
    await expect(page.locator('tbody')).toContainText('No stack to show');
  });

  test('sorts by name', async ({ page }) => {
    await page.goto('stacks.html');
    await page.getByRole('button', { name: /STACK/ }).click();
    await expect(names(page)).toHaveText(['Cloudflare', 'IONOS', 'Plesk', 'Quiet Host']);
    await page.getByRole('button', { name: /STACK/ }).click();
    await expect(names(page).first()).toHaveText('Quiet Host');
  });

  test('shows unknown support as a dash without a bar, sorted last', async ({ page }) => {
    await page.route('**/data/stacks.json', async (route) => {
      const file = await (await route.fetch()).json();
      Object.assign(file.tables.stacks.rows[0], {
        min_supported_pct: null,
        median_supported_pct: null,
        max_supported_pct: null,
      });
      await route.fulfill({ json: file });
    });
    await page.goto('stacks.html');
    const first = page.locator('tbody tr', { hasText: 'Cloudflare' });
    await expect(first.getByTestId('range-bar')).toHaveCount(0);
    await expect(first.locator('td').nth(2)).toContainText('–');
    await page.getByRole('button', { name: /SUPPORT/ }).click();
    await expect(names(page).last()).toHaveText('Cloudflare');
  });

  test.describe('load failure', () => {
    test.use({ expectErrors: true });

    test('shows an error state when the list is unavailable', async ({ page }) => {
      await page.route('**/data/stacks.json', (route) => route.fulfill({ status: 500 }));
      await page.goto('stacks.html');
      await expectLoadError(page);
    });
  });

  test('fits at phone width', async ({ page }, testInfo) => {
    await page.goto('stacks.html');
    const headers = page.locator('thead th:visible');
    if (testInfo.project.name === 'mobile') {
      await expect(headers).toHaveText([/STACK/, /DEPLOYMENTS/, /SUPPORT/, /DOMAINS/]);
    } else {
      await expect(headers).toHaveCount(4);
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
