# Refactoring Implementation Plan

**Created**: 2026-05-29  
**Source**: `REFACTORING_REVIEW.md` (graph-first architecture review)  
**Status**: 📋 Ready for implementation

---

## Overview

This directory contains the implementation plan for addressing the technical debt and architecture improvements identified in the graph-first architecture review. The plan is organized into 5 phases with 20 concrete issues.

**Key Metrics**:
- Total issues: 20
- Estimated duration: 7 weeks
- Priority focus: Test coverage (8 issues), shared utilities (2 issues), code quality (4 issues)

---

## Phase Structure

### Phase 1: Foundation (Week 1)
Establish shared utilities and basic hygiene. These are low-risk, high-impact changes that enable safer refactoring in later phases.

**Issues**:
- [001-extract-path-utils.md](./001-extract-path-utils.md) — Extract shared path confinement utility
- [002-extract-settings-loader.md](./002-extract-settings-loader.md) — Extract shared settings loader
- [003-remove-ds-store.md](./003-remove-ds-store.md) — Remove .DS_Store files
- [004-pin-dependencies.md](./004-pin-dependencies.md) — Pin git dependencies to commits/tags

**Success Criteria**:
- ✅ Shared utilities exist in `extensions/shared/`
- ✅ At least 3 extensions use the shared utilities
- ✅ No .DS_Store files in git
- ✅ All dependencies pinned

---

### Phase 2: Test Coverage (Week 2-3)
Add tests for the largest and most security-critical extensions. This enables safe refactoring in Phase 4.

**Issues**:
- [005-test-artifact-read.md](./005-test-artifact-read.md) — Add tests for artifact-read
- [006-test-lsp-bridge.md](./006-test-lsp-bridge.md) — Add tests for lsp-bridge
- [007-test-contrib-gate.md](./007-test-contrib-gate.md) — Add tests for contrib-gate
- [008-expand-permission-gate-tests.md](./008-expand-permission-gate-tests.md) — Expand permission-gate test coverage

**Success Criteria**:
- ✅ 4 new test files created
- ✅ Test coverage for core extensions reaches 60%
- ✅ All tests pass in CI

---

### Phase 3: Code Quality (Week 4)
Improve code consistency and documentation across all extensions.

**Issues**:
- [009-standardize-errors.md](./009-standardize-errors.md) — Standardize error handling
- [010-add-jsdoc.md](./010-add-jsdoc.md) — Add JSDoc comments to public functions
- [011-extract-constants.md](./011-extract-constants.md) — Extract magic numbers into constants
- [012-simplify-shell-split.md](./012-simplify-shell-split.md) — Simplify shell word splitting

**Success Criteria**:
- ✅ Consistent error format across extensions
- ✅ All exported functions have JSDoc
- ✅ No magic numbers in code
- ✅ Shell parsing is well-documented and tested

---

### Phase 4: Architecture (Week 5-6)
Refactor large monolithic extensions into smaller, focused modules. Requires test coverage from Phase 2.

**Issues**:
- [013-split-artifact-read.md](./013-split-artifact-read.md) — Split artifact-read into handlers
- [014-refactor-permission-gate.md](./014-refactor-permission-gate.md) — Refactor permission-gate into pipeline stages
- [015-consolidate-skills.md](./015-consolidate-skills.md) — Consolidate skill categories
- [016-document-dependency-direction.md](./016-document-dependency-direction.md) — Document extension dependency layers

**Success Criteria**:
- ✅ artifact-read split into 6+ modules
- ✅ permission-gate split into 5+ pipeline stages
- ✅ Skills organized into 6 categories
- ✅ Dependency direction documented in architecture.md

---

### Phase 5: Cleanup (Week 7)
Address dead code, unused exports, and integration testing.

**Issues**:
- [017-investigate-isolated-nodes.md](./017-investigate-isolated-nodes.md) — Investigate 992 isolated graph nodes
- [018-audit-unused-exports.md](./018-audit-unused-exports.md) — Audit and remove unused exports
- [019-consolidate-issue-numbers.md](./019-consolidate-issue-numbers.md) — Consolidate duplicate issue numbers
- [020-add-integration-tests.md](./020-add-integration-tests.md) — Add integration tests

**Success Criteria**:
- ✅ Isolated nodes reduced by 50%
- ✅ Unused exports documented or removed
- ✅ Issue numbers globally unique
- ✅ At least 3 integration tests

---

## Dependency Graph

```
Phase 1 (Foundation)
  ├─→ Phase 2 (Tests)
  │     └─→ Phase 4 (Architecture)
  └─→ Phase 3 (Code Quality)
        └─→ Phase 5 (Cleanup)
```

**Critical Path**: Phase 1 → Phase 2 → Phase 4

---

## Risk Assessment

| Phase | Risk Level | Mitigation |
|-------|------------|------------|
| Phase 1 | Low | Pure refactoring, no behavior changes |
| Phase 2 | Low | Additive only, no production code changes |
| Phase 3 | Low | Documentation and consistency improvements |
| Phase 4 | Medium | Requires careful module boundary design |
| Phase 5 | Medium | May discover unexpected dependencies |

---

## Success Metrics

**Quantitative**:
- Test coverage: 7.25% → 60% (core extensions)
- Lines of duplicated code: ~140 → 0
- Average extension size: 456 lines → <300 lines
- Graph isolated nodes: 992 → <500

**Qualitative**:
- Extensions have clear single responsibilities
- Shared utilities are well-documented and tested
- Settings schema is explicit and type-safe
- Skill categories are intuitive and discoverable

---

## Tracking

Progress will be tracked in the task tracker. Each issue file contains:
- Detailed acceptance criteria
- Files to modify
- Testing strategy
- Estimated effort

**Current Status**: 📋 Planning complete, ready for implementation
