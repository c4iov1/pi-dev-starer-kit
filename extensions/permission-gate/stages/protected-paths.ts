import { ErrorCodes } from "../../shared/errors.js";
import { PROTECTED_PATH_PATTERNS, WRITE_TOOLS, blockReason, extractToolPaths } from "../helpers.js";
import type { BlockResult } from "../types.js";

/** Stage 1: block writes to protected secret/credential paths. */
export function checkProtectedPaths(filePath: string): BlockResult | null {
  const basename = filePath.split(/[/\\]/).pop() ?? filePath;
  for (const pattern of PROTECTED_PATH_PATTERNS) {
    if (pattern.test(filePath) || pattern.test(basename)) {
      return {
        blocked: true,
        reason: blockReason(
          ErrorCodes.PATH_PROTECTED,
          `Protected path: "${filePath}" matches sensitive file pattern. Reserved for human operation.`,
          "Handle sensitive credentials and secret files manually.",
        ),
      };
    }
  }
  return null;
}

/** Run protected-path checks for a tool call. */
export function handleProtectedPaths(toolName: string, params: Record<string, unknown>): BlockResult | null {
  if (WRITE_TOOLS.has(toolName)) {
    for (const filePath of extractToolPaths(toolName, params)) {
      const block = checkProtectedPaths(filePath);
      if (block) return block;
    }
  }
  return null;
}
