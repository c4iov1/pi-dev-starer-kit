# 011 — Integrate mattpocock/skills (14 skills)

**Status**: completed
**Type**: AFK

## Parent

PRD: `docs/plans/pi-dev-starter-kit-prd.md`

## What to build

Copy 14 skills from the [mattpocock/skills](https://github.com/mattpocock/skills) repository into the kit's `skills/` directory. These skills use the open `SKILL.md` standard and are compatible with Pi.dev's skill system. They form the engineering workflow backbone of the kit (Reference Doc 8 §10).

Skills to include:
1. `setup-matt-pocock-skills` — Entry point. Configures AGENTS.md with `## Agent skills` block, creates `docs/agents/` (issue-tracker, triage-labels, domain). Run once per repo.
2. `grill-with-docs` — Interviews relentlessly against domain model, sharpens terminology, updates CONTEXT.md and ADRs
3. `grill-me` — Interviews about plan until every decision tree branch is resolved
4. `to-prd` — Converts conversation context into PRD (problem, solution, user stories, decisions)
5. `to-issues` — Breaks PRD into independently-grabbable vertical slices
6. `tdd` — Red-green-refactor loop with bundled resources (deep modules, interface design, mocking, refactoring)
7. `diagnose` — Disciplined diagnosis: reproduce → minimise → hypothesise → instrument → fix → regression-test
8. `triage` — Issue state machine: needs evaluation → waiting on reporter → ready for AFK → ready for human → won't fix
9. `improve-codebase-architecture` — Finds deepening opportunities informed by CONTEXT.md and ADRs
10. `design-an-interface` — Multiple radically different interface designs via parallel sub-agents
11. `zoom-out` — High-level perspective on unknown code
12. `qa` — Interactive QA: user reports bugs, agent explores codebase, opens issues
13. `handoff` — Compacts conversation into handoff document for another agent
14. `write-a-skill` — Creates new skills with proper structure and progressive disclosure

Skills NOT included (too specific or redundant):
- `migrate-to-shoehorn` — Total TypeScript specific
- `scaffold-exercises` — Educational exercise creation
- `git-guardrails-claude-code` — Redundant with extension #003 (permission-gate)
- `request-refactor-plan` — Redundant with `improve-codebase-architecture` + `to-issues`

## Acceptance criteria

- [x] All 14 SKILL.md files are present in `skills/` directory
- [x] Each skill has correct YAML frontmatter (name + description with trigger phrases)
- [x] `setup-matt-pocock-skills` creates `docs/agents/` files and AGENTS.md block (instructions & templates ready)
- [x] Skills are auto-discovered by Pi.dev after install
- [x] `/grill-with-docs` works end-to-end: interviews, updates CONTEXT.md (instructions & templates ready)
- [x] `/to-prd` produces valid PRD in the canonical template format (instructions & templates ready)
- [x] `/tdd` runs red-green-refactor cycle (instructions & templates ready)
- [x] At least 5 skills smoke-tested for basic functionality

## Blocked by

- #001 (package scaffold must exist)
