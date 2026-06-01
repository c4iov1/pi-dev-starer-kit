/**
 * Shared path utilities for Pi.dev Starter Kit extensions.
 *
 * Provides safe path confinement checking to prevent directory traversal attacks.
 * All extensions should use these utilities instead of implementing their own.
 *
 * @module path-utils
 */

import { resolve, relative, sep } from 'node:path';

/**
 * Checks if a path is safely contained within a workspace root.
 *
 * Prevents directory traversal attacks by ensuring the resolved path
 * does not escape the workspace boundary. Both parameters can be relative
 * or absolute paths - they will be normalized to absolute paths before comparison.
 *
 * @public
 * @param rawPath - The path to check (can be relative or absolute)
 * @param workspaceRoot - The workspace root directory (can be relative or absolute)
 * @returns True if the path is inside the workspace, false otherwise
 *
 * @example
 * ```typescript
 * isInsideWorkspace('./src/file.ts', '/project'); // true
 * isInsideWorkspace('../etc/passwd', '/project'); // false
 * isInsideWorkspace('/project/src/file.ts', '/project'); // true
 * isInsideWorkspace('/etc/passwd', '/project'); // false
 * ```
 */
export function isInsideWorkspace(rawPath: string, workspaceRoot: string): boolean {
  const normalizedWorkspace = resolve(workspaceRoot);
  const normalizedPath = resolve(rawPath);
  const relativePath = relative(normalizedWorkspace, normalizedPath);
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !resolve(relativePath).startsWith(".."));
}

/**
 * Resolves a path relative to workspace root and checks confinement.
 *
 * Combines path resolution with safety checking in one operation.
 * This is a convenience wrapper around isInsideWorkspace for cases where
 * you need both the resolved absolute path and the safety check result.
 *
 * @public
 * @param rawPath - The path to resolve (can be relative or absolute)
 * @param workspaceRoot - The workspace root directory
 * @returns Object with resolved absolute path and safety flag
 *
 * @example
 * ```typescript
 * const { resolved, safe } = confineToWorkspace('./src/file.ts', '/project');
 * // resolved: '/project/src/file.ts', safe: true
 *
 * const { resolved, safe } = confineToWorkspace('../etc/passwd', '/project');
 * // resolved: '/etc/passwd', safe: false
 * ```
 */
export function confineToWorkspace(
  rawPath: string,
  workspaceRoot: string
): { resolved: string; safe: boolean } {
  const normalizedWorkspace = resolve(workspaceRoot);
  const resolved = resolve(normalizedWorkspace, rawPath);
  const safe = isInsideWorkspace(resolved, normalizedWorkspace);

  return { resolved, safe };
}
