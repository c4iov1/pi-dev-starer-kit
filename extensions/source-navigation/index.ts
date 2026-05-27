/**
 * source-navigation — Multi-range reads and anchor-pinned edit previews.
 *
 * Registers `read_ranges` (batch read of scattered sections) and
 * `edit_at_anchor` (preview-only anchor check — validates anchors and shows
 * proposed replacement but does NOT write files).
 *
 * Anchors are stable tags: `path:L10-L25#hash` where the hash is a
 * truncated SHA-256 of the range's content. If the file has changed
 * since the anchor was generated, the edit is refused.
 *
 * edit_at_anchor returns the validated diff for the agent to apply
 * via the normal `edit` tool (which goes through the permission pipeline).
 *
 * Inspired by Oh-My-Pi's multi-range reads and line-hash anchors.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
  existsSync,
  readFileSync,
} from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Range {
  start: number; // 1-based line number
  end: number; // 1-based line number (inclusive)
}

interface RangeResult {
  start: number;
  end: number;
  lines: number;
  content: string;
  anchor: string;
}

interface Anchor {
  path: string;
  start: number;
  end: number;
  hash: string;
}

const MAX_RANGES = 20;
const MAX_TOTAL_LINES = 500;
const ANCHOR_HASH_LEN = 12;

// ---------------------------------------------------------------------------
// Path confinement
// ---------------------------------------------------------------------------

function confinePath(filePath: string, cwd: string): { resolved: string; safe: boolean } {
  const resolved = resolve(cwd, filePath);
  const normalizedCwd = resolve(cwd);
  const rel = relative(normalizedCwd, resolved);
  if (rel.startsWith(`..${require("node:path").sep}`) || rel === "..") {
    return { resolved, safe: false };
  }
  return { resolved, safe: true };
}

// ---------------------------------------------------------------------------
// Anchor encoding / decoding
// ---------------------------------------------------------------------------

function parseAnchor(anchorStr: string): Anchor | null {
  // Format: path/to/file.ts:10-25#abcdef012345
  const match = anchorStr.match(
    /^(.+):(\d+)-(\d+)#([a-f0-9]+)$/i,
  );
  if (!match) return null;

  return {
    path: match[1],
    start: parseInt(match[2], 10),
    end: parseInt(match[3], 10),
    hash: match[4].toLowerCase(),
  };
}

function makeAnchor(filePath: string, start: number, end: number, content: string): string {
  const hash = createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, ANCHOR_HASH_LEN);
  const relPath = filePath;
  return `${relPath}:${start}-${end}#${hash}`;
}

function computeContentHash(content: string): string {
  return createHash("sha256")
    .update(content)
    .digest("hex")
    .slice(0, ANCHOR_HASH_LEN);
}

function readLines(filePath: string): string[] {
  return readFileSync(filePath, "utf-8").split("\n");
}

function extractRange(lines: string[], start: number, end: number): string {
  const startIdx = Math.max(0, start - 1);
  const endIdx = Math.min(lines.length, end);
  return lines.slice(startIdx, endIdx).join("\n");
}

function validRange(start: number, end: number, totalLines: number): boolean {
  return (
    start > 0 &&
    end > 0 &&
    start <= end &&
    start <= totalLines &&
    end <= totalLines
  );
}

// ---------------------------------------------------------------------------
// read_ranges
// ---------------------------------------------------------------------------

function handleReadRanges(
  filePath: string,
  ranges: Range[],
  includeAnchors: boolean,
  cwd: string,
) {
  // Path confinement check
  const { resolved, safe } = confinePath(filePath, cwd);
  if (!safe) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Path "${filePath}" escapes workspace root. Only files inside the project can be read.`,
        },
      ],
      details: { error: "Path confinement" },
      isError: true,
    };
  }

  if (!existsSync(resolved)) {
    return {
      content: [
        {
          type: "text" as const,
          text: `File not found: "${filePath}"`,
        },
      ],
      details: { error: "File not found" },
      isError: true,
    };
  }

  // Normalize and validate ranges
  const normalized: Range[] = [];
  const seen = new Set<string>();
  for (const r of ranges) {
    const start = Math.floor(r.start);
    const end = Math.floor(r.end);
    const key = `${start}-${end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (start > 0 && end > 0 && start <= end) {
      normalized.push({ start, end });
    }
  }

  if (normalized.length > MAX_RANGES) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Too many ranges: ${ranges.length}. Maximum is ${MAX_RANGES}. Split into multiple calls.`,
        },
      ],
      details: { error: "Too many ranges" },
      isError: true,
    };
  }

  if (normalized.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "No valid ranges provided. Each range must have start <= end and both >= 1.",
        },
      ],
      details: { error: "No valid ranges" },
      isError: true,
    };
  }

  try {
    const lines = readLines(resolved);
    const totalLines = lines.length;
    const results: RangeResult[] = [];
    let totalReturned = 0;

    for (const r of normalized) {
      if (!validRange(r.start, r.end, totalLines)) {
        results.push({
          start: r.start,
          end: r.end,
          lines: 0,
          content: `(invalid range: file has ${totalLines} lines)`,
          anchor: "",
        });
        continue;
      }

      const content = extractRange(lines, r.start, r.end);
      const lineCount = r.end - r.start + 1;

      if (totalReturned + lineCount > MAX_TOTAL_LINES) {
        results.push({
          start: r.start,
          end: r.end,
          lines: 0,
          content: `(skipped: would exceed ${MAX_TOTAL_LINES} total lines limit)`,
          anchor: "",
        });
        continue;
      }

      totalReturned += lineCount;
      const relPath = relative(cwd, resolved);
      const anchor = makeAnchor(relPath, r.start, r.end, content);

      results.push({
        start: r.start,
        end: r.end,
        lines: lineCount,
        content,
        anchor,
      });
    }

    // Format output
    const relPath = relative(cwd, resolved);
    const outputLines: string[] = [
      `## ${relPath} — ${results.filter((r) => r.lines > 0).length} range(s)`,
      "",
    ];

    for (const r of results) {
      outputLines.push(`--- L${r.start}-L${r.end} (${r.lines} lines) ---`);
      if (includeAnchors && r.anchor) {
        outputLines.push(`anchor: \`${r.anchor}\``);
      }
      outputLines.push(r.content);
      outputLines.push("");
    }

    return {
      content: [{ type: "text" as const, text: outputLines.join("\n") }],
      details: {
        file: relPath,
        rangeCount: results.length,
        totalLinesReturned: totalReturned,
        anchors: includeAnchors
          ? results.filter((r) => r.anchor).map((r) => r.anchor)
          : [],
      },
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to read file: ${err.message}`,
        },
      ],
      details: { error: err.message },
      isError: true,
    };
  }
}

// ---------------------------------------------------------------------------
// edit_at_anchor
// ---------------------------------------------------------------------------

function handleEditAtAnchor(anchorStr: string, oldText: string, newText: string, cwd: string) {
  // Parse anchor
  const anchor = parseAnchor(anchorStr);
  if (!anchor) {
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Invalid anchor format: "${anchorStr}". ` +
            `Expected format: "path:L10-L25#abcdef123456"`,
        },
      ],
      details: { error: "Invalid anchor format" },
      isError: true,
    };
  }

  // Path confinement
  const { resolved, safe } = confinePath(anchor.path, cwd);
  if (!safe) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Anchor path "${anchor.path}" escapes workspace root.`,
        },
      ],
      details: { error: "Path confinement" },
      isError: true,
    };
  }

  if (!existsSync(resolved)) {
    return {
      content: [
        {
          type: "text" as const,
          text: `File not found: "${anchor.path}"`,
        },
      ],
      details: { error: "File not found" },
      isError: true,
    };
  }

  try {
    const lines = readLines(resolved);
    const totalLines = lines.length;

    // Validate range
    if (
      anchor.start < 1 ||
      anchor.end > totalLines ||
      anchor.start > anchor.end
    ) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              `Anchor range L${anchor.start}-L${anchor.end} is out of bounds. ` +
              `File has ${totalLines} lines.`,
          },
        ],
        details: { error: "Range out of bounds" },
        isError: true,
      };
    }

    // Recompute hash of the anchored range
    const currentContent = extractRange(lines, anchor.start, anchor.end);
    const currentHash = computeContentHash(currentContent);

    if (currentHash !== anchor.hash) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              `⚠️ Anchor hash mismatch — the file content around L${anchor.start}-L${anchor.end} ` +
              `has changed since the anchor was created.\n\n` +
              `Expected hash: \`${anchor.hash}\`\n` +
              `Current hash:  \`${currentHash}\`\n\n` +
              `Current content of the anchored range:\n\`\`\`\n${currentContent.slice(0, 500)}\n\`\`\`\n\n` +
              `Use \`read_ranges\` to re-read the file and generate a fresh anchor.`,
          },
        ],
        details: {
          error: "Anchor hash mismatch",
          expectedHash: anchor.hash,
          currentHash,
        },
        isError: true,
      };
    }

    // Hash matches — find oldText within the anchored range
    const rangeContent = currentContent;

    if (!rangeContent.includes(oldText)) {
      return {
        content: [
          {
            type: "text" as const,
            text:
              `oldText not found within anchored range L${anchor.start}-L${anchor.end}. ` +
              `The oldText must appear exactly within the anchored range.\n\n` +
              `Anchored range content:\n\`\`\`\n${rangeContent.slice(0, 500)}\n\`\`\``,
          },
        ],
        details: { error: "oldText not found in anchored range" },
        isError: true,
      };
    }

    // All checks passed. Return preview — agent applies via normal `edit`.
    const newRangeContent = rangeContent.replace(oldText, newText);

    if (newRangeContent === rangeContent) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No change: replacement resulted in identical content.",
          },
        ],
        details: { applied: false },
      };
    }

    // Compute new anchor for the modified range
    const newEnd =
      anchor.start + newRangeContent.split("\n").length - 1;
    const newAnchor = makeAnchor(
      relative(cwd, resolved),
      anchor.start,
      newEnd,
      newRangeContent,
    );

    return {
      content: [
        {
          type: "text" as const,
          text:
            `## PREVIEW ONLY — No files modified\n\n` +
            `✅ Anchor validated at ${relative(cwd, resolved)} L${anchor.start}-L${anchor.end}\n` +
            `Old: \`${oldText.slice(0, 80)}${oldText.length > 80 ? "..." : ""}\`\n` +
            `New: \`${newText.slice(0, 80)}${newText.length > 80 ? "..." : ""}\`\n` +
            `New anchor: \`${newAnchor}\`\n\n` +
            `To apply this change, use the \`edit\` tool on ${relative(cwd, resolved)} ` +
            `with oldText=${JSON.stringify(oldText.slice(0, 60))} and the newText above.`,
        },
      ],
      details: {
        previewOnly: true,
        file: relative(cwd, resolved),
        oldRange: `${anchor.start}-${anchor.end}`,
        newRange: `${anchor.start}-${newEnd}`,
        newAnchor,
        validated: true,
      },
    };
  } catch (err: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Edit preview failed: ${err.message}`,
        },
      ],
      details: { error: err.message },
      isError: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  // -- read_ranges -----------------------------------------------------------

  pi.registerTool({
    name: "read_ranges",
    label: "Read Ranges",
    description:
      "Read multiple scattered line ranges from a single file in one call. " +
      "Returns each range's content with line numbers and optional anchors. " +
      "More efficient than multiple `read` calls with offset/limit. " +
      "Use when you need to inspect several non-contiguous sections of a file. " +
      "Max 20 ranges, max 500 total lines returned. Anchors are stable content hashes " +
      "you can pass to `edit_at_anchor` for safe edits.",
    promptSnippet: "read_ranges(path, ranges[], includeAnchors?)",
    promptGuidelines: [
      "Use read_ranges when you need to inspect multiple scattered sections " +
        "of the same file (e.g., several function definitions spaced far apart).",
      "Set includeAnchors=true to get anchor tokens for later use with edit_at_anchor.",
      "For reading contiguous blocks, use a single range or `read` with offset/limit.",
      "Max 20 ranges per call. Split into multiple calls if needed.",
    ],
    parameters: Type.Object({
      path: Type.String({
        description: "File path relative to workspace root.",
      }),
      ranges: Type.Array(
        Type.Object({
          start: Type.Number({ description: "Start line (1-based, inclusive)." }),
          end: Type.Number({ description: "End line (1-based, inclusive)." }),
        }),
        {
          description: "Array of line ranges to read. Max 20 ranges.",
        },
      ),
      includeAnchors: Type.Optional(
        Type.Boolean({
          description:
            "Include stable anchor tokens for each range. " +
            "Anchors can be passed to edit_at_anchor for safe stale-context edits. " +
            "Default: false.",
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd ?? process.cwd();
      return handleReadRanges(
        params.path,
        params.ranges,
        params.includeAnchors ?? false,
        cwd,
      );
    },
  });

  // -- edit_at_anchor --------------------------------------------------------

  pi.registerTool({
    name: "edit_at_anchor",
    label: "Edit at Anchor",
    description:
      "PREVIEW-ONLY anchor validation. Checks that an anchor (from `read_ranges`) " +
      "is still valid (content hasn't changed) and shows the proposed replacement. " +
      "**Files are never modified directly.** Use the normal `edit` tool to apply " +
      "approved changes — this goes through the permission pipeline. " +
      "Use for safe surgical edits when multiple changes may happen " +
      "between reading and editing.",
    promptSnippet: "edit_at_anchor(anchor, oldText, newText)",
    promptGuidelines: [
      "Use read_ranges with includeAnchors=true to generate anchors first.",
      "edit_at_anchor is PREVIEW-ONLY. It validates the anchor and oldText, then shows the proposed replacement.",
      "To apply: copy the validated oldText/newText and use the `edit` tool.",
      "If the anchor hash mismatches, re-read with read_ranges for a fresh anchor.",
      "oldText must appear exactly within the anchored range.",
    ],
    parameters: Type.Object({
      anchor: Type.String({
        description:
          "Anchor string from read_ranges output (format: 'path:L10-L25#hash').",
      }),
      oldText: Type.String({
        description:
          "Exact text to replace. Must appear verbatim within the anchored range.",
      }),
      newText: Type.String({
        description: "Replacement text.",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd ?? process.cwd();
      // PREVIEW-ONLY: validates anchor and shows proposed change; agent applies via `edit`
      return handleEditAtAnchor(params.anchor, params.oldText, params.newText, cwd);
    },
  });
}
