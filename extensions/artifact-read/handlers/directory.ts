import { readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { MAX_DIRECTORY_ENTRIES } from "../../shared/constants.js";
import type { ArtifactReadResult, ReadMode } from "../types.js";
import { errResult, formatSize, okResult } from "../utils/format.js";

/**
 * @internal
 * Render a read-only directory overview or listing.
 */
export function handleDirectory(dirPath: string, mode: ReadMode, limit: number): ArtifactReadResult {
  if (mode === "query" || mode === "extract-preview") {
    return errResult("directory", mode, `Mode "${mode}" is not supported for directories.`, "Use 'summary', 'list', or 'schema' for directories.");
  }

  try {
    const entries = readdirSync(dirPath);
    const files: { name: string; size: number; isDir: boolean }[] = [];

    for (const entry of entries.slice(0, MAX_DIRECTORY_ENTRIES)) {
      try {
        const st = statSync(join(dirPath, entry));
        files.push({ name: entry, size: st.size, isDir: st.isDirectory() });
      } catch {
        files.push({ name: entry, size: -1, isDir: false });
      }
    }

    files.sort((a, b) => (a.isDir !== b.isDir ? (a.isDir ? -1 : 1) : a.name.localeCompare(b.name)));
    const totalFiles = files.filter((f) => !f.isDir).length;
    const totalDirs = files.filter((f) => f.isDir).length;
    const totalSize = files.reduce((sum, f) => sum + Math.max(0, f.size), 0);

    if (mode === "summary") {
      const typeCounts: Record<string, number> = {};
      for (const f of files) {
        if (f.isDir) continue;
        const ext = extname(f.name) || "(no extension)";
        typeCounts[ext] = (typeCounts[ext] ?? 0) + 1;
      }
      const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      return okResult("directory", "summary", [
        `Directory: ${dirPath}`,
        `Contents: ${files.length} entries (${totalDirs} dirs, ${totalFiles} files)`,
        `Total size: ${formatSize(totalSize)}`,
        "",
        "Top file types:",
        ...topTypes.map(([ext, count]) => `  ${ext}: ${count}`),
      ].join("\n"));
    }

    if (mode === "schema") {
      const dirs = files.filter((f) => f.isDir).map((f) => f.name);
      const fileTypes = [...new Set(files.filter((f) => !f.isDir).map((f) => extname(f.name) || "(no extension)"))];
      return okResult("directory", "schema", [
        `Directory structure: ${dirPath}`,
        `Subdirectories (${dirs.length}): ${dirs.slice(0, 20).join(", ") || "none"}`,
        `File types: ${fileTypes.join(", ") || "none"}`,
      ].join("\n"));
    }

    const lines = files.slice(0, limit).map((f) => `${f.isDir ? "[dir] " : "[file]"} ${f.name} (${formatSize(f.size)})`);
    if (files.length > limit) lines.push(`\n... and ${files.length - limit} more entries. Use limit/offset.`);
    return okResult("directory", "list", lines.join("\n"));
  } catch (err: any) {
    return errResult("directory", mode, `Failed to read directory: ${err.message}`, "Check that the path is a readable directory.");
  }
}
