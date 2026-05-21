# Pi.dev Starter Kit

> Build the harness foundation. One `pi install`. Any project. Any model.

Pi.dev Starter Kit is a comprehensive package of extensions, skills, prompts, and templates that transforms the minimal Pi.dev harness into a production-ready agentic coding environment. By offering deterministic guardrails, structured workflows, and rich ecosystem integrations, it matches the capabilities of proprietary systems like Claude Code or Codex while guaranteeing complete model and provider autonomy.

---

## 1. Prerequisites

Before installing the starter kit, ensure you have the following installed on your machine:

- **Pi.dev CLI** (version `0.75.0` or higher recommended).
- **Git** (for version control and package installation).
- **Node.js** (LTS version recommended, minimum Node 18+).

---

## 2. Dependencies

The starter kit leverages five core packages from the Pi.dev ecosystem to provide advanced capabilities. They are referenced directly from upstream sources to receive automatic improvements:

| Dependency | Repository URL | Purpose |
|------------|----------------|---------|
| `context-mode` | [mksglu/context-mode](https://github.com/mksglu/context-mode) | Sandboxed runtimes, SQLite+FTS5 session index, 98% context savings. |
| `pi-agent-browser-native` | [fitchmultz/pi-agent-browser-native](https://github.com/fitchmultz/pi-agent-browser-native) | Native browser automation and screenshot verification. |
| `pi-mcp-adapter` | [nicobailon/pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | Adapter to mount and invoke external Model Context Protocol (MCP) servers. |
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

---

## 5. Feature Index (What You Get)

### Global Extensions

| Extension | Purpose | Tools Registered / Hooks Handled |
|-----------|---------|----------------------------------|
| `permission-gate` | Security gates & pipelines | Intercepts `PreToolUse` for write/edit/shell actions. |
| `post-edit-lint` | Deterministic linter triggers | Auto-runs linter/formatter (with `--fix`) after file edits. |
| `loop-protection` | Aborts doom-loops and repeated queries | Intercepts execution if model loops on the same error/action. |
| `task-tracker` | Local task management | Registers `TaskCreate`, `TaskUpdate` to track progress. |
| `lsp-bridge` | Real-time diagnostics & type checking | Provides incremental typechecking using local language servers. |
| `monitor-bash` | Background process orchestrator | Registers `Monitor` to run long processes line-by-line asynchronously. |
| `contrib-gate` | Commit and branch verification | Validates commit messages and branch naming conventions. |
| `auto-memory` | Session context manager | Persists key concepts to a local `MEMORY.md` file. |

### Global Skills

The starter kit bundles standard workflows based on the open Agent Skills format:

- **`plan-mode`**: Enforces writing an implementation plan before coding.
- **`self-verify`**: Builds and runs tests automatically to verify correctness.
- **`web-research`**: Performs cached or live web search queries.
- **`browser-testing`**: Automates browser verification of web UIs.
- **`subagent-delegation`**: Outsources tasks to sub-agents.
- **`mcp-orchestration`**: Discovers and interacts with registered MCP tools.
- **14 Matt Pocock engineering skills** (`/grill-with-docs`, `/tdd`, `/diagnose`, `/triage`, `/handoff`, etc.).

---

## 6. Permission Modes

The `permission-gate` extension controls access to file writes, file edits, and shell command executions via two modes configured in `.pi/settings.json`:

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

---

## 7. Extending Per Project

You can customize or add project-specific functionality without modifying the global package. Place custom extensions and skills inside your project's `.pi` directory:

- **Local Extensions**: Save TypeScript files in `.pi/extensions/`. They will be loaded automatically during session startup.
- **Local Skills**: Save custom `SKILL.md` documents in `.pi/skills/` to register localized commands or instructions.
- **Local Prompts**: Override templates in `.pi/prompts/` (e.g., custom plans or code reviews).

---

## 8. Troubleshooting

### TS compilation errors in extensions
Ensure you run compiler checks using the specific NodeNext module resolution. For example:
```bash
npx tsc extensions/permission-gate/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
```

### "No linter configured" warnings
The `post-edit-lint` extension expects a working linter (e.g., Biome, ESLint, Prettier) configured in the project root. If your project does not use a linter, set `"autoLint": false` in `.pi/settings.json`.

### Tool loops / Diminishing returns warnings
If the agent triggers `loop-protection`, review the error it is trying to resolve. Usually, the model is missing context. Break the task down, modify `AGENTS.md`, or use `/grill-me` to clarify requirements.

---

## 9. Architecture Overview

For a detailed breakdown of the 4-layer architecture (Core, Security & Quality, Skills Workflow, Ecosystem Dependencies), context saving metrics, and design decisions, please refer to the technical specification in [docs/architecture.md](file:///c:/main/workspace/pi-dev-starer-kit/docs/architecture.md).
