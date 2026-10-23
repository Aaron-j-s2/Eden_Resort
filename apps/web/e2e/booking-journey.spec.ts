import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN } from './support';

const guest = {
  name: `E2E Guest ${Date.now().toString(36)}`,
  phone: `9${String(Math.floor(100_000_000 + Math.random() * 899_999_999))}`,
  email: 'e2e.guest@example.com',
};

async function pickDates(page: Page, monthsAhead: number, fromDay: number, toDay: number) {
  await page.getByRole('button', { name: /Arrive — Depart/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Your dates' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < monthsAhead; i++) await dialog.getByRole('button', { name: /next month/i }).click();
  const day = (d: number) => dialog.locator('.rdp-month').first().locator('button.rdp-day_button', { hasText: new RegExp(`^${d}$`) });
  await day(fromDay).click();
  await day(toDay).click();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();
}

test.describe.serial('guest books, staff manages', () => {
  let reference = '';
  let confirmationUrl = '';

  test('guest browses the site and submits a reservation request', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => consoleErrors.push(String(e)));

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Find Your Quiet');
    await expect(page.getByText('Eden Falls Resort').first()).toBeVisible();

    await page.getByRole('link', { name: /Explore the Stay/i }).click();
    await expect(page).toHaveURL(/\/stay$/);
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();

    await page.getByRole('link', { name: 'Check availability' }).first().click();
    await expect(page).toHaveURL(/\/book\?room=/);
    await expect(page.getByRole('heading', { name: 'When would you like to stay?' })).toBeVisible();

    const months = 3 + Math.floor(Math.random() * 6);
    const from = 3 + Math.floor(Math.random() * 20);
    await pickDates(page, months, from, from + 2);
    await page.getByRole('button', { name: 'Check availability' }).click();

    await expect(page.getByRole('heading', { name: 'Choose your room' })).toBeVisible();
    await expect(page.getByText(/2 nights/).first()).toBeVisible();
    await page.getByRole('button', { name: 'Select' }).first().click();

    await expect(page.getByRole('heading', { name: 'Your details' })).toBeVisible();
    // Validation: submitting empty shows errors.
    await page.getByRole('button', { name: 'Review request' }).click();
    await expect(page.getByText('Please enter your full name')).toBeVisible();

    await page.getByLabel(/Full name/).fill(guest.name);
    await page.getByLabel(/^Phone/).fill(guest.phone);
    await page.getByLabel(/^Email/).fill(guest.email);
    await page.getByLabel(/Special requests/).fill('Arriving around 4pm');
    await page.getByRole('button', { name: 'Review request' }).click();

    await expect(page.getByRole('heading', { name: 'Review & send' })).toBeVisible();
    await expect(page.getByText('This is a reservation request.')).toBeVisible();
    await page.getByRole('button', { name: 'Send reservation request' }).click();

    await expect(page).toHaveURL(/\/booking\/confirmation\/EF-/);
    reference = (await page.getByTestId('booking-reference').textContent())!.trim();
    expect(reference).toMatch(/^EF-[A-Z2-9]{8}$/);
    await expect(page.getByText('Pay at resort')).toBeVisible();
    await expect(page.getByRole('link', { name: /Call/ }).first()).toHaveAttribute('href', /^tel:/);
    confirmationUrl = page.url();
    expect(consoleErrors).toEqual([]);
  });

  test('admin routes are protected', async ({ page }) => {
    await page.goto('/admin/bookings');
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();
  });

  test('staff finds the booking, sees guest details and confirms it', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(E2E_ADMIN.email);
    await page.getByLabel('Password').fill(E2E_ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

    await page.getByRole('link', { name: 'Bookings' }).first().click();
    await page.getByPlaceholder('Reference, guest name or phone').fill(reference);
    await page.getByRole('link', { name: reference }).click();

    await expect(page.getByRole('heading', { name: guest.name })).toBeVisible();
    await expect(page.getByText(`+91${guest.phone}`).first()).toBeVisible();
    await expect(page.getByText(guest.email).first()).toBeVisible();
    await expect(page.getByText('Arriving around 4pm')).toBeVisible();

    await page.getByRole('button', { name: 'Confirm booking' }).click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByLabel(/Note for the history/).fill('Called guest — confirmed');
    await dialog.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Confirmed', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('“Called guest — confirmed”')).toBeVisible();

    await page.getByPlaceholder(/Internal note/).fill('Prefers a quiet cottage');
    await page.getByRole('button', { name: 'Add note' }).click();
    await expect(page.getByText('Prefers a quiet cottage')).toBeVisible();
  });

  test('the guest sees the new status, then staff cancel to release the room', async ({ page }) => {
    await page.goto(confirmationUrl);
    await expect(page.getByText('Your stay is confirmed.', { exact: false })).toBeVisible();

    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(E2E_ADMIN.email);
    await page.getByLabel('Password').fill(E2E_ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await page.goto(`/admin/bookings?q=${reference}`);
    await page.getByRole('link', { name: reference }).click();
    await page.getByRole('button', { name: 'Cancel booking' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel booking' }).click();
    await expect(page.getByText('No further status changes are possible.')).toBeVisible();

    await page.goto('/booking/find');
    await page.getByLabel(/Booking reference/).fill(reference);
    await page.getByLabel(/Phone used to book/).fill(guest.phone);
    await page.getByRole('button', { name: 'Find booking' }).click();
    await expect(page.getByText('This reservation has been cancelled.', { exact: false })).toBeVisible();
  });
});

test('contact form saves an enquiry', async ({ page }) => {
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(page.getByText('Please accept the privacy notice so we can reply')).toBeVisible();
  await page.getByLabel(/Your name/).fill('E2E Enquirer');
  await page.getByLabel(/^Phone/).fill('9876501234');
  await page.getByLabel(/^Message/).fill('Do you have space for a family of six in January?');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(page.getByText("Thank you — we've received your message.")).toBeVisible();
});

test('unknown pages show a helpful 404', async ({ page }) => {
  await page.goto('/this-does-not-exist');
  await expect(page.getByRole('heading', { name: /This path leads/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Accommodation/ }).last()).toBeVisible();
});
