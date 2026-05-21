# 006 — Extension: task-tracker

**Status**: ready-for-agent
**Type**: AFK

## Parent

PRD: `docs/plans/pi-dev-starter-kit-prd.md`

## What to build

A Pi.dev extension that registers `TaskCreate` and `TaskUpdate` tools, giving the model persistent task tracking across turns. This fills the gap left by Claude Code's `TaskCreate` tool and Codex's `update_plan` tool — essential for coherence in long-running tasks (Reference Doc 3: "Working Memory" as a separate layer from transcript).

The extension must:
- Register two tools: `TaskCreate` (title, description, status) and `TaskUpdate` (taskId, status, notes)
- Persist tasks to `.pi/tasks.jsonl` in the project directory
- Reconstruct task state on `session_start` by reading the JSONL file
- Survive compaction — tasks are re-injected into context after compaction
- Support statuses: `pending`, `in_progress`, `done`, `blocked`
- Auto-inject active (non-done) tasks into context at the start of each turn

The task file format should be simple JSONL, one task per line, with an `id` field for referencing.

## Acceptance criteria

- [ ] Model can create a task with `TaskCreate`
- [ ] Model can update task status with `TaskUpdate`
- [ ] Tasks survive session restart (read from `.pi/tasks.jsonl`)
- [ ] Tasks survive compaction and are re-injected
- [ ] Active tasks appear in context at turn start
- [ ] Completed tasks do NOT appear in context (to avoid bloat)

## Blocked by

- #001 (package scaffold must exist)
