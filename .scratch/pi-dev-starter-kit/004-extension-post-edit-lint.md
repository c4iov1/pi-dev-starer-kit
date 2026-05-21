# 004 — Extension: post-edit-lint

**Status**: completed
**Type**: AFK

## Parent

PRD: `docs/plans/pi-dev-starter-kit-prd.md`

## What to build

A Pi.dev extension that hooks into PostToolUse events after every `edit` or `write` tool call and automatically runs the project's linter/formatter. This follows Cursor's pattern of "surfacear erros de lint e tipo para o agente após cada edição" (Reference Doc 4 §5).

The extension must:
- Auto-detect the project's linter: ESLint (`.eslintrc.*`), Biome (`biome.json`), Prettier (`.prettierrc*`), or language-native formatters (`rustfmt`, `gofmt`, `black`)
- Run the linter with `--fix` (or equivalent auto-fix flag) on modified files
- Inject the lint output into the conversation context as a tool result
- Handle the case where no linter is configured (silently skip)
- Handle the case where the linter is not installed (warn once, then skip)
- Be configurable via `.pi/settings.json` (`starterKit.autoLint: true/false`)

The lint output should be concise — if the output is clean, a brief "Lint: OK" is sufficient. If there are errors, only show the first N errors with file:line references.

## Acceptance criteria

- [x] After an `edit` tool call on a `.ts` file with ESLint configured, lint runs and output appears in context
- [x] If lint has errors, they appear with file:line references
- [x] If lint is clean, a brief "Lint: OK" confirmation appears
- [x] If no linter is configured, the hook silently skips
- [x] `starterKit.autoLint: false` disables the hook
- [x] Works with at least ESLint and Biome

## Blocked by

- #001 (package scaffold must exist)
