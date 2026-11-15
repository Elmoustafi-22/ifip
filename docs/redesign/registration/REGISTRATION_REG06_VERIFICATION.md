# REG-06 payment verification, recovery and confirmation

Implemented locally on 13 November 2026 in [VerifyPaymentPage](../../../ifip-frontend/app/verify-payment/page.tsx), [ApplyPage](../../../ifip-frontend/app/apply/page.tsx), and the existing [payment status helper](../../../ifip-frontend/lib/api/services.ts) and [API client](../../../ifip-frontend/lib/api/client.ts). The verification screen distinguishes confirmed payment, confirmed failure, provider cancellation or failure, missing or rejected credentials, a missing payment record, pending and connectivity problems. Pending or offline retries check the same payment. The verifier sends one request at a time and cancels timers and in-flight browser requests on exit. A polling-token 401 preserves the separate applicant session.

Confirmed payment displays the existing setup link or paid-draft continuation. The application return URL is a routing hint. The paid-draft controls require the restored applicant’s server-reported paid state. If that draft cannot be restored, applicants get email and support recovery. The confirmation screen distinguishes successful submission from a waiver response without a setup token. Password setup itself remains in REG-07.

## Local checks

- `node .\node_modules\typescript\bin\tsc --noEmit --incremental false` passed.
- Targeted ESLint on the four changed source files reported zero diagnostics for `/verify-payment`, down from two errors and one warning. Remaining diagnostics on the three other files match their baselines.
- Eighteen REG-06 intercepted Chromium scenarios passed across two runs. They covered callback aliases, immediate and delayed success, setup token encoding and navigation, paid-draft submission, cancelled and failed outcomes, missing and rejected credentials, retained applicant sessions, pending and offline retries, a newer checkout in another tab, navigation and late responses, reload, and unavailable paid drafts.
- All 15 REG-05 regression scenarios passed, including duplicate activation guards, hosted handoff, paid-draft submission, and both waiver responses.
- Browser fixtures blocked real provider and API requests. Provider callbacks, webhook overlap, real persistence and account creation remain open under REG-00. The production build and live screen-reader session were outside this run.

## Screenshots

| Screen | 320 px | 375 px | 768 px | 1280 px |
| --- | --- | --- | --- | --- |
| Payment confirmed | [320](verification/reg-06/confirmed-320.png) | [375](verification/reg-06/confirmed-375.png) | [768](verification/reg-06/confirmed-768.png) | [1280](verification/reg-06/confirmed-1280.png) |
| Payment pending | [320](verification/reg-06/pending-320.png) | [375](verification/reg-06/pending-375.png) | [768](verification/reg-06/pending-768.png) | [1280](verification/reg-06/pending-1280.png) |
| Application submitted | | [375](verification/reg-06/submitted-no-setup-375.png) | | |
| Waiver without setup link | | [375](verification/reg-06/waived-375.png) | | |
