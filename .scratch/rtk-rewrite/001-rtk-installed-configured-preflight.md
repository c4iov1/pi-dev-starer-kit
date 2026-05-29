# 001 — RTK rewrite: installed/configured preflight

**Status**: done
**Type**: AFK

## Parent

PRD: `docs/prd.md`
Architecture: `docs/architecture.md`

## What to build

Before implementing the starter-kit RTK rewrite extension, verify the local RTK binary is installed, usable, and has the required command-rewrite behavior.

This project should not install RTK from scratch. It should detect RTK availability and document the expected setup/smoke checks.

## Required checks

Run and capture practical behavior for:

```bash
rtk --version
rtk rewrite "git status"
rtk rewrite "ls -la"
rtk rewrite "find . -type f"
rtk rewrite "grep -R \"foo\" ."
rtk rewrite "echo hello"
rtk init --agent pi --dry-run -v
```

## Expected findings to preserve in docs/tests

- RTK must be available in `PATH`.
- `rtk rewrite` may return exit code `3` for usable rewrites; treat `0` and `3` as rewrite success.
- Exit code `1` means no rewrite; command must pass through unchanged.
- Missing RTK, timeout, invalid output, empty output, or exceptions must fail open.
- `rtk init --agent pi` installs RTK's own Pi hook, but this starter kit should not require users to run it. Our package-level extension should make RTK rewriting active by default whenever the starter kit is installed and `starterKit.rtkRewrite.enabled !== false`.

## Acceptance criteria

- [x] RTK local version and rewrite behavior are recorded in implementation notes or docs.
- [x] The plan confirms no `rtk init --agent pi` step is required for starter-kit users.
- [x] The extension design uses RTK only as an executable dependency, not a vendored library.
- [x] The extension can disable itself safely if RTK is unavailable or too old.

## Implementation notes

Preflight observed locally:

- `rtk --version` → `rtk 0.42.0`, exit `0`.
- `rtk rewrite "git status"` → `rtk git status`, exit `3`.
- `rtk rewrite "ls -la"` → `rtk ls -la`, exit `3`.
- `rtk rewrite "find . -type f"` → `rtk find . -type f`, exit `3`.
- `rtk rewrite "grep -R \"foo\" ."` → `rtk grep -R "foo" .`, exit `3`.
- `rtk rewrite "echo hello"` → empty stdout, exit `1` (pass-through).
- `rtk init --agent pi --dry-run -v` would create `.pi/extensions/rtk.ts`; starter-kit users do not need that because `extensions/rtk-rewrite/index.ts` provides the package-level integration.

The starter-kit extension uses `rtk` only through `pi.exec("rtk", [...])` and fails open when RTK is missing, too old/unknown, times out, or returns non-rewrite output.

## Blocked by

None.
