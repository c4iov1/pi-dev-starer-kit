# 007 — Extension: lsp-bridge

**Status**: completed
**Type**: AFK

## Parent

PRD: `docs/plans/pi-dev-starter-kit-prd.md`

## What to build

A Pi.dev extension that provides LSP-powered type error feedback after every edit — equivalent to Claude Code's LSP tool and Cursor's post-edit type error surfacing. This is one of the three gaps identified against Claude Code/Codex that the starter kit must fill.

The extension must:
- Auto-detect the project's type-checker: `tsc --noEmit` for TypeScript, `pyright` for Python, `cargo check` for Rust, `go vet` for Go
- Run incremental type-check on modified files after each `edit` tool call
- Inject type errors into context with file:line references, truncated to first 10 errors
- Be configurable via `.pi/settings.json` (`starterKit.autoTypeCheck: true/false`)
- Handle the case where no type-checker is configured (silently skip)

Unlike the `post-edit-lint` extension (#004) which focuses on formatting/style, this extension focuses on type errors and compilation errors.

The type-check output should be concise. If clean, a brief "Type check: OK" is sufficient. If errors exist, show file:line:column with the error message.

## Acceptance criteria

- [x] After an `edit` on a `.ts` file with `tsc` available, type-check runs
- [x] Type errors appear in context with file:line references
- [x] If type-check is clean, confirms "Type check: OK"
- [x] If no type-checker is available, silently skips
- [x] `starterKit.autoTypeCheck: false` disables the hook
- [x] Works with at least TypeScript and Python

## Blocked by

- #001 (package scaffold must exist)
- #003 (permission-gate — edits must be approved before type-check runs)

## Further notes

Consider using the LSP protocol directly via `vscode-languageserver` for richer diagnostics, but a CLI-based approach (`tsc --noEmit`, `pyright`) is sufficient for v1 and avoids LSP server lifecycle management complexity.
