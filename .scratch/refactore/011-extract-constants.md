# Issue 011: Extract Magic Numbers into Constants

**Priority**: P3 — Low Impact / Low Risk  
**Phase**: 3 (Code Quality)  
**Estimated Effort**: 2-3 hours  
**Confidence**: High

---

## Problem Statement

Magic numbers are scattered throughout the codebase:

- `Math.min(params.limit ?? 50, 200)` in artifact-read (L950) — Why 50? Why 200?
- `slice(0, 500)` for directory entries in artifact-read (L165) — Why 500?
- `subarray(0, 16)` for SQLite magic bytes in artifact-read (L97) — Why 16?
- `timeoutMs: 2000` in settings template — Why 2 seconds?
- `maxLines: 1000` in various places — Why 1000?

**Problems**:
- No explanation of why specific values were chosen
- Hard to tune limits without searching the codebase
- Inconsistent limits across extensions
- Difficult to make limits configurable in the future

---

## Acceptance Criteria

- [x] Create `extensions/shared/constants.ts` with named constants
- [x] Define constants for all magic numbers found
- [x] Add JSDoc explaining why each value was chosen
- [x] Update artifact-read to use constants
- [x] Update permission-gate to use constants
- [x] Update lsp-bridge to use constants
- [x] Update loop-protection to use constants
- [x] Update settings template to reference constants
- [x] Document constants in `docs/architecture.md`

---

## Files to Modify

### New Files
- `extensions/shared/constants.ts` — Named constants with documentation

### Modified Files
- `extensions/artifact-read/index.ts` — Use constants
- `extensions/permission-gate/index.ts` — Use constants
- `extensions/lsp-bridge/index.ts` — Use constants
- `extensions/loop-protection/index.ts` — Use constants
- `extensions/source-navigation/index.ts` — Use constants
- `templates/settings.template.json` — Reference constants in comments

---

## Implementation Approach

### 1. Define Constants

```typescript
// extensions/shared/constants.ts

/**
 * Shared constants for Pi.dev Starter Kit extensions.
 * 
 * These constants define limits, defaults, and thresholds used across
 * multiple extensions. Each constant includes documentation explaining
 * why the value was chosen.
 */

// ---------------------------------------------------------------------------
// Pagination & Output Limits
// ---------------------------------------------------------------------------

/**
 * Default number of rows/entries to return in paginated responses.
 * 
 * Chosen to provide useful context without overwhelming the model's
 * context window. 50 rows is typically enough to understand data shape.
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Maximum number of rows/entries that can be requested.
 * 
 * Prevents excessive context usage. 200 rows at ~100 bytes each = ~20KB,
 * which is reasonable for a single tool response.
 */
export const MAX_PAGE_SIZE = 200;

/**
 * Maximum number of directory entries to list.
 * 
 * Large directories (e.g., node_modules) can have 100,000+ entries.
 * 500 entries provides a good overview without excessive output.
 */
export const MAX_DIRECTORY_ENTRIES = 500;

/**
 * Maximum number of lines to include in tool output.
 * 
 * Prevents context overflow. 1000 lines at ~80 chars each = ~80KB,
 * which is near the upper limit for a single tool response.
 */
export const MAX_OUTPUT_LINES = 1000;

// ---------------------------------------------------------------------------
// File Type Detection
// ---------------------------------------------------------------------------

/**
 * Number of bytes to read for file type detection via magic bytes.
 * 
 * SQLite magic bytes are "SQLite format 3\0" (16 bytes).
 * Other formats (PNG, PDF, etc.) also use <=16 bytes.
 */
export const MAGIC_BYTES_LENGTH = 16;

/**
 * Maximum file size to attempt text-based parsing.
 * 
 * Files larger than 10MB are likely binary or logs. Parsing them
 * would be slow and produce excessive output.
 */
export const MAX_TEXT_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ---------------------------------------------------------------------------
// Timeouts
// ---------------------------------------------------------------------------

/**
 * Default timeout for RTK command rewriting (milliseconds).
 * 
 * 2 seconds is enough for most commands. Longer timeouts delay
 * command execution and frustrate users.
 */
export const DEFAULT_RTK_TIMEOUT_MS = 2000;

/**
 * Maximum timeout for any spawned process (milliseconds).
 * 
 * 30 seconds prevents runaway processes from hanging the agent.
 */
export const MAX_PROCESS_TIMEOUT_MS = 30000;

/**
 * Timeout for TypeScript Language Service operations (milliseconds).
 * 
 * LSP operations should be fast. 5 seconds allows for large projects
 * while preventing hangs.
 */
export const LSP_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Loop Protection
// ---------------------------------------------------------------------------

/**
 * Number of consecutive tool-only turns before warning about loops.
 * 
 * 10 turns without user input suggests the agent is stuck in a loop.
 */
export const LOOP_WARNING_THRESHOLD = 10;

/**
 * Number of consecutive edits to the same file before warning.
 * 
 * 5 edits suggests the agent is not making progress.
 */
export const DIMINISHING_RETURNS_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

/**
 * Maximum length of a bash command to analyze.
 * 
 * Very long commands (>10KB) are likely generated or malicious.
 * Analyzing them is slow and may indicate an attack.
 */
export const MAX_COMMAND_LENGTH = 10240; // 10KB

/**
 * Maximum number of paths to extract from a bash command.
 * 
 * Prevents excessive processing of commands with many paths.
 */
export const MAX_PATHS_PER_COMMAND = 100;

// ---------------------------------------------------------------------------
// Archive Handling
// ---------------------------------------------------------------------------

/**
 * Maximum number of entries to list from an archive.
 * 
 * Large archives (e.g., node_modules.tar.gz) can have 100,000+ entries.
 * 1000 entries provides a good overview.
 */
export const MAX_ARCHIVE_ENTRIES = 1000;

/**
 * Maximum size of an archive to attempt preview (bytes).
 * 
 * Archives larger than 1GB are likely too large to preview safely.
 */
export const MAX_ARCHIVE_SIZE = 1024 * 1024 * 1024; // 1GB
```

### 2. Update Extensions

**artifact-read/index.ts**:
```typescript
// Before
const limit = Math.min(params.limit ?? 50, 200);
const entries = readdirSync(dirPath);
for (const entry of entries.slice(0, 500)) {
  // ...
}
const header = readFileSync(filePath, { encoding: null, flag: "r" }).subarray(0, 16);

// After
import { 
  DEFAULT_PAGE_SIZE, 
  MAX_PAGE_SIZE, 
  MAX_DIRECTORY_ENTRIES,
  MAGIC_BYTES_LENGTH 
} from '../shared/constants';

const limit = Math.min(params.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
const entries = readdirSync(dirPath);
for (const entry of entries.slice(0, MAX_DIRECTORY_ENTRIES)) {
  // ...
}
const header = readFileSync(filePath, { encoding: null, flag: "r" }).subarray(0, MAGIC_BYTES_LENGTH);
```

**permission-gate/index.ts**:
```typescript
// Before
if (command.length > 10000) {
  return { blocked: true, reason: "Command too long" };
}

// After
import { MAX_COMMAND_LENGTH } from '../shared/constants';

if (command.length > MAX_COMMAND_LENGTH) {
  return { blocked: true, reason: `Command exceeds maximum length of ${MAX_COMMAND_LENGTH} characters` };
}
```

**loop-protection/index.ts**:
```typescript
// Before
if (fileEditCounts.get(filePath)! >= 5) {
  pendingWarnings.push(`File ${filePath} edited 5 times`);
}

// After
import { DIMINISHING_RETURNS_THRESHOLD } from '../shared/constants';

if (fileEditCounts.get(filePath)! >= DIMINISHING_RETURNS_THRESHOLD) {
  pendingWarnings.push(`File ${filePath} edited ${DIMINISHING_RETURNS_THRESHOLD} times`);
}
```

### 3. Update Settings Template

```json
{
  "rtkRewrite": {
    "timeoutMs": 2000,
    "_timeoutMs_comment": "Timeout for RTK rewriting (ms). See extensions/shared/constants.ts for DEFAULT_RTK_TIMEOUT_MS."
  }
}
```

### 4. Document in Architecture

Add to `docs/architecture.md`:

```markdown
## Constants and Limits

All magic numbers are defined in `extensions/shared/constants.ts` with documentation explaining why each value was chosen.

### Key Constants

- `DEFAULT_PAGE_SIZE` (50) — Default pagination size
- `MAX_PAGE_SIZE` (200) — Maximum pagination size
- `MAX_DIRECTORY_ENTRIES` (500) — Maximum directory listing size
- `MAGIC_BYTES_LENGTH` (16) — Bytes to read for file type detection
- `DEFAULT_RTK_TIMEOUT_MS` (2000) — RTK rewrite timeout

### Tuning Limits

To adjust a limit:
1. Edit the constant in `extensions/shared/constants.ts`
2. Update the JSDoc comment explaining the new value
3. Run tests to verify no regressions
4. Update this documentation

### Making Limits Configurable

In the future, constants could be made configurable via settings:

```typescript
// Future: Load from settings with fallback
const pageSize = settings?.pageSize ?? DEFAULT_PAGE_SIZE;
```
```

---

## Testing Strategy

1. **Unit tests**: Verify constants are used correctly
2. **Integration tests**: Verify limits are enforced
3. **Edge cases**: Test behavior at limit boundaries

---

## Risk Assessment

**Risk Level**: Low

**Mitigations**:
- Pure refactor (no behavior change)
- Constants have same values as magic numbers
- Document rationale for each value

**Potential Issues**:
- May discover inconsistent limits across extensions (good!)
- Some limits may need tuning after extraction

---

## Success Metrics

- ✅ All magic numbers replaced with named constants
- ✅ Each constant has documentation explaining the value
- ✅ Limits are consistent across extensions
- ✅ Easy to find and adjust limits

---

## References

- `REFACTORING_REVIEW.md` — Section 3.4
- `extensions/artifact-read/index.ts` — Magic numbers
- `extensions/permission-gate/index.ts` — Magic numbers
