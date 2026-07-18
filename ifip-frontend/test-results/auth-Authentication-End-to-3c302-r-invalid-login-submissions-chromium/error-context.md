# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication End-to-End Suite >> should display errors for invalid login submissions
- Location: tests\auth.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Invalid credentials. Please try again.')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Invalid credentials. Please try again.')

```

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- main:
  - link "IFIP Logo":
    - /url: /
    - img "IFIP Logo"
  - navigation:
    - link "Curriculum":
      - /url: /#curriculum
    - link "Process":
      - /url: /#process
    - link "Partners":
      - /url: /#partners
    - link "FAQ":
      - /url: /#faq
  - link "Login":
    - /url: /login
  - link "Apply Now":
    - /url: /apply
  - main:
    - img "IFIP"
    - heading "Program Platform" [level=1]
    - paragraph: Islamic Finance Prep & Placement
    - alert: ⚠️ Incorrect credentials.
    - text: Email Address
    - textbox "Email Address" [invalid]:
      - /placeholder: e.g. your.email@example.com
      - text: notrealuser@ifip.org
    - text: Password
    - link "Forgot Password?":
      - /url: /forgot-password
    - textbox "Password" [invalid]:
      - /placeholder: ••••••••
      - text: wrongpassword
    - button "Show password"
    - checkbox "Remember me"
    - text: Remember me
    - button "Login to Dashboard"
    - paragraph: Not applied yet?
    - link "Start Your Application Here":
      - /url: /apply
    - paragraph: Secure Institutional Gateway
  - img "IFIP Logo"
  - paragraph: The Islamic Finance Internship Program (IFIP) develops industry-ready talent through professional training, practical simulations, and structured internship placement across the ethical finance ecosystem.
  - link "Social Share":
    - /url: "#"
  - link "Website":
    - /url: https://ifip.nextif.org
  - heading "Program" [level=4]
  - list:
    - listitem:
      - link "Curriculum":
        - /url: /#curriculum
    - listitem:
      - link "Placement Partners":
        - /url: /#partners
    - listitem:
      - link "Program FAQs":
        - /url: /#faq
  - heading "Legal & Inquiries" [level=4]
  - list:
    - listitem:
      - link "Terms of Service":
        - /url: "#"
    - listitem:
      - link "Privacy Policy":
        - /url: "#"
    - listitem:
      - link "Contact Support":
        - /url: "#"
    - listitem:
      - link "Shariah Compliance":
        - /url: "#"
  - text: "© 2026 IFIP. All rights reserved. Ethical Finance Education. Headquarters: Financial District, Abuja"
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Authentication End-to-End Suite', () => {
  4  |   test('should display errors for invalid login submissions', async ({ page }) => {
  5  |     // Intercept using callback matcher to ensure 100% match reliability regardless of port/protocol
  6  |     await page.route(url => url.href.includes('/auth/login'), async (route) => {
  7  |       await route.fulfill({
  8  |         status: 400,
  9  |         contentType: 'application/json',
  10 |         body: JSON.stringify({ message: 'Invalid credentials. Please try again.' }),
  11 |       });
  12 |     });
  13 | 
  14 |     await page.goto('/login');
  15 |     await page.fill('input[type="email"]', 'notrealuser@ifip.org');
  16 |     await page.fill('input[type="password"]', 'wrongpassword');
  17 |     await page.click('button[type="submit"]');
  18 | 
  19 |     // Check for error text matching the mocked response message
  20 |     const errorMessage = page.locator('text=Invalid credentials. Please try again.');
> 21 |     await expect(errorMessage).toBeVisible();
     |                                ^ Error: expect(locator).toBeVisible() failed
  22 |   });
  23 | 
  24 |   test('should render email request fields on forgot password page', async ({ page }) => {
  25 |     await page.goto('/forgot-password');
  26 |     const emailInput = page.locator('input[type="email"]');
  27 |     await expect(emailInput).toBeVisible();
  28 |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  29 |   });
  30 | });
  31 | 
```