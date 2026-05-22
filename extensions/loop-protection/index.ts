import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Settings interface and parser
// ---------------------------------------------------------------------------

interface Settings {
  starterKit?: {
    loopProtection?: {
      maxEdits?: number;
      minTokens?: number;
      maxLowTokenTurns?: number;
      maxContextPercent?: number;
    };
  };
}

function loadSettings(cwd: string) {
  try {
    const settingsPath = path.resolve(cwd, ".pi/settings.json");
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, "utf-8");
      const settings: Settings = JSON.parse(raw);
      const config = settings?.starterKit?.loopProtection;
      return {
        maxEdits: config?.maxEdits ?? 5,
        minTokens: config?.minTokens ?? 500,
        maxLowTokenTurns: config?.maxLowTokenTurns ?? 3,
        maxContextPercent: config?.maxContextPercent ?? 85,
      };
    }
  } catch (err) {
    // Fall back to default settings on error
  }
  return {
    maxEdits: 5,
    minTokens: 500,
    maxLowTokenTurns: 3,
    maxContextPercent: 85,
  };
}

interface DiminishingReturnsConfig {
  minTokens: number;
  maxLowTokenTurns: number;
}

interface DiminishingReturnsState {
  consecutiveLowTokenTurns: number;
}

function normalizeStopReason(raw: unknown): string {
  return String(raw ?? "").replace(/[_-]/g, "").toLowerCase();
}

function isToolUseStopReason(raw: unknown): boolean {
  const normalized = normalizeStopReason(raw);
  return normalized === "tooluse" || normalized === "toolcalls";
}

function getContentPartType(part: unknown): string {
  if (typeof part !== "object" || part === null) {
    return "";
  }
  const type = (part as Record<string, unknown>).type;
  return String(type ?? "").replace(/[_-]/g, "").toLowerCase();
}

function isNonTextToolProgressPart(part: unknown): boolean {
  const type = getContentPartType(part);
  return type === "toolcall" || type === "tooluse" || type === "thinking";
}

function hasTextContent(msg: any): boolean {
  const content = msg?.content;
  if (typeof content === "string") {
    return content.trim().length > 0;
  }
  if (!Array.isArray(content)) {
    return false;
  }
  return content.some((part) => {
    if (typeof part === "string") {
      return part.trim().length > 0;
    }
    if (typeof part !== "object" || part === null) {
      return false;
    }

    const record = part as Record<string, unknown>;
    const type = getContentPartType(part);
    const text = record.text;
    return type === "text" && typeof text === "string" && text.trim().length > 0;
  });
}

export function isToolOnlyAssistantMessage(msg: any): boolean {
  if (!msg || msg.role !== "assistant") {
    return false;
  }

  const stopReason = msg.stopReason ?? msg.stop_reason ?? msg.finishReason ?? msg.finish_reason;
  if (isToolUseStopReason(stopReason)) {
    return true;
  }

  const content = msg.content;
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    !hasTextContent(msg) &&
    content.every(isNonTextToolProgressPart)
  );
}

export function shouldTrackDiminishingReturns(msg: any): boolean {
  if (!msg || msg.role !== "assistant") {
    return false;
  }
  return !isToolOnlyAssistantMessage(msg);
}

function getOutputTokens(msg: any): number {
  return Number(msg?.usage?.output ?? msg?.usage?.outputTokens ?? msg?.usage?.completionTokens ?? 0);
}

export function updateDiminishingReturnsState(
  msg: any,
  state: DiminishingReturnsState,
  config: DiminishingReturnsConfig,
): boolean {
  if (!shouldTrackDiminishingReturns(msg)) {
    return false;
  }

  const outputTokens = getOutputTokens(msg);
  if (outputTokens < config.minTokens) {
    state.consecutiveLowTokenTurns++;
  } else {
    state.consecutiveLowTokenTurns = 0;
  }

  return config.minTokens > 0 &&
    state.consecutiveLowTokenTurns >= config.maxLowTokenTurns;
}

// ---------------------------------------------------------------------------
// State variables
// ---------------------------------------------------------------------------

const fileEditCounts = new Map<string, number>();
const filesWarnedThisTurn = new Set<string>();
const diminishingReturnsState: DiminishingReturnsState = {
  consecutiveLowTokenTurns: 0,
};
let contextStarvationWarningInjected = false;
let pendingWarnings: string[] = [];

// ---------------------------------------------------------------------------
// Extension definition
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  // Reset all state when session starts
  pi.on("session_start", () => {
    fileEditCounts.clear();
    filesWarnedThisTurn.clear();
    diminishingReturnsState.consecutiveLowTokenTurns = 0;
    contextStarvationWarningInjected = false;
    pendingWarnings = [];
  });

  // Reset turn-specific states at the start of a turn
  pi.on("turn_start", () => {
    fileEditCounts.clear();
    filesWarnedThisTurn.clear();
    diminishingReturnsState.consecutiveLowTokenTurns = 0;
  });

  // Reset session counters when a new prompt runs starts
  pi.on("agent_start", () => {
    diminishingReturnsState.consecutiveLowTokenTurns = 0;
    contextStarvationWarningInjected = false;
  });

  // 1. Doom-loop detection: Track edits per file during a turn
  pi.on("tool_call", async (event, ctx) => {
    const config = loadSettings(ctx.cwd);
    const toolName = event.toolName || (event as any).tool;

    // We monitor write-like tools that modify file contents
    const editTools = ["edit", "write", "replace_file_content", "multi_replace_file_content", "write_to_file"];

    if (editTools.includes(toolName)) {
      const params = (event.input || (event as any).arguments || (event as any).args || {}) as Record<string, unknown>;
      const rawPath = params.path || params.TargetFile || params.targetFile || params.file || params.filepath;

      if (typeof rawPath === "string") {
        const resolvedPath = path.resolve(ctx.cwd, rawPath);
        const currentCount = (fileEditCounts.get(resolvedPath) ?? 0) + 1;
        fileEditCounts.set(resolvedPath, currentCount);

        if (currentCount >= config.maxEdits && !filesWarnedThisTurn.has(resolvedPath)) {
          filesWarnedThisTurn.add(resolvedPath);
          const relativePath = path.relative(ctx.cwd, resolvedPath);
          const warningMessage = `You have edited ${relativePath} ${currentCount} times in this turn. Consider whether your approach is correct or if you need to reconsider your plan.`;

          if (ctx.hasUI) {
            ctx.ui.notify(`Doom-loop warning: ${relativePath} has been edited ${currentCount} times!`, "warning");
          }

          pendingWarnings.push(warningMessage);
        }
      }
    }
  });

  // 2. Diminishing returns: Track token output per iteration
  pi.on("turn_end", async (event, ctx) => {
    const config = loadSettings(ctx.cwd);
    const msg = event.message;

    const shouldAbort = updateDiminishingReturnsState(
      msg,
      diminishingReturnsState,
      config,
    );

    if (shouldAbort) {
      ctx.abort();
      const abortMessage = `Turn force-stopped due to diminishing returns (${diminishingReturnsState.consecutiveLowTokenTurns} consecutive iterations each producing < ${config.minTokens} tokens). Please provide more direction.`;

      if (ctx.hasUI) {
        ctx.ui.notify(abortMessage, "error");
      } else {
        console.warn(`[starterKit] ${abortMessage}`);
      }
    }
  });

  // 3. Context starvation warning: When context usage exceeds 85%, inject a warning
  pi.on("context", async (event, ctx) => {
    const config = loadSettings(ctx.cwd);
    const usage = ctx.getContextUsage();
    const newMessages = [...event.messages];
    let mutated = false;

    if (usage && usage.percent !== null && usage.percent > config.maxContextPercent) {
      if (!contextStarvationWarningInjected) {
        contextStarvationWarningInjected = true;
        const starvationWarning = `Warning: Context usage is at ${usage.percent.toFixed(1)}%, exceeding the safety threshold of ${config.maxContextPercent}%. Consider running /compact to reduce context size.`;

        if (ctx.hasUI) {
          ctx.ui.notify(`Context starvation warning: ${usage.percent.toFixed(1)}% usage! Suggesting /compact.`, "warning");
        }

        newMessages.push({
          role: "user" as const,
          content: starvationWarning,
          timestamp: Date.now(),
        });
        mutated = true;
      }
    }

    if (pendingWarnings.length > 0) {
      const doomWarningText = pendingWarnings.join("\n");
      pendingWarnings = [];

      newMessages.push({
        role: "user" as const,
        content: doomWarningText,
        timestamp: Date.now(),
      });
      mutated = true;
    }

    if (mutated) {
      return { messages: newMessages };
    }
  });
}
