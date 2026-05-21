# 003 — Extension: permission-gate

**Status**: ready-for-agent
**Type**: AFK

## Parent

PRD: `docs/prd.md`

## What to build

A Pi.dev extension that implements a PreToolUse hook permission pipeline, following Claude Code's layered permission pattern (Reference Doc 7 §5). This is the security foundation — no other extension should run without it.

The permission pipeline processes tool calls through these layers, exiting when one makes a decision:

1. **Deny rules**: Instant rejection for destructive patterns — `rm -rf`, `git push --force`, `git reset --hard`, `DROP TABLE`, `TRUNCATE`, `sudo`, `chmod 777`, `curl ... | sh`, `npm publish`, `.env` writes
2. **Write constraint**: Reject `write` tool calls where the file already exists and was NOT read in the current session (prevents blind overwrites)
3. **Path confinement**: Reject tool calls targeting paths outside the workspace root
4. **Interactive prompt**: If permission mode is `default`, show a diff and ask `[y/N]` before edits. If `acceptEdits`, auto-approve edits but still gate bash commands through the deny/allow layers

The extension must:
- Register via `pi.on("session_start", ...)` to read configuration from `.pi/settings.json`
- Use `pi.on("tool_call", ...)` or equivalent PreToolUse mechanism
- Support two permission modes: `default` (approve each edit) and `acceptEdits` (auto-approve edits, gate bash)
- Read `.pi/settings.json` for the `starterKit.permissionMode` setting
- Block destructive commands even in `acceptEdits` mode

### Absorbing pi-quick-perms functionality

The original architecture depended on `pi-quick-perms` (cmptr/pi-quick-perms) as a separate package. That dependency has been removed — its functionality must be absorbed into this extension. Before implementing, clone the original repo and review its permission policies and quick commands. Incorporate any useful patterns (quick allow/deny policies, shortcut commands) into the permission-gate pipeline.

Reference: https://github.com/cmptr/pi-quick-perms

## Acceptance criteria

- [ ] `rm -rf /` is blocked with error message
- [ ] `git push --force` is blocked with error message
- [ ] `sudo ...` is blocked with error message
- [ ] Writing to `.env` without prior read is blocked
- [ ] Attempting to write outside workspace root is blocked
- [ ] In `default` mode, user is prompted with diff before edits
- [ ] In `acceptEdits` mode, edits auto-approve but bash is still gated
- [ ] Destructive commands are blocked regardless of mode
- [ ] pi-quick-perms functionality reviewed and relevant patterns absorbed
- [ ] Quick policy commands (if applicable) integrated into the permission pipeline

## Blocked by

- #001 (package scaffold must exist)
