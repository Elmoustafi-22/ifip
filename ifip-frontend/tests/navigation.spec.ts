import { test, expect } from '@playwright/test';

test.describe('Workspace Navigation Spec', () => {
  test('should redirect unauthenticated candidates to login', async ({ page }) => {
    await page.goto('/dashboard');
    // Direct link to dashboard without session cookie should redirect back to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect unauthenticated admin routes to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*login/);
  });
});
