import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from '@playwright/test';

const base = 'http://127.0.0.1:3109';
const id = '507f1f77bcf86cd799439011';
const reference = 'IFIP-fixture-reference';
let verified = false;
let checks = 0;

const payment = () => ({
  _id: id, applicantId: '507f1f77bcf86cd799439012', paymentCohortId: null,
  provider: 'paystack', providerRef: reference, amount: 2500000, currency: 'NGN',
  type: 'commitment_levy', status: verified ? 'success' : 'pending', webhookVerified: false,
  createdAt: '2026-11-26T10:04:00.000Z', updatedAt: '2026-11-26T10:04:00.000Z',
  ...(verified ? {
    paystackVerification: { status: 'success', reference, requested_amount: 2500000, currency: 'NGN' },
    applicationId: { _id: '507f1f77bcf86cd799439013', fullName: 'Fixture Participant', status: 'active', submittedAt: '2026-11-26T10:05:00.000Z', userId: { email: 'participant@example.invalid' } },
    handoff: { enrolled: true, account: 'setup_required', setupEmail: 'queued' },
  } : { handoff: { enrolled: false, account: 'unknown', setupEmail: 'unknown' } }),
});

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 1280]) {
    verified = false;
    const context = await browser.newContext({ viewport: { width, height: 850 } });
    await context.addInitScript(() => localStorage.setItem('accessToken', 'fixture-admin-token'));
    await context.route('http://127.0.0.1:59999/api/v1/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace('/api/v1', '');
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json',
        headers: { 'access-control-allow-origin': base, 'access-control-allow-credentials': 'true' }, body: JSON.stringify(body) });
      if (request.method() === 'OPTIONS') return json({});
      if (path === '/applications/me') return json({ role: 'admin', fullName: 'Fixture Admin' });
      if (path === '/admin/cohorts') return json([]);
      if (path === '/admin/payments' && request.method() === 'GET') return json({ payments: [payment()], total: 1, page: 1, pages: 1,
        summary: { pending: verified ? 0 : 1, success: verified ? 1 : 0, failed: 0, totalRevenue: verified ? 2500000 : 0, revenueByCurrency: [] } });
      if (path === `/admin/payments/${id}` && request.method() === 'GET') return json(payment());
      if (path === `/admin/payments/${id}/verify-paystack` && request.method() === 'POST') {
        assert.equal(JSON.parse(request.postData()).expectedCohortId, 'unassigned');
        checks++;
        verified = true;
        return json({ status: 'success' });
      }
      return json([]);
    });
    const page = await context.newPage();
    await page.goto(`${base}/admin/payments?payment=${id}`);
    await page.getByRole('button', { name: 'Verify with Paystack' }).waitFor({ timeout: 12000 }).catch(async error => {
      console.error('Page:', (await page.locator('body').innerText()).slice(0, 1600));
      throw error;
    });
    if (process.env.IFIP_PAYMENT_CAPTURE_DIR) {
      await page.screenshot({ path: path.join(process.env.IFIP_PAYMENT_CAPTURE_DIR, `admin-payment-pending-${width}.png`), fullPage: true });
    }
    await page.getByRole('button', { name: 'Verify with Paystack' }).click();
    await page.getByText('Payment confirmed and application linked.').waitFor();
    await page.getByText('Application: Linked').waitFor();
    await page.getByText('Accepted by email provider; delivery not confirmed', { exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Verify with Paystack' }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    if (process.env.IFIP_PAYMENT_CAPTURE_DIR) {
      await page.screenshot({ path: path.join(process.env.IFIP_PAYMENT_CAPTURE_DIR, `admin-payment-recovery-${width}.png`), fullPage: true });
    }
    await context.close();
  }
  assert.equal(checks, 2);
  console.log('PASS admin Paystack recovery at 375 and 1280 CSS px');
} finally {
  await browser.close();
}
