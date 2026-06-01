import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { MAGIC_BYTES_LENGTH } from "../../shared/constants.js";
import type { FileType } from "../types.js";

/**
 * Detect the supported artifact type for a filesystem entry.
 *
 * Extension checks are preferred for speed, with SQLite magic bytes used as a
 * fallback because database files often have generic names.
 *
 * @internal
 */
export function detectType(filePath: string, isDir: boolean, isFile: boolean): FileType {
  if (isDir) return "directory";

  const ext = extname(filePath).toLowerCase();
  const name = basename(filePath).toLowerCase();

  if ([".db", ".sqlite", ".sqlite3"].includes(ext)) return "sqlite";
  if (name.endsWith(".tar.gz") || name.endsWith(".tgz")) return "tar-gz";
  if (ext === ".tar") return "tar";
  if (ext === ".zip") return "zip";
  if (ext === ".csv") return "csv";
  if (ext === ".jsonl") return "jsonl";
  if (ext === ".json") return "json";

  if (isFile) {
    try {
      const header = readFileSync(filePath, { encoding: null, flag: "r" }).subarray(0, MAGIC_BYTES_LENGTH);
      const magic = header.toString("utf-8", 0, MAGIC_BYTES_LENGTH);
      if (magic.startsWith("SQLite format 3")) return "sqlite";
    } catch {
      // Not readable as binary, ignore.
    }
  }

  return "unknown";
}
