# REG-01 local verification

REG-01 is the registration shell, availability and waitlist slice on `/apply`. The only application source change is [ApplyPage](../../../ifip-frontend/app/apply/page.tsx). Existing navigation, six step identifiers, applicant storage and API helper calls remain in use. The approved cream, navy, white, Sora and Georgia direction remains provisional.

## Interface captures

All captures show deterministic intercepted API responses and synthetic labels. The browser blocked external requests, and screenshots contain no real applicant information. Local development used Sora fallback because the font download was unavailable.

| Availability | Widths in CSS px |
| --- | --- |
| Open | [320](verification/reg-01/open-320.png) · [375](verification/reg-01/open-375.png) · [768](verification/reg-01/open-768.png) · [1280](verification/reg-01/open-1280.png) |
| Full | [320](verification/reg-01/full-320.png) · [375](verification/reg-01/full-375.png) · [768](verification/reg-01/full-768.png) · [1280](verification/reg-01/full-1280.png) |
| Closed | [320](verification/reg-01/closed-320.png) · [375](verification/reg-01/closed-375.png) · [768](verification/reg-01/closed-768.png) · [1280](verification/reg-01/closed-1280.png) |
| Unavailable | [320](verification/reg-01/unavailable-320.png) · [375](verification/reg-01/unavailable-375.png) · [768](verification/reg-01/unavailable-768.png) · [1280](verification/reg-01/unavailable-1280.png) |

Additional 375 px captures show [checking](verification/reg-01/checking-375.png), [waitlist joined](verification/reg-01/waitlist-joined-375.png), and [already joined](verification/reg-01/waitlist-duplicate-375.png). Each open, full, closed and unavailable view passed the document scroll-width check at all four widths.

## Executed checks

- The local Playwright Chromium harness passed **15 intercepted scenarios**. Cases covered open/full/closed/unavailable layouts, a held lookup, keyboard retry and focus transfer, a malformed response, validation without a POST, a single in-flight submission, 201 success, 409 already joined, network failure and retry, OTP start capacity rejection, a resumed profile with closed intake, a restored paid draft during availability failure, and a payment-return hint with no valid draft.
- The fixture harness intercepted `GET /api/v1/cohort/registration-status` with the existing `hasActiveCohort`, `isFull` and optional cohort name fields, and `POST /api/v1/waitlist` with the existing success and duplicate response shapes. A network failure used an aborted request. The resume and paid-draft cases used synthetic applicant/session responses on the existing endpoints. Browser requests outside the local frontend were blocked. No backend was started.
- A separate keyboard check at 320 × 450 CSS px and device scale factor 2 verified reflow, Tab focus, that the submit button was unobscured at its center, and that Enter associated the validation error and focused the email input. This exercises a narrow effective viewport. Native browser zoom and a screen-reader walk were outside these automated checks.
- A separate navigation check held an older full response, followed the existing Login and Apply links, and rendered a newer open response. Delivering the older full response left the open state intact.
- Frontend `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed.
- Targeted ESLint comparison used the same rule configuration on `ApplyPage` from HEAD and the working tree. The baseline was 28 errors and 25 warnings. The changed file has 26 errors and 23 warnings, with **zero new diagnostics**. Unrelated findings remain in the baseline.
- `npm.cmd run build` stopped in the existing `next/font` configuration because the environment could not fetch Sora from Google Fonts. The production build remains unverified. The screenshots and browser checks used the local development server.

## Follow-up

The local acceptance cases for REG-01 passed. REG-00 remains [partially verified](REGISTRATION_BASELINE.md). Real availability and waitlist responses, email verification, saved applicant data, provider checkout and account access still require isolated staging. Existing support and legal destinations were preserved and their canonical URLs remain a separate decision. REG-02 awaits authorization.
