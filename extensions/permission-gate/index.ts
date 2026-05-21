/**
 * Permission Gate Extension
 *
 * PreToolUse hook permission pipeline — 3-layer gate before tool execution.
 * Follows Claude Code's layered permission pattern.
 *
 * Pipeline: deny rules → write constraint → path confinement
 *
 * Modes:
 * - "default": prompt user with diff before edits, gate bash commands
 * - "acceptEdits": auto-approve edits, still gate bash through deny layers
 *
 * Destructive commands are ALWAYS blocked regardless of mode.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "fs";
import { resolve, relative, sep } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Settings {
  starterKit?: {
    permissionMode?: "default" | "acceptEdits";
  };
}

interface BlockResult {
  blocked: true;
  reason: string;
}

/** Read file tracking: path → read-at-least-once flag */
const readFileRegistry = new Set<string>();

const WRITE_TOOLS = new Set(["write", "edit"]);
const PATH_TOOLS = new Set(["read", "write", "edit", "bash"]);

const DENY_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\brm\s+(-rf?\b|--recursive|--preserve-root)/i, label: "rm -rf (recursive delete)" },
  { pattern: /\bgit\s+push\s+.*(--force|-f)/i, label: "git push --force" },
  { pattern: /\bgit\s+reset\s+--hard\b/i, label: "git reset --hard" },
  { pattern: /\bDROP\s+(TABLE|DATABASE)/i, label: "DROP TABLE/DATABASE" },
  { pattern: /\bTRUNCATE\s+(TABLE\s+)?/i, label: "TRUNCATE TABLE" },
  { pattern: /\bsudo\b/i, label: "sudo" },
  { pattern: /\bchmod\s+.*777/i, label: "chmod 777" },
  { pattern: /\bchmod\s+.*-R\s+777/i, label: "chmod -R 777" },
  { pattern: /\bcurl\s+.*\|\s*(ba)?sh\b/i, label: "curl piped to shell" },
  { pattern: /\bwget\s+.*\|\s*(ba)?sh\b/i, label: "wget piped to shell" },
  { pattern: /\bnpm\s+publish\b/i, label: "npm publish" },
];

const PROTECTED_PATH_PATTERNS = [
  /\.env$/,
  /\.env\.[a-z]+$/i,
  /secrets?\.(json|yaml|yml|toml)$/i,
  /credentials?\.(json|yaml|yml|toml)$/i,
  /\/\.ssh\//,
  /\/\.aws\//,
  /\/\.gnupg\//,
];

// ---------------------------------------------------------------------------
// Permission mode resolution
// ---------------------------------------------------------------------------

function resolvePermissionMode(): "default" | "acceptEdits" {
  const cwd = process.cwd();
  const configPath = resolve(cwd, ".pi", "settings.json");

  try {
    const raw = readFileSync(configPath, "utf-8");
    const settings: Settings = JSON.parse(raw);
    return settings.starterKit?.permissionMode ?? "default";
  } catch {
    return "default";
  }
}

// ---------------------------------------------------------------------------
// Deny rules — destructive patterns that are ALWAYS blocked
// ---------------------------------------------------------------------------

function checkDenyRules(command: string): BlockResult | null {
  for (const rule of DENY_RULES) {
    if (rule.pattern.test(command)) {
      return { blocked: true, reason: `Destructive command blocked: ${rule.label}` };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Write constraint — reject writes to existing files not read this session
// ---------------------------------------------------------------------------

function checkWriteConstraint(toolName: string, filePath: string): BlockResult | null {
  if (!WRITE_TOOLS.has(toolName)) return null;

  const cwd = process.cwd();
  const resolvedPath = resolve(cwd, filePath);

  try {
    readFileSync(resolvedPath);
  } catch {
    return null; // File doesn't exist — allow creation
  }

  if (readFileRegistry.has(resolvedPath)) return null;

  return {
    blocked: true,
    reason: `Write constraint: must read "${relative(cwd, resolvedPath)}" before editing. Use the \`read\` tool first.`,
  };
}

// ---------------------------------------------------------------------------
// Path confinement helpers
// ---------------------------------------------------------------------------

function extractToolPaths(toolName: string, params: Record<string, unknown>): string[] {
  const paths: string[] = [];
  if (toolName === "read" || toolName === "write" || toolName === "edit") {
    if (typeof params.path === "string") {
      paths.push(params.path);
    }
  }
  return paths;
}

function checkPathConfinement(toolName: string, params: Record<string, unknown>): BlockResult | null {
  if (!PATH_TOOLS.has(toolName)) return null;
  if (toolName === "bash") return null;

  const cwd = process.cwd();
  const normalizedCwd = resolve(cwd);
  const pathsToCheck = extractToolPaths(toolName, params);

  for (const rawPath of pathsToCheck) {
    const resolvedPath = resolve(cwd, rawPath);
    const relativePath = relative(normalizedCwd, resolvedPath);

    if (relativePath.startsWith(`..${sep}`) || relativePath === "..") {
      return {
        blocked: true,
        reason: `Path confinement: "${rawPath}" resolves outside workspace root (${relative(cwd, normalizedCwd)}).`,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Protected path patterns (.env, secrets, credentials)
// ---------------------------------------------------------------------------

function checkProtectedPaths(filePath: string): BlockResult | null {
  const basename = filePath.split(/[/\\]/).pop() ?? filePath;
  for (const pattern of PROTECTED_PATH_PATTERNS) {
    if (pattern.test(filePath) || pattern.test(basename)) {
      return {
        blocked: true,
        reason: `Protected path: "${filePath}" matches sensitive file pattern. Reserved for human operation.`,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Interactive prompt — diff for edits
// ---------------------------------------------------------------------------

async function promptEditApproval(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any
): Promise<BlockResult | null> {
  if (!ctx.hasUI) return null;

  const cwd = process.cwd();
  let preview = "";

  if (toolName === "write" || toolName === "edit") {
    const path = typeof params.path === "string" ? params.path : "unknown";
    preview = `${toolName} ${relative(cwd, resolve(cwd, path))}`;
  } else if (toolName === "bash" || toolName === "Monitor" || toolName === "monitor") {
    const command = typeof params.command === "string" ? params.command : "unknown command";
    preview = `${toolName}: ${command}`;
  }

  const choice = await ctx.ui.select(`Allow tool call?\n\n  ${preview}`, ["Yes", "No"]);
  if (choice !== "Yes") {
    return { blocked: true, reason: "Blocked by user" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Hook Layer Handlers
// ---------------------------------------------------------------------------

function handleProtectedPaths(toolName: string, params: Record<string, unknown>): BlockResult | null {
  if (toolName === "write" || toolName === "edit") {
    const filePath = typeof params.path === "string" ? params.path : "";
    if (filePath) {
      return checkProtectedPaths(filePath);
    }
  }
  return null;
}

function handleDenyRules(toolName: string, params: Record<string, unknown>, ctx: any): BlockResult | null {
  if (toolName === "bash" || toolName === "Monitor" || toolName === "monitor") {
    const command = typeof params.command === "string" ? params.command : "";
    const denyBlock = checkDenyRules(command);
    if (denyBlock) {
      if (ctx.hasUI) {
        ctx.ui.notify(denyBlock.reason, "warning");
      }
      return denyBlock;
    }
  }
  return null;
}

function handlePathConfinement(toolName: string, params: Record<string, unknown>, ctx: any): BlockResult | null {
  const confineBlock = checkPathConfinement(toolName, params);
  if (confineBlock) {
    if (ctx.hasUI) {
      ctx.ui.notify(confineBlock.reason, "warning");
    }
    return confineBlock;
  }
  return null;
}

function handleWriteConstraint(toolName: string, params: Record<string, unknown>, ctx: any): BlockResult | null {
  if (toolName === "write" || toolName === "edit") {
    const filePath = typeof params.path === "string" ? params.path : "";
    if (filePath) {
      const writeBlock = checkWriteConstraint(toolName, filePath);
      if (writeBlock) {
        if (ctx.hasUI) {
          ctx.ui.notify(writeBlock.reason, "warning");
        }
        return writeBlock;
      }
    }
  }
  return null;
}

async function handleInteractivePrompt(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any,
  permissionMode: string
): Promise<BlockResult | null> {
  if (permissionMode === "default") {
    if (toolName === "write" || toolName === "edit" || toolName === "bash" || toolName === "Monitor" || toolName === "monitor") {
      return await promptEditApproval(toolName, params, ctx);
    }
  }
  return null;
}

function handleToolResult(event: any): void {
  if (event.toolName === "read" && event.result) {
    const details = event.result?.details;
    if (details && typeof details.path === "string") {
      const cwd = process.cwd();
      readFileRegistry.add(resolve(cwd, details.path));
    }
  }
}

async function handleToolCall(event: any, ctx: any, permissionMode: string) {
  const toolName = event.toolName;
  const params = (event.input ?? {}) as Record<string, unknown>;

  const protectedBlock = handleProtectedPaths(toolName, params);
  if (protectedBlock) return { block: true, reason: protectedBlock.reason };

  const denyBlock = handleDenyRules(toolName, params, ctx);
  if (denyBlock) return { block: true, reason: denyBlock.reason };

  const confineBlock = handlePathConfinement(toolName, params, ctx);
  if (confineBlock) return { block: true, reason: confineBlock.reason };

  const writeBlock = handleWriteConstraint(toolName, params, ctx);
  if (writeBlock) return { block: true, reason: writeBlock.reason };

  const promptBlock = await handleInteractivePrompt(toolName, params, ctx, permissionMode);
  if (promptBlock) return { block: true, reason: promptBlock.reason };

  return undefined;
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  let permissionMode: "default" | "acceptEdits" = "default";

  pi.on("session_start", () => {
    permissionMode = resolvePermissionMode();
    readFileRegistry.clear();
  });

  pi.on("tool_result", (event) => {
    handleToolResult(event);
  });

  pi.on("tool_call", async (event, ctx) => {
    return await handleToolCall(event, ctx, permissionMode);
  });
}
