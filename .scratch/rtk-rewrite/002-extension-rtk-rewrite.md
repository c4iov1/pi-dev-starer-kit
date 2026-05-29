# 002 — Extension: rtk-rewrite

**Status**: done
**Type**: AFK

## Parent

PRD: `docs/prd.md`
Architecture: `docs/architecture.md`

## What to build

Create a package-level Pi.dev extension that transparently rewrites Pi agent `bash` tool calls through RTK before execution.

Location:

```text
extensions/rtk-rewrite/index.ts
```

The extension must be thin: all rewrite decisions come from `rtk rewrite`, not local TypeScript rewrite rules.

## Required behavior

Flow:

1. Pi agent requests a `bash` tool call.
2. Existing permission-gate/security checks must run before RTK rewrite.
3. The RTK extension receives only commands that passed permission checks.
4. The extension calls:

   ```bash
   rtk rewrite "<original command>"
   ```

5. If RTK returns a usable rewritten command, mutate `event.input.command` to the rewritten command.
6. Otherwise leave the original command unchanged.

## Ordering requirement

The extension must be designed and registered so `permission-gate` runs first and `rtk-rewrite` runs after it.

Rationale: destructive or sensitive commands should be evaluated before being transformed into `rtk ...` form. RTK is optimization, not security.

Implementation notes:

- Keep `permission-gate` before `rtk-rewrite` in package/resource loading order if Pi event order follows extension discovery order.
- Add a regression/smoke note to verify permission-gate still blocks dangerous commands before RTK sees them.
- Do not move permission logic into RTK.

## Fail-open behavior

Run the original command unchanged if:

- RTK is missing from `PATH`;
- RTK version check fails;
- `rtk rewrite` times out;
- `rtk rewrite` exits with an unsupported code;
- stdout is empty;
- stdout equals the original command;
- command is already `rtk ...`;
- an opt-out env var is present;
- any exception occurs.

## Exit-code behavior

Treat these as rewrite success if stdout is non-empty and differs from original:

- `0`
- `3`

Treat these as pass-through:

- `1` — no rewrite
- `2` — deny/no auto rewrite
- anything else

## Opt-out behavior

Support both process-level and per-command opt-outs:

```bash
RTK_DISABLE_REWRITE=1
RTK_DISABLED=1
RTK_DISABLE_REWRITE=1 git status
RTK_DISABLED=1 ls -la
```

Truthy values should include at least: `1`, `true`, `yes`, `on`.

## Scope

V1 should intercept only Pi agent `bash` tool calls.

Do not intercept `user_bash` in V1. This avoids touching user `!` / `!!` commands and preserves context-excluded command semantics. If support is added later, it must skip `event.excludeFromContext === true`.

## Default enablement

The extension should be active by default for every project when the starter kit package is installed globally.

Disable only when:

```json
{
  "starterKit": {
    "rtkRewrite": {
      "enabled": false
    }
  }
}
```

## Acceptance criteria

- [x] `extensions/rtk-rewrite/index.ts` exists and imports current Pi APIs from `@earendil-works/pi-coding-agent`.
- [x] Uses `pi.on("tool_call", ...)` and `isToolCallEventType("bash", event)`.
- [x] Uses `pi.exec("rtk", ["rewrite", command], ...)`, not shell interpolation.
- [x] Accepts exit codes `0` and `3` as rewrite success.
- [x] Fails open for all error paths.
- [x] Supports `RTK_DISABLE_REWRITE` and `RTK_DISABLED` opt-outs.
- [x] Does not intercept `user_bash` / `!!` in V1.
- [x] Keeps permission-gate first and RTK rewrite second.
- [x] Adds minimal debug logging without leaking full command contents by default.

## Blocked by

- #001 RTK installed/configured preflight.
