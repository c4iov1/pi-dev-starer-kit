# Pi.dev Starter Kit

> Build the harness foundation. One `pi install`. Any project. Any model.

Pi.dev Starter Kit is a comprehensive package of extensions, skills, prompts, and templates that transforms the minimal Pi.dev harness into a production-ready agentic coding environment. By offering deterministic guardrails, structured workflows, and rich ecosystem integrations, it matches the capabilities of proprietary systems like Claude Code or Codex while guaranteeing complete model and provider autonomy.

---

## 1. Prerequisites

Before installing the starter kit, ensure you have the following installed on your machine:

- **Pi.dev CLI** (version `0.75.0` or higher recommended).
- **Git** (for version control and package installation).
- **Node.js** (LTS version recommended, minimum Node 18+).
- **RTK** (optional but recommended) available as `rtk` on `PATH` for automatic shell-command rewrites and token savings. The starter-kit extension uses the executable directly; it does not vendor RTK and does **not** require `rtk init --agent pi`.

---

## 2. Dependencies

The starter kit leverages six core packages from the Pi.dev ecosystem to provide advanced capabilities. They are referenced directly from upstream sources to receive automatic improvements. `pi-graphify` is declared with an SSH git URL (`git+ssh://git@github.com/c4iov1/pi-graphify.git`) to match maintainer access:

| Dependency | Repository URL | Purpose |
|------------|----------------|---------|
| `context-mode` | [mksglu/context-mode](https://github.com/mksglu/context-mode) | Sandboxed runtimes, SQLite+FTS5 session index, 98% context savings. |
| `pi-agent-browser-native` | [fitchmultz/pi-agent-browser-native](https://github.com/fitchmultz/pi-agent-browser-native) | Native browser automation and screenshot verification. |
| `pi-mcp-adapter` | [nicobailon/pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | Adapter to mount and invoke external Model Context Protocol (MCP) servers. |
| `pi-graphify` | [c4iov1/pi-graphify](https://github.com/c4iov1/pi-graphify) | Knowledge-graph-first reasoning, `/graphify`, graph freshness reminders, and graphify skill workflows. |
| `pi-subagents` | [nicobailon/pi-subagents](https://github.com/nicobailon/pi-subagents) | Background sub-agent orchestration with parallel execution support. |
| `pi-web-access` | [nicobailon/pi-web-access](https://github.com/nicobailon/pi-web-access) | Web searching, URL content fetching, GitHub cloning, and media parsing. |

---

## 3. Installation

Install the starter kit globally in your Pi.dev environment by running:

```bash
pi install git:github.com/caioo/pi-dev-starter-kit
```

This registers the global extensions, skills, and prompt templates, making them immediately available across all your projects.

---

## 4. New Project Setup

To initialize a new project with the starter kit templates, follow these steps:

1. **Scaffold the project templates** by running the slash command inside your project directory:
   ```bash
   /init-starter-kit <project-name> [stack]
   ```
   *Alternative shell script usage from the repo root:*
   ```bash
   ./init-starter-kit.sh <project-name> [stack]
   ```
   This creates `.pi/settings.json`, `AGENTS.md`, `CONTEXT.md`, `docs/INDEX.md`, and directories for custom extensions/skills.

2. **Configure the Agent Skills environment** by running:
   ```bash
   /setup-matt-pocock-skills
   ```
   This interactive prompt-driven skill sets up the issue tracker, triage labels, and domain doc layout, creating `docs/agents/` tracking files.

3. **Edit `AGENTS.md`**: Fill in your project description, workspace directory structures, commands, and expectations.

4. **Adjust `.pi/settings.json`**: Enable or disable specific feature flags (e.g., toggling linter integration or auto type-checks).

5. **Optional advanced memory**: Run `/setup-ai-memory` if you want Akita's always-on long-term memory, cross-agent handoffs, and wiki search. This is explicit opt-in because it starts Docker and installs project routing; Pi lifecycle capture is handled by the starter-kit extension.

---

## 5. Feature Index (What You Get)

### Global Extensions

| Extension | Purpose | Tools Registered / Hooks Handled |
|-----------|---------|----------------------------------|
| `permission-gate` | Security gates & pipelines | Intercepts `PreToolUse` for write/edit/shell actions. Must run before optimization hooks. |
| `rtk-rewrite` | Context-efficiency bash rewrite | After permission-gate approval, mutates agent `bash` tool calls through `pi.exec("rtk", ["rewrite", command])`; fail-open and optimization-only. Commands: `/rtk-status`, `/rtk-gain`, `/rtk-toggle`. |
| `post-edit-lint` | Deterministic linter triggers | Auto-runs linter/formatter (with `--fix`) after file edits. |
| `loop-protection` | Aborts doom-loops and repeated queries | Intercepts execution if model loops on the same error/action. |
| `task-tracker` | Local task management | Registers `TaskCreate`, `TaskUpdate` to track progress. |
| `lsp-bridge` | Real-time diagnostics & symbol operations | Provides incremental typechecking; registers `lsp_definition`, `lsp_references`, `lsp_rename`, `lsp_workspace_symbols` for TypeScript projects. |
| `monitor-bash` | Background process orchestrator | Registers `Monitor` to run long processes line-by-line asynchronously. |
| `contrib-gate` | Commit and branch verification | Validates commit messages and branch naming conventions. |
| `auto-memory` | Session context manager | Persists key concepts to a local `MEMORY.md` file. |
| `setup-ai-memory` | Optional advanced memory setup | Registers `memory_query`, `memory_status`, `memory_write_page`, `/setup-ai-memory`, `/ai-memory-status`, `/ai-memory-upgrade`, `/ai-memory-bootstrap`, `/ai-memory-backup`, `/ai-memory-lint`, and `/ai-memory-forget-sweep`; posts Pi lifecycle events to upstream `akitaonrails/ai-memory` via HTTP hooks. |
| `starter-kit-doctor` | Environment & capability diagnostics | Registers `starter_kit_doctor` to inspect extensions, skills, binaries, and harness profile settings. |
| `artifact-read` | Universal artifact reader | Registers `artifact_read` to inspect SQLite databases, CSV/JSON/JSONL files, archives (zip/tar/tar.gz), and directories with pagination and read-only safety. |
| `ast-tools` | AST-based code search & codemods | Registers `ast_grep` and `ast_edit` for structural pattern matching and safe, dry-run-first rewrite. |
| `source-navigation` | Multi-range reads & anchor-pinned edits | Registers `read_ranges` for batch reading scattered sections and `edit_at_anchor` for stale-safe content-hash-pinned edits. |
| `graphify` | Knowledge-graph-first codebase navigation | Bundled from `pi-graphify`; registers `/graphify`, graph-first prompt injection when `graphify-out/` exists, staleness reminders, and graph artifact routing. |

### Global Skills

The starter kit bundles standard workflows based on the open Agent Skills format:

- **`plan-mode`**: Enforces writing an implementation plan before coding.
- **`self-verify`**: Builds and runs tests automatically to verify correctness.
- **`web-research`**: Performs cached or live web search queries.
- **`browser-testing`**: Automates browser verification of web UIs.
- **`subagent-delegation`**: Outsources tasks to sub-agents.
- **`mcp-orchestration`**: Discovers and interacts with registered MCP tools.
- **`ai-memory`**: Uses Akita's always-on external memory service when installed; falls back to `auto-memory`.
- **`artifact-analysis`**: Structured inspection of data artifacts (SQLite, CSV, archives) with `artifact_read`.
- **`structural-refactor`**: Workflow for structural refactoring using AST and LSP tools.
- **`review-matrix`**: Independent multi-pass code review (correctness, security, design).
- **`graphify`**: Build, update, query, and explore graphify knowledge graphs from Pi sessions.
- **14 Matt Pocock engineering skills** (`/grill-with-docs`, `/tdd`, `/diagnose`, `/triage`, `/handoff`, etc.).

---

## 6. Permission Modes

The `permission-gate` extension controls access to file reads/writes, edits, and shell command executions via three modes configured in `.pi/settings.json` or toggled per session:

### `default` Mode

Prompts the user with a diff or CLI command details before every execution. Requires explicit approval.
*Example interaction:*
```
[permission-gate] Requesting permission to edit src/app.ts:
<<<<
- const port = 3000;
+ const port = process.env.PORT || 3000;
>>>>
Approve this edit? (y/N):
```

### `acceptEdits` Mode

Automatically approves safe file additions and edits but continues to gate terminal shell executions (e.g. `npm install`, `node server.js`) for security.
*Example interaction:*
```
[permission-gate] Auto-approved edit to src/app.ts.
[permission-gate] Shell command requested: "npm run migrate"
Approve command execution? (y/N):
```

### `featureWork` Mode

Project-scoped implementation mode. It auto-approves read/write/edit tool calls and common bash commands only when they are scoped to the active session project directory. It still asks for `git commit`, `git push`, network commands (`curl`, `wget`, `ssh`, etc.), and any command path outside the project; hard-deny rules such as `sudo`, `git push --force`, `npm publish`, and `curl | sh` remain blocked.

Enable it for a project with `/feature-mode on` or `feature_mode_toggle({ mode: "on" })`. This writes `.pi/settings.json` in that project, so future Pi sessions opened there start in `featureWork`. Use `/feature-mode off` to persistently return that project to `default` mode.

---

## 7. RTK Rewrite (Context Efficiency)

`rtk-rewrite` reduces context consumed by verbose shell commands by asking RTK to rewrite supported agent `bash` calls, for example `git status` → `rtk git status` or `ls -la` → `rtk ls -la`. It is active by default when the starter kit is installed globally and RTK is on `PATH`.

Important rules:
- `permission-gate` runs first; RTK is **not** a security or permission layer.
- Missing RTK, timeouts, unsupported exit codes, empty output, identical output, and exceptions all fail open and run the original command unchanged.
- RTK exit codes `0` and `3` with non-empty changed stdout are accepted as successful rewrites; exit code `1` means no rewrite/pass-through.
- Starter-kit users do **not** need to run `rtk init --agent pi`; this package-level Pi extension handles the integration.

Controls:
```json
{
  "starterKit": {
    "rtkRewrite": { "enabled": false }
  }
}
```
Per-process or per-command opt out:
```bash
RTK_DISABLE_REWRITE=1
RTK_DISABLED=1
RTK_DISABLE_REWRITE=1 git status
```
Slash commands:
- `/rtk-status` — show effective config, hook state, and RTK version.
- `/rtk-gain` — run `rtk gain` for token-savings output; pass args such as `/rtk-gain --history` explicitly.
- `/rtk-toggle` — toggle rewrites for the current session only.

Smoke checks:
```bash
rtk --version
rtk rewrite "git status"
pi -e ./extensions/rtk-rewrite/index.ts
rtk gain --history
```

---

## 8. Extending Per Project

You can customize or add project-specific functionality without modifying the global package. Place custom extensions and skills inside your project's `.pi` directory:

- **Local Extensions**: Save TypeScript files in `.pi/extensions/`. They will be loaded automatically during session startup.
- **Local Skills**: Save custom `SKILL.md` documents in `.pi/skills/` to register localized commands or instructions.
- **Local Prompts**: Override templates in `.pi/prompts/` (e.g., custom plans or code reviews).

---

## 9. Troubleshooting

### TS compilation errors in extensions
Ensure you run compiler checks using the specific NodeNext module resolution. For example:
```bash
npx tsc extensions/permission-gate/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
```

### "No linter configured" warnings
The `post-edit-lint` extension expects a working linter (e.g., Biome, ESLint, Prettier) configured in the project root. If your project does not use a linter, set `"autoLint": false` in `.pi/settings.json`.

### Tool loops / Diminishing returns warnings
If the agent triggers `loop-protection`, review the error it is trying to resolve. Usually, the model is missing context. Break the task down, modify `AGENTS.md`, or use `/grill-me` to clarify requirements.

### RTK missing or no rewrites
If `/rtk-status` says RTK is missing, install RTK and ensure `rtk --version` works in the same shell that launches Pi. You do not need `rtk init --agent pi`. If you want to disable the integration permanently, set `starterKit.rtkRewrite.enabled=false`; for a one-off command use `RTK_DISABLE_REWRITE=1 <command>`.

### Diagnosing missing capabilities
Run the `starter_kit_doctor` tool to get a full report of installed extensions, active skills, available binaries, and recommended fixes:
```bash
# In a Pi.dev session, the agent can call:
starter_kit_doctor
```
The doctor checks for `.pi/settings.json`, verifies extension/skill directories, detects required and optional binaries (node, git, SQLite, language servers), and prints the current harness profile. Missing optional tools are warnings, not errors.

---

## 10. Architecture Overview

For a detailed breakdown of the 4-layer architecture (Core, Security & Quality, Skills Workflow, Ecosystem Dependencies), context saving metrics, and design decisions, see [docs/architecture.md](docs/architecture.md).

Additional implementation references:

- [Akita harness ideas plan](docs/akita-harness-ideas-plan.md)
- [Steering profiles](docs/steering-profiles.md)
- [Provider guidance](docs/provider-guidance.md)
- [ai-memory integration plan](docs/ai-memory-integration-plan.md)
