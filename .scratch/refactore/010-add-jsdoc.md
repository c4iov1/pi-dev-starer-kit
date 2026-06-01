# Issue 010: Add JSDoc Comments to Public Functions

**Priority**: P3 — Low Impact / Low Risk  
**Phase**: 3 (Code Quality)  
**Estimated Effort**: 6-8 hours  
**Confidence**: High

---

## Problem Statement

Most public functions across the 15 extensions lack JSDoc comments. For example:

- `handleArtifactRead()` (artifact-read, L925) — No documentation of parameters, return values, or edge cases
- `confineToWorkspace()` (shared, to be created) — Will need comprehensive docs
- `checkPathConfinement()` (permission-gate, L393) — No explanation of the pipeline stage
- `detectTypeChecker()` (lsp-bridge, L70) — No documentation of language support
- `loadSettings()` (multiple extensions) — No documentation of error handling

**Impact**:
- Hard to understand function purpose without reading implementation
- IDE tooltips show no information
- Difficult to generate API documentation
- New contributors struggle to understand the codebase
- Edge cases and invariants are not documented

---

## Acceptance Criteria

- [x] Add JSDoc to all exported functions in `extensions/shared/`
- [x] Add JSDoc to all public functions in `extensions/artifact-read/`
- [x] Add JSDoc to all public functions in `extensions/permission-gate/`
- [x] Add JSDoc to all public functions in `extensions/lsp-bridge/`
- [x] Add JSDoc to all public functions in `extensions/loop-protection/`
- [x] Add JSDoc to all public functions in `extensions/starter-kit-doctor/`
- [x] Include `@param`, `@returns`, `@throws`, `@example` where appropriate
- [x] Document edge cases and invariants in function descriptions
- [x] Verify JSDoc renders correctly in VS Code tooltips

---

## Files to Modify

### Modified Files
- `extensions/shared/path-utils.ts` (from issue 001)
- `extensions/shared/settings.ts` (from issue 002)
- `extensions/shared/errors.ts` (from issue 009)
- `extensions/artifact-read/index.ts`
- `extensions/permission-gate/index.ts`
- `extensions/lsp-bridge/index.ts`
- `extensions/loop-protection/index.ts`
- `extensions/starter-kit-doctor/index.ts`
- `extensions/source-navigation/index.ts`
- `extensions/ast-tools/index.ts`
- `extensions/auto-memory/index.ts`
- `extensions/contrib-gate/index.ts`
- `extensions/monitor-bash/index.ts`
- `extensions/post-edit-lint/index.ts`
- `extensions/task-tracker/index.ts`
- `extensions/rtk-rewrite/index.ts`
- `extensions/setup-ai-memory/index.ts`
- `extensions/init-starter-kit/index.ts`

---

## Implementation Approach

### 1. JSDoc Template

Use this template for all public functions:

```typescript
/**
 * Brief one-line description of what the function does.
 * 
 * Optional longer description with more context, edge cases,
 * or implementation details. Use this section to explain
 * non-obvious behavior or invariants.
 * 
 * @param paramName - Description of the parameter
 * @param optionalParam - Description (optional)
 * @returns Description of the return value
 * 
 * @throws {ExtensionError} When condition X occurs
 * @throws {Error} When condition Y occurs
 * 
 * @example
 * ```typescript
 * const result = functionName('arg1', 'arg2');
 * console.log(result);
 * ```
 * 
 * @see RelatedFunction - Link to related functions
 */
```

### 2. Examples by Extension

**extensions/shared/path-utils.ts**:

```typescript
/**
 * Confines a path to the workspace root, preventing directory traversal attacks.
 * 
 * This function resolves the raw path relative to the workspace root and checks
 * that the resolved path does not escape the workspace. It handles:
 * - Relative paths (`src/index.ts`)
 * - Absolute paths inside workspace (`/project/src/index.ts`)
 * - Directory traversal attempts (`../etc/passwd`)
 * - Empty strings (resolves to workspace root)
 * 
 * **Security**: This is the primary defense against path traversal attacks.
 * All file operations must use this function before accessing the filesystem.
 * 
 * @param rawPath - User-provided path (relative or absolute)
 * @param workspaceRoot - Absolute path to workspace root
 * @returns Object with resolved absolute path and safety flag
 * 
 * @example
 * ```typescript
 * // Safe path
 * const { resolved, safe } = confineToWorkspace('src/index.ts', '/project');
 * // resolved: '/project/src/index.ts', safe: true
 * 
 * // Path traversal attempt
 * const { resolved, safe } = confineToWorkspace('../etc/passwd', '/project');
 * // resolved: '/etc/passwd', safe: false
 * ```
 * 
 * @see isInsideWorkspace - Simpler boolean check
 */
export function confineToWorkspace(
  rawPath: string,
  workspaceRoot: string
): { resolved: string; safe: boolean } {
  // ...
}
```

**extensions/artifact-read/index.ts**:

```typescript
/**
 * Reads an artifact file or directory and returns structured output.
 * 
 * Supports multiple artifact types:
 * - **Directories**: Lists contents with file sizes and types
 * - **CSV**: Parses and displays tabular data
 * - **JSON/JSONL**: Parses and displays structured data
 * - **SQLite**: Executes read-only queries
 * - **Archives**: Lists contents without extraction
 * 
 * **Security**: 
 * - Path must be within workspace (uses `confineToWorkspace`)
 * - SQLite queries must be read-only (SELECT, PRAGMA)
 * - Archive extraction is preview-only (no files written)
 * 
 * @param params - Tool parameters
 * @param params.path - Path to artifact (relative to workspace)
 * @param params.mode - Read mode (summary, schema, sample, query, list, extract-preview)
 * @param params.table - SQLite table name (for schema/sample/query modes)
 * @param params.query - SQL query (for query mode, must be read-only)
 * @param params.limit - Maximum rows/entries to return (default 50, max 200)
 * @param params.offset - Row offset for pagination (default 0)
 * @param cwd - Current working directory (workspace root)
 * 
 * @returns Result object with detected type, mode, and formatted output
 * 
 * @throws {ExtensionError} PATH_OUTSIDE_WORKSPACE - Path escapes workspace
 * @throws {ExtensionError} PATH_NOT_FOUND - File or directory does not exist
 * @throws {ExtensionError} FILE_TYPE_UNSUPPORTED - File type not supported
 * @throws {ExtensionError} SQLITE_QUERY_NOT_READONLY - Write query attempted
 * 
 * @example
 * ```typescript
 * // Read CSV summary
 * const result = handleArtifactRead(
 *   { path: 'data/users.csv', mode: 'summary' },
 *   '/project'
 * );
 * console.log(result.output);
 * // Output: "CSV file: data/users.csv\nRows: 1000\nColumns: 5 (id, name, email, ...)"
 * 
 * // Query SQLite database
 * const result = handleArtifactRead(
 *   { path: 'db.sqlite', mode: 'query', query: 'SELECT * FROM users LIMIT 10' },
 *   '/project'
 * );
 * ```
 */
function handleArtifactRead(params: ArtifactReadParams, cwd: string): ArtifactReadResult {
  // ...
}
```

**extensions/permission-gate/index.ts**:

```typescript
/**
 * Checks if a tool call violates protected path rules.
 * 
 * Protected paths include:
 * - `.env` files (environment variables)
 * - `secrets.json`, `credentials.yaml` (secret files)
 * - `.ssh/` directory (SSH keys)
 * - `.aws/` directory (AWS credentials)
 * - `.gnupg/` directory (GPG keys)
 * 
 * This is **Stage 1** of the 5-stage permission pipeline. It runs before
 * all other checks and always blocks, regardless of permission mode.
 * 
 * @param toolName - Name of the tool being called (e.g., 'write', 'edit', 'bash')
 * @param params - Tool parameters (e.g., `{ path: '.env', content: '...' }`)
 * 
 * @returns Block result if protected path is accessed, null otherwise
 * 
 * @example
 * ```typescript
 * // Blocks write to .env
 * const result = handleProtectedPaths('write', { path: '.env', content: 'SECRET=value' });
 * // result: { blocked: true, reason: '[PATH_PROTECTED] .env is a protected file...' }
 * 
 * // Allows write to regular file
 * const result = handleProtectedPaths('write', { path: 'src/index.ts', content: '...' });
 * // result: null
 * ```
 * 
 * @see checkPathConfinement - Stage 3: workspace confinement
 * @see handleDenyRules - Stage 2: static deny rules
 */
function handleProtectedPaths(
  toolName: string,
  params: Record<string, unknown>
): BlockResult | null {
  // ...
}
```

**extensions/lsp-bridge/index.ts**:

```typescript
/**
 * Detects the appropriate type-checker for a file based on its extension and project configuration.
 * 
 * Supported languages:
 * - **TypeScript/JavaScript**: Uses `tsc --noEmit` if `tsconfig.json` exists
 * - **Python**: Uses `pyright` (must be installed)
 * - **Rust**: Uses `cargo check` if `Cargo.toml` exists
 * - **Go**: Uses `go vet` if `go.mod` exists
 * 
 * @param filePath - Absolute path to the file to type-check
 * 
 * @returns Checker configuration with command and args, or null if no checker is available
 * 
 * @example
 * ```typescript
 * // TypeScript project
 * const checker = detectTypeChecker('/project/src/index.ts');
 * // checker: { command: 'npx', args: ['tsc', '--noEmit'] }
 * 
 * // Python file
 * const checker = detectTypeChecker('/project/script.py');
 * // checker: { command: 'npx', args: ['pyright', '/project/script.py'] }
 * 
 * // Unsupported language
 * const checker = detectTypeChecker('/project/main.java');
 * // checker: null
 * ```
 * 
 * @see runTypeCheck - Executes the type-checker
 */
function detectTypeChecker(filePath: string): CheckerConfig | null {
  // ...
}
```

### 3. Documentation Checklist

For each function, ensure:

- **Brief description**: One-line summary at the top
- **Detailed description**: Context, edge cases, invariants (if needed)
- **@param**: All parameters documented with types and descriptions
- **@returns**: Return value documented (or `void` if none)
- **@throws**: All thrown exceptions documented with conditions
- **@example**: At least one usage example with expected output
- **@see**: Links to related functions (if applicable)
- **Security notes**: Security implications documented (if applicable)

### 4. Tools for Verification

Use these tools to verify JSDoc quality:

```bash
# Check JSDoc syntax
npx jsdoc --pedantic extensions/

# Generate HTML documentation (optional)
npx jsdoc -c jsdoc.json extensions/

# Verify VS Code tooltips
# Open a file and hover over a function to see the tooltip
```

---

## Testing Strategy

1. **Manual verification**: Open files in VS Code and verify tooltips
2. **Automated checks**: Use `tsc --noEmit` to catch JSDoc syntax errors
3. **Documentation generation**: Optionally generate HTML docs with JSDoc

---

## Risk Assessment

**Risk Level**: None

**Mitigations**:
- Purely additive (no code changes)
- Cannot break existing functionality

**Potential Issues**:
- Time-consuming for large codebase
- May discover undocumented edge cases (good!)

---

## Success Metrics

- ✅ All public functions have JSDoc
- ✅ VS Code tooltips show helpful information
- ✅ Examples compile and run correctly
- ✅ Security implications documented

---

## References

- `REFACTORING_REVIEW.md` — Section 3.3
- JSDoc documentation: https://jsdoc.app/
- TypeScript JSDoc support: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
