import { spawnSync } from "node:child_process";
import { basename, resolve } from "node:path";
import {
  ARTIFACT_PROCESS_MAX_BUFFER_BYTES,
  ARTIFACT_PROCESS_TIMEOUT_MS,
  SQLITE_OUTPUT_MAX_LINES,
} from "../../shared/constants.js";
import { SQLValidationError } from "../../shared/errors.js";
import type { ArtifactReadResult, ReadMode } from "../types.js";
import { errResult, okResult, trimOutput } from "../utils/format.js";

/**
 * @internal
 * Render SQLite schema, samples, or read-only query results.
 */
export function handleSqlite(
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
      return okResult("sqlite", "summary", [
        `SQLite Database: ${basename(filePath)}`,
        `Tables: ${tablesList.trim() || "(none)"}`,
        `Page count: ${pageCount.trim()}`,
        `Page size: ${pageSize.trim()}`,
      ].join("\n"));
    }

    if (mode === "schema") {
      const sql = table
        ? `SELECT sql FROM sqlite_master WHERE type='table' AND name='${sanitizeIdentifier(table)}';`
        : "SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name;";
      return okResult("sqlite", "schema", trimOutput(runSqliteQuery(resolved, sql), SQLITE_OUTPUT_MAX_LINES));
    }

    if (mode === "sample") {
      if (!table) return errResult("sqlite", "sample", "Table name required for sample mode.", "Specify `table` parameter.");
      const sql = selectSql(table, limit, offset, where, order);
      return okResult("sqlite", "sample", trimOutput(runSqliteQuery(resolved, sql), SQLITE_OUTPUT_MAX_LINES));
    }

    if (mode === "query") {
      let sql: string;
      if (query) {
        sql = validateReadOnlyQuery(query);
      } else if (table) {
        sql = selectSql(table, limit, offset, where, order);
      } else {
        return errResult("sqlite", "query", "Either `query` or `table` parameter required for query mode.", "Provide one of: query, table.");
      }
      return okResult("sqlite", "query", trimOutput(runSqliteQuery(resolved, sql), SQLITE_OUTPUT_MAX_LINES));
    }

    if (mode === "list") {
      const tableNames = runSqliteQuery(resolved, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        .split("\n")
        .filter((l) => l.trim());
      if (tableNames.length === 0) return okResult("sqlite", "list", "No tables found.");
      const tableDetails = tableNames.map((t) => `  ${t}: ${runSqliteQuery(resolved, `SELECT COUNT(*) FROM "${t}";`).trim()} rows`);
      return okResult("sqlite", "list", [`Tables in ${basename(filePath)}:`, ...tableDetails].join("\n"));
    }

    return errResult("sqlite", mode, `Unsupported mode for SQLite: ${mode}`, "Valid modes: summary, schema, sample, query, list.");
  } catch (err: any) {
    return errResult("sqlite", mode, `SQLite error: ${err.message}`, "Check that the file is a valid SQLite database and sqlite3 CLI is installed.");
  }
}

function selectSql(table: string, limit: number, offset: number, where?: string, order?: string): string {
  const safeTable = sanitizeIdentifier(table);
  const whereClause = where ? ` WHERE ${sanitizeWhere(where)}` : "";
  const orderClause = order ? ` ORDER BY ${sanitizeOrder(order)}` : "";
  return `SELECT * FROM "${safeTable}"${whereClause}${orderClause} LIMIT ${limit} OFFSET ${offset};`;
}

function sanitizeIdentifier(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "");
}

function validateReadOnlyQuery(query: string): string {
  const sql = query.trim();
  const upper = sql.toUpperCase();
  if (!upper.startsWith("SELECT") && !upper.startsWith("PRAGMA") && !upper.startsWith("EXPLAIN")) {
    throw new SQLValidationError("Only SELECT, PRAGMA, and EXPLAIN queries allowed.", sql);
  }
  if (/\b(ATTACH|DETACH|CREATE|DROP|INSERT|UPDATE|DELETE|ALTER)\b/i.test(upper)) {
    throw new SQLValidationError("Query contains write/modify operations.", sql);
  }
  return sql;
}

function runSqliteQuery(dbPath: string, sql: string): string {
  const result = spawnSync("sqlite3", ["-readonly", "-batch", "-nullvalue", "NULL", "-separator", "|", dbPath, sql], {
    encoding: "utf-8",
    timeout: ARTIFACT_PROCESS_TIMEOUT_MS,
    maxBuffer: ARTIFACT_PROCESS_MAX_BUFFER_BYTES,
  });
  if (result.error) throw result.error;
  return (result.stdout || "") + (result.stderr || "");
}

function sanitizeWhere(where: string): string {
  const cleaned = where.replace(/;/g, "");
  if (/\b(DROP|INSERT|UPDATE|DELETE|CREATE|ALTER|ATTACH|DETACH)\b/i.test(cleaned)) {
    throw new SQLValidationError("WHERE clause contains unsafe SQL keywords.", cleaned);
  }
  return cleaned;
}

function sanitizeOrder(order: string): string {
  const cleaned = order.replace(/;/g, "");
  if (!/^[a-zA-Z0-9_,\s.\-]+(\s+(ASC|DESC))?$/i.test(cleaned)) {
    throw new SQLValidationError("ORDER BY contains unsafe characters.", cleaned);
  }
  return cleaned;
}
