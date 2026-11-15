# IFIP redesign QA checklist

Apply to the current task and record results in [PROGRESS.md](PROGRESS.md). Document baseline defects separately from regressions. A checked item needs evidence, such as a command result, screen and viewport, or a reproducible staging scenario.

## Environment and code checks

- [ ] Confirm task ID, routes, role boundaries and current working tree. Inspect the backend and provider targets before starting services. Use isolated local or authorized staging data and test-mode providers. See [RULES.md](RULES.md).
- [ ] From `ifip-frontend/`, run `npm run lint` and `node node_modules/typescript/bin/tsc --noEmit --incremental false`. For backend type coverage, run the TypeScript command from `ifip-backend/`.
- [ ] From `ifip-frontend/`, run `node --test lib/utils/linkify.test.mjs` when relevant. Use `node node_modules/@playwright/test/cli.js test --list` to inspect coverage and `node node_modules/@playwright/test/cli.js test` with a safe environment for browser checks. Some existing tests intercept requests. Verify real contracts separately. Confirm `localhost:3000` belongs to the intended frontend before using the default Playwright config.
- [ ] Where warranted, run `npm run build` from the frontend in a suitable environment. The backend `npm run build` emits compiled output. No-emit type checks are sufficient for documentation-only checks. Report unrun checks with the reason.

## Functional and regression checks

- [ ] Open normal, direct, deep-link, reload and Back entry points. Check existing redirects and unauthorized behavior by role. Verify permissions through the API where applicable.
- [ ] Exercise loading, empty, pending, error, retry and success. Preserve fields, filters and saved progress where supported. Check slow/reordered responses and repeat actions.
- [ ] For registration, verify open/closed/full, waitlist submit/duplicate, OTP/resend, resume/stale session, per-step save and PDF upload. Cover coupon, waiver, charged checkout in provider test mode, unknown status, paid-draft continuation and account access only in an isolated environment. The exact REG-00 through REG-08 matrix lives in [REGISTRATION_TASKS.md](registration/REGISTRATION_TASKS.md).
- [ ] For dashboards, verify the affected role's empty and populated states, denied actions, filters, row actions and refresh behavior. Preserve neighboring role paths when editing a shared component.

## Responsive and accessibility checks

- [ ] Review at 320, 375, 768 and 1280 CSS px, at 200% zoom and with a mobile keyboard. Check wrapping, reflow, sticky chrome, focus visibility and reachable actions. Exercise long text and narrow tables.
- [ ] Complete key actions by keyboard. Check focus order, heading focus after navigation, Escape and focus return in overlays, and touch targets.
- [ ] Check form names, groups, errors and status announcements using accessibility inspection and a screen reader where available. Verify selection/current state uses more than color, computed contrast, and reduced motion.
- [ ] Compare the affected screens against [DESIGN.md](DESIGN.md), including failure and empty states. Record source-only vs rendered evidence. At the implementation review checkpoint, inspect the diff with the applicable interface review skill and record regressions.
