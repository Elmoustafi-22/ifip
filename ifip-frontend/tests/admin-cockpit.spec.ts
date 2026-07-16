import { test, expect } from '@playwright/test';

test.describe('Admin Workspace Dashboard Widgets', () => {
  test('should display primary registration screen on apply page', async ({ page }) => {
    // Intercept cohort registration-status endpoint with CORS headers to satisfy cross-origin preflight requests
    await page.route(url => url.href.includes('/cohort/registration-status'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({
          status: 'open',
          cohortName: 'Cohort 1',
          registrationStartDate: new Date().toISOString(),
          registrationEndDate: new Date(Date.now() + 864000000).toISOString(),
          cap: 100,
          count: 20,
          hasActiveCohort: true,
          isFull: false
        }),
      });
    });

    // Intercept geolocation API
    await page.route(url => url.href.includes('/api/geolocation'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ countryCode: 'NG' }),
      });
    });

    await page.goto('/apply');
    
    // Check if the Step 1 header "Verify Your Email" is visible
    const registerHeader = page.locator('text=Verify Your Email');
    await expect(registerHeader).toBeVisible();

    // Verify presence of input field and Send Code button
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const sendButton = page.locator('button:has-text("Send Code")');
    await expect(sendButton).toBeVisible();
  });
});
