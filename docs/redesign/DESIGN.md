# IFIP design system

**Provisional visual foundation.** Registration journey and task order have user approval. This platform-wide styling proposal still needs review. Existing tokens and fonts in [globals.css](../../ifip-frontend/app/globals.css) and the [root layout](../../ifip-frontend/app/layout.tsx) are the baseline.

## Reference and surface direction

The [local Dribbble reference](../../design-references/original-f61fcc56d6709b71009052132b827fc2.webp) uses a split hero with a strong headline, portrait and small supporting overlays. Below it are generous section gaps, repeatable cards, restrained tinted panels, a partner logo grid, an FAQ and a contrasting footer. Use the visual rhythm and image hierarchy on the public site. Fill those patterns with IFIP's existing program content, verified claims and approved imagery. The reference's courses, prices, ratings, metrics and endorsements provide no evidence about IFIP. The screenshot provides visual proportions. Exact token values come from the repository or proposals below.

| Surface | Direction |
| --- | --- |
| Public site | Editorial pacing, one primary apply action, clear program and cohort information, and real people and partner imagery where approved. Collapse the hero into reading order on small screens. |
| Registration | Quiet cream background, one white form surface, named progress, short instructions and a clear next action. Keep fees, declaration and outcome recovery easy to find. See the [registration spec](registration/REGISTRATION_DESIGN.md). |
| Applicant dashboard and LMS | Put the next learning task, schedule, assessments and resources first. Use progress and access labels supported by the API. Give lesson content a readable measure and room for embedded material. |
| Partner dashboard | Prioritize requests, candidate review, openings and interview actions. Use responsive lists and tables with scannable stage labels and existing permission cues. |
| Admin dashboard | Preserve grouped navigation and use denser tables, filters and action bars for operations. Use navy navigation with a light work area. Keep destructive actions distinct and retain existing role checks. |

## Semantic color and typography

| Role | Baseline and use |
| --- | --- |
| Canvas and surface | Existing `background` / `academic-cream` #FDF7ED, `surface` #FFF9EF and `surface-container-lowest` #FFFFFF. Use existing surface containers for grouped content. |
| Text | `on-surface` #1D1B16 for text, `on-surface-variant` #454652 for secondary copy. Cream/body contrast is 16.14:1 and white/secondary text is 9.33:1. |
| Primary action | `primary` #000666 with `on-primary` #FFFFFF, 17.24:1. `secondary` #006591 for text links on light surfaces, 6.42:1 on white. |
| Borders and focus | `outline` #767683 for meaningful light-surface boundaries, `outline-variant` #C6C5D4 for subtle separators. Use navy focus on light and white on dark with a visible offset. Measure at actual edges. |
| Brand accent | `sky-blue`, `vibrant-blue`, `deep-navy` and `impact-orange` remain in the palette. White on orange is 2.16:1. Use orange decoratively or pair it with dark text, 7.98:1 for #1D1B16. |
| Error | Existing #93000A on #FFDAD6, 7.24:1. |
| Success, warning, information | Proposed pairs #166534/#DCFCE7 (6.49:1), #854D0E/#FEF3C7 (6.15:1), and #004869/#E5F6FF (8.90:1). These are proposed roles, not new CSS tokens already in the app. |
| Disabled | Muted surface, visible label and true disabled behavior. Use a readable reason when an action is blocked. |

Ratios above use opaque pairs. Check computed styles in each actual state. Sora is the body and interface family. Georgia is the display family. Start with the existing 48/56 display, 32/40 and 24/32 headline roles, 18/28 and 16/24 body roles, and 14/20 labels. Use 28/36 for a narrow page title and at least 16 CSS px for form inputs. Use sentence case and tabular numerals for totals, timers and comparable values. Use compact Sora headings in tables and toolbars. Keep prose around 60–75 characters per line.

## Spacing and responsive layout

Use the existing 8 px spacing base with 4 px for tightly related details, 16 px mobile margins, 24 px wide gutters and 80 px public section spacing where content fits. Start with 24–48 px between workspace groups. The public container tops out at the existing 1280 px token. For single-column forms, aim for 40–44 rem and allow narrower status panels. Forms collapse to one column on small screens. Keep the action within normal flow and above any competing fixed chrome. Workspace navigation collapses to a labeled drawer or existing mobile bar. Let filters wrap. For wide tables, use a labeled scroll region and keep identity and actions available. Check 320, 375, 768 and 1280 CSS px and 200% zoom. Let content determine where a layout changes.

## Components and interaction

- **Forms.** Associate labels, required/optional hints and field errors with native controls. Group related choices in fieldsets. Focus the first invalid field on submit, and keep saved and unsaved data distinguishable. Use an accessible combobox only where native controls cannot satisfy the task.
- **Buttons and cards.** Use one filled primary action per view or active form, outlined secondary actions and link styling for navigation. Use a visible busy label and guard repeat actions. Use borders and space for card structure, existing light elevation for layered surfaces, and a consistent radius scale within a surface. Keep tappable targets at least 24 CSS px or the applicable spacing exception. Aim for 44 px on touch.
- **Navigation and progress.** Give current page/step a visible cue and programmatic state. Use named steps on mobile. Future or unavailable steps need a clear status. Restore focus after menus and dialogs, and move it to the new heading after major view changes. Keep focus clear of sticky chrome.
- **Feedback.** Use a stable progress message or skeleton during initial load. Preserve useful content during refresh. Empty states explain what is missing and give an available next action. Pending and unknown states name the operation. Success reflects confirmed evidence. Errors state what happened and how to recover. Pair color with text or icons, and announce meaningful changes without announcing every timer tick.
- **Accessibility and motion.** Target WCAG 2.2 AA, with 4.5:1 normal-text contrast, 3:1 for large text and meaningful UI indicators, visible keyboard focus, logical reading order and no color-only status. Use short, purpose-specific opacity or position transitions with reduced-motion alternatives. Avoid recurring decorative motion in forms and workspaces. Preserve the usability of all states when animation is disabled.

Use the [QA checklist](QA_CHECKLIST.md) for review. Design token implementation and adoption by individual surfaces remain part of the corresponding approved UI tasks.

## REG-01B editorial registration entry

The user approved Concept A from the [rendered directions](registration/REGISTRATION_REG01B_CONCEPTS.md). The [implemented entry](registration/REGISTRATION_REG01B_VERIFICATION.md) uses a scoped navy program panel (#131B48), cream canvas (#F8F5EF), white form panel and muted supporting text (#505A70). Georgia gives the entry its editorial hierarchy, while Sora supports form labels and controls. The split stacks at 680 CSS px and the navy introduction becomes compact. Fields and primary actions use a 54 px minimum height. These roles are local to registration entry and availability. Shared platform tokens stay provisional. The user approved the rendered implementation.
