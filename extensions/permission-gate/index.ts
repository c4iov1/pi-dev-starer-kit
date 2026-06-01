/** Permission Gate Extension — orchestrates the layered pre-tool permission pipeline. */

import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { resolve } from "node:path";
import { READ_TOOLS, extractToolPaths } from "./helpers.js";
import { resolvePermissionMode } from "./modes/permission-mode.js";
import { handleDenyRules } from "./stages/deny-rules.js";
import { handleInteractivePrompt } from "./stages/interactive.js";
import { handlePathConfinement } from "./stages/path-confinement.js";
import { handleProtectedPaths } from "./stages/protected-paths.js";
import { handleWriteConstraint } from "./stages/write-constraint.js";
import { applyFeatureModeAction, parseFeatureModeAction } from "./toggle.js";
import type { FeatureModeAction, PermissionMode } from "./types.js";

export { splitShellWords } from "./helpers.js";

/** Read file tracking: path → read-at-least-once flag */
const readFileRegistry = new Set<string>();

// ---------------------------------------------------------------------------
// Pipeline event helpers
// ---------------------------------------------------------------------------

/** Extract the tool name from either hook event shape used by Pi. */
function getEventToolName(event: any): string {
  return String(event.toolName ?? event.tool ?? "");
}

/** Extract normalized tool parameters from a permission hook event. */
function getEventParams(event: any): Record<string, unknown> {
  return (event.input ?? event.arguments ?? event.args ?? {}) as Record<string, unknown>;
}

/** Record a successfully-read workspace path for later write-constraint checks. */
function addReadPath(rawPath: string, workspaceRoot: string): void {
  readFileRegistry.add(resolve(workspaceRoot, rawPath));
}

/** Track successful read results so future edits can be allowed safely. */
function handleToolResult(event: any, ctx: any, workspaceRoot: string): void {
  const toolName = getEventToolName(event);
  if (!READ_TOOLS.has(toolName)) {
    return;
  }

  const cwd = ctx?.cwd ?? workspaceRoot;
  const params = getEventParams(event);
  for (const rawPath of extractToolPaths(toolName, params)) {
    addReadPath(rawPath, cwd);
  }

  const details = event.result?.details;
  if (details && typeof details.path === "string") {
    addReadPath(details.path, cwd);
  }
}

/** Run a tool call through the permission pipeline and return the first block. */
async function handleToolCall(event: any, ctx: any, permissionMode: PermissionMode, workspaceRoot: string) {
  const toolName = getEventToolName(event);
  const params = getEventParams(event);

  const protectedBlock = handleProtectedPaths(toolName, params);
  if (protectedBlock) return { block: true, reason: protectedBlock.reason };

  const denyBlock = handleDenyRules(toolName, params, ctx, permissionMode, workspaceRoot);
  if (denyBlock) return { block: true, reason: denyBlock.reason };

  const confineBlock = handlePathConfinement(toolName, params, ctx, workspaceRoot);
  if (confineBlock) return { block: true, reason: confineBlock.reason };

  const writeBlock = handleWriteConstraint(toolName, params, ctx, workspaceRoot, permissionMode, readFileRegistry);
  if (writeBlock) return { block: true, reason: writeBlock.reason };

  const promptBlock = await handleInteractivePrompt(toolName, params, ctx, permissionMode, workspaceRoot);
  if (promptBlock) return { block: true, reason: promptBlock.reason };

  return undefined;
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  let settingsMode: PermissionMode = "default";
  let permissionMode: PermissionMode = "default";
  let workspaceRoot = resolve(process.cwd());

  pi.on("session_start", (_event, ctx) => {
    workspaceRoot = resolve(typeof ctx?.cwd === "string" ? ctx.cwd : process.cwd());
    settingsMode = resolvePermissionMode(workspaceRoot);
    permissionMode = settingsMode;
    readFileRegistry.clear();
  });

  pi.on("tool_result", (event, ctx) => {
    handleToolResult(event, ctx, workspaceRoot);
  });

  pi.on("tool_call", async (event, ctx) => {
    return await handleToolCall(event, ctx, permissionMode, workspaceRoot);
  });

  pi.registerCommand("feature-mode", {
    description: "Toggle project-scoped featureWork permissions and persist them to this project",
    getArgumentCompletions: (prefix) => {
      const actions = ["on", "off", "status"];
      const matches = actions.filter((action) => action.startsWith(prefix));
      return matches.map((action) => ({ value: action, label: action }));
    },
    handler: async (args, ctx) => {
      const action = parseFeatureModeAction(args.trim());
      const result = applyFeatureModeAction(action, permissionMode, settingsMode, workspaceRoot);
      permissionMode = result.mode;
      settingsMode = result.settingsMode;
      ctx.ui.notify(result.message, "info");
    },
  });

  pi.registerTool({
    name: "feature_mode_toggle",
    label: "Feature Mode Toggle",
    description:
      "Toggle project-scoped featureWork permissions and persist them to this project's .pi/settings.json. When on, read/write/edit and bash commands inside the active project are auto-approved. git commit, git push, network commands, protected paths, and outside-project paths still require approval or block.",
    parameters: Type.Object({
      mode: Type.Union([
        Type.Literal("on"),
        Type.Literal("off"),
        Type.Literal("status"),
      ], { description: "Use 'on' to persist featureWork for this project, 'off' to persist default mode, or 'status' to inspect the current mode." }),
    }) as any,
    async execute(_toolCallId, params: { mode: FeatureModeAction }) {
      const action = parseFeatureModeAction(params.mode);
      const result = applyFeatureModeAction(action, permissionMode, settingsMode, workspaceRoot);
      permissionMode = result.mode;
      settingsMode = result.settingsMode;

      return {
        content: [{ type: "text", text: result.message }],
        details: {
          mode: permissionMode,
          settingsMode,
          workspaceRoot,
        },
      };
    },
  });
}
