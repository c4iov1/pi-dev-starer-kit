import { resolve } from "node:path";
import { ErrorCodes, ExtensionError, formatError } from "../shared/errors.js";
import { isInsideWorkspace } from "../shared/path-utils.js";
import type { BashScopeResult } from "./types.js";

export const READ_TOOLS = new Set(["read", "read_file", "artifact_read"]);
export const WRITE_TOOLS = new Set([
  "write",
  "edit",
  "replace_file_content",
  "multi_replace_file_content",
  "write_to_file",
]);
export const PATH_TOOLS = new Set([...READ_TOOLS, ...WRITE_TOOLS, "bash"]);
export const SHELL_TOOLS = new Set(["bash", "Monitor", "monitor"]);

export const STATIC_DENY_RULES: Array<{ pattern: RegExp; label: string }> = [
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

export const PROTECTED_PATH_PATTERNS = [
  /\.env$/,
  /\.env\.[a-z]+$/i,
  /secrets?\.(json|yaml|yml|toml)$/i,
  /credentials?\.(json|yaml|yml|toml)$/i,
  /\/\.ssh\//,
  /\/\.aws\//,
  /\/\.gnupg\//,
];

export const ALWAYS_PROMPT_SHELL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
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
  "bash", "sh", "zsh", "fish", "cd", "pwd", "echo", "printf", "test", "true", "false",
  "git", "status", "diff", "log", "add", "stash", "fetch", "pull", "branch", "checkout",
  "switch", "merge", "rebase", "reset", "npm", "yarn", "pnpm", "bun", "node", "npx",
  "tsx", "ts-node", "python", "python3", "pip", "pip3", "uv", "cargo", "rustc", "go",
  "make", "cmake", "tsc", "eslint", "biome", "prettier", "vitest", "jest", "pytest",
  "find", "grep", "rg", "fd", "ls", "cat", "head", "tail", "wc", "sort", "uniq",
  "mkdir", "touch", "cp", "mv", "rm", "rmdir",
]);

/**
 * Format a permission denial using the shared ExtensionError display format.
 *
 * @param code - Machine-readable error code.
 * @param message - Human-readable denial reason.
 * @param suggestion - Optional remediation shown to the user.
 * @returns Formatted block reason string.
 */
export function blockReason(code: string, message: string, suggestion?: string): string {
  return formatError(new ExtensionError(code, message, suggestion));
}

/** Remove one layer of simple single or double shell quotes from a token. */
function stripShellQuotes(token: string): string {
  return token.replace(/^[']|[']$/g, "").replace(/^[\"]|[\"]$/g, "");
}

/**
 * Split a shell command into coarse words for permission analysis.
 *
 * Handles simple unquoted words plus single- and double-quoted strings. This is
 * intentionally not a full shell parser: command substitution, variable
 * expansion, comments, globbing, and multiline continuations are treated as
 * literal tokens. That is acceptable here because permission-gate uses the
 * tokens only for conservative path/safety checks, never for execution.
 */
export function splitShellWords(command: string): string[] {
  const words: string[] = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|\S+/g;

  for (const match of command.matchAll(pattern)) {
    words.push(match[1] ?? match[2] ?? match[0]);
  }

  return words;
}

/**
 * Remove heredoc payload lines before shell path analysis.
 *
 * The permission gate should inspect the command that creates/overwrites a
 * file (for example `cat > src/file.ts <<'EOF'`) but not treat arbitrary source
 * code inside the heredoc body as shell arguments or project paths. Multiple
 * heredocs in one shell command are handled in command order.
 */
export function stripHeredocBodies(command: string): string {
  const output: string[] = [];
  const pendingDelimiters: string[] = [];
  const heredocPattern = /<<-?\s*(?:"([^"]+)"|'([^']+)'|([^\s;&|<>]+))/g;
  const lines = command.split(/\r?\n/);

  for (const line of lines) {
    if (pendingDelimiters.length > 0) {
      const delimiter = pendingDelimiters[0];
      if (line.trim() === delimiter) pendingDelimiters.shift();
      continue;
    }

    output.push(line);

    heredocPattern.lastIndex = 0;
    for (const match of line.matchAll(heredocPattern)) {
      const delimiter = match[1] ?? match[2] ?? match[3];
      if (delimiter) pendingDelimiters.push(delimiter);
    }
  }

  return output.join("\n");
}

/** Heuristically identify shell tokens that should be treated as paths. */
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

/**
 * Extract path-like tokens from a shell command for confinement checks.
 *
 * The result is conservative and intentionally parser-light; it may include
 * false positives, which is acceptable for permission gating because suspicious
 * paths should prompt or block rather than silently pass.
 *
 * @param command - Shell command string from a bash-like tool.
 * @returns Path-like tokens in command order.
 */
export function extractBashPaths(command: string): string[] {
  const paths: string[] = [];
  const tokens = splitShellWords(stripHeredocBodies(command)).map(stripShellQuotes);

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token || SHELL_OPERATORS.has(token)) continue;

    if (token === "cd") {
      const next = tokens[i + 1];
      if (next && !next.startsWith("-")) paths.push(next);
      continue;
    }

    if (looksLikePath(token)) paths.push(token);
  }

  return paths;
}

/**
 * Extract non-flag targets following `rm` commands.
 *
 * @param command - Shell command string.
 * @returns Candidate rm target paths.
 */
export function extractRmTargets(command: string): string[] {
  const tokens = splitShellWords(stripHeredocBodies(command)).map(stripShellQuotes);
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

/**
 * Detect recursive rm usage that requires extra permission scrutiny.
 *
 * @param command - Shell command string.
 * @returns True when `rm -r`, `rm -R`, or `rm --recursive` appears.
 */
export function commandUsesRecursiveRm(command: string): boolean {
  return /\brm\s+(?:[^;&|]*\s)?(?:-[A-Za-z]*r[A-Za-z]*|-R|--recursive)\b/i.test(stripHeredocBodies(command));
}

/**
 * Resolve a shell path token against a command working directory.
 *
 * @param rawPath - Path token, including optional `~/` home prefix.
 * @param cwd - Working directory for relative paths.
 * @returns Absolute path for confinement checks.
 */
export function resolveCommandPath(rawPath: string, cwd: string): string {
  if (rawPath.startsWith("~/")) return resolve(process.env.HOME ?? cwd, rawPath.slice(2));
  return resolve(cwd, rawPath);
}

/**
 * Determine whether all path-like shell tokens stay inside the workspace.
 *
 * @param command - Shell command to inspect.
 * @param workspaceRoot - Active workspace confinement boundary.
 * @param commandCwd - Working directory used for relative command paths.
 * @returns Scope result with extracted paths and optional block reason.
 */
export function checkBashProjectScope(command: string, workspaceRoot: string, commandCwd: string): BashScopeResult {
  const paths = extractBashPaths(command);

  for (const rawPath of paths) {
    const resolvedPath = resolveCommandPath(rawPath, commandCwd);
    if (!isInsideWorkspace(resolvedPath, workspaceRoot)) {
      return {
        projectScoped: false,
        reason: blockReason(
          ErrorCodes.PATH_OUTSIDE_WORKSPACE,
          `Path "${rawPath}" resolves outside active project (${workspaceRoot}).`,
          "Use paths inside the active project workspace.",
        ),
        paths,
      };
    }
  }

  return { projectScoped: true, paths };
}

/**
 * Extract path parameters from file-oriented Pi tool calls.
 *
 * @param toolName - Tool name being evaluated.
 * @param params - Raw tool parameters.
 * @returns String path parameters known to the permission gate.
 */
export function extractToolPaths(toolName: string, params: Record<string, unknown>): string[] {
  const paths: string[] = [];
  if (READ_TOOLS.has(toolName) || WRITE_TOOLS.has(toolName)) {
    const candidates = [params.path, params.file, params.filepath, params.targetFile, params.TargetFile];
    for (const candidate of candidates) {
      if (typeof candidate === "string") paths.push(candidate);
    }
  }
  return paths;
}

/**
 * Check whether a shell command matches patterns that always need prompting.
 *
 * @param command - Shell command to inspect.
 * @returns Matching rule label, or null when no forced prompt applies.
 */
export function mustPromptShell(command: string): string | null {
  const shellCommand = stripHeredocBodies(command);
  for (const rule of ALWAYS_PROMPT_SHELL_PATTERNS) {
    if (rule.pattern.test(shellCommand)) return rule.label;
  }
  return null;
}

/**
 * Resolve the effective working directory for a shell tool call.
 *
 * Explicit tool `cwd` wins over context cwd, and both fall back to the active
 * workspace root.
 *
 * @param params - Raw tool parameters.
 * @param ctx - Pi hook context.
 * @param workspaceRoot - Active workspace root fallback.
 * @returns Absolute working directory path.
 */
export function getCommandCwd(params: Record<string, unknown>, ctx: any, workspaceRoot: string): string {
  const paramCwd = typeof params.cwd === "string" ? params.cwd : undefined;
  const ctxCwd = typeof ctx?.cwd === "string" ? ctx.cwd : undefined;
  return resolve(workspaceRoot, paramCwd ?? ctxCwd ?? workspaceRoot);
}
