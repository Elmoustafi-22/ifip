# Homepage header and hero

**Historical evidence.** The homepage was restored to its checked-in design at `fd239ea`.

The first homepage slice uses the reference’s split composition with IFIP typography and colors. The original career-milestone illustration appears without an overlaid caption or action. The hero keeps one layout while the existing registration-status endpoint resolves, and it sends applicants to the existing `/apply` route. The header combines public and account navigation, with a keyboard-operable disclosure replacing the fixed mobile navigation.

## Local verification

- Frontend TypeScript no-emit and targeted ESLint on the new header and hero passed.
- Nine intercepted Chromium checks covered open, full, closed, failed and malformed cohort responses, as well as 320, 375, 768 and 1280 px reflow. The checks also covered the visible illustration, aligned hero actions, navigation to `/apply` by link target, and opening and dismissing the mobile menu with the keyboard.
- Captures use a sample cohort and reduced motion. [375 px](verification/hero-375.png) and [1280 px](verification/hero-1280.png).
- The open-cohort line is visually hidden, and the button continues to respond to availability. The program name uses a soft teal label.
- Live cohort integration and visual approval remain open.

## Program information

- The curriculum, program timeline, eligibility and levy were redesigned. Both residence-based levy estimates are visible and checkout remains authoritative.
- Frontend TypeScript and targeted ESLint passed. Intercepted browser checks passed at 320, 375, 768 and 1280 px for the redesigned sections and verified the curriculum anchor and brochure link target.
- Desktop [curriculum](verification/program-1280.png) and [journey](verification/journey-1280.png), and mobile [eligibility and levy](verification/eligibility-375.png).

## Hero and curriculum color pass

- The hero uses an orange application button with navy text, a pale blue illustration panel and blue milestones in the original artwork. The curriculum uses ice blue, mint and apricot for its three pillars.
- Navy text on the orange action has a measured contrast ratio of 7.55:1. Curriculum cards retain dark text and named categories.
- Review the updated [mobile curriculum](verification/program-375.png) and [desktop curriculum](verification/program-1280.png).

## Journey and levy color pass

- The navy journey panel uses ice-blue step markers. The commitment levy uses an apricot surface with an inset price list. Both estimates share a right edge, including when the residence label wraps.
- TypeScript (`tsc --noEmit --incremental false`) and targeted ESLint on `app/page.tsx` and `components/home/PricingSection.tsx` passed.
- Chromium with intercepted API requests verified four steps, both existing estimates, aligned amounts, and no horizontal overflow in these sections at 320, 375, 768 and 1280 CSS px. Computed contrast was 13.04:1 for the step markers, 11.90:1 for the journey copy, 6.27:1 for the levy note, and 6.93:1 for the residence labels.
- Journey captures at [375 px](verification/journey-375.png) and [1280 px](verification/journey-1280.png). Eligibility and levy captures at [375 px](verification/eligibility-375.png) and [1280 px](verification/eligibility-1280.png).
