# 003 — Extension: permission-gate

**Status**: implemented
**Type**: AFK

## Parent

PRD: `docs/prd.md`

## What to build

A Pi.dev extension that implements a PreToolUse hook permission pipeline, following Claude Code's layered permission pattern (Reference Doc 7 §5). This is the security foundation — no other extension should run without it.

The permission pipeline processes tool calls through these layers, exiting when one makes a decision:

1. **Deny rules**: Instant rejection for destructive patterns — `rm -rf`, `git push --force`, `git reset --hard`, `DROP TABLE`, `TRUNCATE`, `sudo`, `chmod 777`, `curl ... | sh`, `npm publish`, `.env` writes
2. **Write constraint**: Reject `write` tool calls where the file already exists and was NOT read in the current session (prevents blind overwrites)
3. **Path confinement**: Reject tool calls targeting paths outside the workspace root
4. **Interactive prompt**: If permission mode is `default`, show a diff and ask `[y/N]` before edits. If `acceptEdits`, auto-approve edits but still gate bash commands through the deny/allow layers. If `featureWork`, auto-approve project-scoped read/write/edit and bash commands while still asking/blocking for git commit/push, network commands, protected paths, and outside-project paths.

The extension must:
- Register via `pi.on("session_start", ...)` to read configuration from `.pi/settings.json`
- Use `pi.on("tool_call", ...)` or equivalent PreToolUse mechanism
- Support three permission modes: `default` (approve each edit), `acceptEdits` (auto-approve edits, gate bash), and `featureWork` (auto-approve project-scoped implementation work)
- Register `/feature-mode on|off|status` and `feature_mode_toggle` for project-persisted mode switching via `.pi/settings.json`
- Read `.pi/settings.json` for the `starterKit.permissionMode` setting
- Block destructive commands even in `acceptEdits` mode; in `featureWork`, allow recursive `rm` only when all targets resolve inside the active project workspace

### Absorbing pi-quick-perms functionality

The original architecture depended on `pi-quick-perms` (cmptr/pi-quick-perms) as a separate package. That dependency has been removed — its functionality must be absorbed into this extension. Before implementing, clone the original repo and review its permission policies and quick commands. Incorporate any useful patterns (quick allow/deny policies, shortcut commands) into the permission-gate pipeline.

Reference: https://github.com/cmptr/pi-quick-perms

## Acceptance criteria

- [x] `rm -rf /` is blocked with error message
- [x] `git push --force` is blocked with error message
- [x] `sudo ...` is blocked with error message
- [x] Writing to `.env` without prior read is blocked
- [x] Attempting to write outside workspace root is blocked
- [x] In `default` mode, user is prompted with diff before edits
- [x] In `acceptEdits` mode, edits auto-approve but bash is still gated
- [x] In `featureWork` mode, read/write/edit tools are auto-approved only inside the active project
- [x] In `featureWork` mode, project-scoped bash commands are auto-approved
- [x] In `featureWork` mode, `git commit`, `git push`, network commands, and outside-project bash paths ask for permission
- [x] Destructive commands are blocked regardless of mode, with a narrow project-scoped recursive-rm exception in `featureWork`
- [x] Quick policy commands integrated as `/feature-mode` and `feature_mode_toggle`
- [x] `/feature-mode on` persists `starterKit.permissionMode = "featureWork"` to the active project's `.pi/settings.json` so future sessions start with feature permissions

## Blocked by

- #001 (package scaffold must exist)
