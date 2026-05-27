/**
 * Permission Gate Extension
 *
 * PreToolUse hook permission pipeline — layered gate before tool execution.
 * Follows Claude Code's layered permission pattern.
 *
 * Pipeline: protected paths → deny rules → path confinement → write constraint → interactive prompt
 *
 * Modes:
 * - "default": prompt user with diff before edits, gate bash commands
 * - "acceptEdits": auto-approve edits, still gate bash through deny layers
 * - "featureWork": auto-approve read/write/edit and common bash commands when fully scoped
 *   to the active project workspace. git commit, git push, network commands, and commands
 *   that reference paths outside the workspace still ask for permission.
 *
 * Destructive commands are blocked regardless of mode unless explicitly made safe by the
 * project-scoped featureWork policy (for example: rm -rf ./node_modules inside workspace).
 */

import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PermissionMode = "default" | "acceptEdits" | "featureWork";

type FeatureModeAction = "on" | "off" | "status";

interface Settings {
  starterKit?: {
    permissionMode?: PermissionMode;
  };
}

interface BlockResult {
  blocked: true;
  reason: string;
}

interface BashScopeResult {
  projectScoped: boolean;
  reason?: string;
  paths: string[];
}

/** Read file tracking: path → read-at-least-once flag */
const readFileRegistry = new Set<string>();

const READ_TOOLS = new Set(["read", "read_file"]);
const WRITE_TOOLS = new Set([
  "write",
  "edit",
  "replace_file_content",
  "multi_replace_file_content",
  "write_to_file",
]);
const PATH_TOOLS = new Set([...READ_TOOLS, ...WRITE_TOOLS, "bash"]);
const SHELL_TOOLS = new Set(["bash", "Monitor", "monitor"]);

const STATIC_DENY_RULES: Array<{ pattern: RegExp; label: string }> = [
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
  { pattern: /\byarn\s+npm\s+publish\b/i, label: "yarn npm publish" },
  { pattern: /\bpnpm\s+publish\b/i, label: "pnpm publish" },
  { pattern: /\bcargo\s+publish\b/i, label: "cargo publish" },
  { pattern: /\bdocker\s+push\b/i, label: "docker push" },
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

const ALWAYS_PROMPT_SHELL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bgit\s+commit\b/i, label: "git commit" },
  { pattern: /\bgit\s+push\b/i, label: "git push" },
  { pattern: /\bcurl\b/i, label: "curl/network" },
  { pattern: /\bwget\b/i, label: "wget/network" },
  { pattern: /\bssh\b/i, label: "ssh/network" },
  { pattern: /\bscp\b/i, label: "scp/network" },
  { pattern: /\brsync\b.*:/i, label: "rsync remote" },
];

const SHELL_OPERATORS = new Set([
  "|",
  "||",
  "&",
  "&&",
  ";",
  ">",
  ">>",
  "<",
  "<<",
  "2>",
  "2>>",
  "2>&1",
]);

const COMMAND_WORDS = new Set([
  "bash",
  "sh",
  "zsh",
  "fish",
  "cd",
  "pwd",
  "echo",
  "printf",
  "test",
  "true",
  "false",
  "git",
  "status",
  "diff",
  "log",
  "add",
  "stash",
  "fetch",
  "pull",
  "branch",
  "checkout",
  "switch",
  "merge",
  "rebase",
  "reset",
  "npm",
  "yarn",
  "pnpm",
  "bun",
  "node",
  "npx",
  "tsx",
  "ts-node",
  "python",
  "python3",
  "pip",
  "pip3",
  "uv",
  "cargo",
  "rustc",
  "go",
  "make",
  "cmake",
  "tsc",
  "eslint",
  "biome",
  "prettier",
  "vitest",
  "jest",
  "pytest",
  "find",
  "grep",
  "rg",
  "fd",
  "ls",
  "cat",
  "head",
  "tail",
  "wc",
  "sort",
  "uniq",
  "mkdir",
  "touch",
  "cp",
  "mv",
  "rm",
  "rmdir",
]);

// ---------------------------------------------------------------------------
// Permission mode resolution
// ---------------------------------------------------------------------------

function normalizePermissionMode(raw: unknown): PermissionMode {
  if (raw === "acceptEdits" || raw === "featureWork") return raw;
  return "default";
}

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

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function isInsideWorkspace(rawPath: string, workspaceRoot: string): boolean {
  const normalizedWorkspace = resolve(workspaceRoot);
  const normalizedPath = resolve(rawPath);
  const relativePath = relative(normalizedWorkspace, normalizedPath);
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !resolve(relativePath).startsWith(".."));
}

function stripShellQuotes(token: string): string {
  return token.replace(/^['"]|['"]$/g, "");
}

function splitShellWords(command: string): string[] {
  const words: string[] = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|\S+/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(command)) !== null) {
    words.push(match[1] ?? match[2] ?? match[0]);
  }

  return words;
}

function looksLikePath(token: string): boolean {
  if (!token || SHELL_OPERATORS.has(token)) return false;
  if (token.startsWith("-")) return false;
  if (/^[A-Z_][A-Z0-9_]*=.*/.test(token)) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(token)) return false;
  if (COMMAND_WORDS.has(token)) return false;

  return (
    token.startsWith("/") ||
    token.startsWith("./") ||
    token.startsWith("../") ||
    token.startsWith("~/") ||
    token.includes("/") ||
    /^\.{1,2}$/.test(token) ||
    /\.[A-Za-z0-9_-]+$/.test(token)
  );
}

function extractBashPaths(command: string): string[] {
  const paths: string[] = [];
  const tokens = splitShellWords(command).map(stripShellQuotes);

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (!token || SHELL_OPERATORS.has(token)) continue;

    // Capture cd targets even when they are simple directory names.
    if (token === "cd") {
      const next = tokens[i + 1];
      if (next && !next.startsWith("-")) paths.push(next);
      continue;
    }

    if (looksLikePath(token)) {
      paths.push(token);
    }
  }

  return paths;
}

function extractRmTargets(command: string): string[] {
  const tokens = splitShellWords(command).map(stripShellQuotes);
  const targets: string[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i] !== "rm") continue;

    for (let j = i + 1; j < tokens.length; j += 1) {
      const token = tokens[j];
      if (!token || SHELL_OPERATORS.has(token)) break;
      if (token.startsWith("-")) continue;
      targets.push(token);
    }
  }

  return targets;
}

function commandUsesRecursiveRm(command: string): boolean {
  return /\brm\s+(?:[^;&|]*\s)?(?:-[A-Za-z]*r[A-Za-z]*|-R|--recursive)\b/i.test(command);
}

function resolveCommandPath(rawPath: string, cwd: string): string {
  if (rawPath.startsWith("~/")) return resolve(process.env.HOME ?? cwd, rawPath.slice(2));
  return resolve(cwd, rawPath);
}

function checkBashProjectScope(command: string, workspaceRoot: string, commandCwd: string): BashScopeResult {
  const paths = extractBashPaths(command);

  for (const rawPath of paths) {
    const resolvedPath = resolveCommandPath(rawPath, commandCwd);
    if (!isInsideWorkspace(resolvedPath, workspaceRoot)) {
      return {
        projectScoped: false,
        reason: `Path "${rawPath}" resolves outside active project (${workspaceRoot}).`,
        paths,
      };
    }
  }

  return { projectScoped: true, paths };
}

// ---------------------------------------------------------------------------
// Deny rules — destructive patterns that are ALWAYS blocked unless safely
// narrowed by featureWork's project-scoped rm exception.
// ---------------------------------------------------------------------------

function checkDenyRules(command: string, permissionMode: PermissionMode, workspaceRoot: string, commandCwd: string): BlockResult | null {
  if (commandUsesRecursiveRm(command)) {
    if (permissionMode === "featureWork") {
      const targets = extractRmTargets(command);
      if (targets.length > 0) {
        const outsideTarget = targets.find((target) => !isInsideWorkspace(resolveCommandPath(target, commandCwd), workspaceRoot));
        if (!outsideTarget) return null;
      }
    }

    return { blocked: true, reason: "Destructive command blocked: rm -rf (recursive delete)" };
  }

  for (const rule of STATIC_DENY_RULES) {
    if (rule.pattern.test(command)) {
      return { blocked: true, reason: `Destructive command blocked: ${rule.label}` };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Write constraint — reject writes to existing files not read this session
// ---------------------------------------------------------------------------

function checkWriteConstraint(toolName: string, filePath: string, workspaceRoot: string): BlockResult | null {
  if (!WRITE_TOOLS.has(toolName)) return null;

  const resolvedPath = resolve(workspaceRoot, filePath);

  try {
    readFileSync(resolvedPath);
  } catch {
    return null; // File doesn't exist — allow creation
  }

  if (readFileRegistry.has(resolvedPath)) return null;

  return {
    blocked: true,
    reason: `Write constraint: must read "${relative(workspaceRoot, resolvedPath)}" before editing. Use the \`read\` tool first.`,
  };
}

// ---------------------------------------------------------------------------
// Path confinement helpers
// ---------------------------------------------------------------------------

function extractToolPaths(toolName: string, params: Record<string, unknown>): string[] {
  const paths: string[] = [];
  if (READ_TOOLS.has(toolName) || WRITE_TOOLS.has(toolName)) {
    const candidates = [
      params.path,
      params.file,
      params.filepath,
      params.targetFile,
      params.TargetFile,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string") {
        paths.push(candidate);
      }
    }
  }
  return paths;
}

function checkPathConfinement(toolName: string, params: Record<string, unknown>, workspaceRoot: string): BlockResult | null {
  if (!PATH_TOOLS.has(toolName)) return null;
  if (toolName === "bash") return null;

  const normalizedWorkspace = resolve(workspaceRoot);
  const pathsToCheck = extractToolPaths(toolName, params);

  for (const rawPath of pathsToCheck) {
    const resolvedPath = resolve(workspaceRoot, rawPath);

    if (!isInsideWorkspace(resolvedPath, normalizedWorkspace)) {
      return {
        blocked: true,
        reason: `Path confinement: "${rawPath}" resolves outside active project (${normalizedWorkspace}).`,
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
// featureWork auto-allow policy
// ---------------------------------------------------------------------------

function mustPromptShell(command: string): string | null {
  for (const rule of ALWAYS_PROMPT_SHELL_PATTERNS) {
    if (rule.pattern.test(command)) return rule.label;
  }
  return null;
}

function getCommandCwd(params: Record<string, unknown>, ctx: any, workspaceRoot: string): string {
  const paramCwd = typeof params.cwd === "string" ? params.cwd : undefined;
  const ctxCwd = typeof ctx?.cwd === "string" ? ctx.cwd : undefined;
  return resolve(workspaceRoot, paramCwd ?? ctxCwd ?? workspaceRoot);
}

function shouldAutoAllowFeatureWork(
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

// ---------------------------------------------------------------------------
// Interactive prompt — diff for edits
// ---------------------------------------------------------------------------

async function promptEditApproval(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any,
  workspaceRoot: string,
): Promise<BlockResult | null> {
  if (!ctx.hasUI) {
    return { blocked: true, reason: "Permission required but no interactive UI is available" };
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
    return { blocked: true, reason: "Blocked by user" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Hook Layer Handlers
// ---------------------------------------------------------------------------

function handleProtectedPaths(toolName: string, params: Record<string, unknown>): BlockResult | null {
  if (WRITE_TOOLS.has(toolName)) {
    for (const filePath of extractToolPaths(toolName, params)) {
      const block = checkProtectedPaths(filePath);
      if (block) return block;
    }
  }
  return null;
}

function handleDenyRules(
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
      if (ctx.hasUI) {
        ctx.ui.notify(denyBlock.reason, "warning");
      }
      return denyBlock;
    }
  }
  return null;
}

function handlePathConfinement(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any,
  workspaceRoot: string,
): BlockResult | null {
  const confineBlock = checkPathConfinement(toolName, params, workspaceRoot);
  if (confineBlock) {
    if (ctx.hasUI) {
      ctx.ui.notify(confineBlock.reason, "warning");
    }
    return confineBlock;
  }
  return null;
}

function handleWriteConstraint(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any,
  workspaceRoot: string,
  permissionMode: PermissionMode,
): BlockResult | null {
  if (permissionMode === "featureWork") return null;

  if (WRITE_TOOLS.has(toolName)) {
    for (const filePath of extractToolPaths(toolName, params)) {
      const writeBlock = checkWriteConstraint(toolName, filePath, workspaceRoot);
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
  permissionMode: PermissionMode,
  workspaceRoot: string,
): Promise<BlockResult | null> {
  if (permissionMode === "featureWork") {
    if (shouldAutoAllowFeatureWork(toolName, params, ctx, workspaceRoot)) {
      return null;
    }

    if (READ_TOOLS.has(toolName) || WRITE_TOOLS.has(toolName) || SHELL_TOOLS.has(toolName)) {
      return await promptEditApproval(toolName, params, ctx, workspaceRoot);
    }
  }

  if (permissionMode === "acceptEdits") {
    if (SHELL_TOOLS.has(toolName)) {
      return await promptEditApproval(toolName, params, ctx, workspaceRoot);
    }
  }

  if (permissionMode === "default") {
    if (WRITE_TOOLS.has(toolName) || SHELL_TOOLS.has(toolName)) {
      return await promptEditApproval(toolName, params, ctx, workspaceRoot);
    }
  }
  return null;
}

function getEventToolName(event: any): string {
  return String(event.toolName ?? event.tool ?? "");
}

function getEventParams(event: any): Record<string, unknown> {
  return (event.input ?? event.arguments ?? event.args ?? {}) as Record<string, unknown>;
}

function addReadPath(rawPath: string, workspaceRoot: string): void {
  readFileRegistry.add(resolve(workspaceRoot, rawPath));
}

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

async function handleToolCall(event: any, ctx: any, permissionMode: PermissionMode, workspaceRoot: string) {
  const toolName = getEventToolName(event);
  const params = getEventParams(event);

  const protectedBlock = handleProtectedPaths(toolName, params);
  if (protectedBlock) return { block: true, reason: protectedBlock.reason };

  const denyBlock = handleDenyRules(toolName, params, ctx, permissionMode, workspaceRoot);
  if (denyBlock) return { block: true, reason: denyBlock.reason };

  const confineBlock = handlePathConfinement(toolName, params, ctx, workspaceRoot);
  if (confineBlock) return { block: true, reason: confineBlock.reason };

  const writeBlock = handleWriteConstraint(toolName, params, ctx, workspaceRoot, permissionMode);
  if (writeBlock) return { block: true, reason: writeBlock.reason };

  const promptBlock = await handleInteractivePrompt(toolName, params, ctx, permissionMode, workspaceRoot);
  if (promptBlock) return { block: true, reason: promptBlock.reason };

  return undefined;
}

// ---------------------------------------------------------------------------
// Mode toggle command/tool
// ---------------------------------------------------------------------------

function applyFeatureModeAction(
  action: FeatureModeAction,
  currentMode: PermissionMode,
  settingsMode: PermissionMode,
): { mode: PermissionMode; message: string } {
  if (action === "on") {
    return {
      mode: "featureWork",
      message: "featureWork mode ON — project-local read/write/edit and bash commands auto-approved. git commit, git push, network, protected paths, and outside-project paths still ask/block.",
    };
  }

  if (action === "off") {
    return {
      mode: settingsMode,
      message: `featureWork mode OFF — reverted to settings mode: ${settingsMode}.`,
    };
  }

  return {
    mode: currentMode,
    message: `Current permission mode: ${currentMode}. Settings mode: ${settingsMode}.`,
  };
}

function parseFeatureModeAction(raw: unknown): FeatureModeAction {
  if (raw === "on" || raw === "off" || raw === "status") return raw;
  return "status";
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
    description: "Toggle project-scoped featureWork permissions for this session",
    getArgumentCompletions: (prefix) => {
      const actions = ["on", "off", "status"];
      const matches = actions.filter((action) => action.startsWith(prefix));
      return matches.map((action) => ({ value: action, label: action }));
    },
    handler: async (args, ctx) => {
      const action = parseFeatureModeAction(args.trim());
      const result = applyFeatureModeAction(action, permissionMode, settingsMode);
      permissionMode = result.mode;
      ctx.ui.notify(result.message, "info");
    },
  });

  pi.registerTool({
    name: "feature_mode_toggle",
    label: "Feature Mode Toggle",
    description:
      "Toggle project-scoped featureWork permissions for the current session. When on, read/write/edit and bash commands inside the active project are auto-approved. git commit, git push, network commands, protected paths, and outside-project paths still require approval or block.",
    parameters: Type.Object({
      mode: Type.Union([
        Type.Literal("on"),
        Type.Literal("off"),
        Type.Literal("status"),
      ], { description: "Use 'on' to enable featureWork, 'off' to return to settings mode, or 'status' to inspect the current mode." }),
    }) as any,
    async execute(_toolCallId, params: { mode: FeatureModeAction }) {
      const action = parseFeatureModeAction(params.mode);
      const result = applyFeatureModeAction(action, permissionMode, settingsMode);
      permissionMode = result.mode;

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
