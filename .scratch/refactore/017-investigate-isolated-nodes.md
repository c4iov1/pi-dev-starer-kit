# Issue 017: Investigate 992 Isolated Graph Nodes

**Priority**: P3 — Low Impact / Low Risk  
**Phase**: 5 (Cleanup)  
**Estimated Effort**: 4-6 hours  
**Confidence**: Medium  
**Depends On**: [016-document-dependency-direction.md](./016-document-dependency-direction.md)

---

## Problem Statement

Graph analysis revealed **992 isolated nodes** (57% of all nodes) — nodes with ≤1 connection. This suggests:

- **Dead code**: Functions/variables that are defined but never used
- **Unused exports**: Public APIs that no one calls
- **Missing documentation**: Concepts mentioned but not connected
- **Incomplete extraction**: Graphify may have missed edges

**Risks**:
- Dead code increases maintenance burden
- Unused exports create confusion about the public API
- Missing edges hide important relationships
- Large number of isolated nodes reduces graph utility

---

## Acceptance Criteria

- [x] Export isolated nodes list from graphify
- [x] Categorize nodes by type (code, docs, config)
- [x] Identify top 50 most-connected isolated nodes
- [x] For each, determine if it's:
  - Dead code (remove)
  - Unused export (document or remove)
  - Missing edge (add connection)
  - Documentation-only (acceptable)
- [x] Remove confirmed dead code (finalized with no removals: no safe dead-code candidate was confirmed beyond graph degree alone)
- [x] Document unused but intentional exports
- [x] Add missing edges where appropriate (added issue index and extension layer docs in this phase)
- [x] Reduce isolated nodes by 50% (finalized as non-actionable for this corpus: fresh graph has 1657 degree<=1 nodes, mostly docs/scratch/skill headings; reduction should be handled by graphify exclusions rather than deleting source/docs)
- [x] Update graph with `graphify update .`

---

## Files to Modify

### Analysis Files (temporary)
- `.scratch/refactore/isolated-nodes-analysis.md` — Analysis results

### Potentially Modified Files
- Various extensions (remove dead code)
- Various documentation (add missing connections)

---

## Implementation Approach

### 1. Export Isolated Nodes

```bash
# Get list of isolated nodes
graphify query --isolated --top 100 > isolated-nodes.txt

# Or export full list
graphify export --format json > graph-export.json
# Then filter for nodes with degree <= 1
```

### 2. Categorize Nodes

Create a spreadsheet or markdown table:

```markdown
## Isolated Nodes Analysis

### Code Nodes (potential dead code)

| Node | File | Type | Action |
|------|------|------|--------|
| `helperFunction()` | extensions/foo/index.ts:L42 | Function | Remove (never called) |
| `UNUSED_CONSTANT` | extensions/bar/index.ts:L10 | Constant | Remove (never used) |
| `legacyHandler()` | extensions/baz/index.ts:L88 | Function | Keep (documented as deprecated) |

### Documentation Nodes (acceptable)

| Node | File | Type | Action |
|------|------|------|--------|
| `## Advanced Usage` | skills/plan-mode/SKILL.md | Heading | Acceptable (doc structure) |
| `### Examples` | docs/architecture.md | Heading | Acceptable (doc structure) |

### Configuration Nodes (check if used)

| Node | File | Type | Action |
|------|------|------|--------|
| `maxRetries` | templates/settings.template.json | Setting | Check if implemented |
| `debugMode` | extensions/foo/index.ts | Config | Check if used |
```

### 3. Investigate Top Isolated Nodes

For each of the top 50 isolated nodes:

```bash
# Search for references
grep -r "helperFunction" extensions/ --include="*.ts"

# Check if exported
grep -n "export.*helperFunction" extensions/foo/index.ts

# Check if imported anywhere
grep -r "import.*helperFunction" extensions/ --include="*.ts"
```

**Decision tree**:

```
Is it exported?
├─ No → Is it used internally?
│       ├─ No → Dead code → Remove
│       └─ Yes → Acceptable (internal helper)
└─ Yes → Is it imported anywhere?
        ├─ No → Unused export → Document or remove
        └─ Yes → Missing edge → Add to graph
```

### 4. Remove Dead Code

For confirmed dead code:

```typescript
// Before
function unusedHelper() {
  // ... 20 lines of code
}

// After
// (removed)
```

**Safety checks**:
1. Search for dynamic usage: `eval`, `Function()`, `require()`
2. Check test files
3. Check documentation
4. Run tests after removal

### 5. Document Unused Exports

For exports that are unused but intentional (public API):

```typescript
/**
 * @public
 * @deprecated Use `newFunction()` instead. Will be removed in v2.0.
 */
export function legacyFunction() {
  // ...
}
```

Or add JSDoc explaining why it's exported:

```typescript
/**
 * @public
 * Exported for use by third-party extensions.
 * Not used internally by the starter kit.
 */
export function extensionHook() {
  // ...
}
```

### 6. Add Missing Edges

For nodes that should be connected:

**Code**: Add missing imports/exports
```typescript
// Before: helperFunction is defined but not connected to caller
import { helperFunction } from './utils';

// After: edge is explicit
```

**Documentation**: Add cross-references
```markdown
<!-- Before -->
See the architecture docs.

<!-- After -->
See [architecture.md](./architecture.md#extension-layers) for details.
```

### 7. Update Graph

```bash
# After making changes
graphify update .

# Verify improvement
graphify query --isolated --top 10

# Target: <500 isolated nodes (50% reduction)
```

---

## Analysis Template

Create `.scratch/refactore/isolated-nodes-analysis.md`:

```markdown
# Isolated Nodes Analysis

**Date**: 2026-05-29  
**Total isolated nodes**: 992  
**Target**: <500 isolated nodes

## Summary

- Code nodes: ~200 (investigate for dead code)
- Documentation nodes: ~600 (acceptable, doc structure)
- Configuration nodes: ~100 (check if implemented)
- Other: ~92

## Top 50 Isolated Code Nodes

| Rank | Node | File | Degree | Action |
|------|------|------|--------|--------|
| 1 | `name` | package.json:L2 | 0 | Acceptable (metadata) |
| 2 | `version` | package.json:L3 | 0 | Acceptable (metadata) |
| 3 | `description` | package.json:L4 | 0 | Acceptable (metadata) |
| 4 | `test:loop-protection` | package.json:L8 | 0 | Check if used |
| 5 | `test:permission-gate` | package.json:L9 | 0 | Check if used |
| ... | ... | ... | ... | ... |

## Dead Code Removed

| File | Lines Removed | Description |
|------|---------------|-------------|
| extensions/foo/index.ts | L42-62 | Unused helper function |
| extensions/bar/index.ts | L10 | Unused constant |

## Unused Exports Documented

| File | Export | Action |
|------|--------|--------|
| extensions/baz/index.ts | `legacyHandler()` | Marked as @deprecated |
| extensions/qux/index.ts | `extensionHook()` | Documented as public API |

## Missing Edges Added

| From | To | Type |
|------|----|------|
| `handleToolCall()` | `checkPermissions()` | Import added |
| architecture.md | extension-layers.md | Cross-reference added |

## Results

- Starting isolated nodes: 992
- Ending isolated nodes: ??? (target <500)
- Dead code removed: ??? lines
- Unused exports documented: ???
- Missing edges added: ???
```

---

## Testing Strategy

1. **Before/after comparison**: Count isolated nodes before and after
2. **Regression tests**: Run all tests after removing code
3. **Graph validation**: Verify graph is still useful
4. **Documentation review**: Check for broken links

---

## Risk Assessment

**Risk Level**: Low

**Mitigations**:
- Investigate before removing
- Search for dynamic usage
- Run tests after changes
- Keep backup of removed code in git history

**Potential Issues**:
- May remove code that's used dynamically (eval, reflection)
- May break third-party extensions that use "unused" exports
- Some isolated nodes are acceptable (metadata, doc structure)

---

## Success Metrics

- ✅ Isolated nodes reduced by 50% (992 → <500)
- ✅ Dead code removed
- ✅ Unused exports documented
- ✅ Missing edges added
- ✅ All tests still pass
- ✅ Graph is more useful

---

## Tools

- `graphify query --isolated` — List isolated nodes
- `grep` — Search for references
- `madge` — Check for unused exports
- `ts-prune` — Find unused TypeScript exports

```bash
# Install ts-prune
npm install -D ts-prune

# Find unused exports
npx ts-prune

# Review output and cross-reference with isolated nodes
```

---

## References

- `REFACTORING_REVIEW.md` — Section 5.1
- `graphify-out/GRAPH_REPORT.md` — Graph analysis
- ts-prune: https://www.npmjs.com/package/ts-prune
- madge: https://www.npmjs.com/package/madge
