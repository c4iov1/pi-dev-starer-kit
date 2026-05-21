# 001 — Package scaffold + SYSTEM.md

**Status**: ready-for-agent
**Type**: AFK

## Parent

PRD: `docs/prd.md`

## What to build

Create the Pi.dev package scaffold that makes the entire starter kit installable via `pi install`. This is the foundation that all other slices depend on — the package must exist, install correctly, and load resources before any extension or skill can be added.

The package must:
- Have a valid `package.json` with the `pi-package` keyword and a `pi` manifest declaring extensions, skills, and prompts directories
- Include `SYSTEM.md` and `APPEND_SYSTEM.md` that get loaded globally into every Pi.dev session
- The SYSTEM.md must define the 6 tool categories (File I/O, Search, Execution, Web, Orchestration, Quality), the canonical workflow (Plan→Search→Edit→Test→Lint→Verify→Done), and progressive disclosure instructions for skills
- Use conventional Pi.dev directories (`extensions/`, `skills/`, `prompts/`)
- Be installable via `pi install git:...` and verify that all resources are discovered after installation

Do NOT include any actual extensions or skills yet — just the scaffold, SYSTEM.md, and empty directories.

## Acceptance criteria

- [ ] `package.json` is valid with `keywords: ["pi-package"]` and `pi` manifest
- [ ] `pi install git:...` succeeds globally
- [ ] After install, `pi` starts with SYSTEM.md loaded as system prompt
- [ ] Empty `extensions/`, `skills/`, `prompts/` directories exist and are discovered
- [ ] `APPEND_SYSTEM.md` appends to system prompt correctly
- [ ] SYSTEM.md contains all 6 tool categories, canonical workflow, and progressive disclosure instructions

## Blocked by

None — can start immediately.
