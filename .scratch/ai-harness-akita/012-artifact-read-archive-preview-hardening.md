# 012 — Harden `artifact_read` archive preview before commit

Status: ready-for-agent
Priority: P0 BLOCKER
Type: security hardening

## Context

Recheck after task 011 shows most security fixes landed:

- `ast_edit` is now preview-only and no longer uses `--update-all`.
- `edit_at_anchor` is now preview-only and no longer calls `writeFileSync`.
- New Akita extensions compile individually.
- `npm run test:loop-protection` passes.

Remaining blocker is in `extensions/artifact-read/index.ts` archive preview.

## Blocking issue

File: `extensions/artifact-read/index.ts`

Current `previewArchive()` still extracts archive entries to a temp directory for tar/tar.gz:

```ts
runSpawnOrThrow("tar", [extractFlag, filePath, "-C", tmpDir, f], ...)
const content = readFileSync(join(tmpDir, f), "utf-8")
```

This is risky because archive entry names are untrusted. Entries containing `../`, absolute paths, symlinks, or other path traversal tricks may write outside the intended temp directory or cause reads outside the intended location depending on tar behavior/platform.

The tool is documented as read-only. Archive preview should not extract files to disk at all.

## Required fix

Change archive preview to read entry contents from stdout only:

### ZIP

Current zip preview writes stdout to a temp file with `writeFileSync`, then reads it back. Replace with direct stdout use:

```ts
const content = runSpawnOrThrow("unzip", ["-p", filePath, name], { timeout: 5000 });
previews.push(`--- ${name} ---`);
previews.push(trimOutput(content, 20));
```

No temp file needed.

### TAR / TAR.GZ

Do **not** extract to temp directory. Use tar stdout mode:

- tar: `tar -xOf <archive> <entry>`
- tar.gz: `tar -xzOf <archive> <entry>`

Example:

```ts
const extractArgs = archType === "tar-gz"
  ? ["-xzOf", filePath, f]
  : ["-xOf", filePath, f];
const content = runSpawnOrThrow("tar", extractArgs, { timeout: 5000, maxBuffer: 512 * 1024 });
```

Then preview `content` directly.

## Additional safety requirements

- Remove `writeFileSync`, `mkdirSync`, `rmSync`, `tmpdir`, and `randomBytes` imports if no longer needed.
- Do not create temp directories for archive preview.
- Treat entry names as untrusted strings. Do not `join(tmpDir, f)` or read paths derived from entries.
- Keep use of `spawnSync` with argument arrays. Do not reintroduce shell-string `execSync`.
- Keep output limits/pagination.
- If tar/unzip returns nonzero, return a clear preview failure for that entry.

## Verification commands

Run:

```bash
npx tsc extensions/artifact-read/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/starter-kit-doctor/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/ast-tools/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/source-navigation/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/lsp-bridge/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npm run test:loop-protection
```

Optional grep check:

```bash
grep -R "execSync\|writeFileSync\|mkdirSync\|rmSync\|tmpdir\|randomBytes\|--update-all" -n extensions/artifact-read/index.ts extensions/ast-tools/index.ts extensions/source-navigation/index.ts
```

Expected:

- No `execSync`.
- No `--update-all`.
- No `writeFileSync` in `artifact-read` or `source-navigation`.
- No temp archive extraction in `artifact-read`.

## Acceptance criteria

- `artifact_read` archive preview is read-only in practice, not just in docs.
- Archive entries are never extracted to disk.
- No untrusted archive entry name is used as a filesystem path.
- All verification commands pass.
