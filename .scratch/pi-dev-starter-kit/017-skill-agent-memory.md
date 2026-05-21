# 017 — Skill: agent-memory (agentmemory MCP integration)

**Status**: completed
**Type**: AFK

## Parent

PRD: `docs/prd.md`

## What to build

A skill that teaches the agent how to use [agentmemory](https://github.com/rohitg00/agentmemory) — an external MCP server providing persistent, structured long-term memory with semantic search, knowledge graphs, confidence scoring, and Ebbinghaus decay.

This is an **optional, advanced** capability. The kit's built-in `auto-memory` extension (#016) provides lightweight MEMORY.md persistence that works without any extra infrastructure. This skill activates **on top of** auto-memory when the user has agentmemory running as an MCP server.

### Why agentmemory

The built-in auto-memory (#016) is a flat Markdown file — sufficient for simple projects but limited:
- No semantic search (keyword only)
- No memory decay (accumulates stale data)
- No confidence scoring
- No cross-agent sharing
- No knowledge graph

agentmemory solves these limitations via a standalone MCP server with:
- **Hybrid search**: BM25 + vector embeddings + knowledge graph traversal
- **Ebbinghaus decay**: Stale memories fade, reinforced memories persist
- **CoALA taxonomy**: Working, episodic, semantic, and procedural memory types
- **Confidence scoring**: Facts have dynamic scores (increase with reinforcement, decrease with time)
- **Cross-agent sharing**: Memory is shared across all MCP-compatible agents

### Architecture

agentmemory is NOT a dependency of the kit. It's an external MCP server that the user optionally runs:

```
┌─────────────────────────────┐     MCP Protocol     ┌──────────────────────┐
│   Pi.dev + Starter Kit      │ ◄──────────────────► │  agentmemory server  │
│                             │                       │  localhost:3111      │
│  skill: agent-memory        │                       │  SQLite + embeddings │
│  (teaches WHEN/HOW to use)  │                       │  knowledge graph     │
└─────────────────────────────┘                       └──────────────────────┘
```

The skill ONLY provides instructions — it does NOT register tools. The tools (`memory_smart_search`, `memory_save`, etc.) are registered automatically by the MCP server via `pi-mcp-adapter`.

### Skill content

The `SKILL.md` must teach the agent:

1. **When to save memory** (use `memory_save`):
   - Architecture decisions ("We chose PostgreSQL over MongoDB because...")
   - User preferences ("User prefers functional style, dislikes classes")
   - Project patterns ("Auth uses JWT with refresh tokens stored in httpOnly cookies")
   - Bug resolutions ("The CORS issue was caused by missing headers in the proxy config")
   - Domain knowledge ("A 'materialization' in this project means...")

2. **When to search memory** (use `memory_smart_search`):
   - Before starting a new task — check if there's relevant past context
   - When encountering a pattern that seems familiar
   - When the user references something from a previous session
   - After compaction — recover lost context

3. **Memory hygiene**:
   - Save decisions, NOT raw code snippets
   - Use appropriate memory types (episodic for events, semantic for facts, procedural for workflows)
   - Let decay handle cleanup — don't manually delete unless wrong
   - Confidence increases with reinforcement — if you see the same pattern twice, save it again

4. **Fallback behavior**:
   - If agentmemory tools are not available (server not running), fall back to `auto-memory` extension (#016)
   - Never fail silently — inform the user if memory tools are unavailable

### Setup instructions (for inclusion in the skill)

```bash
# 1. Start agentmemory server (one-time, runs in background)
npx @agentmemory/agentmemory

# 2. Add to MCP config (~/.pi/agent/mcp.json)
{
  "mcpServers": {
    "agentmemory": {
      "command": "npx",
      "args": ["-y", "@agentmemory/mcp"],
      "env": {
        "AGENTMEMORY_URL": "http://localhost:3111"
      }
    }
  }
}

# 3. Verify
curl http://localhost:3111/agentmemory/health

# 4. Memory viewer UI available at http://localhost:3113
```

### Configuration

In `.pi/settings.json`:

```json
{
  "starterKit": {
    "agentMemory": {
      "enabled": false,
      "serverUrl": "http://localhost:3111",
      "autoSearch": true,
      "autoSave": true
    }
  }
}
```

## Acceptance criteria

- [x] `skills/agent-memory/SKILL.md` created with complete instructions
- [x] Skill activates via `/agent-memory` command
- [x] When agentmemory MCP tools are available, skill teaches their usage patterns
- [x] When agentmemory is NOT available, skill gracefully falls back to auto-memory (#016)
- [x] Setup instructions included in the skill (server start, MCP config, verification)
- [x] Memory save patterns documented (what to save, when, which memory type)
- [x] Memory search patterns documented (when to search, how to interpret results)
- [x] Configuration documented for `.pi/settings.json`
- [x] Reference: https://github.com/rohitg00/agentmemory

## Blocked by

- #001 (package scaffold must exist)
- #016 (auto-memory extension must exist — this skill uses it as fallback)

## Notes

- agentmemory is Apache 2.0 licensed — no compatibility issues
- 11K+ stars, very actively maintained (v0.9.20 as of May 2026)
- Based on Karpathy's "LLM Wiki" pattern and CoALA memory taxonomy
- Blog reference: https://akitaonrails.com/2026/05/18/memoria-agentes-karpathy-llm-wiki-agentmemory/
