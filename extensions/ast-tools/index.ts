/**
 * ast-tools — Structural code search and preview-only rewrite via ast-grep.
 *
 * Registers `ast_grep` (pattern search) and `ast_edit` (pattern preview).
 * Wraps the `ast-grep` CLI (`sg` or `ast-grep`). If the binary is not installed,
 * returns an actionable install guide instead of failing obscurely.
 *
 * ast_edit is PREVIEW-ONLY — it shows a dry-run diff. Files are never
 * modified directly. The agent must apply approved changes via the normal
 * `edit` tool (which goes through the permission pipeline).
 *
 * Inspired by Oh-My-Pi's AST tools, as praised by Akita.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AstGrepParams {
  pattern: string;
  language?: string;
  paths?: string[];
  limit?: number;
}

interface AstEditParams {
  pattern: string;
  replacement: string;
  language?: string;
  paths?: string[];
  dryRun?: boolean;
}

interface AstGrepMatch {
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  text: string;
}

// ---------------------------------------------------------------------------
// Binary detection
// ---------------------------------------------------------------------------

let _binaryCache: { found: boolean; name: string } | null = null;

function detectAstGrep(): { found: boolean; name: string; installHint: string } {
  if (_binaryCache) return { ..._binaryCache, installHint: installHint() };

  const candidates = ["sg", "ast-grep"];
  for (const name of candidates) {
    try {
      const r = spawnSync(name, ["--version"], { timeout: 5000 });
      if (r.status === 0 && !r.error) {
        _binaryCache = { found: true, name };
        return { found: true, name, installHint: "" };
      }
    } catch {
      // continue
    }
  }

  _binaryCache = { found: false, name: "" };
  return { found: false, name: "", installHint: installHint() };
}

function installHint(): string {
  return [
    "ast-grep CLI is not installed.",
    "",
    "Install it with one of:",
    "  npm install -g @ast-grep/cli",
    "  cargo install ast-grep",
    "  brew install ast-grep",
    "",
    "After installation, verify with: ast-grep --version",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampLimit(raw: number): number {
  const n = Math.floor(raw);
  if (isNaN(n) || n < 1) return 20;
  return Math.min(n, 100);
}

function resolvePath(raw: string, cwd: string): string {
  return resolve(cwd, raw);
}

function isPathConfined(filePath: string, cwd: string): boolean {
  const normalized = resolve(cwd);
  const rel = relative(normalized, resolve(cwd, filePath));
  return !rel.startsWith(`..${sep}`) && rel !== "..";
}

function relativePath(raw: string, cwd: string): string {
  return relative(cwd, resolve(cwd, raw));
}

function buildAstGrepArgs(params: AstGrepParams, cwd: string, binary: string): string[] {
  const args: string[] = [];

  // Use --pattern for the rule
  args.push("run", "--pattern", params.pattern);

  if (params.language) {
    args.push("--lang", params.language);
  }

  if (params.paths && params.paths.length > 0) {
    for (const p of params.paths) {
      if (!isPathConfined(p, cwd)) {
        throw new Error(`Path outside workspace: ${p}`);
      }
      args.push(relativePath(p, cwd));
    }
  } else {
    args.push(".");
  }

  return args;
}

/** Always dry-run. Never writes files. */
function buildAstEditArgs(
  params: AstEditParams,
  cwd: string,
  binary: string,
): string[] {
  const args: string[] = [];

  args.push("run", "--pattern", params.pattern, "--rewrite", params.replacement);

  if (params.language) {
    args.push("--lang", params.language);
  }

  // Always dry-run — never write files from this extension
  args.push("--dry-run");

  if (params.paths && params.paths.length > 0) {
    for (const p of params.paths) {
      if (!isPathConfined(p, cwd)) {
        throw new Error(`Path outside workspace: ${p}`);
      }
      args.push(relativePath(p, cwd));
    }
  } else {
    args.push(".");
  }

  return args;
}

function parseAstGrepOutput(output: string, cwd: string): AstGrepMatch[] {
  // ast-grep with --json produces JSON output
  // Without --json, it produces a human-readable format
  // We parse the human-readable format: file:line:column message
  const matches: AstGrepMatch[] = [];
  const lines = output.split("\n");

  // Try JSON parsing first
  try {
    const json = JSON.parse(output);
    if (Array.isArray(json)) {
      for (const item of json) {
        matches.push({
          file: item.file ?? relativePath(item.file ?? "", cwd),
          line: item.range?.start?.line ?? 0,
          column: item.range?.start?.column ?? 0,
          endLine: item.range?.end?.line ?? 0,
          endColumn: item.range?.end?.column ?? 0,
          text: item.text ?? item.lines ?? "",
        });
      }
    }
    return matches;
  } catch {
    // Not JSON, parse human-readable
  }

  let currentFile = "";
  let currentLine = 0;
  let currentCol = 0;

  for (const line of lines) {
    // Match file headers: "src/app.ts" or "./src/app.ts"
    const fileMatch = line.match(/^["']?([./][^"']+\.\w+)["']?\s*$/);
    if (fileMatch) {
      currentFile = fileMatch[1].replace(/^["']/, "").replace(/["']$/, "");
      continue;
    }

    // Match line:column hints like "  12:5  pattern matched"
    const posMatch = line.match(/^\s+(\d+):(\d+)\s+(.+)/);
    if (posMatch && currentFile) {
      currentLine = parseInt(posMatch[1], 10);
      currentCol = parseInt(posMatch[2], 10);
      matches.push({
        file: currentFile,
        line: currentLine,
        column: currentCol,
        endLine: currentLine,
        endColumn: currentCol + 20, // approximate
        text: posMatch[3].trim(),
      });
    }
  }

  return matches;
}

function formatMatches(
  matches: AstGrepMatch[],
  limit: number,
  pattern: string,
): string {
  if (matches.length === 0) {
    return `No matches found for pattern: \`${pattern}\``;
  }

  const display = matches.slice(0, limit);
  const lines: string[] = [
    `Found ${matches.length} matches for \`${pattern}\`:`,
    "",
  ];

  for (const m of display) {
    lines.push(`  ${m.file}:${m.line}:${m.column}`);
    if (m.text) {
      lines.push(`    ${m.text.trim().split("\n")[0].slice(0, 120)}`);
    }
  }

  if (matches.length > limit) {
    lines.push("");
    lines.push(
      `... and ${matches.length - limit} more matches. Use limit parameter to increase, or narrow pattern/paths.`,
    );
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Tool: ast_grep
// ---------------------------------------------------------------------------

function handleAstGrep(params: AstGrepParams, cwd: string) {
  const { found, name: binary, installHint: hint } = detectAstGrep();

  if (!found) {
    return {
      content: [{ type: "text" as const, text: hint }],
      details: { error: "ast-grep not installed", installHint: hint },
      isError: true,
    };
  }

  const limit = clampLimit(params.limit ?? 20);
  const args = buildAstGrepArgs(params, cwd, binary);

  try {
    const result = spawnSync(binary, args, {
      cwd,
      encoding: "utf-8",
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });

    const rawOut = (result.stdout || "") + (result.stderr || "");
    const matches = parseAstGrepOutput(rawOut, cwd);

    if (result.error) {
      // Non-zero exit with matches still present — parse anyway
      if (matches.length === 0) {
        return {
          content: [{ type: "text" as const, text: `ast_grep error: ${result.error.message}` }],
          details: { error: result.error.message },
          isError: true,
        };
      }
    }

    const formatted = formatMatches(matches, limit, params.pattern);

    return {
      content: [{ type: "text" as const, text: formatted }],
      details: {
        binary,
        matchCount: matches.length,
        displayed: Math.min(matches.length, limit),
        truncated: matches.length > limit,
      },
    };
  } catch (err: any) {
    const msg = err.message ?? "unknown error";

    return {
      content: [
        {
          type: "text" as const,
          text: `ast_grep error: ${msg.slice(0, 500)}`,
        },
      ],
      details: { error: msg.slice(0, 500) },
      isError: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Tool: ast_edit (PREVIEW-ONLY)
// ---------------------------------------------------------------------------

function handleAstEdit(params: AstEditParams, cwd: string) {
  const { found, name: binary, installHint: hint } = detectAstGrep();

  if (!found) {
    return {
      content: [{ type: "text" as const, text: hint }],
      details: { error: "ast-grep not installed", installHint: hint },
      isError: true,
    };
  }

  // Always dry-run. Never enable ast-grep's write mode.
  const args = buildAstEditArgs(params, cwd, binary);

  try {
    const result = spawnSync(binary, args, {
      cwd,
      encoding: "utf-8",
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });

    const output = (result.stdout || "") + (result.stderr || "");

    if (result.error && !output.trim()) {
      return {
        content: [{ type: "text" as const, text: `ast_edit error: ${result.error.message}` }],
        details: { error: result.error.message },
        isError: true,
      };
    }

    const headerLines = [
      "## PREVIEW ONLY — No files modified",
      "",
      `Pattern: \`${params.pattern}\``,
      `Replacement: \`${params.replacement}\``,
      params.language ? `Language: ${params.language}` : "",
      "",
      "To apply these changes, use the `edit` tool on each file shown below.",
      "",
    ].filter(Boolean) as string[];

    const truncated = output.length > 10000
      ? output.slice(0, 10000) + "\n\n... (output truncated to 10KB)"
      : output;

    const fullOutput = [...headerLines, truncated].join("\n");

    return {
      content: [{ type: "text" as const, text: fullOutput }],
      details: {
        binary,
        previewOnly: true,
        outputLength: output.length,
        truncated: output.length > 10000,
      },
    };
  } catch (err: any) {
    const msg = err.message ?? "unknown error";
    return {
      content: [{ type: "text" as const, text: `ast_edit error: ${msg.slice(0, 500)}` }],
      details: { error: msg.slice(0, 500) },
      isError: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  // -- ast_grep --------------------------------------------------------------

  pi.registerTool({
    name: "ast_grep",
    label: "AST Grep",
    description:
      "Structural code search using ast-grep. Search for code patterns by AST " +
      "structure, not text. This avoids false positives in strings, comments, " +
      "and differently-formatted code. Use for: finding all function calls, " +
      "imports, class declarations, JSX elements, and other structural patterns. " +
      "Prefer `grep` for simple text search. Prefer LSP tools for semantic " +
      "refactor operations like rename.",
    promptSnippet: "ast_grep(pattern, language?, paths?, limit?)",
    promptGuidelines: [
      "Use ast_grep when you need to find structural code patterns like " +
        "\"all calls to function foo\" or \"all React useEffect hooks\".",
      "Write patterns in the source language's syntax, not regex. " +
        "For example: '$$.add($A, $B)' to find method calls on a variable.",
      "Use $A, $B, etc. for metavariables in patterns.",
      "Use `paths` to narrow the search to specific files or directories.",
      "Prefer `grep` for simple text search. Prefer LSP tools " +
        "(lsp_definition, lsp_references) for semantic operations.",
      "If the binary is not installed, the tool returns a clear " +
        "install guide instead of failing silently.",
    ],
    parameters: Type.Object({
      pattern: Type.String({
        description:
          "AST pattern to search for. Uses the source language's syntax " +
          "with $META variables. Example: '$$.useEffect($$$)' for React hooks.",
      }),
      language: Type.Optional(
        Type.String({
          description:
            "Language identifier (e.g., 'javascript', 'typescript', 'python', " +
            "'rust', 'go'). If omitted, inferred from file extensions.",
        }),
      ),
      paths: Type.Optional(
        Type.Array(Type.String(), {
          description:
            "Files or directories to search (relative to workspace root). " +
            "Defaults to entire workspace.",
        }),
      ),
      limit: Type.Optional(
        Type.Number({
          description:
            "Maximum matches to display (default 20, max 100).",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd ?? process.cwd();
      return handleAstGrep(params as AstGrepParams, cwd);
    },
  });

  // -- ast_edit --------------------------------------------------------------

  pi.registerTool({
    name: "ast_edit",
    label: "AST Edit",
    description:
      "PREVIEW-ONLY structural code rewrite using ast-grep. Shows what a " +
      "pattern-based codemod would change across files. **Files are never " +
      "modified directly.** Review the preview diff, then apply approved " +
      "changes per-file using the normal `edit` tool (which goes through " +
      "the permission pipeline). Use for: planning renames, signature " +
      "updates, refactoring patterns, decorator changes. " +
      "Prefer LSP rename for simple symbol renames.",
    promptSnippet: "ast_edit(pattern, replacement, language?, paths?)",
    promptGuidelines: [
      "ast_edit is PREVIEW-ONLY. It shows the diff but never modifies files.",
      "Review the diff output carefully. For each file, use the `edit` tool to apply approved changes.",
      "Use $META variables in both pattern and replacement. " +
        "Example: pattern='$$.useEffect($$$BODY)' → replacement='useAsync($$$BODY)'.",
      "After applying edits via `edit`, run tests and lint to verify correctness.",
      "Prefer LSP rename for simple symbol renames.",
      "The dryRun parameter is accepted for compatibility but always forced true (preview-only).",
    ],
    parameters: Type.Object({
      pattern: Type.String({
        description:
          "AST pattern to match. Uses the source language's syntax " +
          "with $META variables.",
      }),
      replacement: Type.String({
        description:
          "Replacement pattern using the same $META variables. " +
          "Example: 'useAsync($$$BODY)' to replace the matched pattern.",
      }),
      language: Type.Optional(
        Type.String({
          description:
            "Language identifier (e.g., 'javascript', 'typescript', 'python'). " +
            "If omitted, inferred from file extensions.",
        }),
      ),
      paths: Type.Optional(
        Type.Array(Type.String(), {
          description:
            "Files or directories to preview rewrite on. " +
            "Defaults to entire workspace. Paths must be inside workspace.",
        }),
      ),
      dryRun: Type.Optional(
        Type.Boolean({
          description:
            "Accepted for compatibility but ignored. ast_edit is always preview-only.",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd ?? process.cwd();
      return handleAstEdit(params as AstEditParams, cwd);
    },
  });
}
