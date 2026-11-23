# IFIP modernization progress

## Existing applicant recovery after intake closure

- On 23 November 2026, the user authorized recovery for existing registrations. The applicant start endpoint now checks for an existing account, then a saved applicant draft. A saved draft can receive the existing OTP when registration is closed or full; a new email still receives the current closed/full response. OTP verification still proves ownership before restoring the draft. Checkout continues to enforce the active cohort and capacity.
- The closed/full waitlist screen offers “Already started? Verify your email to continue.” It carries over an email already typed into the waitlist field. If the address has no saved draft, the start response returns to the waitlist with that email retained.
- Backend `node --import tsx tests/registration-availability.mjs` passed with fixtures covering saved drafts during closed/full intake and new applicants still blocked. Backend `node node_modules/typescript/bin/tsc --noEmit --incremental false` and frontend `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` passed. Scoped ESLint retained the same five errors and fifteen warnings as HEAD, with matching rule and message counts. `git diff --check` passed. Inline Playwright Chromium at 375 CSS px, with API responses intercepted, verified the closed-intake recovery action, email carryover, OTP entry, and return to waitlist for an address without a draft. Real MongoDB, Redis and email integration remain open under REG-00 because the local Docker engine was unavailable.
- Next step: verify real draft recovery and checkout eligibility on isolated staging. Commit/deployment remain pending explicit authorization.

## Shared registration availability rules

- The user authorized the backend consistency correction on 23 November 2026. Preserved the preceding uncommitted entry UI and tracker changes. Extracted the existing active-registration-window and capacity helpers into `services/registrationAvailability.ts`; payment keeps compatibility exports and its existing capacity behavior. Registration status and applicant start now use the shared helpers. Applicant start no longer counts unrelated cohorts against the legacy global cap.
- Applicant start returns `REGISTRATION_CLOSED` when no intake is currently accepting applications, `COHORT_FULL` when the cohort's existing enrollment/reservation rules say it is full, and a retryable 503 if the lookup fails. These outcomes precede OTP storage and delivery. Checkout and enrollment validation remain in place.
- This supersedes the submission preflight described below: the frontend now sends directly to applicant start without waiting for or retrying the background status lookup. Both closure codes show the waitlist and preserve the entered email. A late background response cannot overwrite the start result. Initial email form display remains immediate.
- Backend `node --import tsx tests/registration-availability.mjs` passed with isolated model, Redis and notification fixtures. It checks shared query scope and registration-window predicates, current-cohort cap versus the legacy global cap, enrolled and reserved capacity, closed/full responses, duplicate email, lookup failure and Redis failure without OTP delivery. The initial fixture lacked the registration end date required by the status response; adding that field fixed the fixture. An invocation from the repository root could not resolve backend-local tsx; rerunning from `ifip-backend` passed.
- Backend `node node_modules/typescript/bin/tsc --noEmit --incremental false` and frontend `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` passed. The frontend ESLint API comparison with HEAD retained the same rule/message counts (five existing errors, fifteen warnings). `git diff --check` passed.
- Inline `node -` Playwright Chromium against the isolated frontend at port 3107, with all API traffic intercepted, passed slow-status submission, failed-status submission, server closed/full outcomes, retry after a start 503, retained email, and late status responses after OTP or closure. These follow-up checks used 375 CSS px; the preceding entry checks cover other widths. Local font download used fallback typography.
- `docker ps` failed both inside and outside the sandbox because Docker Desktop's engine was not running. No live MongoDB/Redis, email provider or staging tests were executed. The new harness verifies controller behavior and query construction, not database query execution or transactional integration. No production changes or deployment. Next step: run isolated database integration and staging registration verification before release.

## Immediate applicant registration entry

- On 23 November 2026, the user authorized removing the blocking availability experience. The working tree was clean. This supersedes REG-01's initial checking/error screen for this follow-up; REG-00 staging coverage remains open.
- The email form now renders while the existing availability request runs quietly. Unknown or failed responses do not claim registration is closed or open. Confirmed closed/full responses retain the waitlist and copy the entered email. Sending a code shares a pending lookup, or retries a failed lookup; an unresolved result gives an inline retry instruction and preserves the email. Existing OTP, resume, checkout and enrollment contracts remain in place.
- Frontend `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` passed. Scoped ESLint initially identified a new effect-state diagnostic, which was fixed. An ESLint API comparison with HEAD retains the same five errors and fifteen warnings, with matching rule/message counts after excluding shifted source-line excerpts. `git diff --check` passed.
- Ran inline `node -` Playwright Chromium against `IFIP_ISOLATED_DEV=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:59999/api/v1 node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3107`. All API traffic was intercepted. Verified immediate entry before a delayed response, sharing the pending check when sending, failed status with retry to OTP, malformed status without OTP, confirmed closed/full without OTP, and server COHORT_FULL after an open status. Entered email survived failures and waitlist handoff. Waitlist heading received focus. No horizontal overflow at 320, 375, 768 and 1280 CSS px in the exercised states. An initial harness assertion matched Next's route announcer as well as the form alert; scoping that assertion to the form fixed the harness.
- Reviewed the [mobile entry capture](registration/availability-entry-mobile.png). Local Sora loading failed and the page used fallback typography. Real mail delivery, production latency, staging integration, screen-reader behavior and the full registration journey were not verified. No backend, dependency, deployment or production changes.
- Separate backend recommendation: use one shared active-cohort/date/capacity rule in registration status and applicant start, with final validation at checkout/enrollment. Source inspection found that applicant start counts all non-withdrawn applications against the global cap, whereas registration status checks the active cohort. This discrepancy can produce contradictory full results; it is not proof of the reported production cause. Backend changes need separately authorized scope under the repository instructions.
- Next step: review this local entry behavior and scope the backend consistency correction. Commit and deployment require explicit authorization.

## Homepage AI workplace curriculum

- The user approved the revised two-column preview on 22 November 2026. Added **AI for Effective Workplace Practice** after Practical execution, with the three approved learning outcomes. Professional Certificate now appears in a tinted panel beneath the four learning cards, retaining the shared certificate name and icon and the existing certificate information. The guide destination and other homepage sections are unchanged.
- The grid uses one column below 640 CSS px and two above it. Shared grid rows align each pair's heading area and list start without fixed card heights. The breakpoint allows room for the existing site typography. The working tree was clean before this change.
- From `ifip-frontend`, `node node_modules/eslint/bin/eslint.js app/page.tsx` and `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` completed without diagnostics (exit 0). `git diff --check` passed. Whole-project lint and a production build were not run for this static section change.
- Ran inline Playwright Chromium against `IFIP_ISOLATED_DEV=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:59999/api/v1 node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3107`, with API traffic intercepted. At 320, 375, 639, 640, 768 and 1280 CSS px, verified four learning cards in reading order, the existing guide target, no horizontal overflow, equal paired card heights and aligned list starts. RTL at 1280 px had no horizontal overflow. The guide accepted keyboard focus and a fresh load reported no page errors.
- Reviewed [desktop](homepage/curriculum-ai-1280.png) and [mobile](homepage/curriculum-ai-375.png) captures. Navigation links and the development indicator were hidden only for section captures; the fixed header shell still appears in the desktop capture. Local Google Fonts access failed, so these captures use fallback typography. The dev server also logged the previously recorded reduced-motion hydration warning in the hero entrance. No actionable layout findings in the tested curriculum section. At 200% CSS zoom the section fits; the existing top navigation extends beyond the viewport. Actual browser zoom, screen-reader testing, translated copy and production Sora rendering are not verified. This does not establish whole-page accessibility approval.
- Next step: review the local result with the production font available. Commit and deployment remain pending explicit authorization.

## Session expiry investigation

- Source review with `rg -n` traced the admin timer, shared API client, and Express refresh handler. Admin refresh runs two minutes before access expiry and uses the refresh cookie alone. The shared 401 recovery path also sends the stored refresh token. Both client paths redirect to the session-expired page on refresh failure.
- An inline `node` check loaded `ifip-frontend/lib/api/auth.ts` with TypeScript transpilation, a mocked clock, storage, and API response. Successful refresh replaced the access token and rescheduled. A missing-cookie 401, HTTP 503, and timeout each cleared the stored session and redirected on the first attempt, while the fixture access token still had two minutes left.
- Production token lifetime, refresh-cookie delivery, and the failing request from the reported session have yet to be verified.
- Implemented shared client renewal for background refresh and protected API requests. It uses the existing refresh-cookie and stored-token support, shares one in-flight request per session, retries temporary network and server failures, and clears the session on refresh rejection with HTTP 401. Admin dashboard startup now offers retry when loading fails while a token is present. Server token lifetimes and MFA policy are unchanged.
- An inline `node` check with an Axios test adapter passed shared renewal, concurrent request replay, the stored-token fallback, HTTP 503 recovery, timeout retention, HTTP 401 sign-out, a refresh completing after local sign-out, and background retry timing. The standard no-emit build check encountered malformed generated dev route types. An otherwise equivalent TypeScript API check passed with the existing build route types substituted in memory.
- Playwright Chromium against the local frontend with intercepted API responses passed the admin startup retry, stored-token renewal after a 503, and redirect after a rejected refresh. Scoped ESLint added zero diagnostics across the edited files. `git diff --check` passed. Deployment and authenticated production verification remain open.

## Unified admin Partners desk

- The Placements sidebar opens one Partners desk with Active Partners, Partner Applications, and Intern Requests. Talent pool visibility is under Active Partners. Each review queue has a pending count and its own filters. Superadmin access is required to see and load Partner Applications.
- The Matching Desk, new dashboard notifications, and email buttons link directly to Intern Requests. The former Partner Requests route redirects to that tab for bookmarks and previously sent links. Existing Partner Applications links continue to open the application queue.
- Frontend `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false`, backend `node node_modules/typescript/bin/tsc --noEmit --incremental false`, and `git diff --check` passed. ESLint API checks of the affected frontend files against the corresponding `HEAD` versions found no added diagnostics. Existing diagnostics remain.
- Inline Playwright Chromium with `IFIP_ISOLATED_DEV=1` and intercepted API responses verified keyboard and history navigation, both legacy redirects, role visibility and API gating, talent pool updates, application approval, intern request approval and decline, pending counts, filters, and reflow at 320 and 375 CSS px. The dev server used fallback typography when Sora could not download. Staging, live data, and email delivery were outside the local checks.

## Cohort payment records and resolution

- Without a saved selection, the admin cohort selector prefers the open registration intake, then the most recent active cohort, then the newest cohort. Payment records, pagination and status counts use the selected cohort. Revenue is shown by currency. Search, status and provider filter the records within that selection.
- Bank transfers keep their recorded intake. New payments keep the intake captured at checkout or manual recording. Older records use a linked application or applicant draft where available. Records without a reliable assignment appear under Awaiting Assignment and All Cohorts.
- Linked payment reviews switch to the record's cohort. A gateway override checks the displayed cohort on the server. The existing bank transfer review uses the transfer's recorded cohort.
- `$env:IFIP_COHORT_TEST_MONGO_PORT='37129'; node --import tsx tests/cohort-operations.mjs` passed on a disposable loopback MongoDB replica set. It covered saved and legacy attribution, Awaiting Assignment, pagination, bank transfer filters, revenue by currency, wrong-cohort rejection, and a valid gateway resolution reflected in the summary. Email used the existing test adapter.
- Inline Playwright Chromium with intercepted APIs verified the open intake default ahead of a future intake, separate NGN and USD totals, a late response after a cohort switch, the gateway resolution payload and updated detail, the bank transfer deep link, Awaiting Assignment, and 375 CSS px mobile reflow. Next dev used fallback typography when the Sora download failed. Staging and live payment operations remain pending.
- Frontend `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false`, `node node_modules/eslint/bin/eslint.js app/admin/payments/page.tsx`, and scoped `git diff --check` passed. Backend `node node_modules/typescript/bin/tsc --noEmit --incremental false` initially passed. The latest run reports two TS2769 errors in the concurrently edited hiring outcome controller, outside the payment changes.

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

- The public partner form and intake API require an organization description. A local Playwright run with an intercepted API verified empty-field focus, whitespace rejection and submission of a trimmed description. Partner page ESLint, backend no-emit TypeScript and frontend no-emit TypeScript with malformed generated dev route types excluded passed. The shared API service file has existing ESLint errors. The live API was outside the browser check.

### Pathway participant dashboard

- Applied Pathway styling to the participant overview, pre-launch and withdrawn screens, and shared dashboard navigation. The coursework action uses the first module in progress or available to start, with a link to the full module list when there is no next module. Learning progress uses module and assessment records. Session failures are distinct from an empty timetable, and the CV shortcut opens the existing Documents section.
- Frontend route generation and `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` passed. Scoped ESLint and `git diff --check` passed.
- Inline Playwright using intercepted responses covered 320, 375, 768 and 1280 CSS px, module selection and progress, meeting links, session retry and empty state, the CV shortcut, keyboard dismissal and focus return, pending or unassigned cohort, both launch overrides, withdrawn application, admin preview, and the partner and signed-out redirects. Desktop, mobile and pre-launch captures use fallback typography because the local Sora download failed. Live enrollment, screen-reader coverage and the production build remain unverified.

### Pathway partner dashboard

- Applied Pathway styling to the partner overview and shared portal navigation. Placed a shortcut to pending decisions in the organization header, retained the existing recruitment totals, and grouped interviews by decision required and upcoming. Distinguished errors from empty lists. The outcome dialog requires a selection and only shows notes where the existing endpoint saves them.
- From `ifip-frontend`, `node node_modules/next/dist/bin/next typegen`, `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false`, and `node node_modules/eslint/bin/eslint.js app/partner-portal/page.tsx app/partner-portal/layout.tsx` passed. The scoped `git diff --check` passed.
- Inline Playwright with intercepted APIs passed at 320, 375, 768, and 1280 CSS px. Covered navigation collapse and mobile keyboard dismissal, focus return, the pending-decision shortcut, failure and retry for loading and saving, both outcome payloads, the empty queue, and redirects for signed-out and denied sessions. Inspected desktop and mobile captures using sample data. The preview used fallback typography after the Sora request failed. Live partner data and production build were outside these checks.
- Proposed next step is to surface the API's count of job applications awaiting review and link partners to the relevant openings. Add role and stage filters if longer queues make scanning difficult.

### Custom partner sector

- Selecting Other in `/partners/apply` reveals a required sector-name field. The existing `sectorTags` array carries the trimmed custom name alongside any standard selections. Unchecking Other hides the field and excludes its value from the submission.
- From `ifip-frontend`, `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` and `node node_modules/eslint/bin/eslint.js app/partners/apply/page.tsx` passed.
- Inline Playwright Chromium with an intercepted partner API verified keyboard access, rejection of empty and whitespace-only entries, retention after a failed submit, and the trimmed value in the successful retry payload. Checked reflow at 320, 375, 768 and 1280 CSS px. Live submission and staging remain unverified.

### Waitlist registration copy

- Changed the email and admin preview to show the scheduled registration start and close dates with a link to check current availability. The worker still sends during an eligible registration window.
- Ran `tests/cohort-operations.mjs` through `node --import tsx --input-type=module -` with the connection redirected to a disposable database on the local replica set at port 37118 and the email API mocked. The test passed and confirmed no notification before registration starts, both dates in the sent copy, the availability link, recipient cutoff, deduplication and retry. No real email was sent.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed in both apps, and the scoped `git diff --check` passed. The preview was source-checked. The local frontend was unavailable for browser verification.

### Cohort creation email

- Successful cohort creation triggers an email to other opted-in admins and superadmins. The email follows the IFIP layout with a schedule and a link to the admin overview. The recipient list excludes the creator and the send is independent of waitlist notification settings.
- Ran `tests/cohort-operations.mjs` through `node --import tsx --input-type=module -` against a disposable database on the local replica set at port 37118 with mocked email delivery. Checks passed for recipients, a future registration window, optional training dates, waitlist independence, and the admin link. The backend no-emit TypeScript check and scoped `git diff --check` passed. Live email delivery remains unverified.
- Rendered the captured email HTML in Chromium through an inline `node -` check. The heading, schedule and admin link fit without horizontal overflow at 320, 390 and 1024 CSS px.

### In-session admin password confirmation

- Levy pricing, manual payments, payment resolution, bank-transfer actions, fee coupons, and cohort waitlist resends use the same password prompt when the initial verification window expires. A successful confirmation retries the pending action with its original inputs. The confirmation is valid for ten minutes in the same admin session. Initial admin sign-in still requires MFA.
- From `ifip-backend`, `node --import tsx tests/admin-mfa.mjs` passed against a disposable database on the local MongoDB container. It exercised the confirmation requirement on all eleven protected routes, successful levy updates, role checks, rate limiting, expired and tampered proofs, session binding, and token refresh. Email delivery used a test fixture.
- Inline Playwright Chromium at 390 CSS px exercised the levy form with intercepted API responses. It verified keyboard focus, Escape, retained prices, an incorrect-password retry, successful save with the original values, and reuse on a second save. The Next dev server used the Sora fallback font.
- Backend no-emit TypeScript and scoped frontend ESLint for the password dialog passed. Frontend no-emit TypeScript passed after excluding the pre-existing malformed generated `.next/dev/types/validator.ts`. Staging browser and API verification remains open.

### Production frontend type-check

- `next build` now uses `tsconfig.build.json`, which includes production route types and excludes generated development types.
- `tsc --project tsconfig.build.json --listFilesOnly` confirmed that the partner portal source and production route validator were included and the development validator was excluded. `tsc --project tsconfig.build.json --noEmit --incremental false` passed.
- `npm run build` passed with the malformed development validator still present. The first attempt could not reach Google Fonts for the existing Sora font. The retry with network access finished type-checking and generated all 58 static pages.

### Cohort-scoped admin applications

The later [pending applicant work queue](#pending-applicant-work-queues) builds on this workspace.

- The unified `/admin/applications` workspace defaults to Paid applications and links to Pending applicants at `?view=pending`. The old pending URL redirects there. Both views use the shared admin cohort selector. A cohort switch clears the current view's filters and applicant selection.
- Pending rows, pagination, country and stage totals, payment-attempt and reminder totals, inactivity, and CSV use the selected cohort by default. A saved cohort ID takes precedence. For a draft without one, its creation timestamp must fall within exactly one configured registration window. Drafts with missing or ambiguous matches remain under Awaiting Assignment and All Cohorts. Inactivity counts every qualifying record in the selected cohort.
- Backend `node node_modules/typescript/bin/tsc --noEmit --incremental false` and frontend `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` passed. The default frontend TypeScript command hit the existing malformed generated development route validator. Targeted ESLint found no new findings in the application views compared with their original files. The shared layout and services retain existing lint findings.
- Backend `node --import tsx tests/cohort-operations.mjs` passed against a disposable loopback MongoDB replica set. It covered explicit and inferred cohorts, overlapping and unmatched records, list and summary scope, filters, full-cohort inactivity, and exported CSV rows. Email used an intercepted test provider.
- Inline Chromium with intercepted API responses exercised the legacy redirect, both application views, cohort changes with a delayed prior response, Back, and CSV default and download. The workspace stayed within the viewport at 320, 375, 768 and 1280 CSS px. Next dev used the Sora fallback font. Authenticated staging data and live admin write actions remain unverified.

### Homepage host application link

- The second hero action reads **Apply to host interns** and links to the existing partnership application at `/partners/apply`.
- From `ifip-frontend`, `node node_modules/eslint/bin/eslint.js components/home/HeroSection.tsx` and `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` passed. The default type check hit the existing malformed `.next/dev/types/validator.ts`.
- `git diff --check` passed for the edited files. Inline Playwright Chromium reached the local homepage, but the dev server refused the connection on the retry. Responsive layout and click-through remain unverified.

### Homepage Professional Certificate

- Added Professional Certificate and Islamic Finance Workplace Readiness Certificate immediately before Demonstrate readiness in the homepage Program Pathway.
- From `ifip-frontend`, `node node_modules/eslint/bin/eslint.js components/home/HeroSection.tsx` and `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` passed.
- Inline Playwright Chromium verified the wording, row order and wrapping at 320, 375, 768 and 1280 CSS px with API traffic intercepted. The first run timed out during dev compilation. The retry passed. Deployment remains pending.

### Homepage curriculum certificate card

- Added the approved Professional Certificate card as the fourth item under What you’ll learn. The card uses the existing curriculum card markup, and the card and pathway share the certificate name and icon. The curriculum grid uses one column below 520 CSS px, two from 520 through 799 CSS px, and four from 800 CSS px.
- From `ifip-frontend`, `node node_modules/eslint/bin/eslint.js app/page.tsx components/home/HeroSection.tsx components/home/program-certificate.ts` and `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` passed. Scoped `git diff --check` passed.
- Inline Playwright Chromium opened `/#curriculum` on the isolated Next dev server with API calls intercepted. At 320, 375, 519, 520, 768, 799, 800 and 1280 CSS px it verified all three column layouts, card order and matching styles, equal heights within each row, no horizontal overflow, matching pathway copy, and the existing guide link target. The dev server used a fallback for Sora and logged a reduced-motion hydration warning from the hero entrance. Staging and deployment remain pending.

### Pre-registration waitlist and confirmed clearing

- The selected cohort's overview count, Waitlist page, and email recipients use the saved registration opening timestamp. All Cohorts continues to show the program-wide active list.
- Edit cohort shows delivery status and can queue a send or retry. Previously sent recipients still on the list can be included explicitly. The existing worker processes the stored queue. Send and clear use the existing admin password confirmation.
- Clearing removes only active, pre-registration recipients with a recorded provider acceptance for the edited cohort. Failed, unconfirmed and later signups remain. Delivery records remain available for the cohort's sent count.
- Backend `node node_modules/typescript/bin/tsc --noEmit --incremental false`, frontend `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false`, and targeted ESLint for `components/admin/CohortWaitlistControls.tsx` passed.
- Backend `node --import tsx tests/cohort-operations.mjs` passed on a disposable MongoDB replica set with an intercepted email provider. It covered the opening-date boundary, concurrent enqueue and worker calls, retry, confirmed-only clearing, and preservation of later signups. The admin MFA harness passed on the same disposable replica set using a loopback URI override and verified password confirmation on both waitlist mutations.
- Inline Chromium with intercepted APIs passed the edit modal at 375 CSS px, including password confirmation, queued-to-sent status polling, clearing one confirmed recipient while a failed send remains, and overview refresh. The linked Waitlist page requested the selected cohort. The overview fit at 375 and 1280 CSS px. Scoped `git diff --check` passed. Live provider and staging verification remain open.
- The waitlist worker now logs each cohort's accepted and failed totals for completed attempts in a worker run. Backend `node node_modules/typescript/bin/tsc --noEmit --incremental false` and `node --import tsx tests/cohort-operations.mjs` passed. The disposable database run printed both acceptance and failure totals using intercepted email responses. The harness also logged an asynchronous audit insert during database teardown. Production logging remains pending deployment.

### Pending applicant work queues

- Added work filters, visible cohort and result status, page-scoped selection, current-results export, and direct links from pending payment rows to the existing payment review. Drawer, composer and offline payment use named dialogs with keyboard dismissal and focus return.
- Reminder sends validate the selected scope, unpaid status and cooldown on the server. Concurrent requests claim the recipient before contacting the provider. Acceptance updates reminder history and cooldown. Failures keep the previous resume link and can be retried. CV-upload notifications use the same confirmation path.
- Offline enrollment requires the applicant's existing signed declaration and displays the amount, evidence, and intended cohort. The transaction commits payment and enrollment together. An existing assignment takes precedence, then the currently open intake. Repeating the same payment reference reuses an already completed enrollment.
- Backend `node node_modules/typescript/bin/tsc --noEmit --incremental false` and frontend `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` passed. Scoped ESLint still reports existing issues in the edited pages and shared export modal. The new dialog passed lint.
- `node --import tsx tests/cohort-operations.mjs` passed on a disposable replica set. It covered provider failure, successful retry, paid and out-of-cohort skips, concurrent reminder requests, list-to-CSV filter agreement, unsigned declaration rejection, payment rollback on a reference collision, and enrollment replay.
- Chromium with intercepted APIs at 1280 and 375 CSS px verified reminder failure and retry, keyboard dismissal and focus return, page-scoped selection, filter pagination reset, current-results CSV, and the bank-transfer link into Payments. Staging, live email delivery, and real payment operations remain unverified.
- `node --import tsx tests/registration-concurrency.mjs` stopped at its first provider-call assertion. The fixture expects Flutterwave for a new Nigerian checkout. The checkout implementation in HEAD already initializes those payments through Paystack.

### Partner CV requests and intake job openings

- Partner profiles display a **View CV** link when a document is available. Older records can use the CV on the intake linked by the participant's successful payment when the enrolled application has no CV field. The profile and request action use the current partner access and candidate status checks.
- **Request CV** creates a dashboard notification naming the organization and linking to **Settings → Documents**. The API keeps one unread request per organization and participant, including concurrent requests. A partner can send another request after the participant reads the previous one.
- Approving a partner application saves the organization and its submitted roles together. The roles appear for review in admin and partner Job Openings. Opening approval makes the records available in the participant dashboard and triggers the existing in-app and email announcements. Recorded selections, offers, hires and placements are excluded from both channels. Participant email preferences and the existing coursework requirement still apply.
- Backend `node node_modules/typescript/bin/tsc --noEmit --incremental false`, frontend `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false`, and `git diff --check` passed. Scoped ESLint matched HEAD with 21 existing errors and five existing warnings across the edited frontend files.
- `node --import tsx tests/partner-recruitment.mjs` passed on a disposable MongoDB replica set with an intercepted mail provider. It covered concurrent partner and opening approvals, status before and after publication, participant application, exclusion across both delivery channels, email preferences, request deduplication, legacy CV resolution and access denial.
- Inline Playwright Chromium with intercepted APIs covered the CV link and missing-CV state, keyboard submission, retry, duplicate feedback, and reflow at 375 and 1280 CSS px. The participant settings link scrolled to the upload controls at 375 CSS px. Next.js used fallback typography because the Sora download failed. Staging, live email and live CV storage remain unverified.

### CV request email and homepage partner jobs

- A CV request also emails participants who have email notifications enabled. The email names the partner and links to the Documents panel. The dashboard notification is saved first. If the provider rejects the email, the partner can retry from the same profile and the existing dashboard notification is reused. Concurrent requests for the same unread notification share one email attempt.
- Homepage Active Openings reads published partner jobs through the public endpoint using the same deadline and status filter as the participant dashboard. The public response contains card details only. The homepage refreshes these listings on each page load and skips its old browser cache. The legacy admin openings screen links staff to Job Openings for publication.
- Backend and frontend no-emit TypeScript passed. The scoped ESLint comparison found zero added diagnostics in the seven edited frontend files.
- `node --import tsx tests/partner-recruitment.mjs` passed on a disposable MongoDB replica set with intercepted email. It covered the email recipient and upload link, concurrent CV requests, preference opt-out, mail provider failure and retry, public feed publication and closure, exclusion of pending, rejected, expired and legacy manual listings, and the public field allowlist.
- Inline Chromium with intercepted APIs passed at 375 and 1280 CSS px for published cards, partner name, keyboard access and ignoring legacy browser data. At 375 CSS px, opening error/retry/empty states and the partner's CV email retry passed. The local preview used fallback typography after the Sora download failed. Deployment and live email delivery remain unverified.

### Company details on CV requests

- The participant's CV request opens a page with the requesting company name, description, sectors, and website when available. The page links to the existing **Settings → Documents** upload controls. The API resolves the company from the recipient's stored notification and returns only the company fields needed for the page.
- Existing in-app CV notifications resolve to the new page. New CV request emails include the company description and sectors when available and link to the same request. Participant sign-in preserves the CV request destination through a path allowlist.
- Backend and frontend no-emit TypeScript passed. Scoped ESLint found zero added diagnostics. Chromium with intercepted APIs covered the signed-out email path, return after participant sign-in, company details and website, notification navigation, upload handoff, error and retry, unavailable request, and reflow at 375 and 1280 CSS px. The local preview used fallback typography after the Sora download failed. Deployment and live email remain unverified.
- `node --import tsx tests/partner-recruitment.mjs` passed on a disposable MongoDB replica set with an intercepted email provider. It verified the recipient-only query, access after the notification is read, the public company field allowlist, the updated link for older stored notifications, and HTML escaping and destination in the request email.

### Company hiring override

- **Confirm hire** is available in Admin Placements and Job Openings on existing company records, including those with an interview still pending. The audited hiring outcome remains the source of truth. The company sees the participant as placed or hired and the overview counts each confirmed participant once across both paths.
- Confirmed hires drop out of partner interview tasks, the scheduled interview count and the reminder worker's selection. The partner portal continues to use the organization-scoped records and the confirmation note stays private.
- Backend `node node_modules/typescript/bin/tsc --noEmit --incremental false` and frontend `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` passed. The default frontend TypeScript config still reports the generated admin-layout export error. Scoped ESLint matched HEAD with 23 errors and 21 warnings. `git diff --check` passed.
- `node --import tsx tests/partner-recruitment.mjs` and `node --import tsx tests/cohort-operations.mjs` passed against disposable MongoDB 7 with intercepted email. Verified stale write rejection, private notes, isolation between companies, hire deduplication and removal from partner interview tasks.
- Inline Playwright Chromium with intercepted APIs passed at 375 and 1280 CSS px. It exercised saving a confirmed hire from a matched placement in Admin and checked the company dashboard count, placement status, Hired filter and removed outcome actions. Signed-in staging verification remains open. No deployment or production data change was made.

### Matching Desk qualification

- Matching Desk uses the same task-reward summary as the admin dashboard’s Qualified count. It joins qualified participant IDs to the selected cohort’s application list and includes participants already marked placement-ready. The application list continues to exclude withdrawn records.
- Inline Playwright Chromium with intercepted APIs verified eligibility, search, opening the matching form, retry after a failed qualification request, and cohort switching at 375 and 1280 CSS px. Live cohort counts and staging matching remain unverified.
- Frontend `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit --incremental false` and `git diff --check` passed. Scoped ESLint found zero new diagnostics compared with HEAD. The page has three existing errors and seven existing warnings.
