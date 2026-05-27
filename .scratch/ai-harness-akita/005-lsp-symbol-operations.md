# 005 — Upgrade `lsp-bridge` with symbol operations

Status: ready-for-agent
Priority: P1
Type: extension upgrade

## Why

Akita praises aggressive LSP routing for source navigation and safer refactors. The current `lsp-bridge` is mostly diagnostics/type-check oriented. We need symbol-aware tools.

## Deliverable

Extend `extensions/lsp-bridge/index.ts` or add helper modules to register:

- `lsp_definition`
- `lsp_references`
- `lsp_rename`
- `lsp_workspace_symbols`

## Functional requirements

### `lsp_definition`

Input:

```ts
{ file: string, line: number, character: number }
```

Output: target file/range/snippet.

### `lsp_references`

Input:

```ts
{ file: string, line: number, character: number, includeDeclaration?: boolean }
```

Output: list of references with paths/ranges/snippets, paginated/truncated.

### `lsp_rename`

Input:

```ts
{ file: string, line: number, character: number, newName: string, dryRun?: boolean }
```

Rules:

- Default dry-run true.
- Show workspace edit preview.
- Non-dry-run must go through permission pipeline.

### `lsp_workspace_symbols`

Input:

```ts
{ query: string, limit?: number }
```

Output: symbol list.

## Detection/degradation

- Detect project language and available language server.
- If no server available, return clear message and fallback suggestion (`grep`, `ast_grep`, install server).
- Do not block normal diagnostics behavior.

## LLM-facing description

Descriptions must say:

- Use for definitions, references, rename, workspace symbols.
- Prefer LSP rename over AST/textual rename when supported.
- Dry-run default for writes.

## Acceptance criteria

- Existing type-check/diagnostics behavior still works.
- Tools fail gracefully when no LSP server is configured.
- Doctor can report LSP availability.
- TypeScript check passes.
