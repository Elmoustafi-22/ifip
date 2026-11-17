# IFIP UI inventory

Routes below are backed by files in `ifip-frontend/app/`. Status describes redesign work, rather than whether the existing route is live. This is a source inventory. Confirm role and state behavior with the [QA checklist](QA_CHECKLIST.md) before redesigning a surface.

| Routes | Audience and screens | Important current states | Redesign status |
| --- | --- | --- | --- |
| `/`, `/about` | Public program discovery, home hero, pricing, opportunities, partners, FAQ and application entry links | Cached/cohort content, mobile navigation, available/unavailable registration links | Deferred |
| `/partners/apply` | Public organization intake | Draft, optional openings, submit, success and failure | Pathway implemented locally |
| `/apply`, `/apply/resume` | Applicant availability, waitlist, OTP, saved application, six steps and inline confirmation | Open/closed/full, waitlist duplicate, verification, resume, upload, coupon, checkout and paid draft | Audited, REG-00 next |
| `/verify-payment`, `/set-password` | Hosted callback and setup link for participant or invited user | Verifying, success, failure, missing/invalid token, password submission and account handoff | Audited, pending registration sequence |
| `/login`, `/forgot-password`, `/reset-password` | Shared auth and password recovery | Existing session, invalid credentials, MFA, generic reset request, invalid/expired link and success | Audited for registration handoff |
| `/dashboard` | Participant overview and shared dashboard navigation | Auth and launch gates, withdrawn application, coursework progress, live sessions, and retry | Pathway implemented locally. Landing route remains a registration QA boundary. |
| `/dashboard/schedule`, `/dashboard/resources`, `/dashboard/settings` | Participant schedule, resources, settings | Availability, profile and account edits | Page redesign deferred |
| `/dashboard/modules`, `/dashboard/modules/[id]`, `/dashboard/modules/[id]/outline`, `/dashboard/assessments`, `/dashboard/assessments/[moduleId]` | Participant curriculum, module content, task submission and assessment | Locked, active, complete, upload, timed attempt, results, review and retry eligibility | Deferred |
| `/dashboard/placement`, `/dashboard/job-openings` | Participant placement and opportunity tracking | Empty or existing placement, eligibility, active opening, application and outcome | Deferred |
| `/partner-portal` | Partner overview and shared portal navigation | Organization access, upcoming interviews, decisions, load failures, retry, and outcome recording | Pathway implemented locally |
| `/partner-portal/notifications`, `/partner-portal/settings` | Partner notification list and settings | Read/unread and save feedback | Page redesign deferred |
| `/partner-portal/interns`, `/partner-portal/interns/[id]`, `/partner-portal/requests`, `/partner-portal/placements` | Partner pool, candidate, interest requests and placement | Search/empty, request review or withdrawal, interview and outcome | Deferred |
| `/partner-portal/openings`, `/partner-portal/openings/[id]/applications`, `/partner-portal/job-openings` | Partner opening management and review. The last route redirects to `/partner-portal/openings`. | Pending approval/open/closed, applicant review, schedule and outcome | Deferred |
| `/partner-portal/unsubscribe`, `/unsubscribe` | Email unsubscribe, including the public alias | Invalid token, processing, success or already unsubscribed | Existing supporting routes |
| `/admin`, `/admin/analytics`, `/admin/applications`, `/admin/pending-applicants`, `/admin/waitlist`, `/admin/payments` | Admin intake, analytics, applicants, waitlist and payments | Scoped filters, empty/error, applicant action and manual payment handling | Deferred |
| `/admin/modules`, `/admin/assessments`, `/admin/assessments/[id]`, `/admin/schedule`, `/admin/resources`, `/admin/announcements` | Admin learning content, grading, schedule and communications | Draft/publish/archive, grading/reset, scheduled content and send feedback | Deferred |
| `/admin/partners`, `/admin/partners/applications`, `/admin/partner-interests` | Unified Partners desk. Both legacy paths redirect to the corresponding tab. Partner Applications requires superadmin access. | Active organizations and talent pool visibility, partner applications, intern requests and pending counts | Implemented locally |
| `/admin/placements`, `/admin/job-openings`, `/admin/openings`, `/admin/opportunities` | Admin/superadmin matching, publication and placement operations | Candidate matching, publication and placement outcomes | Deferred |
| `/admin/users`, `/admin/settings`, `/admin/coupons`, `/admin/form-options`, `/admin/audit-logs` | Admin/superadmin access, configuration and audit | Role gates, invite, active/expired options, filtering and edit failures | Deferred |

Next's `/api/geolocation`, sitemap and robots routes are supporting endpoints. Layouts and shared components are mapped in [ARCHITECTURE.md](ARCHITECTURE.md). The [registration audit](registration/REGISTRATION_AUDIT.md) contains the finer-grained states and findings for the active workstream.
