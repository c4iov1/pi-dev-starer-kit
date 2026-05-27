# 011 — Security hardening fixes before commit

Status: ready-for-agent
Priority: P0 BLOCKER
Type: security fixes + verification

## Context

A review of the completed ai-harness-akita implementation found that the new TypeScript files compile individually, and `npm run test:loop-protection` passes. However, the implementation is **not safe to commit/push yet** because several new tools bypass the permission pipeline or build shell commands via string interpolation.

Relevant files:

- `extensions/artifact-read/index.ts`
- `extensions/ast-tools/index.ts`
- `extensions/source-navigation/index.ts`
- `extensions/lsp-bridge/index.ts`
- `extensions/starter-kit-doctor/index.ts`
- `SYSTEM.md`
- `templates/settings.template.json`
- `README.md`

## Blocking findings

### 1. `ast_edit` bypasses permission pipeline

File: `extensions/ast-tools/index.ts`

Problem:

- `ast_edit` with `dryRun=false` executes ast-grep with `--update-all` internally.
- This writes files from inside the extension.
- The comments/tool description claim it is “gated through the permission pipeline”, but internal writes do **not** automatically go through Pi's normal `edit` tool permission gate.

Required fix:

- Make `ast_edit` preview-only for now, or implement an explicit permission API if Pi exposes one.
- Recommended safest fix: force `dryRun=true` always and return a patch/instructions for the agent to apply with normal `edit` after user approval.
- Remove/adjust any claim that non-dry-run is permission-gated unless it is actually enforced.

Acceptance:

- `ast_edit` cannot modify files directly.
- Tool description says it previews structural rewrites and the agent must apply approved changes via `edit`.

### 2. `edit_at_anchor` bypasses permission pipeline

File: `extensions/source-navigation/index.ts`

Problem:

- `edit_at_anchor` calls `writeFileSync` directly.
- This bypasses write constraints and permission-gate.

Required fix:

- Convert `edit_at_anchor` to preview-only, returning:
  - anchor validation result
  - exact range
  - `oldText`
  - proposed `newText`
  - instruction to apply via normal `edit`
- Or remove the tool until a real permission-gated write path exists.

Acceptance:

- `source-navigation` performs no direct writes.
- Stale anchor detection still works.
- The agent can use the output to call normal `edit` safely.

### 3. Shell command injection risks in `artifact-read`

File: `extensions/artifact-read/index.ts`

Problem examples:

- Uses `execSync` with interpolated command strings for SQLite/archive operations.
- Archive paths and archive entry names can contain shell metacharacters.
- `unzip -p ... > ...` uses shell redirection with untrusted names.
- SQLite command string quoting is not robust.

Required fix:

- Replace shell-string `execSync(...)` with `execFileSync` or `spawnSync` using argument arrays.
- Never use shell redirection. Capture stdout directly.
- Path-confine before every filesystem/archive operation.
- Treat archive entry names as untrusted; never interpolate into shell strings.
- Keep extract-preview read-only and temp-confined.

Acceptance:

- No `execSync` shell string interpolation remains for untrusted path/query/archive values.
- Archive preview cannot write outside temp dir.
- SQLite invocation uses argument array, e.g. `execFileSync("sqlite3", ["-readonly", "-batch", ..., dbPath, sql])`.

### 4. Shell injection/path confinement risks in `ast-tools`

File: `extensions/ast-tools/index.ts`

Problem:

- Builds command strings like `${binary} ${args.map((a) => `'${a}'`).join(" ")}`.
- Patterns/replacements/paths can contain quotes or shell metacharacters.
- Paths are not clearly confined to workspace root.

Required fix:

- Use `execFileSync`/`spawnSync` with argument arrays.
- Validate every provided path is inside workspace root.
- Avoid direct update mode as described in finding #1.

Acceptance:

- No shell string construction for ast-grep execution.
- Paths outside workspace are rejected.

### 5. `starter-kit-doctor` should avoid shell strings where possible

File: `extensions/starter-kit-doctor/index.ts`

Problem:

- Uses `execSync(check)` strings for fixed binary checks. This is lower risk because commands are constants, but it is still better to use command/args arrays.

Required fix:

- Optional but recommended: represent checks as `{ command, args }` and call `spawnSync`/`execFileSync`.

Acceptance:

- No user-controlled shell strings.

### 6. Full extension TypeScript check currently fails on pre-existing `auto-memory`

Command:

```bash
for f in extensions/*/index.ts; do npx tsc "$f" --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck || exit 1; done
```

Observed failure:

- `extensions/auto-memory/index.ts` has existing type errors (`params` typed unknown, unsupported hook name).

Required handling:

- Do not block this hardening task on unrelated pre-existing auto-memory unless you choose to fix it.
- But document verification results clearly.
- At minimum, all new/modified Akita extensions must compile individually:

```bash
npx tsc extensions/starter-kit-doctor/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/artifact-read/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/ast-tools/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/source-navigation/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/lsp-bridge/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npm run test:loop-protection
```

## Non-goals

- Do not add automatic installers.
- Do not loosen path confinement.
- Do not rely on comments claiming permission-gating; enforce it or make tools preview-only.
- Do not remove agent discoverability/routing work unless replacing it with better wording.

## Final acceptance criteria

- New tools cannot directly mutate files except through a verified permission-gated path. If no such API exists, they must be preview-only.
- No user-controlled values are interpolated into shell command strings.
- Tool descriptions accurately describe safety behavior.
- Akita extension TypeScript checks pass.
- `npm run test:loop-protection` passes.
- `git diff` shows no misleading claims about permission-gating.
