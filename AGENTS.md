# IFIP agent instructions

IFIP is an existing Next.js and Express platform. Check the source for current behavior. Follow any more specific instructions in the affected directory, including [frontend guidance](ifip-frontend/AGENTS.md).

1. Inspect the Git working tree and preserve existing changes. Open [TASKS.md](docs/redesign/TASKS.md) and [PROGRESS.md](docs/redesign/PROGRESS.md) to identify the authorized scope, verification evidence, and next action. Read the task specification before editing.
2. Use the [PRD](docs/redesign/PRD.md) for product scope, [architecture](docs/redesign/ARCHITECTURE.md) and [UI inventory](docs/redesign/UI_INVENTORY.md) to locate code, and the [design system](docs/redesign/DESIGN.md), [engineering rules](docs/redesign/RULES.md), and [QA checklist](docs/redesign/QA_CHECKLIST.md) to plan and verify changes.
3. Select relevant installed skills from `.agents/skills/` and read their `SKILL.md` files. A skill does not expand the user's authorized scope. Reuse existing components, contracts, and real application data.
4. Registration and enrollment come first. Follow [REG-00 through REG-08](docs/redesign/registration/REGISTRATION_TASKS.md). Start by completing REG-00 verification. REG-01 and later source changes require the user's go-ahead. Preserve business logic and route behavior. Keep backend reliability, dependency changes, and unrelated refactors outside UI tasks.
5. Run relevant safe checks and review affected screens when possible. Record executed commands, outcomes, and coverage gaps in the trackers. Only mark a task complete when its acceptance criteria are met. Stop at the agreed approval checkpoint. Commit, merge, deploy, or change production only with explicit authorization.
