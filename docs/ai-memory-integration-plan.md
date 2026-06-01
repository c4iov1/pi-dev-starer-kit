# Plan — Integrate ai-memory into Pi.dev Starter Kit

## Objective

Replace the optional integration with `agentmemory` with an optional integration with the upstream `akitaonrails/ai-memory`, without forking or copying code. The kit should teach, configure, and validate the use of the external service with native Pi lifecycle hooks and administration commands.

## Architecture Decision

- **Do not add `ai-memory` to `package.json` `dependencies`**: it is an external Docker/binary service, not a Pi.dev package.
- **Do not replace `auto-memory`**: `auto-memory` remains the zero-infra local fallback via `MEMORY.md`.
- **Add `ai-memory` skill**: instructions on when to use `memory_query`, `memory_explore`, `memory_handoff_begin`, `memory_consolidate`, etc.
- **Add optional `.ai-memory.toml` template** for workspace/project routing.
- **Pi-native hooks**: the kit extension posts Pi events (`session_start`, `before_agent_start`, `tool_call`, `tool_result`, `session_before_compact`, `session_shutdown`) to the ai-memory `/hook` endpoint.

## Research Summary

### agentmemory issues identified in the post

- BM25 reindexed on restart when persistence failed.
- Persistence debounce created a data loss window.
- Inconsistent configuration made operation difficult.
- Wrong hooks silently dropped tool calls.
- State store depended on the caller's cwd.
- Multi-process/ports/in-memory indexes architecture was fragile.

### Why ai-memory is a better fit

- Rust single binary + SQLite/FTS5 + Markdown/git as source of truth.
- Fire-and-forget hooks; if the server is offline, the agent continues.
- Cross-agent handoff/memory via central server; for Pi, capture is handled by the kit extension.
- LLM/embeddings optional, avoiding mandatory cost/complexity.
- Small, explicit MCP tools for query/maintenance.

## Implementation Scope

1. **Complete removal of agentmemory** — done
   - Remove `skills/agent-memory/`.
   - Remove issues/documents recommending `rohitg00/agentmemory`.
   - Update PRD/architecture/AGENTS to not list `agent-memory`.

2. **New `ai-memory` skill** — implemented in `skills/memory/ai-memory/SKILL.md`
   - Create `skills/memory/ai-memory/SKILL.md`.
   - Content:
     - Quick setup with Docker + upstream wrapper.
     - Pi-native setup:
       - start upstream Docker server;
       - install routing in `AGENTS.md`;
       - lifecycle capture handled by `extensions/setup-ai-memory/index.ts`.
     - Healthcheck: `ai-memory status` and `curl http://127.0.0.1:49374/web` when web enabled.
     - MCP tool usage:
       - `memory_query`: previous decisions/gotchas.
       - `memory_explore`: catch-up.
       - `memory_handoff_begin`: prepare next session when no session-end hook.
       - `memory_recent`/`memory_briefing`: recover context after compaction.
       - `memory_write_page`: only when user requests explicit durable memory.
     - Fallback to `auto-memory` if MCP tools are unavailable.

3. **Templates** — implemented
   - Create `templates/ai-memory.toml.template` with examples:
     - default workspace per client/team.
     - `project_strategy = "repo-root"` for monorepos/worktrees.
   - Update `templates/AGENTS.template.md` with optional routing block or instruct to run `ai-memory install-instructions --target AGENTS.md`.

4. **Documentation** — implemented
   - Update `docs/architecture.md` with "Optional integration: ai-memory" section.
   - Update `docs/prd.md` to list the `ai-memory` skill (if approved) and remove `agent-memory`.
   - Keep `docs/references/9-ai-memory.md` as a synthesis of the research links.

5. **Validation**
   - Local smoke test without server: skill should guide fallback to `auto-memory`.
   - Smoke test with server:
     - start upstream container;
     - verify `/ai-memory-status`;
     - confirm Pi hooks post to `/hook` without breaking the session;
     - invoke administrative commands as needed;
     - confirm `auto-memory` does not conflict.

## Kit Command

```text
/setup-ai-memory
```

Useful flags:

- `--dry-run`: shows commands without executing.
- `--skip-server`: don't start local container; use when server is remote.
- `--skip-routing`: don't modify `AGENTS.md`.
- `--force-wrapper`: re-download the upstream wrapper.

Additional administrative commands:

- `/ai-memory-status`
- `/ai-memory-upgrade`
- `/ai-memory-bootstrap [flags]`
- `/ai-memory-backup [flags]`
- `/ai-memory-lint [flags]`
- `/ai-memory-forget-sweep [flags]`

## Recommended Upstream Commands

```bash
mkdir -p ~/.local/bin
curl -fsSL https://raw.githubusercontent.com/akitaonrails/ai-memory/main/bin/ai-memory \
  -o ~/.local/bin/ai-memory
chmod +x ~/.local/bin/ai-memory

# Local loopback server, no auth for single-user laptop.
docker run --platform linux/amd64 -d --name ai-memory \
  --restart unless-stopped \
  -p 127.0.0.1:49374:49374 \
  -v ai-memory-data:/data \
  akitaonrails/ai-memory:latest

# Note: --platform linux/amd64 works around missing arm64 manifest upstream.

# Pi-native: the starter kit extension posts hooks directly.
# Optional: install routing in project AGENTS.md.
ai-memory install-instructions --target AGENTS.md
```

## Decisions Answered

1. **Skill name: `ai-memory`**
   - Do not maintain nominal compatibility with `agent-memory`, to avoid carrying the `agentmemory` association.

2. **When the user installs/uses the service**
   - `ai-memory` is for users who want always-on persistent memory across sessions, long projects, and cross-agent handoff.
   - Main scenarios:
     - switching between Pi, Claude Code, Codex, OpenCode, Cursor, or Gemini on the same project;
     - stopping a task today and resuming days/weeks later without re-explaining context;
     - querying old decisions, gotchas, and research already done;
     - bootstrapping existing projects with months of history;
     - maintaining a navigable Markdown/git memory wiki.
   - Once installed, the **service stays active at all times** via server + hooks. The skill does not "turn on" memory; it only teaches the agent how to query/maintain memory when needed.

3. **Automation by the kit**
   - The kit should not automatically install the server during `pi install`, because that would run Docker, potentially require LLM tokens/auth, and change state outside the current project.
   - The kit should, however, offer an explicit, easy setup path: documentation + skill + idempotent upstream commands.
   - The kit adds the opt-in command `/setup-ai-memory` and administrative commands that orchestrate the upstream with explicit user confirmation when invoked.
