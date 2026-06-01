# Public API

This document defines the intentional TypeScript export surface for Pi.dev Starter Kit internals. Extensions are loaded by Pi through default exports; named exports are primarily for tests, shared utilities, and future extension authors.

## Stability

- `extensions/shared/*` exports are public utility APIs.
- Extension default exports are Pi extension entry points.
- `permission-gate` stage/helper exports are internal architecture seams unless explicitly listed as public below.
- Test-only exports are stable only for this repository's tests.

## Shared utilities (`extensions/shared/*`)

### `path-utils.ts`

- `isInsideWorkspace(rawPath, workspaceRoot)` — workspace confinement predicate used by security-sensitive extensions.
- `confineToWorkspace(rawPath, workspaceRoot)` — resolve plus confinement result for file tools.

### `settings.ts`

- `StarterKitSettings` — shared starter-kit settings shape.
- `loadSettingsFile(workspaceRoot)` — load complete `.pi/settings.json`.
- `loadSettings(workspaceRoot)` — load `starterKit` settings only.
- `getSetting(settings, path, defaultValue)` — dot-path setting helper.

### `errors.ts`

- `ErrorCodes`, `ErrorCode` — machine-readable error code registry.
- `ExtensionError` and subclasses — standardized extension errors.
- `formatError(err)` — user-facing error formatting.
- `errorResult(err)` — structured `{ ok: false }` payload helper.
- `normalizeError(error)` — convert unknown thrown values into `ExtensionError`.
- `safeExecute()` / `safeExecuteSync()` — catch and normalize thrown errors.

### `constants.ts`

Shared limits/defaults used across extensions, including pagination, artifact process limits, RTK timeout, LSP display limits, and loop-protection thresholds.

## Tested extension helper APIs

These exports are intentionally public within the repository because tests exercise them directly:

### `extensions/permission-gate/index.ts`

- `splitShellWords(command)` — coarse shell tokenizer used by permission-gate tests and shell-path analysis.

### `extensions/loop-protection/index.ts`

- `isToolOnlyAssistantMessage(msg)` — identifies tool-only assistant messages.
- `shouldTrackDiminishingReturns(msg)` — decides whether a message counts toward low-token loop detection.
- `updateDiminishingReturnsState(msg, state, config)` — updates diminishing-return state and returns abort decision.

### `extensions/rtk-rewrite/index.ts`

- `DEFAULT_RTK_REWRITE_SETTINGS`
- `getEffectiveSettings(settings)`
- `hasProcessOptOut(env)`
- `hasCommandOptOut(command)`
- `isAlreadyRtk(command)`
- `shouldSkipRewrite(command, settings, env)`
- `selectRewrite(original, result)`
- `parseRtkVersion(stdout)`
- `isSupportedRtkVersion(stdout)`
- `rewriteCommand(pi, command, settings, signal)`
- `shouldUseRtkAvailability(availability)`
- Types: `RtkRewriteSettings`, `ExecResult`, `RtkAvailability`

## Internal artifact-read module seams

The split artifact reader exports handler and utility modules so `index.ts` can route by type. These are testable architecture seams, not stable external APIs:

- `extensions/artifact-read/types.ts`
- `extensions/artifact-read/handlers/*`
- `extensions/artifact-read/utils/*`

Treat these as `@internal`.

## Internal permission-gate module seams

The following are exported to keep `permission-gate` split into testable modules, but they are not stable external APIs:

- `extensions/permission-gate/types.ts`
- `extensions/permission-gate/helpers.ts`
- `extensions/permission-gate/toggle.ts`
- `extensions/permission-gate/modes/permission-mode.ts`
- `extensions/permission-gate/stages/*`

Treat these as `@internal`. Prefer importing from `extensions/shared/*` for reusable behavior.

## Export audit command

When dependency installation is available, run:

```bash
npx ts-prune
```

Configuration lives in `.ts-prune.json`. Until `ts-prune` is installed as a dev dependency, use this fallback to list exports:

```bash
grep -R "^export \\(function\\|async function\\|class\\|const\\|interface\\|type\\)" -n extensions --include='*.ts' | sort
```

## Removal policy

Do not remove an export unless all are true:

1. It is not listed as public in this document.
2. `grep`, tests, and TypeScript/LSP references show no usage.
3. It is not part of a Pi extension default entry point.
4. The relevant test suite passes after removal.
