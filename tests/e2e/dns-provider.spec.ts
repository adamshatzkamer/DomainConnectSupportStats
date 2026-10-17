import { expect, test } from './fixtures';

function section(page: import('@playwright/test').Page, heading: string) {
  return page.locator('section', { has: page.getByRole('heading', { name: heading }) });
}

test.describe('DNS provider card (dns-provider.html)', () => {
  test('shows the provider, its stack and its support', async ({ page }) => {
    await page.goto('dns-provider.html?id=1');
    await expect(page.getByTestId('card-title')).toContainText('Cloudflare');
    await expect(page.getByTestId('card-title')).not.toContainText('DNS provider');
    await expect(page).toHaveTitle(/^Cloudflare - DNS provider/);
    await expect(page.getByTestId('stack-link')).toHaveAttribute(
      'href',
      './stack.html?id=cloudflare.com',
    );
    const headline = page.getByTestId('headline');
    await expect(headline).toContainText(/3\s*Supported templates\s*of 5 templates \(60.0%\)/);
    await expect(headline).toContainText(/1\s*Not supported\s*20.0% of templates/);
    await expect(headline).toContainText(
      /1\s*Not yet determined\s*20.0%: never probed, retried or failed/,
    );
    await expect(headline).not.toContainText('template versions');
    await expect(headline).not.toContainText('4,000');
    await expect(
      headline.getByTitle('4,000 of 12K scanned domains in the partial scan of 01-06-2026'),
    ).toHaveText('33.3%');
    await expect(headline).toContainText('#1');
    await expect(page.getByTestId('provider-record')).toContainText('ns2.example.net');
  });

  test('sorts supported templates by since, most recent first', async ({ page }, testInfo) => {
    await page.goto('dns-provider.html?id=1');
    const templates = section(page, 'Supported templates (current state)');
    if (testInfo.project.name !== 'mobile')
      await expect(
        templates.getByRole('columnheader', { name: /SUPPORTED SINCE/ }),
      ).toHaveAttribute('aria-sort', 'descending');
    await expect(templates.getByTestId('since-caveat')).not.toContainText('any version');
  });

  test('shows what each supported template serves', async ({ page }) => {
    await page.goto('dns-provider.html?id=2');
    const templates = section(page, 'Supported templates (current state)');
    const served = (name: string) =>
      templates
        .locator('tbody tr', { has: page.getByRole('link', { name }) })
        .locator('td')
        .nth(2);
    await expect(served('Acme Mail')).toHaveText(/^\s*v1 · full\s*morphed\s*$/);
    await expect(served('Example Website')).toHaveText(/^\s*v1 · full\s*outdated\s*$/);
    await expect(served('Example Website').getByTitle(/repository version 2/)).toBeVisible();
    await expect(served('Example Website').locator('.badge')).toHaveAttribute(
      'title',
      "The full template's version (1) is below the repository's (2)",
    );
    await expect(served('Acme Mail').locator('.badge')).toHaveAttribute('title', /altered by/);
    await page.goto('dns-provider.html?id=3');
    await expect(
      section(page, 'Supported templates (current state)').locator('tbody td').nth(2),
    ).toHaveText('Not recorded yet');
  });

  test('counts the served templates of the supported ones', async ({ page }) => {
    await page.goto('dns-provider.html?id=2');
    const served = page.getByTestId('served');
    await expect(served).toContainText(/With version\s*2\s*\(100.0% of 2 supported templates\)/);
    await expect(served).toContainText(/Morphed\s*1\s*\(50.0% of 2 supported templates\)/);
  });

  test('shows the statuses of the latest completed runs', async ({ page }) => {
    await page.goto('dns-provider.html?id=3');
    const status = page.getByTestId('status-record');
    await expect(status).toContainText('Failed');
    await expect(status.getByTitle(/^failed \(http_error\): latest completed run/)).toBeVisible();
    await expect(status).toContainText('HTTP 502');
    await expect(status).toContainText('Given up');
    await expect(status).toContainText('0 answered, 6 failed');
    await expect(status).toContainText('CERTIFICATE_VERIFY_FAILED');
    await page.goto('dns-provider.html?id=5');
    await expect(page.getByTestId('status-record')).toContainText('Partly failed');
    await expect(page.getByTestId('status-record')).toContainText('1 answered, 1 failed');
  });

  test('links supported templates to their template and service provider cards', async ({
    page,
  }) => {
    await page.goto('dns-provider.html?id=1');
    const templates = section(page, 'Supported templates (current state)');
    await expect(templates.locator('tbody tr')).toHaveCount(3);
    await expect(templates.getByRole('link', { name: 'Example Website' })).toHaveAttribute(
      'href',
      './template.html?spid=exampleservice.domainconnect.org&sid=template1',
    );
    await templates.getByRole('link', { name: 'Acme Mail Inc.' }).first().click();
    await expect(page).toHaveURL(/service-provider\.html\?id=mail\.acme\.example$/);
  });

  test('draws both charts over time without data tables', async ({ page }) => {
    await page.goto('dns-provider.html?id=1');
    await expect(page.getByRole('img', { name: 'Supported templates over time' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Domain share over time' })).toBeVisible();
    await expect(section(page, 'Domain share over time').locator('table')).toHaveCount(0);
    await expect(section(page, 'Supported templates over time').locator('table')).toHaveCount(0);
  });

  test('shows no stack link without a stack', async ({ page }) => {
    await page.goto('dns-provider.html?id=4');
    await expect(page.getByTestId('card-title')).toContainText('No stack');
    await expect(page.getByTestId('stack-link')).toHaveCount(0);
    await expect(section(page, 'Supported templates (current state)')).toContainText(
      'No template supported in the latest probes',
    );
  });

  for (const query of ['', '?id=', '?id=abc']) {
    test(`shows "not found" for dns-provider.html${query}`, async ({ page }) => {
      await page.goto(`dns-provider.html${query}`);
      const notFound = page.getByTestId('not-found');
      await expect(notFound).toBeVisible();
      await notFound.getByRole('link', { name: /DNS providers/ }).click();
      await expect(page).toHaveURL(/dns-providers\.html$/);
    });
  }

  test.describe('unknown id', () => {
    // The browser logs the card's 404 as a console error.
    test.use({ expectErrors: true });

    test('shows "not found" for an id without a card', async ({ page, consoleErrors }) => {
      await page.goto('dns-provider.html?id=999');
      await expect(page.getByTestId('not-found')).toContainText('This DNS provider');
      await expect(page.getByTestId('not-found')).not.toContainText('999');
      expect(consoleErrors.every((e) => e.includes('404'))).toBe(true);
    });
  });

  test('shows the registry logo in the title, then contact and details', async ({ page }) => {
    await page.goto('dns-provider.html?id=1');
    const logo = page.getByTestId('card-title').getByRole('img', { name: 'Cloudflare' });
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const contact = page.getByTestId('registry-contact');
    await expect(
      contact.getByRole('link', { name: 'domain-connect@cloudflare.com' }),
    ).toBeVisible();
    const registry = page.getByTestId('registry');
    await expect(registry.getByTestId('registry-onboarding')).toContainText('syncBlock');
    await expect(
      registry.getByRole('link', { name: 'Entry in the registry repository' }),
    ).toHaveAttribute(
      'href',
      'https://github.com/Domain-Connect/DnsProviders/blob/abc1234/providers/c/l/cloudflare.com.json',
    );
  });

  test('links the settings response of the example domain at its own API', async ({ page }) => {
    await page.goto('dns-provider.html?id=1');
    const example = page.getByTestId('registry-example');
    await expect(example).toContainText('cloudflare.com');
    await expect(example.getByRole('link', { name: 'settings response' })).toHaveAttribute(
      'href',
      'https://api.cloudflare.com/client/v4/dns/domainconnect/v2/cloudflare.com/settings',
    );
  });

  test('orders the card: title, headline, contact, history, templates, registry, settings', async ({
    page,
  }) => {
    await page.goto('dns-provider.html?id=1');
    const blocks = [
      page.getByTestId('card-title'),
      page.getByTestId('headline'),
      page.getByTestId('registry-contact'),
      section(page, 'Domain share over time'),
      section(page, 'Supported templates over time'),
      section(page, 'Supported templates (current state)'),
      page.getByTestId('registry'),
      section(page, 'Settings'),
      page.locator('section', { has: page.getByRole('heading', { name: /Domain Connect URLs/ }) }),
    ];
    for (const block of blocks) await expect(block).toBeVisible();
    const ys = await Promise.all(blocks.map(async (b) => (await b.boundingBox())!.y));
    expect(ys).toEqual([...ys].sort((x, y) => x - y));
  });

  test('shows a migrated entry without its unknown values', async ({ page }) => {
    await page.goto('dns-provider.html?id=5');
    const registry = page.getByTestId('registry');
    await expect(registry.getByRole('heading', { name: 'Registry' })).toBeVisible();
    await expect(registry.getByTestId('registry-onboarding')).toContainText(
      'On request, through the onboarding contacts',
    );
    await registry.getByRole('link', { name: 'onboarding contacts' }).click();
    await expect(page.locator('#onboarding-contacts')).toBeInViewport();
    await expect(registry.getByTestId('registry-features')).not.toContainText('Revert');
    await expect(page.getByTestId('registry-contact')).not.toContainText('Technical contacts');
    await expect(
      page
        .getByTestId('registry-contact')
        .getByRole('link', { name: 'domain_connect_admin@domain.ionos.com' }),
    ).toHaveAttribute('href', 'mailto:domain_connect_admin@domain.ionos.com');
  });

  for (const id of [2, 3]) {
    test(`names the stack of several deployments (DNS provider ${id})`, async ({ page }) => {
      await page.goto(`dns-provider.html?id=${id}`);
      await expect(page.getByTestId('stack-link')).toHaveText('Plesk (plesk.com)');
      const heading = page.getByRole('heading', { name: 'Registry entry of stack Plesk' });
      await expect(heading).toBeVisible();
      await heading.getByRole('link', { name: 'Plesk' }).click();
      await expect(page).toHaveURL(/stack\.html\?id=plesk\.com$/);
    });
  }

  test('requests no registry entry without a stack', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (r) => {
      const url = r.url();
      // registry.json is the footer's; entries and logos are not requested.
      if (url.includes('/registry/') && !url.endsWith('/registry.json')) requested.push(url);
    });
    await page.goto('dns-provider.html?id=4');
    await expect(page.getByTestId('headline')).toBeVisible();
    await expect(page.getByTestId('registry')).toHaveCount(0);
    expect(requested).toEqual([]);
  });

  test.describe('registry 404s and failures', () => {
    // The browser logs the failed requests as console errors. DNS provider 6's stack has no
    // registry entry.
    test.use({ expectErrors: true });

    test('shows an unranked provider as unknown, not zero', async ({ page }) => {
      await page.goto('dns-provider.html?id=6');
      const rank = page.getByTestId('headline').locator('.stat-card', { hasText: 'Rank' });
      await expect(rank.locator('.stat-value')).toHaveText('–');
    });

    test('shows no registry section for a stack without an entry', async ({ page }) => {
      await page.goto('dns-provider.html?id=6');
      await expect(page.getByTestId('headline')).toBeVisible();
      await expect(page.getByTestId('registry')).toHaveCount(0);
    });

    test('shows a short error when the entry fails to load', async ({ page }) => {
      await page.route('**/registry/c/l/*.json', (route) => route.fulfill({ status: 500 }));
      await page.goto('dns-provider.html?id=1');
      await expect(page.getByTestId('registry')).toContainText('could not be loaded');
      await expect(page.getByTestId('headline')).toBeVisible();
    });

    test('shows the entry without a repository link when registry.json is missing', async ({
      page,
    }) => {
      await page.unroute('**/registry/registry.json');
      await page.goto('dns-provider.html?id=1');
      await expect(page.getByTestId('card-title').getByRole('img')).toBeVisible();
      await expect(page.getByRole('link', { name: /registry repository/ })).toHaveCount(0);
    });
  });

  test('fits every table to the screen at phone width', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'phone width only');
    await page.goto('dns-provider.html?id=1');
    await expect(page.getByTestId('headline')).toBeVisible();
    const templates = section(page, 'Supported templates (current state)');
    await expect(templates.locator('thead th:visible')).toHaveText([
      /SERVICE PROVIDER/,
      /TEMPLATE/,
      /SERVED/,
    ]);
    for (const wrapper of await page.locator('.table-wrapper').all()) {
      expect(await wrapper.evaluate((w) => w.scrollWidth - w.clientWidth)).toBeLessThanOrEqual(0);
    }
  });

  test('fits the screen without horizontal page scroll', async ({ page }) => {
    await page.goto('dns-provider.html?id=1');
    await expect(page.getByTestId('headline')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test.describe('before the scanner start date', () => {
    test('badges the dates before it and shades the sweep chart', async ({ page }) => {
      await page.goto('dns-provider.html?id=1');
      const templates = section(page, 'Supported templates (current state)');
      await expect(templates.getByText('First scan')).toHaveCount(3);
      await expect(templates.getByText('First scan').first()).toHaveAttribute(
        'title',
        /first scan on 01-07-2026\./,
      );
      await expect(page.getByTestId('headline')).toBeVisible();
      await expect(
        section(page, 'Supported templates over time').getByTestId('before-scans'),
      ).toBeVisible();
      await expect(section(page, 'Domain share over time').getByTestId('before-scans')).toHaveCount(
        0,
      );
    });

    test('marks nothing without scannerStartDate', async ({ page }) => {
      await page.route('**/config.js', (route) =>
        route.fulfill({ contentType: 'text/javascript', body: 'window.DC_STATS_CONFIG = {};' }),
      );
      await page.goto('dns-provider.html?id=1');
      await expect(page.getByTestId('headline')).toBeVisible();
      await expect(page.getByText('First scan')).toHaveCount(0);
      await expect(page.getByTestId('before-scans')).toHaveCount(0);
    });

    test('follows scannerStartDate from config.js', async ({ page }) => {
      await page.route('**/config.js', (route) =>
        route.fulfill({
          contentType: 'text/javascript',
          body: "window.DC_STATS_CONFIG = { scannerStartDate: '2026-05-01' };",
        }),
      );
      await page.goto('dns-provider.html?id=1');
      const templates = section(page, 'Supported templates (current state)');
      await expect(templates.getByText('First scan')).toHaveCount(2);
      await expect(templates.locator('tbody tr').first()).toContainText('01-07-2026');
      await expect(templates.getByText('First scan').first()).toHaveAttribute(
        'title',
        /first scan on 01-04-2026\./,
      );
    });
  });
});
