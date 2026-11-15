# IFIP modernization product requirements

IFIP is the Islamic Finance Internship Preparatory & Placement Program. Its existing platform supports program discovery, application and enrollment, preparatory training, assessment, and placement with partner organizations. The modernization improves clarity, consistency, accessibility, and mobile use while preserving working behavior. The [registration audit](registration/REGISTRATION_AUDIT.md) identifies the initial issues, including ambiguous payment feedback, unclear recovery and inconsistent form labels.

## Users and requirements

| Users | Existing needs and modernization requirements |
| --- | --- |
| Public visitors and prospective partners | Understand the program, requirements, dates and opportunities. Find the existing applicant and partner application routes. Present only verified program content and claims. |
| Applicants | Know whether registration is available. Verify email, save and resume the six-step application, upload a CV, review the levy, complete checkout or waiver, and set up account access. Explain the next action using existing API evidence. |
| Enrolled participants | Find schedule, modules, assessments, resources, placement and openings. Show progress and eligibility according to existing access rules. |
| Partner organizations | Find eligible candidates, review requests and openings, manage interviews and placements, and see existing notifications. Preserve organization and candidate visibility. |
| Administrators and superadmins | Review and operate intake, payments, learning content, partner and placement workflows with clear permissions, filters and action outcomes. Preserve auditability and existing role checks. |

## Priority and exclusions

1. Registration and enrollment first, in the approved order [REG-00 through REG-08](registration/REGISTRATION_TASKS.md). REG-00 is next. Source implementation awaits approval.
2. Public website, applicant dashboard/LMS, partner portal and admin dashboard follow as separately scoped workstreams. Their order after registration is open. See [TASKS.md](TASKS.md).

Preserve existing routes, integrations, input rules, payloads, permissions and business rules. New features, backend redesign, database migrations, payment policy changes, new dependencies and production work need separate authorization. Registration UX requirements use existing API signals. The [engineering rules](RULES.md) and [audit risk list](registration/REGISTRATION_AUDIT.md#regression-risks-and-separate-approvals) define the boundaries.

## Success criteria

- A fresh applicant can finish the existing verification, form, checkout, enrollment and account setup path through authorized staging. Existing resume, waitlist, waiver and paid-draft paths retain their outcomes.
- Each tested failure or pending state explains the observed condition and an available next step. An inconclusive payment check cannot present the charge as failed or direct a charged applicant to pay again.
- A keyboard user can complete affected flows. Controls remain labeled, focused content stays visible, and primary actions remain reachable at 320 CSS px and 200% zoom. Check actual contrast and reduced motion.
- Each later workstream records and verifies its own existing critical journeys and role boundaries before release. Preserve working loading performance and responsive behavior against the baseline. Record regressions and unresolved coverage using the [QA checklist](QA_CHECKLIST.md).

Dependencies include review of the provisional [visual foundation](DESIGN.md), confirmed support/legal destinations, and safe test access for payment, email, storage and account flows. Current decisions and evidence are recorded in [PROGRESS.md](PROGRESS.md).
