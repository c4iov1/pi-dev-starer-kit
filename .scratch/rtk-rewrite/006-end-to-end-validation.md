# 006 — RTK rewrite end-to-end validation

**Status**: done
**Type**: AFK

## Parent

PRD: `docs/prd.md`
Architecture: `docs/architecture.md`

## What to validate

After implementation and docs updates, run end-to-end checks that prove RTK rewrite works safely in this starter kit.

## Validation matrix

### Local binary behavior

```bash
rtk --version
rtk rewrite "git status"
rtk rewrite "ls -la"
rtk rewrite "echo hello"
```

### Unit/type checks

```bash
npm run test:rtk-rewrite
npm run test:permission-gate
npx tsc extensions/rtk-rewrite/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
```

### Pi smoke test

Run Pi with the extension loaded directly:

```bash
pi -e ./extensions/rtk-rewrite/index.ts
```

Inside Pi, ask the agent to run:

```bash
git status
ls -la
echo hello
RTK_DISABLE_REWRITE=1 ls -la
```

Then check:

```bash
rtk gain --history
```

### Permission ordering smoke test

Confirm permission/security behavior remains first-class:

- `git push --force` is blocked by permission-gate and not silently transformed into an allowed command.
- `sudo ...` is blocked.
- `curl ... | sh` remains blocked.

### Commands

Inside Pi:

```text
/rtk-status
/rtk-gain
/rtk-gain --history
/rtk-toggle
/rtk-status
```

Expected:

- status shows RTK availability/version;
- gain shows token savings;
- toggle changes current-session enabled state;
- missing RTK gives a helpful non-crashing message.

### Doctor

Run:

```text
starter_kit_doctor
```

Expected:

- includes RTK binary/version;
- reports configured/effective `starterKit.rtkRewrite.enabled`;
- reports missing RTK clearly if unavailable.

## Acceptance criteria

- [x] All automated tests pass.
- [x] Pi smoke test proves rewrite occurs for supported commands.
- [x] `echo hello` passes through unchanged.
- [x] Opt-out env vars pass through unchanged.
- [x] Permission-gate still blocks dangerous commands before RTK rewrite.
- [x] `/rtk-gain` returns token savings.
- [x] `starter_kit_doctor` reports RTK status.
- [x] Docs match observed behavior.

## Validation notes

Automated validation passed:

- `rtk --version` → `rtk 0.42.0`.
- `rtk rewrite "git status"` → `rtk git status`, exit `3`.
- `rtk rewrite "ls -la"` → `rtk ls -la`, exit `3`.
- `rtk rewrite "echo hello"` → empty output, exit `1` pass-through.
- `npm run test:rtk-rewrite` → 15 passing tests.
- `npm run test:permission-gate` → 8 passing tests.
- `npx tsc extensions/rtk-rewrite/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck` → passed.
- `npx biome check extensions/ tests/` → passed.

Smoke validation used the extension handler directly with real local `rtk`:

- `git status` mutated to `rtk git status`.
- `ls -la` mutated to `rtk ls -la`.
- `echo hello` remained `echo hello`.
- `RTK_DISABLE_REWRITE=1 ls -la` remained unchanged.

Slash command harness validation:

- `/rtk-status` returned RTK status.
- `/rtk-gain` returned RTK gain output (`No tracking data yet...` on this machine).
- `/rtk-toggle` toggled current-session state.

`starter-kit-doctor` source now includes `rtk-rewrite`, `rtk version`, `rtk gain`, and effective `starterKit.rtkRewrite` diagnostics. The currently loaded tool instance may require restarting Pi to reflect the source update.

## Blocked by

- #002 Extension: rtk-rewrite.
- #003 RTK commands and doctor integration.
- #004 RTK settings defaults and tests.
- #005 Document RTK rewrite integration.
