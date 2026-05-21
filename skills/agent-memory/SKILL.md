---
name: agent-memory
description: Advanced memory skill utilizing the external agentmemory MCP server for structured long-term storage, semantic search, and decay. Falls back to local auto-memory.
---

# Agent Memory Skill

## Philosophy

**Core Principle**: Maintain a continuous, evolving context across agent runs and workspaces. While the lightweight `auto-memory` extension (#016) logs memories to a flat `MEMORY.md` file, the advanced `agent-memory` skill uses an external `agentmemory` MCP server.

This MCP server equips the agent with:
- **Vector + BM25 Hybrid Search**: Locates context based on semantic intent, not just raw keywords.
- **Ebbinghaus Decay**: Older, unreinforced memories fade out over time, reducing context pollution.
- **CoALA memory taxonomy**: Categorizes storage into episodic, semantic, or procedural memories.
- **Confidence Scoring**: Adjusts accuracy values dynamically depending on reinforcement loops.

---

## Workspace Setup

To configure and run the external memory server, ensure these steps are completed:

### 1. Launch the agentmemory Server
Run the memory daemon on your local environment (defaults to port 3111):
```bash
npx @agentmemory/agentmemory
```

### 2. Configure MCP Adapter
Add the server config to the global Pi.dev MCP setup file located at `~/.pi/agent/mcp.json`:
```json
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
```

### 3. Verify Health
Validate the connection via curl:
```bash
curl http://localhost:3111/agentmemory/health
```
You can also open the visual memory viewer UI at `http://localhost:3113` to browse records.

### 4. Project-Level Settings
Enable auto-actions inside `.pi/settings.json`:
```json
{
  "starterKit": {
    "agentMemory": {
      "enabled": true,
      "serverUrl": "http://localhost:3111",
      "autoSearch": true,
      "autoSave": true
    }
  }
}
```

---

## Workflow

### 1. Auto-Detect and Fallback
At the beginning of each turn:
- Scan the tool registry for `agentmemory` MCP tools (e.g. `memory_smart_search`, `memory_save`).
- **If MCP tools are available**: Follow the **MCP Memory Guidelines** below.
- **If MCP tools are NOT available**: Fall back to the local `auto-memory` extension tools (`memory_save` and `memory_search` which write to `MEMORY.md` at the project root).
- Notify the user if you expect MCP memory tools to be running but find them offline.

### 2. MCP Memory Guidelines

#### Saving Memories (use `memory_save`)
Do not dump raw code blocks or execution outputs. Instead, persist structural insights.
- **Episodic (Events)**: Save key session actions (e.g. "Completed migration of Auth endpoints to v2").
- **Semantic (Facts/Knowledge)**: Save definitions, rules, or design choices (e.g. "Database materializations are updated hourly in this project").
- **Procedural (Workflows)**: Save execution lessons (e.g. "When deploying to staging, run database migrations before restarting container endpoints").
- **Confidence Reinforcement**: If you observe a pattern repeating across sessions, write/reinforce it again to raise its confidence score and delay decay.

#### Searching Memories (use `memory_smart_search` / `memory_search`)
Perform semantic lookups:
- **On Task Start**: Before writing any implementation code, search past records using task keywords.
- **On Complex Errors**: Search error codes or stack trace messages to see if you have resolved similar issues before.
- **Post-Compaction**: Run searches to recover important context details lost in compression cycles.
- **Prior to Handoff**: Search active memory nodes to prepare a clear status summary.
