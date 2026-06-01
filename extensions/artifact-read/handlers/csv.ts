import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import type { ArtifactReadResult, ReadMode } from "../types.js";
import { errResult, formatSize, okResult } from "../utils/format.js";

/**
 * @internal
 * Render summary, schema, or sample output for a CSV file.
 */
export function handleCsv(filePath: string, mode: ReadMode, limit: number): ArtifactReadResult {
  if (mode === "query" || mode === "extract-preview") {
    return errResult("csv", mode, `Mode "${mode}" is not supported for CSV files.`, "Use 'summary', 'schema', 'sample', or 'list' for CSV.");
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
    const headers = lines.length > 0 ? parseCsvLine(lines[0]) : [];
    const rowCount = Math.max(0, lines.length - 1);
    const fileSize = statSync(filePath).size;

    if (mode === "summary") {
      return okResult("csv", "summary", [
        `CSV File: ${basename(filePath)}`,
        `Size: ${formatSize(fileSize)}`,
        `Rows: ${rowCount} (${lines.length} total lines)`,
        `Columns: ${headers.length}`,
        `Columns: ${headers.join(", ")}`,
      ].join("\n"));
    }

    if (mode === "schema") {
      return okResult("csv", "schema", [
        `CSV Schema: ${basename(filePath)}`,
        `Columns (${headers.length}):`,
        ...headers.map((h, i) => `  ${i + 1}. ${h}`),
      ].join("\n"));
    }

    const sampleLines = lines.slice(0, Math.min(limit + 1, lines.length));
    if (lines.length > sampleLines.length) sampleLines.push(`\n... and ${lines.length - sampleLines.length} more lines.`);
    return okResult("csv", mode === "list" ? "list" : "sample", sampleLines.join("\n"));
  } catch (err: any) {
    return errResult("csv", mode, `Failed to read CSV: ${err.message}`, "Check that the path is a valid CSV file.");
  }
}

/** Parse one CSV line, including simple quoted fields and escaped quotes. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
