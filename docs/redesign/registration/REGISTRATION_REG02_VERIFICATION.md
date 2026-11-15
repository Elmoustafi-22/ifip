# REG-02 email verification and resume

Implemented and verified locally on 13 November 2026. The changes are in [ApplyPage](../../../ifip-frontend/app/apply/page.tsx) and the [resume redirect](../../../ifip-frontend/app/apply/resume/page.tsx).

- Email verification shows separate send, resend and verify states, with an accessible code input and feedback. The existing 60-second resend cooldown and server rate limits still apply. Changing the email does not bypass the cooldown.
- Resume distinguishes invalid links, expired sessions and retryable failures. Successful email verification and both resume paths use the same saved-draft restoration. A verified draft at step 1 resumes at profile. A late location response cannot overwrite saved or selected residence and dialing values.
- Paid-draft UI uses the restored applicant record. The payment return query is still accepted as a navigation hint. API endpoints, payloads, payment processing and backend rules remain in place.

## Local verification

- Frontend TypeScript no-emit check passed.
- Targeted ESLint reported 18 existing errors and 20 warnings for ApplyPage, down from the recorded 26 errors and 23 warnings. The resume redirect reported zero. The changed restoration and verification handlers introduced no diagnostics.
- All 32 isolated Chromium scenarios passed. They covered the REG-01B availability and waitlist cases plus invalid/expired codes, service and network failures, throttling, an existing account, resend and duplicate-submit prevention, OTP handoff and reload, valid/invalid resume links, 401/404 sessions, offline retry, saved values taking precedence over geolocation, and keyboard focus.
- Requests were intercepted or blocked outside the local frontend. Real email delivery, provider behavior and persisted session integration remain unverified under REG-00.

Verification-code screen captures use synthetic data. [320 px](verification/reg-02/otp-320.png) · [375 px](verification/reg-02/otp-375.png) · [768 px](verification/reg-02/otp-768.png) · [1280 px](verification/reg-02/otp-1280.png)
