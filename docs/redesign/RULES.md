# IFIP engineering rules

## Scope and code

- Implement authorized task IDs only. Read applicable `AGENTS.md` files, inspect the route and its API dependencies, and preserve working behavior at normal entry points. Keep unrelated cleanup and backend reliability work separate.
- Reuse native controls, shared components, existing Tailwind tokens and installed libraries. Keep UI state local where practical. Use explicit state when flags can conflict, and derive business facts from the existing backend response. Follow the frontend's Next.js documentation requirement before writing code.
- Preserve payload shape, saved step indexes, auth behavior, field validation and permissions. Use real application data. Existing isolated test doubles are useful for their original test scope and cannot establish API integration coverage.
- Dependency installation, new primitives requiring packages, and shadcn initialization or preset changes require approval. Use the current project configuration and lockfiles.

## Accessibility

- Use semantic HTML, meaningful heading order, associated field labels, visible keyboard focus and a logical DOM order. Link field errors to the affected controls, announce important asynchronous outcomes and preserve entered data on retry.
- Apply the [design system](DESIGN.md) and verify keyboard access, contrast, reflow, zoom and reduced motion with the [QA checklist](QA_CHECKLIST.md). Review actual computed styles and browser behavior for accessibility claims.

## Security, data and external effects

- Preserve server authorization, organization boundaries, role checks, and token handling. UI visibility is not authorization. Keep secrets, tokens, applicant details, CVs and payment data out of logs, docs, screenshots and fixtures.
- UI work leaves backend/database contracts and payment/enrollment semantics in place. Document identified backend risks separately and obtain approval before changing them.
- Before starting a service or running integration tests, verify it targets a local or authorized staging environment. Backend startup can write records and start reminder delivery. Use isolated credentials and test recipients. Production writes, real payment charges and production email are outside baseline verification.

## Testing, Git and handoff

- Run checks relevant to the scope. Compare with baseline results, and report existing failures separately. Record the exact command, exit status and meaningful coverage. Listing tests, reading code and starting a server are distinct from running a browser journey.
- Inspect the working tree before and after edits. Preserve untracked work and unrelated changes. Commit, merge, deploy, or make production changes only with explicit authorization.
- Update [TASKS.md](TASKS.md) and [PROGRESS.md](PROGRESS.md) with completed work, evidence, blockers and the next executable step. Record proposals and unknowns as such. Stop at the agreed approval point.
