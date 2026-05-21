# 015 — Extension: contrib-gate

**Status**: ready-for-agent
**Type**: AFK

## Parent

PRD: `docs/prd.md`

## What to build

A Pi.dev extension that enforces git workflow conventions — branch naming, conventional commits, and pre-commit validation. This extension **replaces** the external dependency `pi-contrib-gate` (nandal/pi-ext/tree/main/contrib-gate) by reimplementing its functionality as an internal extension.

Before implementing, clone the original repo and review its approach:
- Reference: https://github.com/nandal/pi-ext/tree/main/contrib-gate

The extension must:
- Register a PreToolUse hook that intercepts `bash` tool calls containing `git commit` or `git checkout -b` / `git switch -c`
- Validate branch names against a configurable pattern (default: `feature/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*`, `test/*`)
- Validate commit messages follow conventional commits format (`type(scope): description`)
- Warn (not block) on violations in `default` mode, block in `strict` mode
- Read configuration from `.pi/settings.json` under `starterKit.contribGate`

## Acceptance criteria

- [ ] `git commit -m "bad message"` triggers a warning/block with conventional commit suggestion
- [ ] `git commit -m "feat: add login"` passes validation
- [ ] `git checkout -b random-name` triggers a warning/block
- [ ] `git checkout -b feature/add-login` passes validation
- [ ] Configuration is read from `.pi/settings.json`
- [ ] `default` mode warns, `strict` mode blocks
- [ ] Original pi-contrib-gate repo reviewed and relevant patterns incorporated

## Blocked by

- #001 (package scaffold must exist)
- #003 (permission-gate must exist — contrib-gate hooks into the same PreToolUse pipeline)
