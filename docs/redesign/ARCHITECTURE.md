# IFIP architecture

Current implementation, based on the repository. Use the [UI inventory](UI_INVENTORY.md) for page routes and the [registration audit](registration/REGISTRATION_AUDIT.md) for exact registration requests and transitions.

| Layer | Responsibility and source |
| --- | --- |
| Frontend | `ifip-frontend/` is Next.js App Router 16.2.10 with React 19, TypeScript and Tailwind CSS 4. `app/` owns route layouts and pages. The root layout loads Sora and global CSS. `components/home/` holds marketing sections and navigation. Shared components include `NotificationBell`, `UserAvatarMenu`, `RichTextEditor` and `ExportApplicantsModal`. Participant, partner and admin shells have separate layouts. |
| Frontend state and API | Registration uses React state/effects, Zod step validation, browser token storage, and server saves through `lib/api/services.ts`. `lib/api/client.ts` defines Axios applicant and authenticated clients, with 401 refresh handling on the authenticated client. `auth.ts` owns credential helpers and proactive refresh. `useFormOptions` uses `useCachedFetch` with browser storage and content-version checks. React Query and Zustand are dependencies. The audited registration route uses the existing hooks and Axios rather than either store. |
| API | `ifip-backend/src/app.ts` mounts Express route families under `/api/v1`. `routes/` applies auth, role checks, validation and endpoint-specific middleware. Controllers orchestrate actions and Mongoose models persist records. `/api/v1/health` reports HTTP liveness. Next's `/api/geolocation` reads request headers and is separate from Express. |
| Data and sessions | MongoDB holds drafts, users, permanent applications, cohorts, payments, training and placement records. Redis holds expiring OTP challenges. The applicant bearer token, account access/refresh credentials, polling token and email links serve different purposes. Authorization is enforced on the server. Browser route guards are for navigation and feedback. |
| External services | Flutterwave handles current hosted checkout, and Flutterwave and Paystack verification handlers remain in the API. Cloudinary holds CVs and media. Brevo sends emails via existing service and event listeners. The startup entry connects MongoDB and Redis, runs an existing partner-organization update, and starts the interview-reminder cron. Verify environment isolation before starting it. |

## Route and domain ownership

| Domain | Frontend entry | Express route families |
| --- | --- | --- |
| Discovery | `/`, `/about`, `/partners/apply` | `/cohort`, `/active-openings`, `/placement-opportunities`, `/partners`, `/content-versions` |
| Registration | `/apply`, `/apply/resume`, `/verify-payment`, `/set-password` | `/cohort`, `/applicants`, `/waitlist`, `/form-options`, `/uploads`, `/payments`, `/auth` |
| Session and recovery | `/login`, `/forgot-password`, `/reset-password` | `/auth` |
| Participant | `/dashboard` and subroutes | `/applications`, `/lms`, `/resources`, `/placements`, `/job-openings`, `/notifications` |
| Partner | `/partner-portal` and subroutes | `/partner` and `/partners` mount the same router. Portal actions require partner authorization and applicable organization access. |
| Administration | `/admin` and subroutes | `/admin`, with admin/superadmin checks and further restrictions on selected actions. |

The frontend reads `NEXT_PUBLIC_API_URL`, with a loopback fallback to `http://localhost:5000/api/v1`. Treat the current source as authoritative where older README descriptions disagree. For example, the draft model no longer has an automatic TTL and enrollment can follow polling, a waiver or manual resolution as well as webhooks. The [audit](registration/REGISTRATION_AUDIT.md) records the implications and separate backend risks.

## Testing and development boundaries

The frontend has an ESLint script, an independent TypeScript compiler, a Node test for linkification, and a Playwright Chromium configuration. Playwright starts or reuses the frontend on `localhost:3000`. Some checked-in smoke tests intercept requests. They verify UI behavior and cannot establish real integration coverage. The backend `build` script runs TypeScript and has no declared automated test script. Commands, environment constraints, and expected evidence are in [QA_CHECKLIST.md](QA_CHECKLIST.md). Session results are in [PROGRESS.md](PROGRESS.md).
