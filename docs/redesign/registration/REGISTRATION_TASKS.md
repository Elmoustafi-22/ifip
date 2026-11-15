# Registration implementation tasks

The user approved the registration journey and dependency order. The [audit](REGISTRATION_AUDIT.md) and [registration design](REGISTRATION_DESIGN.md) describe the existing and proposed behavior. **REG-00 is partially verified. REG-01B is signed off, and REG-02 through REG-06 are complete locally.** Use existing API contracts and isolated staging data for end-to-end checks. Use authorized test recipients and provider test mode for email and checkout.

Dependency order is **REG-00 → REG-01 → REG-01B → REG-02 → REG-03 → REG-04 → REG-05 → REG-06 → REG-07 → REG-08**. REG-00 staging verification remains open alongside the completed local work.

## REG-00 — Establish the baseline

- **Affected routes:** `/`, `/about`, `/login`, `/apply`, `/apply/resume`, `/verify-payment`, `/set-password`, `/forgot-password`, `/reset-password`, and the `/dashboard` handoff. Read-only integration checks for `/partner-portal` and `/admin` routing.
- **Changes:** Record current rendered desktop/mobile behavior and staging results for the audited branches. Confirm the token baseline and approved support/legal destinations. Record gaps in test environment coverage and distinguish existing defects from regressions. Application source changes are unnecessary for this task.
- **Dependencies:** Reviewed audit and registration journey. Use the provisional [shared design foundation](../DESIGN.md) for comparison and confirm access to an isolated environment for integration checks.
- **Acceptance:** Entry links, endpoints, payloads, redirects, persisted fields and expected transitions are recorded against reproducible baseline scenarios. Approval of design tokens is documented.
- **Tests:** Existing Playwright auth, navigation, and application entry smoke coverage, then stage checks for fresh, resumed, paid and recovery paths. Record unavailable checks explicitly.
- **Approval/status:** Execution approved. [Baseline evidence](REGISTRATION_BASELINE.md) covers static checks, 24 screenshots and three browser smoke tests. The existing visual foundation was subsequently approved provisionally. Isolated integration verification remains open, so REG-00 is partially verified.

## REG-01 — Registration shell, availability and waitlist

- **Affected routes:** `/apply`. Verify entry links from `/`, `/about`, and `/login`.
- **Changed file and components:** `ifip-frontend/app/apply/page.tsx`, inside `ApplyPage`. Scope covered the shell, availability effect and rendering, and waitlist form and handler. Existing API helpers, global styles, auth/verification routes and public entry pages remained integration boundaries.
- **Changes:** Apply shared registration layout and typography within `/apply`. Present checking, open, full, closed, failed lookup, waitlist submitting/joined/already joined/error states.
- **Dependencies:** The user approved local implementation with REG-00 staging verification open and the existing token foundation provisional. Existing cohort and waitlist API clients remain in use.
- **Acceptance:** An open cohort reaches the current email form. Full and closed states are accurate and allow the same waitlist action. An unavailable check has a retry. Waitlist validation and duplicate response are actionable. Existing entry URLs work.
- **Tests:** Open, full, closed, API error and retry. Waitlist invalid email, success, duplicate, and request failure. Keyboard and 320 px entry check.
- **Visual review:** Compare open, checking, full, closed, unavailable and waitlist outcomes at 320, 375, 768 and 1280 CSS px. Verify reflow at 200% zoom, keyboard focus, status announcements, reduced motion, and contrast using [QA_CHECKLIST.md](../QA_CHECKLIST.md).
- **Risks:** Availability can be stale or race with resume. Preserve paid and resumed entry paths. Test that a duplicate waitlist response remains recoverable, and keep OTP, profile saves, checkout and enrollment outside the slice.
- **Approval/status:** Complete locally. See [verification and screenshots](REGISTRATION_REG01_VERIFICATION.md). Staging verification remains a separate pending requirement.

## REG-01B — Visual design refinement

- **Affected route:** `/apply` entry, availability and waitlist surfaces.
- **Design evidence:** [Rendered editorial and form-centered concepts](REGISTRATION_REG01B_CONCEPTS.md), with responsive entry, full, closed and unavailable previews.
- **Implemented scope:** Applied Concept A in `ifip-frontend/app/apply/page.tsx` for entry, availability and waitlist. Existing API helpers, payloads and routes remain in use. Later registration steps retain their layout.
- **Acceptance and checks:** Verify the chosen visual direction at 320, 375, 768 and 1280 CSS px. Capture matched before/after screenshots, run TypeScript, targeted lint comparison and fixture browser tests, and review the actual rendered route. Complete REG-01B after the user approves the rendered app.
- **Status:** Complete. Final visual sign-off granted on 13 November 2026. [Matched screenshots and checks](REGISTRATION_REG01B_VERIFICATION.md) record local verification. REG-00 staging verification remains open.

## REG-02 — Email verification and resume

- **Affected routes:** `/apply` (step 1, `?token=…` and saved session), `/apply/resume`; verify existing `/login` recovery link.
- **Changes:** Label email and OTP, clarify resend and expiry, separate sending from verifying, and surface resume loading, invalid-link, stale-session and network retry states. Keep the existing session and email-link mechanisms.
- **Dependencies:** REG-01. Existing OTP and applicant endpoints.
- **Acceptance:** Codes remain pasteable, only a successful API verification advances the form, and the latest saved fields and paid state restore through each existing entry path. Resume results take precedence over geolocation defaults. Existing rate limits and cooldown remain in force.
- **Tests:** Valid, invalid, expired, and resent codes, throttling, already registered, Redis/network failure feedback, valid/invalid email link, stale local session, offline retry, and reload after OTP. Verify Tab order and focus after transition.
- **Approval/status:** Authorized and complete locally. See [fixture verification and screenshots](REGISTRATION_REG02_VERIFICATION.md). Real mail, session and persisted-draft integration remain open under REG-00.

## REG-03 — Progress and personal/academic forms

- **Affected routes:** `/apply` steps 2–3 and their restored states.
- **Changes:** Add named progress, consistent labels and groups, an accessible phone, country and date interaction, and recoverable save errors. Preserve numeric steps, field options and current serialization.
- **Dependencies:** REG-02. Applicant PATCH, geolocation and academic options.
- **Acceptance:** Mobile shows current step and name. Earlier-step navigation preserves in-session edits. Successful save advances, and failure stays on the current step with values available. Existing required fields and age/name validation are preserved.
- **Tests:** Required/invalid values, save rejection and retry, prefilled profile, country/dial-code round trip, geolocation ordering, academic options loading and fallback, reload and Back. Keyboard, reflow, and error announcement checks.
- **Approval/status:** Authorized and complete locally. See [verification and screenshots](REGISTRATION_REG03_VERIFICATION.md). Real draft persistence and API integration remain open under REG-00.

## REG-04 — Interest, motivation and CV

- **Affected routes:** `/apply` steps 4–5 and restored drafts.
- **Changes:** Align interest copy and selection, group skills and motivation, clarify required/optional fields, and use a named PDF picker with its 5 MB limit and upload states.
- **Dependencies:** REG-03. Existing form-options, signed Cloudinary upload and fallback endpoints.
- **Acceptance:** Previously saved interests and CV survive reload and navigation. Users can distinguish upload pending, stored and failed. Step save waits for the required upload. Failed replacement respects the last saved server value. No field or payload changes.
- **Tests:** Single/multiple interest selections within current limits, custom/optional fields as currently supported, options failure and fallback, invalid PDF/type/size, successful direct/fallback upload, session expiry, replacement error, reload with saved CV, and step-save errors.
- **Approval/status:** Authorized and complete locally. See [verification and screenshots](REGISTRATION_REG04_VERIFICATION.md). Isolated staging verification for option data, upload providers and persistence remains open under REG-00.

## REG-05 — Declaration, coupon and hosted checkout

- **Affected routes:** `/apply` step 6 and inline waiver/paid-draft entry to confirmation; hosted checkout handoff to `/verify-payment`.
- **Changes:** Reorganize the existing fee and declaration section, label current fee figures as estimates, retain terms, show coupon validation/removal feedback, and guard the save → initiate sequence against repeated UI activation.
- **Dependencies:** REG-04. Existing coupon, draft PATCH and payment initiation contracts.
- **Acceptance:** Declaration is saved before checkout. No, partial and full coupon cases retain existing behavior. Hosted checkout gets its original authorization URL and stores the existing callback credentials. Paid drafts use final submit. Pending and ambiguous failures have a clear recovery path.
- **Tests:** NGN/USD display, invalid/expired/exhausted coupon, partial discount, full waiver with/without setup token, incomplete declaration, capacity rejection, rapid repeated clicks, and intercepted hosted handoff. The gateway test-mode handoff remains under REG-00.
- **Approval/status:** Authorized and complete locally. See [verification and screenshots](REGISTRATION_REG05_VERIFICATION.md). Real checkout, waiver, and paid-draft integration remain open under REG-00.

## REG-06 — Payment verification, recovery and confirmation

- **Affected routes:** `/verify-payment`, `/apply?payment=verified`, `/apply` step 7, and `/set-password` handoff.
- **Changes:** Show separate status and recovery based on existing signals. Serialize polling, clean up timers, preserve callback aliases and credentials as needed for safe retry, and use actual paid-draft and setup-token outcomes for next steps.
- **Dependencies:** REG-05. Existing reference/status API and paid-draft continuation.
- **Acceptance:** Known success and failure, provider cancellation, pending timeout, offline, and missing/expired credentials render separately. A timeout never suggests paying again. Successful setup tokens and existing paid-draft returns navigate correctly. A waiver without a token does not claim submission. No new backend state is required.
- **Tests:** Each callback alias, immediate/delayed success, no setup token, confirmed failure, cancellation, missing/expired storage, late status, reload/navigation cleanup, no overlapping requests, paid-draft final submit and duplicate activation. Staging checkout verifies persistence and callback behavior.
- **Approval/status:** Authorized and complete locally. See [verification and screenshots](REGISTRATION_REG06_VERIFICATION.md). Provider callbacks and persisted payment and enrollment verification remain open under REG-00.

## REG-07 — Password setup and credential recovery

- **Affected routes:** `/set-password`, `/login`, `/forgot-password`, `/reset-password`; `/dashboard`, `/partner-portal`, and `/admin` as destinations.
- **Changes:** Align the account setup and relevant auth/recovery states with the registration patterns. Clarify missing/rejected link, validation, pending, success and onward actions. Preserve role routing, MFA, token handling and generic forgot-password responses.
- **Dependencies:** REG-06. Existing auth helpers and approved support/legal destinations.
- **Acceptance:** Participant, invited partner and admin paths retain their applicable destinations. Password manager, paste and visibility controls work. Success is readable and offers onward navigation. Recovery offers a valid existing next step.
- **Tests:** Setup with role/no-role token, missing and rejected token, invalid password/mismatch, successful setup and auth, credential failure, existing-session login, MFA, generic reset request, invalid/valid reset link, and keyboard/focus checks.
- **Approval/status:** Visual work authorized and implemented. Login, forgot-password and tokenless setup/reset screens passed local reflow checks. The full role, MFA, success and credential matrix remains open.

## REG-08 — End-to-end regression review and handoff

- **Affected routes:** All registration and recovery routes above, including public entry links and authenticated landing destinations.
- **Changes:** Review the completed diff using `interface-review`. Compare against REG-00, fix regressions within the approved scope, and update task and progress evidence.
- **Dependencies:** REG-01–REG-07.
- **Acceptance:** Existing contracts and routes pass checks, and registration UI is verified through the actual staging integration. Record findings or inaccessible environments, including any deferred backend risks. Release approval is a separate decision.
- **Tests:** Clean entry → OTP → form → checkout → enrollment → password → dashboard. Repeat with resume, waitlist, waiver, paid draft and interrupted checkout. Verify accessible names, focus, reduced motion, contrast, 320 px reflow, 200% zoom and mobile keyboard. Run the applicable frontend lint, type and Playwright checks.
- **Approval:** Pending.
