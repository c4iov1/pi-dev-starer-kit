# 003 — RTK commands and doctor integration

**Status**: done
**Type**: AFK

## Parent

PRD: `docs/prd.md`
Architecture: `docs/architecture.md`

## What to build

Expose lightweight Pi commands/tools for RTK visibility, especially token savings.

The user needs to check `rtk gain` from inside Pi and see how many tokens RTK saved.

## Required command behavior

Add slash commands to the `rtk-rewrite` extension:

```text
/rtk-status
/rtk-gain
/rtk-toggle
```

Recommended semantics:

- `/rtk-status`
  - shows whether starter-kit RTK rewrite is enabled;
  - shows whether `rtk` is installed and version;
  - shows whether rewrite hook is active in this Pi session;
  - shows configured timeout/debug values.

- `/rtk-gain`
  - runs `rtk gain` and displays output;
  - accept optional raw args if Pi command API supports it, e.g. `/rtk-gain --history`, `/rtk-gain --project`;
  - must fail open/read-only: no project file writes.

- `/rtk-toggle`
  - toggles rewrite for the current Pi process/session only;
  - does not edit `.pi/settings.json` unless a separate explicit persist flag is implemented;
  - should clearly say how to disable permanently: set `starterKit.rtkRewrite.enabled=false`.

Also update `starter-kit-doctor` to report:

- RTK binary availability;
- RTK version;
- `starterKit.rtkRewrite.enabled` effective value;
- whether `rtk gain` is callable;
- any obvious setup issue.

## Optional tool

If useful, register a small read-only tool:

```text
rtk_gain
```

But prefer slash commands unless there is a clear agent workflow need. Avoid increasing tool surface unnecessarily.

## Security and UX requirements

- Use `pi.exec("rtk", ["gain", ...args])`; do not interpolate arbitrary shell.
- Keep output concise. If `rtk gain --history` is very long, consider documenting/adding a limit later.
- Do not leak command history unless the user explicitly runs `/rtk-gain --history`.
- `rtk gain` is informational; it must not be routed through `rtk rewrite`.

## Acceptance criteria

- [x] `/rtk-status` shows enabled state and RTK version or missing-binary warning.
- [x] `/rtk-gain` runs `rtk gain` and returns token-savings output.
- [x] `/rtk-toggle` can disable/enable rewrites for the current session.
- [x] `starter_kit_doctor` includes RTK rewrite diagnostics.
- [x] All command execution uses `pi.exec` with argument arrays.
- [x] Missing RTK produces a helpful message and does not break Pi.

## Blocked by

- #002 Extension: rtk-rewrite.
