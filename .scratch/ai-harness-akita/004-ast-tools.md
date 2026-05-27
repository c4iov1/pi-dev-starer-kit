# 004 — Implement `ast-tools` extension

Status: ready-for-agent
Priority: P1
Type: extension + skill guidance

## Why

Akita praises AST tools for structural code search and codemods. They avoid false positives in strings/comments and are useful for imports, function calls, declarations, and repeated metavariables.

## Deliverable

Create `extensions/ast-tools/index.ts` registering:

- `ast_grep`
- `ast_edit`

Wrap the `ast-grep` CLI (`sg` or `ast-grep`) if available. If not available, return a clear install hint instead of failing obscurely.

## `ast_grep` requirements

Input example:

```ts
{
  pattern: string,
  language?: string,
  paths?: string[],
  limit?: number
}
```

Output:

- file path
- range/line numbers
- matched snippet
- language if known
- truncated flag if output limit reached

## `ast_edit` requirements

Input example:

```ts
{
  pattern: string,
  replacement: string,
  language?: string,
  paths?: string[],
  dryRun?: boolean
}
```

Rules:

- Default `dryRun: true`.
- Non-dry-run must go through existing permission pipeline or use safe edit primitives.
- Show patch preview before applying.
- Do not silently rewrite many files.

## Skill guidance

Create `skills/structural-refactor/SKILL.md` or add to existing refactor docs. It must explain:

- Use `ast_grep` for structural search.
- Use `ast_edit` dry-run before codemods.
- Prefer LSP rename for symbol rename when available.
- Run tests/lint after codemods.

## LLM-facing description

Tool descriptions must explicitly say:

- Use AST for structure, not text.
- Prefer grep for simple text search.
- Prefer LSP for semantic rename/references.
- `ast_edit` is dry-run by default and permission-gated for writes.

## Acceptance criteria

- If `ast-grep` exists, `ast_grep` returns matches for a simple pattern.
- If missing, doctor/tool returns actionable install guidance.
- `ast_edit` previews changes without applying by default.
- SYSTEM routing mentions AST tools.
- TypeScript check passes.
