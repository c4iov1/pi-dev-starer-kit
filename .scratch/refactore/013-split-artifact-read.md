# Issue 013: Split artifact-read into Handler Modules

**Priority**: P2 — Medium Impact / Medium Risk  
**Phase**: 4 (Architecture)  
**Estimated Effort**: 6-8 hours  
**Confidence**: Medium  
**Depends On**: [001-extract-path-utils.md](./001-extract-path-utils.md), [005-test-artifact-read.md](./005-test-artifact-read.md)

---

## Problem Statement

The artifact-read extension is a 1076-line monolith that mixes multiple concerns:

- File type detection (L60-105)
- Directory handling (L155-220)
- CSV parsing (L225-290)
- JSON/JSONL parsing (L295-360)
- SQLite handling (L365-550)
- Archive handling (L555-750)
- Tool registration and routing (L950-1076)

**Problems**:
- Hard to navigate (1076 lines in one file)
- Hard to test (must test entire extension to test one handler)
- Hard to extend (adding PDF support requires modifying the monolith)
- Violates single-responsibility principle
- High cognitive load for contributors

---

## Acceptance Criteria

- [x] Create `extensions/artifact-read/handlers/` directory
- [x] Split directory handling into `handlers/directory.ts`
- [x] Split CSV handling into `handlers/csv.ts`
- [x] Split JSON/JSONL handling into `handlers/json.ts`
- [x] Split SQLite handling into `handlers/sqlite.ts`
- [x] Split archive handling into `handlers/archive.ts`
- [x] Create `utils/detect-type.ts` for file type detection
- [x] Create `utils/format.ts` for output formatting
- [x] Refactor `index.ts` to only handle tool registration and routing (<100 lines)
- [x] All existing tests still pass
- [x] No circular dependencies between modules

---

## Files to Modify

### New Files
- `extensions/artifact-read/handlers/directory.ts`
- `extensions/artifact-read/handlers/csv.ts`
- `extensions/artifact-read/handlers/json.ts`
- `extensions/artifact-read/handlers/sqlite.ts`
- `extensions/artifact-read/handlers/archive.ts`
- `extensions/artifact-read/utils/detect-type.ts`
- `extensions/artifact-read/utils/format.ts`

### Modified Files
- `extensions/artifact-read/index.ts` — Reduce to ~100 lines (registration + routing)

---

## Implementation Approach

### 1. Design Module Structure

```
extensions/artifact-read/
  index.ts              # Tool registration + routing (~100 lines)
  handlers/
    directory.ts        # Directory listing (~100 lines)
    csv.ts              # CSV parsing (~100 lines)
    json.ts             # JSON/JSONL parsing (~100 lines)
    sqlite.ts           # SQLite queries (~200 lines)
    archive.ts          # Archive extraction (~200 lines)
  utils/
    detect-type.ts      # File type detection (~50 lines)
    format.ts           # Output formatting (~50 lines)
  types.ts              # Shared types (~50 lines)
```

### 2. Extract Shared Types

```typescript
// extensions/artifact-read/types.ts

export type ReadMode = 'summary' | 'schema' | 'sample' | 'query' | 'list' | 'extract-preview';

export interface ArtifactReadParams {
  path: string;
  mode?: ReadMode;
  table?: string;
  query?: string;
  limit?: number;
  offset?: number;
  where?: string;
  order?: string;
}

export interface ArtifactReadResult {
  ok: boolean;
  detectedType: string;
  mode: ReadMode;
  output: string;
  suggestion?: string;
}

export type FileType = 
  | 'directory'
  | 'csv'
  | 'json'
  | 'jsonl'
  | 'sqlite'
  | 'zip'
  | 'tar'
  | 'tar-gz'
  | 'unknown';
```

### 3. Extract Utility Functions

```typescript
// extensions/artifact-read/utils/detect-type.ts

import { extname, basename } from 'node:path';
import { readFileSync } from 'node:fs';
import { MAGIC_BYTES_LENGTH } from '../../shared/constants';
import type { FileType } from '../types';

/**
 * Detects the file type based on extension and magic bytes.
 * 
 * @param filePath - Absolute path to the file
 * @param isDir - Whether the path is a directory
 * @param isFile - Whether the path is a regular file
 * @returns Detected file type
 */
export function detectType(filePath: string, isDir: boolean, isFile: boolean): FileType {
  if (isDir) return 'directory';

  const ext = extname(filePath).toLowerCase();
  const name = basename(filePath).toLowerCase();

  // SQLite: db, sqlite, sqlite3 extensions OR magic bytes
  if (['.db', '.sqlite', '.sqlite3'].includes(ext)) return 'sqlite';

  // Tar variants
  if (name.endsWith('.tar.gz') || name.endsWith('.tgz')) return 'tar-gz';
  if (ext === '.tar') return 'tar';
  if (ext === '.zip') return 'zip';

  // Data files
  if (ext === '.csv') return 'csv';
  if (ext === '.jsonl') return 'jsonl';
  if (ext === '.json') return 'json';

  // Try to detect SQLite by magic bytes
  if (isFile) {
    try {
      const header = readFileSync(filePath, { encoding: null, flag: 'r' }).subarray(0, MAGIC_BYTES_LENGTH);
      const magic = header.toString('utf-8', 0, MAGIC_BYTES_LENGTH);
      if (magic.startsWith('SQLite format 3')) return 'sqlite';
    } catch {
      // Not readable as binary, ignore
    }
  }

  return 'unknown';
}
```

```typescript
// extensions/artifact-read/utils/format.ts

/**
 * Formats byte size into human-readable string.
 * 
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatSize(bytes: number): string {
  if (bytes < 0) return 'unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Trims output to maximum number of lines.
 * 
 * @param text - Text to trim
 * @param maxLines - Maximum number of lines
 * @returns Trimmed text with truncation message if needed
 */
export function trimOutput(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  const truncated = lines.slice(0, maxLines);
  truncated.push(`\n... (truncated to ${maxLines} lines. Use limit/offset for pagination.)`);
  return truncated.join('\n');
}
```

### 4. Extract Handlers

```typescript
// extensions/artifact-read/handlers/directory.ts

import { readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { MAX_DIRECTORY_ENTRIES } from '../../shared/constants';
import { formatSize } from '../utils/format';
import type { ArtifactReadResult, ReadMode } from '../types';

/**
 * Handles directory listing and summary.
 * 
 * @param dirPath - Absolute path to directory
 * @param mode - Read mode (summary, list, schema)
 * @param limit - Maximum entries to return
 * @returns Result with directory listing
 */
export function handleDirectory(dirPath: string, mode: ReadMode, limit: number): ArtifactReadResult {
  if (mode === 'query' || mode === 'extract-preview') {
    return {
      ok: false,
      detectedType: 'directory',
      mode,
      output: `Mode "${mode}" is not supported for directories.`,
      suggestion: 'Use "summary", "list", or "schema" for directories.',
    };
  }

  try {
    const entries = readdirSync(dirPath);
    const files: { name: string; size: number; isDir: boolean }[] = [];

    for (const entry of entries.slice(0, MAX_DIRECTORY_ENTRIES)) {
      try {
        const fullPath = join(dirPath, entry);
        const st = statSync(fullPath);
        files.push({ name: entry, size: st.size, isDir: st.isDirectory() });
      } catch {
        files.push({ name: entry, size: -1, isDir: false });
      }
    }

    files.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const totalFiles = files.filter((f) => !f.isDir).length;
    const totalDirs = files.filter((f) => f.isDir).length;
    const totalSize = files.reduce((sum, f) => sum + Math.max(0, f.size), 0);

    if (mode === 'summary') {
      const typeCounts: Record<string, number> = {};
      for (const f of files) {
        if (f.isDir) continue;
        const ext = extname(f.name).toLowerCase() || '(no ext)';
        typeCounts[ext] = (typeCounts[ext] ?? 0) + 1;
      }
      const topTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const lines = [
        `Directory: ${dirPath}`,
        `Contents: ${entries.length} entries (${totalDirs} dirs, ${totalFiles} files)`,
        `Total size: ${formatSize(totalSize)}`,
        '',
        'Top file types:',
        ...topTypes.map(([ext, count]) => `  ${ext}: ${count}`),
      ];

      return {
        ok: true,
        detectedType: 'directory',
        mode,
        output: lines.join('\n'),
      };
    }

    // mode === 'list' or 'schema'
    const lines = files.slice(0, limit).map((f) => {
      const type = f.isDir ? 'dir ' : 'file';
      const size = f.isDir ? '' : formatSize(f.size).padStart(10);
      return `${type} ${size} ${f.name}`;
    });

    return {
      ok: true,
      detectedType: 'directory',
      mode,
      output: lines.join('\n'),
    };
  } catch (err) {
    return {
      ok: false,
      detectedType: 'directory',
      mode,
      output: `Error reading directory: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
```

```typescript
// extensions/artifact-read/handlers/sqlite.ts

import { spawnSync } from 'node:child_process';
import { ExtensionError, ErrorCodes } from '../../shared/errors';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../shared/constants';
import type { ArtifactReadResult, ReadMode } from '../types';

/**
 * Handles SQLite database queries and schema inspection.
 * 
 * @param dbPath - Absolute path to SQLite database
 * @param mode - Read mode (schema, sample, query, list)
 * @param table - Table name (for schema/sample/query modes)
 * @param query - SQL query (for query mode, must be read-only)
 * @param limit - Maximum rows to return
 * @param offset - Row offset for pagination
 * @param where - WHERE clause (for table queries)
 * @param order - ORDER BY clause (for table queries)
 * @param cwd - Current working directory
 * @returns Result with query output
 * 
 * @throws {ExtensionError} SQLITE_QUERY_NOT_READONLY - Write query attempted
 * @throws {ExtensionError} SQLITE_EXECUTION_FAILED - Query execution failed
 */
export function handleSqlite(
  dbPath: string,
  mode: ReadMode,
  table: string | undefined,
  query: string | undefined,
  limit: number,
  offset: number,
  where: string | undefined,
  order: string | undefined,
  cwd: string
): ArtifactReadResult {
  const effectiveLimit = Math.min(limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  if (mode === 'list') {
    const result = spawnSync('sqlite3', [dbPath, '.tables'], {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    });

    if (result.error || result.status !== 0) {
      throw new ExtensionError(
        ErrorCodes.SQLITE_EXECUTION_FAILED,
        `Failed to list tables: ${result.error?.message || result.stderr}`,
        'Ensure sqlite3 is installed and the database file is valid.'
      );
    }

    return {
      ok: true,
      detectedType: 'sqlite',
      mode,
      output: `Tables in ${dbPath}:\n${result.stdout}`,
    };
  }

  if (mode === 'schema') {
    if (!table) {
      throw new ExtensionError(
        ErrorCodes.INVALID_ARGUMENT,
        'Table name is required for schema mode.',
        'Specify the table parameter, e.g., { mode: "schema", table: "users" }'
      );
    }

    const result = spawnSync('sqlite3', [dbPath, `.schema ${table}`], {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    });

    if (result.error || result.status !== 0) {
      throw new ExtensionError(
        ErrorCodes.SQLITE_EXECUTION_FAILED,
        `Failed to get schema: ${result.error?.message || result.stderr}`,
        'Ensure the table exists and sqlite3 is installed.'
      );
    }

    return {
      ok: true,
      detectedType: 'sqlite',
      mode,
      output: `Schema for table ${table}:\n${result.stdout}`,
    };
  }

  if (mode === 'sample') {
    if (!table) {
      throw new ExtensionError(
        ErrorCodes.INVALID_ARGUMENT,
        'Table name is required for sample mode.',
        'Specify the table parameter, e.g., { mode: "sample", table: "users" }'
      );
    }

    const sql = `SELECT * FROM ${table} LIMIT ${effectiveLimit} OFFSET ${offset};`;
    const result = spawnSync('sqlite3', ['-header', '-column', dbPath, sql], {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    });

    if (result.error || result.status !== 0) {
      throw new ExtensionError(
        ErrorCodes.SQLITE_EXECUTION_FAILED,
        `Failed to sample table: ${result.error?.message || result.stderr}`,
        'Ensure the table exists and sqlite3 is installed.'
      );
    }

    return {
      ok: true,
      detectedType: 'sqlite',
      mode,
      output: `Sample from table ${table} (limit ${effectiveLimit}, offset ${offset}):\n${result.stdout}`,
    };
  }

  if (mode === 'query') {
    if (!query) {
      throw new ExtensionError(
        ErrorCodes.INVALID_ARGUMENT,
        'Query is required for query mode.',
        'Specify the query parameter, e.g., { mode: "query", query: "SELECT * FROM users" }'
      );
    }

    // Enforce read-only queries
    const normalizedQuery = query.trim().toUpperCase();
    if (
      normalizedQuery.includes('INSERT') ||
      normalizedQuery.includes('UPDATE') ||
      normalizedQuery.includes('DELETE') ||
      normalizedQuery.includes('DROP') ||
      normalizedQuery.includes('ALTER') ||
      normalizedQuery.includes('CREATE')
    ) {
      throw new ExtensionError(
        ErrorCodes.SQLITE_QUERY_NOT_READONLY,
        'Write queries are not allowed.',
        'Only SELECT and PRAGMA queries are permitted.'
      );
    }

    const result = spawnSync('sqlite3', ['-header', '-column', dbPath, query], {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    });

    if (result.error || result.status !== 0) {
      throw new ExtensionError(
        ErrorCodes.SQLITE_EXECUTION_FAILED,
        `Query execution failed: ${result.error?.message || result.stderr}`,
        'Check your SQL syntax and ensure the query is read-only.'
      );
    }

    return {
      ok: true,
      detectedType: 'sqlite',
      mode,
      output: result.stdout || '(no results)',
    };
  }

  return {
    ok: false,
    detectedType: 'sqlite',
    mode,
    output: `Mode "${mode}" is not supported for SQLite databases.`,
    suggestion: 'Use "schema", "sample", "query", or "list" modes.',
  };
}
```

### 5. Refactor index.ts

```typescript
// extensions/artifact-read/index.ts (reduced to ~100 lines)

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from '@sinclair/typebox';
import { existsSync, statSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { confineToWorkspace } from '../shared/path-utils';
import { ExtensionError, errorResult } from '../shared/errors';
import { ErrorCodes } from '../shared/errors';
import { detectType } from './utils/detect-type';
import { handleDirectory } from './handlers/directory';
import { handleCsv } from './handlers/csv';
import { handleJson, handleJsonl } from './handlers/json';
import { handleSqlite } from './handlers/sqlite';
import { handleArchive } from './handlers/archive';
import type { ArtifactReadParams, ArtifactReadResult } from './types';

function handleArtifactRead(params: ArtifactReadParams, cwd: string): ArtifactReadResult {
  const { resolved, safe } = confineToWorkspace(params.path, cwd);

  if (!safe) {
    throw new ExtensionError(
      ErrorCodes.PATH_OUTSIDE_WORKSPACE,
      `Path "${params.path}" escapes workspace root.`,
      'Only files inside the project workspace can be read.'
    );
  }

  if (!existsSync(resolved)) {
    throw new ExtensionError(
      ErrorCodes.PATH_NOT_FOUND,
      `Path "${params.path}" does not exist.`,
      'Check the path and try again.'
    );
  }

  const st = statSync(resolved);
  const fileType = detectType(resolved, st.isDirectory(), st.isFile());
  const mode = params.mode ?? 'summary';
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  switch (fileType) {
    case 'directory':
      return handleDirectory(resolved, mode, limit);
    case 'csv':
      return handleCsv(resolved, mode, limit);
    case 'json':
      return handleJson(resolved, mode, limit);
    case 'jsonl':
      return handleJsonl(resolved, mode, limit);
    case 'sqlite':
      return handleSqlite(resolved, mode, params.table, params.query, limit, offset, params.where, params.order, cwd);
    case 'zip':
    case 'tar':
    case 'tar-gz':
      return handleArchive(resolved, mode, fileType, limit, cwd);
    default:
      throw new ExtensionError(
        ErrorCodes.FILE_TYPE_UNSUPPORTED,
        `Unsupported file type: ${fileType}. File: ${basename(resolved)}`,
        'artifact_read supports: directories, CSV, JSON, JSONL, SQLite, and archives (zip, tar, tar.gz). Use `read` for regular source files.'
      );
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: 'artifact_read',
    label: 'Artifact Read',
    description: 'Universal read-only tool for structured artifacts...',
    promptSnippet: 'artifact_read(path, mode?, table?, query?, limit?)',
    promptGuidelines: [...],
    parameters: Type.Object({
      path: Type.String({ description: 'Path to the artifact...' }),
      // ... other parameters
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd ?? process.cwd();
      
      try {
        const result = handleArtifactRead(params as ArtifactReadParams, cwd);
        return {
          content: [{ type: 'text' as const, text: result.output }],
          details: { ok: result.ok, detectedType: result.detectedType, mode: result.mode },
        };
      } catch (err) {
        if (err instanceof ExtensionError) {
          const errorRes = errorResult(err);
          return {
            content: [{ type: 'text' as const, text: errorRes.output }],
            details: errorRes,
          };
        }
        throw err;
      }
    },
  });
}
```

---

## Testing Strategy

1. **Unit tests**: Test each handler in isolation
2. **Integration tests**: Verify index.ts routes correctly
3. **Regression tests**: Run existing artifact-read tests
4. **Circular dependency check**: Use `madge` to verify no cycles

---

## Risk Assessment

**Risk Level**: Medium

**Mitigations**:
- Requires test coverage from issue 005 first
- Keep the same public API (tool registration)
- Test each handler independently before integrating
- Use `madge` to detect circular dependencies

**Potential Issues**:
- Circular dependencies between handlers and utils
- Shared state between handlers (should be avoided)
- Breaking changes to internal APIs (not a problem if tests pass)

---

## Success Metrics

- ✅ index.ts reduced to <100 lines
- ✅ Each handler is <200 lines
- ✅ No circular dependencies
- ✅ All tests pass
- ✅ Easy to add new file types (e.g., PDF)

---

## References

- `REFACTORING_REVIEW.md` — Section 1.5, 2.2
- `extensions/artifact-read/index.ts` — Current monolith
- madge (circular dependency detector): https://www.npmjs.com/package/madge
