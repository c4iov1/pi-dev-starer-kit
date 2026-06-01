# Pi.dev Starter Kit — Architecture

> **Status**: Draft for review
> **Date**: 2026-05-15
> **References**: docs/references/1 through 8

---

## 1. Definition

**Pi.dev Starter Kit** is a foundational package — canonical AGENTS.md, model-optimized SYSTEM.md, security and quality extensions, workflow skills, documentation templates, and ecosystem package curation — that transforms Pi.dev from a minimalist harness into an immediately productive environment for any project, with full freedom of model choice.

**What it is:**
- A universal foundation that works on any stack, domain, or product
- An opinionated set of tools, instructions, and guardrails that eliminate the "gap diagnosis" phase
- A harness that rivals Claude Code/Codex in capability, but maintains provider independence

**What it is not:**
- A sealed product — you add per-project specialization
- A replacement for Claude Code/Codex — it's an alternative for those who want model autonomy
- A layer that predicts what you'll build — it provides foundations, not product

---

## 2. Principles

1. **Model autonomy**: The harness works with any provider (Anthropic, OpenAI, Google, GLM, etc.). No optimizations are exclusive to a single model.

2. **Progressive disclosure**: Tools and instructions load on demand via Skills. The system prompt contains only the essentials — the cache is protected.

3. **Security by default**: Permission gates, path confinement, and write constraints are active from the first command. The model operates in restricted mode, escalating permissions explicitly.

4. **Quality is structural, not optional**: Post-edit lint, self-verification, and loop protection don't rely on the model remembering — they are deterministic hooks that always execute.

5. **Index, not encyclopedia**: AGENTS.md, CONTEXT.md, and MEMORY.md function as a reference map. The model consults on demand, not load everything upfront.

6. **Starter, not straitjacket**: Every extension and skill can be disabled per project via `settings.json`. The kit is a starting point, not a final destination.

7. **Ecosystem-first**: Whenever possible, uses existing packages from the Pi.dev ecosystem instead of reinventing. Curation is part of the kit's value.

8. **Observability**: Every tool call, error, and permission decision generates a trace. The agent operates in "glass box" — you always know what it did and why.

---

## 3. Kit Interface — Components

### Installation model

The starter kit is an **installable Pi.dev package** (Reference Doc 5, section 10). A single command installs everything globally:

```bash
pi install git:github.com/user/pi-dev-starter-kit
```

After installation, **every Pi.dev session** — in any project — loads:
- Extensions (security gates, lint hooks, loop protection, etc.)
- Skills (plan-mode, self-verify, web-research, etc.)
- Prompt templates (plan, verify, review, handoff)
- Global SYSTEM.md (tool categories, canonical workflow)
- Ecosystem dependencies (web search, sub-agents, MCP, etc.)

**Per project**, the user copies only the templates:
- `AGENTS.md` (project index)
- `CONTEXT.md` (domain glossary)
- `.pi/settings.json` (feature flags: what to enable/disable)
- `docs/INDEX.md` + `docs/adr/` (documentation)

### Package structure

```
pi-dev-starter-kit/                    # Git repository
├── package.json                       # Pi.dev package manifest
├── README.md
│
├── SYSTEM.md                          # → ~/.pi/agent/SYSTEM.md (global)
├── APPEND_SYSTEM.md                   # → ~/.pi/agent/APPEND_SYSTEM.md (global)
│
├── extensions/                        # → ~/.pi/agent/extensions/ (global)
│   ├── permission-gate/index.ts       #   PreToolUse hook
│   ├── rtk-rewrite/index.ts           #   RTK bash rewrite for context-efficient output
│   ├── post-edit-lint/index.ts        #   Auto lint post-edit
│   ├── loop-protection/index.ts       #   Doom-loop + diminishing returns
│   ├── task-tracker/index.ts          #   Tools TaskCreate/TaskUpdate
│   ├── lsp-bridge/index.ts            #   LSP: type errors + symbol ops
│   ├── monitor-bash/index.ts          #   Tool Monitor: background bash
│   ├── contrib-gate/index.ts          #   Git workflow: branches + commits
│   ├── auto-memory/index.ts           #   Lightweight MEMORY.md persistence
│   ├── setup-ai-memory/index.ts       #   Pi hooks + /ai-memory-* commands for upstream service
│   ├── starter-kit-doctor/index.ts    #   Tool starter_kit_doctor: environment diagnostics
│   ├── artifact-read/index.ts         #   Tool artifact_read: SQLite, CSV/JSON, archives, dirs
│   ├── ast-tools/index.ts             #   Tools ast_grep/ast_edit: structural search and editing
│   ├── source-navigation/index.ts     #   Tools read_ranges/edit_at_anchor
│   └── node_modules/pi-graphify/      #   Bundled graphify extension (/graphify + graph-first hooks)
│
├── skills/                            # → ~/.pi/agent/skills/ (recursive SKILL.md discovery)
│   ├── planning/                      #   plan-mode, grill, PRD/issues, interface design
│   ├── quality/                       #   self-verify, review, TDD, diagnose, refactor
│   ├── workflow/                      #   handoff, triage, QA, setup
│   ├── research/                      #   web, browser, MCP, subagents
│   ├── tools/                         #   artifact-analysis, write-a-skill
│   ├── memory/                        #   ai-memory
│   └── node_modules/pi-graphify/skills/graphify/SKILL.md # Graph workflows
│
├── prompts/                           # → ~/.pi/agent/prompts/ (global)
│   ├── plan.md
│   ├── verify.md
│   ├── review.md
│   ├── handoff.md
│   └── review-matrix.md
│
└── templates/                         # → Manually copy per project
    ├── AGENTS.template.md             #   → ./AGENTS.md
    ├── CONTEXT.template.md            #   → ./CONTEXT.md
    ├── INDEX.template.md              #   → ./docs/INDEX.md
    ├── ADR.template.md                #   → ./docs/adr/0001-*.md
    └── settings.template.json         #   → ./.pi/settings.json
```

### Package manifest (package.json)

```json
{
  "name": "pi-dev-starter-kit",
  "version": "1.0.0",
  "description": "Pi.dev harness foundation — security, quality, workflow, and tools for any project",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": [
      "./extensions/permission-gate",
      "./extensions/rtk-rewrite",
      "./extensions/post-edit-lint",
      "./extensions/loop-protection",
      "./extensions/task-tracker",
      "./extensions/lsp-bridge",
      "./extensions/monitor-bash",
      "./extensions/contrib-gate",
      "./extensions/auto-memory",
      "./extensions/setup-ai-memory",
      "./extensions/starter-kit-doctor",
      "./extensions/artifact-read",
      "./extensions/ast-tools",
      "./extensions/source-navigation",
      "./extensions/init-starter-kit",
      "./node_modules/pi-graphify/extensions"
    ],
    "skills": ["./skills", "./node_modules/pi-graphify/skills"],
    "prompts": ["./prompts"]
  },
  "dependencies": {
    "pi-web-access": "git:github.com/nicobailon/pi-web-access",
    "pi-subagents": "git:github.com/nicobailon/pi-subagents",
    "pi-mcp-adapter": "git:github.com/nicobailon/pi-mcp-adapter",
    "pi-agent-browser-native": "git:github.com/fitchmultz/pi-agent-browser-native",
    "context-mode": "git:github.com/mksglu/context-mode",
    "pi-graphify": "git+ssh://git@github.com/c4iov1/pi-graphify.git"
  },
  "bundledDependencies": ["pi-graphify"],
  "peerDependencies": {
    "@anthropic-ai/claude-code": "*",
    "@anthropic-ai/claude-code-core": "*"
  }
}
```

### Ecosystem curation (direct dependencies)

> **Direct dependency policy**: Third-party dependencies are referenced directly from original repositories — no forks. This simplifies maintenance (single repository) and allows receiving upstream improvements automatically. If an upstream repo breaks or is discontinued, the fallback is to fork at that point.

| Package | Author | Category | Function |
|---|---|---|---|
| `pi-web-access` | nicobailon | Web | Search, fetch, GitHub clone, PDF, YouTube |
| `pi-subagents` | nicobailon | Orchestration | Delegation with chains and parallel |
| `pi-mcp-adapter` | nicobailon | Integration | MCP servers (database, external APIs) |
| `pi-agent-browser-native` | fitchmultz | Browser | Browser automation |
| `context-mode` | mksglu | Context | Sandbox tools, FTS5 session continuity, 98% context savings, Think-in-Code paradigm |
| `pi-graphify` | c4iov1 | Graph navigation | Graph-first codebase orientation, `/graphify`, freshness reminders, and graph query workflows |

**Packages removed as external dependencies (reimplemented as internal extensions):**

| Original package | Reason | Replaced by |
|---|---|---|
| `pi-quick-perms` (cmptr) | Redundant with `permission-gate` — both implement permission pipelines | `extensions/permission-gate/` (absorbed) |
| `pi-contrib-gate` (nandal) | Simple functionality (regex over git ops) — doesn't justify external dependency | `extensions/contrib-gate/` (reimplemented) |
| `pi-memory` (samfoy) | PRD recommends lightweight approach (MEMORY.md index-style) — internal implementation more suitable | `extensions/auto-memory/` (reimplemented) |

> **Note on context-mode**: This is a high-impact dependency that **changes the agent's data processing paradigm**. Instead of reading raw files/data into context, the model uses sandbox tools (`ctx_execute`, `ctx_batch_execute`, `ctx_search`) that process data in isolated runtimes and return only results. Session continuity via SQLite+FTS5 ensures the agent never loses state between compactions. The kit's SYSTEM.md integrates context-mode routing rules — there are no two competing instruction files.

### Optional integration: ai-memory (external service)

> **Not a kit dependency** — it's an external upstream service from `akitaonrails/ai-memory` that the user installs separately. The kit should only document setup, routing, and fallback. Do not fork or copy code.

`ai-memory` replaces the previous `agentmemory`-based proposal. Akita's research showed that `agentmemory` had good ideas but structural operational problems: BM25 reindexing on restart, data loss window from persistence debounce, inconsistent configuration, hooks dropping tool calls, cwd-dependent state store, and multi-process/ports architecture.

`ai-memory` uses a simpler, auditable design:

- **Rust single binary + Axum** for HTTP/MCP and hooks
- **Markdown in git as source of truth** (`wiki/`)
- **SQLite + FTS5** as derived index, with single writer and WAL
- **Fire-and-forget hooks** for automatic capture without blocking the agent
- **Cross-agent handoff** between Claude Code, Codex, OpenCode, Cursor, Gemini CLI, and Pi
- **LLM and embeddings optional** — FTS5 works without keys
- **Workspace/project isolation** via `.ai-memory.toml`

Comparison with `auto-memory` (#016):

| | auto-memory (built-in) | ai-memory (optional external) |
|---|---|---|
| Storage | `MEMORY.md` flat file | Markdown wiki in git + SQLite/FTS5 |
| Capture | Manual via `memory_save` | Automatic prompt/tool/session hooks |
| Search | Keyword grep | FTS5 + links/graph + optional embeddings |
| Handoff | Manual | SessionStart/SessionEnd cross-agent |
| Infra | Zero | Docker/binary + local server |
| Role in kit | Default fallback | Optional advanced memory |

**Recommended Pi setup**: run `/setup-ai-memory`, which downloads the upstream wrapper, brings up the container (`--platform linux/amd64` when needed), installs routing in `AGENTS.md`, and uses native Pi extension hooks to post lifecycle events to ai-memory's `/hook`. See `docs/ai-memory-integration-plan.md` and `docs/references/9-ai-memory.md`.


### Integrated mattpocock/skills

> **Trust policy**: The [mattpocock/skills](https://github.com/mattpocock/skills) (Reference Doc 8) are maintained by a trusted architect and follow the open `SKILL.md` standard compatible with Pi.dev, Claude Code, Codex, and Cursor. **No fork needed** — they are included directly as a dependency or copied to the kit's `skills/` directory.

The skills form the kit's **engineering workflow**. Canonical order of use (Reference Doc 8, section 10):

```
1. /grill-with-docs    ← Before any design decision
2. /grill-me           ← Plan stress-test (alternative to grill-with-docs)
3. /to-prd             ← Synthesize discussion into PRD
4. /to-issues          ← Break PRD into issues (vertical slices)
5. /tdd                ← Implement slice by slice (RED→GREEN→REFACTOR)
6. /qa                 ← Conversational QA → file issues
7. /triage             ← Process issues through state machine
8. /improve-codebase-architecture ← Every few days
9. /diagnose           ← Hard bugs and performance regressions
10. /handoff           ← Close session / hand off to another agent
```

**Skill taxonomy:** Skills are organized under `skills/<category>/<skill>/SKILL.md`. Pi package skill discovery is recursive, so commands remain `/skill:<name>` while the filesystem now communicates workflow stage.

| Category | Purpose | Skills |
|---|---|---|
| Planning | Shape requirements and solution direction before coding | `plan-mode`, `grill-me`, `grill-with-docs`, `to-prd`, `to-issues`, `zoom-out`, `design-an-interface` |
| Quality | Verify correctness and improve maintainability | `self-verify`, `review-matrix`, `tdd`, `diagnose`, `improve-codebase-architecture`, `structural-refactor` |
| Workflow | Manage handoff, QA, issue flow, and setup | `handoff`, `triage`, `qa`, `setup-matt-pocock-skills` |
| Research | Gather outside context or delegate exploration | `web-research`, `browser-testing`, `mcp-orchestration`, `subagent-delegation` |
| Tools | Specialized tool workflows and skill authoring | `artifact-analysis`, `write-a-skill` |
| Memory | Long-term project memory and handoffs | `ai-memory` |

**Skills included in the kit:**

| Skill | Category | Function | Reference |
|---|---|---|---|
| `setup-matt-pocock-skills` | Setup | Mandatory entry point. Configures `AGENTS.md` with `## Agent skills` block, creates `docs/agents/` (issue-tracker, triage-labels, domain). Run once per repo. | Ref 8 §5 |
| `grill-with-docs` | Engineering | Deep interview that challenges plans against the domain model, refines terminology, updates CONTEXT.md and ADRs inline. **The most powerful skill in the repo.** | Ref 8 §6.1 |
| `grill-me` | Engineering | Relentlessly interviews about a plan until resolving each branch of the decision tree. Lighter alternative to grill-with-docs. | Ref 8 §6.1 |
| `to-prd` | Engineering | Converts conversation context into PRD. Template: problem, solution, user stories, implementation decisions. **Does not interview** — synthesizes what it already knows. | Ref 8 §6.1 |
| `to-issues` | Engineering | Breaks PRD/plan into independent issues using vertical slices. Anti-pattern: horizontal slicing. | Ref 8 §6.1 |
| `tdd` | Engineering | Red-green-refactor loop. Bundled resources: deep modules, interface design, mocking, refactoring, testing guidelines. | Ref 8 §6.1 |
| `diagnose` | Engineering | Disciplined loop: reproduce → minimise → hypothesise → instrument → fix → regression-test. Advanced strategies: bisection harness, differential loop. | Ref 8 §6.1 |
| `triage` | Engineering | Issue state machine: needs evaluation → waiting on reporter → ready for AFK agent → ready for human → won't fix. | Ref 8 §6.1 |
| `improve-codebase-architecture` | Engineering | Finds deepening opportunities informed by CONTEXT.md and ADRs. Rescues codebases that became ball of mud. | Ref 8 §6.1 |
| `design-an-interface` | Engineering | Generates multiple radically different interface designs using parallel sub-agents. "Design it twice." | Ref 8 §6.1 |
| `zoom-out` | Engineering | High-level perspective on unfamiliar code. | Ref 8 §6.1 |
| `qa` | Engineering | Interactive QA: user reports bugs, agent explores codebase, files issues. | Ref 8 §6.1 |
| `handoff` | Productivity | Compacts conversation into handoff document for another agent to continue. | Ref 8 §6.2 |
| `write-a-skill` | Productivity | Creates new skills with proper structure, progressive disclosure, bundled resources. | Ref 8 §6.2 |

**Skills NOT included** (too specific or redundant with the kit):

| Skill | Exclusion reason |
|---|---|
| `migrate-to-shoehorn` | Specific to Total TypeScript ecosystem |
| `scaffold-exercises` | Specific for educational exercise creation |
| `git-guardrails-claude-code` | Redundant — the kit already has `permission-gate` extension with the same protections |
| `request-refactor-plan` | Redundant — covered by `improve-codebase-architecture` + `to-issues` |

### Integration with the kit workflow

The mattpocock skills fit into the kit's layers:

```
┌─────────────────────────────────────────────────────────┐
│                LAYER C: WORKFLOW & QUALITY               │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ PLANNING                                         │   │
│  │ /grill-with-docs  →  /grill-me  →  /to-prd       │   │
│  │ /design-an-interface (when needed)               │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ DECOMPOSITION                                   │   │
│  │ /to-issues  →  independent issues                │   │
│  │ (vertical slices, NOT horizontal)                │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ EXECUTION                                        │   │
│  │ /tdd (RED→GREEN→REFACTOR)                       │   │
│  │ + kit's self-verify skill                        │   │
│  │ + kit's post-edit-lint extension                 │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ VERIFICATION & ITERATION                         │   │
│  │ /qa  →  /triage  →  /diagnose (if bug)         │   │
│  │ /improve-codebase-architecture (periodic)       │   │
│  │ /zoom-out (for new code context)                │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ CLOSING                                          │   │
│  │ /handoff  →  document for next agent             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Principles inherited from mattpocock/skills (Reference Doc 8):**

1. **Feedback loops are fundamental** (Ref 8 §8): Static types + browser access + automated tests. Without feedback on how code runs, the agent flies blind. The kit implements this via `post-edit-lint`, `lsp-bridge`, `self-verify` skill, and `browser-testing` skill.

2. **Vertical slices, never horizontal** (Ref 8 §6.1 `/to-issues`): Each issue should be a complete slice (UI → logic → data → test), not a horizontal layer ("all tests first").

3. **Deep modules** (Ref 8 §6.1 `/to-prd`): Actively identify opportunities to extract modules that encapsulate lots of functionality behind a simple, testable interface.

4. **Spend disproportionate effort on the feedback signal** (Ref 8 §6.1 `/diagnose`): If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause. If you don't, no amount of code reading will save you.

5. **CONTEXT.md pays dividends** (Ref 8 §7): "There's a problem with the materialization cascade" vs "There's a problem when a lesson inside a section of a course is made real". The conciseness of the domain glossary pays off in every session.

### Adoption flow

```
# 1. One-time installation (global)
pi install git:github.com/user/pi-dev-starter-kit

# 2. New project — copy templates
cp ~/.pi/agent/packages/pi-dev-starter-kit/templates/AGENTS.template.md ./AGENTS.md
cp ~/.pi/agent/packages/pi-dev-starter-kit/templates/CONTEXT.template.md ./CONTEXT.md
cp ~/.pi/agent/packages/pi-dev-starter-kit/templates/settings.template.json ./.pi/settings.json
mkdir -p docs/adr
cp ~/.pi/agent/packages/pi-dev-starter-kit/templates/INDEX.template.md ./docs/INDEX.md

# 3. Edit AGENTS.md with project details
# 4. Adjust .pi/settings.json (enable/disable modules)
# 5. Done. Every `pi` session in the project inherits the kit.
```

### What is global vs what is per-project

```
┌─────────────────────────────────────────────────────────┐
│                    GLOBAL (~/.pi/agent/)                 │
│  Installed ONCE. Present in EVERY session.              │
│                                                         │
│  SYSTEM.md          ← Tool categories + workflow        │
│  APPEND_SYSTEM.md   ← Additional instructions           │
│  extensions/        ← permission-gate, post-edit-lint,  │
│                        loop-protection, task-tracker,   │
│                        lsp-bridge, monitor-bash,        │
│                        contrib-gate, auto-memory,       │
│                        setup-ai-memory, doctor,         │
│                        artifact-read, ast-tools,        │
│                        source-navigation                │
│  skills/            ← plan-mode, self-verify,           │
│                        web/browser/subagent/MCP,        │
│                        ai-memory, artifact-analysis,    │
│                        structural-refactor,             │
│                        review-matrix                    │
│  prompts/           ← plan, verify, review, handoff,    │
│                        review-matrix                    │
│  packages/          ← Ecosystem dependencies           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               PER PROJECT (./ and ./.pi/)               │
│  Copied from templates. Unique per project.             │
│                                                         │
│  ./AGENTS.md        ← Project index, stack,             │
│                        conventions, docs/ pointers       │
│  ./CONTEXT.md       ← Domain glossary                   │
│  ./.pi/settings.json← Feature flags: what to enable     │
│  ./docs/INDEX.md    ← Project reference index           │
│  ./docs/adr/        ← Architecture decisions            │
│  ./.pi/extensions/  ← Project-specific extensions       │
│  ./.pi/skills/      ← Domain/stack skills               │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Capability Map — 4 Layers

### Layer A: Context & Documentation

`rtk-rewrite` complements context-mode by reducing noisy shell output at the source. After a command passes the security pipeline, the extension delegates supported agent `bash` commands to the external `rtk` executable (`rtk rewrite <command>`). This is optimization-only: RTK is not a permission layer, is not vendored by the starter kit, and fails open to the original command if unavailable. Starter-kit users do not need to run `rtk init --agent pi`; the package-level extension activates globally by default when installed.

```
┌─────────────────────────────────────────────────────┐
│                 CONTEXT INJECTION                    │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ SYSTEM.md                                     │  │
│  │ ├─ Tool categories (6 groups)                 │  │
│  │ ├─ Canonical workflow (Plan→Search→Edit→Test  │  │
│  │ │   →Lint→Verify→Done)                        │  │
│  │ ├─ Think-in-Code routing (context-mode):      │  │
│  │ │   bash/read for direct ops; large data →    │  │
│  │ │   ctx_execute sandbox                       │  │
│  │ ├─ Security rules (permission gates)          │  │
│  │ └─ Progressive disclosure (when to use skills)│  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Session Continuity (context-mode SQLite+FTS5) │  │
│  │ ├─ Every edit, git op, task, error indexed   │  │
│  │ ├─ After compaction: BM25 search recovers    │  │
│  │ │   only relevant state — no state flooding  │  │
│  │ └─ Resume: ctx_search(sort:"timeline")      │  │
│  │     recovers previous session state          │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ AGENTS.md (~100 lines)                        │  │
│  │ ├─ Directory index (docs/, src/, tests/)      │  │
│  │ ├─ Pointers to CONTEXT.md, docs/adr/          │  │
│  │ ├─ Detected stack + essential commands        │  │
│  │ └─ Non-negotiable rules (enforced via CI)     │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ CONTEXT.md (domain glossary)                  │  │
│  │ ├─ Canonical project terminology              │  │
│  │ └─ No implementation details                  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ MEMORY.md (auto memory across sessions)        │  │
│  │ ├─ Agent notes about the project              │  │
│  │ └─ Reload post-compaction                     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Deliverables:**
- Global `SYSTEM.md` — tool categories + canonical workflow + Think-in-Code routing rules (context-mode integrated)
- Global `APPEND_SYSTEM.md` — workflow instructions appended to system prompt
- `mcp.json` — context-mode MCP server config (`~/.pi/agent/mcp.json`)
- `AGENTS.template.md` — template to copy to project root (~100 lines, index-style)
- `CONTEXT.template.md` — domain glossary template to copy to root
- `INDEX.template.md` — reference index template for `docs/INDEX.md`

---

### Layer B: Tools & Security

```
┌─────────────────────────────────────────────────────┐
│              TOOLS & SECURITY                        │
│                                                     │
│  Tool Categories (loaded in system prompt):         │
│                                                     │
│  ┌─ File I/O ──────────────────────────────────┐   │
│  │ read, write, edit (native)                   │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Search ────────────────────────────────────┐   │
│  │ grep, glob, find, ls (native)               │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Execution ─────────────────────────────────┐   │
│  │ bash (native), monitor (extension)           │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Web (activated via web-research skill) ─────┐   │
│  │ web_search, web_fetch (pi-web-access)        │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Orchestration (activated via skills) ───────┐   │
│  │ subagent (pi-subagents), mcp_* (pi-mcp)      │   │
│  │ browser (pi-agent-browser-native)            │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Quality ───────────────────────────────────┐   │
│  │ task_create, task_update (task-tracker ext)  │   │
│  │ lsp_check (lsp-bridge extension)             │   │
│  │ ask_user (rpiv-ask-user-question)            │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Security Gates (always active):                    │
│  ┌──────────────────────────────────────────────┐   │
│  │ PreToolUse hook                              │   │
│  │ ├─ Blocks: rm -rf, git push --force,         │   │
│  │ │   DROP TABLE, sudo, chmod 777              │   │
│  │ ├─ Write constraint: requires prior read    │   │
│  │ └─ Path confinement: doesn't escape workspace│   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Approval Modes:                                    │
│  ┌─ default ──────┐ ┌─ acceptEdits ───┐             │
│  │ visible diff,   │ │ auto-approves   │             │
│  │ [y/N] per edit  │ │ edits, bash     │             │
│  │                 │ │ still gated     │             │
│  └─────────────────┘ └─────────────────┘             │
│  ┌─ featureWork ─────────────────────────────────┐   │
│  │ session/project-scoped implementation mode:   │   │
│  │ auto-allows read/write/edit + bash only inside│   │
│  │ active project; git commit/push, network, and │   │
│  │ outside-project paths still ask/block         │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Deliverables (all global, loaded in every session):**
- Extension `permission-gate` — PreToolUse hook, write constraint, path confinement, and `/feature-mode` project-scoped implementation permissions persisted to `.pi/settings.json`
- Extension `rtk-rewrite` — `tool_call` mutation for agent `bash` commands after permission-gate; uses `pi.exec("rtk", ["rewrite", command])`, accepts RTK exit codes `0` and `3` as rewrite success, and fails open on missing RTK/timeouts/errors. Commands: `/rtk-status`, `/rtk-gain`, `/rtk-toggle`.
- Extension `post-edit-lint` — PostToolUse hook: post-edit lint
- Extension `loop-protection` — doom-loop detection + diminishing returns
- Extension `task-tracker` — TaskCreate/TaskUpdate tools
- Extension `lsp-bridge` — post-edit type errors + `lsp_definition`, `lsp_references`, `lsp_rename`, `lsp_workspace_symbols`
- Extension `monitor-bash` — background bash with streaming
- Extension `setup-ai-memory` — admin commands + Pi hooks for external ai-memory service
- Extension `starter-kit-doctor` — environment and capability diagnostics
- Extension `artifact-read` — `artifact_read` read-only for SQLite, CSV/JSON/JSONL, archives, and directories
- Extension `ast-tools` — `ast_grep` and preview-only `ast_edit` for structural search/codemods
- Extension `source-navigation` — `read_ranges` and preview-only `edit_at_anchor` with hash anchors
- Curation of 5 ecosystem packages (direct dependencies from original repos)
- Extension `contrib-gate` — git workflow: branch naming + conventional commits
- Extension `auto-memory` — lightweight MEMORY.md persistence across sessions

---

### Layer C: Workflow & Quality

```
┌─────────────────────────────────────────────────────┐
│            WORKFLOW & QUALITY                        │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │           THE CPiLETE CYCLE                  │   │
│  │                                              │   │
│  │  ┌──────────┐    ┌──────────┐    ┌────────┐  │   │
│  │  │  PLAN    │───▶│  SEARCH  │───▶│  EDIT  │  │   │
│  │  │ plan.md  │    │ grep,    │    │ read   │  │   │
│  │  │ + TODOs  │    │ glob, ls │    │ before │  │   │
│  │  └──────────┘    └──────────┘    │ write  │  │   │
│  │                                  └───┬────┘  │   │
│  │                                      │       │   │
│  │  ┌──────────┐    ┌──────────┐        │       │   │
│  │  │  DONE    │◀───│ VERIFY   │◀───────┘       │   │
│  │  │ output   │    │ test,    │                │   │
│  │  │ final    │    │ lint,    │    ┌────────┐  │   │
│  │  └──────────┘    │ typeck   │◀───│  FIX   │  │   │
│  │                  └──────────┘    └────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Workflow Skills:                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ plan-mode                                    │   │
│  │ ├─ Creates plan.md with checklist            │   │
│  │ ├─ Registers TODOs via task-tracker          │   │
│  │ └─ Updates progress at each milestone        │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ self-verify                                  │   │
│  │ ├─ Runs tests after each change set          │   │
│  │ ├─ Compares output with spec, not code       │   │
│  │ ├─ Auto lint + type-check                    │   │
│  │ └─ Checklist: happy path + edge cases        │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Deterministic Hooks:                               │
│  ┌──────────────────────────────────────────────┐   │
│  │ PostToolUse (post-edit-lint)                 │   │
│  │ ├─ After edit/write: runs lint --fix         │   │
│  │ ├─ Injects errors/warnings into context      │   │
│  │ └─ Model sees immediate feedback             │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ PostToolUse (lsp-bridge)                     │   │
│  │ ├─ After edit: incremental type-check        │   │
│  │ └─ Reports type errors in context            │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ session_before_compact (compaction hook)     │   │
│  │ ├─ Preserves AGENTS.md + SYSTEM.md verbatim  │   │
│  │ └─ Re-injects post-compaction                │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Loop Protection (always active):                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ ├─ Doom-loop: N edits on same file           │   │
│  │ │   → "Consider reconsidering approach"      │   │
│  │ ├─ Diminishing returns: 3 iterations <500    │   │
│  │ │   tokens → force stop                      │   │
│  │ └─ Context starvation: >85% used             │   │
│  │     → suggestion to /compact                 │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Deliverables (all global, loaded in every session):**
- Kit skills (in-house):
  - `plan-mode` — structured planning (plan.md → checklist → execute)
  - `self-verify` — build→test→lint→fix→verify cycle
  - `web-research` — web search + fetch + documentation synthesis
  - `browser-testing` — browser automation for visual testing
  - `subagent-delegation` — when and how to delegate to sub-agents
  - `mcp-orchestration` — MCP server usage
  - `ai-memory` — external ai-memory service usage when installed
  - `artifact-analysis` — structured SQLite/CSV/JSON/archive investigation with `artifact_read`
  - `structural-refactor` — refactor/codemod with AST + LSP
  - `review-matrix` — independent multi-pass review (correctness, security, design)
- Integrated skills (mattpocock/skills — Reference Doc 8):
  - `setup-matt-pocock-skills`, `grill-with-docs`, `grill-me`, `to-prd`, `to-issues`, `tdd`, `diagnose`, `triage`, `improve-codebase-architecture`, `design-an-interface`, `zoom-out`, `qa`, `handoff`, `write-a-skill`
- Prompt templates — `plan.md`, `verify.md`, `review.md`, `handoff.md`, `review-matrix.md`
- Compaction hook — `session_before_compact`: preserves SYSTEM.md verbatim, re-injects post-compaction

---

### Layer D: Per-Project Extensibility

```
┌─────────────────────────────────────────────────────┐
│          PER-PROJECT EXTENSIBILITY                   │
│                                                     │
│  .pi/settings.json (per-project feature flags):     │
│  ┌──────────────────────────────────────────────┐   │
│  │ {                                            │   │
│  │   "starterKit": {                            │   │
│  │     "permissionMode": "default", // or       │   │
│  │                           // "acceptEdits" / │   │
│  │                           // "featureWork"   │   │
│  │     "activeExtensions": [                    │   │
│  │       "permission-gate",                     │   │
│  │       "rtk-rewrite",                         │   │
│  │       "post-edit-lint",                      │   │
│  │       "loop-protection",                     │   │
│  │       "task-tracker",                        │   │
│  │       "lsp-bridge",    // optional           │   │
│  │       "monitor-bash",  // optional           │   │
│  │       "contrib-gate",                        │   │
│  │       "auto-memory",                         │   │
│  │       "setup-ai-memory"                      │   │
│  │     ],                                       │   │
│  │     "activeSkills": [                        │   │
│  │       "plan-mode",                           │   │
│  │       "self-verify",                         │   │
│  │       "web-research",                        │   │
│  │       "browser-testing",  // optional        │   │
│  │       "subagent-delegation",                 │   │
│  │       "mcp-orchestration", // optional        │   │
│  │       "ai-memory"         // optional        │   │
│  │     ],                                       │   │
│  │     "webSearch": "cached",                   │   │
│  │     "autoLint": true,                        │   │
│  │     "autoVerify": true                       │   │
│  │   }                                          │   │
│  │ }                                            │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Per-project extension points:                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ .pi/extensions/                              │   │
│  │ ├─ stack-detection.ts    # Detects Node, Py, │   │
│  │ │                          Rust, Go, etc.    │   │
│  │ ├─ custom-tools.ts       # Project-specific  │   │
│  │ │                          tools             │   │
│  │ └─ project-hooks.ts      # Project hooks     │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ .pi/skills/                                  │   │
│  │ ├─ domain-knowledge/     # Domain skill      │   │
│  │ ├─ deployment/           # Deploy skill      │   │
│  │ └─ database-migrations/  # DB skill          │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ AGENTS.md (project override)                 │   │
│  │ ├─ Specific stack + commands                 │   │
│  │ ├─ Code conventions                          │   │
│  │ ├─ Directory structure                       │   │
│  │ └─ Pointers to local docs/                   │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ docs/adr/  (architecture decisions)          │   │
│  │ docs/INDEX.md  (reference index)             │   │
│  │ CONTEXT.md  (domain glossary)                │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Deliverables:**
- `settings.template.json` — documented feature flags, to copy to `.pi/settings.json`
- Project file templates — `AGENTS.template.md`, `CONTEXT.template.md`, `INDEX.template.md`, `ADR.template.md`
- Project `AGENTS.md` — edited with stack, conventions, directory structure
- `.pi/extensions/` — extension point for project-specific tools
- `.pi/skills/` — extension point for domain/stack skills
- Documentation on how to extend the kit per project (README.md)

---

## Extension dependency layers

Extensions are organized into four one-way layers. See `docs/extension-layers.md` for the full catalog and dependency rules.

```text
Layer 4: Integration  setup-ai-memory, starter-kit-doctor, init-starter-kit
Layer 3: Feature      artifact-read, lsp-bridge, ast-tools, source-navigation,
                      auto-memory, contrib-gate, monitor-bash, rtk-rewrite
Layer 2: Core         permission-gate, post-edit-lint, loop-protection, task-tracker
Layer 1: Shared       extensions/shared/path-utils, settings, errors, constants
```

Rules:

1. Shared utilities may be imported by any extension and must not import extension code.
2. Core extensions may import from shared only.
3. Feature extensions should import from shared only; move common code down to shared.
4. Integration extensions may import from lower layers when needed.
5. No circular dependencies; verify with `npx madge extensions --extensions ts --circular` when available.

---

## Shared constants guidelines

Extensions should use `extensions/shared/constants.ts` for shared limits, defaults, and thresholds:

- Pagination limits use `DEFAULT_PAGE_SIZE` and `MAX_PAGE_SIZE`.
- Artifact helper processes use `ARTIFACT_PROCESS_TIMEOUT_MS` and `ARTIFACT_PROCESS_MAX_BUFFER_BYTES`.
- File signatures use `MAGIC_BYTES_LENGTH` for SQLite magic byte detection.
- Runtime defaults such as `DEFAULT_RTK_REWRITE_TIMEOUT_MS` and `DEFAULT_LOOP_PROTECTION_MIN_TOKENS` should be changed in one place.
- Template comments in `templates/settings.template.json` should reference the matching constant when a user-facing value mirrors code defaults.

---

## Error handling guidelines

Extensions should use `extensions/shared/errors.ts` for new error paths:

- Throw `ExtensionError` subclasses for validation and invariant failures inside helper functions.
- Return tool-shaped error payloads at extension boundaries; do not let helper exceptions escape tool handlers.
- Use machine-readable `ErrorCodes` plus a short human message and an actionable `suggestion`.
- Use `formatError()` for user-facing text and `errorResult()` for structured `{ ok: false }` responses.
- Prefer `normalizeError()`, `safeExecute()`, or `safeExecuteSync()` when converting unknown thrown values.
- Avoid empty `catch {}` blocks unless the operation is explicitly best-effort and documented by a comment.

---

## 5. Comparison with Claude Code and Codex

### What's worth COPYING

| Feature | Source | How the kit implements it | Rationale (ref) |
|---|---|---|---|
| **Hierarchical CLAUDE.md** (global→project→subdir) | Claude Code (Ref 7) | AGENTS.md with index-style, ~100 lines | Ref 7: "CLAUDE.md survives compaction" |
| **3 tiers of tool activation** | Claude Code (Ref 7) | Skills with embedded tools + dynamic `setActiveTools` | Ref 7: "avoids system prompt overload" |
| **Prompt caching** (stable prefix) | Codex (Ref 6), Claude Code | Lean SYSTEM.md, skills via progressive disclosure | Ref 6: "every turn gets cache hit" |
| **Layered permission pipeline** | Claude Code (Ref 7) | PreToolUse hook with deny→allow→interactive | Ref 7: "98.4% deterministic infrastructure" |
| **Sandbox modes** (workspace-write / danger-full-access) | Codex (Ref 6) | Permission modes: default / acceptEdits / featureWork | Ref 6: "3 axes of autonomy control" |
| **PostToolUse lint hook** | Cursor (Ref 4) | Extension `post-edit-lint` | Ref 4: "surface lint errors after every edit" |
| **PreCompletionChecklistMiddleware** | LangChain (Ref 2) | Skill `self-verify` + prompt template `verify.md` | Ref 2: "most common failure pattern: not verifying" |
| **LoopDetectionMiddleware** | LangChain (Ref 2) | Extension `loop-protection` | Ref 2: "doom loops: 10+ edits on same file" |
| **Diminishing returns detection** | Claude Code (Ref 7) | Extension `loop-protection` | Ref 7: "3 iterations <500 tokens → stop" |
| **Task/TODO tracking tool** | Codex (`update_plan`), Claude Code (`TaskCreate`) | Extension `task-tracker` | Ref 3: "Working memory as separate layer" |
| **Plan mode** | Claude Code, Cursor | Skill `plan-mode` + prompt template | Ref 7: "state change in permission system" |
| **AGENTS.md as index** | Codex (Ref 6) | Canonical AGENTS.md template | Ref 6: "index, not encyclopedia" |
| **Web search with cache** | Codex (Ref 6) | `pi-web-access`, configurable | Ref 6: "pre-indexed results, reduces injection" |
| **MCP support** | Both | `pi-mcp-adapter` | Ref 6, Ref 7 |
| **Sub-agents** | Claude Code (`Agent` tool), Codex (`spawn_agent`) | `pi-subagents` | Ref 7: "isolated context windows" |

### What NOT to copy

| Feature | Source | Why NOT | Kit alternative |
|---|---|---|---|
| **Sandbox via Seatbelt/bubblewrap** | Codex (Ref 6) | OS-dependent, complex, out of scope | Run Pi.dev inside a container if needed |
| **Compaction via Responses API** (`encrypted_content`) | Codex (Ref 6) | Proprietary OpenAI API, unreachable without Codex model | Pi.dev native compaction + instruction preservation hook |
| **Agent Teams** | Claude Code (Ref 7) | Experimental, complex, env var gate | `pi-crew` for coordinated teams (if needed) |
| **Expansive Auto Memory** | Claude Code (Ref 7) | Overloads context, hallucination risk | Lean MEMORY.md, index-style |
| **Post-training on tool set** | Codex (GPT-5-Codex), Claude Code | Unreachable — depends on provider training the model | SYSTEM.md with extremely clear tool categories + examples |
| **App Server JSON-RPC** | Codex (Ref 6) | Overkill for individual use, maintenance complexity | Pi.dev native RPC mode |
| **Cloud Sandbox** | Codex (Ref 6) | OpenAI infrastructure, not reproducible | Local containers if needed |
| **Plugin marketplace** | Claude Code (Ref 7) | Pi.dev ecosystem already supplies via npm/git packages | Native `pi install` |
| **Managed Agents (API)** | Claude Code (Ref 7) | Managed service, not self-hosted | Pi.dev SDK for embedding |

---

## 6. How the Model Discovers Tools

### Progressive Disclosure Strategy

```
┌─────────────────────────────────────────────────────┐
│          SYSTEM PROMPT (stable cache)                │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ AVAILABLE TOOLS (categorized)                 │  │
│  │                                               │  │
│  │ File I/O: read, write, edit                   │  │
│  │ Search: grep, glob, find, ls                  │  │
│  │ Execution: bash, monitor                      │  │
│  │ Quality: task_create, task_update,            │  │
│  │          lsp_check, ask_user                  │  │
│  │                                               │  │
│  │ → Approximately 15 lean tool descriptions     │  │
│  │   in the system prompt                        │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ AVAILABLE SKILLS (progressive disclosure)     │  │
│  │                                               │  │
│  │ /skill:web-research                           │  │
│  │   → Activates web_search, web_fetch           │  │
│  │                                               │  │
│  │ /skill:browser-testing                        │  │
│  │   → Activates browser tools                   │  │
│  │                                               │  │
│  │ /skill:subagent-delegation                    │  │
│  │   → Activates subagent tools                  │  │
│  │                                               │  │
│  │ /skill:mcp-orchestration                      │  │
│  │   → Activates MCP tools                       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Typical task flow:**

1. Model receives task → consults SYSTEM.md → identifies relevant skills
2. Invokes skill (e.g., `web-research`) → SKILL.md loads + tools activated
3. Skill finishes → tools are deactivated → context returns to base state
4. Next task → repeats cycle with clean cache

**Why this works for multiple models:**

- Models don't need post-training on Pi.dev's tool set
- The system prompt is descriptive and categorized — any frontier model understands it
- Skills provide detailed instructions on-demand, not upfront
- Tool descriptions follow a consistent pattern (name, category, when to use, example)

---

## 7. Next Steps

### Phase 1: Package setup + verify dependencies (Agents A, B)

1. Package scaffold, `package.json` + global `SYSTEM.md` (#001)
2. Verify installation of 6 direct dependencies (#002, plus bundled `pi-graphify`)

### Phase 2: Core extensions (Agents C, D, E, F, G, H)

3. `permission-gate` — PreToolUse hook + write constraint (#003)
4. `rtk-rewrite` — context-efficiency bash rewrite; ordered after permission-gate and before execution
5. `post-edit-lint` — automatic post-edit lint (#004)
6. `loop-protection` — doom-loop + diminishing returns detection (#005)
7. `task-tracker` — TaskCreate/TaskUpdate tools (#006)
8. `contrib-gate` — Git workflow (#015)
9. `auto-memory` — lightweight MEMORY.md persistence (#016)
10. `setup-ai-memory` — Pi-native hooks + opt-in commands to install/configure/administer the upstream ai-memory service (#017)

### Phase 3: Core Skills & Templates (Agents I, J)

9. Core skills: `plan-mode` + `self-verify` (#009)
10. Prompt templates + project templates (#012)
11. Integrate 14 `mattpocock/skills` (#011)

### Phase 4: Advanced extensions + extra skills (Agents K, L, M, N)

12. `lsp-bridge` extension (#007)
13. `monitor-bash` extension (#008)
14. Extra skills: `web-research`, `browser-testing`, `subagent-delegation`, `mcp-orchestration` (#010)
15. `ai-memory` skill for using the optional external service (#017)

### Phase 5: Documentation & validation (Agent O + Human)

16. README.md + cross-model smoke test (#013)
17. Package publication & Release (#014)

### Final installation (user perspective)

```bash
# 1. Install the kit (once, global) — dependencies are resolved automatically
pi install git:github.com/caioo/pi-dev-starter-kit

# 3. New project — initial setup
pi
# → Run /setup-matt-pocock-skills
# → Copy templates: AGENTS.md, CONTEXT.md, .pi/settings.json
# → Edit AGENTS.md with project details

# 4. Done. Every session inherits the kit.
```
