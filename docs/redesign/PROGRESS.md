# IFIP modernization progress

## 11 November 2026

- Registration and enrollment moved ahead of homepage and dashboard implementation.
- Completed the [registration source audit](registration/REGISTRATION_AUDIT.md), [proposed design](registration/REGISTRATION_DESIGN.md), and [task breakdown](registration/REGISTRATION_TASKS.md).
- The requested progress tracker was absent in this checkout. This entry starts the tracker with this phase. Earlier completion history has not been inferred.
- Registration UI implementation awaits user approval. REG-00 establishes a rendered/staging baseline. REG-01 is the first UI slice, covering the registration shell, cohort availability and waitlist.
- Rendered and staging checks remain pending. The backend risks listed in the audit require separate approval before related changes.

### Documentation foundation and verification evidence

- The user approved the registration journey and REG-00–REG-08 sequence and held REG-01. Created the [architecture](ARCHITECTURE.md), [UI inventory](UI_INVENTORY.md) and [QA checklist](QA_CHECKLIST.md). Completed the root agent instructions, [PRD](PRD.md), [engineering rules](RULES.md) and [design system](DESIGN.md) after reviewing the starter versions. The platform-wide visual foundation remains provisional. The Dribbble image is in `design-references/` and was inspected as a public homepage reference.
- From both app directories, `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed. Frontend `npm.cmd run lint` exited 1 with 456 errors and 204 warnings. These are baseline findings, including existing hook and explicit `any` diagnostics.
- Frontend `node --test lib/utils/linkify.test.mjs` passed two tests. `node node_modules/@playwright/test/cli.js test --list` found five tests in three files. Neither result verifies a registration browser journey.
- An earlier frontend-only dev session reached Ready with the API URL set to an isolated loopback address and was stopped. Browser journeys, computed contrast and staging integrations are unverified. No backend server, live payment, production email or database operation was used for these checks.
- **Next executable task is REG-00.** Record the rendered baseline and verify supported staging branches when isolated access is available. Confirm the provisional styling direction and approved support/legal destinations. REG-01 remains on hold until the user authorizes source implementation.

### REG-00 baseline execution

- REG-00 execution approved. Captured 24 Chromium screenshots across six reachable public or tokenless screens at 320, 375, 768 and 1280 CSS px. Captured `/apply` after the real availability request failed. Confirmed tokenless resume redirect and missing payment/setup/reset credentials feedback. No staging data was simulated.
- Frontend and backend no-emit type checks passed. Frontend ESLint reproduced 456 errors and 204 warnings. Two existing Node tests, 16 local Zod assertions and three existing Playwright checks passed. Two intercepted Playwright cases were inventoried and excluded from the live baseline.
- The [REG-00 report](registration/REGISTRATION_BASELINE.md) distinguishes rendered findings from source-confirmed defects and unverified states. Sora fallback loaded in the local browser. The visual foundation and canonical support/legal destinations remain provisional.
- No isolated staging URL or authorized test credentials were available. REG-00 remains open for real availability/waitlist, OTP, resume, upload, coupon, checkout, enrollment and account access. REG-01 remains on hold and requires explicit authorization. Application source was untouched.

### REG-01 local implementation and review

- The user approved the existing visual foundation provisionally and authorized REG-01 while keeping REG-00 staging verification open. Changed only `ifip-frontend/app/apply/page.tsx` in application source. The revised shell labels progress and fields. Availability handles checking, open, full, closed and unavailable with retry. Waitlist handles validation, submitting, joined, already joined and retry using the existing API. Restored drafts can continue without relying on a fresh availability result.
- Completed local acceptance with 15 Playwright Chromium fixture scenarios, two supplemental checks for keyboard/reflow and late availability responses, and 19 captures. The [verification record](registration/REGISTRATION_REG01_VERIFICATION.md) lists scenarios, screenshot paths and limitations. These results use synthetic intercepted responses and do not establish staging integration.
- Frontend TypeScript passed. Targeted `ApplyPage` lint found zero new diagnostics compared with HEAD. The production build stopped at the existing Sora download. Local preview used fallback typography.
- REG-00 remains partially verified. REG-01 is complete locally and ready for user review. Isolated staging access and canonical support/legal destinations remain pending. REG-02 awaits explicit approval.

### REG-01B visual exploration

- The user accepted REG-01 functional behavior and requested a more distinct visual design. Reviewed the existing captures, the IFIP banner and homepage reference, design rules and registration source. Created an offline preview and 16 Chromium captures of [two visual directions](registration/REGISTRATION_REG01B_CONCEPTS.md).
- The editorial split is recommended for its stronger visual distinction and compact mobile introduction. The form-centered direction offers the quickest path to the field and a simpler shell for longer steps. Both were checked for horizontal overflow, focus, validation and preview interaction. Prototype verification does not cover live registration behavior.
- The application source still contains the existing REG-01 implementation. REG-01B is awaiting direction approval. REG-00 staging verification remains open and REG-02 remains on hold.

### REG-01B approved direction and implementation

- The user approved Concept A. Implemented the editorial split, scoped typography and form controls, and compact program navigation in `ifip-frontend/app/apply/page.tsx`. Kept existing availability, waitlist and applicant recovery logic in place.
- Frontend TypeScript passed. Targeted lint matched the pre-change 26 errors and 23 warnings with zero new diagnostics. Chromium passed 18 intercepted scenarios. [Actual-route before/after review](registration/REGISTRATION_REG01B_VERIFICATION.md) records 19 screenshots and the 320 px visual refinement.
- Concept A has provisional design approval. REG-01B implementation is complete and local automated verification passed. Final visual review is pending. REG-00 staging verification remains open, and REG-02 awaits explicit authorization.

## 13 November 2026

- The user granted final visual sign-off for REG-01B and authorized REG-02. REG-01B is complete. REG-00 remains partially verified with staging open.
- REG-02 updated email verification, resend feedback, resume and saved-session recovery in `/apply` and `/apply/resume`. The [local verification report](registration/REGISTRATION_REG02_VERIFICATION.md) records fixture results and screenshots.
- The user authorized REG-03. Steps 2 and 3 now have labeled form groups, field-level validation, and save feedback. TypeScript and 10 isolated Chromium scenarios passed. Targeted lint decreased from 18 errors and 20 warnings to 12 errors and 19 warnings. The [REG-03 report](registration/REGISTRATION_REG03_VERIFICATION.md) records eight screenshots and test coverage.
- REG-03 is complete locally. REG-00 staging verification is still open.
- The user authorized REG-04. Steps 4 and 5 now support multiple primary interests, retain archived saved choices, group experience and motivation fields, and provide a labeled PDF picker with a 5 MB limit and upload recovery. Eleven REG-04 and ten REG-03 Chromium scenarios passed with request interception. The targeted lint baseline dropped from 12 errors and 19 warnings to 9 errors and 18 warnings. The [REG-04 report](registration/REGISTRATION_REG04_VERIFICATION.md) contains screenshots and coverage.
- REG-04 is complete locally. REG-00 remains partially verified pending staging integration.
- The user authorized REG-05. The declaration and coupon forms now show levy estimates in NGN or USD and report save, checkout and waiver results based on existing responses. TypeScript and 15 REG-05 plus 11 REG-04 intercepted Chromium scenarios passed. Targeted lint decreased from 9 errors and 18 warnings to 6 errors and 15 warnings. See the [REG-05 report](registration/REGISTRATION_REG05_VERIFICATION.md) for screenshots and coverage.
- REG-05 is complete locally. REG-00 remains partially verified with provider test mode and staging integration open.
- The user authorized REG-06. Payment verification now checks one request at a time, retries the same reference, and gives applicants an immediate setup or recovery action. TypeScript, 18 REG-06 Chromium scenarios, and 15 REG-05 regression scenarios passed with request interception. The [REG-06 report](registration/REGISTRATION_REG06_VERIFICATION.md) records test details and screenshots.
- REG-06 is complete locally. REG-00 staging verification remains open.
- The user approved the unified registration UI and the checkout and enrollment reliability recommendation. The shared registration layout and account screens passed 40 intercepted Chromium checks across four viewport widths. Nine MongoDB replica-set scenarios passed after Docker became available, covering checkout reuse, seat and coupon contention, webhook and polling overlap, and enrollment recovery. Hosted provider and staging verification remain open. See the [verification report](registration/REGISTRATION_UNIFIED_VERIFICATION.md).
- The user approved the first homepage slice. The header and hero now use the editorial layout with one cohort-aware application action. See the [homepage report](homepage/HOMEPAGE_HERO_VERIFICATION.md) for the responsive captures and intercepted browser checks.
- The homepage color pass now covers the hero, curriculum, program journey and commitment levy. TypeScript, targeted ESLint and four responsive Chromium checks passed for the journey and levy. The [homepage report](homepage/HOMEPAGE_HERO_VERIFICATION.md#journey-and-levy-color-pass) records contrast measurements and screenshots.
- At the user's request, restored the homepage source and artwork to the checked-in design at `fd239ea`. The previous homepage captures and concepts are historical.

## 14 November 2026

- Completed the homepage Phase A audit against the current working tree. Reviewed the `/` route, homepage components, styling and brand assets. No application source changed. Phase B concepts and their motion plans are pending.
- The existing local Next.js server returned HTTP 200. Playwright Chromium rendered the homepage at 320, 375, 768 and 1440 CSS px with intercepted public data and blocked external requests. Checked cohort label rendering, both currency branches, the openings switch, FAQ keyboard activation and accessibility tree, mobile menu Escape, reduced-motion behavior and failed catalog requests. Captured the settled baseline at 375, 768 and 1440 CSS px.
- White CTA text on brand orange measured 2.16:1. The inline application action started below an 800 px viewport at 320 CSS px during the reduced-motion check. The mobile menu retained its open state on Escape. FAQ answers remained in the accessibility tree while visually collapsed. Public catalog request failures produced the same visible fallback as empty results.
- From `ifip-frontend`, `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed. `node node_modules/eslint/bin/eslint.js app/page.tsx components/home` reported five errors and nine warnings. Live API data, signed-in navigation, 200% zoom and a production build remain unverified.

### Admin dashboard cohort operations proposal

- Reviewed the working tree with `git status --short` and traced the admin pages, controllers, and models using `rg -n` and `Get-Content`. The dashboard ships an All Cohorts filter and a cohort form. The overview mixes cohort-scoped application figures with a global registration funnel and waitlist count. The cohort create handler saves and audits the record. The waitlist stores join timestamps, and the placement desk groups offers with confirmed placements.
- Proposed a cohort overview with consistent metric scope, a prominent New cohort action, public intake refresh when registration opens, a cohort announcement to eligible contacts who joined before creation, and an admin-recorded employer decision with a distinct confirmed hire outcome.
- Source review only. Signed-in rendering, public refresh timing, email delivery, and partner/admin outcome synchronization were not tested. Implementation remains deferred pending approval.

The user then authorized implementation. The dashboard now defaults to All cohorts for new admin sessions, uses existing cohort scope for application figures, and labels global waitlist and funnel figures. New cohorts appear immediately in the cohort table and selector. The registration status endpoint serves current data and the homepage refreshes on focus and once a minute. The creation form enables waitlist notification by default for upcoming cohorts, with a preview and opt-out. Confirmed hires are counted separately from offers. Admin notes and recorder IDs are stored server-side, and the partner portal reads the outcome on the same record.

- Frontend and backend `node node_modules/typescript/bin/tsc --noEmit --incremental false` exited 0. Targeted ESLint comparisons against HEAD found zero added diagnostics in eight changed TSX files. Existing diagnostics remain. `git diff --check` exited 0.
- Playwright Chromium against the local frontend with intercepted APIs passed at 320 and 1280 CSS px. Covered All cohorts, overview reflow, Escape on the creation dialog, dates and capacity submission, immediate selector update, waitlist preview/status, public homepage and apply cohort names, and recording an admin hire.
- `node --import tsx tests/cohort-operations.mjs` passed against disposable MongoDB 7 with a simulated Brevo adapter. Covered intake validation, overlapping registration, cutoff, concurrent duplicate prevention, retry, message contents, hiring persistence, stale-write rejection, private notes and distinct hire counts. `node --import tsx tests/registration-concurrency.mjs` passed all nine existing scenarios against the same replica set with isolated fixtures.
- Staging delivery and authenticated partner browser checks remain open. Delivery marked sending is held for review if the process stops after claiming a recipient and before saving the provider result. This avoids automatically resending a message with an unknown result. No real email was sent and no deployment was made.

### Dev admin and default cohort

- Seeded a verified superadmin in the isolated loopback `ifip_dev` MongoDB database, with a bcrypt password and development profile. Dev frontend runs on port 3091 and the API on port 5091 with local MongoDB and Redis. The existing remote database was not used.
- Admin login now starts on the most recently created cohort, falling back to programme start dates for records without creation timestamps. Manual selection persists within the browser tab until sign-out or a new successful login, including MFA.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed in the frontend. Live local API login and authenticated profile returned 200. Playwright verified login, newest-by-creation with differing start-date order, All Cohorts after reload, and newest again after signing out and back in. Temporary verification cohorts were deleted.

### Optional cohort training dates

- On 15 November 2026, made training start and end dates optional in New cohort and Edit cohort. Registration dates remain required. The overview and waitlist messaging indicate when training dates will be announced later.
- Frontend and backend `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed. The `cohort-operations.mjs` harness passed with its connection overridden to the loopback `ifipdev` replica set and a separate temporary database. It covered public registration before scheduling, waitlist message copy, out-of-order date rejection, and adding the dates later. A Chromium check at 375 CSS px with intercepted APIs passed creation with blank training dates and editing only the start date. No shared database records were changed for these checks.

### Paystack-first checkout plan

- Used `git status --short`, `rg`, and `Get-Content` to trace checkout initiation, provider verification, webhooks, and browser callbacks. Reviewed Paystack's official transaction, webhook, and merchant currency guidance. Drafted the [implementation plan](registration/PAYSTACK_IMPLEMENTATION_PLAN.md). Merchant capabilities, test-mode checkout, and rollout remain pending. No source changes or gateway requests were made.

### Paystack-first checkout implementation

- Implemented opt-in Paystack-primary routing, Flutterwave fallback for unsupported USD or confirmed Paystack initialization authentication rejection, and reconciliation flags for late or mismatched payments. The admin payment drawer displays the reason and any linked reference. Existing attempts stay on their recorded provider. See [staging configuration and rollback](registration/PAYSTACK_IMPLEMENTATION_PLAN.md#staging-configuration).
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed in both apps. `registration-concurrency.mjs` passed 13 scenarios on a temporary MongoDB database on the loopback `ifipdev` replica set with both gateway APIs simulated. Tests covered concurrent Paystack initialization, verification mismatches, both webhook signature modes, delayed and duplicate webhook handling, fallback and late charges, NGN and USD amounts, and the nine existing checkout and enrollment cases.
- Chromium at 375 CSS px with intercepted APIs passed both Paystack and Flutterwave callback paths through pending verification to the password setup link. Real hosted checkout, webhook delivery, and merchant currency settings require isolated staging verification. Environment files and live routing were not changed.

- Reviewed the manual payment route, admin receipt form, and enrollment handoff with `rg` and `Get-Content`. Drafted the [international bank transfer proposal](registration/INTERNATIONAL_BANK_TRANSFER_PLAN.md). Receiving bank and mailbox settings remain unconfirmed. Application source was untouched for this proposal.

### International bank transfer implementation

- Implemented the approved transfer-only USD registration path, a five-day configurable cohort and coupon hold, private receipt storage, and admin review and enrollment. Configured the confirmed account number in the ignored local backend environment. Emailed proof uses the existing IFIP inbox and is attached by the reviewer. See the [transfer configuration and review steps](registration/INTERNATIONAL_BANK_TRANSFER_PLAN.md#local-configuration-and-review).
- Frontend and backend `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed. `registration-concurrency.mjs` passed 16 scenarios on the loopback replica set using a separate fixture database and simulated gateways. These included transfer-only routing, private receipt retrieval, both proof entry paths, exact-credit matching, stale proof, concurrent approval, duplicate credit rejection, setup-token gating, hold expiry, and the existing gateway and waiver paths.
- Chromium with intercepted APIs passed the applicant flow at 375 CSS px and the email attachment and approval workflow in Admin → Payments at 1280 CSS px. Staging, bank settlement, and real email delivery remain unverified. No deployment was made.

### Homepage Phase B concepts

- Prepared three offline homepage previews for approval: Editorial, Pathway and Prospectus. Each retains the existing main section order, uses preview copy, and has a motion plan. The comparison proposes consolidating mobile navigation, simplifying the hero actions and, for Editorial, using an illustrative portrait subject to approval.
- Ran inline Playwright Chromium checks from `ifip-frontend` against the offline preview at 320, 390, 768 and 1440 CSS px. All 12 combinations fit horizontally and kept Apply within the first 800 px. Keyboard menu open and Escape dismissal, route preview dismissal, FAQ activation and openings selection passed at 390 CSS px. Reduced motion suppressed entry animation in all 12 combinations. Desktop and mobile captures were saved to the chat visualization workspace.
- The concepts are ready for direction approval. No application source changed. Live data, signed-in navigation and production checks await implementation.

### Homepage Pathway preview refinement

- The user preferred Pathway and requested cards, icons and location-based levy display in the preview. Grouped the three hero stages in one icon-led panel, gave each curriculum track a card, and added a levy card showing one amount at a time. Retained the main section order.
- Playwright Chromium exercised simulated Nigeria and international locations at 320, 390, 768 and 1440 CSS px. Each state rendered only its own amount. Checked mobile menu dismissal, keyboard selection of the preview location, persistence on reload, first-screen Apply placement and reduced motion. Desktop and mobile previews and both levy states were captured in the chat visualization workspace.
- The offline preview uses simulated country codes and defaults to Nigeria, matching the existing homepage fallback. Live IP detection and homepage source remain outside the preview revision.
- Added three sample opportunity categories, three sample active openings, four fictional partners, four icon-led eligibility cards and three Bridge the gap cards in the Pathway preview. The main section order remains the same.
- Ran inline Playwright Chromium checks from `ifip-frontend` at 320, 390, 768 and 1440 CSS px. Verified the keyboard-operated listings switch, visible card counts, sample application dialog and both simulated levy branches. Measured no horizontal overflow in either listings view. Captured desktop and mobile screenshots. Preview data is fictional and application source was untouched.
- Added icons for WhatsApp support, email, LinkedIn and location in the Pathway footer. Extended the same icon treatment to program guide links, partner contact and opening metadata. Chromium checked accessible link labels, guide keyboard activation and layout at 320, 390, 768 and 1440 CSS px. Application source and contact destinations were unchanged.

### Homepage Pathway implementation

- Implemented the approved Pathway preview on the public homepage. Scoped the styles to `app/page.tsx` and `components/home/`. Preserved the main section order, existing API requests, cohort focus and 60-second refresh, application links, contact destinations, and fixed mobile shortcuts. The homepage uses the existing geolocation endpoint and Nigeria fallback. The sample partner and listing records remain in the offline preview.
- TypeScript passed with `node node_modules/typescript/bin/tsc --noEmit --incremental false`. Targeted ESLint passed with `node node_modules/eslint/bin/eslint.js app/page.tsx components/home`. The homepage diff passed `git diff --check`.
- The first `npm.cmd run build` could not fetch the existing Sora font. A network-enabled retry passed compilation, type checking, and generation of all 57 static pages.
- Playwright Chromium checks on the rendered route at 320, 390, 768 and 1440 CSS px covered cohort open, full, closed and unavailable states, both levy amounts, filled, empty and failed catalog states, use of Retry, signed-in mobile shortcuts, Escape and focus restoration in the menu, and keyboard switching and FAQ activation. Supplemental checks covered focus-triggered refresh, the real geolocation route with simulated headers, brochure delivery, anchor offsets and focused content visibility. The hero's three measured text pairs ranged from 11.59:1 to 12.05:1. Reduced motion disabled the hero entrances and smooth scrolling. Desktop and mobile screenshots use intercepted data.
- Removed the footer's placeholder legal links because the repository still has no confirmed Terms of Service or Privacy Policy destination. Live production data, cross-browser accessibility coverage, and field performance remain unverified.
- Shortened the homepage footer labels to WhatsApp support and Email support and removed the IFIP website link. Targeted ESLint for `app/page.tsx` and `git diff --check` passed.

### Pathway login preview and homepage motion

- Built an offline login preview with sign-in, security code, password recovery, reset confirmation, expired session and sign-in error states. Playwright Chromium verified its layout at 320, 390, 768 and 1440 CSS px and exercised password visibility, form transitions, focus, and reduced motion. Login source was untouched and no authentication requests were sent.
- Added homepage-only CSS motion for the hero copy, card entrances, journey markers, navigation and FAQ feedback. Playwright Chromium verified hero stagger, scroll-linked cards, menu and FAQ behavior and reduced-motion suppression on the rendered homepage at 390 and 1440 CSS px. Targeted ESLint and the hero diff whitespace check passed.
- Frontend TypeScript passed with `node node_modules/typescript/bin/tsc --noEmit --incremental false`.

### Pathway login implementation

- Implemented the approved Pathway design on `/login`. The desktop brand panel collapses on mobile. Sign-in, security code, password recovery and reset confirmation share the same form surface. Kept the existing API helpers, redirects, generic recovery response, password visibility and remember-me controls. Added focus on view changes and scoped reduced-motion styling.
- From `ifip-frontend`, `node node_modules/eslint/bin/eslint.js app/login/page.tsx` and `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed. `git diff --check -- ifip-frontend/app/login` passed. The running development route returned HTTP 200.
- Playwright Chromium tested the route at 320, 390, 768 and 1440 CSS px. Seven scenarios with intercepted responses covered expired sessions and invalid credentials, MFA and focus, fresh applicant, partner and admin redirects, recovery under an API error, and an existing admin session. Captured desktop and mobile sign-in, security code and recovery. Live authentication, email delivery, and the broader REG-07 matrix remain unverified.

### Pathway registration styling

- Applied Pathway's navy, pale blue and Sora styling to applicant entry, waitlist, verification, forms, resume, payment verification, password setup and recovery. Kept the existing forms, progress controls, navigation and backend contracts. Reduced the mobile entry introduction so the form starts higher. Replaced placeholder account footer links with the existing WhatsApp and email support links.
- Playwright Chromium verified responsive entry, closed registration, unavailable payment, password recovery and tokenless setup/reset at 320, 390, 768 and 1440 CSS px with no horizontal overflow. At 390 and 1440 CSS px, intercepted OTP request and verification reached the profile and saved drafts restored academic, interest, skills and declaration steps. Captured desktop and mobile screenshots. Live OTP, payment and enrollment remain open under REG-00.
- From `ifip-frontend`, `node node_modules/typescript/bin/tsc --noEmit --incremental false` and the scoped `git diff --check` passed. Targeted ESLint over the touched routes and support footer reported 7 errors and 15 warnings in existing application and password code.
- An additional 390 CSS px Chromium scenario verified an intercepted payment confirmation and keyboard navigation to a valid fixture password-setup screen.
- Split primary area-of-interest checkboxes into two columns when their form group has at least 30 rem of available width. Inline Playwright Chromium checks from `ifip-frontend` confirmed one column at 320 and 390 px, two columns at 768 and 1440 px, long-label wrapping, and keyboard selection alongside a restored choice. The scoped `git diff --check` passed.
- Added required text fields for selected Other interests in both primary and secondary choices. Custom answers use the existing interest strings and restore into the correct fields on resume. Inline Playwright Chromium at 390 and 1440 CSS px verified reveal, validation focus, legacy selection, request payload, reload, and deselection using intercepted API responses. TypeScript and the scoped whitespace check passed. Targeted ESLint reported the existing 5 errors and 15 warnings in `app/apply/page.tsx` and no findings in `lib/validation/applySchemas.ts`.

### Homepage motion refinement

- Added a 180 ms base delay, a 580 ms transition, and 26 px of travel to the Framer Motion scroll reveals. Targeted ESLint for `components/home/HomepageReveal.tsx` passed. Inline Chromium checks verified the delayed slide and fade at 390 and 1440 CSS px and confirmed that reduced motion skips them.

- Added Framer Motion scroll entrances alongside the first-load slides. Section introductions, cards, journey steps, FAQs and action panels rise and fade once when they enter view. Inline Chromium checks at 390 and 1440 CSS px measured movement and fade on first entry, verified no replay, and confirmed that reduced motion disables both. Keyboard testing covered the openings switch and FAQ.

- Replaced the homepage CSS module with a namespaced stylesheet and moved the first-load slides to the existing Framer Motion dependency. Chromium verified mobile and desktop entrance offsets, the settled layout, keyboard FAQ, and reduced motion at 390 and 1440 CSS px. Frontend TypeScript, targeted ESLint, and the homepage diff whitespace check passed.

- Following the user's clarification, replaced scroll-triggered entrances with CSS-only, first-load slides for the hero headline, description, actions, and pathway panel. The panel slides sideways on desktop and upward on phones. The copy remains fully opaque and focused CTAs settle immediately. Chromium verified direction, stagger, no overflow, static scrolled cards, and reduced-motion suppression at widths from 320 to 1440 CSS px.

- Increased the hero entrance and staggered pathway stages. Added one-time intersection-based reveals for section headings, descriptions, cards, journey steps and FAQs. Content stays visible before animation. Reduced motion disables the homepage effects.
- From `ifip-frontend`, `node node_modules/eslint/bin/eslint.js app/page.tsx components/home/HomepageMotion.tsx` and `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed. Playwright Chromium at 390 and 1440 CSS px verified the hero sequence, reveal on first entry with no replay after scrolling away, and listing and FAQ keyboard behavior with motion enabled. Both widths passed reduced-motion and layout checks.

### Participant cohort handoff

- Source inspection with `git status --short`, `rg`, and `Get-Content` traced registration availability through `getActiveRegistrationCohort`, checkout cohort selection, and the copy from the draft's `cohortId` into the permanent application. The completed cohort is excluded by the checkout requirement for an `upcoming` cohort within its registration window.
- `GET /applications/me` includes the saved `cohortId`. The dashboard instead uses `GET /cohort/active` for its start date and launch gate. That route prefers the global `CohortConfig`, and the dashboard page and layout hard-code `Batch 2026-A`. The screenshots show the discrepancy. The affected application's saved assignment and the runtime config were unverified.
- Verify the saved assignment through the admin application review. A proposed fix would resolve the assigned cohort for the participant dashboard and use it for the batch name and training start, including an unscheduled state for absent training dates. End-to-end coverage should include an upcoming and a completed cohort with distinct start dates. This was a source diagnosis with no application changes or integration tests.

On 15 November 2026, the user authorized the fix. The authenticated application response resolves the saved cohort reference and returns its name and optional training start date. The participant layout, overview, Modules, Assessments, and Resources share those details and the launch state. Dates display in UTC to match the calendar day entered in Admin. Admin preview and explicit launch overrides still apply. A successful settings save updates the shared profile for subsequent navigation.

- An inline `node --import tsx --input-type=module -` check against the application controller with stubbed model queries passed. It verified distinct assignments, an unscheduled date, a missing cohort record, an unassigned application, admin preview, and the existing missing-application response.
- Inline Playwright Chromium checks via `node -` at `localhost:3091` with intercepted API responses passed for future, earlier, unscheduled, and unassigned cohorts, both explicit launch overrides, admin preview, and the launch time passing while the dashboard remains open. The December date also stayed on the expected day in a browser set to Los Angeles.
- A separate Chromium check saved a profile change in Settings and navigated to the dashboard. The saved name and CV status appeared without reloading, and the assigned cohort date remained visible.
- Backend and frontend `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed. The scoped `git diff --check` passed, and the dashboard lint comparison against HEAD found only existing diagnostics. Source search found no hard-coded batch names or cohort dates under the participant dashboard.
- Real application records and the full enrollment-to-dashboard path remain unverified. Verify this handoff on an isolated deployment as part of REG-08.

### Cohort assignment for training materials

- Source review with `git status --short`, `rg -n`, and `Get-Content` traced admin creation and participant retrieval for modules, assessments, resources and sessions. New modules, resources and sessions default to the selected cohort when one is selected and support global scope. Their create handlers accept an optional cohort reference. Active cohort status alone does not assign material.
- Assessments link to a module. Participant resource and schedule queries include the assigned cohort and global records for assigned participants. Participant module list and detail queries do not constrain by cohort. Module progression also selects the next published module without a cohort constraint. Participant schedule queries skip cohort filtering when there is no assignment.
- The review used source only. Runtime records and cross-cohort access were not tested. Record cohort visibility checks before treating published training materials as isolated.

### Mandatory administrator MFA

- Administrator and superadministrator login now requires TOTP, with first-time enrollment confirmed through the account mailbox and then the authenticator app. MongoDB stores short-lived challenges and consumes successful checks once. Password setup and recovery return administrators to sign-in. Password changes invalidate earlier privileged sessions, and administrators cannot disable MFA from Settings.
- The API requires verification within the previous ten minutes for manual payment and bank-transfer mutations and fee coupon changes. Refresh does not extend that window. Admin sessions have an eight-hour upper limit, and the refresh token is delivered in an HTTP-only cookie.
- From `ifip-backend`, `node --import tsx tests/admin-mfa.mjs` passed against a disposable local MongoDB database with mocked email delivery. Coverage included concurrent enrollment confirmation, challenge and code replay, old token rejection, refresh, the payment verification window, password reset, admin invitations, and both participant sign-in paths.
- No-emit TypeScript passed for both apps. Inline Playwright Chromium via `node -` at `localhost:3000` passed first-time enrollment and an incorrect email-code retry at 390 px, and returning admin sign-in at 1440 px, with intercepted API responses. The scoped `git diff --check` passed. Scoped frontend lint reported seven pre-existing errors and one warning in account settings and password screens.
- Live email delivery and production-shaped cookie behavior remain unverified. See the [rollout and recovery guide](registration/ADMIN_MFA_ROLLOUT.md). Provider permissions, finance roles and dual approval remain follow-up work.
- Updated the single-account admin seed to read credentials from the ignored backend `.env`, create accounts at the admin role, and preserve existing MFA enrollment. The backend no-emit type check passed. After the user confirmed the configured development or staging target, `node --import tsx src/scripts/createAdmin.ts --allow-non-loopback` completed with an acknowledged account creation. First sign-in and MFA email delivery were not exercised.

### Commitment levy pricing

- New checkouts default to NGN 25,000 for applicants residing in Nigeria and USD 35 for applicants residing elsewhere. Public pricing, application estimates and manual payment defaults use the same backend prices. The pricing record replaces the old levy environment values. The existing payment amount remains authoritative for pending and completed attempts.
- The commitment levy form under Admin → Overview → System is visible to superadmins. The server requires the superadmin role and recent MFA, validates both amounts in minor units, and logs an audit event on save.
- No-emit TypeScript passed for both apps. Scoped ESLint passed for the pricing form, hook and homepage pricing component. A scoped `git diff --check` passed.
- Ran eight selected scenarios from `tests/registration-concurrency.mjs` via `node --import tsx --input-type=module -`, using a disposable database on the local replica set at port 37118. Mocked provider checks passed for new and existing quotes, coupon amounts, bank transfers, pricing authorization and validation. The full suite still stops at an older fixture that expects new NGN checkouts to initiate through Flutterwave. The current code initiates them through Paystack.
- Inline Playwright Chromium via `node -` at `localhost:3000` verified the superadmin price form, regular-admin visibility, and that changed prices appear on the homepage and About page. A second run verified the NGN and USD estimates on resumed applications using the saved countries of residence. Live provider checkout and deployment remain outside these local checks.

### Pathway partner application

- Applied the Pathway design to the public `/partners/apply` form and confirmation. Grouped organization details, optional placements and primary contact. Moved program and profile destinations into a compact header menu. Reused the registration support footer. Added a native logo picker with removal and focus on errors and confirmation. Retained the existing intake fields and API payload.
- From `ifip-frontend`, `node node_modules/typescript/bin/tsc --noEmit --incremental false` and targeted ESLint for `app/partners/apply` passed. The scoped `git diff --check` passed.
- Inline Playwright Chromium at 320, 390, 768 and 1440 CSS px verified required-field focus, optional-opening submission, adding and removing openings, conditional location, sector retry, upload success and recovery, retained data on submission failure, and confirmation focus. Desktop and mobile captures use intercepted data. Live upload, partner submission, email and administration review remain unverified.

### Waitlist registration copy

- Changed the email and admin preview to show the scheduled registration start and close dates with a link to check current availability. The worker still sends during an eligible registration window.
- Ran `tests/cohort-operations.mjs` through `node --import tsx --input-type=module -` with the connection redirected to a disposable database on the local replica set at port 37118 and the email API mocked. The test passed and confirmed no notification before registration starts, both dates in the sent copy, the availability link, recipient cutoff, deduplication and retry. No real email was sent.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed in both apps, and the scoped `git diff --check` passed. The preview was source-checked. The local frontend was unavailable for browser verification.
