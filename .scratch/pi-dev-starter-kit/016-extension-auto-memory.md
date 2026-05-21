# 016 — Extension: auto-memory

**Status**: completed
**Type**: AFK

## Parent

PRD: `docs/prd.md`

## What to build

A lightweight Pi.dev extension that persists agent learnings and notes between sessions via a `MEMORY.md` file. This extension **replaces** the external dependency `pi-memory` (samfoy/pi-memory) with a simpler, index-style implementation that avoids context overload.

Before implementing, clone the original repo and review its approach:
- Reference: https://github.com/samfoy/pi-memory

Design principles (from the PRD):
- MEMORY.md as lightweight index, NOT expansive auto-memory
- Risk of expansive memory: context overload, hallucination from stale notes
- Index-style: short entries, timestamps, categories

The extension must:
- Register a `memory_save` tool that appends an entry to `MEMORY.md` at the project root
- Register a `memory_search` tool that searches MEMORY.md entries by keyword
- Hook into `session_start` to load a summary of recent memory entries into context
- Hook into `session_before_compact` to preserve MEMORY.md reference
- Entries format: `## [YYYY-MM-DD HH:MM] category\n\nbody\n\n---`
- Categories: `learning`, `decision`, `pattern`, `issue`, `note`
- Limit context injection to last 10 entries (configurable via settings)
- Read configuration from `.pi/settings.json` under `starterKit.autoMemory`

## Acceptance criteria

- [x] `memory_save` creates/appends to MEMORY.md
- [x] `memory_search` finds entries by keyword
- [x] Session start loads summary of recent entries
- [x] Entries follow the specified format with timestamp and category
- [x] Context injection limited to configurable number of entries
- [x] MEMORY.md survives compaction (preserved via hook)
- [x] Original pi-memory repo reviewed and relevant patterns incorporated
- [x] Configuration read from `.pi/settings.json`

## Blocked by

- #001 (package scaffold must exist)
