# IFIP registration redesign specification

The registration journey and task sequence have user approval. This is a presentation and interaction redesign of existing routes and API clients. The [audit](REGISTRATION_AUDIT.md) records current behavior. The [implementation tasks](REGISTRATION_TASKS.md) track authorization and verification for each phase.

REG-01 functional work is complete locally. The user selected the editorial split from the [REG-01B visual concepts](REGISTRATION_REG01B_CONCEPTS.md). The [actual route captures](REGISTRATION_REG01B_VERIFICATION.md) show program context beside the form on desktop and a compact brand introduction above it on mobile. A short named progress rail accompanies email verification. Availability and waitlist messages reuse the panel and keep resume guidance nearby. Later steps keep their existing layout and six-step progress model. The user approved the rendered implementation.

## Layout and visual hierarchy

Use a consistent IFIP registration shell with the existing wordmark, a clear page heading, and one primary action. Keep home, sign-in and existing support destinations easy to find. Registration screens use an academic-cream surface, a white or lowest-elevation form surface, navy headings and a navy primary action. Use spacing and a light border to group content. Use shadow for menus and other overlays.

Apply the provisional [IFIP design system](../DESIGN.md), including Sora body text, Georgia display headings, navy primary actions, and the existing semantic tokens. Use at least 16 CSS px for field text and tabular numerals for countdowns and amounts. Keep the form layout focused on the task. The Dribbble reference informs public-site composition.

| Surface | Proposed hierarchy |
| --- | --- |
| Application entry | Title, available cohort and close date when provided, then email and Send verification code. Sign-in and email-link recovery are secondary. A failed availability check shows Check again. Closed and full each explain the actual reason and offer the existing waitlist. |
| Email verification | Destination email, code input, Verify email, then resend and cooldown status. Explain that the most recent code is the one to use. Show a recovery action for invalid, expired or throttled requests. |
| Steps 2–5 | Step heading, short instruction where necessary, related fields, inline errors, then Back and Save and continue. Show “Progress saved” only after a successful write. |
| Payment and declaration | Levy estimate and currency, optional coupon with applied discount and total estimate, then declaration, typed signature and the primary action. Retain terms and non-refundable disclosures. |
| Status and confirmation | Shared panel with heading, concise status, and one immediate next step. Keep payment, submitted application and account setup distinguishable. |
| Account setup and recovery | One labeled form per view. Keep password requirements and matching feedback near the fields. Show existing support/sign-in routes and preserve participant, partner and admin behavior where shared. |

## Step navigation and form conventions

1. Keep the six existing steps and their persisted numeric identifiers. Show “Step 2 of 6” and the current step name at all widths. At wide widths, show the named ordered list with the current step marked via `aria-current="step"`. Earlier reachable steps may be buttons with explicit names such as “Return to Personal profile”. Current and future items are text. Step 7 is confirmation outside the progress count.
2. Continue runs the existing validation and write before moving forward. Back follows existing routes or step changes and preserves values held in the active session. Explain that incomplete edits may need re-entry if the page is closed. Do not introduce local draft storage or autosave. On resume use the server’s last confirmed step and data, with verified email handled consistently. Use geolocation only as a fallback for an empty, untouched residence field. Keep dialing code separate from residence and preserve phone serialization.
3. Label every control with `htmlFor`/`id` or an enclosing label and use `fieldset`/`legend` for radio, date-part and checkbox groups. Use `autocomplete` and input modes for email, phone, date and OTP where supported. Allow paste and password managers. Keep current selectors, options, required/optional status, form fields and accepted formats. Explain restrictive existing validation in context and route policy changes for separate approval.
4. Use submit to reveal validation, with a summary for multiple errors and focus on the first invalid input. Associate specific errors with `aria-invalid` and `aria-describedby`. Group-level errors stay with their fieldset. Show a single form-level alert for request failure with an actionable retry. Retain values on rejection. Use disabled/busy presentation for actions that are unavailable or already in flight. A failed save keeps the current step active.
5. Preserve the existing academic and interest options and fallbacks. Use checkboxes for primary interests and a single optional secondary interest. Include saved choices that are absent from the current catalog. Use native selects or an accessible searchable pattern that preserves the complete country list and existing values. Explain comma-separated skills and tools where used. Place “PDF, up to 5 MB” before the native CV control. Show uploading until the existing API confirms storage. On replacement failure, retain the last confirmed CV in the interface and leave the server’s CV field untouched during draft saves until the next confirmed upload or restore.

## Desktop and mobile behavior

On desktop, constrain the form and status content to a readable measure. Use two columns only for short related fields or a payment summary when both columns fit. Keep DOM and visual order aligned. On mobile use one column, an inset action area in normal flow, full-width fields and buttons where useful, and the same reading order. Show the cost and declaration together before payment. Ensure phone prefixes, long names, option labels, filenames, coupon codes, error strings and monetary values wrap or remain fully reachable. Test at 320, 375, 768, and 1280 CSS px, at 200% zoom and with the keyboard open. Confirm any existing fixed navigation cannot cover focused controls or the final action.

## Status and recovery mapped to existing data

These are presentation outcomes derived from existing signals. A verification timeout is a client outcome. Payment, application submission, enrollment and account readiness should each be stated only when supported by the current response or successful action. API statuses and enrollment rules remain as documented in the audit. Authoritative pricing, cross-session reconciliation and recoverable enrollment belong to the [separate backend backlog](REGISTRATION_AUDIT.md#regression-risks-and-separate-approvals).

| Existing signal | Presentation and next action |
| --- | --- |
| Availability check, resume, save, OTP, upload, coupon or checkout in flight | Name the current action. Keep stable geometry and one polite status announcement. Block repeat submission of the same operation and release the guard on completion. Ignore stale results after a view change. |
| No active cohort or full cohort | Use the corresponding server flag and cohort name. Offer Join waitlist. Show already joined on the existing duplicate response. Never claim selection priority or a guaranteed seat without confirmed policy. |
| Resume link rejected, local session expired or network unavailable | Distinguish retryable connection failure from a stale link/session. Offer the existing email verification and email-link path where applicable. Keep support available. Avoid implying applicant data was deleted. |
| Coupon accepted, rejected or removed | Identify the code and discount separately from the amount. Show the locally calculated fee as an estimate. Keep checkout revalidation authoritative. Preserve coupon behavior and display recovery near the input. |
| Checkout opened | Explain the provider handoff and that returning to IFIP checks payment. Preserve the existing storage keys and callback aliases. Treat a network error initiating checkout as inconclusive where the request may have reached the server. |
| Polling pending, timed out, offline or credentials missing | Show “Checking payment” while checking and “We couldn’t confirm your payment yet” when inconclusive. Retry the same reference only while valid credentials exist, with sequential polls and cancellable timers. Route to existing email/support recovery if they are missing. If charged, advise against paying again. |
| Provider returned cancelled/failed, or API returned failed | Keep provider-return status distinct from the app’s confirmed result. Preserve the existing callback processing. Offer return to application where appropriate, with a charged-user support path. |
| Payment success and setup token present | “Payment confirmed” and an immediate “Set your password” link. Keep the result visible until the applicant continues. |
| Payment success without setup token | Confirm payment and link to the existing paid-draft return. The application uses the restored applicant’s payment status. If it cannot restore a paid draft, guide the applicant to their resume or account setup email and IFIP support. |
| Waiver bypass without setup token | State that the levy was waived and account setup is unresolved. Preserve the bypass contract and existing email/support route. Avoid claiming successful application submission from the bypass flag alone. |
| Successful final submission | “Application submitted” followed by the existing setup action when present, otherwise instructions to check email and use support if the link is missing. |
| Password setup/reset success | Show a stable success state and Continue to the existing destination. Preserve authentication and role handling. Invalid links offer the appropriate existing recovery action. Keep reset-request confirmation generic. |

## Accessibility and interaction requirements

- Meet WCAG 2.2 AA for labels, error identification, reflow, focus, contrast, target size and status announcements. Verify text contrast of 4.5:1 for normal text and 3:1 for large text, and 3:1 for meaningful control boundaries and focus indicators. Aim for 44×44 CSS px touch targets. Meet the 24×24 baseline or applicable spacing exception.
- Ensure every action works by keyboard. Preserve visible focus, move it to the new heading after step changes and to the relevant field after errors. If a custom dropdown remains, support predictable keyboard navigation, Escape, a visible empty result, expanded state, and focus return. Keep native controls wherever they meet the requirement.
- Use text alongside icons and color. Hide decorative icons from assistive technology. Use polite status announcements for save and verification, and alerts for actionable failures. Avoid announcing every tick of resend or polling. Respect `prefers-reduced-motion`; step changes and success states remain clear with motion off.
- Reuse existing React/Tailwind and native form primitives. Follow shadcn’s field-group, button, alert and progress composition principles where applicable. Component installation or a global theme migration is outside these tasks.
- Use named states and typed reason handling around existing API responses for complex views. Document state-to-copy and state-to-action mappings beside the relevant component in implementation. Frontend guards prevent duplicate UI actions. Backend consistency, authoritative enrollment and gateway outcomes remain backend responsibilities.
