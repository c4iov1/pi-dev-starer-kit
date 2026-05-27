# Steering Profiles

> Configurable harness behavior for agent autonomy, user interruption, and context compression.

## Overview

Pi.dev Starter Kit exposes three profile settings under `starterKit` in `.pi/settings.json`. These control how the agent handles user redirection, manages context across long sessions, and balances verbosity against auditability.

## Settings

### `steeringMode`

Controls how the agent responds to user direction and how much detail it surfaces.

| Value | Behavior | Best for |
|---|---|---|
| `polished-default` | Concise output. Accepts user corrections quickly. Re-plans when redirected. | Most projects. The recommended default. |
| `power-user` | Exposes more internal reasoning, options, and trade-offs. | Power users who want to see the agent's thinking. |
| `low-verbosity` | Minimal output. Only reports blockers. | Quick fixes, simple tasks. |
| `audit-heavy` | Asks for confirmation before each major step. Produces evidence for decisions. | Security-critical or compliance-heavy work. |

### `interruptMode`

Controls what happens when the user interrupts an in-progress agent action.

| Value | Behavior |
|---|---|
| `safe-steer` | Pauses, preserves task state, adjusts the plan based on user input, and continues. The recommended default. |
| `hard-stop` | Immediately stops the current action. Waits for explicit user command to continue. |
| `continue-with-note` | Notes the interruption but continues the current action. Records the user's comment for later review. |

### `compactionStrategy`

Controls how context is compressed between turns and how session continuity is maintained.

| Value | Behavior |
|---|---|
| `context-mode-default` | Uses context-mode's SQLite+FTS5 session index. After compaction, the agent recovers relevant state via BM25 search. The recommended default. |
| `memory-first` | Prioritizes structured memory (ai-memory or auto-memory) over raw history. Short summaries, more reliance on `memory_search`. |
| `minimal-summary` | Kills most context after compaction. Agent works from the minimum needed to resume. Fast but may lose nuance. |
| `audit-trail` | Preserves detailed event traces. Larger context window usage but full accountability. |

## Current Enforceability

As of May 2026, Pi.dev runtime hooks for steering and interruption are limited. The settings serve as **advisory hints**:

- **`steeringMode` and `interruptMode`**: Documented in SYSTEM.md. The agent reads the active profile and adjusts behavior accordingly. Full runtime enforcement depends on Pi.dev exposing suitable lifecycle hooks.
- **`compactionStrategy`**: When context-mode is active, the agent already uses FTS5-based continuity. The `audit-trail` setting maps to context-mode's built-in event indexing.

These settings are designed to be forward-compatible: as Pi.dev adds hooks (`session_before_compact`, `before_agent_message`, etc.), extensions can enforce them programmatically without changing the user-facing API.

## Interaction with Other Components

| Component | Interaction |
|---|---|
| **context-mode** | `compactionStrategy` directly controls how context-mode indexes and recovers state. |
| **ai-memory** | `memory-first` compaction strategy uses ai-memory's wiki/graph as primary long-term store. |
| **permission-gate** | `audit-heavy` steering increases permission-gate scrutiny. |
| **starter-kit-doctor** | Doctor reports the active profile settings. |

## Recommended Configurations

### Quick-start (most users)
```json
{
  "steeringMode": "polished-default",
  "interruptMode": "safe-steer",
  "compactionStrategy": "context-mode-default"
}
```

### Audit/compliance
```json
{
  "steeringMode": "audit-heavy",
  "interruptMode": "hard-stop",
  "compactionStrategy": "audit-trail"
}
```

### Low-touch automation
```json
{
  "steeringMode": "low-verbosity",
  "interruptMode": "continue-with-note",
  "compactionStrategy": "minimal-summary"
}
```
