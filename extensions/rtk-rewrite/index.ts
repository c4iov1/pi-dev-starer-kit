/**
 * rtk-rewrite — context-efficiency bash command rewrite hook.
 *
 * This extension is optimization-only. Security remains the responsibility of
 * permission-gate, which must run before this hook. The hook fails open: every
 * error path leaves the original bash command unchanged.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface RtkRewriteSettings {
  enabled: boolean;
  timeoutMs: number;
  debug: boolean;
  interceptUserBash: boolean;
}

interface SettingsFile {
  starterKit?: {
    rtkRewrite?: Partial<RtkRewriteSettings>;
  };
}

export interface ExecResult {
  stdout?: string;
  stderr?: string;
  code?: number | null;
  killed?: boolean;
}

export const DEFAULT_RTK_REWRITE_SETTINGS: RtkRewriteSettings = {
  enabled: true,
  timeoutMs: 2_000,
  debug: false,
  interceptUserBash: false,
};

const TRUTHY = new Set(["1", "true", "yes", "on"]);
const SUCCESS_REWRITE_CODES = new Set([0, 3]);
const MIN_SUPPORTED_RTK_MINOR = 23;

function isToolCallEventType(toolName: "bash", event: { toolName?: string; input?: unknown }): event is { toolName: "bash"; input: { command: string; timeout?: number } } {
  return event.toolName === toolName;
}

function isTruthy(value: string | undefined): boolean {
  return value !== undefined && TRUTHY.has(value.trim().toLowerCase());
}

export function getEffectiveSettings(settings?: SettingsFile | null): RtkRewriteSettings {
  const configured = settings?.starterKit?.rtkRewrite ?? {};
  return {
    enabled: configured.enabled ?? DEFAULT_RTK_REWRITE_SETTINGS.enabled,
    timeoutMs: configured.timeoutMs ?? DEFAULT_RTK_REWRITE_SETTINGS.timeoutMs,
    debug: configured.debug ?? DEFAULT_RTK_REWRITE_SETTINGS.debug,
    interceptUserBash:
      configured.interceptUserBash ?? DEFAULT_RTK_REWRITE_SETTINGS.interceptUserBash,
  };
}

export function loadSettings(cwd: string): SettingsFile | null {
  const path = resolve(cwd, ".pi", "settings.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function hasProcessOptOut(env: NodeJS.ProcessEnv = process.env): boolean {
  return isTruthy(env.RTK_DISABLE_REWRITE) || isTruthy(env.RTK_DISABLED);
}

export function hasCommandOptOut(command: string): boolean {
  const trimmed = command.trimStart();
  const envPrefixPattern = /^(?:env\s+)?(?:[A-Za-z_][A-Za-z0-9_]*=(?:'[^']*'|"[^"]*"|\S+)\s+)*/;
  const prefix = trimmed.match(envPrefixPattern)?.[0] ?? "";
  const assignments = prefix.trim().split(/\s+/).filter(Boolean);
  for (const assignment of assignments) {
    const [key, rawValue = ""] = assignment.split("=", 2);
    if ((key === "RTK_DISABLE_REWRITE" || key === "RTK_DISABLED") && isTruthy(rawValue.replace(/^['"]|['"]$/g, ""))) {
      return true;
    }
  }
  return false;
}

export function isAlreadyRtk(command: string): boolean {
  return /^\s*(?:env\s+)?(?:[A-Za-z_][A-Za-z0-9_]*=(?:'[^']*'|"[^"]*"|\S+)\s+)*rtk(?:\s|$)/.test(command);
}

export function shouldSkipRewrite(command: string, settings: RtkRewriteSettings, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!settings.enabled) return true;
  if (typeof command !== "string" || command.trim() === "") return true;
  if (hasProcessOptOut(env)) return true;
  if (hasCommandOptOut(command)) return true;
  if (isAlreadyRtk(command)) return true;
  return false;
}

export function selectRewrite(original: string, result: ExecResult): string | null {
  if (result.killed) return null;
  if (!SUCCESS_REWRITE_CODES.has(result.code ?? -1)) return null;
  const rewritten = (result.stdout ?? "").trim();
  if (!rewritten) return null;
  if (rewritten === original) return null;
  return rewritten;
}

export function parseRtkVersion(stdout: string): [number, number, number] | null {
  const match = stdout.trim().match(/(?:rtk\s+)?(\d+)\.(\d+)\.(\d+)/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isSupportedRtkVersion(stdout: string): boolean {
  const parsed = parseRtkVersion(stdout);
  if (!parsed) return false;
  const [major, minor] = parsed;
  return major > 0 || minor >= MIN_SUPPORTED_RTK_MINOR;
}

export async function rewriteCommand(
  pi: ExtensionAPI,
  command: string,
  settings: RtkRewriteSettings,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const result = await pi.exec("rtk", ["rewrite", command], {
      timeout: settings.timeoutMs,
      signal,
    });
    return selectRewrite(command, result as ExecResult);
  } catch {
    return null;
  }
}

export interface RtkAvailability {
  available: boolean;
  supported: boolean;
  version: string | null;
}

export function shouldUseRtkAvailability(availability: RtkAvailability): boolean {
  return availability.available && availability.supported;
}

function logDebug(settings: RtkRewriteSettings, message: string): void {
  if (settings.debug) console.warn(`[rtk-rewrite] ${message}`);
}

async function getRtkVersion(pi: ExtensionAPI, timeoutMs: number, signal?: AbortSignal): Promise<string | null> {
  try {
    const result = (await pi.exec("rtk", ["--version"], { timeout: timeoutMs, signal })) as ExecResult;
    if (result.killed || result.code !== 0) return null;
    return (result.stdout ?? result.stderr ?? "").trim() || null;
  } catch {
    return null;
  }
}

function splitArgs(args: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(args)) !== null) {
    out.push(match[1] ?? match[2] ?? match[3]);
  }
  return out;
}

export default function (pi: ExtensionAPI) {
  let sessionEnabled = true;
  let rtkAvailability: RtkAvailability | null = null;

  function settingsFor(cwd: string | undefined): RtkRewriteSettings {
    const settings = getEffectiveSettings(loadSettings(cwd ?? process.cwd()));
    return { ...settings, enabled: settings.enabled && sessionEnabled };
  }

  async function getAvailability(settings: RtkRewriteSettings, signal?: AbortSignal): Promise<RtkAvailability> {
    if (rtkAvailability) return rtkAvailability;
    const version = await getRtkVersion(pi, settings.timeoutMs, signal);
    rtkAvailability = {
      available: version !== null,
      supported: version !== null && isSupportedRtkVersion(version),
      version,
    };
    return rtkAvailability;
  }

  pi.on("tool_call", async (event, ctx) => {
    try {
      if (!isToolCallEventType("bash", event)) return;

      const settings = settingsFor(ctx.cwd);
      const command = event.input.command;
      if (shouldSkipRewrite(command, settings)) {
        logDebug(settings, "skipped command rewrite");
        return;
      }

      const availability = await getAvailability(settings, ctx.signal);
      if (!shouldUseRtkAvailability(availability)) {
        logDebug(settings, availability.available ? "RTK version unsupported; passing through" : "RTK missing; passing through");
        return;
      }

      const rewritten = await rewriteCommand(pi, command, settings, ctx.signal);
      if (rewritten) {
        event.input.command = rewritten;
        logDebug(settings, "rewrote bash command");
      }
    } catch {
      // Fail open: never block or alter the tool call on RTK extension errors.
      return;
    }
  });

  pi.registerCommand("rtk-status", {
    description: "Show RTK rewrite status for this Pi session",
    handler: async (_args, ctx) => {
      const settings = settingsFor(ctx.cwd);
      rtkAvailability = null;
      const availability = await getAvailability(settings, ctx.signal);
      const installed = availability.available;
      const supported = availability.supported;
      const version = availability.version;
      const lines = [
        "# RTK rewrite status",
        `- Session enabled: ${sessionEnabled ? "yes" : "no"}`,
        `- Config enabled: ${getEffectiveSettings(loadSettings(ctx.cwd ?? process.cwd())).enabled ? "yes" : "no"}`,
        `- Hook active: ${settings.enabled && !hasProcessOptOut() ? "yes" : "no"}`,
        `- RTK binary: ${installed ? version : "missing from PATH"}`,
        `- RTK version supported: ${installed ? (supported ? "yes" : "unknown/too old") : "n/a"}`,
        `- timeoutMs: ${settings.timeoutMs}`,
        `- debug: ${settings.debug}`,
        `- interceptUserBash: ${settings.interceptUserBash} (V1 agent bash only)`,
        "- Permanent disable: set starterKit.rtkRewrite.enabled=false in .pi/settings.json",
      ];
      ctx.ui.notify(lines.join("\n"), installed ? "info" : "warning");
    },
  });

  pi.registerCommand("rtk-gain", {
    description: "Show RTK token savings via `rtk gain`",
    handler: async (args, ctx) => {
      try {
        const gainArgs = ["gain", ...splitArgs(args ?? "")];
        const result = (await pi.exec("rtk", gainArgs, { timeout: 10_000, signal: ctx.signal })) as ExecResult;
        if (result.code === 0) {
          ctx.ui.notify((result.stdout ?? "").trim() || "rtk gain returned no output", "info");
        } else {
          ctx.ui.notify(`rtk gain failed or RTK is unavailable. ${(result.stderr ?? result.stdout ?? "").trim()}`, "warning");
        }
      } catch (error) {
        ctx.ui.notify(`rtk gain unavailable: ${error instanceof Error ? error.message : String(error)}`, "warning");
      }
    },
  });

  pi.registerCommand("rtk-toggle", {
    description: "Toggle RTK rewrite for the current Pi session only",
    handler: async (_args, ctx) => {
      sessionEnabled = !sessionEnabled;
      ctx.ui.notify(
        `RTK rewrite is now ${sessionEnabled ? "enabled" : "disabled"} for this session. ` +
          "To disable permanently, set starterKit.rtkRewrite.enabled=false in .pi/settings.json.",
        "info",
      );
    },
  });
}
