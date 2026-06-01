# Issue 019: Consolidate Duplicate Issue Numbers

**Priority**: P3 — Low Impact / Low Risk  
**Phase**: 5 (Cleanup)  
**Estimated Effort**: 2-3 hours  
**Confidence**: High

---

## Problem Statement

The `.scratch/` directory contains issues with duplicate numbers across subdirectories:

```
.scratch/
  ai-harness-akita/
    001-starter-kit-doctor.md
    002-agent-discoverability-routing.md
    ...
    012-artifact-read-archive-preview-hardening.md
  pi-dev-starter-kit/
    001-package-scaffold.md
    ...
    012-project-templates.md
  rtk-rewrite/
    001-rtk-installed-configured-preflight.md
    ...
```

**Problems**:
- Confusion when referencing issues (which "012"?)
- Hard to find issues by number
- No global issue ordering
- Difficult to track progress across projects

---

## Acceptance Criteria

- [x] Audit all issues in `.scratch/`
- [x] Choose strategy: flatten or renumber (chosen: scoped IDs with existing subdirectories preserved)
- [x] If flatten: Move all issues to `.scratch/` root with unique numbers (not applicable; strategy rejected to preserve active links)
- [x] If renumber: Keep subdirectories but use global numbering (implemented as scoped IDs: `starter-###`, `refactor-###`, `akita-###`, `rtk-###`)
- [x] Update all cross-references in documentation
- [x] Update `AGENTS.md` issue tracker section
- [x] Create `.scratch/INDEX.md` with full issue list
- [x] Verify no broken links

---

## Files to Modify

### Directory Restructure
- `.scratch/` — Flatten or renumber issues

### New Files
- `.scratch/INDEX.md` — Master issue index

### Modified Files
- `AGENTS.md` — Update issue tracker section
- `docs/architecture.md` — Update issue references
- `README.md` — Update issue references
- Various `.scratch/*.md` files — Update cross-references

---

## Implementation Approach

### Option A: Flatten Directory (Recommended)

Move all issues to `.scratch/` root with globally unique numbers:

```
.scratch/
  INDEX.md
  001-package-scaffold.md
  002-install-dependencies.md
  003-permission-gate.md
  ...
  050-artifact-read-archive-hardening.md
  051-project-templates.md
  ...
```

**Pros**:
- Simple, flat structure
- Easy to find issues by number
- No ambiguity
- Standard issue tracker pattern

**Cons**:
- Loses project grouping
- May have 100+ files in one directory

### Option B: Keep Subdirectories with Global Numbering

Keep subdirectories but use global numbers:

```
.scratch/
  INDEX.md
  pi-dev-starter-kit/
    001-package-scaffold.md
    002-install-dependencies.md
    ...
  ai-harness-akita/
    020-starter-kit-doctor.md
    021-agent-discoverability.md
    ...
  rtk-rewrite/
    040-rtk-installed-preflight.md
    ...
```

**Pros**:
- Preserves project grouping
- Still has unique numbers
- Easier to manage large projects

**Cons**:
- More complex structure
- Need to know which subdirectory an issue is in

### Recommended: Option A (Flatten)

For this project, flattening is simpler and more standard.

---

## Implementation Steps

### 1. Audit Current Issues

```bash
# List all issues
find .scratch -name "*.md" -type f | sort

# Count issues per subdirectory
find .scratch -name "*.md" -type f | cut -d'/' -f2 | sort | uniq -c
```

**Expected output**:
```
  20 .scratch/ai-harness-akita/
  17 .scratch/pi-dev-starter-kit/
   6 .scratch/rtk-rewrite/
  43 total
```

### 2. Create Renumbering Plan

Create a mapping:

```markdown
## Issue Renumbering Plan

| Old Path | New Number | New Path |
|----------|------------|----------|
| pi-dev-starter-kit/001-package-scaffold.md | 001 | 001-package-scaffold.md |
| pi-dev-starter-kit/002-install-dependencies.md | 002 | 002-install-dependencies.md |
| pi-dev-starter-kit/003-permission-gate.md | 003 | 003-permission-gate.md |
| ... | ... | ... |
| ai-harness-akita/001-starter-kit-doctor.md | 020 | 020-starter-kit-doctor.md |
| ai-harness-akita/002-agent-discoverability.md | 021 | 021-agent-discoverability.md |
| ... | ... | ... |
| rtk-rewrite/001-rtk-installed-preflight.md | 040 | 040-rtk-installed-preflight.md |
| ... | ... | ... |
```

### 3. Move and Rename Files

```bash
# Create backup
cp -r .scratch .scratch-backup

# Move pi-dev-starter-kit issues (001-019)
mv .scratch/pi-dev-starter-kit/001-package-scaffold.md .scratch/001-package-scaffold.md
mv .scratch/pi-dev-starter-kit/002-install-dependencies.md .scratch/002-install-dependencies.md
# ... etc

# Move ai-harness-akita issues (020-039)
mv .scratch/ai-harness-akita/001-starter-kit-doctor.md .scratch/020-starter-kit-doctor.md
mv .scratch/ai-harness-akita/002-agent-discoverability.md .scratch/021-agent-discoverability.md
# ... etc

# Move rtk-rewrite issues (040-045)
mv .scratch/rtk-rewrite/001-rtk-installed-preflight.md .scratch/040-rtk-installed-preflight.md
# ... etc

# Remove empty subdirectories
rmdir .scratch/pi-dev-starter-kit
rmdir .scratch/ai-harness-akita
rmdir .scratch/rtk-rewrite

# Remove backup after verification
rm -rf .scratch-backup
```

### 4. Update Cross-References

Search for old issue references:

```bash
# Find references to old issue paths
grep -r "pi-dev-starter-kit/001" . --include="*.md"
grep -r "ai-harness-akita/001" . --include="*.md"
grep -r "rtk-rewrite/001" . --include="*.md"

# Find references to issue numbers
grep -r "issue 001" . --include="*.md"
grep -r "#001" . --include="*.md"
```

Update references:

```markdown
<!-- Before -->
See [001-package-scaffold](./pi-dev-starter-kit/001-package-scaffold.md)

<!-- After -->
See [001-package-scaffold](./001-package-scaffold.md)
```

### 5. Create INDEX.md

Create `.scratch/INDEX.md`:

```markdown
# Issue Tracker Index

**Total issues**: 43  
**Last updated**: 2026-05-29

---

## By Status

### In Progress (5)
- [003-permission-gate.md](./003-permission-gate.md) — Implement permission-gate extension
- [020-starter-kit-doctor.md](./020-starter-kit-doctor.md) — Implement starter-kit-doctor
- ...

### Completed (30)
- [001-package-scaffold.md](./001-package-scaffold.md) — Package scaffold + SYSTEM.md ✅
- [002-install-dependencies.md](./002-install-dependencies.md) — Install dependencies ✅
- ...

### Blocked (3)
- [040-rtk-installed-preflight.md](./040-rtk-installed-preflight.md) — Blocked by rtk installation
- ...

### Not Started (5)
- [050-artifact-read-archive-hardening.md](./050-artifact-read-archive-hardening.md) — Archive preview hardening
- ...

---

## By Category

### Foundation (001-010)
- [001-package-scaffold.md](./001-package-scaffold.md) — Package scaffold
- [002-install-dependencies.md](./002-install-dependencies.md) — Install dependencies
- ...

### Extensions (011-030)
- [003-permission-gate.md](./003-permission-gate.md) — Permission gate
- [004-post-edit-lint.md](./004-post-edit-lint.md) — Post-edit lint
- ...

### Skills (031-040)
- [031-plan-mode-skill.md](./031-plan-mode-skill.md) — Plan mode skill
- [032-self-verify-skill.md](./032-self-verify-skill.md) — Self-verify skill
- ...

### Integration (041-050)
- [041-ai-memory-integration.md](./041-ai-memory-integration.md) — ai-memory integration
- [050-artifact-read-archive-hardening.md](./050-artifact-read-archive-hardening.md) — Archive hardening
- ...

---

## By Priority

### P0 — Critical (3)
- [003-permission-gate.md](./003-permission-gate.md) — Security critical
- ...

### P1 — High (15)
- [001-package-scaffold.md](./001-package-scaffold.md) — Foundation
- ...

### P2 — Medium (20)
- [031-plan-mode-skill.md](./031-plan-mode-skill.md) — Workflow skill
- ...

### P3 — Low (5)
- [050-artifact-read-archive-hardening.md](./050-artifact-read-archive-hardening.md) — Enhancement
- ...
```

### 6. Update AGENTS.md

```markdown
## Issue Tracker

Issues live in `.scratch/` with globally unique numbers.

**Index**: See [.scratch/INDEX.md](./.scratch/INDEX.md) for full list.

**Naming**: `NNN-title.md` where NNN is a 3-digit number.

**Status**: Each issue file contains a status field:
- `not-started`
- `in-progress`
- `blocked`
- `completed`

**Referencing**: Use relative links:
```markdown
See [003-permission-gate](./.scratch/003-permission-gate.md)
```
```

### 7. Verify

```bash
# Check for broken links
grep -r "\.scratch/" . --include="*.md" | grep -v "Binary file"

# Verify all issues are in INDEX.md
ls .scratch/*.md | wc -l  # Should match total in INDEX.md

# Run any link checker tools if available
```

---

## Testing Strategy

1. **Link validation**: Check for broken links
2. **Completeness**: Verify all issues are in INDEX.md
3. **Uniqueness**: Verify no duplicate numbers
4. **Documentation**: Verify AGENTS.md is updated

---

## Risk Assessment

**Risk Level**: Low

**Mitigations**:
- Create backup before moving
- Update references systematically
- Verify links after changes
- Keep git history (can revert)

**Potential Issues**:
- May miss some cross-references
- Broken links in documentation
- Confusion during transition

---

## Success Metrics

- ✅ All issues have unique numbers
- ✅ Flat directory structure (or organized subdirectories)
- ✅ INDEX.md lists all issues
- ✅ No broken links
- ✅ AGENTS.md updated

---

## Tools

- **markdown-link-check**: Validates markdown links
- **find**: Search for files
- **grep**: Search for references

```bash
# Install markdown-link-check
npm install -g markdown-link-check

# Check all markdown files
find . -name "*.md" -exec markdown-link-check {} \;
```

---

## References

- `REFACTORING_REVIEW.md` — Section 5.4
- `.scratch/` — Current issue structure
- Issue tracker best practices: https://docs.github.com/en/issues/tracking-your-work-with-issues
