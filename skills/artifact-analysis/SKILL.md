---
name: artifact-analysis
description: Structured inspection of data artifacts (SQLite, CSV/JSON/JSONL, archives, directories). Teaches workflows for exploring database schemas, sampling data files, and browsing archive contents safely.
---

# Artifact Analysis Skill

## Philosophy

**Core Principle**: Inspect structured artifacts before acting on them. The agent should understand the shape of data files, database schemas, and archive contents before executing queries or extractions. Use `artifact_read` for structured inspection instead of fragile shell scripts or raw `read`.

## When to Activate

Activate this skill when:
- The task involves database migration, data validation, or SQL analysis.
- You need to understand the structure of CSV/JSON/JSONL data files.
- You're inspecting archive contents (zip, tar, tar.gz).
- You need an overview of a large directory structure.
- The user asks about "what's in this database?" or "what columns does this CSV have?"

## Workflow

### 1. Start with summary mode
Always begin with `artifact_read(path, mode="summary")` to get an overview:
- Directory: total files, types, sizes.
- SQLite: table list, page count, size.
- CSV/JSON/JSONL: row count, column list, file size.
- Archive: entry count, archive type, size.

### 2. Explore schema
Use `artifact_read(path, mode="schema")` to understand structure:
- SQLite: full CREATE TABLE statements.
- CSV: column names.
- JSONL: all keys found across lines.
- JSON: keys or first-item keys.

### 3. Sample data
Use `artifact_read(path, mode="sample", limit=N)` to see actual data:
- Start with small limits (5-10 rows).
- Increase only when you need more context.
- Use `offset` for pagination on larger datasets.

### 4. Query SQLite safely
For SQLite, use `mode="query"` with explicit SQL:
```json
{
  "path": "data.db",
  "mode": "query",
  "query": "SELECT name, COUNT(*) FROM users GROUP BY role ORDER BY COUNT(*) DESC LIMIT 10"
}
```
Or use table-based query with WHERE/ORDER BY/LIMIT:
```json
{
  "path": "data.db",
  "mode": "query",
  "table": "users",
  "where": "active = 1",
  "order": "created_at DESC",
  "limit": 20
}
```

### 5. Archive inspection
For archives, use:
- `mode="list"` to see all entries.
- `mode="extract-preview"` to see content of text files within.

## Safety Rules

- Never use `bash` with `sqlite3` directly — use `artifact_read`.
- Never `read` an entire CSV/JSON file — use `artifact_read` with sampling.
- Never extract archives to the workspace with `unzip`/`tar` — use `artifact_read` for preview.
- Respect `limit` — `artifact_read` caps at 200 rows. Use pagination for larger datasets.
- All reads are path-confined to workspace root.

## Anti-patterns

- ❌ Dumping entire database with `sqlite3 .dump` via `bash`.
- ❌ `cat`-ing a 50MB CSV to check the first 3 rows.
- ❌ Extracting an entire archive to inspect one config file.
- ❌ Running SQL without understanding the schema first.
