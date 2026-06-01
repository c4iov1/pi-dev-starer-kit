/**
 * contrib-gate — Git workflow enforcement for Pi.dev agents.
 *
 * Intercepts bash tool calls containing git commit, git checkout -b, and
 * git switch -c. Validates branch naming and conventional commit format.
 *
 * Two modes (read from .pi/settings.json → starterKit.contribGate):
 *   "default" — warn on violations (notify only, allows the command)
 *   "strict"  — block violations until fixed
 *
 * Branch pattern:  feature/* | fix/* | chore/* | docs/* | refactor/* | test/*
 * Commit pattern:  type(scope): description  (conventional commits)
 *
 * Based on patterns from nandal/pi-ext/contrib-gate (MIT).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GateMode = "default" | "strict";

interface ContribGateConfig {
  mode: GateMode;
  branchPatterns: string[];
  commitTypes: string[];
}

interface ValidationResult {
  passed: boolean;
  reason: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_BRANCH_PATTERNS = [
  "feature/",
  "fix/",
  "chore/",
  "docs/",
  "refactor/",
  "test/",
];

const DEFAULT_COMMIT_TYPES = [
  "feat",
  "fix",
  "chore",
  "docs",
  "style",
  "refactor",
  "test",
  "perf",
  "ci",
  "build",
  "revert",
];

const DEFAULT_CONFIG: ContribGateConfig = {
  mode: "default",
  branchPatterns: DEFAULT_BRANCH_PATTERNS,
  commitTypes: DEFAULT_COMMIT_TYPES,
};

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

function loadConfig(cwd: string): ContribGateConfig {
  const settingsPath = resolve(cwd, ".pi", "settings.json");

  if (!existsSync(settingsPath)) return DEFAULT_CONFIG;

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return DEFAULT_CONFIG;
  }

  if (typeof raw !== "object" || raw === null) return DEFAULT_CONFIG;

  const root = raw as Record<string, unknown>;
  const sk = root["starterKit"] as Record<string, unknown> | undefined;
  const cg = sk?.["contribGate"] as Record<string, unknown> | undefined;

  if (!cg) return DEFAULT_CONFIG;

  return {
    mode: validateMode(cg["mode"]),
    branchPatterns:
      Array.isArray(cg["branchPatterns"]) && cg["branchPatterns"].length > 0
        ? cg["branchPatterns"].map(String)
        : DEFAULT_BRANCH_PATTERNS,
    commitTypes:
      Array.isArray(cg["commitTypes"]) && cg["commitTypes"].length > 0
        ? cg["commitTypes"].map(String)
        : DEFAULT_COMMIT_TYPES,
  };
}

function validateMode(raw: unknown): GateMode {
  if (raw === "strict") return "strict";
  return "default";
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function buildBranchRegex(patterns: string[]): RegExp {
  const escaped = patterns.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^(${escaped.join("|")})`);
}

function buildCommitRegex(types: string[]): RegExp {
  const typeGroup = types.join("|");
  return new RegExp(`^(${typeGroup})(\\([^)]*\\))?!:?\\s.+$`);
}

function validateBranchName(
  branch: string,
  config: ContribGateConfig,
): ValidationResult {
  const pattern = buildBranchRegex(config.branchPatterns);
  if (pattern.test(branch)) return { passed: true, reason: "" };

  const allowed = config.branchPatterns.map((p) => `${p}*`).join(", ");
  return {
    passed: false,
    reason: `Branch "${branch}" does not match convention.\n` +
      `Allowed patterns: ${allowed}\n` +
      `Use: git checkout -b feature/your-feature`,
  };
}

function validateCommitMessage(
  message: string,
  config: ContribGateConfig,
): ValidationResult {
  const firstLine = message.split("\n")[0]?.trim() ?? "";
  const pattern = buildCommitRegex(config.commitTypes);

  if (pattern.test(firstLine)) return { passed: true, reason: "" };

  const types = config.commitTypes.join("|");
  return {
    passed: false,
    reason: `Commit message does not follow conventional commits format.\n` +
      `Expected: ${types}(scope): description\n` +
      `Got: "${firstLine}"\n` +
      `Examples: feat(api): add login, fix: resolve null pointer, chore(deps): update`,
  };
}

// ---------------------------------------------------------------------------
// Command parsers
// ---------------------------------------------------------------------------

function parseBranchName(cmd: string): string | null {
  const m = cmd.match(/(?:checkout\s+-b|switch\s+-c)\s+(\S+)/);
  return m ? m[1] : null;
}

function parseCommitMessage(cmd: string): string | null {
  const m = cmd.match(/-m\s*"([^"]*)"/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    // Only intercept bash tool calls
    if (!isToolCallEventType("bash", event)) return;

    const cmd: string = event.input.command;
    if (!cmd || typeof cmd !== "string") return;

    // --- passthrough: merge/rebase continuations, git status, etc. ---
    if (/^\s*git\s+status\b/.test(cmd)) return;
    if (/^\s*git\s+log\b/.test(cmd)) return;
    if (/^\s*git\s+diff\b/.test(cmd)) return;
    if (/^\s*git\s+add\b/.test(cmd)) return;
    if (/^\s*git\s+stash\b/.test(cmd)) return;
    if (/^\s*git\s+fetch\b/.test(cmd)) return;
    if (/^\s*git\s+pull\b/.test(cmd)) return;
    if (/^\s*git\s+merge\s+--(abort|continue)\b/.test(cmd)) return;
    if (/^\s*git\s+rebase\s+--(abort|continue)\b/.test(cmd)) return;

    const config = loadConfig(ctx.cwd);

    // ── Branch creation ──────────────────────────────────────────────

    const branchName = parseBranchName(cmd);
    if (branchName !== null) {
      const result = validateBranchName(branchName, config);
      if (!result.passed) {
        if (config.mode === "strict") {
          return { block: true, reason: result.reason };
        }
        ctx.ui.notify("Branch name convention", "warning");
      }
      return;
    }

    // ── Git commit ───────────────────────────────────────────────────

    if (/\bgit\s+commit\b/.test(cmd)) {
      const message = parseCommitMessage(cmd);
      if (message !== null) {
        const result = validateCommitMessage(message, config);
        if (!result.passed) {
          if (config.mode === "strict") {
            return { block: true, reason: result.reason };
          }
          ctx.ui.notify("Conventional commit", "warning");
        }
      }
      return;
    }
  });
}
