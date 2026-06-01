import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { basename, resolve } from "node:path";
import {
  ARCHIVE_PREVIEW_MAX_BUFFER_BYTES,
  ARCHIVE_PREVIEW_MAX_FILES,
  ARCHIVE_PREVIEW_MAX_LINES,
  ARCHIVE_PREVIEW_TIMEOUT_MS,
  ARTIFACT_PROCESS_MAX_BUFFER_BYTES,
  ARTIFACT_PROCESS_TIMEOUT_MS,
  MAX_ARCHIVE_TEXT_MEMBER_BYTES,
} from "../../shared/constants.js";
import type { ArtifactReadResult, ReadMode } from "../types.js";
import { errResult, formatSize, okResult, trimOutput } from "../utils/format.js";

/**
 * @internal
 * Render archive summaries, listings, and text-file extraction previews.
 */
export function handleArchive(
  filePath: string,
  mode: ReadMode,
  archType: "zip" | "tar" | "tar-gz",
  limit: number,
  cwd: string,
): ArtifactReadResult {
  if (mode === "query" || mode === "schema") {
    return errResult(archType, mode, `Mode "${mode}" is not supported for archives.`, "Use 'summary', 'list', 'sample', or 'extract-preview' for archives.");
  }

  try {
    const resolved = resolve(cwd, filePath);
    const fileSize = statSync(resolved).size;

    if (mode === "summary") {
      let entryCount = 0;
      try {
        entryCount = listArchive(resolved, archType).split("\n").filter((l) => l.trim()).length;
      } catch {
        // Listing failures are reported as unknown count in summary mode.
      }
      return okResult(archType, "summary", [
        `Archive: ${basename(filePath)}`,
        `Type: ${archType}`,
        `Size: ${formatSize(fileSize)}`,
        `Entries: ${entryCount > 0 ? entryCount : "(could not determine)"}`,
      ].join("\n"));
    }

    const listing = listArchive(resolved, archType);
    const unsafeEntry = findUnsafeArchiveEntry(listing, archType);
    if (unsafeEntry) {
      return errResult(archType, mode, `Archive contains unsafe path entry: ${unsafeEntry}`, "Do not preview archives containing absolute paths or parent-directory traversal entries.");
    }

    const entries = listing.split("\n").filter((l) => l.trim());
    const displayEntries = entries.slice(0, limit);
    const lines = [`Archive: ${basename(filePath)} (${archType})`, `Entries: ${entries.length}`, "", ...displayEntries];
    if (entries.length > limit) lines.push(`\n... and ${entries.length - limit} more entries.`);

    if (mode === "extract-preview") {
      const previewLines = [...lines, "\n--- Content preview (first 5 text files) ---"];
      try {
        previewLines.push(...previewArchive(resolved, archType, ARCHIVE_PREVIEW_MAX_FILES));
      } catch {
        previewLines.push("(content preview failed)");
      }
      return okResult(archType, "extract-preview", previewLines.join("\n"));
    }

    return okResult(archType, mode === "list" ? "list" : "sample", lines.join("\n"));
  } catch (err: any) {
    return errResult(archType, mode, `Archive error: ${err.message}`, "Check that the archive is valid and required tools (tar, unzip) are installed.");
  }
}

function runSpawnOrThrow(cmd: string, args: string[], options: any): string {
  const result = spawnSync(cmd, args, {
    encoding: "utf-8",
    timeout: ARTIFACT_PROCESS_TIMEOUT_MS,
    maxBuffer: ARTIFACT_PROCESS_MAX_BUFFER_BYTES,
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

function previewArchive(filePath: string, archType: "zip" | "tar" | "tar-gz", maxFiles: number): string[] {
  if (archType === "zip") {
    const listing = runSpawnOrThrow("unzip", ["-l", filePath], { timeout: ARTIFACT_PROCESS_TIMEOUT_MS, maxBuffer: ARCHIVE_PREVIEW_MAX_BUFFER_BYTES });
    const names = parseZipListing(listing)
      .filter((f) => isSafeArchiveEntry(f.name) && isTextFile(f.name) && f.size < MAX_ARCHIVE_TEXT_MEMBER_BYTES)
      .slice(0, maxFiles);
    const previews: string[] = [];
    for (const { name } of names) {
      try {
        const content = runSpawnOrThrow("unzip", ["-p", filePath, name], { timeout: ARCHIVE_PREVIEW_TIMEOUT_MS, maxBuffer: ARCHIVE_PREVIEW_MAX_BUFFER_BYTES });
        previews.push(`--- ${name} ---`, trimOutput(content, ARCHIVE_PREVIEW_MAX_LINES));
      } catch {
        previews.push(`--- ${name} (read failed) ---`);
      }
    }
    return previews;
  }

  const tarFlag = archType === "tar-gz" ? "-tzf" : "-tf";
  const listing = runSpawnOrThrow("tar", [tarFlag, filePath], { timeout: ARTIFACT_PROCESS_TIMEOUT_MS, maxBuffer: ARCHIVE_PREVIEW_MAX_BUFFER_BYTES });
  const fileNames = listing.split("\n").filter((l) => l.trim() && isSafeArchiveEntry(l) && isTextFile(l) && !l.endsWith("/")).slice(0, maxFiles);
  const previews: string[] = [];
  for (const f of fileNames) {
    try {
      const extractToStdoutFlag = archType === "tar-gz" ? "-xzOf" : "-xOf";
      const content = runSpawnOrThrow("tar", [extractToStdoutFlag, filePath, f], { timeout: ARCHIVE_PREVIEW_TIMEOUT_MS, maxBuffer: ARCHIVE_PREVIEW_MAX_BUFFER_BYTES });
      previews.push(`--- ${f} ---`, trimOutput(content, ARCHIVE_PREVIEW_MAX_LINES));
    } catch {
      previews.push(`--- ${f} (read failed) ---`);
    }
  }
  return previews;
}

function archiveEntryNames(listing: string, archType: "zip" | "tar" | "tar-gz"): string[] {
  if (archType === "zip") return parseZipListing(listing).map((entry) => entry.name);
  return listing.split("\n").map((line) => line.trim()).filter(Boolean);
}

function isSafeArchiveEntry(name: string): boolean {
  return !name.startsWith("/") && !name.split(/[\\/]+/).includes("..");
}

function findUnsafeArchiveEntry(listing: string, archType: "zip" | "tar" | "tar-gz"): string | null {
  return archiveEntryNames(listing, archType).find((name) => !isSafeArchiveEntry(name)) ?? null;
}

function parseZipListing(listing: string): { name: string; size: number }[] {
  const results: { name: string; size: number }[] = [];
  for (const line of listing.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+[\d-]+\s+[\d:]+\s+(.+)$/);
    if (match) results.push({ size: parseInt(match[1], 10), name: match[2].trim() });
  }
  return results;
}

function isTextFile(name: string): boolean {
  const lower = name.toLowerCase();
  return [".txt", ".md", ".json", ".jsonl", ".csv", ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".yaml", ".yml", ".toml", ".xml", ".html", ".css", ".sql", ".log"].some((ext) => lower.endsWith(ext));
}
