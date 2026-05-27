---
name: structural-refactor
description: Workflow for structural refactoring using AST and LSP tools. Covers codemods with ast_grep/ast_edit, LSP-first rename/references, and when to prefer each approach.
---

# Structural Refactor Skill

## Philosophy

**Core Principle**: Use the right tool for the right layer of abstraction. Text-based search (`grep`) finds surface strings. AST-based search (`ast_grep`) finds structural patterns without false positives. LSP (`lsp_rename`, `lsp_references`) understands semantics — scope, types, and real references. Never use a lower-level tool when a higher-level one is available.

## When to Activate

Activate this skill when:
- Renaming a symbol (function, variable, class, type) across the codebase.
- Finding all references to a function, type, or variable.
- Applying a codemod — changing a pattern in multiple files.
- Refactoring imports, function signatures, or class hierarchies.
- Updating API call patterns or decorator usage.

## Tool Selection Guide

| Task | Preferred Tool | Why |
|---|---|---|
| Rename a symbol | `lsp_rename` | Understands scope, renames all references correctly |
| Find all callers of function X | `lsp_references` | Semantic — real call sites, not text matches |
| Go to definition | `lsp_definition` | Jumps to the true source, not a re-export |
| Find all `useEffect` hooks | `ast_grep` | Structural pattern across the AST |
| Change `useEffect(fn, [])` to `useOnMount(fn)` | `ast_edit` | Pattern-based codemod |
| Find text "TODO" in comments | `grep` | Text search is sufficient |
| Find all `.map()` calls | `ast_grep` | Avoids matching "map" in strings/comments |
| Find workspace-level symbols | `lsp_workspace_symbols` | Symbol index across project |
| Change import path from "old-lib" to "new-lib" | `ast_edit` | Batch rewrite import declarations |

## Workflow

### 1. Understand the scope
Before any refactor, understand what you're changing:
- Use `lsp_references` to count call sites.
- Use `ast_grep` to find similar patterns that may also need updating.
- Use `grep` as a fallback sanity check: "does any file reference this by name?"

### 2. Plan the approach
- **Simple rename (1 symbol)**: Use `lsp_rename`.
- **Pattern change (N files)**: Use `ast_edit` dry-run first, review, then apply.
- **Mixed**: Run LSP rename for symbol, then AST cleanup for related patterns.

### 3. Preview with dry-run
Always run `ast_edit` with `dryRun=true` (the default):
```json
{
  "pattern": "$$.useEffect($$$BODY, [])",
  "replacement": "$$.useOnMount($$$BODY)",
  "language": "typescript",
  "dryRun": true
}
```
Review every file in the diff output before proceeding.

### 4. Apply and verify
After applying edits:
- Run the test suite: `npm test` or equivalent.
- Run the linter: `npx biome check` or equivalent.
- Check for unused imports that may remain after the refactor.

## ast_grep Pattern Syntax

### Matching function calls
```
$$.foo($A, $B)          // any expression calling .foo() with 2 args
$$$.foo($$$$)           // any call to .foo() with any args
```

### Matching declarations
```
function $NAME($$$): $RET { $$$ }    // any function declaration
const $NAME = ($$$) => { $$$ }      // arrow function declaration
```

### Matching imports
```
import { $$$ } from '$LIB'
import $DEFAULT from '$LIB'
```

### Matching JSX
```
<$TAG $ATTRS={$$$}>$$$CHILDREN</$TAG>
<$COMP {...$$$} />
```

## LSP Tools Guide

| Tool | Input | Example |
|---|---|---|
| `lsp_definition` | file + position | `{ file: "src/app.ts", line: 42, col: 10 }` |
| `lsp_references` | file + position | `{ file: "src/app.ts", line: 42, col: 10 }` |
| `lsp_rename` | file + position + new name | `{ file: "src/app.ts", line: 42, col: 10, newName: "newFunctionName", dryRun: true }` |
| `lsp_workspace_symbols` | query string | `{ query: "useAuth" }` |

## Safety Rules

- Always dry-run `ast_edit` before applying.
- Always dry-run `lsp_rename` before applying.
- Run tests after any refactor.
- If LSP tools are unavailable (no language server detected), use `ast_grep` for search and manual `edit` for changes.
- Non-dry-run `ast_edit` goes through the permission pipeline — the user must approve each file change.

## Anti-patterns

- ❌ Using `grep` + manual `edit` for renaming a symbol used in 50 files.
- ❌ Using `ast_edit` without dry-run first.
- ❌ Using `ast_grep` for simple text search — use `grep`.
- ❌ Skipping tests after a refactor because "it's a simple change."
- ❌ Assuming the refactor is correct because the diff looks right — run the test suite.
