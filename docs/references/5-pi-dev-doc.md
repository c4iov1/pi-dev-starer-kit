# Pi — Harness Technical Manual

> **Stack**: `earendil-works/pi` (MIT monorepo). Main package: `@earendil-works/pi-coding-agent`.
> The domain `pi.dev` is provided by `exe.dev`. Pi is a *minimal terminal coding harness*.
> `pi-ai` handles multi-provider LLM communication; `pi-agent-core` adds the agent loop with tool calling; `pi-coding-agent` delivers the complete agent with built-in tools, session persistence, and extensibility; `pi-tui` provides the terminal UI.

---

## 1. Design Philosophy

**No MCP** — use Skills (CLI tools with READMEs) or write an extension that adds MCP. **No sub-agents** — spawn instances via tmux or build with extensions. **No permission popups** — run in a container or build your own confirmation flow via extensions. **No plan mode** — write plans in files or build with extensions. All of these patterns are available as extension examples (50+ examples provided).

The shipped built-in tools are: `read`, `bash`, `edit`, `write`, `grep`, `find`, and `ls`. The project treats the core as something to adapt, not a sealed product.

---

## 2. Providers & Models

Pi supports Anthropic, OpenAI, Google, Azure, Bedrock, Mistral, Groq, Cerebras, xAI, Hugging Face, Kimi, MiniMax, OpenRouter, Ollama, and more — unlike Claude Code (Anthropic-only) or GitHub Copilot (tied to GitHub/OpenAI).

Custom providers: add via `~/.pi/agent/models.json` if they speak a supported API (OpenAI, Anthropic, Google). For custom APIs or OAuth, use extensions.

OAuth login supported: use existing subscriptions (Claude Pro/Max, ChatGPT Plus/Pro, GitHub Copilot, Google Gemini CLI) instead of only API keys.

All credentials are stored in `~/.pi/agent/auth.json` with `0o600` permissions. File locking via `proper-lockfile` prevents race conditions during simultaneous token refresh. Pi **does not** use macOS Keychain, keytar, or any OS-level credential store. Resolution priority: runtime override → auth.json → env var → fallback resolver.

The `transport` field selects the provider's transport preference (`"sse"`, `"websocket"`, or `"auto"`) for providers that support multiple transports.

Mid-session switching: `/model` or `Ctrl+L`. `Ctrl+P` cycles a scoped favorites list (`/scoped-models`).

---

## 3. Execution Modes

Pi runs in four modes: **interactive**, **print** or **JSON**, **RPC** for process integration, and **SDK** for embedding in your own apps.

| Mode | Flag | Description |
|---|---|---|
| Interactive | *(default)* | Full terminal TUI |
| Print/JSON | `--mode json` | Newline-delimited JSON events |
| RPC | `--mode rpc` | JSONL over stdin/stdout |
| SDK | — | Direct import from the TypeScript package |

`--export [out]` writes a session as HTML without triggering the interactive UI.

---

## 4. Sessions

### 4.1 Storage Format

Sessions are stored as JSONL (JSON Lines) files. Each line is a JSON object with a `type` field. Entries form a **tree** via `id`/`parentId` fields, enabling in-place branching without creating new files.

Storage path: `~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl`, where `<path>` is the working directory with `/` replaced by `-`.

### 4.2 Entry Types

**SessionEntryBase** (base for all except SessionHeader):
```typescript
interface SessionEntryBase {
  type: string;
  id: string;        // 8-char hex ID
  parentId: string | null;  // null on first entry
  timestamp: string; // ISO timestamp
}
```
The **SessionHeader** is the first line of the file — metadata only, no `id`/`parentId`.

Example session header with parent (fork/clone):
```json
{
  "type": "session", "version": 3, "id": "uuid",
  "timestamp": "...", "cwd": "/path/to/project",
  "parentSession": "/path/to/original/session.jsonl"
}
```

**Union of available entry types:**

- `message` — conversation message (user/assistant/tool result)
- `model_change` — emitted when the user switches models mid-session
- `thinking_level_change` — emitted when changing reasoning level
- `compaction` — stores summary of previous messages; includes `summary`, `firstKeptEntryId`, `tokensBefore`
- `branch_summary` — created when navigating between distant branches with an LLM-generated summary of the previous branch
- `custom` — arbitrary data entry from extension
- `custom_message` — message injected by extension into LLM context
- `label` — bookmark on a specific entry

Legacy sessions are automatically migrated to the current version (v3) on load.

### 4.3 Session Management — CLI

```bash
pi -c              # continue the most recent session
pi -r              # browse and select past sessions
pi --no-session    # ephemeral mode (don't save)
pi --session <id>  # use a specific session by path or ID
pi --fork <id>     # fork a specific session into a new session
```

### 4.4 Branching & Tree Navigation

Pi-agent uses a tree-structured JSONL format to persist interactions. This architecture enables non-linear history (forking/branching) within a single session file, efficient appending of new events, and automatic migration between versions.

`/fork` creates a new `.jsonl` from the current state, effectively "detaching" the branch into its own session. **Branch Summarization**: when moving between distant branches, the system can generate a `BranchSummaryEntry` to load context from the "left" branch to the "right" one.

The `SessionSelectorComponent` (via `pi --resume` or `/resume`) provides a TUI for searching and restoring sessions. Supports fuzzy matching, exact phrases (with quotes), and Regex (`re:<pattern>`).

### 4.5 SessionManager — Internal API

- `appendEntry(entry)` — persists a new entry to JSONL and updates the in-memory tree
- `getTree()` — returns a defensive copy of the session as a hierarchical `SessionTreeNode`
- `getBranch(leafId)` — resolves the linear path from a specific leaf to the root, filtering out entries outside that branch
- `fork(entryId)` — creates a new session file from a specific point

`buildSessionContext()` is called to rebuild the message array for the LLM. If a `CompactionEntry` is present in the branch, messages before its `firstKeptEntryId` are omitted and replaced with the compaction summary.

---

## 5. Compaction

Compaction summarizes old messages while keeping recent ones. Manual: `/compact` or `/compact <custom instructions>`. Automatic: enabled by default. Triggers on context overflow (recovers and retries) or when approaching the limit (proactive).

**Compaction is lossy.** Full history remains in JSONL; use `/tree` to revisit.

Pi's built-in compaction is simple and effective, but is still a single-pass summarization step.

### 5.1 Compaction Hooks via Extension

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, signal } = event;
  // Cancel: return { cancel: true };
  // Custom summary:
  return {
    compaction: {
      summary: "...",
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
    }
  };
});

pi.on("session_compact", async (event, ctx) => {
  // event.compactionEntry - the saved compaction
  // event.fromExtension - if the extension provided it
});
```

---

## 6. Extensions

Extensions are TypeScript modules that extend pi's behavior. They can subscribe to lifecycle events, register custom tools callable by the LLM, add commands, and more.

Extensions are written in TypeScript and loaded dynamically **without compilation**.

Extensions are discovered in `~/.pi/agent/extensions/` (global) and `.pi/extensions/` (project-local). The `discoverAndLoadExtensions` function uses **jiti** to load TypeScript modules, providing a virtualized environment that includes core packages like `@mariozechner/pi-coding-agent` and `@sinclair/typebox`.

### 6.1 Minimum Structure

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => { ... });
  pi.registerTool({ ... });
  pi.registerCommand("name", { ... });
  pi.registerShortcut("ctrl+x", { ... });
  pi.registerFlag("my-flag", { ... });
}
```

Extension directory structure:
```
~/.pi/agent/extensions/
└── my-extension/
    ├── index.ts   # Entry point (exports default function)
    ├── tools.ts
    └── utils.ts
```

### 6.2 ExtensionAPI — Registration Methods

The API provides three functional groups: **Registration methods** — `on()`, `registerTool()`, `registerCommand()`, `registerShortcut()`, `registerFlag()`, `registerMessageRenderer()`. **Flag access** — `getFlag()` to read configuration values.

Active tool management:
```typescript
const active = pi.getActiveTools(); // ["read", "bash", "edit", "write"]
const all = pi.getAllTools();
pi.setActiveTools(["read", "bash"]); // Switch to read-only
```

Model and thinking level control:
```typescript
const model = ctx.modelRegistry.find("anthropic", "claude-sonnet-4-5");
await pi.setModel(model); // returns false if no API key

const current = pi.getThinkingLevel(); // "off"|"minimal"|"low"|"medium"|"high"|"xhigh"
pi.setThinkingLevel("high"); // clamped to model capabilities

// Shared event bus between extensions:
pi.events.on("my:event", (data) => { ... });
```

### 6.3 ExtensionContext (ctx) — Available in Handlers

```typescript
ctx.sessionManager.getEntries()  // all entries
ctx.sessionManager.getBranch()   // current branch
ctx.sessionManager.getLeafId()   // current leaf entry ID
```

`ctx.signal` — Current agent AbortSignal, or `undefined` when no active turn. Defined during active turn events (`tool_call`, `tool_result`, `message_update`, `turn_end`). Usually `undefined` in idle contexts (`session events`, `extension commands`, `shortcuts` fired while pi is idle).

`ctx.getContextUsage()` — returns current context usage for the active model. Uses last `assistant usage` when available, then estimates tokens for trailing messages:
```typescript
const usage = ctx.getContextUsage();
if (usage && usage.tokens > 100_000) { ... }
```

### 6.4 Lifecycle Events — Complete Sequence

```
startup
  └─► session_start { reason: "startup" }
      └─► resources_discover { reason: "startup" }

/fork or /clone
  ├─► session_before_fork   (can cancel)
  ├─► session_shutdown
  ├─► session_start { reason: "fork", previousSessionFile }
  └─► resources_discover { reason: "startup" }

/compact or auto-compaction
  ├─► session_before_compact  (can cancel or customize)
  └─► session_compact

/tree navigation
  ├─► session_before_tree   (can cancel or customize)
  └─► session_tree

/model or Ctrl+P
  ├─► thinking_level_select  (if model change alters thinking level)
  └─► model_select

exit (Ctrl+C, Ctrl+D, SIGHUP, SIGTERM)
  └─► session_shutdown
```

### 6.5 State Persistence Across Branches

Extensions with state should store it in `tool result details` for proper branching support — reconstructing it on `session_start` by iterating over the current branch.

### 6.6 UI — Available Primitives

- `ctx.ui.custom()` — full TUI components with keyboard input for complex interactions
- `pi.registerCommand()` — registers commands like `/mycommand`
- `pi.appendEntry()` — session persistence, survives restarts
- Control over how tool calls/results and messages appear in the TUI

In the UI Phase, extensions can request user input or display status via `ctx.ui`. In **interactive mode** it renders TUI components; in **RPC mode** it translates these requests into JSON messages for the remote client.

---

## 7. Skills

Skills are on-demand capability packages — **progressive disclosure without busting the prompt cache**.

Skills are specialized extensions defined via `SKILL.md` files. The `ResourceLoader` discovers these skills and injects them into the system prompt via YAML frontmatter.

Extensions can register custom commands; skills are available as `/skill:name`; prompt templates expand via `/templatename`.

Sessions follow the **Agent Skills standard** (`agentskills.io`) for skill definitions.

---

## 8. Prompt Templates

Reusable prompts as Markdown files. Type `/name` to expand.

```markdown
<!-- ~/.pi/agent/prompts/review.md -->
Review this code for bugs, security issues, and performance problems.
```

Replace the default system prompt with `.pi/SYSTEM.md` (project) or `~/.pi/agent/SYSTEM.md` (global). Append without replacing via `APPEND_SYSTEM.md`.

Pi loads `AGENTS.md` (or `CLAUDE.md`) at startup from multiple locations. All found files are concatenated.

---

## 9. Context Engineering — Control Layers

Pi adopts a **"context engineering"** approach with a deliberately minimal system prompt and multiple control layers:
- `AGENTS.md / CLAUDE.md` — project instructions loaded at startup
- `SYSTEM.md` — replaces or appends to the default system prompt per project
- **Skills** — on-demand capability packages
- **Prompt Templates** — reusable Markdown prompts expanded via `/name`
- **Dynamic context via extensions** — injects messages before each turn, filters history, implements RAG or long-term memory
- **Customizable compaction** — auto-summarizes old messages; fully overridable

---

## 10. Packages

Pi Package structure (`package.json`):
```json
{
  "name": "my-pi-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```
Without a `pi` manifest, pi auto-discovers from conventional directories (`extensions/`, `skills/`, `prompts/`, `themes/`).

Git packages install dependencies with `npm install --omit=dev` by default, so runtime deps must be listed in `dependencies`. If using a Node version manager, configure `npmCommand` in `settings.json`.

---

## 11. RPC Mode

When run with `--rpc`, pi operates as a headless JSON-over-stdio service. Reads JSON commands from stdin, writes JSON events/responses to stdout.

RPC mode uses strict JSONL semantics with LF (`\n`) as the only record delimiter.

Clients should split records on `\n` only. **Do not** use generic readers like Node `readline`, which also splits on Unicode separators (`U+2028`, `U+2029`) present within JSON payloads.

### 11.1 Available RPC Commands

**`prompt`** — sends a user prompt to the agent. The command response is emitted after the prompt is accepted, queued, or handled. Events continue streaming asynchronously after acceptance:
```json
{"id": "req-1", "type": "prompt", "message": "Hello, world!"}
```

All commands support an optional `id` field for request/response correlation. If provided, the corresponding response will include the same `id`.

**`get_state`** — returns the current session state:
```json
{
  "type": "response", "command": "get_state", "success": true,
  "data": {
    "model": {...}, "thinkingLevel": "medium",
    "isStreaming": false, "isCompacting": false,
    "steeringMode": "all", "followUpMode": "one-at-a-time",
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123", "sessionName": "my-feature-work",
    "autoCompactionEnabled": true
  }
}
```

**`get_commands`** — returns available commands (extension commands, prompt templates, and skills). They can be invoked via `prompt` command by prefixing with `/`.

Skill commands and prompt templates are expanded in RPC. Extension commands **are not allowed** (use `prompt` instead).

Events are streamed to stdout as JSON lines during agent operation.

### 11.2 Steering & Follow-up

- **Enter** — queues a steering message, delivered after the assistant turn finishes its tool calls
- **Alt+Enter** — queues a follow-up, delivered only after the agent finishes all work

`steeringMode` and `followUpMode` can be `"one-at-a-time"` (default, waits for response) or `"all"` (delivers all at once).

---

## 12. SDK

For Node.js/TypeScript: use `AgentSession` directly from `@earendil-works/pi-coding-agent` instead of spawning a subprocess. See `src/core/agent-session.ts` for the API.

Basic SDK usage:
```typescript
import { AuthStorage, createAgentSession, ModelRegistry, SessionManager }
  from "@earendil-works/pi-coding-agent";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage,
  modelRegistry,
});

await session.prompt("What files are in the current directory?");
```

Use the runtime API when you need to replace the active session and rebuild runtime state bound to cwd. It's the same layer used by the built-in modes: interactive, print, and RPC. `createAgentSessionRuntime()` takes a runtime factory plus the initial cwd/session target. The factory closes over fixed global-process inputs, recreates services bound to cwd, resolves session options against those services, and returns a complete runtime result.

### 12.1 SDK Exports

```typescript
// Factories
createAgentSession
createAgentSessionRuntime
AgentSessionRuntime

// Auth and Models
AuthStorage
ModelRegistry

// Resource loading
DefaultResourceLoader
type ResourceLoader
createEventBus

// Helpers
defineTool

// Session management
SessionManager
SettingsManager

// Built-in tools (use process.cwd())
codingTools, readOnlyTools
readTool, bashTool, editTool, writeTool
grepTool, findTool, lsTool

// Tool factories (for custom cwd)
createCodingTools, createReadOnlyTools
createReadTool, createBashTool, createEditTool, createWriteTool
createGrepTool, createFindTool, createLsTool

// Types
type CreateAgentSessionOptions
type CreateAgentSessionResult
type ExtensionFactory
type ExtensionAPI
type ToolDefinition
type Skill
type PromptTemplate
type Tool
```

### 12.2 Steering and Follow-up via SDK

```typescript
// Steering: delivered after the current turn finishes its tool calls
await session.steer("New instruction");

// Follow-up: delivered only when the agent stops
await session.followUp("After you're done, also do this");
```
Both expand file-based prompt templates but error on extension commands (they cannot be queued).

The `Agent` class (from `@earendil-works/pi-agent-core`) handles core LLM interaction. Access via `session.agent`.

---

## 13. JSON Mode

`--mode json` — newline-delimited JSON events. `--mode rpc` — JSONL over stdin/stdout.

In JSON mode, all agent events are emitted as JSON lines to stdout — suitable for CI/CD pipelines or processes that consume agent output without bidirectional control (unlike RPC, which is full-duplex).

---

## 14. Telemetry & Network

Install/update telemetry: after first install or update detected via changelog, sends an anonymous version ping to `https://pi.dev/api/report-install`. Opt-out: `enableInstallTelemetry: false` in `settings.json` or `PI_TELEMETRY=0`. This **does not** disable update checks; pi may still contact `pi.dev` for the latest version unless update checks are disabled or offline mode is enabled.

Pi respects `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, `https_proxy`, `no_proxy`, `NO_PROXY` via `undici`'s `EnvHttpProxyAgent`.

---

## 15. Configuration — File Hierarchy

| File | Scope | Function |
|---|---|---|
| `~/.pi/agent/settings.json` | Global | General settings |
| `.pi/settings.json` | Project | Local override |
| `~/.pi/agent/models.json` | Global | Custom providers/models |
| `~/.pi/agent/auth.json` | Global | Credentials (`0o600`) |
| `~/.pi/agent/SYSTEM.md` | Global | Global system prompt |
| `.pi/SYSTEM.md` | Project | Project system prompt (replaces) |
| `APPEND_SYSTEM.md` | Project | Appends to system prompt |
| `AGENTS.md` / `CLAUDE.md` | Project | Project instructions (concatenated) |
| `~/.pi/agent/keybindings.json` | Global | Custom keybindings |

Project-level override: `.pi/settings.json`, `.pi/extensions/`, `.pi/skills/` enable project-specific agent behavior.

---

## Layered Architecture Summary

```
┌─────────────────────────────────────────────┐
│           Interactive / Print / JSON / RPC  │  ← Execution modes
├─────────────────────────────────────────────┤
│     pi-coding-agent  (main harness)         │
│  ┌────────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Extensions │  │  Skills  │  │Prompts  │ │  ← Extensibility layer
│  └────────────┘  └──────────┘  └─────────┘ │
│  ┌─────────────────────────────────────────┐│
│  │  SessionManager  (JSONL tree, branches) ││  ← Persistence
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │  Compaction  (context budget control)   ││  ← Context engineering
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│     pi-agent-core  (agent loop + tools)     │
├─────────────────────────────────────────────┤
│     pi-ai  (provider abstraction layer)     │  ← Anthropic/OpenAI/Google/...
└─────────────────────────────────────────────┘
```
