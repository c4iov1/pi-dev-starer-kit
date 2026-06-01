# Issue 004: Pin Git Dependencies to Specific Commits/Tags

**Priority**: P1 — High Impact / Low Risk  
**Phase**: 1 (Foundation)  
**Estimated Effort**: 1-2 hours  
**Confidence**: High

---

## Problem Statement

All dependencies in `package.json` are `git+https://` URLs with no version pinning:

```json
"dependencies": {
  "context-mode": "git+https://github.com/mksglu/context-mode.git",
  "pi-agent-browser-native": "git+https://github.com/fitchmultz/pi-agent-browser-native.git",
  "pi-mcp-adapter": "git+https://github.com/nicobailon/pi-mcp-adapter.git",
  "pi-graphify": "git+ssh://git@github.com/c4iov1/pi-graphify.git",
  "pi-subagents": "git+https://github.com/nicobailon/pi-subagents.git",
  "pi-web-access": "git+https://github.com/nicobailon/pi-web-access.git"
}
```

**Risks**:
- `npm install` pulls the latest commit from `main`/`master`
- Breaking changes can be introduced without notice
- Builds are not reproducible across time
- Security vulnerabilities may be introduced silently

---

## Acceptance Criteria

- [x] Check each repository for tags/releases
- [x] Pin dependencies to specific commits or semver tags
- [x] Update `package.json` with pinned versions
- [x] Run `npm install` to update `package-lock.json`
- [x] Verify all extensions still load correctly
- [x] Document the pinning strategy in `README.md`

---

## Files to Modify

### Modified Files
- `package.json` — Pin dependencies
- `package-lock.json` — Regenerate with pinned versions
- `README.md` — Document dependency strategy (optional)

---

## Implementation Approach

### 1. Check Each Repository for Tags

For each dependency, check if the repository has tags or releases:

```bash
# context-mode
git ls-remote --tags https://github.com/mksglu/context-mode.git

# pi-agent-browser-native
git ls-remote --tags https://github.com/fitchmultz/pi-agent-browser-native.git

# pi-mcp-adapter
git ls-remote --tags https://github.com/nicobailon/pi-mcp-adapter.git

# pi-graphify
git ls-remote --tags git@github.com:c4iov1/pi-graphify.git

# pi-subagents
git ls-remote --tags https://github.com/nicobailon/pi-subagents.git

# pi-web-access
git ls-remote --tags https://github.com/nicobailon/pi-web-access.git
```

### 2. Determine Current Commit

Check what commit is currently installed:

```bash
# For each dependency
cat node_modules/context-mode/package.json | grep version
cd node_modules/context-mode && git rev-parse HEAD
```

### 3. Pin Dependencies

**Option A: Pin to Tags (Preferred)**

If the repository has semver tags:
```json
{
  "dependencies": {
    "context-mode": "git+https://github.com/mksglu/context-mode.git#v1.2.3",
    "pi-agent-browser-native": "git+https://github.com/fitchmultz/pi-agent-browser-native.git#v0.5.0"
  }
}
```

**Option B: Pin to Commits (Fallback)**

If no tags exist, pin to the current commit:
```json
{
  "dependencies": {
    "context-mode": "git+https://github.com/mksglu/context-mode.git#a1b2c3d4e5f6",
    "pi-agent-browser-native": "git+https://github.com/fitchmultz/pi-agent-browser-native.git#f6e5d4c3b2a1"
  }
}
```

**Option C: Pin to Branch (Temporary)**

If actively developing against a branch:
```json
{
  "dependencies": {
    "context-mode": "git+https://github.com/mksglu/context-mode.git#main"
  }
}
```

### 4. Update package.json

```json
{
  "dependencies": {
    "context-mode": "git+https://github.com/mksglu/context-mode.git#<TAG_OR_COMMIT>",
    "pi-agent-browser-native": "git+https://github.com/fitchmultz/pi-agent-browser-native.git#<TAG_OR_COMMIT>",
    "pi-mcp-adapter": "git+https://github.com/nicobailon/pi-mcp-adapter.git#<TAG_OR_COMMIT>",
    "pi-graphify": "git+ssh://git@github.com/c4iov1/pi-graphify.git#<TAG_OR_COMMIT>",
    "pi-subagents": "git+https://github.com/nicobailon/pi-subagents.git#<TAG_OR_COMMIT>",
    "pi-web-access": "git+https://github.com/nicobailon/pi-web-access.git#<TAG_OR_COMMIT>"
  }
}
```

### 5. Regenerate Lock File

```bash
rm -rf node_modules package-lock.json
npm install
```

### 6. Verify

```bash
# Check that all extensions load
pi --version

# Run existing tests
npm run test:loop-protection
npm run test:permission-gate
npm run test:rtk-rewrite
```

---

## Testing Strategy

1. **Installation test**: Clean install from scratch (`rm -rf node_modules && npm install`)
2. **Extension loading**: Verify all 15 extensions load without errors
3. **Existing tests**: Run all test suites

---

## Risk Assessment

**Risk Level**: Low

**Mitigations**:
- Test with pinned versions before committing
- Document the current commit hash in case rollback is needed
- Keep `package-lock.json` in version control

**Potential Issues**:
- Some repositories may not have tags (use commit hashes)
- Pinned versions may become outdated (set up Dependabot or similar)

---

## Success Metrics

- ✅ All dependencies pinned to specific commits or tags
- ✅ Reproducible builds (same versions across installs)
- ✅ `package-lock.json` committed to git
- ✅ All tests pass

---

## Future Improvements

1. **Dependabot**: Set up GitHub Dependabot to create PRs for dependency updates
2. **Renovate**: Alternative to Dependabot with more configuration options
3. **Version tags**: Encourage upstream maintainers to create semver tags
4. **Fork and publish**: For critical dependencies, consider forking and publishing to npm

---

## References

- `REFACTORING_REVIEW.md` — Section 5.2
- `package.json` — Current dependencies
- npm documentation: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#git-urls-as-dependencies
