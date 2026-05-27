/**
 * artifact-read — Universal artifact reader for Pi.dev Starter Kit.
 *
 * Registers the `artifact_read` tool, providing structured read-only inspection
 * of SQLite databases, CSV/JSON/JSONL files, archives (zip/tar/tar.gz/tgz),
 * and directory layouts. Always read-only. Path-confined to workspace root.
 * Returns summaries by default; uses pagination to avoid huge context dumps.
 *
 * Inspired by Oh-My-Pi's universal `read` tool, as praised by Akita.
 *
 * Phase 1: directories, CSV/JSON/JSONL, SQLite, archives.
 * Phase 2 (future): documents (PDF/DOCX/XLSX), notebooks (Jupyter).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { resolve, relative, basename, extname, join } from "node:path";
import { spawnSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const READ_MODES = [
  "summary",
  "schema",
  "sample",
  "query",
  "list",
  "extract-preview",
] as const;
type ReadMode = (typeof READ_MODES)[number];

interface ArtifactReadParams {
  path: string;
  mode?: ReadMode;
  table?: string;
  query?: string;
  limit?: number;
  offset?: number;
  where?: string;
  order?: string;
}

interface ArtifactReadResult {
  ok: boolean;
  detectedType: string;
  mode: ReadMode;
  output: string;
  suggestion?: string;
}

// ---------------------------------------------------------------------------
// File type detection
// ---------------------------------------------------------------------------

type FileType =
  | "directory"
  | "csv"
  | "json"
  | "jsonl"
  | "sqlite"
  | "zip"
  | "tar"
  | "tar-gz"
  | "unknown";

function detectType(filePath: string, isDir: boolean, isFile: boolean): FileType {
  if (isDir) return "directory";

  const ext = extname(filePath).toLowerCase();
  const name = basename(filePath).toLowerCase();

  // SQLite: db, sqlite, sqlite3 extensions OR magic bytes
  if ([".db", ".sqlite", ".sqlite3"].includes(ext)) return "sqlite";

  // Tar variants
  if (name.endsWith(".tar.gz") || name.endsWith(".tgz")) return "tar-gz";
  if (ext === ".tar") return "tar";
  if (ext === ".zip") return "zip";

  // Data files
  if (ext === ".csv") return "csv";
  if (ext === ".jsonl") return "jsonl";
  if (ext === ".json") return "json";

  // Try to detect SQLite by magic bytes
  if (isFile) {
    try {
      const header = readFileSync(filePath, { encoding: null, flag: "r" }).subarray(0, 16);
      const magic = header.toString("utf-8", 0, 16);
      if (magic.startsWith("SQLite format 3")) return "sqlite";
    } catch {
      // Not readable as binary, ignore
    }
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Workspace path resolution
// ---------------------------------------------------------------------------

function resolveWorkspacePath(rawPath: string, cwd: string): { resolved: string; safe: boolean } {
  const resolved = resolve(cwd, rawPath);
  const normalizedCwd = resolve(cwd);
  // Check path confinement — reject paths that escape workspace root
  const rel = relative(normalizedCwd, resolved);
  if (rel.startsWith(`..${require("node:path").sep}`) || rel === "..") {
    return { resolved, safe: false };
  }
  return { resolved, safe: true };
}

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

function okResult(detectedType: string, mode: ReadMode, output: string): ArtifactReadResult {
  return { ok: true, detectedType, mode, output };
}

function errResult(
  detectedType: string,
  mode: ReadMode,
  output: string,
  suggestion: string,
): ArtifactReadResult {
  return { ok: false, detectedType, mode, output, suggestion };
}

function trimOutput(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  const truncated = lines.slice(0, maxLines);
  truncated.push(
    `\n... (truncated to ${maxLines} lines. Use limit/offset for pagination.)`,
  );
  return truncated.join("\n");
}

// ---------------------------------------------------------------------------
// Directory handler
// ---------------------------------------------------------------------------

function handleDirectory(dirPath: string, mode: ReadMode, limit: number): ArtifactReadResult {
  if (mode === "query" || mode === "extract-preview") {
    return errResult(
      "directory",
      mode,
      `Mode "${mode}" is not supported for directories.`,
      "Use 'summary', 'list', or 'schema' for directories.",
    );
  }

  try {
    const entries = readdirSync(dirPath);
    const files: { name: string; size: number; isDir: boolean }[] = [];

    for (const entry of entries.slice(0, 500)) {
      try {
        const fullPath = join(dirPath, entry);
        const st = statSync(fullPath);
        files.push({ name: entry, size: st.size, isDir: st.isDirectory() });
      } catch {
        files.push({ name: entry, size: -1, isDir: false });
      }
    }

    files.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const totalFiles = files.filter((f) => !f.isDir).length;
    const totalDirs = files.filter((f) => f.isDir).length;
    const totalSize = files.reduce((sum, f) => sum + Math.max(0, f.size), 0);

    if (mode === "summary") {
      const typeCounts: Record<string, number> = {};
      for (const f of files) {
        if (f.isDir) continue;
        const ext = extname(f.name).toLowerCase() || "(no ext)";
        typeCounts[ext] = (typeCounts[ext] ?? 0) + 1;
      }
      const topTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const lines = [
        `Directory: ${dirPath}`,
        `Contents: ${entries.length} entries (${totalDirs} dirs, ${totalFiles} files)`,
        `Total size: ${formatSize(totalSize)}`,
        "",
        "Top file types:",
        ...topTypes.map(([ext, count]) => `  ${ext}: ${count}`),
      ];

      return okResult("directory", "summary", lines.join("\n"));
    }

    // List mode — show files
    const displayEntries = files.slice(0, limit);
    const lines = [
      `${"Type".padEnd(5)} ${"Size".padEnd(12)} Name`,
      `${"────".padEnd(5)} ${"────────".padEnd(12)} ────`,
    ];

    for (const f of displayEntries) {
      const type = f.isDir ? "dir" : "file";
      const sizeStr = f.isDir ? "-" : formatSize(f.size);
      lines.push(`${type.padEnd(5)} ${sizeStr.padEnd(12)} ${f.name}`);
    }

    if (files.length > limit) {
      lines.push(`\n... and ${files.length - limit} more entries.`);
    }

    return okResult("directory", "list", lines.join("\n"));
  } catch (err: any) {
    return errResult(
      "directory",
      mode,
      `Failed to read directory: ${err.message}`,
      "Check that the path is a readable directory.",
    );
  }
}

// ---------------------------------------------------------------------------
// CSV handler
// ---------------------------------------------------------------------------

function handleCsv(filePath: string, mode: ReadMode, limit: number): ArtifactReadResult {
  if (mode === "query" || mode === "extract-preview") {
    return errResult(
      "csv",
      mode,
      `Mode "${mode}" is not supported for CSV files.`,
      "Use 'summary', 'schema', or 'sample' for CSV files.",
    );
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");

    if (lines.length === 0) {
      return okResult("csv", mode, "CSV file is empty.");
    }

    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine);
    const dataLines = lines.slice(1);

    if (mode === "summary") {
      const fileSize = statSync(filePath).size;
      return okResult(
        "csv",
        "summary",
        [
          `CSV File: ${basename(filePath)}`,
          `Size: ${formatSize(fileSize)}`,
          `Rows: ${dataLines.length} (${lines.length} total lines)`,
          `Columns: ${headers.length}`,
          `Columns: ${headers.join(", ")}`,
        ].join("\n"),
      );
    }

    if (mode === "schema") {
      return okResult(
        "csv",
        "schema",
        [
          `CSV Columns (${headers.length}):`,
          ...headers.map((h, i) => `  ${i + 1}. ${h}`),
        ].join("\n"),
      );
    }

    // Sample mode
    const sampleCount = Math.min(limit, dataLines.length);
    const outLines = [headerLine];
    for (let i = 0; i < sampleCount; i++) {
      outLines.push(dataLines[i]);
    }

    if (dataLines.length > sampleCount) {
      outLines.push(`\n... and ${dataLines.length - sampleCount} more rows.`);
    }

    return okResult("csv", "sample", outLines.join("\n"));
  } catch (err: any) {
    return errResult(
      "csv",
      mode,
      `Failed to read CSV: ${err.message}`,
      "Check that the path is a valid CSV file.",
    );
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ---------------------------------------------------------------------------
// JSON handler
// ---------------------------------------------------------------------------

function handleJson(filePath: string, mode: ReadMode, limit: number): ArtifactReadResult {
  if (mode === "query" || mode === "extract-preview") {
    return errResult(
      "json",
      mode,
      `Mode "${mode}" is not supported for JSON files.`,
      "Use 'summary', 'schema', or 'sample' for JSON files.",
    );
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    const fileSize = statSync(filePath).size;

    if (mode === "summary") {
      const objType = Array.isArray(parsed) ? "array" : typeof parsed;
      const sizeHint = Array.isArray(parsed)
        ? `${parsed.length} items`
        : `${Object.keys(parsed).length} keys`;
      return okResult(
        "json",
        "summary",
        [
          `JSON File: ${basename(filePath)}`,
          `Size: ${formatSize(fileSize)}`,
          `Type: ${objType}`,
          `Size hint: ${sizeHint}`,
          Array.isArray(parsed) && parsed.length > 0
            ? `First item keys: ${Object.keys(parsed[0] ?? {}).join(", ")}`
            : !Array.isArray(parsed)
              ? `Keys: ${Object.keys(parsed).join(", ")}`
              : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    if (mode === "schema") {
      if (Array.isArray(parsed) && parsed.length > 0) {
        const keys = Object.keys(parsed[0] ?? {});
        return okResult(
          "json",
          "schema",
          [
            `JSON Array with ${parsed.length} items.`,
            `Schema (from first item):`,
            ...keys.map((k) => `  - ${k}`),
          ].join("\n"),
        );
      }
      return okResult(
        "json",
        "schema",
        `JSON object with keys: ${Object.keys(parsed).join(", ")}`,
      );
    }

    // Sample mode
    const jsonStr = JSON.stringify(
      Array.isArray(parsed) ? parsed.slice(0, limit) : parsed,
      null,
      2,
    );
    const truncated = trimOutput(jsonStr, 100);
    const note =
      Array.isArray(parsed) && parsed.length > limit
        ? `\n\n... and ${parsed.length - limit} more items.`
        : "";

    return okResult("json", "sample", truncated + note);
  } catch (err: any) {
    return errResult(
      "json",
      mode,
      `Failed to read JSON: ${err.message}`,
      "Check that the path is a valid JSON file.",
    );
  }
}

// ---------------------------------------------------------------------------
// JSONL handler
// ---------------------------------------------------------------------------

function handleJsonl(
  filePath: string,
  mode: ReadMode,
  limit: number,
): ArtifactReadResult {
  if (mode === "query" || mode === "extract-preview") {
    return errResult(
      "jsonl",
      mode,
      `Mode "${mode}" is not supported for JSONL files.`,
      "Use 'summary', 'schema', or 'sample' for JSONL files.",
    );
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n").filter((l) => l.trim());
    const fileSize = statSync(filePath).size;

    if (mode === "summary") {
      let firstKeys: string[] = [];
      if (lines.length > 0) {
        try {
          firstKeys = Object.keys(JSON.parse(lines[0]));
        } catch {
          // malformed first line, skip
        }
      }
      return okResult(
        "jsonl",
        "summary",
        [
          `JSONL File: ${basename(filePath)}`,
          `Size: ${formatSize(fileSize)}`,
          `Lines: ${lines.length}`,
          `First line keys: ${firstKeys.join(", ") || "(unparseable)"}`,
        ].join("\n"),
      );
    }

    if (mode === "schema") {
      const allKeys = new Set<string>();
      for (const line of lines) {
        try {
          for (const k of Object.keys(JSON.parse(line))) {
            allKeys.add(k);
          }
        } catch {
          // skip malformed lines
        }
      }
      return okResult(
        "jsonl",
        "schema",
        [
          `JSONL with ${lines.length} lines.`,
          `All keys found:`,
          ...[...allKeys].sort().map((k) => `  - ${k}`),
        ].join("\n"),
      );
    }

    // Sample mode
    const sampleCount = Math.min(limit, lines.length);
    const sampleLines = lines.slice(0, sampleCount);
    if (lines.length > sampleCount) {
      sampleLines.push(`\n... and ${lines.length - sampleCount} more lines.`);
    }
    return okResult("jsonl", "sample", sampleLines.join("\n"));
  } catch (err: any) {
    return errResult(
      "jsonl",
      mode,
      `Failed to read JSONL: ${err.message}`,
      "Check that the path is a valid JSONL file.",
    );
  }
}

// ---------------------------------------------------------------------------
// SQLite handler (uses sqlite3 CLI)
// ---------------------------------------------------------------------------

const SQLITE_SAFE_PRAGMAS = new Set([
  "table_list",
  "table_info",
  "table_xinfo",
  "index_list",
  "index_info",
  "index_xinfo",
  "foreign_key_list",
  "foreign_key_check",
  "database_list",
  "compile_options",
  "page_count",
  "page_size",
  "quick_check",
  "integrity_check",
  "schema_version",
  "user_version",
  "application_id",
  "journal_mode",
  "wal_checkpoint",
]);

function handleSqlite(
  filePath: string,
  mode: ReadMode,
  table: string | undefined,
  query: string | undefined,
  limit: number,
  offset: number,
  where: string | undefined,
  order: string | undefined,
  cwd: string,
): ArtifactReadResult {
  try {
    const resolved = resolve(cwd, filePath);

    if (mode === "summary") {
      const tablesList = runSqliteQuery(resolved, ".tables");
      const pageCount = runSqliteQuery(resolved, "PRAGMA page_count;");
      const pageSize = runSqliteQuery(resolved, "PRAGMA page_size;");
      return okResult(
        "sqlite",
        "summary",
        [
          `SQLite Database: ${basename(filePath)}`,
          `Tables: ${tablesList.trim() || "(none)"}`,
          `Page count: ${pageCount.trim()}`,
          `Page size: ${pageSize.trim()}`,
        ].join("\n"),
      );
    }

    if (mode === "schema") {
      let sql: string;
      if (table) {
        // Sanitize table name — only allow alphanumeric and underscore
        const safeTable = table.replace(/[^a-zA-Z0-9_]/g, "");
        sql = `SELECT sql FROM sqlite_master WHERE type='table' AND name='${safeTable}';`;
      } else {
        sql = "SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name;";
      }
      const result = runSqliteQuery(resolved, sql);
      return okResult("sqlite", "schema", trimOutput(result, 100));
    }

    if (mode === "sample") {
      if (!table) {
        return errResult(
          "sqlite",
          "sample",
          "Table name required for sample mode.",
          "Specify `table` parameter.",
        );
      }
      const safeTable = table.replace(/[^a-zA-Z0-9_]/g, "");
      const whereClause = where ? ` WHERE ${sanitizeWhere(where)}` : "";
      const orderClause = order ? ` ORDER BY ${sanitizeOrder(order)}` : "";
      const sql = `SELECT * FROM "${safeTable}"${whereClause}${orderClause} LIMIT ${limit} OFFSET ${offset};`;
      const result = runSqliteQuery(resolved, sql);
      return okResult("sqlite", "sample", trimOutput(result, 100));
    }

    if (mode === "query") {
      // For custom query mode, accept raw query or table-based query
      let sql: string;
      if (query) {
        // Validate: only SELECT and PRAGMA allowed
        sql = query.trim();
        const upper = sql.toUpperCase();
        if (
          !upper.startsWith("SELECT") &&
          !upper.startsWith("PRAGMA") &&
          !upper.startsWith("EXPLAIN")
        ) {
          return errResult(
            "sqlite",
            "query",
            "Only SELECT, PRAGMA, and EXPLAIN queries allowed.",
            "Use read-only queries.",
          );
        }
        // Block dangerous patterns even within SELECT
        if (
          /\bATTACH\b/i.test(upper) ||
          /\bDETACH\b/i.test(upper) ||
          /\bCREATE\b/i.test(upper) ||
          /\bDROP\b/i.test(upper) ||
          /\bINSERT\b/i.test(upper) ||
          /\bUPDATE\b/i.test(upper) ||
          /\bDELETE\b/i.test(upper) ||
          /\bALTER\b/i.test(upper)
        ) {
          return errResult(
            "sqlite",
            "query",
            "Query contains write/modify operations.",
            "Only read-only SELECT and PRAGMA allowed.",
          );
        }
      } else if (table) {
        const safeTable = table.replace(/[^a-zA-Z0-9_]/g, "");
        const whereClause = where ? ` WHERE ${sanitizeWhere(where)}` : "";
        const orderClause = order ? ` ORDER BY ${sanitizeOrder(order)}` : "";
        sql = `SELECT * FROM "${safeTable}"${whereClause}${orderClause} LIMIT ${limit} OFFSET ${offset};`;
      } else {
        return errResult(
          "sqlite",
          "query",
          "Either `query` or `table` parameter required for query mode.",
          "Provide one of: query, table.",
        );
      }
      const result = runSqliteQuery(resolved, sql);
      return okResult("sqlite", "query", trimOutput(result, 100));
    }

    if (mode === "list") {
      // List tables with row counts
      const tableNames = runSqliteQuery(
        resolved,
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
      )
        .split("\n")
        .filter((l) => l.trim());

      if (tableNames.length === 0) {
        return okResult("sqlite", "list", "No tables found.");
      }

      const tableDetails = tableNames.map((t) => {
        const count = runSqliteQuery(resolved, `SELECT COUNT(*) FROM "${t}";`).trim();
        return `  ${t}: ${count} rows`;
      });

      return okResult(
        "sqlite",
        "list",
        [`Tables in ${basename(filePath)}:`, ...tableDetails].join("\n"),
      );
    }

    return errResult(
      "sqlite",
      mode,
      `Unsupported mode for SQLite: ${mode}`,
      "Valid modes: summary, schema, sample, query, list.",
    );
  } catch (err: any) {
    return errResult(
      "sqlite",
      mode,
      `SQLite error: ${err.message}`,
      "Check that the file is a valid SQLite database and sqlite3 CLI is installed.",
    );
  }
}

function runSqliteQuery(dbPath: string, sql: string): string {
  const result = spawnSync("sqlite3", [
    "-readonly",
    "-batch",
    "-nullvalue", "NULL",
    "-separator", "|",
    dbPath,
    sql,
  ], {
    encoding: "utf-8",
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });
  if (result.error) throw result.error;
  return (result.stdout || "") + (result.stderr || "");
}

function sanitizeWhere(where: string): string {
  // Basic sanitization: reject semicolons, block dangerous patterns
  const cleaned = where.replace(/;/g, "");
  if (/\b(DROP|INSERT|UPDATE|DELETE|CREATE|ALTER|ATTACH|DETACH)\b/i.test(cleaned)) {
    throw new Error("Dangerous SQL pattern in WHERE clause");
  }
  return cleaned;
}

function sanitizeOrder(order: string): string {
  const cleaned = order.replace(/[^a-zA-Z0-9_,.\s()]/g, "");
  if (cleaned.length > 100) throw new Error("ORDER clause too long");
  return cleaned;
}

// ---------------------------------------------------------------------------
// Archive handler (zip, tar, tar.gz)
// ---------------------------------------------------------------------------

function handleArchive(
  filePath: string,
  mode: ReadMode,
  archType: "zip" | "tar" | "tar-gz",
  limit: number,
  cwd: string,
): ArtifactReadResult {
  if (mode === "query" || mode === "schema") {
    return errResult(
      archType,
      mode,
      `Mode "${mode}" is not supported for archives.`,
      "Use 'summary', 'list', 'sample', or 'extract-preview' for archives.",
    );
  }

  try {
    const resolved = resolve(cwd, filePath);
    const fileSize = statSync(resolved).size;

    if (mode === "summary") {
      let entryCount = 0;
      try {
        const listing = listArchive(resolved, archType);
        entryCount = listing.split("\n").filter((l) => l.trim()).length;
      } catch {
        // listing failed, continue without count
      }
      return okResult(
        archType,
        "summary",
        [
          `Archive: ${basename(filePath)}`,
          `Type: ${archType}`,
          `Size: ${formatSize(fileSize)}`,
          `Entries: ${entryCount > 0 ? entryCount : "(could not determine)"}`,
        ].join("\n"),
      );
    }

    // list / sample / extract-preview all need listing
    const listing = listArchive(resolved, archType);
    const entries = listing.split("\n").filter((l) => l.trim());
    const displayEntries = entries.slice(0, limit);

    const lines = [
      `Archive: ${basename(filePath)} (${archType})`,
      `Entries: ${entries.length}`,
      "",
      ...displayEntries,
    ];

    if (entries.length > limit) {
      lines.push(`\n... and ${entries.length - limit} more entries.`);
    }

    if (mode === "extract-preview") {
      // Extract first N files to temp dir and return their content summaries
      const previewLines = [...lines];
      previewLines.push("\n--- Content preview (first 5 text files) ---");
      try {
        const previews = previewArchive(resolved, archType, 5);
        previewLines.push(...previews);
      } catch {
        previewLines.push("(content preview failed)");
      }
      return okResult(archType, "extract-preview", previewLines.join("\n"));
    }

    return okResult(archType, mode === "list" ? "list" : "sample", lines.join("\n"));
  } catch (err: any) {
    return errResult(
      archType,
      mode,
      `Archive error: ${err.message}`,
      "Check that the archive is valid and required tools (tar, unzip) are installed.",
    );
  }
}

function runSpawnOrThrow(cmd: string, args: string[], options: any): string {
  const result = spawnSync(cmd, args, {
    encoding: "utf-8",
    timeout: 15000,
    maxBuffer: 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  return (result.stdout || "") + (result.stderr || "");
}

function listArchive(filePath: string, archType: "zip" | "tar" | "tar-gz"): string {
  switch (archType) {
    case "zip":
      return runSpawnOrThrow("unzip", ["-l", filePath], {});
    case "tar":
      return runSpawnOrThrow("tar", ["tf", filePath], {});
    case "tar-gz":
      return runSpawnOrThrow("tar", ["tzf", filePath], {});
  }
}

function previewArchive(
  filePath: string,
  archType: "zip" | "tar" | "tar-gz",
  maxFiles: number,
): string[] {
  if (archType === "zip") {
    const listing = runSpawnOrThrow("unzip", ["-l", filePath], {
      timeout: 10000,
      maxBuffer: 512 * 1024,
    });

    const names = parseZipListing(listing)
      .filter((f) => isTextFile(f.name) && f.size < 10240)
      .slice(0, maxFiles);

    const previews: string[] = [];
    for (const { name } of names) {
      try {
        const content = runSpawnOrThrow("unzip", ["-p", filePath, name], {
          timeout: 5000,
          maxBuffer: 512 * 1024,
        });
        previews.push(`--- ${name} ---`);
        previews.push(trimOutput(content, 20));
      } catch {
        previews.push(`--- ${name} (read failed) ---`);
      }
    }
    return previews;
  }

  // tar variants: stream selected member content to stdout. Never extract to disk.
  const tarFlag = archType === "tar-gz" ? "-tzf" : "-tf";
  const listing = runSpawnOrThrow("tar", [tarFlag, filePath], {
    timeout: 10000,
    maxBuffer: 512 * 1024,
  });

  const fileNames = listing
    .split("\n")
    .filter((l) => l.trim() && isTextFile(l) && !l.endsWith("/"))
    .slice(0, maxFiles);

  const previews: string[] = [];
  for (const f of fileNames) {
    try {
      const extractToStdoutFlag = archType === "tar-gz" ? "-xzOf" : "-xOf";
      const content = runSpawnOrThrow("tar", [extractToStdoutFlag, filePath, f], {
        timeout: 5000,
        maxBuffer: 512 * 1024,
      });
      previews.push(`--- ${f} ---`);
      previews.push(trimOutput(content, 20));
    } catch {
      previews.push(`--- ${f} (read failed) ---`);
    }
  }
  return previews;
}

function parseZipListing(listing: string): { name: string; size: number }[] {
  // unzip -l format: Length   Date   Time   Name
  const lines = listing.split("\n");
  const results: { name: string; size: number }[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\s+[\d-]+\s+[\d:]+\s+(.+)$/);
    if (match) {
      results.push({ size: parseInt(match[1], 10), name: match[2].trim() });
    }
  }
  return results;
}

function isTextFile(name: string): boolean {
  const ext = extname(name).toLowerCase();
  const textExts = new Set([
    ".txt", ".md", ".json", ".jsonl", ".csv", ".yaml", ".yml", ".toml",
    ".xml", ".html", ".css", ".js", ".ts", ".jsx", ".tsx", ".py", ".rb",
    ".rs", ".go", ".java", ".c", ".cpp", ".h", ".hpp", ".sh", ".bash",
    ".sql", ".r", ".R", ".cfg", ".ini", ".env", ".log",
  ]);
  return textExts.has(ext) || ext === "";
}

// ---------------------------------------------------------------------------
// Format helper
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes < 0) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

function handleArtifactRead(params: ArtifactReadParams, cwd: string): ArtifactReadResult {
  const { resolved, safe } = resolveWorkspacePath(params.path, cwd);

  if (!safe) {
    return errResult(
      "unknown",
      params.mode ?? "summary",
      `Path "${params.path}" escapes workspace root.`,
      "Only files inside the project workspace can be read.",
    );
  }

  if (!existsSync(resolved)) {
    return errResult(
      "unknown",
      params.mode ?? "summary",
      `Path "${params.path}" does not exist.`,
      "Check the path and try again.",
    );
  }

  const st = statSync(resolved);
  const fileType = detectType(resolved, st.isDirectory(), st.isFile());
  const mode = params.mode ?? "summary";
  const limit = Math.min(params.limit ?? 50, 200);
  const offset = params.offset ?? 0;

  switch (fileType) {
    case "directory":
      return handleDirectory(resolved, mode, limit);
    case "csv":
      return handleCsv(resolved, mode, limit);
    case "json":
      return handleJson(resolved, mode, limit);
    case "jsonl":
      return handleJsonl(resolved, mode, limit);
    case "sqlite":
      return handleSqlite(
        resolved,
        mode,
        params.table,
        params.query,
        limit,
        offset,
        params.where,
        params.order,
        cwd,
      );
    case "zip":
    case "tar":
    case "tar-gz":
      return handleArchive(resolved, mode, fileType as "zip" | "tar" | "tar-gz", limit, cwd);
    default:
      return errResult(
        fileType,
        mode,
        `Unsupported file type: ${fileType}. File: ${basename(resolved)}`,
        "artifact_read supports: directories, CSV, JSON, JSONL, SQLite, and archives (zip, tar, tar.gz). Use `read` for regular source files.",
      );
  }
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "artifact_read",
    label: "Artifact Read",
    description:
      "Universal read-only tool for structured artifacts. Inspect directories, CSV/JSON/JSONL " +
      "files, SQLite databases, and archives (zip/tar/tar.gz). Always read-only and path-confined " +
      "to workspace root. Returns summaries by default with pagination support. " +
      "Use this instead of shell scripts for SQLite, data files, or archive inspection.",
    promptSnippet: "artifact_read(path, mode?, table?, query?, limit?)",
    promptGuidelines: [
      "Use artifact_read for SQLite databases, CSV/JSON/JSONL data files, " +
        "archive contents, and directory overviews.",
      "Start with mode='summary' to understand the artifact shape, " +
        "then use mode='schema' or mode='sample' for detail.",
      "For SQLite, use mode='query' with read-only SELECT. " +
        "Writes (INSERT/UPDATE/DELETE/DROP) are blocked.",
      "Use offset/limit for pagination on large datasets. " +
        "Never expect artifact_read to dump entire files.",
      "Do NOT use artifact_read for regular source code files — use `read` instead.",
    ],
    parameters: Type.Object({
      path: Type.String({
        description:
          "Path to the artifact file or directory (relative to workspace root).",
      }),
      mode: Type.Optional(
        Type.String({
          description:
            "Read mode: 'summary' (overview), 'schema' (structure), " +
            "'sample' (first rows), 'query' (SQLite SELECT), " +
            "'list' (dir/archive listing), 'extract-preview' (archive content preview). " +
            "Defaults to 'summary'.",
        }),
      ),
      table: Type.Optional(
        Type.String({
          description: "SQLite table name (for schema/sample/query/list modes).",
        }),
      ),
      query: Type.Optional(
        Type.String({
          description: "Read-only SQL query for SQLite (SELECT/PRAGMA only).",
        }),
      ),
      limit: Type.Optional(
        Type.Number({
          description: "Maximum rows/entries to return (default 50, max 200).",
        }),
      ),
      offset: Type.Optional(
        Type.Number({
          description: "Row offset for pagination (default 0).",
        }),
      ),
      where: Type.Optional(
        Type.String({
          description: "WHERE clause for SQLite table queries (read-only).",
        }),
      ),
      order: Type.Optional(
        Type.String({
          description: "ORDER BY clause for SQLite table queries.",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd ?? process.cwd();
      const result = handleArtifactRead(params as ArtifactReadParams, cwd);

      return {
        content: [
          {
            type: "text" as const,
            text: result.output,
          },
        ],
        details: {
          ok: result.ok,
          detectedType: result.detectedType,
          mode: result.mode,
          suggestion: result.suggestion,
        },
      };
    },
  });
}
