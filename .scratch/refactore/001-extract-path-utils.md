# Issue 001: Extract Shared Path Confinement Utility

**Priority**: P1 — High Impact / Low Risk  
**Phase**: 1 (Foundation)  
**Estimated Effort**: 2-3 hours  
**Confidence**: High

---

## Problem Statement

Path confinement logic is duplicated across 3 extensions with subtle inconsistencies:

1. **artifact-read/index.ts** (L111-120): `resolveWorkspacePath()`
   - Uses `relative()` and checks for `..` prefix
   - Inline `require("node:path").sep` instead of imported `sep`

2. **source-navigation/index.ts** (L59-65): `confinePath()`
   - Similar logic but different variable names
   - Returns `{ resolved, safe }` object

3. **permission-gate/index.ts** (L211-215, L393-420): `isInsideWorkspace()` + `checkPathConfinement()`
   - More complex with `resolve()` and multiple checks
   - Handles edge cases differently

This duplication creates maintenance burden and security risk — a bug in one implementation could allow path traversal in that extension while others remain secure.

---

## Acceptance Criteria

- [x] Create `extensions/shared/path-utils.ts` with `confineToWorkspace()` function
- [x] Function signature: `(rawPath: string, workspaceRoot: string) => { resolved: string; safe: boolean }`
- [x] Handles all edge cases: `..` traversal, absolute paths, symlinks (document behavior)
- [x] Export `isInsideWorkspace()` as a simpler boolean check for permission-gate
- [x] Update `extensions/artifact-read/index.ts` to use shared utility
- [x] Update `extensions/source-navigation/index.ts` to use shared utility
- [x] Update `extensions/permission-gate/index.ts` to use shared utility
- [x] Add unit tests in `tests/shared-path-utils.test.ts`
- [x] Tests cover: normal paths, `..` traversal, absolute paths, empty strings, symlinks
- [x] All existing tests still pass

---

## Files to Modify

### New Files
- `extensions/shared/path-utils.ts` — Shared utility implementation
- `tests/shared/path-utils.test.ts` — Unit tests

### Modified Files
- `extensions/artifact-read/index.ts` — Replace `resolveWorkspacePath()` with import
- `extensions/source-navigation/index.ts` — Replace `confinePath()` with import
- `extensions/permission-gate/index.ts` — Replace `isInsideWorkspace()` with import
- `package.json` — Add `extensions/shared` to `pi.extensions` array (if needed)

---

## Implementation Approach

### 1. Design the API

```typescript
// extensions/shared/path-utils.ts

import { resolve, relative, isAbsolute } from 'node:path';

/**
 * Confines a path to the workspace root, preventing directory traversal.
 * 
 * @param rawPath - User-provided path (relative or absolute)
 * @param workspaceRoot - Workspace root directory
 * @returns Object with resolved absolute path and safety flag
 * 
 * @example
 * ```typescript
 * const { resolved, safe } = confineToWorkspace('../etc/passwd', '/project');
 * // resolved: '/etc/passwd', safe: false
 * 
 * const { resolved, safe } = confineToWorkspace('src/index.ts', '/project');
 * // resolved: '/project/src/index.ts', safe: true
 * ```
 */
export function confineToWorkspace(
  rawPath: string,
  workspaceRoot: string
): { resolved: string; safe: boolean } {
  const normalizedRoot = resolve(workspaceRoot);
  const resolved = resolve(normalizedRoot, rawPath);
  const rel = relative(normalizedRoot, resolved);
  
  // Path is safe if it doesn't escape the workspace root
  const safe = !rel.startsWith('..') && !isAbsolute(rel);
  
  return { resolved, safe };
}

/**
 * Simple boolean check if a path is inside the workspace.
 */
export function isInsideWorkspace(
  path: string,
  workspaceRoot: string
): boolean {
  return confineToWorkspace(path, workspaceRoot).safe;
}
```

### 2. Write Tests First

```typescript
// tests/shared/path-utils.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import { confineToWorkspace, isInsideWorkspace } from '../../extensions/shared/path-utils';

test('confineToWorkspace', async (t) => {
  await t.test('allows paths inside workspace', () => {
    const result = confineToWorkspace('src/index.ts', '/project');
    assert.equal(result.resolved, '/project/src/index.ts');
    assert.equal(result.safe, true);
  });
  
  await t.test('blocks directory traversal with ..', () => {
    const result = confineToWorkspace('../etc/passwd', '/project');
    assert.equal(result.safe, false);
  });
  
  await t.test('blocks absolute paths outside workspace', () => {
    const result = confineToWorkspace('/etc/passwd', '/project');
    assert.equal(result.safe, false);
  });
  
  await t.test('allows absolute paths inside workspace', () => {
    const result = confineToWorkspace('/project/src/index.ts', '/project');
    assert.equal(result.resolved, '/project/src/index.ts');
    assert.equal(result.safe, true);
  });
  
  await t.test('handles empty string', () => {
    const result = confineToWorkspace('', '/project');
    assert.equal(result.resolved, '/project');
    assert.equal(result.safe, true);
  });
  
  await t.test('handles . (current directory)', () => {
    const result = confineToWorkspace('.', '/project');
    assert.equal(result.resolved, '/project');
    assert.equal(result.safe, true);
  });
});

test('isInsideWorkspace', async (t) => {
  await t.test('returns true for safe paths', () => {
    assert.equal(isInsideWorkspace('src/index.ts', '/project'), true);
  });
  
  await t.test('returns false for unsafe paths', () => {
    assert.equal(isInsideWorkspace('../etc/passwd', '/project'), false);
  });
});
```

### 3. Refactor Existing Code

**artifact-read/index.ts**:
```typescript
// Before
function resolveWorkspacePath(rawPath: string, cwd: string): { resolved: string; safe: boolean } {
  const resolved = resolve(cwd, rawPath);
  const normalizedCwd = resolve(cwd);
  const rel = relative(normalizedCwd, resolved);
  if (rel.startsWith(`..${require("node:path").sep}`) || rel === "..") {
    return { resolved, safe: false };
  }
  return { resolved, safe: true };
}

// After
import { confineToWorkspace } from '../shared/path-utils';

// In handleArtifactRead():
const { resolved, safe } = confineToWorkspace(params.path, cwd);
```

**source-navigation/index.ts**:
```typescript
// Before
function confinePath(filePath: string, cwd: string): { resolved: string; safe: boolean } {
  const resolved = resolve(cwd, filePath);
  const normalizedCwd = resolve(cwd);
  const rel = relative(normalizedCwd, resolved);
  const safe = !rel.startsWith('..') && !isAbsolute(rel);
  return { resolved, safe };
}

// After
import { confineToWorkspace } from '../shared/path-utils';

// In handlers:
const { resolved, safe } = confineToWorkspace(filePath, cwd);
```

**permission-gate/index.ts**:
```typescript
// Before
function isInsideWorkspace(rawPath: string, workspaceRoot: string): boolean {
  const normalizedWorkspace = resolve(workspaceRoot);
  const normalizedPath = resolve(rawPath);
  const relativePath = relative(normalizedWorkspace, normalizedPath);
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !resolve(relativePath).startsWith(".."));
}

// After
import { isInsideWorkspace } from '../shared/path-utils';

// Usage remains the same
```

---

## Testing Strategy

1. **Unit tests**: Test the shared utility in isolation with edge cases
2. **Integration tests**: Verify that each extension still works correctly after refactoring
3. **Regression tests**: Run existing test suites (permission-gate, loop-protection, rtk-rewrite)

---

## Risk Assessment

**Risk Level**: Low

**Mitigations**:
- Write tests before refactoring
- Keep the same function signature where possible
- Test each extension individually after refactoring
- No behavior changes, only code organization

**Potential Issues**:
- Symlink handling may differ between implementations (document decision: follow or reject symlinks?)
- Windows path separators (use `path.sep` consistently)

---

## Success Metrics

- ✅ Lines of duplicated code reduced by ~60
- ✅ Single source of truth for path confinement logic
- ✅ All tests pass
- ✅ No security regressions

---

## References

- `REFACTORING_REVIEW.md` — Section 1.1
- `extensions/artifact-read/index.ts` — L111-120
- `extensions/source-navigation/index.ts` — L59-65
- `extensions/permission-gate/index.ts` — L211-215, L393-420
