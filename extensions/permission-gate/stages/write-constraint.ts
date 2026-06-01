import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { ErrorCodes } from "../../shared/errors.js";
import { WRITE_TOOLS, blockReason, extractToolPaths } from "../helpers.js";
import type { BlockResult, PermissionMode } from "../types.js";

/** Stage 4: require reading existing files before editing them. */
export function checkWriteConstraint(
  toolName: string,
  filePath: string,
  workspaceRoot: string,
  readFileRegistry: Set<string>,
): BlockResult | null {
  if (!WRITE_TOOLS.has(toolName)) return null;

  const resolvedPath = resolve(workspaceRoot, filePath);

  try {
    readFileSync(resolvedPath);
  } catch {
    return null; // File doesn't exist — allow creation.
  }

  if (readFileRegistry.has(resolvedPath)) return null;

  return {
    blocked: true,
    reason: blockReason(
      ErrorCodes.PERMISSION_DENIED,
      `Write constraint: must read "${relative(workspaceRoot, resolvedPath)}" before editing. Use the \`read\` tool first.`,
      "Read the file before editing existing content.",
    ),
  };
}

/** Run write-constraint checks for a tool call and notify on block. */
export function handleWriteConstraint(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any,
  workspaceRoot: string,
  permissionMode: PermissionMode,
  readFileRegistry: Set<string>,
): BlockResult | null {
  if (permissionMode === "featureWork") return null;

  if (WRITE_TOOLS.has(toolName)) {
    for (const filePath of extractToolPaths(toolName, params)) {
      const writeBlock = checkWriteConstraint(toolName, filePath, workspaceRoot, readFileRegistry);
      if (writeBlock) {
        if (ctx.hasUI) ctx.ui.notify(writeBlock.reason, "warning");
        return writeBlock;
      }
    }
  }
  return null;
}
