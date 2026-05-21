# Pi.dev Starter Kit

> Build the harness foundation. One `pi install`. Any project. Any model.

## What we're building

A single Pi.dev package that transforms the minimal Pi.dev harness into a production-ready coding environment — with security gates, quality hooks, workflow skills, web search, sub-agents, MCP, browser, context-mode session continuity, and 14 engineering skills from mattpocock.

See `docs/architecture.md` for the full design. See `docs/prd.md` for user stories and scope.

## Agent skills

### Issue tracker

Local markdown — issues live under `.scratch/pi-dev-starter-kit/`. See `docs/agents/issue-tracker.md`.

### Triage labels

`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

- `CONTEXT.md` — domain glossary (this project's terminology)
- `docs/adr/` — architecture decisions
- `docs/references/` — external references (harness engineering, Pi.dev, mattpocock skills)

## Project structure

```
pi-dev-starter-kit/
├── AGENTS.md                    # You are here
├── CONTEXT.md                   # Domain glossary
├── repo_init.md                 # Setup instructions + first prompt
├── package.json                 # Pi.dev package manifest (output)
│
├── extensions/                  # Extensions we build (TypeScript)
│   ├── permission-gate/
│   ├── post-edit-lint/
│   ├── loop-protection/
│   ├── task-tracker/
│   ├── lsp-bridge/
│   ├── monitor-bash/
│   ├── contrib-gate/
│   └── auto-memory/
│
├── skills/                      # Skills we build + integrate
│   ├── plan-mode/
│   ├── self-verify/
│   ├── web-research/
│   ├── browser-testing/
│   ├── subagent-delegation/
│   ├── mcp-orchestration/
│   └── agent-memory/
│   # + 14 skills from mattpocock/skills
│
├── prompts/                     # Prompt templates
│   ├── plan.md
│   ├── verify.md
│   ├── review.md
│   └── handoff.md
│
├── templates/                   # Templates users copy per-project
│   ├── AGENTS.template.md
│   ├── CONTEXT.template.md
│   ├── INDEX.template.md
│   ├── ADR.template.md
│   └── settings.template.json
│
├── SYSTEM.md                    # Global system prompt
├── APPEND_SYSTEM.md             # Additional instructions
│
├── docs/
│   ├── INDEX.md                 # Knowledge map
│   ├── architecture.md          # Full architecture spec
│   ├── prd.md                   # Product requirements
│   ├── adr/                     # Architecture decisions
│   └── references/              # External references
│       ├── 1-anatomy-harness.md
│       ├── 4-harness-reference.md
│       ├── 5-pi-dev-doc.md
│       └── 8-mattpocock-skills.md
│
└── .scratch/                    # Issue tracker
    └── pi-dev-starter-kit/
        ├── 001-package-scaffold.md
        ├── ...
        └── 017-skill-agent-memory.md
```

## How to work here

1. Read `CONTEXT.md` for domain language
2. Check `docs/architecture.md` for the full spec before coding
3. Issues live in `.scratch/pi-dev-starter-kit/` — check status before starting
4. Extension code goes in `extensions/<name>/index.ts` — use Pi.dev's ExtensionAPI
5. Skills go in `skills/<name>/SKILL.md` — follow the Agent Skills standard

## Non-negotiable rules

- **Security first**: Every extension that touches tool calls must go through the permission pipeline pattern
- **Progressive disclosure**: Skills must register tools on activation and deregister on completion
- **Context efficiency**: System prompt must stay lean. Large instructions go in skills, not in SYSTEM.md
- **Deterministic hooks**: Quality checks (lint, type-check, loop detection) are enforced via hooks — not prompt
- **Document as you build**: ADRs for architectural decisions, inline comments for non-obvious patterns

## Quick commands

```bash
# Run Pi.dev in this project
pi

# Start a specific issue
pi "Read .scratch/pi-dev-starter-kit/001-package-scaffold.md and implement it"

# Lint before committing
npx biome check extensions/
```
