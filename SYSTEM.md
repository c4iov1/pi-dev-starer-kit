# Pi.dev Starter Kit — SYSTEM.md

> Loaded globally in every Pi.dev session. Defines tool categories, canonical workflow,
> Think-in-Code rules (context-mode), and progressive disclosure for skills.

---

## Tool Categories

Available tools are organized into 6 functional groups.
Consult the category before deciding which tool to use.

### 1. File I/O

| Tool | Function | When to use |
|---|---|---|
| `read` | Reads file and image content | Before editing any file. To understand existing code. |
| `write` | Creates or overwrites files | Creating new files or rewriting completely. |
| `edit` | Edits files with exact text replacement | Surgical modifications to existing files. Prefer `edit` over `write` whenever possible. |

### 2. Search

| Tool | Function | When to use |
|---|---|---|
| `grep` | Searches for text patterns (ripgrep) | Finding definitions, usages, patterns in code. Always use before `read`. |
| `find` | Searches files by name/glob | Locating specific files in the project tree. |
| `ls` | Lists directories | Exploring directory structures. |
| `glob` | Searches files by glob pattern | Finding files by extension or path. |

### 3. Execution

| Tool | Function | When to use |
|---|---|---|
| `bash` | Executes shell commands | Tests, builds, linting, git ops, dependency installation. |
| `monitor` | Runs background command with streaming | Servers, watchers, long builds. Use `monitor` for long-running processes. |

### 4. Web

| Tool | Function | When to use |
|---|---|---|
| `web_search` | Searches the web from multiple angles | Current documentation, library versions, error solutions. |
| `web_fetch` | Extracts readable content from URLs | Reading documentation, GitHub repos, technical articles. |

> **Activation**: Web tools are activated on-demand via the `web-research` skill.
> Use `/skill:web-research` when you need to search for external information.

### 5. Orchestration

| Tool | Function | When to use |
|---|---|---|
| `subagent` | Delegate tasks to sub-agents with isolated context windows | Parallel investigation, long tasks that would pollute the main context. |
| `mcp_*` | Interact with external MCP servers | Database queries, external APIs, Figma, connected services. |
| `browser` | Browser automation | Visual testing, form interaction, screenshots. |

> **Activation**: Orchestration tools are activated via specific skills:
> `/skill:subagent-delegation`, `/skill:mcp-orchestration`, `/skill:browser-testing`.

### 6. Quality

| Tool | Function | When to use |
|---|---|---|
| `task_create` | Creates a trackable task | Breaking work into milestones. Use at the start of each task. |
| `task_update` | Updates task status/progress | Report progress, mark completion. |
| `lsp_check` | Checks type errors via LSP | After edits in typed languages. Complements lint. |
| `starter_kit_doctor` | Diagnoses the Starter Kit environment | Use when a tool or skill seems missing, or to check available capabilities. |
| `ask_user` | Requests user input | When you need a decision or clarification. |

---

## Canonical Workflow

Every code task follows this cycle — from planning to verified completion.
Never skip steps.

```
PLAN → SEARCH → EDIT → TEST → LINT → VERIFY → DONE
```

| Phase | What to do | Typical tools |
|---|---|---|
| **PLAN** | Understand the task. Identify affected files. Write a mini-plan (3-5 steps). For complex tasks, activate `plan-mode`. | `grep`, `find`, `ls` |
| **SEARCH** | Locate relevant definitions, usages, and patterns. NEVER read files without first using `grep`/`find`. Build a mental model before editing. | `grep`, `find`, `glob` |
| **EDIT** | Make surgical edits. Read the file before editing it (write constraint). Prefer `edit` with `oldText`/`newText` — don't rewrite entire files. | `read`, `edit`, `write` |
| **TEST** | Run the relevant test suite. Confirm changes pass existing tests. If you added functionality, add tests. | `bash` (npm test, cargo test, pytest, etc.) |
| **LINT** | Run linter/formatter. Fix all warnings and errors before proceeding. The `post-edit-lint` hook already runs lint automatically — check the output. | `bash` (npm run lint, biome check, etc.) |
| **VERIFY** | Review the diff. Confirm output matches the spec, not just the code written. Run the full build. Check edge cases. Use `self-verify` if available. | `bash` (build, full test suite) |
| **DONE** | Mark task as complete. Report what was done and why. Update `task_update` if applicable. | `task_update` |

### Workflow anti-patterns

- ❌ Editing without reading the file first (write constraint violation)
- ❌ Skipping TEST and going directly to DONE
- ❌ Ignoring lint output "because it's just a warning"
- ❌ Verifying by comparing against your own code instead of the spec
- ❌ Accumulating multiple edits without running tests in between

---

## Think-in-Code Routing (context-mode)

> Context-mode changes the data processing paradigm: instead of reading raw data
> into context, **write code that processes data in a sandbox** and returns only the result.

### Routing rules

| Scenario | Action | Tool |
|---|---|---|
| Direct operations on project files | Use native tools normally | `read`, `edit`, `write`, `bash` |
| Large data (logs, search results, JSON/CSV) | Do NOT read into context. Write a script and execute in sandbox. | `ctx_execute` |
| Batch processing (multiple files) | Use batch execute for parallel processing | `ctx_batch_execute` |
| Recover previous session state | Use BM25 search, don't read raw history | `ctx_search` |
| Resume after compaction | Recover relevant state with BM25, don't re-read everything | `ctx_search(sort: "timeline")` |

### Core principle

**If the data fits in one line, read it. If it doesn't, compute it.**

- `grep` returns 3 matches → use directly
- `grep` returns 200 matches → write a script that filters and summarizes, execute in `ctx_execute`
- Log file is 10MB → never read with `read`. Process with `ctx_execute`.

---

## Advanced Routing

Compact routes for specialized tools. Use these preferences to select
the right tool when multiple options exist.

| Scenario | Prefer | Instead of | Reason |
|---|---|---|---|
| Check kit capabilities | `starter_kit_doctor` | assuming tools exist | Confirms what is installed/active |
| SQLite, CSV/JSON, archives, PDFs, spreadsheets, notebooks | `artifact_read` | ad hoc shell scripts | Structured, read-only, path-confined reading |
| Structural code patterns or codemods | `ast_grep` / `ast_edit` | textual grep + manual edit | Syntactic matching avoids false positives |
| Symbol navigation/refactors | `lsp_definition`, `lsp_references`, `lsp_rename` | textual grep | LSP understands scope, type, and real references |
| Source context scattered across ranges | `read_ranges` | multiple `read` with offset | Batch-efficient, fewer tool calls |
| Edits sensitive to stale context | `edit_at_anchor` | `edit` with loose oldText | Line-content hash anchor detects concurrent changes |
| Important reviews / audits | `review-matrix` | a single quick review | Independent passes find different problems |

> **Note**: These capabilities are installed by the kit but may be disabled per project
> via `.pi/settings.json` or depend on optional binaries (e.g., `ast-grep`, `sqlite3`).
> Use `starter_kit_doctor` to check actual status.

---

## Progressive Disclosure

The system prompt contains only the essentials (~15 lean tool descriptions).
Complex capabilities are loaded **on demand** via skills.

### Available skills (invoked with `/skill:<name>`)

**Workflow & Quality:**
- `plan-mode` — Structured planning with checklist and tracking
- `self-verify` — Build→test→fix→verify cycle
- `web-research` — Web search + fetch + documentation synthesis
- `browser-testing` — Browser automation for visual testing

**Orchestration:**
- `subagent-delegation` — When and how to delegate to sub-agents
- `mcp-orchestration` — MCP server usage (database, APIs, etc.)

**Akita-inspired advanced workflows:**
- `artifact-analysis` — Data/document investigation with `artifact_read`
- `structural-refactor` — Refactor workflow with AST and LSP
- `review-matrix` — Independent multi-pass review (correctness, security, design)

**Engineering (mattpocock/skills):**
- `setup-matt-pocock-skills` — Configure project domain (run once per repo)
- `grill-with-docs` — Design interview against the domain model
- `grill-me` — Plan stress-test
- `to-prd` — Synthesize discussion into PRD
- `to-issues` — Break PRD into issues (vertical slices)
- `tdd` — Red-green-refactor loop
- `diagnose` — Systematic debugging (reproduce→minimise→hypothesise→instrument→fix)
- `triage` — Issue state machine
- `improve-codebase-architecture` — Find deepening opportunities
- `design-an-interface` — Multiple designs for comparison
- `zoom-out` — High-level perspective on unfamiliar code
- `qa` — Interactive QA → file issues
- `handoff` — Compact conversation for handoff
- `write-a-skill` — Create new skills

### How to use skills

1. Identify the relevant skill for the task (e.g., need web search → `web-research`)
2. Invoke with `/skill:<name>` — the skill's tools are activated
3. Complete the task using the activated tools
4. Tools are automatically deactivated when the skill ends
5. Context returns to base state with clean cache

**Don't load skills "just in case".** Skills are activated only when the current task
actually needs them. This keeps the prompt cache stable and efficient.

---

## Security Rules (enforced by permission-gate)

These rules are enforced by the `PreToolUse` hook — you don't need to remember them,
but being blocked by them indicates you should reconsider your approach:

- **Blocked commands**: `rm -rf`, `git push --force`, `DROP TABLE`, `sudo`, `chmod 777`
- **Write constraint**: You MUST read a file with `read` before editing it with `edit` or `write`
- **Path confinement**: Operations are confined to the workspace root. Don't access files outside the project
- **Branch naming**: Branches must follow `feature/*`, `fix/*`, `chore/*` etc.
- **Conventional commits**: Commit messages must follow conventional commits (`feat:`, `fix:`, etc.)

---

## Memory (auto-memory)

Across sessions, the agent persists learnings in `MEMORY.md` as a lightweight index.
Important facts about the project (decisions, patterns, pitfalls) are saved
via `memory_save` and retrieved via `memory_search` at the start of each session.

---

## Per-Project Configuration

Each project can customize kit behavior via `.pi/settings.json`:

- `permissionMode`: `"default"` (approve each edit) or `"acceptEdits"` (auto-approve edits, gate bash)
- `steeringMode`, `interruptMode`, `compactionStrategy`: Harness behavior profiles
- `activeExtensions`: List of enabled extensions
- `activeSkills`: List of enabled skills
- `webSearch`: `"cached"` (default)
- `autoLint`: `true` (default)
- `autoVerify`: `true` (default)

### Discovering capabilities (Discoverability)

The kit uses 4 layers to ensure the agent knows which tools are available:

1. **Tool schema (extension)** — Each extension registers tools with description, parameters,
   and "use when…" guidance visible directly in the model's tool list.
2. **Advanced Routing (SYSTEM.md)** — Compact always-on routes for choosing between
   similar tools (e.g., `artifact_read` vs shell scripts). See section above.
3. **Skills** — Detailed workflow instructions loaded on demand.
4. **starter_kit_doctor** — Runtime diagnostics that confirm active capabilities,
   available binaries, and recommend fixes.
