# 004 — RTK settings defaults and tests

**Status**: done
**Type**: AFK

## Parent

PRD: `docs/prd.md`
Architecture: `docs/architecture.md`

## What to build

Add starter-kit settings support and regression tests for the RTK rewrite extension.

RTK rewrite should be enabled by default for all projects when the starter kit is installed globally. Per-project settings should only be needed to disable or tune it.

## Settings

Update `templates/settings.template.json` with:

```json
{
  "starterKit": {
    "rtkRewrite": {
      "enabled": true,
      "timeoutMs": 2000,
      "debug": false,
      "interceptUserBash": false
    }
  }
}
```

Also add `rtk-rewrite` to default `activeExtensions`.

Important: existing projects without this block should behave as if:

```json
"enabled": true
```

## Tests

Create:

```text
tests/rtk-rewrite.test.ts
```

Test pure helper logic without requiring a real RTK binary where possible.

Suggested coverage:

- settings default to enabled when missing;
- explicit `enabled:false` disables rewrite;
- `RTK_DISABLE_REWRITE` and `RTK_DISABLED` process-level opt-outs;
- `RTK_DISABLE_REWRITE=1 git status` and `RTK_DISABLED=true ls -la` per-command opt-outs;
- already-RTK commands are skipped;
- exit code `0` with non-empty different stdout rewrites;
- exit code `3` with non-empty different stdout rewrites;
- exit code `1` passes through;
- exit code `2` passes through;
- empty stdout passes through;
- identical stdout passes through;
- thrown errors/timeouts pass through.

Add a package script, e.g.:

```json
"test:rtk-rewrite": "tsc extensions/rtk-rewrite/index.ts tests/rtk-rewrite.test.ts --outDir /private/tmp/pi-dev-starter-kit-tests --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck && NODE_PATH=$(pwd)/node_modules node --test /private/tmp/pi-dev-starter-kit-tests/tests/rtk-rewrite.test.js"
```

## Validation commands

```bash
npm run test:rtk-rewrite
npx tsc extensions/rtk-rewrite/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx biome check extensions/ tests/
```

Use available commands if Biome is not installed/configured.

## Acceptance criteria

- [x] Settings default to RTK rewrite enabled.
- [x] Template exposes explicit disable/tuning options.
- [x] `rtk-rewrite` is included in default active extensions.
- [x] Unit tests cover skip/rewrite/fail-open behavior.
- [x] `npm run test:rtk-rewrite` passes.
- [x] TypeScript check passes.

## Blocked by

- #002 Extension: rtk-rewrite.
