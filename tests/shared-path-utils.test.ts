import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { confineToWorkspace, isInsideWorkspace } from '../extensions/shared/path-utils';

test('isInsideWorkspace accepts workspace-local relative and absolute paths', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'pi-path-utils-'));

  assert.equal(isInsideWorkspace(join(workspace, 'src', 'file.ts'), workspace), true);
  assert.equal(isInsideWorkspace(resolve(workspace, 'nested', '..', 'file.ts'), workspace), true);
});

test('isInsideWorkspace rejects paths that escape the workspace', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'pi-path-utils-'));
  const outside = tmpdir();

  assert.equal(isInsideWorkspace(join(workspace, '..', 'outside.txt'), workspace), false);
  assert.equal(isInsideWorkspace(join(outside, 'outside.txt'), workspace), false);
});

test('confineToWorkspace resolves relative paths from the workspace root', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'pi-path-utils-'));

  assert.deepEqual(confineToWorkspace('src/file.ts', workspace), {
    resolved: join(workspace, 'src', 'file.ts'),
    safe: true,
  });
  assert.deepEqual(confineToWorkspace('', workspace), {
    resolved: workspace,
    safe: true,
  });

  const escaped = confineToWorkspace('../outside.txt', workspace);
  assert.equal(escaped.safe, false);
  assert.equal(escaped.resolved, resolve(workspace, '..', 'outside.txt'));
});

test('path utilities document lexical symlink behavior', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'pi-path-utils-'));
  const outside = mkdtempSync(join(tmpdir(), 'pi-path-utils-outside-'));
  const link = join(workspace, 'outside-link');
  symlinkSync(outside, link);

  // These helpers are lexical path guards. They do not resolve symlink targets;
  // callers that need realpath-based confinement must add that check separately.
  assert.equal(isInsideWorkspace(link, workspace), true);
  assert.deepEqual(confineToWorkspace('outside-link', workspace), {
    resolved: link,
    safe: true,
  });
});
