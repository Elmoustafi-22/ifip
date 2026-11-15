# REG-01B rendered implementation review

**Complete.** Concept A received final visual sign-off on 13 November 2026 after local automated verification passed. The implementation was confined to [ApplyPage](../../../ifip-frontend/app/apply/page.tsx). The [Concept A prototype](REGISTRATION_REG01B_CONCEPTS.md) remains available for comparison.

| Width in CSS px | Open, REG-01 | Open, editorial | Full, REG-01 | Full, editorial |
| --- | --- | --- | --- | --- |
| 320 | [Before](verification/reg-01/open-320.png) | [After](verification/reg-01b/implemented/open-320.png) | [Before](verification/reg-01/full-320.png) | [After](verification/reg-01b/implemented/full-320.png) |
| 375 | [Before](verification/reg-01/open-375.png) | [After](verification/reg-01b/implemented/open-375.png) | [Before](verification/reg-01/full-375.png) | [After](verification/reg-01b/implemented/full-375.png) |
| 768 | [Before](verification/reg-01/open-768.png) | [After](verification/reg-01b/implemented/open-768.png) | [Before](verification/reg-01/full-768.png) | [After](verification/reg-01b/implemented/full-768.png) |
| 1280 | [Before](verification/reg-01/open-1280.png) | [After](verification/reg-01b/implemented/open-1280.png) | [Before](verification/reg-01/full-1280.png) | [After](verification/reg-01b/implemented/full-1280.png) |

The after images show the actual local `/apply` route with intercepted responses. Other captures include [closed](verification/reg-01b/implemented/closed-375.png), [checking](verification/reg-01b/implemented/checking-375.png), [unavailable](verification/reg-01b/implemented/unavailable-375.png), [joined](verification/reg-01b/implemented/waitlist-joined-375.png) and [already joined](verification/reg-01b/implemented/waitlist-duplicate-375.png). The fixture used the same sample cohort as the before set. Sora loaded in the after set. The before set used fallback typography.

## Changes visible in the app

- The cream canvas now holds a navy program panel and a white form panel. The program introduction shrinks to a compact band on narrow screens. The desktop panel adds email and PDF preparation notes when intake is open.
- The current step and named task sit beside a slim six-segment progress indicator. A single Georgia form heading, 54 px controls and a full-width navy action give the email form a clearer reading order.
- The waitlist and availability feedback reuse the same frame. Text identifies the intake state. Resume guidance remains next to the action, including in the unavailable and waitlist branches.
- The entry header consolidates the existing program links into a keyboard-accessible menu and leaves sign-in or dashboard access visible. Support uses the existing destinations. The desktop/mobile layouts for subsequent registration steps remain in place.

## Verification

- Frontend TypeScript no-emit check passed. Targeted ESLint compared the pre-REG-01B working file and the final file under the same configuration. Both had 26 pre-existing errors and 23 warnings. No new diagnostics appeared.
- Chromium passed 18 intercepted scenarios across availability and retry, waitlist validation and duplicate submission prevention, waitlist success/duplicate/network retry, OTP capacity rejection and successful verification handoff, resume and paid drafts, navigation focus, and a late availability response. Fixture checks verified the existing OTP payloads and step 2 save.
- Captured 19 actual-route screenshots. Open, full, closed and unavailable states had no document-wide horizontal overflow at 320, 375, 768 or 1280 CSS px. Visual review prompted a smaller heading and status type scale at 320 px. A 320 × 450 CSS px keyboard check also verified that the primary action received focus and was unobscured.
- Browser requests outside the local app were intercepted or blocked. REG-00 staging verification and screen-reader verification remain open. [REG-02 verification](REGISTRATION_REG02_VERIFICATION.md) is tracked separately.
