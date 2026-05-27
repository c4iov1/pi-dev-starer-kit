# AGENTS.md — [PROJECT_NAME]

> Replace `[PROJECT_NAME]` with your project name. Keep this file an index (~100 lines), not an encyclopedia.
> The agent uses this to navigate the project. Point to detailed docs — don't inline them.

## Project

[One-line description of what this project does and who it's for.]

## Directory Map

```
[project-root]/
├── src/               # Source code
│   ├── [module-a]/    # [Purpose of module-a]
│   └── [module-b]/    # [Purpose of module-b]
├── tests/             # Test suite
├── docs/              # Project documentation
│   ├── INDEX.md       # Knowledge map — start here
│   ├── adr/           # Architecture Decision Records
│   ├── references/    # External references
│   └── explorations/  # Spike reports and investigations
├── .pi/               # Pi.dev project configuration
│   └── settings.json  # Feature flags for the starter kit
└── .scratch/          # Issue tracker (local)
```

## Stack

| Concern          | Choice                        |
|------------------|-------------------------------|
| Language         | [TypeScript / Python / Rust]  |
| Runtime          | [Node.js / Python / etc.]     |
| Framework        | [Next.js / FastAPI / etc.]    |
| Package manager  | [npm / yarn / pnpm / poetry]  |
| Test runner      | [vitest / pytest / cargo test]|
| Linter/formatter | [Biome / ESLint / Ruff]       |
| Type checker     | [tsc / pyright / mypy]        |

## Essential Commands

```bash
# Development
[npm run dev]           # Start dev server

# Testing
[npm test]              # Run all tests
[npm test -- --watch]   # Watch mode

# Linting & formatting
[npm run lint]          # Lint and auto-fix
[npm run typecheck]     # Type-check without emitting

# Build
[npm run build]         # Production build
```

## Key References

- **`CONTEXT.md`** — Domain glossary. Read this first for terminology.
- **`docs/INDEX.md`** — Knowledge map of all project docs.
- **`docs/adr/`** — Architecture Decision Records. Check before making architectural changes.
- **`.pi/settings.json`** — Starter kit feature flags. Enable/disable extensions and skills here.

## Agent skills

_This block is populated by the `/setup-matt-pocock-skills` skill._
<!-- setup-matt-pocock-skills:start -->
<!-- setup-matt-pocock-skills:end -->

## Optional ai-memory

For always-on long-term memory and cross-agent handoff, run `/setup-ai-memory` once.
After setup, install/update project routing with:

```bash
ai-memory install-instructions --target AGENTS.md
```

<!-- ai-memory:start -->
<!-- ai-memory:end -->

## Non-Negotiable Rules

_These rules are enforced by CI, not just by convention. The agent must follow them._

- [ ] Code must pass `[npm run lint]` before committing
- [ ] Code must pass `[npm run typecheck]` before committing
- [ ] All tests must pass before merging: `[npm test]`
- [ ] No direct commits to `main` — use feature branches
- [ ] Commit messages follow conventional commits: `type(scope): description`
- [ ] [Add your project's rules here]
