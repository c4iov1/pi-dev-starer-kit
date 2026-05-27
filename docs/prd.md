# Pi.dev Starter Kit — PRD

> **Status**: Draft
> **Data**: 2026-05-15
> **Fonte**: Síntese da arquitetura definida em `docs/architecture.md`
> **Referências**: docs/references/1 a 8

---

## Problem Statement

Um desenvolvedor adota o Pi.dev como harness de codificação com IA porque quer **autonomia de modelo** — poder usar Claude Opus, GPT-5, GLM-5 ou qualquer provider sem ficar preso a um ecossistema. O Pi.dev entrega o mínimo viável (7 ferramentas nativas, sessions, extensibilidade), mas falta o scaffolding que transforma um modelo bruto em um agente de codificação produtivo.

Sem esse scaffolding, o desenvolvedor enfrenta:

- **Diagnóstico de gaps**: O modelo não performa e o desenvolvedor não sabe por quê. Passa horas ou dias descobrindo que falta web search, que o contexto está poluído, que o modelo não verifica o próprio trabalho, que comandos destrutivos não têm gate.
- **Ferramentas insuficientes**: Sem web search, o modelo alucina versões de bibliotecas. Sem sub-agents, tarefas longas poluem o contexto. Sem MCP, não há integração com serviços externos (database, Figma, APIs).
- **Ausência de guardrails**: Nada impede `rm -rf`, `git push --force`, ou escritas fora do workspace. Cada sessão é uma aposta na boa-fé do modelo.
- **Falta de workflow**: O modelo escreve código, relê, acha que está bom e para — sem testar, sem lint, sem verificação. A qualidade depende exclusivamente de instruções em prompt, que o modelo pode ignorar.
- **Setup repetitivo**: A cada novo projeto, o desenvolvedor precisa reconfigurar tools, extensions, skills e instruções. Não há um ponto de partida padronizado.

Os harnesses concorrentes (Claude Code, Codex) resolvem isso — mas ao custo de vendor lock-in. O desenvolvedor quer o melhor dos dois mundos: a **capacidade** de um harness completo com a **liberdade** de escolher qualquer modelo.

## Solution

Um **pacote Pi.dev instalável** que adiciona ao harness base as camadas de segurança, qualidade, workflow e ferramentas que faltam — em um único `pi install`. O kit é global (toda sessão herda), mas permite desabilitar módulos por projeto via `settings.json`.

Após a instalação, o desenvolvedor:

1. Executa `pi install git:github.com/caioo/pi-dev-starter-kit` **uma vez**
2. Para cada novo projeto, copia 3 templates (AGENTS.md, CONTEXT.md, .pi/settings.json)
3. Roda `/setup-matt-pocock-skills` para configurar o domínio do projeto
4. A partir daí, toda sessão do Pi.dev tem: permission gates, lint automático, loop protection, task tracking, LSP feedback, web search, sub-agents, MCP, browser, plano→verify workflow, e 14 skills de engenharia

O kit não impõe stack, domínio ou produto. O desenvolvedor adiciona especialização por projeto em `.pi/extensions/` e `.pi/skills/`.

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

## Implementation Decisions

### Architecture

- **Package model**: The entire kit is a single Pi.dev package installable via `pi install git:...`. Extensions, skills, prompts, and system files are loaded globally from `~/.pi/agent/`. Per-project configuration lives in `./AGENTS.md`, `./CONTEXT.md`, `./.pi/settings.json`, and `./docs/`.

- **Progressive disclosure**: ~15 essential tools are described in the system prompt. Complex capabilities (web search, sub-agents, MCP, browser) are activated on-demand via skills, keeping the prompt cache lean.

- **Deterministic quality**: Lint, type-check, and loop protection are enforced by hooks — not by prompt. The model can't skip them.

- **Permission pipeline**: PreToolUse hook with deny rules → allow rules → interactive prompt. Two modes: `default` (approve each edit with visible diff) and `acceptEdits` (auto-approve edits, gate bash).

### Modules

**Extensions (8 modules, built in-house):**

1. **permission-gate**: PreToolUse hook. Blocks destructive commands, enforces write constraint (must read file before overwriting), confines paths to workspace root. Approval modes: `default` / `acceptEdits`.

2. **post-edit-lint**: PostToolUse hook. After every `edit` or `write` tool call, runs the project's linter/formatter (`--fix`) and injects results into context. Auto-detects ESLint, Biome, Prettier, or language-native formatters.

3. **loop-protection**: Monitors tool calls for doom-loops (N edits on same file → "reconsider approach") and diminishing returns (3 iterations <500 tokens → force stop). Warns at >85% context usage.

4. **task-tracker**: Registers `TaskCreate` and `TaskUpdate` tools. Tasks persist in `.pi/tasks.jsonl` and survive compaction. The model can track progress across turns.

5. **lsp-bridge**: PostToolUse hook. After edits, runs incremental type-check via the project's LSP or compiler (`tsc --noEmit`, `pyright`, `cargo check`) and reports type errors in context.

6. **monitor-bash**: Registers `Monitor` tool. Runs a shell command in background, streams each output line as a tool result, supports timeout and cancellation.

7. **contrib-gate**: PreToolUse hook. Validates branch naming (feature/*, fix/*, etc.) and conventional commit messages. Configurable modes: `default` (warn) / `strict` (block).

8. **auto-memory**: Session hooks + custom tools. Persists agent learnings to `MEMORY.md` as a lightweight index. Tools: `memory_save`, `memory_search`. Limits context injection to last N entries.

9. **setup-ai-memory**: Registers `/setup-ai-memory` plus ai-memory admin commands. Orchestrates upstream wrapper install, Docker server startup, Pi-native lifecycle hook posting, AGENTS.md routing, upgrade, bootstrap, backup, lint, forget-sweep, and status. Explicit opt-in because it mutates global machine state.

**Skills (7 modules, built in-house):**

10. **plan-mode**: Structured planning skill. Creates `plan.md` with checklist, registers TODOs via task-tracker, updates progress at each milestone.

11. **self-verify**: Build→test→fix verification cycle. Runs tests, compares output against spec (not own code), checks happy path + edge cases.

12. **web-research**: Activates `web_search` and `web_fetch` tools. Teaches the model research patterns: search → filter → fetch → synthesize.

13. **browser-testing**: Activates browser automation tools. For visual testing, form interaction, screenshot verification.

14. **subagent-delegation**: Teaches when and how to delegate to sub-agents. Covers: exploration, parallel investigation, isolated experiments.

15. **mcp-orchestration**: Teaches MCP server usage patterns. Database queries, API integration, external tool interaction.

16. **ai-memory**: Teaches the agent to use Akita's external ai-memory service for always-on long-term memory, cross-agent handoffs, wiki search, and session continuity. Optional service installed explicitly via `/setup-ai-memory`; falls back to auto-memory when unavailable.

**Skills (14 modules, integrated from mattpocock/skills):**

`setup-matt-pocock-skills`, `grill-with-docs`, `grill-me`, `to-prd`, `to-issues`, `tdd`, `diagnose`, `triage`, `improve-codebase-architecture`, `design-an-interface`, `zoom-out`, `qa`, `handoff`, `write-a-skill`.

**Context files (3 modules):**

- `SYSTEM.md`: Tool categories, workflow canônico, regras de segurança, progressive disclosure instructions.
- `APPEND_SYSTEM.md`: Instruções de workflow anexadas ao system prompt.
- `AGENTS.template.md`: Índice do projeto (~100 linhas), ponteiros para docs/, convenções da stack.

**Dependencies (5 packages, direct from original repos):**

`pi-web-access` (nicobailon), `pi-subagents` (nicobailon), `pi-mcp-adapter` (nicobailon), `pi-agent-browser-native` (fitchmultz), `context-mode` (mksglu). Referenced directly from original repositories — no forks needed. Three packages from the original architecture (`pi-quick-perms`, `pi-contrib-gate`, `pi-memory`) were removed as external dependencies and reimplemented as internal extensions (`permission-gate`, `contrib-gate`, `auto-memory`).

`context-mode` is the highest-impact dependency. It fundamentally changes the agent's data processing paradigm via sandbox tools (`ctx_execute`, `ctx_batch_execute`, `ctx_search`) and provides SQLite+FTS5 session continuity so the agent never loses state between compactions. The SYSTEM.md integrates context-mode's routing rules ("Think in Code") so there are no competing instruction sources.

### Design Principles

- **No pós-training dependency**: Tool descriptions and system prompt must be clear enough for any frontier model to use without specific training on the Pi.dev tool set.
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
- **Auto Memory expansivo**: Risk of context overload and hallucination. MEMORY.md as lightweight index instead.
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
