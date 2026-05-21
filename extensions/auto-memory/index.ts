import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import * as fs from "fs";
import * as path from "path";

interface MemoryEntry {
  timestamp: string;
  category: string;
  body: string;
  raw: string;
}

interface AutoMemoryConfig {
  enabled: boolean;
  maxEntries: number;
}

const ALLOWED_CATEGORIES = ["learning", "decision", "pattern", "issue", "note"];

/**
 * Returns the current local timestamp in format YYYY-MM-DD HH:MM.
 */
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Reads configuration from .pi/settings.json under starterKit.autoMemory.
 */
function getConfiguration(): AutoMemoryConfig {
  try {
    const settingsPath = path.resolve(process.cwd(), ".pi/settings.json");
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, "utf8");
      const settings = JSON.parse(content);
      const autoMemory = settings?.starterKit?.autoMemory;
      return {
        enabled: autoMemory?.enabled !== false,
        maxEntries: typeof autoMemory?.maxEntries === "number" ? autoMemory.maxEntries : 10,
      };
    }
  } catch (err) {
    // Default fallback
  }
  return { enabled: true, maxEntries: 10 };
}

/**
 * Formats a memory entry block in Markdown format.
 */
function formatEntry(timestamp: string, category: string, body: string): string {
  return `## [${timestamp}] ${category}\n\n${body.trim()}\n\n---\n`;
}

/**
 * Parses the MEMORY.md file into structural entry blocks.
 */
function parseMemoryFile(filePath: string): MemoryEntry[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  const blocks = content.split(/\r?\n---\r?\n/);
  const entries: MemoryEntry[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^##\s*\[([^\]]+)\]\s*(\w+)/);
    if (match) {
      const timestamp = match[1];
      const category = match[2];
      const lines = trimmed.split(/\r?\n/);
      const body = lines.slice(1).join("\n").trim();

      entries.push({
        timestamp,
        category,
        body,
        raw: trimmed + "\n\n---\n",
      });
    }
  }

  return entries;
}

export default function (pi: ExtensionAPI) {
  // ─── Tools ──────────────────────────────────────────────────────────

  pi.registerTool({
    name: "memory_save",
    label: "Memory Save",
    description: "Save a new project learning, pattern, or note to the MEMORY.md file at the root of the project.",
    parameters: Type.Object({
      category: Type.String({
        enum: ALLOWED_CATEGORIES,
        description: "The category of the memory (learning, decision, pattern, issue, note)",
      }),
      body: Type.String({
        description: "The main learning or detail to record. Keep it concise, descriptive, and actionable.",
      }),
    }) as any,
    async execute(_id, params, _signal, _update, _ctx) {
      const { category, body } = params;

      if (!ALLOWED_CATEGORIES.includes(category)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Invalid category '${category}'. Allowed categories: ${ALLOWED_CATEGORIES.join(", ")}.`,
            },
          ],
          details: {},
        };
      }

      try {
        const memoryPath = path.resolve(process.cwd(), "MEMORY.md");
        const timestamp = getTimestamp();
        const entryText = formatEntry(timestamp, category, body);

        // Append to file (creates if not existing)
        fs.appendFileSync(memoryPath, entryText, "utf8");

        return {
          content: [
            {
              type: "text",
              text: `Memory saved successfully to MEMORY.md under category '${category}'.`,
            },
          ],
          details: { category, timestamp },
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to save memory: ${err.message}`,
            },
          ],
          details: {},
        };
      }
    },
  });

  pi.registerTool({
    name: "memory_search",
    label: "Memory Search",
    description: "Search for learnings, decisions, patterns, or notes in the project's MEMORY.md file using a query.",
    parameters: Type.Object({
      query: Type.String({
        description: "Query term or keyword to search for inside the memory logs.",
      }),
      limit: Type.Optional(
        Type.Number({
          description: "Optional maximum number of matching results to return (default is all matches).",
        })
      ),
    }) as any,
    async execute(_id, params, _signal, _update, _ctx) {
      const { query, limit } = params;
      const memoryPath = path.resolve(process.cwd(), "MEMORY.md");

      if (!fs.existsSync(memoryPath)) {
        return {
          content: [{ type: "text", text: "No MEMORY.md file found in this project root. No memories saved yet." }],
          details: {},
        };
      }

      try {
        const entries = parseMemoryFile(memoryPath);
        const searchRegex = new RegExp(query, "i");
        const matches = entries.filter(
          (entry) => searchRegex.test(entry.category) || searchRegex.test(entry.body)
        );

        if (matches.length === 0) {
          return {
            content: [{ type: "text", text: `No matching memory entries found for query: "${query}".` }],
            details: {},
          };
        }

        const maxResults = typeof limit === "number" ? limit : matches.length;
        const results = matches.slice(0, maxResults);
        const textOutput =
          `Found ${matches.length} matching memory entries (showing up to ${maxResults}):\n\n` +
          results.map((r) => r.raw).join("\n");

        return {
          content: [{ type: "text", text: textOutput }],
          details: { query, totalMatches: matches.length },
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Failed to search memory: ${err.message}` }],
          details: {},
        };
      }
    },
  });

  // ─── Lifecycle Hooks ──────────────────────────────────────────────

  pi.on("session_start", async (_event, ctx) => {
    const config = getConfiguration();

    if (!config.enabled) {
      return;
    }

    try {
      const memoryPath = path.resolve(process.cwd(), "MEMORY.md");
      if (!fs.existsSync(memoryPath)) {
        return;
      }

      const entries = parseMemoryFile(memoryPath);
      if (entries.length === 0) {
        return;
      }

      // Grab the last N entries (newest are usually at the bottom because we append)
      const maxEntries = config.maxEntries;
      const recentEntries = entries.slice(-maxEntries);

      const memoryBlock =
        `### [starterKit] Persistent Memory (MEMORY.md)\n` +
        `The following are the last ${recentEntries.length} learnings/patterns persisted for this workspace:\n\n` +
        recentEntries.map((e) => e.raw).join("\n");

      // Inject silently as a one-shot custom message at session start
      pi.sendMessage({
        customType: "pi-memory-context",
        content: memoryBlock,
        display: false,
      });

      // Briefly inform the UI/status
      if (ctx.ui && typeof ctx.ui.setStatus === "function") {
        ctx.ui.setStatus("pi-memory", `Loaded ${recentEntries.length} memories`);
        setTimeout(() => {
          try {
            ctx.ui.setStatus("pi-memory", "");
          } catch {
            // Safe swallow if session is switched or closed
          }
        }, 5000);
      }
    } catch (err) {
      // Safe fallback, do not disrupt agent startup
    }
  });

  pi.on("session_before_compact", async (event: any, _ctx) => {
    const currentInstructions = event.customInstructions || "";
    const autoMemoryInstructions =
      "\n\nNote: Please make sure that key project-wide patterns, preferences, and learnings documented in the MEMORY.md file are preserved within the condensed summary of the conversation.";

    return {
      customInstructions: currentInstructions + autoMemoryInstructions,
    };
  });
}
