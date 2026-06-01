# Issue 009: Standardize Error Handling Across Extensions

**Priority**: P3 — Medium Impact / Low Risk  
**Phase**: 3 (Code Quality)  
**Estimated Effort**: 4-5 hours  
**Confidence**: High  
**Depends On**: [001-extract-path-utils.md](./001-extract-path-utils.md), [002-extract-settings-loader.md](./002-extract-settings-loader.md)

---

## Problem Statement

Error handling is inconsistent across extensions:

1. **artifact-read**: Returns `{ ok: false, output: "error message", suggestion: "..." }`
2. **permission-gate**: Throws exceptions or returns `{ block: true, reason: "..." }`
3. **lsp-bridge**: Returns `{ success: false, message: "..." }` or throws
4. **loop-protection**: Uses `try/catch` with empty blocks
5. **starter-kit-doctor**: Returns markdown-formatted error messages

**Inconsistencies**:
- Some extensions throw exceptions, others return error objects
- Error messages vary in format and detail
- Some use `try/catch` with empty `catch {}` blocks (silencing errors)
- No standard error codes for programmatic handling
- Suggestions/hints are sometimes included, sometimes not

This makes it hard to:
- Write consistent error handling in the UI
- Test error conditions
- Debug issues in production
- Provide helpful error messages to users

---

## Acceptance Criteria

- [x] Create `extensions/shared/errors.ts` with standard error types
- [x] Define `ExtensionError` class with code, message, and suggestion
- [x] Define `formatError()` function for consistent output
- [x] Update artifact-read to use standard errors
- [x] Update permission-gate to use standard errors
- [x] Update lsp-bridge to use standard errors
- [x] Update loop-protection to use standard errors
- [x] Update starter-kit-doctor to use standard errors
- [x] Remove empty `catch {}` blocks (replace with proper error handling)
- [x] Add tests for error formatting
- [x] Document error handling guidelines in `docs/`

---

## Files to Modify

### New Files
- `extensions/shared/errors.ts` — Standard error types and formatting
- `tests/shared/errors.test.ts` — Unit tests for error formatting

### Modified Files
- `extensions/artifact-read/index.ts` — Use standard errors
- `extensions/permission-gate/index.ts` — Use standard errors
- `extensions/lsp-bridge/index.ts` — Use standard errors
- `extensions/loop-protection/index.ts` — Use standard errors
- `extensions/starter-kit-doctor/index.ts` — Use standard errors
- `extensions/contrib-gate/index.ts` — Use standard errors (if applicable)
- `extensions/auto-memory/index.ts` — Use standard errors (if applicable)
- `docs/architecture.md` — Add error handling section

---

## Implementation Approach

### 1. Define Standard Error Types

```typescript
// extensions/shared/errors.ts

/**
 * Standard error class for Pi.dev Starter Kit extensions.
 * 
 * All extensions should throw ExtensionError (or subclasses) for
 * predictable error handling. The error includes:
 * - code: Machine-readable error code (e.g., 'PATH_OUTSIDE_WORKSPACE')
 * - message: Human-readable error description
 * - suggestion: Optional hint for how to fix the issue
 */
export class ExtensionError extends Error {
  constructor(
    public code: string,
    message: string,
    public suggestion?: string
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

/**
 * Common error codes used across extensions.
 */
export const ErrorCodes = {
  // Path errors
  PATH_OUTSIDE_WORKSPACE: 'PATH_OUTSIDE_WORKSPACE',
  PATH_NOT_FOUND: 'PATH_NOT_FOUND',
  PATH_PROTECTED: 'PATH_PROTECTED',
  
  // Permission errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_MODE_INVALID: 'PERMISSION_MODE_INVALID',
  
  // Settings errors
  SETTINGS_NOT_FOUND: 'SETTINGS_NOT_FOUND',
  SETTINGS_INVALID: 'SETTINGS_INVALID',
  
  // Tool errors
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED: 'TOOL_EXECUTION_FAILED',
  
  // File type errors
  FILE_TYPE_UNSUPPORTED: 'FILE_TYPE_UNSUPPORTED',
  FILE_TYPE_UNKNOWN: 'FILE_TYPE_UNKNOWN',
  
  // SQLite errors
  SQLITE_QUERY_NOT_READONLY: 'SQLITE_QUERY_NOT_READONLY',
  SQLITE_EXECUTION_FAILED: 'SQLITE_EXECUTION_FAILED',
  
  // LSP errors
  LSP_NOT_AVAILABLE: 'LSP_NOT_AVAILABLE',
  LSP_OPERATION_FAILED: 'LSP_OPERATION_FAILED',
  
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

### 2. Define Error Formatting

```typescript
/**
 * Formats an ExtensionError for display to the user.
 * 
 * Output format:
 * ```
 * [ERROR_CODE] Error message
 * 
 * Suggestion: How to fix it
 * ```
 * 
 * @param err - The error to format
 * @returns Formatted error string
 */
export function formatError(err: ExtensionError): string {
  let output = `[${err.code}] ${err.message}`;
  
  if (err.suggestion) {
    output += `\n\nSuggestion: ${err.suggestion}`;
  }
  
  return output;
}

/**
 * Creates a structured error result for tool responses.
 * 
 * @param err - The error to convert
 * @returns Error result object with ok=false
 */
export function errorResult(err: ExtensionError): {
  ok: false;
  error: { code: string; message: string; suggestion?: string };
  output: string;
} {
  return {
    ok: false,
    error: {
      code: err.code,
      message: err.message,
      suggestion: err.suggestion,
    },
    output: formatError(err),
  };
}

/**
 * Wraps a function to catch errors and convert them to ExtensionError.
 * 
 * @param fn - Function to wrap
 * @param defaultCode - Default error code if error is not ExtensionError
 * @returns Wrapped function that never throws
 */
export function withErrorHandling<T>(
  fn: () => T,
  defaultCode: ErrorCode = ErrorCodes.UNKNOWN_ERROR
): { success: true; result: T } | { success: false; error: ExtensionError } {
  try {
    return { success: true, result: fn() };
  } catch (err) {
    if (err instanceof ExtensionError) {
      return { success: false, error: err };
    }
    
    // Wrap unknown errors
    const message = err instanceof Error ? err.message : String(err);
    return { 
      success: false, 
      error: new ExtensionError(defaultCode, message) 
    };
  }
}
```

### 3. Write Tests

```typescript
// tests/shared/errors.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  ExtensionError, 
  ErrorCodes, 
  formatError, 
  errorResult,
  withErrorHandling 
} from '../../extensions/shared/errors';

test('ExtensionError', async (t) => {
  await t.test('creates error with code and message', () => {
    const err = new ExtensionError('TEST_ERROR', 'Test message');
    assert.equal(err.code, 'TEST_ERROR');
    assert.equal(err.message, 'Test message');
    assert.equal(err.suggestion, undefined);
  });
  
  await t.test('creates error with suggestion', () => {
    const err = new ExtensionError('TEST_ERROR', 'Test message', 'Try this');
    assert.equal(err.suggestion, 'Try this');
  });
  
  await t.test('is instance of Error', () => {
    const err = new ExtensionError('TEST_ERROR', 'Test');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof ExtensionError);
  });
});

test('formatError', async (t) => {
  await t.test('formats error without suggestion', () => {
    const err = new ExtensionError('TEST_ERROR', 'Test message');
    const output = formatError(err);
    assert.equal(output, '[TEST_ERROR] Test message');
  });
  
  await t.test('formats error with suggestion', () => {
    const err = new ExtensionError('TEST_ERROR', 'Test message', 'Try this');
    const output = formatError(err);
    assert.equal(output, '[TEST_ERROR] Test message\n\nSuggestion: Try this');
  });
});

test('errorResult', async (t) => {
  await t.test('creates structured error result', () => {
    const err = new ExtensionError('TEST_ERROR', 'Test message', 'Try this');
    const result = errorResult(err);
    
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'TEST_ERROR');
    assert.equal(result.error.message, 'Test message');
    assert.equal(result.error.suggestion, 'Try this');
    assert.match(result.output, /\[TEST_ERROR\]/);
  });
});

test('withErrorHandling', async (t) => {
  await t.test('returns success for successful function', () => {
    const result = withErrorHandling(() => 42);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.result, 42);
    }
  });
  
  await t.test('catches ExtensionError', () => {
    const result = withErrorHandling(() => {
      throw new ExtensionError('TEST_ERROR', 'Test');
    });
    
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'TEST_ERROR');
    }
  });
  
  await t.test('wraps unknown errors', () => {
    const result = withErrorHandling(() => {
      throw new Error('Unknown error');
    }, ErrorCodes.UNKNOWN_ERROR);
    
    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'UNKNOWN_ERROR');
      assert.match(result.error.message, /Unknown error/);
    }
  });
});
```

### 4. Refactor Extensions

**artifact-read/index.ts**:
```typescript
// Before
function handleArtifactRead(params: ArtifactReadParams, cwd: string): ArtifactReadResult {
  const { resolved, safe } = resolveWorkspacePath(params.path, cwd);
  
  if (!safe) {
    return errResult(
      "unknown",
      params.mode ?? "summary",
      `Path "${params.path}" escapes workspace root.`,
      "Only files inside the project workspace can be read.",
    );
  }
  // ...
}

// After
import { ExtensionError, ErrorCodes, errorResult } from '../shared/errors';

function handleArtifactRead(params: ArtifactReadParams, cwd: string): ArtifactReadResult {
  const { resolved, safe } = confineToWorkspace(params.path, cwd);
  
  if (!safe) {
    throw new ExtensionError(
      ErrorCodes.PATH_OUTSIDE_WORKSPACE,
      `Path "${params.path}" escapes workspace root.`,
      "Only files inside the project workspace can be read."
    );
  }
  // ...
}

// In tool execute():
try {
  const result = handleArtifactRead(params, cwd);
  return { content: [{ type: 'text', text: result.output }], details: result };
} catch (err) {
  if (err instanceof ExtensionError) {
    const errorRes = errorResult(err);
    return { content: [{ type: 'text', text: errorRes.output }], details: errorRes };
  }
  throw err;
}
```

**permission-gate/index.ts**:
```typescript
// Before
function checkPathConfinement(toolName: string, params: Record<string, unknown>, workspaceRoot: string): BlockResult | null {
  // ...
  if (!isInsideWorkspace(resolvedPath, normalizedWorkspace)) {
    return {
      blocked: true,
      reason: `Path "${rawPath}" is outside the workspace root.`,
    };
  }
  // ...
}

// After
import { ExtensionError, ErrorCodes } from '../shared/errors';

function checkPathConfinement(toolName: string, params: Record<string, unknown>, workspaceRoot: string): void {
  // ...
  if (!isInsideWorkspace(resolvedPath, normalizedWorkspace)) {
    throw new ExtensionError(
      ErrorCodes.PATH_OUTSIDE_WORKSPACE,
      `Path "${rawPath}" is outside the workspace root.`,
      "All file operations must be within the project workspace."
    );
  }
  // ...
}

// In handleToolCall():
try {
  checkPathConfinement(toolName, params, workspaceRoot);
  // ...
} catch (err) {
  if (err instanceof ExtensionError) {
    return { block: true, reason: formatError(err) };
  }
  throw err;
}
```

### 5. Document Error Handling

Add to `docs/architecture.md`:

```markdown
## Error Handling

All extensions should use the standard `ExtensionError` class from `extensions/shared/errors.ts`.

### Throwing Errors

```typescript
import { ExtensionError, ErrorCodes } from '../shared/errors';

throw new ExtensionError(
  ErrorCodes.PATH_OUTSIDE_WORKSPACE,
  'Path "../etc/passwd" is outside the workspace.',
  'All file operations must be within the project workspace.'
);
```

### Catching Errors

```typescript
import { ExtensionError, formatError } from '../shared/errors';

try {
  // ... operation
} catch (err) {
  if (err instanceof ExtensionError) {
    return { block: true, reason: formatError(err) };
  }
  throw err; // Re-throw unknown errors
}
```

### Error Codes

Use predefined error codes from `ErrorCodes` when possible:
- `PATH_OUTSIDE_WORKSPACE` — Path traversal attempt
- `PERMISSION_DENIED` — Permission check failed
- `FILE_TYPE_UNSUPPORTED` — Unsupported file type
- `SQLITE_QUERY_NOT_READONLY` — Write query in read-only context

### Guidelines

1. **Always include a suggestion** when the error is user-fixable
2. **Use specific error codes** for programmatic handling
3. **Never use empty `catch {}` blocks** — always log or handle errors
4. **Wrap unknown errors** with `withErrorHandling()` helper
```

---

## Testing Strategy

1. **Unit tests**: Test error creation, formatting, and result conversion
2. **Integration tests**: Verify extensions use standard errors correctly
3. **Edge cases**: Unknown errors, missing suggestions, nested errors

---

## Risk Assessment

**Risk Level**: Low

**Mitigations**:
- Additive refactoring (new error types, gradual migration)
- Keep backward compatibility during migration
- Test each extension after refactoring

**Potential Issues**:
- Some extensions may have complex error handling logic
- May need to update tests that check error messages

---

## Success Metrics

- ✅ All extensions use `ExtensionError`
- ✅ Consistent error format across extensions
- ✅ No empty `catch {}` blocks
- ✅ Error handling documented

---

## References

- `REFACTORING_REVIEW.md` — Section 3.1
- `extensions/artifact-read/index.ts` — Current error handling
- `extensions/permission-gate/index.ts` — Current error handling
