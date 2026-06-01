# Issue 002: Extract Shared Settings Loader

**Priority**: P1 — High Impact / Low Risk  
**Phase**: 1 (Foundation)  
**Estimated Effort**: 3-4 hours  
**Confidence**: High

---

## Problem Statement

Settings loading is reimplemented 5 times across extensions with inconsistent error handling and type safety:

1. **rtk-rewrite/index.ts** (L63-75): `loadSettings()`
   - Returns `SettingsFile | null`
   - Catches all errors, returns null

2. **loop-protection/index.ts** (L20-30): `loadSettings()`
   - Similar implementation but different return type
   - No type safety for settings structure

3. **starter-kit-doctor/index.ts** (L240-260): `loadSettings()`
   - Returns `{ settings: StarterKitSettings | null; found: boolean }`
   - More detailed error reporting

4. **lsp-bridge/index.ts** (L38-52): `isAutoTypeCheckEnabled()`
   - Ad-hoc settings reading for a single flag
   - Duplicated in `isSymbolOpsEnabled()` (L54-68)

5. **permission-gate/index.ts** (L195-210): `resolvePermissionMode()`
   - Reads only `permissionMode` from settings
   - Different error handling

Each implementation:
- Reads `.pi/settings.json`
- Parses JSON
- Navigates to `starterKit.*`
- Handles errors differently

This creates maintenance burden and makes it hard to evolve the settings schema.

---

## Acceptance Criteria

- [x] Create `extensions/shared/settings.ts` with typed settings loader
- [x] Define `StarterKitSettings` interface with all known settings
- [x] Export `loadSettings(cwd: string): StarterKitSettings | null` (chosen API name)
- [x] Export `getSetting<T>(settings, path, defaultValue): T` (chosen dot-path helper signature)
- [x] Consistent error handling (return null on any error)
- [x] Update `extensions/rtk-rewrite/index.ts` to use shared loader
- [x] Update `extensions/loop-protection/index.ts` to use shared loader
- [x] Update `extensions/starter-kit-doctor/index.ts` to use shared loader for valid settings while preserving invalid-JSON diagnostics
- [x] Update `extensions/lsp-bridge/index.ts` to use shared loader
- [x] Update `extensions/permission-gate/index.ts` to use shared loader
- [x] Add unit tests in `tests/shared-settings.test.ts`
- [x] Tests cover: missing file, invalid JSON, missing starterKit key, valid settings
- [x] All existing tests still pass

---

## Files to Modify

### New Files
- `extensions/shared/settings.ts` — Shared settings loader and types
- `tests/shared/settings.test.ts` — Unit tests

### Modified Files
- `extensions/rtk-rewrite/index.ts` — Replace `loadSettings()` with shared loader
- `extensions/loop-protection/index.ts` — Replace `loadSettings()` with shared loader
- `extensions/starter-kit-doctor/index.ts` — Replace `loadSettings()` with shared loader
- `extensions/lsp-bridge/index.ts` — Replace `isAutoTypeCheckEnabled()` and `isSymbolOpsEnabled()`
- `extensions/permission-gate/index.ts` — Replace `resolvePermissionMode()`

---

## Implementation Approach

### 1. Define the Settings Schema

```typescript
// extensions/shared/settings.ts

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Starter Kit settings schema.
 * 
 * This interface documents all known settings. Extensions should use
 * optional chaining to access settings to avoid breaking when new
 * settings are added.
 */
export interface StarterKitSettings {
  // Security & Permissions
  permissionMode?: 'default' | 'acceptEdits' | 'featureWork';
  featureWork?: {
    autoAllowProjectReadWrite?: boolean;
    autoAllowProjectBash?: boolean;
    alwaysPrompt?: string[];
  };
  
  // Quality Gates
  autoLint?: boolean;
  autoTypeCheck?: boolean;
  autoVerify?: boolean;
  
  // Tool Configuration
  lspBridge?: {
    enableSymbolOps?: boolean;
  };
  rtkRewrite?: {
    enabled?: boolean;
    timeoutMs?: number;
    debug?: boolean;
    interceptUserBash?: boolean;
  };
  contribGate?: {
    mode?: 'default' | 'strict';
    branchPatterns?: string[];
    commitTypes?: string[];
  };
  
  // Harness Behavior
  steeringMode?: 'polished-default' | 'strict' | 'loose' | 'audit-heavy';
  interruptMode?: 'safe-steer' | 'soft' | 'hard';
  compactionStrategy?: 'context-mode-default' | 'aggressive' | 'conservative';
  
  // Extensions & Skills
  activeExtensions?: string[];
  activeSkills?: string[];
  
  // Integrations
  aiMemory?: {
    enabled?: boolean;
    serverUrl?: string;
  };
  webSearch?: 'cached' | 'live' | 'disabled';
}

interface SettingsFile {
  starterKit?: StarterKitSettings;
  [key: string]: unknown;
}
```

### 2. Implement the Loader

```typescript
/**
 * Loads Starter Kit settings from .pi/settings.json.
 * 
 * @param cwd - Current working directory (workspace root)
 * @returns Starter Kit settings or null if not found/invalid
 * 
 * @example
 * ```typescript
 * const settings = loadStarterKitSettings(process.cwd());
 * if (settings?.autoLint) {
 *   // Run linter
 * }
 * ```
 */
export function loadStarterKitSettings(cwd: string): StarterKitSettings | null {
  try {
    const settingsPath = resolve(cwd, '.pi/settings.json');
    const content = readFileSync(settingsPath, 'utf-8');
    const parsed: SettingsFile = JSON.parse(content);
    return parsed?.starterKit ?? null;
  } catch {
    // File not found, invalid JSON, or permission error
    return null;
  }
}

/**
 * Gets a specific setting value with type safety.
 * 
 * @param cwd - Current working directory
 * @param key - Setting key
 * @returns Setting value or undefined if not set
 * 
 * @example
 * ```typescript
 * const autoLint = getSetting(process.cwd(), 'autoLint');
 * if (autoLint === true) {
 *   // Run linter
 * }
 * ```
 */
export function getSetting<K extends keyof StarterKitSettings>(
  cwd: string,
  key: K
): StarterKitSettings[K] | undefined {
  const settings = loadStarterKitSettings(cwd);
  return settings?.[key];
}

/**
 * Gets a setting with a default value.
 * 
 * @param cwd - Current working directory
 * @param key - Setting key
 * @param defaultValue - Default value if setting is not set
 * @returns Setting value or default
 * 
 * @example
 * ```typescript
 * const autoLint = getSettingWithDefault(process.cwd(), 'autoLint', true);
 * ```
 */
export function getSettingWithDefault<K extends keyof StarterKitSettings>(
  cwd: string,
  key: K,
  defaultValue: NonNullable<StarterKitSettings[K]>
): NonNullable<StarterKitSettings[K]> {
  const value = getSetting(cwd, key);
  return (value ?? defaultValue) as NonNullable<StarterKitSettings[K]>;
}
```

### 3. Write Tests

```typescript
// tests/shared/settings.test.ts

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { 
  loadStarterKitSettings, 
  getSetting, 
  getSettingWithDefault 
} from '../../extensions/shared/settings';

test('loadStarterKitSettings', async (t) => {
  let workspace: string;
  
  t.beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'settings-test-'));
    mkdirSync(join(workspace, '.pi'), { recursive: true });
  });
  
  t.afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });
  
  await t.test('returns null when settings file does not exist', () => {
    const emptyWorkspace = mkdtempSync(join(tmpdir(), 'empty-'));
    const result = loadStarterKitSettings(emptyWorkspace);
    assert.equal(result, null);
    rmSync(emptyWorkspace, { recursive: true, force: true });
  });
  
  await t.test('returns null for invalid JSON', () => {
    writeFileSync(join(workspace, '.pi/settings.json'), '{ invalid json }');
    const result = loadStarterKitSettings(workspace);
    assert.equal(result, null);
  });
  
  await t.test('returns null when starterKit key is missing', () => {
    writeFileSync(join(workspace, '.pi/settings.json'), JSON.stringify({ other: {} }));
    const result = loadStarterKitSettings(workspace);
    assert.equal(result, null);
  });
  
  await t.test('returns settings when valid', () => {
    writeFileSync(join(workspace, '.pi/settings.json'), JSON.stringify({
      starterKit: {
        permissionMode: 'featureWork',
        autoLint: true,
      }
    }));
    const result = loadStarterKitSettings(workspace);
    assert.deepEqual(result, {
      permissionMode: 'featureWork',
      autoLint: true,
    });
  });
});

test('getSetting', async (t) => {
  let workspace: string;
  
  t.beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'get-setting-'));
    mkdirSync(join(workspace, '.pi'), { recursive: true });
    writeFileSync(join(workspace, '.pi/settings.json'), JSON.stringify({
      starterKit: { autoLint: true }
    }));
  });
  
  t.afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });
  
  await t.test('returns setting value', () => {
    const result = getSetting(workspace, 'autoLint');
    assert.equal(result, true);
  });
  
  await t.test('returns undefined for unset setting', () => {
    const result = getSetting(workspace, 'autoTypeCheck');
    assert.equal(result, undefined);
  });
});

test('getSettingWithDefault', async (t) => {
  let workspace: string;
  
  t.beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'get-default-'));
    mkdirSync(join(workspace, '.pi'), { recursive: true });
    writeFileSync(join(workspace, '.pi/settings.json'), JSON.stringify({
      starterKit: { autoLint: true }
    }));
  });
  
  t.afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });
  
  await t.test('returns setting value when set', () => {
    const result = getSettingWithDefault(workspace, 'autoLint', false);
    assert.equal(result, true);
  });
  
  await t.test('returns default when setting is not set', () => {
    const result = getSettingWithDefault(workspace, 'autoTypeCheck', true);
    assert.equal(result, true);
  });
});
```

### 4. Refactor Existing Code

**rtk-rewrite/index.ts**:
```typescript
// Before
export function loadSettings(cwd: string): SettingsFile | null {
  try {
    const settingsPath = path.resolve(cwd, ".pi/settings.json");
    const content = readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    return null;
  }
}

// After
import { loadStarterKitSettings } from '../shared/settings';

// In code:
const settings = loadStarterKitSettings(cwd);
const rtkSettings = settings?.rtkRewrite;
```

**lsp-bridge/index.ts**:
```typescript
// Before
function isAutoTypeCheckEnabled(): boolean {
  try {
    const settingsPath = path.resolve(process.cwd(), ".pi/settings.json");
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, "utf8");
      const settings = JSON.parse(content);
      if (settings?.starterKit?.autoTypeCheck === false) {
        return false;
      }
    }
  } catch {
    // Default to true if config load fails
  }
  return true;
}

// After
import { getSettingWithDefault } from '../shared/settings';

function isAutoTypeCheckEnabled(): boolean {
  return getSettingWithDefault(process.cwd(), 'autoTypeCheck', true);
}
```

**permission-gate/index.ts**:
```typescript
// Before
function resolvePermissionMode(workspaceRoot = process.cwd()): PermissionMode {
  const configPath = resolve(workspaceRoot, ".pi", "settings.json");
  try {
    const raw = readFileSync(configPath, "utf-8");
    const settings: Settings = JSON.parse(raw);
    return normalizePermissionMode(settings.starterKit?.permissionMode);
  } catch {
    return "default";
  }
}

// After
import { getSettingWithDefault } from '../shared/settings';

function resolvePermissionMode(workspaceRoot = process.cwd()): PermissionMode {
  return getSettingWithDefault(workspaceRoot, 'permissionMode', 'default');
}
```

---

## Testing Strategy

1. **Unit tests**: Test the shared loader with various file states
2. **Integration tests**: Verify each extension still reads settings correctly
3. **Type safety**: Ensure TypeScript catches type errors when accessing settings

---

## Risk Assessment

**Risk Level**: Low

**Mitigations**:
- Write tests before refactoring
- Keep backward compatibility (return null on errors)
- Test each extension after refactoring

**Potential Issues**:
- Some extensions may rely on specific error handling behavior
- Type safety may reveal bugs in existing code (good!)

---

## Success Metrics

- ✅ Lines of duplicated code reduced by ~80
- ✅ Single source of truth for settings schema
- ✅ Type-safe settings access
- ✅ Consistent error handling

---

## References

- `REFACTORING_REVIEW.md` — Section 1.2
- `extensions/rtk-rewrite/index.ts` — L63-75
- `extensions/loop-protection/index.ts` — L20-30
- `extensions/starter-kit-doctor/index.ts` — L240-260
- `extensions/lsp-bridge/index.ts` — L38-68
- `extensions/permission-gate/index.ts` — L195-210
