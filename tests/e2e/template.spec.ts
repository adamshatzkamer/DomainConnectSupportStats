import { resolve } from 'node:path';
import { expect, test } from './fixtures';

const CARD = 'template.html?spid=exampleservice.domainconnect.org&sid=template1';
const LOGO = resolve(import.meta.dirname, '../../public/assets/DomainConnectBlackSmall.png');

function section(page: import('@playwright/test').Page, heading: string | RegExp) {
  return page.locator('section', { has: page.getByRole('heading', { name: heading }) });
}

test.describe('Template card (template.html)', () => {
  // Template logos load from the service provider's host; the example hosts do not exist.
  test.beforeEach(async ({ page }) => {
    await page.route('https://*/logo.png', (route) => route.fulfill({ path: LOGO }));
  });

  test('shows the template, its service provider and its reach', async ({ page }) => {
    await page.goto(CARD);
    const title = page.getByTestId('card-title');
    await expect(title).toContainText('Example Website');
    await expect(title).toContainText('exampleservice.domainconnect.org / template1');
    await expect(page).toHaveTitle(/^Example Website - Template/);
    await expect(page.getByTestId('service-provider-link')).toHaveText('Example Service');
    const headline = page.getByTestId('headline');
    await expect(headline).toContainText(
      /4\s*Supporting DNS providers\s*100.0% of 4 with at least 1 template/,
    );
    await expect(headline).not.toContainText('7,150');
    await expect(
      headline.getByTitle('7,150 of 12K scanned domains in the partial scan of 01-06-2026'),
    ).toHaveText('59.6%');
    await expect(headline).toContainText(/2\s*Version\s*2 of 4 supporters serve it/);
    const about = page.getByTestId('template-record');
    await expect(about).toContainText('Now with a www CNAME.');
    await expect(about).toContainText('%ip%: the target address');
  });

  test('shows the logo from logo_url', async ({ page }) => {
    await page.goto(CARD);
    const logo = page.getByTestId('card-title').getByRole('img', { name: 'Example Website' });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('src', 'https://exampleservice.domainconnect.org/logo.png');
    await expect(logo).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  test('links supporters to their DNS provider and stack cards, with a total', async ({ page }) => {
    await page.goto(CARD);
    const supporters = section(page, 'Supporting DNS providers (current state)');
    await expect(supporters.locator('tbody tr')).toHaveCount(4);
    await expect(supporters.locator('tfoot')).toContainText('TOTAL');
    await expect(supporters.locator('tfoot')).toContainText('59.6%');
    await expect(supporters.locator('thead')).toContainText(/supported since/i);
    await expect(supporters.getByTestId('since-caveat')).toContainText('first saw');
    const ionos = supporters.locator('tbody tr', { hasText: 'IONOS' });
    await expect(ionos.getByText('First scan')).toHaveAttribute('title', /02-06-2026/);
    // The stack column is hidden at phone width.
    await expect(supporters.locator('a[href="./stack.html?id=ionos.com"]')).toHaveCount(1);
    await supporters.getByRole('link', { name: 'Cloudflare', exact: true }).click();
    await expect(page).toHaveURL(/dns-provider\.html\?id=1$/);
  });

  test('links the service provider card', async ({ page }) => {
    await page.goto(CARD);
    await page.getByTestId('service-provider-link').click();
    await expect(page).toHaveURL(/service-provider\.html\?id=exampleservice\.domainconnect\.org$/);
  });

  test('shows records as type, host and their other fields verbatim', async ({ page }) => {
    await page.goto('template.html?spid=unnamed.example&sid=x');
    const records = section(page, 'Records');
    await expect(records.locator('thead th')).toHaveText([/type/i, /host/i, /details/i]);
    const row = records.locator('tbody tr').first();
    await expect(row).toContainText('SRV');
    await expect(row).toContainText(/port:\s*5060/);
    await expect(row).toContainText(/target:\s*sip\.unnamed\.example/);
  });

  test('shows groupId and ttl in their own columns on wide screens only', async ({
    page,
  }, testInfo) => {
    await page.goto('template.html?spid=mail.acme.example&sid=mail');
    const records = section(page, 'Records');
    const txt = records.locator('tbody tr').nth(2);
    if (testInfo.project.name === 'mobile') {
      await expect(records.locator('thead th:visible')).toHaveText([/type/i, /host/i, /details/i]);
      await expect(txt.locator('td:visible').last()).toContainText(/ttl:\s*300/);
    } else {
      await expect(records.locator('thead th')).toHaveText([
        /type/i,
        /host/i,
        /groupId/i,
        /ttl/i,
        /details/i,
      ]);
      await expect(txt.locator('td').nth(3)).toHaveText('300');
      await expect(txt.locator('td').last().locator('div', { hasText: 'ttl:' })).toBeHidden();
      await expect(txt.locator('td').last()).toContainText(/data:\s*acme-verification/);
    }
  });

  test('leaves unknown record fields out', async ({ page }) => {
    await page.goto('template.html?spid=mail.acme.example&sid=mail');
    const mx = section(page, 'Records').locator('tbody tr').first();
    await expect(mx).toContainText(/priority:\s*10/);
    await expect(mx).not.toContainText('data');
    await expect(mx).not.toContainText('spfRules');
  });

  test('shows what each supporter serves, and the counts', async ({ page }) => {
    await page.goto(CARD);
    const supporters = section(page, 'Supporting DNS providers (current state)');
    const cloudflare = supporters.locator('tbody tr', { hasText: 'Cloudflare' });
    await expect(
      cloudflare.getByTitle(/repository version 2, response template, match match/),
    ).toHaveText(/^\s*2\s*$/);
    await expect(
      supporters.locator('tbody tr', { hasText: 'IONOS' }).getByTitle(/response version/),
    ).toHaveText(/^\s*2\s*$/);
    await expect(supporters.locator('.badge', { hasText: 'Outdated' })).toHaveCount(1);
    await expect(supporters.getByTitle('Not recorded yet').first()).toHaveText(/^\s*–\s*$/);
    const served = page.getByTestId('served');
    await expect(served).toContainText(/Current version\s*2\s*\(50.0% of 4 supporters\)/);
    await expect(served).toContainText(/Outdated\s*1\s*\(25.0% of 4 supporters\)/);
  });

  test('draws supporters over time with the caveat when the history differs', async ({ page }) => {
    await page.route(
      '**/data/templates/exampleservice.domainconnect.org/template1.json',
      async (route) => {
        const file = await (await route.fetch()).json();
        const history = file.tables['exampleservice.domainconnect.org/template1/history'];
        history.rows.at(-1).supporting_providers = 5;
        await route.fulfill({ json: file });
      },
    );
    await page.goto(CARD);
    const chart = section(page, 'Supporting DNS providers over time');
    await expect(
      page.getByRole('img', { name: 'Supporting DNS providers over time' }),
    ).toBeVisible();
    await expect(chart.locator('table')).toHaveCount(0);
    await expect(page.getByTestId('history-caveat')).toContainText('counts 5 DNS providers');
    await expect(page.getByTestId('history-caveat')).toContainText('latest probes 4');
  });

  test('shows a template without name, logo or supporters', async ({ page }) => {
    await page.goto('template.html?spid=unnamed.example&sid=x');
    const title = page.getByTestId('card-title');
    await expect(title).toContainText('Unnamed template');
    await expect(title.getByRole('img')).toHaveCount(0);
    await expect(page.getByTestId('service-provider-link')).toHaveText('unnamed.example');
    await expect(page.getByTestId('history-caveat')).toHaveCount(0);
    await expect(section(page, 'Supporting DNS providers (current state)')).toContainText(
      'No DNS provider supports it',
    );
    await expect(page.getByTestId('template-record')).toContainText('–');
  });

  test('orders the card: title, headline, about, history, supporters, records, notes', async ({
    page,
  }) => {
    await page.goto(CARD);
    const blocks = [
      page.getByTestId('card-title'),
      page.getByTestId('headline'),
      section(page, 'About'),
      section(page, 'Supporting DNS providers over time'),
      section(page, 'Supporting DNS providers (current state)'),
      section(page, 'Records'),
      section(page, 'Notes'),
    ];
    for (const block of blocks) await expect(block).toBeVisible();
    // The logo and the chart change the layout as they load.
    await expect(page.getByTestId('card-title').getByRole('img')).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Supporting DNS providers over time' }),
    ).toBeVisible();
    const ys = await Promise.all(blocks.map(async (b) => (await b.boundingBox())!.y));
    expect(ys).toEqual([...ys].sort((x, y) => x - y));
  });

  for (const query of ['', '?spid=mail.acme.example', '?sid=mail', '?spid=&sid=mail']) {
    test(`shows "not found" for template.html${query}`, async ({ page }) => {
      await page.goto(`template.html${query}`);
      const notFound = page.getByTestId('not-found');
      await expect(notFound).toBeVisible();
      await notFound.getByRole('link', { name: /Templates/ }).click();
      await expect(page).toHaveURL(/templates\.html$/);
    });
  }

  test.describe('failures', () => {
    // The browser logs the failed requests as console errors.
    test.use({ expectErrors: true });

    test('shows "not found" for a template without a card', async ({ page, consoleErrors }) => {
      await page.goto('template.html?spid=mail.acme.example&sid=nope');
      await expect(page.getByTestId('not-found')).toContainText('This template');
      expect(consoleErrors.every((e) => e.includes('404'))).toBe(true);
    });

    test('hides a logo that fails to load', async ({ page }) => {
      await page.route('https://*/logo.png', (route) => route.fulfill({ status: 404 }));
      await page.goto(CARD);
      await expect(page.getByTestId('headline')).toBeVisible();
      await expect(page.getByTestId('card-title').getByRole('img')).toHaveCount(0);
    });
  });

  test('fits the screen without horizontal scroll at phone width', async ({ page }, testInfo) => {
    await page.goto('template.html?spid=mail.acme.example&sid=mail');
    await expect(page.getByTestId('headline')).toBeVisible();
    if (testInfo.project.name === 'mobile') {
      await expect(
        section(page, 'Supporting DNS providers (current state)').locator('thead th:visible'),
      ).toHaveText([/NAME/, /VERSION/, /SUPPORTED SINCE/, /REACH/]);
    }
    for (const wrapper of await page.locator('.table-wrapper').all()) {
      expect(await wrapper.evaluate((w) => w.scrollWidth - w.clientWidth)).toBeLessThanOrEqual(0);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
