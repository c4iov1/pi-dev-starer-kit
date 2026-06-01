import { relative, resolve } from "node:path";
import { ErrorCodes } from "../../shared/errors.js";
import { isInsideWorkspace } from "../../shared/path-utils.js";
import {
  READ_TOOLS,
  SHELL_TOOLS,
  WRITE_TOOLS,
  blockReason,
  checkBashProjectScope,
  extractToolPaths,
  getCommandCwd,
  mustPromptShell,
} from "../helpers.js";
import type { BlockResult, PermissionMode } from "../types.js";

/** Return true when featureWork can auto-allow the tool call. */
export function shouldAutoAllowFeatureWork(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any,
  workspaceRoot: string,
): boolean {
  if (READ_TOOLS.has(toolName) || WRITE_TOOLS.has(toolName)) {
    for (const rawPath of extractToolPaths(toolName, params)) {
      if (!isInsideWorkspace(resolve(workspaceRoot, rawPath), workspaceRoot)) return false;
    }
    return true;
  }

  if (!SHELL_TOOLS.has(toolName)) return false;

  const command = typeof params.command === "string" ? params.command : "";
  if (!command.trim()) return false;
  if (mustPromptShell(command)) return false;

  const commandCwd = getCommandCwd(params, ctx, workspaceRoot);
  if (!isInsideWorkspace(commandCwd, workspaceRoot)) return false;

  return checkBashProjectScope(command, workspaceRoot, commandCwd).projectScoped;
}

/** Prompt the user for approval when policy requires an interactive decision. */
export async function promptEditApproval(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any,
  workspaceRoot: string,
): Promise<BlockResult | null> {
  if (!ctx.hasUI) {
    return {
      blocked: true,
      reason: blockReason(
        ErrorCodes.PERMISSION_DENIED,
        "Permission required but no interactive UI is available",
        "Re-run in an interactive session or switch to an appropriate permission mode.",
      ),
    };
  }

  let preview = "";

  if (WRITE_TOOLS.has(toolName) || READ_TOOLS.has(toolName)) {
    const paths = extractToolPaths(toolName, params);
    const path = paths[0] ?? "unknown";
    preview = `${toolName} ${relative(workspaceRoot, resolve(workspaceRoot, path))}`;
  } else if (SHELL_TOOLS.has(toolName)) {
    const command = typeof params.command === "string" ? params.command : "unknown command";
    preview = `${toolName}: ${command}`;
  }

  const choice = await ctx.ui.select(`Allow tool call?\n\n  ${preview}`, ["Yes", "No"]);
  if (choice !== "Yes") {
    return { blocked: true, reason: blockReason(ErrorCodes.PERMISSION_DENIED, "Blocked by user") };
  }

  return null;
}

/** Stage 5: apply mode-specific auto-allow and interactive prompt behavior. */
export async function handleInteractivePrompt(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any,
  permissionMode: PermissionMode,
  workspaceRoot: string,
): Promise<BlockResult | null> {
  if (permissionMode === "featureWork") {
    if (shouldAutoAllowFeatureWork(toolName, params, ctx, workspaceRoot)) return null;

    if (READ_TOOLS.has(toolName) || WRITE_TOOLS.has(toolName) || SHELL_TOOLS.has(toolName)) {
      return await promptEditApproval(toolName, params, ctx, workspaceRoot);
    }
  }

  if (permissionMode === "acceptEdits") {
    if (SHELL_TOOLS.has(toolName)) return await promptEditApproval(toolName, params, ctx, workspaceRoot);
  }

  if (permissionMode === "default") {
    if (WRITE_TOOLS.has(toolName) || SHELL_TOOLS.has(toolName)) {
      return await promptEditApproval(toolName, params, ctx, workspaceRoot);
    }
  }
  return null;
}
