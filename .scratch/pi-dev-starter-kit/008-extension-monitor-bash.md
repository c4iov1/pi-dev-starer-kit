# 008 — Extension: monitor-bash

**Status**: ready-for-agent
**Type**: AFK

## Parent

PRD: `docs/plans/pi-dev-starter-kit-prd.md`

## What to build

A Pi.dev extension that registers a `Monitor` tool — equivalent to Claude Code's `Monitor` tool. This allows the model to run a shell command in the background and receive streaming output line-by-line, enabling long-running processes (servers, watchers, builds) without blocking the agent loop.

The extension must:
- Register a `Monitor` tool that accepts: `command` (string), `timeout` (optional, default 120s), and `cwd` (optional, defaults to project root)
- Execute the command as a child process
- Stream each stdout/stderr line as a separate tool result entry
- Support cancellation via AbortSignal
- Handle process exit and report exit code
- Enforce a maximum timeout (configurable, default 10 minutes) to prevent runaway processes

The output format must be concise. Each line is prefixed with `[stdout]` or `[stderr]`. The final result includes the exit code.

## Acceptance criteria

- [ ] `Monitor` tool is registered and callable by the LLM
- [ ] Running `Monitor { command: "npm run dev" }` streams output lines
- [ ] Each output line appears as a separate tool result
- [ ] Process exit code is reported in the final result
- [ ] Timeout kills the process and reports timeout
- [ ] Cancellation (user Ctrl+C) kills the process
- [ ] Respects `permission-gate` — destructive commands are blocked

## Blocked by

- #001 (package scaffold must exist)
- #003 (permission-gate — Monitor runs bash, must go through permission pipeline)
