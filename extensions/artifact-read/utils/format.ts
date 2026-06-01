import { BYTES_PER_KIB } from "../../shared/constants.js";
import type { ArtifactReadResult, ReadMode } from "../types.js";

/** @internal Build a successful artifact-read result. */
export function okResult(detectedType: string, mode: ReadMode, output: string): ArtifactReadResult {
  return { ok: true, detectedType, mode, output };
}

/** @internal Build a structured artifact-read error result with a remediation hint. */
export function errResult(
  detectedType: string,
  mode: ReadMode,
  output: string,
  suggestion: string,
): ArtifactReadResult {
  return { ok: false, detectedType, mode, output, suggestion };
}

/** @internal Truncate multi-line output to keep tool responses context-efficient. */
export function trimOutput(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  const truncated = lines.slice(0, maxLines);
  truncated.push(`\n... (truncated to ${maxLines} lines. Use limit/offset for pagination.)`);
  return truncated.join("\n");
}

/** @internal Format a byte count as a compact human-readable size. */
export function formatSize(bytes: number): string {
  if (bytes < 0) return "unknown";
  if (bytes < BYTES_PER_KIB) return `${bytes} B`;
  if (bytes < BYTES_PER_KIB * BYTES_PER_KIB) return `${(bytes / BYTES_PER_KIB).toFixed(1)} KB`;
  if (bytes < BYTES_PER_KIB * BYTES_PER_KIB * BYTES_PER_KIB) {
    return `${(bytes / (BYTES_PER_KIB * BYTES_PER_KIB)).toFixed(1)} MB`;
  }
  return `${(bytes / (BYTES_PER_KIB * BYTES_PER_KIB * BYTES_PER_KIB)).toFixed(1)} GB`;
}
