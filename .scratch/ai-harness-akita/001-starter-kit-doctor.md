# 001 — Implement `starter-kit-doctor` extension

Status: ready-for-agent
Priority: P0
Type: extension + templates + docs

## Why

Akita praises polished harnesses that work out of the box. Before adding advanced tools, the kit needs a single doctor command that tells user and agent what is installed, enabled, disabled, or missing. This also improves agent discoverability: the LLM can inspect current capabilities instead of assuming tools exist.

## Deliverable

Create `extensions/starter-kit-doctor/index.ts` registering a tool/command named `starter_kit_doctor` or slash command `/starter-kit-doctor` depending on Pi extension APIs available in this repo.

## Functional requirements

The doctor must report:

1. Project root and `.pi/settings.json` status.
2. Active starterKit extensions from settings.
3. Active starterKit skills from settings.
4. Whether expected extension folders exist:
   - `permission-gate`
   - `post-edit-lint`
   - `loop-protection`
   - `task-tracker`
   - `lsp-bridge`
   - `monitor-bash`
   - `contrib-gate`
   - `auto-memory`
   - future: `artifact-read`, `ast-tools`, `source-navigation`, `starter-kit-doctor`
5. Whether expected skills exist:
   - current skills plus future `artifact-analysis`, `structural-refactor`, `review-matrix`.
6. External binary/dependency checks:
   - `node`, `npm`, `npx`, `git`
   - optional: `sqlite3`, `python3`, `unzip`, `tar`, `ast-grep`/`sg`, common language servers if detectable.
7. Effective harness profile settings once added:
   - `steeringMode`
   - `interruptMode`
   - `compactionStrategy`
8. Actionable remediation: exact next command or setting to change.

## Output format

Return compact markdown:

```md
# Starter Kit Doctor

## Summary
- Status: ok/warn/error
- Missing critical: ...

## Active capabilities
| Capability | Status | Notes |
...

## Recommended fixes
1. ...
```

## Technical notes

- Must be read-only.
- Must not install anything automatically.
- Must not fail hard if optional tools are missing.
- Use Node stdlib where possible.
- Keep output concise but complete.
- The registered tool description must tell the LLM: “Use this when you need to know which starter-kit capabilities are available.”

## Files likely touched

- `extensions/starter-kit-doctor/index.ts`
- `templates/settings.template.json`
- `README.md`
- `docs/architecture.md` or a new docs section if needed
- `package.json` only if dependencies are necessary; prefer no new dependency.

## Acceptance criteria

- Running the tool in this repo reports current extensions/skills/settings.
- Missing optional tools are warnings, not errors.
- LLM-facing tool description includes purpose, use cases, limits, and safety behavior.
- TypeScript check passes for the new extension.
