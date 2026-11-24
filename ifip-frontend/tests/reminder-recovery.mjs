import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import path from 'node:path';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let codeMode = 'timeout';
let savedJob;
let finishJob = false;
let posts = 0;
const applicants = [100, 101].map((n, i) => ({ _id: n.toString(16).padStart(24, '0'), fullName: `Fixture Applicant ${i + 1}`, email: `fixture${i}@example.invalid`, currentStep: 2, country: 'Nigeria', daysSinceActivity: 1, paymentAttempts: [], paymentAttemptsCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  const path = url.pathname;
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (path.includes('/api/v1/')) {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 });
    if (path.endsWith('/applicants/start')) {
      if (codeMode === 'timeout') { await new Promise(resolve => setTimeout(resolve, 17000)); return route.abort().catch(() => {}); }
      return json({ code: 'EMAIL_ALREADY_REGISTERED', message: 'Already registered.' }, 400);
    }
    if (path.endsWith('/applicants/verify-otp')) return json({ sessionToken: 'fixture', applicant: { email: 'fixture@example.invalid', currentStep: 2 } });
    if (path.endsWith('/registration-status')) return json({ hasActiveCohort: true, isFull: false, cohortName: 'Fixture' });
    if (path.endsWith('/registration-notice')) return json(null);
    if (path.endsWith('/levy-pricing')) return json({ NGN: 2500000, USD: 3500 });
    if (path.endsWith('/applications/me')) return json({ role: 'admin', fullName: 'Fixture Admin' });
    if (path.endsWith('/admin/cohorts')) return json([]);
    if (path.endsWith('/admin/pending-applicants')) return json({ applicants, total: 2, page: 1, pages: 1, summary: { totalPending: 2, distinctCountries: ['Nigeria'], stepBreakdown: { 2: 2 } } });
    if (path.endsWith('/reminder-jobs') && route.request().method() === 'POST') {
      const payload = route.request().postDataJSON(); posts++;
      savedJob = { jobId: payload.requestId, status: 'queued', total: 2, sentCount: 0, failCount: 0, skippedCount: 0, results: [], message: '0 accepted by provider · 0 failed · 0 skipped' };
      // Backend saved the job, but the enqueue response never reaches the UI.
      return route.abort('failed');
    }
    if (path.includes('/reminder-jobs/')) {
      if (!savedJob) return json({ message: 'Not found' }, 404);
      return json(finishJob ? { ...savedJob, status: 'completed', sentCount: 2, message: '2 accepted by provider · 0 failed · 0 skipped', results: applicants.map(a => ({ applicantId: a._id, status: 'accepted' })) } : savedJob);
    }
    if (path.includes('/form-options')) return json({});
    if (path.includes('/notifications')) return json([]);
    return json({});
  }
  if (path === '/api/geolocation') return json({ countryCode: 'NG' });
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.continue();
  return route.abort();
});
try {
  if (!process.env.IFIP_SKIP_REGISTRATION) {
  await page.goto('http://localhost:3000/apply');
  await page.getByLabel('Email address', { exact: true }).fill('fixture@example.invalid');
  await page.getByRole('button', { name: 'Send code', exact: false }).click();
  await page.getByText('Unable to confirm whether your code was sent.', { exact: false }).waitFor();
  assert.equal(await page.getByLabel('Verification code', { exact: true }).isVisible(), true);
  assert.equal(await page.getByRole('button', { name: /Resend code in/ }).getAttribute('aria-disabled'), 'true');
  if (process.env.IFIP_RECOVERY_CAPTURE_DIR) await page.screenshot({ path: path.join(process.env.IFIP_RECOVERY_CAPTURE_DIR, 'registration-timeout.png'), fullPage: true });
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify email', exact: false }).click();
  await page.getByLabel('Full legal name', { exact: true }).waitFor();
  console.log('PASS: actual 15-second timeout permits code entry and successful verification.');
  await page.evaluate(() => localStorage.clear());
  codeMode = 'rejected';
  await page.goto('http://localhost:3000/apply');
  await page.getByLabel('Email address', { exact: true }).fill('fixture@example.invalid');
  await page.getByRole('button', { name: 'Send code', exact: false }).click();
  await page.getByText('Already registered.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Verification code', { exact: true }).count(), 0);
  console.log('PASS: a confirmed rejection keeps the email form and does not claim a code was sent.');
  } else await page.goto('http://localhost:3000/robots.txt');
  await page.evaluate(() => {
    localStorage.clear();
    const token = btoa(JSON.stringify({ alg: 'none' })) + '.' + btoa(JSON.stringify({ sub: 'fixture-admin', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })) + '.fixture';
    localStorage.setItem('accessToken', token);
  });
  await page.goto('http://localhost:3000/admin/applications?view=pending');
  await page.getByLabel('Select all applicants on this page').check();
  await page.getByRole('button', { name: /Send Bulk Email/ }).click();
  await page.getByRole('button', { name: 'Send reminder (2)', exact: true }).click();
  await page.getByText('Unable to confirm submission.', { exact: false }).or(page.getByText('The send request is saved.', { exact: false })).first().waitFor();
  await page.reload();
  await page.getByRole('region', { name: 'Reminder sending progress' }).waitFor();
  await page.getByText('Waiting to start.', { exact: false }).waitFor();
  assert.equal(posts, 1);
  finishJob = true;
  await page.getByText('Reminder processing complete', { exact: true }).waitFor();
  assert.equal(posts, 1);
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await page.getByRole('button', { name: 'Refresh applicants and dismiss' }).isVisible(), true);
  if (process.env.IFIP_RECOVERY_CAPTURE_DIR) await page.screenshot({ path: path.join(process.env.IFIP_RECOVERY_CAPTURE_DIR, 'reminder-progress-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Refresh applicants and dismiss' }).click();
  assert.equal(await page.getByRole('region', { name: 'Reminder sending progress' }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: lost enqueue response recovered after reload, polling completes, one submission only, mobile dismissal, no page errors.');
} catch (failure) {
  console.error('Browser diagnostics:', page.url(), errors);
  throw failure;
} finally { await browser.close(); }
