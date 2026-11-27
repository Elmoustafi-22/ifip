# IFIP Modernization Tasks

## Active Workstream
Registration and enrollment redesign

See the [REG-00 through REG-08 backlog](registration/REGISTRATION_TASKS.md) and [verification evidence](PROGRESS.md).

## Current Status
- **Registration header alignment refined locally, 27 November 2026.** The approved layout removes the redundant “Already registered?” prompt, places Sign in before the mobile menu, and exposes program links on wide screens. See [verification](PROGRESS.md#registration-header-alignment).
- **Registration and sign-in visual refresh implemented locally, 27 November 2026.** The user approved the shorter classic presentation, selective icon controls and removal of routine underlines. See [progress and verification](PROGRESS.md#registration-and-sign-in-refresh-proposal). Full state and staging verification remain open.
- **Mongoose deprecation warning fix implemented locally, 24 November 2026.** Remaining backend `findOneAndUpdate()` calls using `{ new: true }` now use `returnDocument: 'after'`; see [verification](PROGRESS.md#mongoose-deprecated-update-option).
- **Request recovery and background reminders implemented locally, 24 November 2026.** Request timeouts have distinct feedback; applicants can enter a code after an uncertain response. Admin reminders use persisted jobs with progress and duplicate-submission protection. [Evidence and staging gaps](PROGRESS.md#request-recovery-and-background-reminders). Real MongoDB/worker restart and provider verification remain pending before rollout.
- **Registration pause now replaces the email form in its panel.** The separate banner and duplicate recovery section were removed during the pause; the form returns when the notice expires. [Local verification](PROGRESS.md#registration-pause-within-form-panel).
- **Temporary registration notice implemented locally.** A superadmin can publish a notice in Admin → Overview → System with an expiry time in Lagos time; new applications pause while saved applicants can recover. See [verification and rollout notes](PROGRESS.md#temporary-registration-notice).
- **Existing applicant recovery implemented locally.** Saved applicants can request a new verification code after intake closes or fills; new applicants still follow the waitlist. [Verification](PROGRESS.md#existing-applicant-recovery-after-intake-closure).
- **Returning participants can apply to a new cohort.** Existing participants with a prior cohort application can verify their email, start a fresh application, and pay the current cohort's fee. Current-cohort duplicates and non-participant accounts remain directed to sign in. Local type checks pass; isolated OTP, payment, and enrollment integration remains open under REG-00. See [verification notes](PROGRESS.md#returning-participant-enrollment-in-a-new-cohort).
- **Registration availability consistency implemented locally.** Applicant start and registration status share the cohort/window/capacity helpers; sending a code no longer waits on a separate status request. [Verification and integration gaps](PROGRESS.md#shared-registration-availability-rules).
- **Immediate applicant registration entry implemented locally.** The email form renders while availability loads quietly; failed checks retain the form, and confirmed closed/full intakes offer the waitlist. See [checks and the separate backend recommendation](PROGRESS.md#immediate-applicant-registration-entry).
- Project-wide documentation prepared for review. The [shared design direction](DESIGN.md) is provisional.
- **REG-00 partially verified.** The [baseline report](registration/REGISTRATION_BASELINE.md) contains the public and tokenless captures, checks, and defects. Isolated integration access and design sign-off remain open.
- **REG-01 complete locally.** The user approved this slice while REG-00 remains open. [Fixture results and screenshots](registration/REGISTRATION_REG01_VERIFICATION.md) are ready for review. Isolated staging verification remains pending.
- **REG-01B complete.** Final visual sign-off granted on 13 November 2026. See the [before/after screenshots and checks](registration/REGISTRATION_REG01B_VERIFICATION.md).
- **REG-02 complete locally.** [Email verification and resume](registration/REGISTRATION_REG02_VERIFICATION.md) passed isolated browser checks. Staging verification remains open.
- **REG-03 complete locally.** [Profile, academic forms, and progress](registration/REGISTRATION_REG03_VERIFICATION.md) passed isolated browser checks. Staging verification remains open.
- **REG-04 complete locally.** [Program interests, motivation, and CV upload](registration/REGISTRATION_REG04_VERIFICATION.md) passed isolated browser checks. Staging verification remains open.
- **REG-05 complete locally.** [Declaration, coupons and hosted checkout handoff](registration/REGISTRATION_REG05_VERIFICATION.md) passed intercepted browser checks. Gateway test-mode integration remains open under REG-00.
- **REG-06 complete locally.** [Payment verification, recovery and confirmation](registration/REGISTRATION_REG06_VERIFICATION.md) passed isolated browser checks. Gateway and staging integration remain open under REG-00.
- **Participant cohort handoff fixed locally.** The dashboard uses the assigned cohort name and training start date. [Local verification](PROGRESS.md#participant-cohort-handoff) covers two cohorts and unscheduled training. Live enrollment-to-dashboard coverage remains open under REG-08.
- **Mandatory administrator MFA implemented locally.** See the [rollout and recovery instructions](registration/ADMIN_MFA_ROLLOUT.md). Staging email, cookie behavior, and finance review remain open before production rollout.
- **Unified registration UI implemented locally.** The application, payment handoff and account screens use the approved registration direction. REG-07 account integration and REG-08 end-to-end verification remain open.
- **Checkout and enrollment concurrency changes verified locally.** Nine MongoDB replica-set scenarios passed with provider and notification fixtures. Release verification requires a transaction-capable MongoDB staging environment and provider test mode. See the [verification report](registration/REGISTRATION_UNIFIED_VERIFICATION.md).

## Payments

**Admin Paystack recovery implemented locally.** Pending Paystack records can be checked against the provider from Admin → Payments; the detail drawer distinguishes provider confirmation, enrollment, account setup, and tracked setup-email provider acceptance. Manual success override requires an evidence note. See [local verification and remaining staging checks](PROGRESS.md#admin-paystack-recovery-and-participant-handoff). Deployment remains pending explicit authorization.

**Cohort payment records and resolution implemented locally.** The shared selector scopes the payment list, counts and currency totals. Payment details and resolution carry the record's cohort. See [cohort payment verification](PROGRESS.md#cohort-payment-records-and-resolution).

**Paystack-first checkout implemented locally.** See the [implementation plan and staging configuration](registration/PAYSTACK_IMPLEMENTATION_PLAN.md). Hosted provider checks and live routing remain pending.

**International bank transfer implemented locally.** The [implementation and configuration](registration/INTERNATIONAL_BANK_TRANSFER_PLAN.md) cover transfer-only USD payments, private receipts, reconciliation, and password setup after approval. Staging verification remains pending.

**Commitment levy pricing updated locally.** New checkouts default to NGN 25,000 for Nigeria and USD 35 for other countries of residence. Superadmins can change both prices under **Admin → Overview → System**. See [verification](PROGRESS.md#commitment-levy-pricing).

## Email provider

**OutboxStack transport migrated locally.** Backend email templates and call sites use the shared OutboxStack adapter. Assessment announcement emails now fire only on the first transition to published, not draft creation or repeated publish requests. Staging sender-domain, API-key, delivery and rollback verification remain pending. See [migration evidence](PROGRESS.md#assessment-publish-email-trigger).

## Homepage

- **Registration deadline added locally, 27 November 2026.** The hero and open `/apply` entry show the active cohort's closing date as “Registration deadline.” See [verification and gaps](PROGRESS.md#public-registration-deadline).
- **Partner logo cards aligned locally.** A consistent logo area and centered names make mixed logo shapes read as one grid. See [verification](PROGRESS.md#homepage-partner-logo-alignment).
- **Full-page Framer Motion entrances implemented locally, 24 November 2026.** The header and hero slide in on load. Section copy, cards, card contents, buttons, listings, partner marks, pricing, FAQ rows, and footer reveal in short staggered steps as they enter view. Reduced-motion and focus overrides remain in place. See [verification](PROGRESS.md#homepage-full-page-motion).
- **Classic visual direction refined locally after full-page feedback.** The supplied `career.webp`, `curriculum.webp` and `application.webp` are used in the hero, curriculum and process. On mobile, `career.webp` fills the hero behind readable copy; the desktop hero stays split. The hero's extra status and placement text was removed while its cohort-aware action remains. The curriculum has four distinct, quiet card colors, numbered modules, Standard Assessment content and a certificate outcome panel. The eligibility-to-partner sequence has distinct surfaces and more deliberate motion; the public mobile bottom bar is removed. See [progress](PROGRESS.md#classic-home-and-registration-implementation).
- **Classic visual direction reviewed, 23 November 2026.** Home and registration review, image brief, typography proposal and dashboard-only mobile navigation scope are recorded in [progress](PROGRESS.md#home-and-registration-ui-review). Application source is unchanged; visual implementation is the next checkpoint.
- **Pathway approved and implemented locally.** See [progress and verification](PROGRESS.md#homepage-pathway-implementation). The [earlier homepage report](homepage/HOMEPAGE_HERO_VERIFICATION.md) is retained as historical evidence.
- **Professional Certificate added to the homepage pathway.** See [verification](PROGRESS.md#homepage-professional-certificate).
- **AI workplace practice added to the homepage curriculum.** The approved layout uses four learning cards in two columns with aligned headings and lists, followed by a full-width certificate panel. See [local verification](PROGRESS.md#homepage-ai-workplace-curriculum).
- **Active openings use published partner jobs.** The homepage uses the same status and deadline rules as participant Job Openings. See [verification](PROGRESS.md#cv-request-email-and-homepage-partner-jobs).

## Partner application

- **Admin partner organization records:** Contact email is optional when editing an existing organization and when directly creating one in Admin. A new organization without an email has portal access disabled, and its invite action stays unavailable until an email is added. Public partner applications still require contact email. Partner user fields sync only when explicitly changed; save failures show API error details. See [progress](PROGRESS.md#optional-contact-email-when-editing-a-partner).

- **Pathway implemented locally.** The public intake form and confirmation use the registration styling. See [local verification](PROGRESS.md#pathway-partner-application).
- **Custom partner sector implemented locally.** Selecting Other reveals a text field and submits its value with the selected sectors. See [verification](PROGRESS.md#custom-partner-sector).
- **Partner CV access, requests, and intake openings implemented locally.** Partners can view the CV on eligible profiles and request an upload or update by dashboard notification and email. Roles from approved partner applications enter Job Openings for review. Publication alerts exclude participants with a recorded selection, offer, hire or placement. See [recruitment verification](PROGRESS.md#partner-cv-requests-and-intake-job-openings) and [email verification](PROGRESS.md#cv-request-email-and-homepage-partner-jobs).
- **CV requests identify the requesting company.** Recipients can review company details from the dashboard notification or email link, then open their existing CV upload controls. See [verification](PROGRESS.md#company-details-on-cv-requests).

## Participant dashboard

- **Pathway overview and shared navigation implemented locally.** The overview highlights the next available module, shows coursework progress, and links to the timetable and documents. See [local verification](PROGRESS.md#pathway-participant-dashboard). Staging enrollment coverage remains open under REG-08.

## Partner dashboard

- **Pathway overview and shared navigation implemented locally.** Interview decisions have a direct entry point, and the outcome dialog supports keyboard use and retry. See [verification and follow-up ideas](PROGRESS.md#pathway-partner-dashboard).

## Admin dashboard

- **Partners desk unified locally.** Active Partners, Partner Applications, and Intern Requests share one sidebar entry. See [verification](PROGRESS.md#unified-admin-partners-desk).
- **Company hiring override implemented locally.** Admins can confirm a hire on an existing company placement or job application. See [verification](PROGRESS.md#company-hiring-override).
- **Qualified participants appear in Matching Desk.** The cohort-scoped candidate list uses the admin dashboard’s task-reward qualification and includes existing placement-ready participants. See [verification](PROGRESS.md#matching-desk-qualification).
- **Cohort operations implemented locally.** All-cohort overview, cohort creation, waitlist announcements, and admin hiring outcomes passed local checks. See the [verification and staging gaps](PROGRESS.md#admin-dashboard-cohort-operations-proposal).
- **Waitlist announcement copy updated.** The email and preview show the scheduled registration dates and link to current availability. [Verification](PROGRESS.md#waitlist-registration-copy)
- **Pre-registration waitlist and confirmed clearing implemented locally.** Edit cohort can send or resend email, track provider acceptance, and clear confirmed recipients. The worker logs per-cohort acceptance and failure totals. See [verification](PROGRESS.md#pre-registration-waitlist-and-confirmed-clearing).
- **Cohort creation email implemented locally.** Other admins and superadmins with email notifications enabled receive a formatted email when a cohort is saved. [Verification](PROGRESS.md#cohort-creation-email)
- **Optional training dates verified locally.** Registration can open before training is scheduled. Editors can add either training date later. See the [verification](PROGRESS.md#optional-cohort-training-dates).
- **In-session admin password confirmation implemented locally.** Levy prices and other protected admin actions resume after password confirmation. See the [verification](PROGRESS.md#in-session-admin-password-confirmation).
- **Cohort-scoped admin applications verified locally.** Paid applications and pending applicants share one workspace. Pending records, totals and CSVs follow the selected cohort by default. See [verification and staging coverage](PROGRESS.md#cohort-scoped-admin-applications).
- **Pending applicant work queues implemented locally.** The admin view verifies reminder outcomes, routes pending payments to review, and exports the current filters. See [verification](PROGRESS.md#pending-applicant-work-queues).

## Deferred Workstreams
- Participant workflow pages and LMS
- Partner portal workflow pages
- Platform-wide QA

## Approval Policy
The user approved the registration journey, task sequence and REG-01 source scope. See [RULES.md](RULES.md) for scope and verification. Backend reliability is a [separate backlog](registration/REGISTRATION_AUDIT.md#regression-risks-and-separate-approvals).
