# REG-00 registration baseline

11 November 2026 · `main` at `fd239ea` · **Partial verification. REG-00 remains open.** The [registration audit](REGISTRATION_AUDIT.md) contains the full source trace, endpoint contracts, persistence and transitions. This report records what ran against the current checkout.

## Rendered evidence

Playwright Chromium opened the existing Next.js frontend at `http://localhost:3000`. The frontend API URL was overridden to an isolated loopback address with no backend. The screenshot browser allowed only read requests to the local frontend and isolated loopback and blocked third-party requests. The browser used a clean context, a 900 CSS px viewport height, reduced motion and no account credentials. Screenshots contain no submitted form values, account data or tokens. The small Next.js development badge is local tooling.

| Route | Actual state captured | Widths in CSS px |
| --- | --- | --- |
| `/apply` | Email entry after the availability request failed | [320](baseline/reg-00/apply-320.png) · [375](baseline/reg-00/apply-375.png) · [768](baseline/reg-00/apply-768.png) · [1280](baseline/reg-00/apply-1280.png) |
| `/verify-payment` | Missing payment reference or session token | [320](baseline/reg-00/verify-payment-320.png) · [375](baseline/reg-00/verify-payment-375.png) · [768](baseline/reg-00/verify-payment-768.png) · [1280](baseline/reg-00/verify-payment-1280.png) |
| `/set-password` | Missing setup link | [320](baseline/reg-00/set-password-missing-link-320.png) · [375](baseline/reg-00/set-password-missing-link-375.png) · [768](baseline/reg-00/set-password-missing-link-768.png) · [1280](baseline/reg-00/set-password-missing-link-1280.png) |
| `/login` | Signed-out login form | [320](baseline/reg-00/login-320.png) · [375](baseline/reg-00/login-375.png) · [768](baseline/reg-00/login-768.png) · [1280](baseline/reg-00/login-1280.png) |
| `/forgot-password` | Email request form before submission | [320](baseline/reg-00/forgot-password-320.png) · [375](baseline/reg-00/forgot-password-375.png) · [768](baseline/reg-00/forgot-password-768.png) · [1280](baseline/reg-00/forgot-password-1280.png) |
| `/reset-password` | Missing reset link | [320](baseline/reg-00/reset-password-missing-link-320.png) · [375](baseline/reg-00/reset-password-missing-link-375.png) · [768](baseline/reg-00/reset-password-missing-link-768.png) · [1280](baseline/reg-00/reset-password-missing-link-1280.png) |

All 24 captures returned HTTP 200 for the page and showed the expected state. Document scroll width matched viewport width in each capture. That check establishes no page-wide horizontal overflow for these states and widths. It does not cover 200% zoom, the mobile keyboard, authenticated layouts, or complete keyboard and screen-reader operation. Tokenless `/apply/resume` redirected to `/apply`.

## Functional verification and coverage

| Area | Evidence and limit |
| --- | --- |
| Availability | Observed the real lookup fail and the page fall through to the email form. The checked-in application-entry smoke test uses an intercepted open-cohort response. Real open, closed and full cohorts remain unverified. |
| Waitlist | Source confirms email validation, creation and a 409 duplicate response. No automated waitlist test found. Form display and submission were unavailable without a real closed or full cohort. |
| Email verification and OTP | Browser showed email entry, disabled Send Code while empty and retained malformed input. The field is a native email input, and the Zod error did not render for that interaction. Local assertions checked email and OTP input rules. Redis challenge, delivery, verification, expiry and resend were source-reviewed. No delivery or verification ran. |
| Save/resume | Tokenless redirect passed in Chromium. Local schema rejects empty resume tokens. Source confirms saved step/field restoration, paid draft handling and step saves. Valid links, persistence and stale-session recovery remain unverified. |
| Personal, academic, interest, skills and CV | Executed required-field schema checks for these steps. Source confirms PDF-only, 5 MB client restriction, and upload/persist/fallback paths. Later screens and storage operations could not be reached safely. |
| Declaration, coupons and checkout | Executed declaration and incomplete-draft schema checks. Source confirms coupon revalidation, signed declaration save, provider handoff and waiver bypass. No automated coupon or handoff test found. Runtime branches remain unverified. |
| Payment verification | Browser confirmed missing credentials render “Payment Verification Failed” with a missing-reference/session message. Valid reference, provider return, timeout, retry and verified payment outcomes remain unverified in the browser. |
| Enrollment | Source-reviewed auto-enrollment, waiver and paid-draft submit paths. No automated enrollment test found. Account creation, linking and delivery were unverified. |
| Password setup and access | Browser captured missing setup/reset links and signed-out login and recovery forms. Local schema checked minimum setup password length. Existing Playwright checks confirmed forgot-password fields and unauthenticated dashboard/admin redirects. Valid setup, reset delivery, MFA and authenticated account access remain unverified. |

| Check | Result |
| --- | --- |
| TypeScript, each app directory | `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed for frontend and backend. |
| Frontend ESLint | Ran the installed `ESLint().lintFiles(["."])` through Node, equivalent scope to the lint script. Exit 1 with **456 errors and 204 warnings**, matching the earlier baseline. `/apply` accounted for 28 errors and 25 warnings, including hook rules, explicit `any` and JSX/Next rules. |
| Existing Node tests | `node --test lib/utils/linkify.test.mjs` passed both tests. This covers linkification. |
| Local schema assertions | Ran 16 in-memory assertions with Node against the existing frontend application and backend applicant/auth Zod schemas. All passed. This verified input validation only, without executing routes or modifying test files. |
| Playwright inventory and executed subset | `node node_modules/@playwright/test/cli.js test --list` discovered 5 tests in 3 files. Ran the three existing tests matching “should render email request fields” or “should redirect unauthenticated” against the isolated frontend with output in a temp directory. **3 passed**. The application-entry and invalid-login specs intercept API responses and were left out of this integration baseline. |

## Confirmed findings and design review

- **Availability failure looks like open intake.** After the failed request, the form and hard-coded batch fallback render with no visible availability error or retry. The mobile tracker shows only numbers at 320 px. The “Progress is automatically saved” claim is broader than the source-confirmed save-on-continue behavior. See the [entry captures](baseline/reg-00/apply-320.png).
- **Entry field naming and focus differ.** The visible email label has no programmatic association. Chromium Tab reached the field and the focused border became navy with a solid outline in this run. The wider form and screen-reader experience remain unverified.
- **Missing payment credentials look like a failed payment.** The callback displays a failure heading while its footer still tells users verification is running. Timeout shares the same failed UI in source. Live timeout and payment outcomes were not exercised. See the [callback capture](baseline/reg-00/verify-payment-375.png).
- **CV size copy differs from enforcement.** Source confirms “Max 10 MB” versus rejection over 5 MB. Source also confirms closed and full share the same waitlist branch and that waiver bypass can advance without a setup token. These branches were not rendered.
- **Brand and layout.** Computed body background was #FDF7ED and the primary token #000666. Headings use Georgia and the body CSS specifies Sora. Next could not fetch Sora from Google Fonts and the loaded face was its fallback. Cream, white cards, restrained borders and navy buttons are visible on entry and recovery. The callback uses a separate gray surface. The desktop apply navigation still uses white on orange, whose declared pair is 2.16:1. The existing [design proposal](../DESIGN.md) uses navy as the primary action.
- **Support and legal destinations.** Source and rendered markup include the existing WhatsApp and email support links on apply, and `/#faq` points to an existing homepage section in source. The legal and several recovery/support footer links still use `href="#"`. External support channels were not contacted or verified as monitored. Confirm the canonical support route and approved Terms, Privacy and Security destinations before publishing changes.

## Staging and readiness

No isolated staging URL, documented test credentials, or test mailbox/provider environment was found in the checkout or supplied to this session. Staging existence elsewhere is unconfirmed. The repository has environment files with integration settings, which were not treated as authorization to contact those services. No backend service, payment, mail, account or data write was used.

**REG-01 is not ready to begin.** The [REG-00 acceptance criteria](REGISTRATION_TASKS.md#reg-00--establish-the-baseline) still need isolated integration verification for availability, waitlist, OTP, saved progress, CV, checkout/enrollment and authenticated setup. The provisional token direction, canonical support/legal destinations and explicit REG-01 authorization also remain open. Confirm an isolated environment and authorized test accounts, mailbox and payment test mode before completing those scenarios. Backend reliability work remains in the [separate risk list](REGISTRATION_AUDIT.md#regression-risks-and-separate-approvals).
