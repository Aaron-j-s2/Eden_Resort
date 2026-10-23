import { expect, test } from '@playwright/test';

const PAGES = ['/', '/about', '/stay', '/stay/sample-cottage', '/experiences', '/gallery', '/contact', '/book', '/booking/find', '/privacy'];

for (const path of PAGES) {
  test(`${path} has no horizontal overflow or runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test('mobile menu opens and navigates', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: /Gallery/ }).click();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Photographs');
});

test('gallery lightbox supports keyboard navigation', async ({ page }) => {
  await page.goto('/gallery');
  await page.getByRole('button', { name: /View larger/ }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/^1 \//)).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByText(/^2 \//)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
