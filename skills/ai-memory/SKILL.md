---
name: ai-memory
description: Use Akita's ai-memory service for always-on long-term project memory, cross-agent handoffs, wiki search, and session continuity. Use when the user asks about memory, handoff, previous decisions, catch-up, or when ai-memory MCP tools are available.
---

# ai-memory

`ai-memory` is an external always-on memory service from <https://github.com/akitaonrails/ai-memory>. The starter kit does **not** fork or vendor it. When installed, it runs continuously as a local/server process and captures lifecycle events through hooks.

The skill does not start memory by itself. It teaches you how to use the starter-kit slash commands and any ai-memory MCP tools exposed by `pi-mcp-adapter`. Pi lifecycle capture is handled by the starter-kit extension itself; no Oh My Pi (`~/.omp`) integration is required.

## Setup

Preferred starter-kit command:

```text
/setup-ai-memory
```

Equivalent upstream commands:

```bash
mkdir -p ~/.local/bin
curl -fsSL https://raw.githubusercontent.com/akitaonrails/ai-memory/main/bin/ai-memory \
  -o ~/.local/bin/ai-memory
chmod +x ~/.local/bin/ai-memory

docker run --platform linux/amd64 -d --name ai-memory \
  --restart unless-stopped \
  -p 127.0.0.1:49374:49374 \
  -v ai-memory-data:/data \
  akitaonrails/ai-memory:latest

# Pi-native path: the starter-kit extension posts lifecycle hooks itself.
# Install project routing only:
ai-memory install-instructions --target AGENTS.md
```

Use `AI_MEMORY_SERVER_URL` and `AI_MEMORY_AUTH_TOKEN` when the server runs on another machine or has bearer auth enabled. `--platform linux/amd64` is included because the upstream Docker image may not publish an arm64 manifest yet.

## Pi commands

The kit exposes direct tools for the agent:

- `memory_query` — search the ai-memory wiki.
- `memory_status` — inspect ai-memory health/stats.
- `memory_write_page` — write durable wiki knowledge only when the user explicitly asks.

The kit also exposes these Pi slash commands for the human/operator:

- `/setup-ai-memory` — install wrapper, start server, install AGENTS.md routing.
- `/ai-memory-status` — show server/wiki status.
- `/ai-memory-upgrade` — pull latest image and restart the local server.
- `/ai-memory-bootstrap [flags]` — seed wiki from existing project history/docs.
- `/ai-memory-backup [flags]` — create a backup.
- `/ai-memory-lint [flags]` — audit stale/contradictory pages and rule suggestions.
- `/ai-memory-forget-sweep [flags]` — run retention cleanup; pass `--dry-run` to preview.

## Detect availability

Before assuming ai-memory exists:

1. Use the `memory_status` tool or run `/ai-memory-status`; alternatively check whether `http://127.0.0.1:49374/web` responds.
2. If the `mcp` proxy tool is available through `pi-mcp-adapter`, discover additional tools with a search for `memory` or `ai-memory`.
3. If direct MCP memory tools are exposed, look for tools like `memory_query`, `memory_recent`, `memory_status`, `memory_briefing`, `memory_explore`, `memory_handoff_begin`, `memory_handoff_accept`, `memory_consolidate`, `memory_write_page`, and `memory_install_self_routing`.
4. If ai-memory tools are unavailable, use starter-kit `auto-memory` tools (`memory_search`, `memory_save`) as a local `MEMORY.md` fallback.

Never fail a user task just because ai-memory is offline. Report that advanced memory is unavailable and continue with local project docs and `auto-memory`.

## When to query

Use `memory_query` / MCP equivalent when:

- The user asks “have we discussed X?”, “search memory”, or “what did we decide about X?”.
- Starting architecture/design work where prior decisions or gotchas may exist.
- A bug/error looks familiar.
- After compaction or when context seems incomplete.

Use `memory_explore` when the user asks “catch me up”, “what happened recently?”, or returns after a long gap.

Use `memory_recent` or `memory_briefing` for concise project/session state.

## When to write

Most capture is automatic through hooks. Do **not** spam manual writes.

Use `memory_write_page` only when the user explicitly asks to remember durable knowledge, or when a rule/decision is important enough to become wiki knowledge.

Use `memory_handoff_begin` when:

- The user asks to save context for the next session.
- The current agent/client may not emit a true session-end hook.
- You are about to stop mid-task and want the next agent to resume cleanly.

Use `memory_consolidate` when the user asks to consolidate the session or when automatic consolidation failed/offline and the service is now available.

## Routing snippet

If the user asks to install ai-memory routing into this project, prefer the MCP tool `memory_install_self_routing` when available. Otherwise run:

```bash
ai-memory install-instructions --target AGENTS.md
```

The snippet belongs in project rules (`AGENTS.md` for Pi/Codex/OpenCode/Cursor/Gemini/OMP, `CLAUDE.md` for Claude Code). Re-running is idempotent.

## Hygiene

- Treat ai-memory wiki as agent memory, not canonical human documentation.
- Canonical decisions still belong in `docs/adr/` and durable project rules in `AGENTS.md`.
- Do not store secrets, tokens, private credentials, or raw large logs.
- Prefer querying compiled wiki pages over dumping raw chat context.
- Keep `auto-memory` as fallback, not as a competing source of truth.
