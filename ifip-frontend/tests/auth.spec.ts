import { test, expect } from '@playwright/test';

test.describe('Authentication End-to-End Suite', () => {
  test('should display errors for invalid login submissions', async ({ page }) => {
    // Intercept using callback matcher to ensure 100% match reliability regardless of port/protocol
    await page.route(url => url.href.includes('/auth/login'), async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials. Please try again.' }),
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'notrealuser@ifip.org');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Check for error text matching the mocked response message
    const errorMessage = page.locator('text=Invalid credentials. Please try again.');
    await expect(errorMessage).toBeVisible();
  });

  test('should render email request fields on forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
