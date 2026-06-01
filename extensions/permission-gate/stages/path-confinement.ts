import { resolve } from "node:path";
import { ErrorCodes } from "../../shared/errors.js";
import { isInsideWorkspace } from "../../shared/path-utils.js";
import { PATH_TOOLS, blockReason, extractToolPaths } from "../helpers.js";
import type { BlockResult } from "../types.js";

/** Stage 3: ensure file tool paths stay inside the active workspace. */
export function checkPathConfinement(
  toolName: string,
  params: Record<string, unknown>,
  workspaceRoot: string,
): BlockResult | null {
  if (!PATH_TOOLS.has(toolName)) return null;
  if (toolName === "bash") return null;

  const normalizedWorkspace = resolve(workspaceRoot);
  const pathsToCheck = extractToolPaths(toolName, params);

  for (const rawPath of pathsToCheck) {
    const resolvedPath = resolve(workspaceRoot, rawPath);

    if (!isInsideWorkspace(resolvedPath, normalizedWorkspace)) {
      return {
        blocked: true,
        reason: blockReason(
          ErrorCodes.PATH_OUTSIDE_WORKSPACE,
          `Path confinement: "${rawPath}" resolves outside active project (${normalizedWorkspace}).`,
          "Use paths inside the active project workspace.",
        ),
      };
    }
  }

  return null;
}

/** Run path-confinement checks for a tool call and notify on block. */
export function handlePathConfinement(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any,
  workspaceRoot: string,
): BlockResult | null {
  const confineBlock = checkPathConfinement(toolName, params, workspaceRoot);
  if (confineBlock) {
    if (ctx.hasUI) ctx.ui.notify(confineBlock.reason, "warning");
    return confineBlock;
  }
  return null;
}
