# 012 — Project templates

**Status**: ready-for-agent
**Type**: AFK

## Parent

PRD: `docs/prd.md`

## What to build

Create the 5 template files that users copy to new projects. These are the ONLY files that are per-project — everything else in the kit is global.

### Templates

1. **AGENTS.template.md** (~100 linhas, index-style)
   - Project name and purpose (1-2 lines)
   - Directory structure index (`docs/`, `src/`, `tests/`)
   - Stack section (language, framework, package manager, test runner)
   - Essential commands (build, test, lint, dev server)
   - Pointers: `CONTEXT.md` for domain glossary, `docs/adr/` for decisions, `docs/INDEX.md` for references
   - Agent skills block (populated by `setup-matt-pocock-skills`)
   - Non-negotiable rules (enforced in CI, NOT just in prose)
   - ~100 lines max — file must stay index-style, not encyclopedia

2. **CONTEXT.template.md**
   - Glossary section: domain terms with precise definitions
   - No implementation details — pure terminology
   - Format following Reference Doc 8 §7: term → definition (one paragraph each)

3. **settings.template.json** (`.pi/settings.json`)
   - All `starterKit.*` feature flags with defaults and comments
   - `permissionMode`: `"default"` | `"acceptEdits"`
   - `autoLint`: `true` | `false`
   - `autoTypeCheck`: `true` | `false`
   - `autoVerify`: `true` | `false`
   - `webSearch`: `"cached"` | `"live"` | `"disabled"`
   - `activeExtensions`: array of enabled extension names
   - `activeSkills`: array of enabled skill names

4. **INDEX.template.md** (`docs/INDEX.md`)
   - Pointers to all project documentation
   - Sections: root files (AGENTS.md, CONTEXT.md), architecture (docs/adr/), references (docs/references/), explorations (docs/explorations/)

5. **ADR.template.md** (`docs/adr/0001-template.md`)
   - Sections: Status, Context, Options Considered, Decision, Consequences
   - Following the ADR format from Reference Doc 8

### Installation helper

Create a simple script or command (`/init-starter-kit`) that:
1. Copies all 5 templates to the current project
2. Prompts for project name and stack
3. Seeds AGENTS.md with project-specific details
4. Creates directory structure (`docs/adr/`, `docs/references/`, `docs/explorations/`)

## Acceptance criteria

- [ ] All 5 templates exist in `templates/` directory
- [ ] AGENTS.template.md is ~100 lines and index-style
- [ ] CONTEXT.template.md follows the glossary format
- [ ] settings.template.json has all flags documented with comments
- [ ] INDEX.template.md has correct directory structure pointers
- [ ] ADR.template.md follows the canonical ADR format
- [ ] `/init-starter-kit` copies templates and seeds project details
- [ ] Templates work when copied to a new project (no broken references)

## Blocked by

- #001 (package scaffold must exist)
