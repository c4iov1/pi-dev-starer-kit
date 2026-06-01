# Scratch Issue Index

This index resolves duplicate local issue numbers across `.scratch/*/` subdirectories without moving active issue files.

## Numbering strategy

Use **scoped issue IDs** instead of flattening files:

- `akita-###` for `.scratch/ai-harness-akita/`
- `starter-###` for `.scratch/pi-dev-starter-kit/`
- `refactor-###` for `.scratch/refactore/`
- `rtk-###` for `.scratch/rtk-rewrite/`

This preserves project grouping and avoids breaking active links while removing ambiguity in conversation references.

## Issues

| Scoped ID | Path | Title |
|---|---|---|
| `akita-000` | [`.scratch/ai-harness-akita/000-index.md`](./ai-harness-akita/000-index.md) | ai-harness-akita — Implementation Task Index |
| `akita-001` | [`.scratch/ai-harness-akita/001-starter-kit-doctor.md`](./ai-harness-akita/001-starter-kit-doctor.md) | 001 — Implement `starter-kit-doctor` extension |
| `akita-002` | [`.scratch/ai-harness-akita/002-agent-discoverability-routing.md`](./ai-harness-akita/002-agent-discoverability-routing.md) | 002 — Add agent discoverability and routing for new capabilities |
| `akita-003` | [`.scratch/ai-harness-akita/003-artifact-read-phase-1.md`](./ai-harness-akita/003-artifact-read-phase-1.md) | 003 — Implement `artifact-read` extension, phase 1 |
| `akita-004` | [`.scratch/ai-harness-akita/004-ast-tools.md`](./ai-harness-akita/004-ast-tools.md) | 004 — Implement `ast-tools` extension |
| `akita-005` | [`.scratch/ai-harness-akita/005-lsp-symbol-operations.md`](./ai-harness-akita/005-lsp-symbol-operations.md) | 005 — Upgrade `lsp-bridge` with symbol operations |
| `akita-006` | [`.scratch/ai-harness-akita/006-source-navigation-anchors.md`](./ai-harness-akita/006-source-navigation-anchors.md) | 006 — Implement source navigation: `read_ranges` and `edit_at_anchor` |
| `akita-007` | [`.scratch/ai-harness-akita/007-steering-profiles.md`](./ai-harness-akita/007-steering-profiles.md) | 007 — Add steering, interrupt, and compaction profiles |
| `akita-008` | [`.scratch/ai-harness-akita/008-review-matrix-skill.md`](./ai-harness-akita/008-review-matrix-skill.md) | 008 — Implement `review-matrix` skill and prompt |
| `akita-009` | [`.scratch/ai-harness-akita/009-provider-guidance.md`](./ai-harness-akita/009-provider-guidance.md) | 009 — Add provider/subscription guidance doc |
| `akita-010` | [`.scratch/ai-harness-akita/010-integration-docs-tests.md`](./ai-harness-akita/010-integration-docs-tests.md) | 010 — Final integration, docs, and tests for ai-harness-akita work |
| `akita-011` | [`.scratch/ai-harness-akita/011-security-hardening-fixes.md`](./ai-harness-akita/011-security-hardening-fixes.md) | 011 — Security hardening fixes before commit |
| `akita-012` | [`.scratch/ai-harness-akita/012-artifact-read-archive-preview-hardening.md`](./ai-harness-akita/012-artifact-read-archive-preview-hardening.md) | 012 — Harden `artifact_read` archive preview before commit |
| `starter-001` | [`.scratch/pi-dev-starter-kit/001-package-scaffold.md`](./pi-dev-starter-kit/001-package-scaffold.md) | 001 — Package scaffold + SYSTEM.md |
| `starter-002` | [`.scratch/pi-dev-starter-kit/002-fork-dependencies.md`](./pi-dev-starter-kit/002-fork-dependencies.md) | 002 — Install and verify direct dependencies |
| `starter-003` | [`.scratch/pi-dev-starter-kit/003-extension-permission-gate.md`](./pi-dev-starter-kit/003-extension-permission-gate.md) | 003 — Extension: permission-gate |
| `starter-004` | [`.scratch/pi-dev-starter-kit/004-extension-post-edit-lint.md`](./pi-dev-starter-kit/004-extension-post-edit-lint.md) | 004 — Extension: post-edit-lint |
| `starter-005` | [`.scratch/pi-dev-starter-kit/005-extension-loop-protection.md`](./pi-dev-starter-kit/005-extension-loop-protection.md) | 005 — Extension: loop-protection |
| `starter-006` | [`.scratch/pi-dev-starter-kit/006-extension-task-tracker.md`](./pi-dev-starter-kit/006-extension-task-tracker.md) | 006 — Extension: task-tracker |
| `starter-007` | [`.scratch/pi-dev-starter-kit/007-extension-lsp-bridge.md`](./pi-dev-starter-kit/007-extension-lsp-bridge.md) | 007 — Extension: lsp-bridge |
| `starter-008` | [`.scratch/pi-dev-starter-kit/008-extension-monitor-bash.md`](./pi-dev-starter-kit/008-extension-monitor-bash.md) | 008 — Extension: monitor-bash |
| `starter-009` | [`.scratch/pi-dev-starter-kit/009-skills-plan-verify.md`](./pi-dev-starter-kit/009-skills-plan-verify.md) | 009 — Skills: plan-mode + self-verify |
| `starter-010` | [`.scratch/pi-dev-starter-kit/010-skills-capabilities.md`](./pi-dev-starter-kit/010-skills-capabilities.md) | 010 — Skills: web-research + browser-testing + subagent-delegation + mcp-orchestration |
| `starter-011` | [`.scratch/pi-dev-starter-kit/011-integrate-mattpocock-skills.md`](./pi-dev-starter-kit/011-integrate-mattpocock-skills.md) | 011 — Integrate mattpocock/skills (14 skills) |
| `starter-012` | [`.scratch/pi-dev-starter-kit/012-project-templates.md`](./pi-dev-starter-kit/012-project-templates.md) | 012 — Project templates |
| `starter-013` | [`.scratch/pi-dev-starter-kit/013-readme-smoke-test.md`](./pi-dev-starter-kit/013-readme-smoke-test.md) | 013 — README + cross-model smoke test |
| `starter-014` | [`.scratch/pi-dev-starter-kit/014-publication-release.md`](./pi-dev-starter-kit/014-publication-release.md) | 014 — Kit publication + release |
| `starter-015` | [`.scratch/pi-dev-starter-kit/015-extension-contrib-gate.md`](./pi-dev-starter-kit/015-extension-contrib-gate.md) | 015 — Extension: contrib-gate |
| `starter-016` | [`.scratch/pi-dev-starter-kit/016-extension-auto-memory.md`](./pi-dev-starter-kit/016-extension-auto-memory.md) | 016 — Extension: auto-memory |
| `starter-017` | [`.scratch/pi-dev-starter-kit/017-ai-memory-integration-plan.md`](./pi-dev-starter-kit/017-ai-memory-integration-plan.md) | 017 — Plano: integração ai-memory (Akita) |
| `refactor-001` | [`.scratch/refactore/001-extract-path-utils.md`](./refactore/001-extract-path-utils.md) | Issue 001: Extract Shared Path Confinement Utility |
| `refactor-002` | [`.scratch/refactore/002-extract-settings-loader.md`](./refactore/002-extract-settings-loader.md) | Issue 002: Extract Shared Settings Loader |
| `refactor-003` | [`.scratch/refactore/003-remove-ds-store.md`](./refactore/003-remove-ds-store.md) | Issue 003: Remove .DS_Store Files |
| `refactor-004` | [`.scratch/refactore/004-pin-dependencies.md`](./refactore/004-pin-dependencies.md) | Issue 004: Pin Git Dependencies to Specific Commits/Tags |
| `refactor-005` | [`.scratch/refactore/005-test-artifact-read.md`](./refactore/005-test-artifact-read.md) | Issue 005: Add Tests for artifact-read Extension |
| `refactor-006` | [`.scratch/refactore/006-test-lsp-bridge.md`](./refactore/006-test-lsp-bridge.md) | Issue 006: Add Tests for lsp-bridge Extension |
| `refactor-007` | [`.scratch/refactore/007-test-contrib-gate.md`](./refactore/007-test-contrib-gate.md) | Issue 007: Add Tests for contrib-gate Extension |
| `refactor-008` | [`.scratch/refactore/008-expand-permission-gate-tests.md`](./refactore/008-expand-permission-gate-tests.md) | Issue 008: Expand permission-gate Test Coverage |
| `refactor-009` | [`.scratch/refactore/009-standardize-errors.md`](./refactore/009-standardize-errors.md) | Issue 009: Standardize Error Handling Across Extensions |
| `refactor-010` | [`.scratch/refactore/010-add-jsdoc.md`](./refactore/010-add-jsdoc.md) | Issue 010: Add JSDoc Comments to Public Functions |
| `refactor-011` | [`.scratch/refactore/011-extract-constants.md`](./refactore/011-extract-constants.md) | Issue 011: Extract Magic Numbers into Constants |
| `refactor-012` | [`.scratch/refactore/012-simplify-shell-split.md`](./refactore/012-simplify-shell-split.md) | Issue 012: Simplify Shell Word Splitting in permission-gate |
| `refactor-013` | [`.scratch/refactore/013-split-artifact-read.md`](./refactore/013-split-artifact-read.md) | Issue 013: Split artifact-read into Handler Modules |
| `refactor-014` | [`.scratch/refactore/014-refactor-permission-gate.md`](./refactore/014-refactor-permission-gate.md) | Issue 014: Refactor permission-gate into Pipeline Stages |
| `refactor-015` | [`.scratch/refactore/015-consolidate-skills.md`](./refactore/015-consolidate-skills.md) | Issue 015: Consolidate Skill Categories |
| `refactor-016` | [`.scratch/refactore/016-document-dependency-direction.md`](./refactore/016-document-dependency-direction.md) | Issue 016: Document Extension Dependency Direction |
| `refactor-017` | [`.scratch/refactore/017-investigate-isolated-nodes.md`](./refactore/017-investigate-isolated-nodes.md) | Issue 017: Investigate 992 Isolated Graph Nodes |
| `refactor-018` | [`.scratch/refactore/018-audit-unused-exports.md`](./refactore/018-audit-unused-exports.md) | Issue 018: Audit and Remove Unused Exports |
| `refactor-019` | [`.scratch/refactore/019-consolidate-issue-numbers.md`](./refactore/019-consolidate-issue-numbers.md) | Issue 019: Consolidate Duplicate Issue Numbers |
| `refactor-020` | [`.scratch/refactore/020-add-integration-tests.md`](./refactore/020-add-integration-tests.md) | Issue 020: Add Integration Tests |
| `refactor-README` | [`.scratch/refactore/README.md`](./refactore/README.md) | Refactoring Implementation Plan |
| `rtk-001` | [`.scratch/rtk-rewrite/001-rtk-installed-configured-preflight.md`](./rtk-rewrite/001-rtk-installed-configured-preflight.md) | 001 — RTK rewrite: installed/configured preflight |
| `rtk-002` | [`.scratch/rtk-rewrite/002-extension-rtk-rewrite.md`](./rtk-rewrite/002-extension-rtk-rewrite.md) | 002 — Extension: rtk-rewrite |
| `rtk-003` | [`.scratch/rtk-rewrite/003-rtk-commands-and-doctor.md`](./rtk-rewrite/003-rtk-commands-and-doctor.md) | 003 — RTK commands and doctor integration |
| `rtk-004` | [`.scratch/rtk-rewrite/004-settings-default-enable-and-tests.md`](./rtk-rewrite/004-settings-default-enable-and-tests.md) | 004 — RTK settings defaults and tests |
| `rtk-005` | [`.scratch/rtk-rewrite/005-docs-readme-architecture-prd.md`](./rtk-rewrite/005-docs-readme-architecture-prd.md) | 005 — Document RTK rewrite integration |
| `rtk-006` | [`.scratch/rtk-rewrite/006-end-to-end-validation.md`](./rtk-rewrite/006-end-to-end-validation.md) | 006 — RTK rewrite end-to-end validation |
