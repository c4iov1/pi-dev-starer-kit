# Akita Harness Ideas — Implementation Plan

> Source: AkitaOnRails harness comparison article (2026-05-25).
> Goal: extract positive harness traits from the article; compare them with Pi.dev Starter Kit; propose implementation ideas only where the kit does not already cover them well.

## Summary

Akita’s main point is that **harness quality matters as much as model quality**. The praised capabilities are not magic model behavior; they come from tool design, routing prompts, memory/compaction, planning, interruption/steering, artifact readers, LSP/AST support, and product polish.

The starter kit already covers many baseline harness features: permission gates, tasks, plan/self-verify skills, web/browser/MCP/subagent integrations, auto-memory/ai-memory, post-edit linting, loop protection, monitor bash, and context-mode routing. The strongest gaps are:

1. Universal artifact-aware `read` behavior.
2. AST search/edit tools for codemods.
3. Stronger LSP routing and symbol operations, not only diagnostics.
4. Multi-range reads and edit anchors.
5. Explicit steering/interrupt/compaction policy knobs.
6. Product polish around defaults and low-configuration setup.
7. Multi-harness review workflow for important audits.

## Praised points by harness

### Claude Code

Positive points Akita called out:

- Strong planning mode.
- Clear todo/task list that the agent follows step by step.
- Good interruption and redirection without destroying the session.
- Ability to inject prompts while the agent is working.
- More sophisticated memory and compaction than alternatives.
- Best choice when using Anthropic/Opus through the subsidized Anthropic plan.

Starter kit status:

- Partially covered by `plan-mode`, `task-tracker`, `handoff`, `auto-memory`, optional `ai-memory`, and context-mode.
- Not clearly covered: live mid-run prompt injection, first-class interruption modes, explicit compaction strategy knobs.

### Codex / GPT

Positive points Akita called out:

- GPT itself is excellent.
- Codex is usable and can work, but Akita mostly criticizes its harness.
- Lesson: do not nerf a strong model with a weak harness.

Starter kit status:

- Covered in principle by model autonomy.
- Gap: we should document model/provider routing recommendations without becoming provider-specific or violating OAuth/provider terms.

### OpenCode

Positive points Akita called out:

- Cohesive, polished product experience.
- Good normal coding kit: shell, read, glob, grep, edit/write/apply_patch, task/subagents, todo, web fetch/search, skills, optional LSP, plugins, MCP.
- Better harness for GPT than Codex in his experience.
- Hides some knobs and gives good day-to-day defaults.
- Supports planning, tasks, tools, subagents, LSP, compaction, interruption, and steering well enough.

Starter kit status:

- Mostly covered by current dependencies and extensions.
- Gaps are more about polish/defaults than raw capability: onboarding, clearer defaults, less verbosity, and a stable “works immediately” profile.

### Pi.dev Starter Kit target capabilities

Capabilities to implement directly in Pi.dev Starter Kit:

- Batteries-included Pi distribution, useful starting point versus bare Pi.
- Many tools and strong tool routing prompts.
- Universal artifact reading: files, directories, archives, SQLite, images, PDF/DOCX/PPTX/XLSX/RTF/EPUB, Jupyter notebooks, URLs in reader mode, and internal URIs.
- SQLite read protocol: list tables/counts, schema/sample, row by primary key, pagination, filters/order, read-only SQL.
- Source-code conveniences: structural summaries, multi-range reads, line-hash anchors, aggressive LSP routing, `ast_grep`, `ast_edit`.
- Good support for projects with data/document artifacts, audits, migrations, notebooks, spreadsheets, archives, PDFs, images, and web pages.
- Harness behavior as config knobs: steering mode, interrupt mode, compaction strategy.

Starter kit status:

- Covered: web, browser, MCP, subagents, memory, context-mode, basic LSP diagnostics.
- Previously weak but now implemented or planned: universal artifact reader, SQLite/archive protocols, AST tools, line anchors, multi-range reads, symbol-level LSP operations, explicit steering/interrupt/compaction settings.

## Implementation plan

### 1. Add a universal artifact reader extension

**Idea:** Implement `artifact-read` with a tool such as `artifact_read` that gives Pi-native structured reads for non-source artifacts.

**Why it is great:** A structured artifact reader prevents the model from inventing brittle shell commands, reduces context dumps, and makes data/document-heavy projects practical.

**Scope:**

- Directory summary with sizes, file types, and top-level tree.
- Archives: `.zip`, `.tar`, `.tar.gz`, `.tgz` list and selective extraction preview.
- SQLite: table list/counts, schema/sample, row by primary key, pagination, filtered read, read-only SELECT.
- CSV/JSON/JSONL: schema/sample/query summary.
- Documents: PDF/DOCX/PPTX/XLSX/RTF/EPUB text extraction where dependencies are available.
- Notebooks: markdown/code cell outline and selected cell read.
- URL reader mode can initially delegate to `pi-web-access`.

**Current kit gap:** No single reader protocol for SQLite, archives, documents, spreadsheets, or notebooks.

**Implementation notes:** Keep writes impossible. Enforce path confinement. Return summaries by default, never raw huge payloads.

### 2. Add AST search and AST edit tools

**Idea:** Add an `ast-tools` extension wrapping `ast-grep` with tools like `ast_grep` and `ast_edit`.

**Why it is great:** Akita highlights AST as useful for codemods and structural refactors: imports, function calls, declarations, repeated metavariables, and avoiding false positives in strings/comments.

**Scope:**

- `ast_grep(pattern, language?, paths?)` returns structural matches with file/range/context.
- `ast_edit(pattern, replacement, language?, paths?, dryRun=true)` previews codemod patches.
- Require explicit user approval for non-dry-run edits through permission pipeline.
- Document when LSP rename is preferred over AST.

**Current kit gap:** We have grep and edit; no structural search/edit.

### 3. Upgrade LSP bridge from diagnostics to symbol operations

**Idea:** Expand `lsp-bridge` beyond type-check command execution into practical symbol-aware tools.

**Why it is great:** Akita praises aggressive LSP routing for source-code navigation/refactor correctness. LSP can outperform textual or AST rewrites for rename/references when language support is available.

**Scope:**

- `lsp_references(symbol/file/position)`.
- `lsp_definition(file/position)`.
- `lsp_rename(file/position,newName,dryRun=true)`.
- `lsp_workspace_symbols(query)`.
- Keep existing diagnostics/type-check flow.

**Current kit gap:** `lsp-bridge` is mostly diagnostics/type-check oriented.

### 4. Add multi-range read and edit anchors

**Idea:** Provide safer source reads and edits with range batching and line-hash anchors.

**Why it is great:** Akita notes multi-range reads and anchors make source navigation cheaper and textual edits safer. They reduce repeated tool calls and reduce accidental edits in stale ranges.

**Scope:**

- `read_ranges(path, ranges[])` returning only selected sections.
- Include stable anchors like `path:L10-L25#hash` based on line content.
- Optional `edit_at_anchor(anchor, oldText, newText)` that fails if hash changed.

**Current kit gap:** Base `read` supports one file read with optional offset/limit; no batched ranges or hash anchors.

### 5. Define steering, interrupt, and compaction profiles

**Idea:** Add documented `.pi/settings.json` knobs and system routing for harness behavior profiles.

**Why it is great:** Akita treats steering as mandatory for Agile Vibe Coding. Claude Code is strong here; Pi.dev exposes knobs. Users need to redirect agents without losing the session.

**Scope:**

- Add settings keys: `steeringMode`, `interruptMode`, `compactionStrategy`.
- Document recommended profiles: `polished-default`, `power-user`, `low-verbosity`, `audit-heavy`.
- Map these settings to available Pi/context-mode behavior where possible; where Pi lacks hooks, document as future integration.

**Current kit gap:** We mention workflow and context-mode, but no user-facing steering/interrupt/compaction profiles.

### 6. Create a polished default profile

**Idea:** Make the kit feel closer to OpenCode’s cohesive defaults and less like a box of knobs.

**Why it is great:** Akita prefers OpenCode day-to-day because it is cohesive and polished. A starter kit should be productive on day one, not require a tuning afternoon.

**Scope:**

- Default `settings.template.json` should enable the most useful safe tools (`monitor-bash`, `lsp-bridge` if stable) or clearly explain why optional.
- Add a `/starter-kit-doctor` command to verify dependencies and show what is active/missing.
- Add a short “recommended default” README path and move advanced tuning to a separate doc.
- Reduce verbosity in generated prompts/templates.

**Current kit gap:** Good capabilities exist, but onboarding still exposes many moving pieces.

### 7. Add a multi-pass review workflow

**Idea:** Add a `review-matrix` skill/prompt that runs independent review passes with different perspectives or models/harnesses when available.

**Why it is great:** Akita’s review experiment found each harness/model catches different issues. The correct lesson is not “winner takes all”; it is “important reviews need independent passes.”

**Scope:**

- Review pass 1: correctness/regression.
- Review pass 2: security/data-loss.
- Review pass 3: maintainability/API/design.
- Optional: delegate each pass to subagents or external harnesses manually.
- Consolidate findings into severity, evidence, and fix recommendations.

**Current kit gap:** We have `self-verify`, `qa`, and review prompt, but not a structured multi-pass review matrix.

### 8. Document provider/subscription guidance without hacks

**Idea:** Add a short provider guidance doc that separates model quality, harness quality, API keys, and subscription/OAuth constraints.

**Why it is great:** Akita stresses that subsidized plans change economics, but also warns against violating provider terms. The kit should help users choose safe routes.

**Scope:**

- Recommend legal/provider-compliant setup patterns.
- Explain that model autonomy does not mean bypassing provider restrictions.
- Clarify when to use Pi kit, Claude Code, OpenCode, or external tools alongside the kit.

**Current kit gap:** Architecture says model autonomy, but does not give pragmatic provider guidance.

## Agent discoverability and routing plan

A tool is not useful just because it exists in code. The LLM must see enough information to know **that the tool exists**, **when it is better than shell/grep/read**, and **what input shape is safe**. For every new capability, implementation must include four discoverability layers:

1. **Extension tool schema/description** — the canonical source of truth. Each extension must register tools with concise descriptions, parameters, examples, safety limits, and “prefer this when…” guidance. This is what the model sees in the tool list.
2. **SYSTEM.md routing table** — short always-on routing hints only for high-level categories. Keep this lean: “SQLite/archive/document/notebook → use `artifact_read`”, “structural code search/codemod → use `ast_grep`/`ast_edit`”, “symbol rename/references → use LSP”.
3. **Skill-level deep guidance** — larger instructions live in skills and are loaded only when the task needs them. Example: `artifact-analysis` teaches data/document investigation; `structural-refactor` teaches AST/LSP codemod workflows; `review-matrix` teaches multi-pass review.
4. **Doctor/settings visibility** — `/starter-kit-doctor` reports which tools are installed, enabled, missing dependencies, and disabled by settings. This helps both user and agent understand current capability.

### Required discoverability changes per capability

| Capability | Always-on agent awareness | Deep guidance | Runtime visibility |
|---|---|---|---|
| `artifact_read` | Add to SYSTEM Tool Categories under File/Data I/O. Routing: use for SQLite, archives, CSV/JSON, documents, notebooks, URLs/artifacts instead of ad hoc shell. | `skills/tools/artifact-analysis/SKILL.md` with examples for SQLite queries, archive inspection, document extraction, notebook outlines. | `starter-kit-doctor` checks parsers/deps and lists supported artifact types. |
| `ast_grep` / `ast_edit` | Add to SYSTEM Search/Refactor category. Routing: use for structural patterns/codemods, not string search. | `skills/quality/structural-refactor/SKILL.md` with ast-grep patterns, dry-run workflow, when to prefer LSP. | Doctor checks `ast-grep` binary and language support. |
| LSP symbol tools | Add to SYSTEM Quality/Navigation category. Routing: use for definitions, references, rename, workspace symbols. | `structural-refactor` includes LSP-first rename/reference workflow. | Doctor lists detected language servers and enabled LSP tools. |
| `read_ranges` / `edit_at_anchor` | Add brief SYSTEM rule: use range reads for scattered sections and anchors for stale-safe edits. | Existing `self-verify`/`structural-refactor` can reference anchor-safe edits. | Doctor verifies extension enabled. |
| Steering/interrupt/compaction profiles | Add compact SYSTEM note that the active profile controls interaction style. | `docs/steering-profiles.md` explains profiles; no large system prompt. | Doctor prints active profile and effective settings. |
| `review-matrix` | Add to SYSTEM skill list with one-line trigger: important audit/review. | `skills/quality/review-matrix/SKILL.md` contains full workflow. | Doctor lists skill availability. |

### SYSTEM.md additions should stay small

Do **not** dump full tool manuals into `SYSTEM.md`. Add only a compact routing block like:

```md
### Advanced Routing

- Non-source artifacts (SQLite, CSV/JSON, archives, PDFs, spreadsheets, notebooks): prefer `artifact_read` before shell scripts.
- Structural code patterns or codemods: prefer `ast_grep`; use `ast_edit` dry-run before edits.
- Symbol navigation/refactors: prefer LSP tools (`lsp_definition`, `lsp_references`, `lsp_rename`) over textual search.
- Scattered source context: use `read_ranges`; stale-sensitive edits: use `edit_at_anchor` when available.
- Important reviews: activate `review-matrix` for independent passes.
```

### Extension implementation requirement

Every new extension must export/register tools with descriptions that include:

- One-sentence purpose.
- “Use when…” trigger list.
- “Do not use when…” limits.
- Parameters with examples.
- Output-size limits and pagination behavior.
- Safety behavior: read-only, dry-run, permission-gated, path-confined.

This makes the tools self-describing to the LLM and avoids relying on the user to manually remember them.

## Technical implementation map for the kit

This is how each idea should be delivered in the Pi.dev Starter Kit. The default rule is: **deterministic behavior and tools become extensions; workflow/process becomes skills; default behavior becomes settings/templates; provider advice becomes docs.**

| Idea | Kit delivery | Files to add/change | Technical solution |
|---|---|---|---|
| Universal artifact reader | **Extension** | `extensions/artifact-read/index.ts`, `skills/tools/artifact-analysis/SKILL.md` optional, `templates/settings.template.json`, `SYSTEM.md` routing | Register an `artifact_read` tool. It should inspect file type, enforce path confinement, return structured summaries, and use safe parsers/read-only queries. The optional skill teaches workflows for data/document investigations. |
| AST search/edit | **Extension + skill guidance** | `extensions/ast-tools/index.ts`, `skills/quality/structural-refactor/SKILL.md` optional, `SYSTEM.md` routing | Register `ast_grep` and `ast_edit` wrappers around `ast-grep`. `ast_edit` must default to dry-run and route real edits through the permission pipeline. Skill docs explain codemod patterns and when to prefer LSP. |
| Stronger LSP | **Extension upgrade** | `extensions/lsp-bridge/index.ts`, maybe `extensions/lsp-bridge/lsp-client.ts`, `templates/settings.template.json` | Expand from diagnostics/type-check commands to LSP client operations: definition, references, rename preview, workspace symbols. Use project language-server detection and degrade gracefully when no server exists. |
| Multi-range read + anchors | **Extension** | `extensions/source-navigation/index.ts` or fold into `artifact-read`, `SYSTEM.md` routing | Register `read_ranges` and optionally `edit_at_anchor`. Anchors include path, line range, and content hash; edits fail if the target range changed. This is tool-level safety, not a prompt-only rule. |
| Steering/interruption/compaction profiles | **Settings + prompt template + docs; extension only if Pi exposes hooks** | `templates/settings.template.json`, `SYSTEM.md`, `APPEND_SYSTEM.md`, `docs/steering-profiles.md` | Add `starterKit.steeringMode`, `interruptMode`, and `compactionStrategy`. Initially use them as documented routing/profile hints. If Pi exposes runtime hooks/events, add an extension to enforce profile behavior. |
| Polished default + doctor | **Extension command + templates** | `extensions/starter-kit-doctor/index.ts`, `templates/settings.template.json`, `README.md` | Register `/starter-kit-doctor` or `starter_kit_doctor` tool/command that checks installed dependencies, active extensions, active skills, `.pi/settings.json`, required binaries, and prints actionable fixes. Adjust templates for a recommended default profile. |
| Multi-pass review workflow | **Skill + prompt** | `skills/quality/review-matrix/SKILL.md`, `prompts/review-matrix.md`, `SYSTEM.md` skill list | Add a workflow skill that runs independent review passes: correctness/regression, security/data-loss, maintainability/API. It may use subagents when available, but should also work sequentially. |
| Provider/subscription guidance | **Documentation** | `docs/provider-guidance.md`, `README.md` link | Document safe provider-compliant choices. No OAuth hacks, no credential routing that violates provider terms. Explain model quality vs harness quality vs pricing. |

### Proposed package structure additions

```text
extensions/
├── artifact-read/          # artifact_read: SQLite, archives, CSV/JSON, docs, notebooks
├── ast-tools/              # ast_grep, ast_edit
├── source-navigation/      # read_ranges, edit_at_anchor
└── starter-kit-doctor/     # setup/dependency/profile diagnostics

skills/
├── artifact-analysis/      # optional workflow for documents/data investigations
├── structural-refactor/    # optional workflow for AST/LSP codemods
└── review-matrix/          # independent multi-pass review workflow

docs/
├── steering-profiles.md
└── provider-guidance.md
```

### Implementation sequencing by technical dependency

1. **`starter-kit-doctor` extension first** because it validates the environment for every later capability.
2. **`artifact-read` phase 1** with zero-heavy dependencies: directories, CSV/JSON/JSONL, SQLite via `better-sqlite3`, archives via Node libraries or system tools with safe fallbacks.
3. **`ast-tools`** wrapping `ast-grep`; doctor should detect/install guidance for the `ast-grep` binary.
4. **`lsp-bridge` upgrade** after doctor can detect language servers.
5. **`source-navigation`** once read/edit anchor semantics are settled.
6. **Skills/docs** can be added in parallel because they mostly route humans/models to the new tools.

## Suggested priority order

1. **Polished default profile + starter-kit doctor** — fastest improvement to day-one experience.
2. **Universal artifact reader, phase 1: SQLite + archives + CSV/JSON** — highest Pi.dev-inspired capability gain.
3. **AST tools** — high leverage for codemods and refactors.
4. **LSP symbol operations** — correctness improvement for real source refactors.
5. **Multi-range read + anchors** — safety/context efficiency improvement.
6. **Steering/interrupt/compaction profiles** — depends on Pi hook support; start with docs/settings.
7. **Review matrix skill** — low implementation cost, high process value.
8. **Provider guidance doc** — low implementation cost, avoids unsafe user expectations.

## Non-goals

- Do not copy Pi.dev wholesale or turn the kit into a huge always-on prompt.
- Do not bypass Anthropic/OpenAI subscription restrictions.
- Do not force subagents for normal cohesive coding work; use them only for genuinely parallel tasks.
- Do not optimize for tiny system prompts at the expense of losing test logs, build output, or evidence.
