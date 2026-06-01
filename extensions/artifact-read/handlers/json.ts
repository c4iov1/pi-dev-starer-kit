import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import type { ArtifactReadResult, ReadMode } from "../types.js";
import { errResult, formatSize, okResult } from "../utils/format.js";

/**
 * @internal
 * Render summary, schema, or sample output for a JSON document.
 */
export function handleJson(filePath: string, mode: ReadMode, limit: number): ArtifactReadResult {
  if (mode === "query" || mode === "extract-preview") {
    return errResult("json", mode, `Mode "${mode}" is not supported for JSON files.`, "Use 'summary', 'schema', 'sample', or 'list' for JSON.");
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    const fileSize = statSync(filePath).size;
    const isArray = Array.isArray(data);

    if (mode === "summary") {
      const lines = [`JSON File: ${basename(filePath)}`, `Size: ${formatSize(fileSize)}`, `Type: ${isArray ? "array" : typeof data}`];
      if (isArray) {
        lines.push(`Size hint: ${data.length} items`);
        if (data[0] && typeof data[0] === "object") lines.push(`First item keys: ${Object.keys(data[0]).join(", ")}`);
      } else if (data && typeof data === "object") {
        lines.push(`Top-level keys: ${Object.keys(data).join(", ")}`);
      }
      return okResult("json", "summary", lines.join("\n"));
    }

    if (mode === "schema") {
      if (isArray) {
        const keys = new Set<string>();
        for (const item of data.slice(0, limit)) {
          if (item && typeof item === "object") Object.keys(item).forEach((k) => keys.add(k));
        }
        return okResult("json", "schema", [`JSON array schema (${data.length} items):`, ...[...keys].sort().map((k) => `  - ${k}`)].join("\n"));
      }
      return okResult("json", "schema", [`JSON object schema:`, ...Object.keys(data ?? {}).sort().map((k) => `  - ${k}: ${typeof data[k]}`)].join("\n"));
    }

    const sample = isArray ? data.slice(0, limit) : data;
    return okResult("json", mode === "list" ? "list" : "sample", JSON.stringify(sample, null, 2));
  } catch (err: any) {
    return errResult("json", mode, `Failed to read JSON: ${err.message}`, "Check that the path is a valid JSON file.");
  }
}

/**
 * @internal
 * Render summary, schema, or sample output for newline-delimited JSON.
 */
export function handleJsonl(filePath: string, mode: ReadMode, limit: number): ArtifactReadResult {
  if (mode === "query" || mode === "extract-preview") {
    return errResult("jsonl", mode, `Mode "${mode}" is not supported for JSONL files.`, "Use 'summary', 'schema', 'sample', or 'list' for JSONL.");
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
    const fileSize = statSync(filePath).size;
    const parsed: any[] = [];
    let malformed = 0;
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        malformed += 1;
      }
    }

    if (mode === "summary") {
      const firstKeys = parsed[0] && typeof parsed[0] === "object" ? Object.keys(parsed[0]) : [];
      return okResult("jsonl", "summary", [
        `JSONL File: ${basename(filePath)}`,
        `Size: ${formatSize(fileSize)}`,
        `Lines: ${lines.length}`,
        `Parsed records: ${parsed.length}`,
        `Malformed lines: ${malformed}`,
        `First line keys: ${firstKeys.join(", ") || "(unparseable)"}`,
      ].join("\n"));
    }

    if (mode === "schema") {
      const keys = new Set<string>();
      for (const item of parsed) {
        if (item && typeof item === "object") Object.keys(item).forEach((k) => keys.add(k));
      }
      return okResult("jsonl", "schema", [`JSONL with ${lines.length} lines.`, `All keys found:`, ...[...keys].sort().map((k) => `  - ${k}`)].join("\n"));
    }

    const sampleLines = lines.slice(0, Math.min(limit, lines.length));
    if (lines.length > sampleLines.length) sampleLines.push(`\n... and ${lines.length - sampleLines.length} more lines.`);
    return okResult("jsonl", mode === "list" ? "list" : "sample", sampleLines.join("\n"));
  } catch (err: any) {
    return errResult("jsonl", mode, `Failed to read JSONL: ${err.message}`, "Check that the path is a valid JSONL file.");
  }
}
