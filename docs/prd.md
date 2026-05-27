# Pi.dev Starter Kit — PRD

> **Status**: Draft
> **Date**: 2026-05-15
> **Source**: Synthesis of the architecture defined in `docs/architecture.md`
> **References**: docs/references/1 through 8

---

## Problem Statement

A developer adopts Pi.dev as an AI coding harness because they want **model autonomy** — the ability to use Claude Opus, GPT-5, GLM-5, or any provider without being locked into a single ecosystem. Pi.dev delivers the minimum viable (7 native tools, sessions, extensibility), but it's missing the scaffolding that transforms a raw model into a productive coding agent.

Without this scaffolding, the developer faces:

- **Gap diagnosis**: The model underperforms and the developer doesn't know why. They spend hours or days discovering that web search is missing, context is polluted, the model doesn't verify its own work, destructive commands have no gate.
- **Insufficient tools**: Without web search, the model hallucinates library versions. Without sub-agents, long tasks pollute context. Without MCP, there's no integration with external services (database, Figma, APIs).
- **No guardrails**: Nothing prevents `rm -rf`, `git push --force`, or writes outside the workspace. Each session is a bet on the model's good faith.
- **Missing workflow**: The model writes code, re-reads it, thinks it's fine, and stops — without testing, without lint, without verification. Quality depends exclusively on prompt instructions, which the model can ignore.
- **Repetitive setup**: For each new project, the developer must reconfigure tools, extensions, skills, and instructions. There is no standardized starting point.

Competing harnesses (Claude Code, Codex) solve this — but at the cost of vendor lock-in. The developer wants the best of both worlds: the **capability** of a complete harness with the **freedom** to choose any model.

## Solution

An **installable Pi.dev package** that adds the missing security, quality, workflow, and tool layers to the base harness — in a single `pi install`. The kit is global (every session inherits it), but allows disabling modules per project via `settings.json`.

After installation, the developer:

1. Runs `pi install git:github.com/caioo/pi-dev-starter-kit` **once**
2. For each new project, copies 3 templates (AGENTS.md, CONTEXT.md, .pi/settings.json)
3. Runs `/setup-matt-pocock-skills` to configure the project domain
4. From then on, every Pi.dev session has: permission gates, automatic lint, loop protection, task tracking, LSP feedback, web search, sub-agents, MCP, browser, plan→verify workflow, and 14 engineering skills

The kit imposes no stack, domain, or product. The developer adds project-specific specialization in `.pi/extensions/` and `.pi/skills/`.

## User Stories

1. As a developer, I want to install a single package and immediately have a production-ready coding harness, so that I don't spend days diagnosing why the model underperforms.

2. As a developer, I want the harness to block destructive commands (`rm -rf`, `git push --force`, `DROP TABLE`) by default, so that I can trust the agent to operate safely on my machine.

3. As a developer, I want to see a diff of every file change and approve it before it's written, so that I maintain control over what the agent modifies.

4. As a developer, I want the agent to automatically run lint and type-check after every edit, so that errors are caught immediately instead of accumulating silently.

5. As a developer, I want the agent to detect when it's stuck in a loop (editing the same file repeatedly, producing diminishing output), so that it doesn't waste tokens and time.

6. As a developer, I want the agent to maintain a task list with progress tracking across turns, so that long-running tasks stay coherent even after context compaction.

7. As a developer, I want the agent to search the web for current documentation, library versions, and solutions, so that it doesn't hallucinate based on outdated training data.

8. As a developer, I want the agent to delegate investigation tasks to sub-agents with isolated context windows, so that my main conversation stays focused and uncluttered.

9. As a developer, I want to connect MCP servers (database, Figma, APIs) to the agent, so that it can interact with external services directly.

10. As a developer, I want the agent to use a browser for visual testing and web interaction, so that UI tasks are verified programmatically.

11. As a developer, I want the agent to follow a structured plan→build→test→fix→verify workflow, so that output quality is consistent regardless of which model I use.

12. As a developer, I want the agent to run tests and compare output against the spec (not its own code) before declaring work done, so that unverified code doesn't reach production.

13. As a developer, I want tool descriptions and instructions to load progressively via skills, so that the system prompt stays lean and the prompt cache isn't busted.

14. As a developer, I want an AGENTS.md template that works as an index (not an encyclopedia), so that the agent navigates the project efficiently.

15. As a developer, I want a CONTEXT.md template for my project's domain glossary, so that the agent uses precise terminology and avoids verbose explanations.

16. As a developer, I want to grill my plans against the domain model before writing code, so that design flaws are caught during planning, not during implementation.

17. As a developer, I want to convert planning discussions into a structured PRD and break it into independently-grabbable issues, so that complex work is decomposed into manageable vertical slices.

18. As a developer, I want test-driven development with red-green-refactor loops, so that every change is verified before moving to the next.

19. As a developer, I want a disciplined diagnosis loop for hard bugs (reproduce → minimise → hypothesise → instrument → fix → regression-test), so that debugging is systematic instead of guesswork.

20. As a developer, I want the harness to compact context while preserving critical instructions (AGENTS.md, SYSTEM.md) verbatim, so that long sessions don't lose their bearings.

21. As a developer, I want to run background bash commands with streaming output (servers, watchers, long builds), so that the agent can monitor processes without blocking the main loop.

22. As a developer, I want LSP-powered type error feedback after every edit, so that type mismatches are surfaced immediately without manual compilation.

23. As a developer, I want to enable or disable individual features (web search, browser, MCP, LSP) per project via a settings file, so that the harness adapts to different project needs without reinstalling.

24. As a developer, I want the entire kit to be a single Pi.dev package with curated dependencies, so that setup is simple and my workflow stays productive.

25. As a developer, I want to switch between models (Opus, GPT-5, GLM-5, etc.) and have the harness perform consistently, so that I'm never locked into a single provider.

26. As a developer, I want the agent to process large data (search results, logs, file contents) in a sandbox instead of dumping raw output into the context window, so that my context stays lean and the model doesn't degrade over long sessions.

27. As a developer, I want the agent to remember what files it was editing, what tasks are in progress, and what decisions were made — even after context compaction — so that long sessions don't lose their bearings.

28. As a developer, I want the agent to inspect SQLite databases, CSV/JSON/JSONL files, archives, and directory structures through a read-only structured tool, so that it does not invent fragile shell commands or flood context.

29. As a developer, I want the agent to use AST-based search and dry-run codemod previews for structural refactors, so that code changes avoid false positives in strings, comments, or formatting differences.

30. As a developer, I want LSP symbol operations (definition, references, rename preview, workspace symbols), so that source navigation and refactors use semantic information rather than only text search.

31. As a developer, I want a multi-pass review workflow with independent correctness, security, and maintainability passes, so that important changes get broader review coverage.

## Implementation Decisions

### Architecture

- **Package model**: The entire kit is a single Pi.dev package installable via `pi install git:...`. Extensions, skills, prompts, and system files are loaded globally from `~/.pi/agent/`. Per-project configuration lives in `./AGENTS.md`, `./CONTEXT.md`, `./.pi/settings.json`, and `./docs/`.

- **Progressive disclosure**: ~15 essential tools are described in the system prompt. Complex capabilities (web search, sub-agents, MCP, browser) are activated on-demand via skills, keeping the prompt cache lean.

- **Deterministic quality**: Lint, type-check, and loop protection are enforced by hooks — not by prompt. The model can't skip them.

- **Permission pipeline**: PreToolUse hook with deny rules → allow rules → interactive prompt. Three modes: `default` (approve each edit with visible diff), `acceptEdits` (auto-approve edits, gate bash), and `featureWork` (auto-approve project-scoped read/write/edit and bash for implementation work; `git commit`, `git push`, network commands, protected paths, and outside-project paths still ask/block).

### Modules

**Extensions (13 modules, built in-house):**

1. **permission-gate**: PreToolUse hook. Blocks destructive commands, enforces write constraint (must read file before overwriting except in explicit `featureWork` mode), confines paths to workspace root. Approval modes: `default` / `acceptEdits` / `featureWork`, with `/feature-mode` and `feature_mode_toggle` for session-scoped project implementation permissions.

2. **post-edit-lint**: PostToolUse hook. After every `edit` or `write` tool call, runs the project's linter/formatter (`--fix`) and injects results into context. Auto-detects ESLint, Biome, Prettier, or language-native formatters.

3. **loop-protection**: Monitors tool calls for doom-loops (N edits on same file → "reconsider approach") and diminishing returns (3 iterations <500 tokens → force stop). Warns at >85% context usage.

4. **task-tracker**: Registers `TaskCreate` and `TaskUpdate` tools. Tasks persist in `.pi/tasks.jsonl` and survive compaction. The model can track progress across turns.

5. **lsp-bridge**: PostToolUse hook. After edits, runs incremental type-check via the project's LSP or compiler (`tsc --noEmit`, `pyright`, `cargo check`) and reports type errors in context. Also registers TypeScript symbol tools: `lsp_definition`, `lsp_references`, `lsp_rename` (preview), and `lsp_workspace_symbols`.

6. **monitor-bash**: Registers `Monitor` tool. Runs a shell command in background, streams each output line as a tool result, supports timeout and cancellation.

7. **contrib-gate**: PreToolUse hook. Validates branch naming (feature/*, fix/*, etc.) and conventional commit messages. Configurable modes: `default` (warn) / `strict` (block).

8. **auto-memory**: Session hooks + custom tools. Persists agent learnings to `MEMORY.md` as a lightweight index. Tools: `memory_save`, `memory_search`. Limits context injection to last N entries.

9. **setup-ai-memory**: Registers `/setup-ai-memory` plus ai-memory admin commands. Orchestrates upstream wrapper install, Docker server startup, Pi-native lifecycle hook posting, AGENTS.md routing, upgrade, bootstrap, backup, lint, forget-sweep, and status. Explicit opt-in because it mutates global machine state.

10. **starter-kit-doctor**: Registers `starter_kit_doctor`. Reports installed/enabled extensions, skills, optional binaries, missing dependencies, and harness profile settings.

11. **artifact-read**: Registers `artifact_read`. Provides read-only, path-confined inspection for directories, CSV/JSON/JSONL, SQLite, and archives with pagination and safe preview.

12. **ast-tools**: Registers `ast_grep` and preview-only `ast_edit`. Uses `ast-grep` for structural search/codemod previews without direct writes.

13. **source-navigation**: Registers `read_ranges` and preview-only `edit_at_anchor`. Supports multi-range source reads and stale-context detection via line-content hashes.

**Skills (10 modules, built in-house):**

10. **plan-mode**: Structured planning skill. Creates `plan.md` with checklist, registers TODOs via task-tracker, updates progress at each milestone.

11. **self-verify**: Build→test→fix verification cycle. Runs tests, compares output against spec (not own code), checks happy path + edge cases.

12. **web-research**: Activates `web_search` and `web_fetch` tools. Teaches the model research patterns: search → filter → fetch → synthesize.

13. **browser-testing**: Activates browser automation tools. For visual testing, form interaction, screenshot verification.

14. **subagent-delegation**: Teaches when and how to delegate to sub-agents. Covers: exploration, parallel investigation, isolated experiments.

15. **mcp-orchestration**: Teaches MCP server usage patterns. Database queries, API integration, external tool interaction.

16. **ai-memory**: Teaches the agent to use Akita's external ai-memory service for always-on long-term memory, cross-agent handoffs, wiki search, and session continuity. Optional service installed explicitly via `/setup-ai-memory`; falls back to auto-memory when unavailable.

17. **artifact-analysis**: Teaches structured data/document investigation using `artifact_read`: inspect schema/shape first, sample before summarizing, paginate, avoid raw dumps.

18. **structural-refactor**: Teaches AST/LSP refactor workflow: use `ast_grep` for structural search, preview codemods with `ast_edit`, prefer LSP rename for semantic symbol changes, verify with tests/lint.

19. **review-matrix**: Teaches independent multi-pass review: correctness/regression, security/data-loss, maintainability/API/design, then consolidated findings.

**Skills (14 modules, integrated from mattpocock/skills):**

`setup-matt-pocock-skills`, `grill-with-docs`, `grill-me`, `to-prd`, `to-issues`, `tdd`, `diagnose`, `triage`, `improve-codebase-architecture`, `design-an-interface`, `zoom-out`, `qa`, `handoff`, `write-a-skill`.

**Context files (3 modules):**

- `SYSTEM.md`: Tool categories, canonical workflow, security rules, progressive disclosure instructions.
- `APPEND_SYSTEM.md`: Workflow instructions appended to the system prompt.
- `AGENTS.template.md`: Project index (~100 lines), pointers to docs/, stack conventions.

**Dependencies (5 packages, direct from original repos):**

`pi-web-access` (nicobailon), `pi-subagents` (nicobailon), `pi-mcp-adapter` (nicobailon), `pi-agent-browser-native` (fitchmultz), `context-mode` (mksglu). Referenced directly from original repositories — no forks needed. Three packages from the original architecture (`pi-quick-perms`, `pi-contrib-gate`, `pi-memory`) were removed as external dependencies and reimplemented as internal extensions (`permission-gate`, `contrib-gate`, `auto-memory`).

`context-mode` is the highest-impact dependency. It fundamentally changes the agent's data processing paradigm via sandbox tools (`ctx_execute`, `ctx_batch_execute`, `ctx_search`) and provides SQLite+FTS5 session continuity so the agent never loses state between compactions. The SYSTEM.md integrates context-mode's routing rules ("Think in Code") so there are no competing instruction sources.

### Design Principles

- **No post-training dependency**: Tool descriptions and system prompt must be clear enough for any frontier model to use without specific training on the Pi.dev tool set.
- **Skills as capability gates**: Complex tools are only in context when their skill is active. Skills register tools on activation and deregister on completion.
- **Direct dependencies**: Third-party packages reference original repos. If upstream breaks, fork reactively — not proactively.
- **Template-driven per-project setup**: Only 3 files to copy per project (AGENTS.md, CONTEXT.md, settings.json). Everything else is global.
- **Observation space vs action space**: The agent's observation space includes filesystem, web, MCP, and browser. Its action space is gated by the permission pipeline.

## Testing Decisions

### What makes a good test

- Tests verify external behavior, not implementation details
- Each vertical slice is independently verifiable
- Prefer agent-runnable tests (fast, deterministic, no human intervention)

### Modules to test

| Module | Test strategy |
|---|---|
| `permission-gate` | Unit tests: each deny rule, path confinement, write constraint. Integration: simulate tool calls with blocked/allowed patterns |
| `post-edit-lint` | Integration: simulate edit on fixture file, verify lint runs and output is injected |
| `loop-protection` | Unit tests: doom-loop detection thresholds, diminishing returns calculation |
| `task-tracker` | Unit tests: task CRUD, persistence across compaction simulation |
| `lsp-bridge` | Integration: edit fixture TypeScript/Python file, verify type errors surface |
| `monitor-bash` | Integration: run background command, verify streaming output |
| Skills (all 21) | Manual verification: invoke each skill, verify tool activation, workflow completion |

### Prior art

- `permission-gate` follows Claude Code's layered permission pipeline pattern (Reference Doc 7 §5)
- `post-edit-lint` follows Cursor's "surface lint errors after every edit" pattern (Reference Doc 4 §5)
- `loop-protection` follows LangChain's `LoopDetectionMiddleware` pattern (Reference Doc 2)
- `self-verify` follows LangChain's `PreCompletionChecklistMiddleware` pattern (Reference Doc 2)

## Out of Scope

- **Sandbox via Seatbelt/bubblewrap**: OS-level sandboxing depends on platform. Use containers if needed.
- **Compaction via Responses API**: Proprietary to OpenAI. Use Pi.dev's native compaction with preservation hook.
- **Agent Teams**: Experimental in Claude Code, requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`. Overkill for the starter kit.
- **Cloud sandbox / managed infrastructure**: The kit targets local development.
- **Plugin marketplace**: Pi.dev's `pi install` already solves discovery via npm/git.
- **Expansive Auto Memory**: Risk of context overload and hallucination. MEMORY.md as lightweight index instead.
- **App Server JSON-RPC**: The starter kit targets interactive/Pi.dev sessions, not multi-surface integration.
- **Model-specific prompt tuning**: The kit uses a single SYSTEM.md for all models. Per-model tuning is a project-level concern.
- **CI/CD integration**: Out of scope for v1. Can be added as a project-specific extension.
- **Stack-specific configurations**: The kit is stack-agnostic. Language/framework defaults are project-level.

## Further Notes

- The architecture document at `docs/architecture.md` contains the full technical specification, layer diagrams, and comparison with Claude Code/Codex.
- The `setup-matt-pocock-skills` skill must run once per project before other engineering skills can resolve issue tracker, triage labels, and domain docs.
- All 5 third-party dependencies reference original repos directly. The `package.json` points to the original repositories — no forks needed.
- **context-mode requirements**: Node.js >= 22.5 (or Bun). Requires `mcp.json` configuration at `~/.pi/agent/mcp.json`. The extension registers hooks (`tool_call`, `tool_result`, `session_start`, `session_before_compact`) automatically via the Pi.dev extension system. Session continuity data is stored in SQLite at `~/.context-mode/`.
- Cross-model testing (Opus, GPT-5, GLM-5) should be performed on at least 3 diverse tasks before declaring the kit production-ready.
- context-mode's "Think in Code" paradigm is a fundamental shift — the model must learn to write code scripts for data processing instead of reading raw data into context. The SYSTEM.md must be explicit about this routing.
