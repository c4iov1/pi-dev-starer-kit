# Pi.dev Starter Kit

> Build the harness foundation. One `pi install`. Any project. Any model.

## What we're building

A single Pi.dev package that transforms the minimal Pi.dev harness into a production-ready coding environment — with security gates, quality hooks, workflow skills, web search, sub-agents, MCP, browser, context-mode session continuity, and 14 engineering skills from mattpocock.

See `docs/architecture.md` for the full design. See `docs/prd.md` for user stories and scope.

## Agent skills

### Issue tracker

Local markdown — issues live under `.scratch/<scope>/`. Use `.scratch/INDEX.md` as the master index and refer to scoped IDs (`starter-###`, `refactor-###`, `akita-###`, `rtk-###`) to avoid duplicate-number ambiguity. See `docs/agents/issue-tracker.md`.

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
│   ├── auto-memory/
│   └── setup-ai-memory/
│
├── skills/                      # Skills we build + integrate (recursive SKILL.md discovery)
│   ├── planning/                # plan-mode, grill, PRD/issues, interface design
│   ├── quality/                 # self-verify, review, TDD, diagnose, refactor
│   ├── workflow/                # handoff, triage, QA, setup
│   ├── research/                # web, browser, MCP, subagents
│   ├── tools/                   # artifact-analysis, write-a-skill
│   └── memory/                  # ai-memory
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
        └── 017-ai-memory-integration-plan.md
```

## How to work here

1. Read `CONTEXT.md` for domain language
2. Check `docs/architecture.md` for the full spec before coding
3. Issues live in `.scratch/pi-dev-starter-kit/` — check status before starting
4. Extension code goes in `extensions/<name>/index.ts` — use Pi.dev's ExtensionAPI
5. Skills go in `skills/<category>/<name>/SKILL.md` — follow the Agent Skills standard. Pi discovers nested `SKILL.md` directories recursively.

## Non-negotiable rules

- **Security first**: Every extension that touches tool calls must go through the permission pipeline pattern
- **Progressive disclosure**: Skills must register tools on activation and deregister on completion
- **Context efficiency**: System prompt must stay lean. Large instructions go in skills, not in SYSTEM.md
- **Deterministic hooks**: Quality checks (lint, type-check, loop detection) are enforced via hooks — not prompt
- **Document as you build**: ADRs for architectural decisions, inline comments for non-obvious patterns

## Extension dependency rules

See `docs/extension-layers.md` for the full layer map.

- Layer 1 `extensions/shared/*` may be imported by any extension and must not import extension code.
- Layer 2 core extensions (`permission-gate`, `post-edit-lint`, `loop-protection`, `task-tracker`) may import Layer 1 only.
- Layer 3 feature extensions should import Layer 1 only; promote shared logic instead of importing sibling features.
- Layer 4 integration extensions (`setup-ai-memory`, `starter-kit-doctor`, `init-starter-kit`) may import lower layers when needed.
- No circular dependencies; verify with `npx madge extensions --extensions ts --circular` when available.

## Quick commands

```bash
# Run Pi.dev in this project
pi

# Start a specific issue
pi "Read .scratch/pi-dev-starter-kit/001-package-scaffold.md and implement it"

# Lint before committing
npx biome check extensions/
```

<!-- ai-memory:start -->
## Long-term memory (ai-memory)

This project uses [ai-memory](https://github.com/akitaonrails/ai-memory)
for cross-session continuity. **Lifecycle hooks already capture every
prompt + tool call automatically.** You never need to manually write
routine notes; the SessionStart hook auto-fetches pending handoffs and
the SessionEnd hook auto-consolidates. Only write a durable wiki page
when the user explicitly asks to remember or annotate something
permanently.

### When to reach for each tool

The user can express any of the intents below in plain English —
match the intent to the tool. They do not need to name the tool.

| User says / situation | Tool |
|---|---|
| "have we discussed X?" / "search memory for Y" / before proposing architecture | `memory_query` |
| "what's been going on" / "show recent activity" (light) | `memory_recent` |
| "is ai-memory healthy?" / "how big is the wiki?" | `memory_status` |
| "give me the stats" / structured snapshot for the agent to consume | `memory_briefing` |
| "catch me up" / "I've been away" / "what's important right now?" / open-ended exploration | `memory_explore` |
| "where did we leave off?" — and you see a `📥 ai-memory: pending handoff` block in your context | already done — answer from that block; do NOT re-call `memory_handoff_accept` |
| "where did we leave off?" — and no such block is visible | `memory_handoff_accept` (rare; the SessionStart hook usually got there first) |
| "save context for the next session" / wrapping up | `memory_handoff_begin` (single-use handoff; terse summary; put detail in `open_questions` + `next_steps` bullets) |
| "consolidate this session" / "compile what we learned" (usually automatic) | `memory_consolidate` |
| "remember this permanently" / "save a note" / "add an annotation" / durable project knowledge | `memory_write_page` (write a wiki page; do **not** use handoff for permanent notes) |
| "audit the wiki" / "find contradictions" / "what rules should we add?" | `memory_lint` |
| "prune old pages" / "memory cleanup" | `memory_forget_sweep` |

`memory_explore` is the right default for the "I want to know what's
going on" use case — it returns a prose digest whose verbosity
scales automatically to how long it's been since the last activity
(< 1 h → one line; > 30 days → full catchup).

### When you write a project rule, write it here

If you're about to write a durable project rule ("always X", "never
Y", "all PRs must …"), this rules file (CLAUDE.md for Claude Code;
AGENTS.md for Codex / OpenCode / Cursor / Gemini CLI; whichever
convention your agent uses) is where it belongs. ai-memory's lint
pass surfaces the same hint automatically when a `kind: rule` page
lands in `_rules/`.

### Refreshing this snippet

This block is maintained by ai-memory. Two ways to refresh it with
the latest binary's recommended copy:

- **From the agent** (no terminal needed): ask "refresh the ai-memory
  routing in this project" — the agent calls
  `memory_install_self_routing`, picks the right filename for itself
  (Claude Code → `CLAUDE.md`; Codex / OpenCode / Cursor / Gemini →
  `AGENTS.md`), and uses its Write / Edit tool to land the block.
- **From the CLI**: `ai-memory install-instructions` (defaults to
  `CLAUDE.md`; pass `--target AGENTS.md` for non-Claude agents).

Both are idempotent: re-runs replace the block bracketed by
`<!-- ai-memory:start -->` / `<!-- ai-memory:end -->` markers
without disturbing the rest of the file.
<!-- ai-memory:end -->
