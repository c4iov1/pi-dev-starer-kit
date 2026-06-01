# Reference Doc 9 — ai-memory (Akita) for Agent Memory

> **Main source**: https://akitaonrails.com/2026/05/23/criei-sistema-memoria-agentes-codigo-ai-memory/
> **Repository**: https://github.com/akitaonrails/ai-memory

## Why remove agentmemory

Akita reports that `agentmemory` had good ideas (Karpathy's LLM Wiki, consolidation, automatic hooks, MCP), but structural problems in daily use:

- BM25 reindexing on every restart when index persistence fails, causing minutes of rebuild.
- Data loss window from 5s debounce + persistence timeout that can crash the Node process.
- Inconsistent configuration reading paths (`process.env` vs helper), making env vars unreliable.
- Wrong hook for part of Claude Code's tool calls (`tool_output` vs `tool_response`), silently dropping observations.
- Engine running in caller's cwd, causing different state stores in Windows/different terminals.
- Architecture too complex for the problem: TypeScript MCP + separate iii-engine Rust + multiple processes/ports + in-memory indexes persisted via remote KV.

## What ai-memory proposes

- A single Rust binary with Axum HTTP/MCP server.
- Markdown on disk as source of truth, versioned by git.
- SQLite + FTS5 as derived index, WAL mode and single writer via mpsc.
- Fire-and-forget hooks to capture prompts, tool calls, compaction, and session boundaries.
- Cross-agent handoff: exit Claude Code and continue in Codex/Pi/OpenCode in the same directory.
- MCP tools for querying (`memory_query`, `memory_explore`, `memory_recent`, `memory_status`), handoff, and maintenance.
- LLM/embeddings optional: without a key it still works with FTS5 and rule-based summary; with LLM it improves consolidation.
- Per-workspace/project isolation via UUIDs and `.ai-memory.toml`.
- Multi-agent support. For Pi.dev, the starter kit uses native extension hooks.

## Implication for the kit

The kit should not fork/copy ai-memory. It should treat it as an optional external service, installed directly from upstream, and provide only:

1. Setup and operations documentation.
2. Skill/lightweight instructions for routing MCP tool usage when available.
3. Optional `.ai-memory.toml` template.
4. Healthcheck/diagnostics and administrative commands that don't block the agent when the service is offline.
5. Pi-native extension that posts lifecycle events to `/hook`.

`auto-memory` continues as the zero-infra fallback (`MEMORY.md`) for users who don't want Docker/external server.
