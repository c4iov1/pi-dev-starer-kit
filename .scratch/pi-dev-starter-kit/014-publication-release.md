# 014 — Kit publication + release

**Status**: ready-for-human
**Type**: HITL

## Parent

PRD: `docs/plans/pi-dev-starter-kit-prd.md`

## What to build

Finalize the package for publication. This is a human-gated slice because it involves pushing to a public repository, tagging a release, and verifying the install flow from a clean environment.

### Pre-release checklist

1. **package.json finalization**:
   - Verify all dependency URLs point to correct original repos (#002)
   - Verify `pi` manifest declares all extensions, skills, and prompts directories
   - Set version to `1.0.0`
   - Run `npm install` to verify dependency resolution

2. **Clean-room install test**:
   - On a machine without the kit installed, run `pi install git:github.com/caioo/pi-dev-starter-kit`
   - Verify all extensions register: `/reload` shows them in the startup header
   - Verify all skills are discoverable: `pi --list-skills` or equivalent
   - Verify prompt templates expand: `/plan`, `/verify`, `/review`, `/handoff`
   - Verify SYSTEM.md is loaded: check startup header shows SYSTEM.md
   - Verify direct dependencies install correctly from original repos

3. **New project flow test**:
   - Create a new empty directory
   - Run `/init-starter-kit`
   - Verify templates are copied
   - Run `/setup-matt-pocock-skills`
   - Verify `docs/agents/` files are created
   - Edit AGENTS.md with a test project name
   - Start a Pi.dev session and verify the kit is active

4. **Git tag and release**:
   - Tag `v1.0.0` on the repository
   - Create GitHub release with release notes
   - Release notes should include: what's included, installation command, breaking changes (none for v1), known limitations

5. **Documentation finalization**:
   - Verify README.md is accurate after clean-room test
   - Cross-reference architecture doc (`docs/plans/pi-dev-starter-kit-architecture.md`)
   - Cross-reference PRD (`docs/plans/pi-dev-starter-kit-prd.md`)

### Known limitations for v1

Document these in the release notes:
- No OS-level sandboxing (use containers if needed)
- LSP bridge uses CLI (`tsc --noEmit`) rather than LSP protocol — works for most cases but not all language servers
- Monitor bash has a 10-minute max timeout
- Web search uses cached results by default (configurable to live)
- No agent teams support (use pi-crew if needed)
- System prompt is shared across all models (no per-model tuning)

## Acceptance criteria

- [ ] Clean-room install succeeds with zero errors
- [ ] All extensions, skills, and prompts are discovered
- [ ] New project flow works end-to-end
- [ ] `v1.0.0` tag created
- [ ] GitHub release published with release notes
- [x] Known limitations documented
- [ ] README.md verified against clean-room install

## Blocked by

- #001–#013 (all previous slices must be complete)
