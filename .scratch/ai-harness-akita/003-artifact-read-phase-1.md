# 003 — Implement `artifact-read` extension, phase 1

Status: ready-for-agent
Priority: P1
Type: extension + optional skill + settings/docs

## Why

Akita identifies Pi.dev’s universal `read` as its clearest real advantage. It lets the agent inspect SQLite, archives, documents, notebooks, and data files without inventing fragile shell commands or dumping huge outputs into context.

## Deliverable

Create `extensions/artifact-read/index.ts` registering `artifact_read`.

Phase 1 should support:

1. Directories.
2. CSV/JSON/JSONL.
3. SQLite databases.
4. Archives (`.zip`, `.tar`, `.tar.gz`, `.tgz`) if safe support is practical.

Documents/notebooks can be phase 2 if dependency-heavy, but design API should allow them later.

## Tool behavior

`artifact_read` input should support a compact protocol, for example:

```ts
{
  path: string,
  mode?: "summary" | "schema" | "sample" | "query" | "list" | "extract-preview",
  target?: string,
  query?: string,
  limit?: number,
  offset?: number,
  where?: string,
  order?: string
}
```

Alternative URI-like syntax is acceptable if better:

- `file.db`
- `file.db:table`
- `file.db:table:key`
- `file.db:table?limit=50&offset=100`
- `file.db?q=SELECT ...`

## Safety requirements

- Read-only always.
- Path confinement to workspace root.
- For SQLite, only allow read-only SELECT/PRAGMA safe queries.
- Enforce limit/pagination; never return entire huge files.
- Sanitize archive extraction: preview only, no writing outside temp/safe location.
- Clear errors with suggestions.

## LLM-facing tool description must include

- Purpose: read structured artifacts safely.
- Use when: SQLite, CSV/JSON/JSONL, archives, directories, future docs/notebooks.
- Do not use when: simple source file read is enough.
- Output limits/pagination.
- Read-only/path-confined safety.

## Optional skill

Create `skills/artifact-analysis/SKILL.md` if useful. It should teach workflows:

- Inspect database schema before queries.
- Sample before summarizing.
- Use pagination.
- Prefer summaries over raw dumps.

## Files likely touched

- `extensions/artifact-read/index.ts`
- `skills/artifact-analysis/SKILL.md` optional
- `templates/settings.template.json`
- `SYSTEM.md`
- `README.md`
- `package.json` if dependencies are required

## Acceptance criteria

- Agent can inspect a directory summary.
- Agent can inspect CSV/JSON/JSONL shape/sample without huge output.
- Agent can inspect SQLite tables/schema/sample and run safe read-only SELECT.
- Tool description is self-describing for the LLM.
- TypeScript check passes.
