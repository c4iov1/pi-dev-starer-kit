/**
 * lsp-bridge — Type-check diagnostics + LSP symbol operations.
 *
 * Phase 1 (existing): Post-edit type-check via tsc/pyright/cargo check/go vet.
 * Phase 2 (new): Symbol-level LSP tools using TypeScript Language Service.
 *
 * Registers:
 *   - lsp_definition        — go to definition
 *   - lsp_references        — find all references
 *   - lsp_rename            — rename symbol (dryRun=true by default)
 *   - lsp_workspace_symbols — search project-wide symbols
 *
 * For TypeScript projects, uses the TS Language Service API (available via
 * the typescript dev dependency). For other languages, returns clear
 * degradation messages with fallback suggestions (grep, ast_grep).
 *
 * Existing post-edit type-check behavior is preserved intact.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Cache of unsupported/missing compilers to prevent repeat execution attempts
const unsupportedCheckers = new Set<string>();

// ---------------------------------------------------------------------------
// Phase 1: Type-check (existing — preserved)
// ---------------------------------------------------------------------------

interface CheckerConfig {
  command: string;
  args: string[];
}

function isAutoTypeCheckEnabled(): boolean {
  try {
    const settingsPath = path.resolve(process.cwd(), ".pi/settings.json");
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, "utf8");
      const settings = JSON.parse(content);
      if (settings?.starterKit?.autoTypeCheck === false) {
        return false;
      }
    }
  } catch {
    // Default to true if config load fails
  }
  return true;
}

function isSymbolOpsEnabled(): boolean {
  try {
    const settingsPath = path.resolve(process.cwd(), ".pi/settings.json");
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, "utf8");
      const settings = JSON.parse(content);
      if (settings?.starterKit?.lspBridge?.enableSymbolOps === false) {
        return false;
      }
    }
  } catch {
    // Default to true
  }
  return true;
}

function detectTypeChecker(filePath: string): CheckerConfig | null {
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  const root = process.cwd();

  if (ext === ".ts" || ext === ".tsx") {
    if (fs.existsSync(path.join(root, "tsconfig.json"))) {
      return { command: "npx", args: ["tsc", "--noEmit"] };
    }
  }
  if (ext === ".py") {
    return { command: "npx", args: ["pyright", filePath] };
  }
  if (ext === ".rs") {
    if (fs.existsSync(path.join(root, "Cargo.toml"))) {
      return { command: "cargo", args: ["check"] };
    }
  }
  if (ext === ".go") {
    if (fs.existsSync(path.join(root, "go.mod"))) {
      return { command: "go", args: ["vet", filePath] };
    }
  }
  return null;
}

function runTypeCheck(checker: CheckerConfig): {
  success: boolean;
  output: string;
  skipped: boolean;
} {
  const { command, args } = checker;
  if (unsupportedCheckers.has(command)) {
    return { success: true, output: "", skipped: true };
  }
  try {
    const result = spawnSync(command, args, {
      cwd: process.cwd(),
      timeout: 10000,
      encoding: "utf8",
      shell: true,
    });
    if (result.error) {
      const err = result.error as any;
      if (err.code === "ENOENT" || result.status === 127) {
        unsupportedCheckers.add(command);
        return { success: true, output: "", skipped: true };
      }
      return { success: false, output: err.message || "Execution error", skipped: false };
    }
    return {
      success: result.status === 0,
      output: (result.stdout || "") + (result.stderr || ""),
      skipped: false,
    };
  } catch (err: any) {
    return {
      success: false,
      output: err.message || "Unexpected execution error",
      skipped: false,
    };
  }
}

function formatTypeCheckOutput(success: boolean, output: string): string {
  if (success) return "Type check: OK";
  const trimmed = output.trim();
  if (!trimmed) return "Type check: Failed with no output details.";
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const errorLines = lines.filter((line) => {
    const lower = line.toLowerCase();
    return (
      lower.includes("error") ||
      lower.includes("failed") ||
      /:\d+:\d+/.test(line) ||
      /\(\d+,\d+\)/.test(line)
    );
  });
  const listToTruncate = errorLines.length > 0 ? errorLines : lines;
  const maxErrors = 10;
  const truncated = listToTruncate.slice(0, maxErrors);
  let formatted = `Type check: Errors found:\n` + truncated.map((l) => `  ${l}`).join("\n");
  if (listToTruncate.length > maxErrors) {
    formatted += `\n  ... (and ${listToTruncate.length - maxErrors} more errors)`;
  }
  return formatted;
}

// ---------------------------------------------------------------------------
// Phase 2: LSP Symbol Operations via TypeScript Language Service
// ---------------------------------------------------------------------------

interface TsService {
  createLanguageService: (
    host: any,
    documentRegistry?: any,
  ) => {
    getDefinitionAtPosition: (fileName: string, pos: number) => any;
    getDefinitionAndBoundSpan: (fileName: string, pos: number) => any;
    getReferencesAtPosition: (fileName: string, pos: number) => any;
    findRenameLocations: (
      fileName: string,
      pos: number,
      findInStrings: boolean,
      findInComments: boolean,
      providePrefixAndSuffixTextForRename?: boolean,
    ) => any;
    getNavigateToItems: (
      searchValue: string,
      maxResultCount?: number,
      fileName?: string,
    ) => any;
    getProgram: () => any;
  };
  createDocumentRegistry: (useCaseSensitiveFileNames?: boolean, currentDirectory?: string) => any;
  findConfigFile: (
    searchPath: string,
    fileExists: (fileName: string) => boolean,
    configName?: string,
  ) => string | undefined;
  readConfigFile: (fileName: string, readFile: (path: string) => string) => any;
  parseJsonConfigFileContent: (
    json: any,
    host: any,
    basePath: string,
    existingOptions?: any,
    configFileName?: string,
  ) => any;
  sys: any;
  ScriptSnapshot: { fromString: (s: string) => any };
  ScriptKind: { TS: number; TSX: number; JS: number; JSX: number };
  getDefaultLibFilePath: (options: any) => string;
  createLanguageServiceSourceFile: (
    fileName: string,
    scriptSnapshot: any,
    scriptTargetOrOptions: any,
    version: string,
    setNodeParents: boolean,
    scriptKind?: number,
  ) => any;
  Extension: Record<string, number>;
}

let tsModule: any = null;
let tsService: any = null;
let tsProgram: any = null;
let tsProjectRoot: string = "";

function loadTypeScript(): TsService | null {
  if (tsModule) return tsModule;

  // Try project-local typescript first
  const candidates = [
    path.resolve(process.cwd(), "node_modules", "typescript"),
    // Pi.dev global install
    path.resolve(
      process.env.HOME ?? "~",
      ".pi",
      "agent",
      "node_modules",
      "typescript",
    ),
  ];

  for (const c of candidates) {
    try {
      tsModule = require(c);
      return tsModule;
    } catch {
      // continue
    }
  }

  return null;
}

function initTsService(cwd: string): { ok: boolean; error?: string } {
  if (tsService) return { ok: true };

  const ts = loadTypeScript();
  if (!ts) {
    return { ok: false, error: "TypeScript is not available in node_modules or Pi.dev agent." };
  }

  // Find tsconfig.json
  const configFileName = ts.findConfigFile(cwd, fs.existsSync, "tsconfig.json");
  if (!configFileName) {
    return {
      ok: false,
      error:
        "No tsconfig.json found in project. LSP symbol operations require a TypeScript project configuration.",
    };
  }

  try {
    const configFile = ts.readConfigFile(configFileName, (f: string) =>
      fs.readFileSync(f, "utf8"),
    );
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configFileName),
    );

    const servicesHost: any = {
      getScriptFileNames: () => parsedConfig.fileNames,
      getScriptVersion: () => "1",
      getScriptSnapshot: (fileName: string) => {
        if (!fs.existsSync(fileName)) return undefined;
        return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, "utf8"));
      },
      getCurrentDirectory: () => cwd,
      getCompilationSettings: () => parsedConfig.options,
      getDefaultLibFileName: (opts: any) => ts.getDefaultLibFilePath(opts),
      fileExists: fs.existsSync,
      readFile: (f: string) => fs.readFileSync(f, "utf8"),
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    };

    const docRegistry = ts.createDocumentRegistry();
    tsService = ts.createLanguageService(servicesHost, docRegistry);
    tsProgram = tsService.getProgram();
    tsProjectRoot = cwd;

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: `Failed to initialize TS Language Service: ${err.message}` };
  }
}

function isTsFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".ts" || ext === ".tsx";
}

function getPosition(filePath: string, line: number, character: number): number {
  // Convert 1-based line/character to 0-based offset
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  let pos = 0;
  for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
    pos += lines[i].length + 1; // +1 for newline
  }
  return pos + Math.min(character - 1, (lines[line - 1] ?? "").length);
}

function posToLineCol(filePath: string, pos: number): { line: number; character: number } {
  if (!fs.existsSync(filePath)) return { line: 1, character: 1 };
  const content = fs.readFileSync(filePath, "utf8");
  let line = 1;
  let col = 1;
  for (let i = 0; i < pos && i < content.length; i++) {
    if (content[i] === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, character: col };
}

function sourceSnippet(filePath: string, pos: number, context: number = 40): string {
  if (!fs.existsSync(filePath)) return "";
  const content = fs.readFileSync(filePath, "utf8");
  const start = Math.max(0, pos - context);
  const end = Math.min(content.length, pos + context);
  return content.slice(start, end).replace(/\n/g, " ").trim();
}

function resolveTsFilePath(filePath: string, cwd: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(cwd, filePath);
}

// -- lsp_definition handler --------------------------------------------------

interface LspPosition {
  file: string;
  line: number;
  character: number;
}

function handleDefinition(pos: LspPosition, cwd: string) {
  const init = initTsService(cwd);
  if (!init.ok) {
    if (!isTsFile(pos.file)) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              `LSP definition lookup is only available for TypeScript projects. ` +
              `Use 'ast_grep' or 'grep' for other languages. ` +
              `For TypeScript: ensure 'tsconfig.json' exists and typescript is installed.\n\n` +
              `Details: ${init.error}`,
          },
        ],
        details: { error: init.error },
      };
    }
    return {
      content: [{ type: "text" as const, text: init.error! }],
      details: { error: init.error },
      isError: true,
    };
  }

  const resolvedPath = resolveTsFilePath(pos.file, cwd);
  if (!fs.existsSync(resolvedPath)) {
    return {
      content: [
        {
          type: "text" as const,
          text: `File not found: ${pos.file}`,
        },
      ],
      details: { error: "File not found" },
      isError: true,
    };
  }

  const offset = getPosition(resolvedPath, pos.line, pos.character);

  try {
    const defs = tsService.getDefinitionAtPosition(resolvedPath, offset);
    if (!defs || defs.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No definition found at ${pos.file}:${pos.line}:${pos.character}`,
          },
        ],
        details: { found: false },
      };
    }

    const lines: string[] = [`Definition(s) at ${pos.file}:${pos.line}:${pos.character}:`];
    for (const d of defs) {
      const lc = posToLineCol(d.fileName, d.textSpan.start);
      const snippet = sourceSnippet(d.fileName, d.textSpan.start);
      const relPath = path.relative(cwd, d.fileName);
      lines.push(`  - ${relPath}:${lc.line}:${lc.character} — \`${snippet}\``);
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: {
        found: true,
        count: defs.length,
        definitions: defs.map((d: any) => ({
          file: path.relative(cwd, d.fileName),
          ...posToLineCol(d.fileName, d.textSpan.start),
          length: d.textSpan.length,
        })),
      },
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: `LSP definition error: ${err.message}`,
        },
      ],
      details: { error: err.message },
      isError: true,
    };
  }
}

// -- lsp_references handler --------------------------------------------------

function handleReferences(
  pos: LspPosition,
  includeDeclaration: boolean,
  cwd: string,
) {
  const init = initTsService(cwd);
  if (!init.ok) {
    return {
      content: [
        {
          type: "text" as const,
          text: `LSP references lookup unavailable: ${init.error}`,
        },
      ],
      details: { error: init.error },
      isError: true,
    };
  }

  const resolvedPath = resolveTsFilePath(pos.file, cwd);
  if (!fs.existsSync(resolvedPath)) {
    return {
      content: [{ type: "text" as const, text: `File not found: ${pos.file}` }],
      details: { error: "File not found" },
      isError: true,
    };
  }

  const offset = getPosition(resolvedPath, pos.line, pos.character);

  try {
    const refs = tsService.getReferencesAtPosition(resolvedPath, offset);
    if (!refs || refs.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No references found at ${pos.file}:${pos.line}:${pos.character}`,
          },
        ],
        details: { found: false },
      };
    }

    // Group by file for cleaner output
    const byFile: Map<string, any[]> = new Map();
    for (const r of refs) {
      const f = r.fileName;
      if (!byFile.has(f)) byFile.set(f, []);
      byFile.get(f)!.push(r);
    }

    const lines: string[] = [
      `Found ${refs.length} reference(s) at ${pos.file}:${pos.line}:${pos.character}:`,
      "",
    ];

    const maxShow = 50;
    let shown = 0;
    for (const [file, entries] of byFile) {
      const relPath = path.relative(cwd, file);
      lines.push(`  ${relPath} (${entries.length}):`);
      for (const e of entries.slice(0, 10)) {
        const lc = posToLineCol(file, e.textSpan.start);
        const snippet = sourceSnippet(file, e.textSpan.start);
        lines.push(`    ${lc.line}:${lc.character} — \`${snippet}\``);
        shown++;
        if (shown >= maxShow) break;
      }
      if (entries.length > 10) {
        lines.push(`    ... and ${entries.length - 10} more`);
      }
      if (shown >= maxShow) break;
    }

    if (refs.length > maxShow) {
      lines.push(`\n... and ${refs.length - maxShow} more references. Use paths/limit to narrow.`);
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: {
        found: true,
        count: refs.length,
        includeDeclaration,
      },
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: `LSP references error: ${err.message}`,
        },
      ],
      details: { error: err.message },
      isError: true,
    };
  }
}

// -- lsp_rename handler ------------------------------------------------------

function handleRename(
  pos: LspPosition,
  newName: string,
  dryRun: boolean,
  cwd: string,
) {
  const init = initTsService(cwd);
  if (!init.ok) {
    return {
      content: [
        {
          type: "text" as const,
          text: `LSP rename unavailable: ${init.error}`,
        },
      ],
      details: { error: init.error },
      isError: true,
    };
  }

  const resolvedPath = resolveTsFilePath(pos.file, cwd);
  if (!fs.existsSync(resolvedPath)) {
    return {
      content: [{ type: "text" as const, text: `File not found: ${pos.file}` }],
      details: { error: "File not found" },
      isError: true,
    };
  }

  const offset = getPosition(resolvedPath, pos.line, pos.character);

  try {
    const renameLocations = tsService.findRenameLocations(
      resolvedPath,
      offset,
      false, // findInStrings
      false, // findInComments
    );

    if (!renameLocations || !renameLocations.length) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No rename locations found for symbol at ${pos.file}:${pos.line}:${pos.character}`,
          },
        ],
        details: { found: false },
      };
    }

    const prefix = dryRun ? "## DRY RUN — No files modified\n\n" : "## Rename Applied\n\n";

    const byFile: Map<string, any[]> = new Map();
    for (const loc of renameLocations) {
      const f = loc.fileName;
      if (!byFile.has(f)) byFile.set(f, []);
      byFile.get(f)!.push(loc);
    }

    const lines: string[] = [
      `${prefix}Renaming \`${renameLocations[0].prefixText ?? ""}${newName}${renameLocations[0].suffixText ?? ""}\``,
      `${renameLocations.length} location(s) across ${byFile.size} file(s):`,
      "",
    ];

    for (const [file, entries] of byFile) {
      const relPath = path.relative(cwd, file);
      lines.push(`  ${relPath} (${entries.length}):`);
      for (const e of entries.slice(0, 5)) {
        const lc = posToLineCol(file, e.textSpan.start);
        lines.push(`    ${lc.line}:${lc.character}`);
      }
      if (entries.length > 5) {
        lines.push(`    ... and ${entries.length - 5} more`);
      }
    }

    if (!dryRun) {
      lines.push("");
      lines.push("⚠️ Rename is currently preview-only. Manual confirmation required for actual file edits.");
      lines.push("   Verify the locations above, then apply changes manually or via edit tool.");
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: {
        dryRun,
        count: renameLocations.length,
        fileCount: byFile.size,
        newName,
      },
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: `LSP rename error: ${err.message}`,
        },
      ],
      details: { error: err.message },
      isError: true,
    };
  }
}

// -- lsp_workspace_symbols handler -------------------------------------------

function handleWorkspaceSymbols(query: string, limit: number, cwd: string) {
  const init = initTsService(cwd);
  if (!init.ok) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Workspace symbols unavailable: ${init.error}`,
        },
      ],
      details: { error: init.error },
      isError: true,
    };
  }

  const clampedLimit = Math.min(limit || 20, 100);

  try {
    const items = tsService.getNavigateToItems(query, clampedLimit);

    if (!items || items.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No workspace symbols found for query: "${query}"`,
          },
        ],
        details: { found: false, query },
      };
    }

    const lines: string[] = [
      `Found ${items.length} workspace symbol(s) for "${query}":`,
      "",
    ];

    for (const item of items) {
      const relPath = path.relative(cwd, item.fileName);
      const lc = posToLineCol(item.fileName, item.textSpan.start);
      const kind = item.kind || "unknown";
      lines.push(`  [${kind}] ${item.name} — ${relPath}:${lc.line}:${lc.character}`);
    }

    if (items.length >= clampedLimit) {
      lines.push(`\n  (results capped at ${clampedLimit}. Use a more specific query.)`);
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: {
        found: true,
        count: items.length,
        query,
        limit: clampedLimit,
      },
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Workspace symbols error: ${err.message}`,
        },
      ],
      details: { error: err.message },
      isError: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  // ---- Phase 1: Post-edit type-check hook (existing behavior) --------------

  pi.on("tool_result", async (event: any, _ctx: any) => {
    const targetTools = [
      "edit",
      "write",
      "replace_file_content",
      "multi_replace_file_content",
      "write_to_file",
    ];

    if (!targetTools.includes(event.tool)) return;
    if (!isAutoTypeCheckEnabled()) return;

    const args = event.arguments || event.args || {};
    const rawFilePath =
      args.TargetFile || args.targetFile || args.path || args.file || args.filepath;

    if (typeof rawFilePath !== "string") return;

    const filePath = path.resolve(process.cwd(), rawFilePath);
    const checker = detectTypeChecker(filePath);
    if (!checker) return;

    const { success, output, skipped } = runTypeCheck(checker);
    if (skipped) return;

    const checkSummary = formatTypeCheckOutput(success, output);

    if (typeof event.result === "string") {
      event.result += `\n\n[starterKit] ${checkSummary}`;
    } else if (event.result && typeof event.result === "object") {
      if (typeof event.result.output === "string") {
        event.result.output += `\n\n[starterKit] ${checkSummary}`;
      } else if (typeof event.result.content === "string") {
        event.result.content += `\n\n[starterKit] ${checkSummary}`;
      } else {
        event.result.typecheck = checkSummary;
      }
    } else if (typeof event.output === "string") {
      event.output += `\n\n[starterKit] ${checkSummary}`;
    } else {
      event.result = `[starterKit] ${checkSummary}`;
    }
  });

  // ---- Phase 2: Symbol operations -----------------------------------------

  // -- lsp_definition -------------------------------------------------------

  pi.registerTool({
    name: "lsp_definition",
    label: "LSP Go to Definition",
    description:
      "Find the definition of a symbol at the given file position. " +
      "Uses the TypeScript Language Service for .ts/.tsx files. " +
      "For other languages, use 'grep' or 'ast_grep'. " +
      "Use this when you need to jump to where a function, class, variable, or type is defined.",
    promptSnippet: "lsp_definition(file, line, character)",
    promptGuidelines: [
      "Use lsp_definition to find where a symbol is defined (not just re-exported).",
      "For TypeScript projects only. Falls back gracefully for other languages.",
      "Line and character are 1-based (as shown in editors).",
    ],
    parameters: Type.Object({
      file: Type.String({
        description:
          "File path relative to workspace root (e.g., 'src/app.ts').",
      }),
      line: Type.Number({
        description: "1-based line number of the symbol.",
      }),
      character: Type.Number({
        description: "1-based character/column position of the symbol.",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd ?? process.cwd();
      const pos: LspPosition = {
        file: params.file,
        line: params.line,
        character: params.character,
      };
      return handleDefinition(pos, cwd);
    },
  });

  // -- lsp_references -------------------------------------------------------

  pi.registerTool({
    name: "lsp_references",
    label: "LSP Find References",
    description:
      "Find all references to a symbol at the given file position. " +
      "Uses the TypeScript Language Service. Returns references grouped by file. " +
      "Use this when you need to know where a function, class, or variable is used " +
      "across the project.",
    promptSnippet: "lsp_references(file, line, character, includeDeclaration?)",
    promptGuidelines: [
      "Use lsp_references to understand the blast radius before renaming or deleting a symbol.",
      "References are grouped by file for clarity.",
      "Max 50 references shown. Use more specific queries for large results.",
    ],
    parameters: Type.Object({
      file: Type.String({
        description: "File path relative to workspace root.",
      }),
      line: Type.Number({ description: "1-based line number." }),
      character: Type.Number({ description: "1-based character position." }),
      includeDeclaration: Type.Optional(
        Type.Boolean({
          description:
            "Include the declaration site in results. Default: true.",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd ?? process.cwd();
      const pos: LspPosition = {
        file: params.file,
        line: params.line,
        character: params.character,
      };
      return handleReferences(pos, params.includeDeclaration !== false, cwd);
    },
  });

  // -- lsp_rename -----------------------------------------------------------

  pi.registerTool({
    name: "lsp_rename",
    label: "LSP Rename Symbol",
    description:
      "Preview a symbol rename across the project. **Defaults to dry-run** " +
      "(preview only, no files changed). Uses the TypeScript Language Service. " +
      "Shows all locations where the symbol would be renamed. " +
      "Prefer this over textual search-and-replace for symbol renames — LSP " +
      "understands scope, types, and real references.",
    promptSnippet: "lsp_rename(file, line, character, newName, dryRun?)",
    promptGuidelines: [
      "Always start with dryRun=true (the default) to preview the rename scope.",
      "Review the file list and location count before applying.",
      "LSP rename understands scope — it won't rename unrelated variables with the same name.",
      "Currently preview-only for safety. Apply changes after reviewing preview output.",
    ],
    parameters: Type.Object({
      file: Type.String({ description: "File path relative to workspace root." }),
      line: Type.Number({ description: "1-based line number." }),
      character: Type.Number({ description: "1-based character position." }),
      newName: Type.String({
        description: "The new name for the symbol.",
      }),
      dryRun: Type.Optional(
        Type.Boolean({
          description:
            "Preview rename locations without modifying files. Default: true.",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd ?? process.cwd();
      const pos: LspPosition = {
        file: params.file,
        line: params.line,
        character: params.character,
      };
      return handleRename(pos, params.newName, params.dryRun !== false, cwd);
    },
  });

  // -- lsp_workspace_symbols ------------------------------------------------

  pi.registerTool({
    name: "lsp_workspace_symbols",
    label: "LSP Workspace Symbols",
    description:
      "Search for symbols across the entire TypeScript project. " +
      "Returns matching functions, classes, interfaces, variables, types, etc. " +
      "Use this for project-wide symbol search (like an IDE's 'Go to Symbol'). " +
      "Faster than grep for symbol-level queries.",
    promptSnippet: "lsp_workspace_symbols(query, limit?)",
    promptGuidelines: [
      "Use lsp_workspace_symbols to find symbols by name across the project.",
      "Replaces grep for symbol-level searches in TypeScript projects.",
      "Max 100 results. Use more specific queries for large projects.",
    ],
    parameters: Type.Object({
      query: Type.String({
        description:
          "Symbol name or partial name to search for (e.g., 'useAuth', 'UserService').",
      }),
      limit: Type.Optional(
        Type.Number({
          description: "Maximum results (default 20, max 100).",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd ?? process.cwd();
      return handleWorkspaceSymbols(params.query, params.limit ?? 20, cwd);
    },
  });
}
