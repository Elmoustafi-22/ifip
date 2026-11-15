# REG-01B visual directions

**Concept A was approved.** These are the design prototypes for registration entry and waitlist. Open the [local preview](verification/reg-01b/preview.html) and use Direction and Intake to switch views. The preview accepts no real submission and sends no API request. The [rendered implementation review](REGISTRATION_REG01B_VERIFICATION.md) compares the actual app before and after refinement.

| Direction | Entry widths in CSS px | Full cohort | Other intake states at 375 px |
| --- | --- | --- | --- |
| A · Editorial split | [320](verification/reg-01b/a-open-320.png) · [375](verification/reg-01b/a-open-375.png) · [768](verification/reg-01b/a-open-768.png) · [1280](verification/reg-01b/a-open-1280.png) | [375](verification/reg-01b/a-full-375.png) · [1280](verification/reg-01b/a-full-1280.png) | [Closed](verification/reg-01b/a-closed-375.png) · [Lookup unavailable](verification/reg-01b/a-unavailable-375.png) |
| B · Form-centered | [320](verification/reg-01b/b-open-320.png) · [375](verification/reg-01b/b-open-375.png) · [768](verification/reg-01b/b-open-768.png) · [1280](verification/reg-01b/b-open-1280.png) | [375](verification/reg-01b/b-full-375.png) · [1280](verification/reg-01b/b-full-1280.png) | [Closed](verification/reg-01b/b-closed-375.png) · [Lookup unavailable](verification/reg-01b/b-unavailable-375.png) |

## Concepts

**A · Editorial split** uses a deep navy panel for program context and a white panel for the immediate action. Large Georgia type and a restrained diagonal accent reference the visual language of IFIP’s existing banner. The desktop panel includes two practical preparation notes. At narrow widths, it becomes a short introduction above the form. The email field, CTA and recovery stay together.

**B · Form-centered** consolidates intake, progress, email and recovery into one white panel on a cool neutral canvas. It uses a narrow navy top rule, larger type and a short progress rail. The recovery note has its own light surface. The composition scales as one column and keeps the field near the top at narrow widths.

Both concepts retain text intake labels and one primary action. The progress text names the current step and the thin segments are decorative. The full and closed views give the reason and offer the waitlist. The unavailable view gives a retry without presenting registration as open. The header and footer are representative. Implementation will preserve working routes and existing destinations, including navigation and resume, and use the current API-backed states and data.

## Comparison

| Criterion | A · Editorial split | B · Form-centered |
| --- | --- | --- |
| Visual impact | Strongest departure from REG-01. The large program headline and split surfaces create a distinctive entrance. | Clearer than REG-01 through one focal panel and fewer progress marks. The single-card silhouette remains familiar. |
| Brand consistency | Extends IFIP’s existing cream, navy, Georgia and blue accent into a more expressive composition. | Keeps the wordmark, navy action and typography, with a cooler surface and more restrained brand presence. |
| Form usability | Separates program explanation from the next action. The preparation hints make sense on the first step. | Shortest reading path. The field and recovery note stay in one visual group. |
| Mobile responsiveness | Stacks the panels, shortens the introduction and omits desktop preparation notes. The CTA stays in normal flow. | Uses the same composition at all sizes. It brings the field and CTA higher on the screen. |
| Accessibility | Text labels, visible focus, named progress and form validation in reading order. Split composition requires checking both panels during implementation. | Same control behavior and contrast, with fewer reading regions. |
| Maintainability | Needs a responsive editorial shell and a form panel. Keep the panel reusable and the editorial content specific to the entry. | Fewer layout variants. The card can carry most status and recovery states directly. |
| Later steps | Reuse the form header, progress and controls. Long steps can use a wider work area and a compact context rail instead of repeating the opening panel. | The shell adapts naturally to later forms. Wider fields may still need a larger content container. |

**Recommendation:** Approve A for REG-01B. It answers the request for a visible redesign and gives IFIP a stronger first impression. Its mobile introduction remains compact. Keep the form primitives independent of the editorial panel so later steps can use the room they need.

## Preview verification and implementation gate

Rendered 16 screenshots in Chromium. Entry was checked at 320, 375, 768 and 1280 CSS px. Full, closed and unavailable states were also rendered. The preview checks covered horizontal overflow, the wordmark, keyboard focus, labeled input, associated validation, and safe simulated submit/retry. The interactive selector switched both direction and intake. Reduced motion was enabled for captures. Body typography uses the configured Sora stack with the locally available fallback. Measured solid pairs include 15.68:1 for A’s cream on navy, 6.91:1 for supporting text on white, and 3.97:1 or better for the two input borders against their field fill. This is prototype evidence. Native browser zoom, screen-reader operation and live route integration remain implementation checks.

After direction approval, apply the selected concept to REG-01 only, with the existing availability, waitlist, resume and paid-draft behavior. Map preview shades, spacing and radii to scoped roles before implementation. Run TypeScript, targeted lint comparison and fixture browser tests, then capture matched before/after widths and request approval of the rendered app. REG-00 staging verification remains open and REG-02 remains on hold.
