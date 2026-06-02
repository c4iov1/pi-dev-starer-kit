import { ErrorCodes } from "../../shared/errors.js";
import { isInsideWorkspace } from "../../shared/path-utils.js";
import {
  SHELL_TOOLS,
  STATIC_DENY_RULES,
  blockReason,
  commandUsesRecursiveRm,
  extractRmTargets,
  getCommandCwd,
  resolveCommandPath,
  stripHeredocBodies,
} from "../helpers.js";
import type { BlockResult, PermissionMode } from "../types.js";

/** Stage 2: block destructive shell commands unless a featureWork exception applies. */
export function checkDenyRules(
  command: string,
  permissionMode: PermissionMode,
  workspaceRoot: string,
  commandCwd: string,
): BlockResult | null {
  const shellCommand = stripHeredocBodies(command);

  if (commandUsesRecursiveRm(shellCommand)) {
    if (permissionMode === "featureWork") {
      const targets = extractRmTargets(command);
      if (targets.length > 0) {
        const outsideTarget = targets.find((target) => !isInsideWorkspace(resolveCommandPath(target, commandCwd), workspaceRoot));
        if (!outsideTarget) return null;
      }
    }

    return {
      blocked: true,
      reason: blockReason(
        ErrorCodes.PERMISSION_DENIED,
        "Destructive command blocked: rm -rf (recursive delete)",
        "Limit recursive deletion to explicit project-scoped paths or perform it manually.",
      ),
    };
  }

  for (const rule of STATIC_DENY_RULES) {
    if (rule.pattern.test(shellCommand)) {
      return {
        blocked: true,
        reason: blockReason(
          ErrorCodes.PERMISSION_DENIED,
          `Destructive command blocked: ${rule.label}`,
          "Review the command and run it manually if it is intentional.",
        ),
      };
    }
  }
  return null;
}

/** Run deny-rule checks for a tool call and notify the user on a block. */
export function handleDenyRules(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any,
  permissionMode: PermissionMode,
  workspaceRoot: string,
): BlockResult | null {
  if (SHELL_TOOLS.has(toolName)) {
    const command = typeof params.command === "string" ? params.command : "";
    const commandCwd = getCommandCwd(params, ctx, workspaceRoot);
    const denyBlock = checkDenyRules(command, permissionMode, workspaceRoot, commandCwd);
    if (denyBlock) {
      if (ctx.hasUI) ctx.ui.notify(denyBlock.reason, "warning");
      return denyBlock;
    }
  }
  return null;
}
