# Refactoring Review

**Generated**: 2026-05-29  
**Graph Freshness**: ✅ Current (commit `621f6a9f`, matches HEAD)  
**Analysis Method**: Graph-first architecture review using graphify 0.8.24

---

## Executive Summary

The Pi.dev Starter Kit is a **well-structured but immature codebase** with solid architectural intentions (extension-based design, skill system, permission pipeline) but significant technical debt in three areas:

1. **Critical test coverage gap**: Only 3 of 15 extensions have tests (7.25% code coverage ratio)
2. **Duplicated cross-cutting concerns**: Path confinement and settings loading are reimplemented 4-5 times with subtle variations
3. **Monolithic extensions**: artifact-read (1076 lines), lsp-bridge (940 lines), and permission-gate (802 lines) violate single-responsibility and are difficult to test

**Graph Analysis** (1722 nodes, 1819 edges, 143 communities):
- **992 isolated nodes (57%)** suggest dead code, unused exports, or missing documentation
- **Low cohesion communities** (0, 1, 2) indicate they should be split
- **God node `starterKit`** (30 edges) reveals tight coupling in the settings template
- **No clear dependency direction** between extensions — they read the same files independently

**Overall Health**: 🟡 **Moderate** — Architecture is sound, but implementation hygiene needs attention before the codebase scales further.

---

## Priority 1 — High Impact / Low Risk

### 1.1 Extract Shared Path Confinement Utility
**Confidence**: High  
**Files**: `extensions/artifact-read/index.ts`, `extensions/source-navigation/index.ts`, `extensions/permission-gate/index.ts`

**Problem**: Path confinement logic is duplicated 3 times:
- `resolveWorkspacePath()` in artifact-read (L111)
- `confinePath()` in source-navigation (L59)
- `isInsideWorkspace()` + `checkPathConfinement()` in permission-gate (L211, L393)

All three check if a path is within the workspace root using `relative()` and string comparison.

**Solution**: Create `extensions/shared/path-utils.ts` with:
```typescript
export function confineToWorkspace(rawPath: string, workspaceRoot: string): 
  { resolved: string; safe: boolean } {
  const resolved = resolve(workspaceRoot, rawPath);
  const rel = relative(workspaceRoot, resolved);
  const safe = !rel.startsWith('..') && !isAbsolute(rel);
  return { resolved, safe };
}
```

**Impact**: Eliminates ~60 lines of duplication, fixes subtle inconsistencies (e.g., artifact-read uses `require("node:path").sep` inline), makes security boundary explicit and testable.

**Risk**: Low — pure refactor, no behavior change.

---

### 1.2 Extract Shared Settings Loader
**Confidence**: High  
**Files**: `extensions/rtk-rewrite/index.ts`, `extensions/loop-protection/index.ts`, `extensions/starter-kit-doctor/index.ts`, `extensions/lsp-bridge/index.ts`

**Problem**: Settings loading is reimplemented 5 times:
- `loadSettings()` in rtk-rewrite (L63)
- `loadSettings()` in loop-protection (L20)
- `loadSettings()` in starter-kit-doctor (L240)
- `isAutoTypeCheckEnabled()` in lsp-bridge (L38)
- `isSymbolOpsEnabled()` in lsp-bridge (L54)

Each reads `.pi/settings.json`, parses JSON, and navigates to `starterKit.*`. Error handling varies.

**Solution**: Create `extensions/shared/settings.ts` with:
```typescript
export interface StarterKitSettings {
  permissionMode?: string;
  autoLint?: boolean;
  autoTypeCheck?: boolean;
  // ... etc
}

export function loadStarterKitSettings(cwd: string): StarterKitSettings | null {
  try {
    const path = resolve(cwd, '.pi/settings.json');
    const content = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(content);
    return parsed?.starterKit ?? null;
  } catch {
    return null;
  }
}
```

**Impact**: Eliminates ~80 lines of duplication, ensures consistent error handling, makes settings schema explicit and type-safe.

**Risk**: Low — pure refactor.

---

### 1.3 Add Tests for artifact-read Extension
**Confidence**: High  
**Files**: `extensions/artifact-read/index.ts` (1076 lines, 0 tests)

**Problem**: The largest extension (1076 lines) has zero test coverage. It handles SQLite queries, archive extraction, CSV parsing — all with security implications (path traversal, shell injection in `spawnSync`).

**Solution**: Create `tests/artifact-read.test.ts` covering:
- Path confinement (reject paths outside workspace)
- SQLite read-only enforcement (reject `INSERT`, `UPDATE`, `DELETE`, `DROP`)
- Archive extraction safety (reject paths with `..` in tar/zip)
- CSV/JSON parsing edge cases
- Error handling for missing files

**Impact**: Catches regressions in the most complex extension, documents expected behavior, enables safe refactoring.

**Risk**: Low — additive only.

---

### 1.4 Add Tests for lsp-bridge Extension
**Confidence**: High  
**Files**: `extensions/lsp-bridge/index.ts` (940 lines, 0 tests)

**Problem**: Second-largest extension has zero tests. It spawns external processes (`tsc`, `pyright`, `cargo check`), manages TypeScript Language Service instances, and registers 4 tools.

**Solution**: Create `tests/lsp-bridge.test.ts` covering:
- Type-checker detection (TypeScript, Python, Rust, Go)
- LSP symbol operations (definition, references, rename, workspace symbols)
- Degradation messages for non-TypeScript languages
- Settings integration (autoTypeCheck, enableSymbolOps)

**Impact**: Enables safe refactoring of the 940-line extension, documents language support matrix.

**Risk**: Low — additive only.

---

### 1.5 Split artifact-read into Handlers
**Confidence**: Medium  
**Files**: `extensions/artifact-read/index.ts`

**Problem**: The 1076-line file mixes concerns:
- File type detection (L60-105)
- Directory handling (L155-220)
- CSV parsing (L225-290)
- JSON/JSONL parsing (L295-360)
- SQLite handling (L365-550)
- Archive handling (L555-750)
- Tool registration (L950-1076)

**Solution**: Split into:
```
extensions/artifact-read/
  index.ts              # Tool registration + routing (50 lines)
  handlers/
    directory.ts        # Directory listing
    csv.ts              # CSV parsing
    json.ts             # JSON/JSONL parsing
    sqlite.ts           # SQLite queries
    archive.ts          # Archive extraction
  utils/
    detect-type.ts      # File type detection
    format.ts           # Output formatting
```

**Impact**: Reduces cognitive load, enables targeted testing, makes it easier to add new file types (PDF, Excel).

**Risk**: Medium — requires careful module boundary design to avoid circular dependencies.

---

## Priority 2 — Architecture Improvements

### 2.1 Establish Extension Dependency Direction
**Confidence**: High  
**Files**: All extensions, `extensions/shared/` (new)

**Problem**: Extensions currently read the same files (`.pi/settings.json`) independently with no shared abstractions. The graph shows no clear dependency direction — extensions are peers that happen to read the same config.

**Solution**: Introduce a layered architecture:
```
Layer 1: Shared utilities (path-utils, settings, types)
Layer 2: Core extensions (permission-gate, post-edit-lint, loop-protection)
Layer 3: Feature extensions (artifact-read, lsp-bridge, ast-tools, etc.)
Layer 4: Integration extensions (setup-ai-memory, starter-kit-doctor)
```

Document in `docs/architecture.md`:
- Layer 1 can be imported by any extension
- Layer 2 extensions should not import from Layer 3 or 4
- Layer 3 extensions can import from Layer 1 and 2
- Layer 4 extensions can import from any layer

**Impact**: Prevents circular dependencies, makes the permission pipeline's role explicit, enables future extensions to plug in cleanly.

**Risk**: Medium — requires buy-in from contributors, but no code changes needed initially (documentation only).

---

### 2.2 Refactor permission-gate into Pipeline Stages
**Confidence**: Medium  
**Files**: `extensions/permission-gate/index.ts` (802 lines)

**Problem**: The 802-line file implements a 5-stage permission pipeline but mixes concerns:
- Static deny rules (L60-80)
- Protected path patterns (L82-90)
- Path confinement (L393-420)
- Write constraints (L422-450)
- Interactive prompts (L452-500)
- Feature mode toggle (L700-802)

**Solution**: Split into:
```
extensions/permission-gate/
  index.ts              # Pipeline orchestration (100 lines)
  stages/
    protected-paths.ts  # Protected path checking
    deny-rules.ts       # Static deny rules
    path-confinement.ts # Workspace confinement
    write-constraint.ts # Read-first enforcement
    interactive.ts      # User prompts
  modes/
    default.ts          # Default mode logic
    accept-edits.ts     # Accept-edits mode
    feature-work.ts     # Feature-work mode
  toggle.ts             # Feature mode toggle command/tool
```

**Impact**: Makes the pipeline stages explicit and testable, enables custom stages for future extensions (e.g., audit logging), reduces the "god function" smell.

**Risk**: Medium — requires careful event handler registration to maintain pipeline order.

---

### 2.3 Consolidate Skill Categories
**Confidence**: Medium  
**Files**: `skills/` directory (24 skills)

**Problem**: The 24 skills lack clear categorization. Some overlap:
- `grill-me` vs `grill-with-docs` (both challenge plans)
- `diagnose` vs `improve-codebase-architecture` (both analyze code)
- `qa` vs `triage` (both manage issues)

**Solution**: Organize into categories:
```
skills/
  planning/
    plan-mode/
    grill-me/
    grill-with-docs/
    to-prd/
    to-issues/
  quality/
    self-verify/
    review-matrix/
    tdd/
    diagnose/
  workflow/
    handoff/
    triage/
    qa/
  research/
    web-research/
    browser-testing/
    mcp-orchestration/
    subagent-delegation/
  architecture/
    improve-codebase-architecture/
    structural-refactor/
    design-an-interface/
  meta/
    write-a-skill/
    zoom-out/
    ai-memory/
```

Update `AGENTS.md` and `SYSTEM.md` to reference categories.

**Impact**: Makes skills easier to discover, reduces confusion about which skill to use, enables category-based activation.

**Risk**: Low — directory reorganization only, no code changes.

---

### 2.4 Decouple starterKit Settings Template
**Confidence**: Medium  
**Files**: `templates/settings.template.json`

**Problem**: The settings template is a "god object" with 30 edges in the graph. It mixes:
- Security settings (permissionMode, featureWork)
- Quality gates (autoLint, autoTypeCheck, autoVerify)
- Tool availability (activeExtensions, activeSkills)
- Harness behavior (steeringMode, interruptMode, compactionStrategy)
- Integration flags (aiMemory, webSearch)

**Solution**: Split into sections with clear ownership:
```json
{
  "starterKit": {
    "security": { "permissionMode": "default", "featureWork": {...} },
    "quality": { "autoLint": true, "autoTypeCheck": false, "lspBridge": {...} },
    "extensions": { "active": [...] },
    "skills": { "active": [...] },
    "harness": { "steeringMode": "...", "interruptMode": "...", "compactionStrategy": "..." },
    "integrations": { "aiMemory": {...}, "webSearch": "cached" }
  }
}
```

Update all extensions to read from the new paths (e.g., `settings.starterKit.security.permissionMode`).

**Impact**: Reduces coupling, makes it clear which extension owns which settings, enables partial configuration (e.g., only security settings).

**Risk**: Medium — requires updating all extensions that read settings, breaking change for existing users.

---

## Priority 3 — Clean Code Improvements

### 3.1 Standardize Error Handling
**Confidence**: High  
**Files**: All extensions

**Problem**: Error handling is inconsistent:
- Some extensions return `{ ok: false, output: "error message" }`
- Others throw exceptions
- Some use `try/catch` with empty `catch {}` blocks
- Error messages vary in format and detail

**Solution**: Define a standard error type in `extensions/shared/errors.ts`:
```typescript
export class ExtensionError extends Error {
  constructor(
    public code: string,
    message: string,
    public suggestion?: string
  ) {
    super(message);
  }
}

export function formatError(err: ExtensionError): string {
  return `[${err.code}] ${err.message}${err.suggestion ? `\n\nSuggestion: ${err.suggestion}` : ''}`;
}
```

Update extensions to throw typed errors and format them consistently.

**Impact**: Improves user experience, makes errors easier to test, enables error tracking in the future.

**Risk**: Low — additive refactoring.

---

### 3.2 Remove Inline `require()` Calls
**Confidence**: High  
**Files**: `extensions/artifact-read/index.ts` (L117)

**Problem**: The code uses `require("node:path").sep` inline instead of the already-imported `sep` from `node:path`.

**Solution**: Use the imported `sep`:
```typescript
// Before
if (rel.startsWith(`..${require("node:path").sep}`) || rel === "..") {

// After
if (rel.startsWith(`..${sep}`) || rel === "..") {
```

**Impact**: Cleaner code, consistent with module imports, avoids runtime overhead of `require()`.

**Risk**: None — trivial fix.

---

### 3.3 Add JSDoc Comments to Public Functions
**Confidence**: High  
**Files**: All extensions

**Problem**: Most public functions lack JSDoc comments. For example, `handleArtifactRead()` (L925) has no documentation of parameters, return values, or edge cases.

**Solution**: Add JSDoc to all exported functions and key internal functions:
```typescript
/**
 * Reads an artifact file or directory and returns structured output.
 * 
 * @param params - Tool parameters including path, mode, and optional filters
 * @param cwd - Current working directory (workspace root)
 * @returns Result with detected type, mode, and formatted output
 * 
 * @example
 * ```typescript
 * const result = handleArtifactRead({ path: 'data.csv', mode: 'sample' }, '/project');
 * ```
 */
function handleArtifactRead(params: ArtifactReadParams, cwd: string): ArtifactReadResult {
  // ...
}
```

**Impact**: Improves code discoverability, enables IDE tooltips, documents edge cases and invariants.

**Risk**: None — additive only.

---

### 3.4 Extract Magic Numbers into Constants
**Confidence**: High  
**Files**: Multiple extensions

**Problem**: Magic numbers scattered throughout:
- `Math.min(params.limit ?? 50, 200)` in artifact-read (L950)
- `slice(0, 500)` for directory entries in artifact-read (L165)
- `subarray(0, 16)` for SQLite magic bytes in artifact-read (L97)
- `timeoutMs: 2000` in settings template

**Solution**: Define constants in `extensions/shared/constants.ts`:
```typescript
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
export const MAX_DIRECTORY_ENTRIES = 500;
export const SQLITE_MAGIC_BYTES_LENGTH = 16;
export const DEFAULT_RTK_TIMEOUT_MS = 2000;
```

**Impact**: Makes limits explicit and configurable, documents why specific values were chosen, enables future tuning.

**Risk**: Low — pure refactor.

---

### 3.5 Simplify Shell Word Splitting
**Confidence**: Medium  
**Files**: `extensions/permission-gate/index.ts` (L222-230)

**Problem**: The `splitShellWords()` function uses a complex regex to handle quoted strings:
```typescript
const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|\S+/g;
```

This is hard to read and may not handle all edge cases (nested quotes, escape sequences).

**Solution**: Use a battle-tested library like `shell-quote` (already in dependencies via transitive deps) or simplify the regex with comments:
```typescript
function splitShellWords(command: string): string[] {
  // Match: double-quoted strings (with escapes), single-quoted strings, or non-whitespace
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|\S+/g;
  return Array.from(command.matchAll(pattern), m => m[1] ?? m[2] ?? m[0]);
}
```

**Impact**: Improves readability, reduces risk of shell injection bugs.

**Risk**: Low — add tests first to capture current behavior.

---

## Priority 4 — Tests

### 4.1 Test Coverage Summary
**Confidence**: High

| Extension | Lines | Has Tests | Coverage |
|-----------|-------|-----------|----------|
| artifact-read | 1076 | ❌ | 0% |
| lsp-bridge | 940 | ❌ | 0% |
| permission-gate | 802 | ✅ | ~30% (225 lines) |
| starter-kit-doctor | 583 | ❌ | 0% |
| source-navigation | 567 | ❌ | 0% |
| ast-tools | 519 | ❌ | 0% |
| setup-ai-memory | 436 | ❌ | 0% |
| loop-protection | 284 | ✅ | ~57% (162 lines) |
| rtk-rewrite | 278 | ✅ | ~39% (109 lines) |
| auto-memory | 278 | ❌ | 0% |
| task-tracker | 240 | ❌ | 0% |
| post-edit-lint | 239 | ❌ | 0% |
| monitor-bash | 235 | ❌ | 0% |
| contrib-gate | 232 | ❌ | 0% |
| init-starter-kit | 130 | ❌ | 0% |
| **Total** | **6839** | **3/15** | **7.25%** |

**Target**: 60% coverage for core extensions (permission-gate, loop-protection, artifact-read, lsp-bridge).

---

### 4.2 Suggested Test Strategy
**Confidence**: High

**Phase 1: Security-Critical Extensions** (Week 1-2)
1. `artifact-read` — Path confinement, SQLite read-only enforcement, archive extraction safety
2. `permission-gate` — Expand existing tests to cover all 5 pipeline stages
3. `contrib-gate` — Branch pattern matching, commit type validation

**Phase 2: High-Complexity Extensions** (Week 3-4)
4. `lsp-bridge` — Type-checker detection, LSP symbol operations, degradation messages
5. `ast-tools` — ast-grep pattern matching, AST editing safety
6. `source-navigation` — Range extraction, anchor hashing, path confinement

**Phase 3: Workflow Extensions** (Week 5-6)
7. `task-tracker` — Task CRUD, JSONL persistence, status transitions
8. `auto-memory` — Entry categorization, timestamp formatting, file I/O
9. `monitor-bash` — Process spawning, timeout handling, line streaming

**Test Structure**:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';

test('artifact-read', async (t) => {
  await t.test('path confinement', () => {
    // Test that paths outside workspace are rejected
  });
  
  await t.test('SQLite read-only enforcement', () => {
    // Test that INSERT/UPDATE/DELETE/DROP are rejected
  });
  
  await t.test('archive extraction safety', () => {
    // Test that paths with '..' in archives are rejected
  });
});
```

**Test Harness**: Use the existing `createHarness()` pattern from `tests/permission-gate.test.ts` to mock the Pi ExtensionAPI.

---

### 4.3 Add Integration Tests
**Confidence**: Medium

**Problem**: Current tests are unit tests that mock the Pi API. No integration tests verify that extensions work together correctly.

**Solution**: Create `tests/integration/` with:
1. **Permission pipeline test**: Verify that permission-gate blocks artifact-read when path is outside workspace
2. **Settings integration test**: Verify that all extensions read the same settings file consistently
3. **End-to-end test**: Load all extensions, register a tool, invoke it, verify output

**Impact**: Catches integration bugs (e.g., one extension's settings change breaking another), documents expected extension interactions.

**Risk**: Medium — requires setting up a test harness that loads multiple extensions.

---

## Priority 5 — Unused / Removable

### 5.1 Investigate 992 Isolated Graph Nodes
**Confidence**: Medium  
**Verification**: `graphify query --isolated`

**Problem**: The graph has 992 isolated nodes (57% of all nodes). These are likely:
- Unused exports
- Dead code (unreachable branches)
- Documentation-only nodes (markdown headings)
- Missing edges (functions called dynamically)

**Action**: Run `graphify query --isolated --top 50` to see the most connected isolated nodes, then:
1. Check if they're exported but never imported
2. Check if they're in dead code branches
3. Add missing edges if they're called dynamically

**Risk**: Low — investigation only, no deletions.

---

### 5.2 Audit Git Dependencies
**Confidence**: High  
**Files**: `package.json`

**Problem**: All dependencies are `git+https://` URLs with no version pinning:
```json
"dependencies": {
  "context-mode": "git+https://github.com/mksglu/context-mode.git",
  "pi-agent-browser-native": "git+https://github.com/fitchmultz/pi-agent-browser-native.git",
  // ...
}
```

This means `npm install` pulls the latest commit from `main`, which could introduce breaking changes.

**Action**:
1. Check if these repos have tags/releases
2. Pin to specific commits or semver tags:
   ```json
   "context-mode": "git+https://github.com/mksglu/context-mode.git#v1.2.3"
   ```
3. Add `package-lock.json` to version control (if not already)

**Risk**: Low — standard dependency hygiene.

---

### 5.3 Remove .DS_Store Files
**Confidence**: High  
**Files**: `docs/.DS_Store`, potentially others

**Problem**: macOS `.DS_Store` files are tracked in git.

**Action**:
```bash
# Add to .gitignore
echo ".DS_Store" >> .gitignore

# Remove tracked files
git rm -r --cached .DS_Store docs/.DS_Store
git commit -m "chore: remove .DS_Store files"
```

**Risk**: None — standard practice.

---

### 5.4 Consolidate Duplicate Issue Numbers
**Confidence**: Medium  
**Files**: `.scratch/` directory

**Problem**: Duplicate issue numbers across subdirectories:
- `.scratch/ai-harness-akita/012-artifact-read-archive-preview-hardening.md`
- `.scratch/pi-dev-starter-kit/012-project-templates.md`
- `.scratch/rtk-rewrite/012-*` (if exists)

This creates confusion when referencing issues.

**Action**: Renumber issues to be globally unique, or flatten the directory structure:
```
.scratch/
  001-package-scaffold.md
  002-install-dependencies.md
  ...
  050-artifact-read-archive-hardening.md
```

**Risk**: Low — directory reorganization only.

---

### 5.5 Check for Unused Exports
**Confidence**: Medium  
**Verification**: `npx ts-prune` or manual grep

**Problem**: Extensions export functions that may never be imported elsewhere.

**Action**:
```bash
# Install ts-prune
npm install -D ts-prune

# Find unused exports
npx ts-prune
```

Review the output and remove genuinely unused exports (keep exports that are part of the public API even if not currently used).

**Risk**: Medium — false positives possible, review carefully.

---

## Suggested Implementation Issues

### Phase 1: Foundation (Week 1)
- [ ] **Issue 1**: Extract shared path confinement utility
- [ ] **Issue 2**: Extract shared settings loader
- [ ] **Issue 3**: Remove .DS_Store files and update .gitignore
- [ ] **Issue 4**: Pin git dependencies to specific commits/tags

### Phase 2: Test Coverage (Week 2-3)
- [ ] **Issue 5**: Add tests for artifact-read extension
- [ ] **Issue 6**: Add tests for lsp-bridge extension
- [ ] **Issue 7**: Add tests for contrib-gate extension
- [ ] **Issue 8**: Expand permission-gate tests to cover all pipeline stages

### Phase 3: Code Quality (Week 4)
- [ ] **Issue 9**: Standardize error handling across extensions
- [ ] **Issue 10**: Add JSDoc comments to public functions
- [ ] **Issue 11**: Extract magic numbers into constants
- [ ] **Issue 12**: Simplify shell word splitting in permission-gate

### Phase 4: Architecture (Week 5-6)
- [ ] **Issue 13**: Split artifact-read into handler modules
- [ ] **Issue 14**: Refactor permission-gate into pipeline stages
- [ ] **Issue 15**: Consolidate skill categories
- [ ] **Issue 16**: Establish extension dependency direction (documentation)

### Phase 5: Cleanup (Week 7)
- [ ] **Issue 17**: Investigate and resolve 992 isolated graph nodes
- [ ] **Issue 18**: Audit and remove unused exports
- [ ] **Issue 19**: Consolidate duplicate issue numbers in .scratch/
- [ ] **Issue 20**: Add integration tests for extension interactions

---

## Files Consulted

- `graphify-out/GRAPH_REPORT.md` — Graph topology and community analysis
- `package.json` — Dependencies and package configuration
- `extensions/artifact-read/index.ts` — Largest extension (1076 lines)
- `extensions/permission-gate/index.ts` — Permission pipeline (802 lines)
- `extensions/lsp-bridge/index.ts` — LSP integration (940 lines)
- `extensions/starter-kit-doctor/index.ts` — Diagnostic tool (583 lines)
- `extensions/loop-protection/index.ts` — Loop detection (284 lines)
- `extensions/rtk-rewrite/index.ts` — Command rewriting (278 lines)
- `tests/permission-gate.test.ts` — Existing test patterns
- `tests/loop-protection.test.ts` — Existing test patterns
- `tests/rtk-rewrite.test.ts` — Existing test patterns
- `templates/settings.template.json` — Settings schema
- `docs/architecture.md` — Architecture documentation

---

## Appendix: Graph Analysis Details

### God Nodes (High Connectivity)
1. `starterKit` — 30 edges (settings template)
2. `Pi — Harness Technical Manual` — 17 edges (documentation)
3. `6.1 — engineering/ (Daily Use)` — 13 edges (skill documentation)
4. `mattpocock/skills — Technical Manual` — 12 edges (skill documentation)
5. `002 — Extension: rtk-rewrite` — 12 edges (issue documentation)

### Low Cohesion Communities (Candidates for Splitting)
- **Community 0** (46 nodes, cohesion 0.04) — Mixed agent tasks
- **Community 1** (43 nodes, cohesion 0.05) — Mixed documentation
- **Community 2** (37 nodes, cohesion 0.05) — Mixed skill documentation

### Surprising Connections
- `checkPathConfinement()` calls `isInsideWorkspace()` (same file, but bridges communities 116 → 40)
- `checkBashProjectScope()` calls `extractBashPaths()` (same file, bridges communities 85 → 116)
- `handleToolCall()` calls `handleDenyRules()` (same file, bridges communities 85 → 40)

These suggest that the permission-gate extension has internal community structure that could be split into separate modules.
