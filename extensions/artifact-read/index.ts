import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { existsSync, statSync } from "node:fs";
import { basename } from "node:path";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../shared/constants.js";
import { confineToWorkspace } from "../shared/path-utils.js";
import { handleArchive } from "./handlers/archive.js";
import { handleCsv } from "./handlers/csv.js";
import { handleDirectory } from "./handlers/directory.js";
import { handleJson, handleJsonl } from "./handlers/json.js";
import { handleSqlite } from "./handlers/sqlite.js";
import type { ArtifactReadParams, ArtifactReadResult } from "./types.js";
import { READ_MODES } from "./types.js";
import { detectType } from "./utils/detect-type.js";
import { errResult } from "./utils/format.js";

/** Main dispatcher for the `artifact_read` tool. */
function handleArtifactRead(params: ArtifactReadParams, cwd: string): ArtifactReadResult {
  const { resolved, safe } = confineToWorkspace(params.path, cwd);
  const mode = params.mode ?? "summary";

  if (!safe) {
    return errResult("unknown", mode, `Path "${params.path}" escapes workspace root.`, "Only files inside the project workspace can be read.");
  }
  if (!existsSync(resolved)) {
    return errResult("unknown", mode, `Path "${params.path}" does not exist.`, "Check the path and try again.");
  }

  const st = statSync(resolved);
  const fileType = detectType(resolved, st.isDirectory(), st.isFile());
  const limit = Math.min(params.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
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
      return handleSqlite(resolved, mode, params.table, params.query, limit, offset, params.where, params.order, cwd);
    case "zip":
    case "tar":
    case "tar-gz":
      return handleArchive(resolved, mode, fileType, limit, cwd);
    default:
      return errResult(
        fileType,
        mode,
        `Unsupported file type: ${fileType}. File: ${basename(resolved)}`,
        "artifact_read supports: directories, CSV, JSON, JSONL, SQLite, and archives (zip, tar, tar.gz). Use `read` for regular source files.",
      );
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "artifact_read",
    label: "Artifact Read",
    description: "Universal read-only tool for structured artifacts. Inspect directories, CSV/JSON/JSONL files, SQLite databases, and archives. Always read-only and path-confined to workspace root.",
    promptSnippet: "artifact_read(path, mode?, table?, query?, limit?)",
    promptGuidelines: [
      "Use artifact_read for SQLite databases, CSV/JSON/JSONL data files, archive contents, and directory overviews.",
      "Start with mode='summary' to understand the artifact shape, then use mode='schema' or mode='sample' for detail.",
      "For SQLite, use mode='query' with read-only SELECT. Writes (INSERT/UPDATE/DELETE/DROP) are blocked.",
      "Use offset/limit for pagination on large datasets. Never expect artifact_read to dump entire files.",
      "Do NOT use artifact_read for regular source code files — use `read` instead.",
    ],
    parameters: Type.Object({
      path: Type.String({ description: "Path to the artifact file or directory (relative to workspace root)." }),
      mode: Type.Optional(Type.Union(READ_MODES.map((mode) => Type.Literal(mode)) as any, { description: "Read mode. Defaults to 'summary'." })),
      table: Type.Optional(Type.String({ description: "SQLite table name (for schema/sample/query/list modes)." })),
      query: Type.Optional(Type.String({ description: "Read-only SQL query for SQLite (SELECT/PRAGMA/EXPLAIN only)." })),
      limit: Type.Optional(Type.Number({ description: `Maximum rows/entries to return (default ${DEFAULT_PAGE_SIZE}, max ${MAX_PAGE_SIZE}).` })),
      offset: Type.Optional(Type.Number({ description: "Row offset for pagination (default 0)." })),
      where: Type.Optional(Type.String({ description: "WHERE clause for SQLite table queries (read-only)." })),
      order: Type.Optional(Type.String({ description: "ORDER BY clause for SQLite table queries." })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = handleArtifactRead(params as ArtifactReadParams, ctx.cwd ?? process.cwd());
      return {
        content: [{ type: "text" as const, text: result.output }],
        details: { ok: result.ok, detectedType: result.detectedType, mode: result.mode, suggestion: result.suggestion },
      };
    },
  });
}
