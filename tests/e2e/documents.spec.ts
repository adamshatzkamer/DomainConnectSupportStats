import { expect, test } from './fixtures';

for (const [name, heading, link] of [
  ['privacy', 'Privacy', 'privacy-link'],
  ['imprint', 'Imprint', 'imprint-link'],
] as const) {
  test.describe(`${heading} (${name}.html)`, () => {
    test('shows its document, without data annotation', async ({ page }) => {
      await page.goto(`${name}.html`);
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
      await expect(page.getByTestId('data-annotation')).toHaveCount(0);
    });

    test('is linked from the footer', async ({ page }) => {
      await page.goto('index.html');
      await page.getByTestId(link).click();
      await expect(page).toHaveURL(new RegExp(`${name}\\.html$`));
    });
  });
}

test('privacy names the analytics service and links the imprint', async ({ page }) => {
  await page.goto('privacy.html');
  await expect(page.getByRole('link', { name: 'GoatCounter' })).toHaveAttribute(
    'href',
    'https://www.goatcounter.com/help/privacy',
  );
  await page.getByRole('main').getByRole('link', { name: 'imprint' }).first().click();
  await expect(page).toHaveURL(/imprint\.html$/);
});
