# IFIP Modernization Tasks

## Active Workstream
Registration and enrollment redesign

See the [REG-00 through REG-08 backlog](registration/REGISTRATION_TASKS.md) and [verification evidence](PROGRESS.md).

## Current Status
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

**Paystack-first checkout implemented locally.** See the [implementation plan and staging configuration](registration/PAYSTACK_IMPLEMENTATION_PLAN.md). Hosted provider checks and live routing remain pending.

**International bank transfer implemented locally.** The [implementation and configuration](registration/INTERNATIONAL_BANK_TRANSFER_PLAN.md) cover transfer-only USD payments, private receipts, reconciliation, and password setup after approval. Staging verification remains pending.

**Commitment levy pricing updated locally.** New checkouts default to NGN 25,000 for Nigeria and USD 35 for other countries of residence. Superadmins can change both prices under **Admin → Overview → System**. See [verification](PROGRESS.md#commitment-levy-pricing).

## Homepage

- **Pathway approved and implemented locally.** See [progress and verification](PROGRESS.md#homepage-pathway-implementation). The [earlier homepage report](homepage/HOMEPAGE_HERO_VERIFICATION.md) is retained as historical evidence.
- **Professional Certificate added to the homepage pathway.** See [verification](PROGRESS.md#homepage-professional-certificate).

## Partner application

- **Pathway implemented locally.** The public intake form and confirmation use the registration styling. See [local verification](PROGRESS.md#pathway-partner-application).
- **Custom partner sector implemented locally.** Selecting Other reveals a text field and submits its value with the selected sectors. See [verification](PROGRESS.md#custom-partner-sector).

## Admin dashboard

- **Cohort operations implemented locally.** All-cohort overview, cohort creation, waitlist announcements, and admin hiring outcomes passed local checks. See the [verification and staging gaps](PROGRESS.md#admin-dashboard-cohort-operations-proposal).
- **Waitlist announcement copy updated.** The email and preview show the scheduled registration dates and link to current availability. [Verification](PROGRESS.md#waitlist-registration-copy)
- **Cohort creation email implemented locally.** Other admins and superadmins with email notifications enabled receive a formatted email when a cohort is saved. [Verification](PROGRESS.md#cohort-creation-email)
- **Optional training dates verified locally.** Registration can open before training is scheduled. Editors can add either training date later. See the [verification](PROGRESS.md#optional-cohort-training-dates).
- **In-session admin password confirmation implemented locally.** Levy prices and other protected admin actions resume after password confirmation. See the [verification](PROGRESS.md#in-session-admin-password-confirmation).
- **Cohort-scoped admin applications verified locally.** Paid applications and pending applicants share one workspace. Pending records, totals and CSVs follow the selected cohort by default. See [verification and staging coverage](PROGRESS.md#cohort-scoped-admin-applications).

## Deferred Workstreams
- Applicant dashboard and LMS
- Partner dashboard
- Platform-wide QA

## Approval Policy
The user approved the registration journey, task sequence and REG-01 source scope. See [RULES.md](RULES.md) for scope and verification. Backend reliability is a [separate backlog](registration/REGISTRATION_AUDIT.md#regression-risks-and-separate-approvals).
