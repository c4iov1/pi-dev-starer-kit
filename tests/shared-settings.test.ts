import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { getSetting, loadSettings, loadSettingsFile } from '../extensions/shared/settings';

function workspace(): string {
  return mkdtempSync(join(tmpdir(), 'pi-settings-'));
}

function writeSettings(root: string, content: string): void {
  mkdirSync(join(root, '.pi'), { recursive: true });
  writeFileSync(join(root, '.pi', 'settings.json'), content);
}

test('loadSettingsFile returns null for missing or invalid settings files', () => {
  const root = workspace();
  assert.equal(loadSettingsFile(root), null);

  writeSettings(root, '{ invalid json');
  assert.equal(loadSettingsFile(root), null);
  assert.equal(loadSettings(root), null);
});

test('loadSettingsFile returns the full parsed settings object', () => {
  const root = workspace();
  writeSettings(root, JSON.stringify({ starterKit: { autoLint: true }, custom: { enabled: true } }));

  assert.deepEqual(loadSettingsFile(root), {
    starterKit: { autoLint: true },
    custom: { enabled: true },
  });
});

test('loadSettings returns only the starterKit settings object', () => {
  const root = workspace();
  writeSettings(root, JSON.stringify({ starterKit: { autoTypeCheck: true, loopProtection: { maxEdits: 3 } } }));

  assert.deepEqual(loadSettings(root), {
    autoTypeCheck: true,
    loopProtection: { maxEdits: 3 },
  });
});

test('loadSettings returns null when starterKit key is absent', () => {
  const root = workspace();
  writeSettings(root, JSON.stringify({ other: { enabled: true } }));

  assert.equal(loadSettings(root), null);
});

test('getSetting reads nested dot paths and falls back to defaults', () => {
  const settings = {
    autoLint: false,
    loopProtection: {
      maxEdits: 7,
      diminishingReturns: { enabled: true },
    },
  };

  assert.equal(getSetting(settings, 'autoLint', true), false);
  assert.equal(getSetting(settings, 'loopProtection.maxEdits', 5), 7);
  assert.equal(getSetting(settings, 'loopProtection.diminishingReturns.enabled', false), true);
  assert.equal(getSetting(settings, 'loopProtection.missing', 'fallback'), 'fallback');
  assert.equal(getSetting(null, 'autoLint', true), true);
});
