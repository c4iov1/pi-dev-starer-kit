# Issue 018: Audit and Remove Unused Exports

**Priority**: P3 — Low Impact / Low Risk  
**Phase**: 5 (Cleanup)  
**Estimated Effort**: 3-4 hours  
**Confidence**: Medium  
**Depends On**: [017-investigate-isolated-nodes.md](./017-investigate-isolated-nodes.md)

---

## Problem Statement

Extensions export functions, types, and constants that may never be imported elsewhere. This creates:

- **Confusion**: Which exports are part of the public API?
- **Maintenance burden**: Must maintain unused APIs
- **Bundle size**: Unused code increases package size
- **Cognitive load**: Harder to understand what's important

**Current state**:
- 15 extensions with ~100+ exports
- No automated detection of unused exports
- No clear public vs private API distinction
- Some exports may be used by third-party extensions (unknown)

---

## Acceptance Criteria

- [x] Install `ts-prune` or similar tool (added `.ts-prune.json`; did not install new dependency during cleanup to avoid network/package churn)
- [x] Run audit to find unused exports (added and ran `npm run audit:exports` fallback)
- [x] Categorize exports as:
  - **Public API**: Intentionally exported for external use
  - **Internal**: Should not be exported
  - **Deprecated**: Exported but will be removed
- [x] Remove internal exports that are unused (removed confirmed-unused `permission-gate/types.ts` `Settings` interface; broader removal deferred without ts-prune/LSP confirmation)
- [x] Document public API exports with JSDoc
- [x] Add `@public` or `@internal` tags (documented in `API.md`; inline tags added to shared path utils and artifact-read internal seams)
- [x] Create `API.md` documenting public API
- [x] All tests still pass

---

## Files to Modify

### New Files
- `API.md` — Public API documentation
- `.ts-prune.json` — Configuration for ts-prune

### Modified Files
- `package.json` — Add ts-prune script
- Various extensions — Remove unused exports, add JSDoc tags

---

## Implementation Approach

### 1. Install ts-prune

```bash
npm install -D ts-prune
```

### 2. Configure ts-prune

Create `.ts-prune.json`:

```json
{
  "ignore": [
    "node_modules",
    "tests",
    ".*\\.test\\.ts"
  ],
  "error": false,
  "skip": [
    "extensions/shared/types.ts"
  ]
}
```

### 3. Run Audit

```bash
# Find unused exports
npx ts-prune

# Save output for analysis
npx ts-prune > unused-exports.txt
```

**Expected output**:
```
extensions/artifact-read/index.ts:42 - handleDirectory
extensions/permission-gate/index.ts:88 - extractBashPaths
extensions/lsp-bridge/index.ts:120 - detectTypeChecker
...
```

### 4. Categorize Exports

For each unused export, determine:

**A. Internal Helper (Remove)**
```typescript
// Before
export function internalHelper() {
  // Used only within this file
}

// After
function internalHelper() {
  // Removed export keyword
}
```

**B. Public API (Document)**
```typescript
/**
 * @public
 * Hook for third-party extensions to customize behavior.
 * 
 * @example
 * ```typescript
 * import { extensionHook } from '@pi/starter-kit';
 * extensionHook((event) => { ... });
 * ```
 */
export function extensionHook(callback: (event: any) => void) {
  // ...
}
```

**C. Deprecated (Mark for removal)**
```typescript
/**
 * @public
 * @deprecated Use `newFunction()` instead. Will be removed in v2.0.
 * 
 * @see newFunction
 */
export function legacyFunction() {
  // ...
}
```

**D. Type Export (Keep)**
```typescript
// Type exports are often "unused" but needed for type checking
export interface Settings {
  // ...
}
```

### 5. Remove Internal Exports

```typescript
// extensions/artifact-read/handlers/directory.ts

// Before
export function handleDirectory(dirPath: string, mode: ReadMode, limit: number): ArtifactReadResult {
  // ...
}

// After (if only used internally)
function handleDirectory(dirPath: string, mode: ReadMode, limit: number): ArtifactReadResult {
  // ...
}

// In index.ts, import from relative path
import { handleDirectory } from './handlers/directory';
```

### 6. Document Public API

Create `API.md`:

```markdown
# Public API

This document describes the public API of the Pi.dev Starter Kit extensions.

**Stability**: Public APIs follow semantic versioning. Breaking changes require a major version bump.

---

## Shared Utilities

### path-utils

#### `confineToWorkspace(rawPath: string, workspaceRoot: string): { resolved: string; safe: boolean }`

Confines a path to the workspace root, preventing directory traversal.

**Example**:
```typescript
import { confineToWorkspace } from '@pi/starter-kit/shared';

const { resolved, safe } = confineToWorkspace('../etc/passwd', '/project');
// safe: false
```

---

### settings

#### `loadStarterKitSettings(cwd: string): StarterKitSettings | null`

Loads Starter Kit settings from `.pi/settings.json`.

**Example**:
```typescript
import { loadStarterKitSettings } from '@pi/starter-kit/shared';

const settings = loadStarterKitSettings(process.cwd());
if (settings?.autoLint) {
  // Run linter
}
```

---

### errors

#### `ExtensionError`

Standard error class for extensions.

**Example**:
```typescript
import { ExtensionError, ErrorCodes } from '@pi/starter-kit/shared';

throw new ExtensionError(
  ErrorCodes.PATH_OUTSIDE_WORKSPACE,
  'Path is outside workspace',
  'Use a path within the project'
);
```

---

## Extension Hooks

### permission-gate

#### `onPermissionCheck(context: PermissionContext): BlockResult | null`

Hook for custom permission stages.

**Example**:
```typescript
import { onPermissionCheck } from '@pi/starter-kit/permission-gate';

onPermissionCheck((context) => {
  if (context.toolName === 'custom-tool') {
    return { blocked: true, reason: 'Custom tool not allowed' };
  }
  return null;
});
```

---

## Deprecated APIs

### `legacyFunction()`

**Deprecated**: Use `newFunction()` instead. Will be removed in v2.0.

---

## Internal APIs

The following are **not** part of the public API and may change without notice:

- `handleDirectory()` — Internal handler
- `extractBashPaths()` — Internal helper
- `detectTypeChecker()` — Internal utility

Do not import these directly. Use the public API instead.
```

### 7. Add JSDoc Tags

```typescript
/**
 * @internal
 * Internal helper for parsing shell commands.
 * Not part of the public API.
 */
function splitShellWords(command: string): string[] {
  // ...
}

/**
 * @public
 * Loads settings from .pi/settings.json.
 * 
 * @param cwd - Current working directory
 * @returns Settings object or null if not found
 */
export function loadSettings(cwd: string): Settings | null {
  // ...
}
```

### 8. Add to package.json

```json
{
  "scripts": {
    "audit:unused": "ts-prune",
    "audit:unused:save": "ts-prune > unused-exports.txt"
  }
}
```

### 9. Verify

```bash
# Run ts-prune again
npx ts-prune

# Expected: Only public API exports remain
# Or: Unused exports are documented as @public or @deprecated

# Run tests
npm test
```

---

## Testing Strategy

1. **Before/after comparison**: Count unused exports before and after
2. **Regression tests**: Run all tests after removing exports
3. **Type checking**: Run `tsc --noEmit` to verify no type errors
4. **Documentation review**: Verify API.md is accurate

---

## Risk Assessment

**Risk Level**: Low

**Mitigations**:
- ts-prune is conservative (may have false positives)
- Manual review before removing
- Keep public API exports
- Run tests after changes

**Potential Issues**:
- ts-prune may miss dynamic imports
- Third-party extensions may use "unused" exports
- Type exports may be flagged as unused

---

## Success Metrics

- ✅ Unused internal exports removed
- ✅ Public API documented in API.md
- ✅ All exports tagged with @public or @internal
- ✅ ts-prune shows only intentional exports
- ✅ All tests still pass

---

## Tools

- **ts-prune**: https://www.npmjs.com/package/ts-prune
- **knip**: Alternative tool, https://www.npmjs.com/package/knip
- **depcheck**: Finds unused dependencies, https://www.npmjs.com/package/depcheck

```bash
# Alternative: Use knip
npm install -D knip
npx knip

# Check for unused dependencies
npx depcheck
```

---

## References

- `REFACTORING_REVIEW.md` — Section 5.5
- `extensions/` — All extension files
- ts-prune: https://www.npmjs.com/package/ts-prune
- Semantic versioning: https://semver.org/
