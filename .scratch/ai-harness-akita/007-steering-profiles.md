# 007 — Add steering, interrupt, and compaction profiles

Status: ready-for-agent
Priority: P2
Type: settings + docs + prompt routing; extension only if Pi supports hooks

## Why

Akita considers steering/interruption mandatory for Agile Vibe Coding. Claude Code is strong here; Pi.dev exposes knobs like `steeringMode`, `interruptMode`, and `compaction.strategy`. Our kit should make these policies explicit.

## Deliverable

Add user-facing profile settings and docs. Enforce via extension only if Pi exposes suitable runtime hooks.

## Settings to add

In `templates/settings.template.json` under `starterKit`:

```json
"steeringMode": "polished-default",
"interruptMode": "safe-steer",
"compactionStrategy": "context-mode-default"
```

Possible values:

### `steeringMode`

- `polished-default`: concise updates, accept user redirection quickly.
- `power-user`: expose more details and options.
- `low-verbosity`: minimize chatter.
- `audit-heavy`: ask for confirmation/evidence more often.

### `interruptMode`

- `safe-steer`: preserve task state and adjust plan.
- `hard-stop`: stop current path and wait.
- `continue-with-note`: continue but record user correction.

### `compactionStrategy`

- `context-mode-default`
- `memory-first`
- `minimal-summary`
- `audit-trail`

## Docs

Create `docs/steering-profiles.md` explaining:

- What each setting means.
- What is currently enforceable vs advisory.
- How it interacts with context-mode and ai-memory.
- Recommended defaults.

## SYSTEM routing

Add a very small note that the active profile should guide verbosity and steering behavior.

## Doctor integration

`starter-kit-doctor` should print active profile settings and warn on unknown values.

## Acceptance criteria

- Settings template includes the profile keys.
- Docs explain all profiles.
- SYSTEM remains lean.
- Doctor reports effective profile settings.
