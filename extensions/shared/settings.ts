/**
 * Shared settings loader for Pi.dev Starter Kit extensions.
 *
 * Provides consistent loading of project settings from `.pi/settings.json`.
 * All extensions should use these utilities instead of implementing their own.
 *
 * @module settings
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Schema for Pi.dev Starter Kit settings.
 *
 * This interface defines all configuration options available in
 * `.pi/settings.json` under the `starterKit` key.
 */
export interface StarterKitSettings {
  // Quality gates
  autoLint?: boolean;
  autoTypeCheck?: boolean;
  autoVerify?: boolean;

  // Loop protection
  loopProtection?: {
    maxEdits?: number;
    minTokens?: number;
    maxLowTokenTurns?: number;
    maxContextPercent?: number;
    diminishingReturns?: {
      enabled?: boolean;
      threshold?: number;
      minTokens?: number;
    };
  };

  // RTK rewrite
  rtkRewrite?: {
    enabled?: boolean;
    timeoutMs?: number;
    debug?: boolean;
    interceptUserBash?: boolean;
    processOptOut?: string;
    commandOptOut?: string;
  };

  // Permission mode
  permissionMode?: 'default' | 'acceptEdits' | 'featureWork';

  // Other settings can be added here
  [key: string]: any;
}

/**
 * Loads the entire settings file from `.pi/settings.json`.
 *
 * Returns the complete parsed JSON object, or null if the file doesn't
 * exist or cannot be parsed. Use this when you need access to settings
 * outside the `starterKit` namespace.
 *
 * @param workspaceRoot - The workspace root directory
 * @returns The complete settings object, or null if not found
 *
 * @example
 * ```typescript
 * const settings = loadSettingsFile('/project');
 * if (settings?.customExtension?.enabled) {
 *   // Use custom extension settings
 * }
 * ```
 */
export function loadSettingsFile(workspaceRoot: string): any | null {
  const settingsPath = join(workspaceRoot, '.pi', 'settings.json');

  if (!existsSync(settingsPath)) {
    return null;
  }

  try {
    const content = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // File exists but cannot be read or parsed
    return null;
  }
}

/**
 * Loads project settings from `.pi/settings.json`.
 *
 * Reads the settings file from the specified workspace root and returns
 * the `starterKit` configuration object. Returns null if the file doesn't
 * exist or cannot be parsed.
 *
 * @param workspaceRoot - The workspace root directory
 * @returns The starterKit settings object, or null if not found
 *
 * @example
 * ```typescript
 * const settings = loadSettings('/project');
 * if (settings?.autoLint) {
 *   // Run linter
 * }
 * ```
 */
export function loadSettings(workspaceRoot: string): StarterKitSettings | null {
  const allSettings = loadSettingsFile(workspaceRoot);
  return allSettings?.starterKit || null;
}

/**
 * Gets a specific setting value with a default fallback.
 *
 * Convenience function for accessing nested settings with type safety.
 *
 * @param settings - The settings object (from loadSettings)
 * @param path - Dot-separated path to the setting (e.g., 'loopProtection.threshold')
 * @param defaultValue - Value to return if setting is not found
 * @returns The setting value or the default
 *
 * @example
 * ```typescript
 * const threshold = getSetting(settings, 'loopProtection.threshold', 5);
 * ```
 */
export function getSetting<T>(
  settings: StarterKitSettings | null,
  path: string,
  defaultValue: T
): T {
  if (!settings) {
    return defaultValue;
  }

  const keys = path.split('.');
  let current: any = settings;

  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current !== undefined ? current : defaultValue;
}
