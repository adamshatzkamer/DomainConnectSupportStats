import { expect, test } from './fixtures';

function section(page: import('@playwright/test').Page, heading: string) {
  return page.locator('section', {
    has: page.getByRole('heading', { name: heading, exact: heading === 'Deployments' }),
  });
}

test.describe('Stack card (stack.html)', () => {
  test('shows the stack and its headline', async ({ page }) => {
    await page.goto('stack.html?id=plesk.com');
    await expect(page.getByTestId('card-title')).toContainText('Plesk');
    await expect(page.getByTestId('card-title')).toContainText('plesk.com');
    await expect(page).toHaveTitle(/^Plesk - Stack/);
    const headline = page.getByTestId('headline');
    await expect(headline).toContainText('Deployments');
    await expect(headline).not.toContainText('1,150');
    await expect(
      headline.getByTitle('1,150 of 12K scanned domains in the partial scan of 01-06-2026'),
    ).toHaveText('9.6%');
    await expect(page.getByTestId('deployments-link')).toHaveAttribute(
      'href',
      './dns-providers.html?stack=plesk.com',
    );
  });

  test('shows the registry logo in the title', async ({ page }) => {
    await page.goto('stack.html?id=cloudflare.com');
    const logo = page.getByTestId('card-title').getByRole('img');
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  test('links deployments to DNS provider cards', async ({ page }) => {
    await page.goto('stack.html?id=plesk.com');
    const deployments = section(page, 'Deployments');
    await expect(deployments.locator('tbody tr')).toHaveCount(2);
    await expect(deployments.locator('tbody tr').first()).toContainText(
      /2\s*40.0%\s*2\s*40.0%\s*1\s*20.0%/,
    );
    await deployments.getByRole('link', { name: 'Plesk' }).first().click();
    await expect(page).toHaveURL(/dns-provider\.html\?id=2$/);
  });

  test('links template coverage to template and service provider cards', async ({ page }) => {
    await page.goto('stack.html?id=cloudflare.com');
    const coverage = section(page, 'Supporting deployments per template');
    await expect(coverage.locator('tbody tr')).toHaveCount(3);
    await expect(coverage.getByRole('link', { name: 'Example Website' })).toHaveAttribute(
      'href',
      './template.html?spid=exampleservice.domainconnect.org&sid=template1',
    );
    await coverage.getByRole('link', { name: 'Acme Mail Inc.' }).first().click();
    await expect(page).toHaveURL(/service-provider\.html\?id=mail\.acme\.example$/);
  });

  test('draws the share over time and says it sums current deployments', async ({ page }) => {
    await page.goto('stack.html?id=plesk.com');
    const share = section(page, 'Domain share over time');
    await expect(share).toContainText('current deployments');
    await expect(page.getByRole('img', { name: 'Domain share over time' })).toBeVisible();
    await expect(share.locator('table')).toHaveCount(0);
  });

  test('shows the registry contact and details of the stack itself', async ({ page }) => {
    await page.goto('stack.html?id=cloudflare.com');
    await expect(
      page
        .getByTestId('registry-contact')
        .getByRole('link', { name: 'domain-connect@cloudflare.com' }),
    ).toBeVisible();
    const registry = page.getByTestId('registry');
    await expect(registry.getByRole('heading', { name: 'Registry', exact: true })).toBeVisible();
    await expect(
      registry.getByRole('link', { name: 'Entry in the registry repository' }),
    ).toBeVisible();
  });

  test('orders the card: title, headline, contact, history, tables, registry', async ({ page }) => {
    await page.goto('stack.html?id=cloudflare.com');
    const blocks = [
      page.getByTestId('card-title'),
      page.getByTestId('headline'),
      page.getByTestId('registry-contact'),
      section(page, 'Domain share over time'),
      section(page, 'Deployments'),
      section(page, 'Supporting deployments per template'),
      page.getByTestId('registry'),
    ];
    for (const block of blocks) await expect(block).toBeVisible();
    const ys = await Promise.all(blocks.map(async (b) => (await b.boundingBox())!.y));
    expect(ys).toEqual([...ys].sort((x, y) => x - y));
  });

  test.describe('without registry entry', () => {
    // The browser logs the entry's 404 as a console error.
    test.use({ expectErrors: true });

    test('shows no registry blocks and an empty coverage', async ({ page }) => {
      await page.goto('stack.html?id=quiet-host.example');
      await expect(page.getByTestId('headline')).toBeVisible();
      await expect(page.getByTestId('registry')).toHaveCount(0);
      await expect(page.getByTestId('registry-contact')).toHaveCount(0);
      await expect(section(page, 'Supporting deployments per template')).toContainText(
        'No template supported',
      );
    });
  });

  for (const query of ['', '?id=']) {
    test(`shows "not found" for stack.html${query}`, async ({ page }) => {
      await page.goto(`stack.html${query}`);
      const notFound = page.getByTestId('not-found');
      await expect(notFound).toBeVisible();
      await notFound.getByRole('link', { name: /Stacks/ }).click();
      await expect(page).toHaveURL(/stacks\.html$/);
    });
  }

  test.describe('unknown id', () => {
    test.use({ expectErrors: true });

    test('shows "not found" for an id without a card', async ({ page, consoleErrors }) => {
      await page.goto('stack.html?id=nope.example');
      await expect(page.getByTestId('not-found')).toContainText('This stack');
      expect(consoleErrors.every((e) => e.includes('404'))).toBe(true);
    });
  });

  test('fits every table to the screen at phone width', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'phone width only');
    await page.goto('stack.html?id=plesk.com');
    await expect(page.getByTestId('headline')).toBeVisible();
    await expect(section(page, 'Deployments').locator('thead th:visible')).toHaveText([
      /NAME/,
      /SUPPORTED/,
      /DOMAINS/,
    ]);
    for (const wrapper of await page.locator('.table-wrapper').all()) {
      expect(await wrapper.evaluate((w) => w.scrollWidth - w.clientWidth)).toBeLessThanOrEqual(0);
    }
  });

  test('fits the screen without horizontal page scroll', async ({ page }) => {
    await page.goto('stack.html?id=plesk.com');
    await expect(page.getByTestId('headline')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
