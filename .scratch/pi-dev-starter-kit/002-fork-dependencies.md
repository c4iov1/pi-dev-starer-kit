# 002 — Install and verify direct dependencies

**Status**: ready-for-human
**Type**: HITL

## Parent

PRD: `docs/prd.md`

## What to do

Install and verify the 5 third-party Pi.dev packages that the starter kit depends on. These are used as **direct dependencies** pointing to the original repositories — no forks needed. The kit's `package.json` references them directly.

Packages to verify:
1. `pi-web-access` (nicobailon/pi-web-access) — Web search, fetch, GitHub clone, PDF, YouTube
2. `pi-subagents` (nicobailon/pi-subagents) — Delegation with chains and parallel execution
3. `pi-mcp-adapter` (nicobailon/pi-mcp-adapter) — MCP server integration
4. `pi-agent-browser-native` (fitchmultz/pi-agent-browser-native) — Browser automation
5. `context-mode` (mksglu/context-mode) — Sandbox tools, FTS5 session continuity, Think-in-Code paradigm

Three packages from the original architecture were **removed** as external dependencies and will be reimplemented as internal extensions:
- `pi-quick-perms` → absorbed into `extensions/permission-gate/` (issue #003)
- `pi-contrib-gate` → reimplemented as `extensions/contrib-gate/` (issue #015)
- `pi-memory` → reimplemented as `extensions/auto-memory/` (issue #016)

After the kit's `package.json` is created (#001), verify each dependency installs correctly with `pi install git:...` and confirm tools register.

context-mode is the most impactful dependency. After install, it requires adding `mcp.json` configuration to `~/.pi/agent/mcp.json`. The kit's SYSTEM.md integrates context-mode's routing rules so the model uses sandbox tools for data processing.

## Acceptance criteria

- [ ] All 5 packages installable via `pi install git:github.com/<author>/<package>`
- [ ] Each package's tools are registered and callable by the LLM after install
- [ ] context-mode's MCP configuration verified at `~/.pi/agent/mcp.json`
- [ ] Dependencies documented in the kit's README.md with original repo URLs
- [ ] Verified that no fork is needed — originals work as-is

## Blocked by

- #001 (package scaffold must exist)
