/**
 * starter-kit-doctor — Environment and capability diagnostic tool.
 *
 * Registers the `starter_kit_doctor` tool that reports what is installed,
 * enabled, disabled, or missing in the Pi.dev Starter Kit environment.
 *
 * Read-only. No automatic installation. No hard failures for missing
 * optional tools. Output is compact markdown.
 *
 * Use this when you need to know which starter-kit capabilities are
 * available, or when diagnosing setup issues.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StarterKitSettings {
  starterKit?: {
    permissionMode?: string;
    activeExtensions?: string[];
    activeSkills?: string[];
    steeringMode?: string;
    interruptMode?: string;
    compactionStrategy?: string;
    autoLint?: boolean;
    autoTypeCheck?: boolean;
    autoVerify?: boolean;
    webSearch?: string;
    aiMemory?: { enabled?: boolean; serverUrl?: string };
    lspBridge?: { enableSymbolOps?: boolean };
    contribGate?: { mode?: string };
    monitorBash?: { maxTimeout?: number };
  };
}

interface TableRow {
  capability: string;
  status: string;
  notes: string;
}

interface FixItem {
  description: string;
  command?: string;
}

interface DoctorReport {
  projectRoot: string;
  settingsFound: boolean;
  permissionMode: string;
  profile: { steeringMode: string; interruptMode: string; compactionStrategy: string };
  extensions: TableRow[];
  skills: TableRow[];
  binaries: TableRow[];
  fixes: FixItem[];
}

type Status = "ok" | "warn" | "error";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_KNOWN_EXTENSIONS = [
  "permission-gate",
  "post-edit-lint",
  "loop-protection",
  "task-tracker",
  "lsp-bridge",
  "monitor-bash",
  "contrib-gate",
  "auto-memory",
  "setup-ai-memory",
  // Future extensions from Akita plan
  "artifact-read",
  "ast-tools",
  "source-navigation",
  "starter-kit-doctor",
];

const ALL_KNOWN_SKILLS = [
  "plan-mode",
  "self-verify",
  "web-research",
  "browser-testing",
  "subagent-delegation",
  "mcp-orchestration",
  "ai-memory",
  "agent-memory",
  // Future skills from Akita plan
  "artifact-analysis",
  "structural-refactor",
  "review-matrix",
  // Matt Pocock skills
  "grill-with-docs",
  "grill-me",
  "to-prd",
  "to-issues",
  "tdd",
  "diagnose",
  "triage",
  "improve-codebase-architecture",
  "design-an-interface",
  "zoom-out",
  "qa",
  "handoff",
  "write-a-skill",
  "setup-matt-pocock-skills",
];

const REQUIRED_BINARIES = [
  { name: "node", cmd: "node", args: ["--version"] },
  { name: "npm", cmd: "npm", args: ["--version"] },
  { name: "npx", cmd: "npx", args: ["--version"] },
  { name: "git", cmd: "git", args: ["--version"] },
];

const OPTIONAL_BINARIES = [
  { name: "sqlite3", cmd: "sqlite3", args: ["--version"] },
  { name: "python3", cmd: "python3", args: ["--version"] },
  { name: "unzip", cmd: "unzip", args: ["-v"] },
  { name: "tar", cmd: "tar", args: ["--version"] },
  { name: "ast-grep (sg)", cmd: "sg", args: ["--version"] },
  { name: "ast-grep (ast-grep)", cmd: "ast-grep", args: ["--version"] },
  { name: "docker", cmd: "docker", args: ["--version"] },
  { name: "typescript (tsc)", cmd: "tsc", args: ["--version"] },
  { name: "biome", cmd: "biome", args: ["--version"] },
  { name: "eslint", cmd: "eslint", args: ["--version"] },
];

const LANGUAGE_SERVERS = [
  { name: "typescript-language-server", cmd: "typescript-language-server", args: ["--version"] },
  { name: "pyright", cmd: "pyright", args: ["--version"] },
  { name: "rust-analyzer", cmd: "rust-analyzer", args: ["--version"] },
  { name: "gopls", cmd: "gopls", args: ["version"] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPackageRoot(): string {
  // Try common Pi.dev installation paths for the starter-kit package
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const candidates = [
    resolve(home, ".pi", "agent", "packages", "pi-dev-starter-kit"),
    resolve(home, ".pi", "agent", "git", "github.com", "c4iov1", "pi-dev-starter-kit"),
    resolve(home, ".pi", "agent", "git", "github.com", "caioo", "pi-dev-starter-kit"),
    resolve(home, ".pi", "agent", "git", "github.com", "user", "pi-dev-starter-kit"),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, "package.json"))) return c;
  }

  // Fallback: walk up from CWD looking for package.json with matching name
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const p = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (p.name === "pi-dev-starter-kit") return dir;
      } catch {
        // ignore parse errors, keep walking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Last resort: assume the current working directory is the package root
  return process.cwd();
}

function getExtensionDirs(packageRoot: string): Set<string> {
  const extensionsDir = join(packageRoot, "extensions");
  if (!existsSync(extensionsDir)) return new Set();
  try {
    const entries = readdirSync(extensionsDir);
    return new Set(
      entries.filter((e) => {
        const p = join(extensionsDir, e);
        return statSync(p).isDirectory();
      }),
    );
  } catch {
    return new Set();
  }
}

function getSkillDirs(packageRoot: string): Set<string> {
  const skillsDir = join(packageRoot, "skills");
  if (!existsSync(skillsDir)) return new Set();
  try {
    const entries = readdirSync(skillsDir);
    return new Set(
      entries.filter((e) => {
        const p = join(skillsDir, e);
        return statSync(p).isDirectory();
      }),
    );
  } catch {
    return new Set();
  }
}

function loadSettings(cwd: string): { settings: StarterKitSettings | null; found: boolean } {
  const configPath = resolve(cwd, ".pi", "settings.json");
  if (!existsSync(configPath)) {
    return { settings: null, found: false };
  }
  try {
    const raw = readFileSync(configPath, "utf-8");
    return { settings: JSON.parse(raw), found: true };
  } catch {
    return { settings: null, found: true };
  }
}

function checkBinary(bin: { cmd: string; args: string[] }): boolean {
  try {
    const r = spawnSync(bin.cmd, bin.args, { timeout: 5000 });
    return r.status === 0 && !r.error;
  } catch {
    return false;
  }
}

function statusLabel(status: Status): string {
  const map: Record<Status, string> = { ok: "✅", warn: "⚠️", error: "❌" };
  return map[status];
}

function overallStatus(items: TableRow[]): Status {
  if (items.some((r) => r.status === "error")) return "error";
  if (items.some((r) => r.status === "warn")) return "warn";
  return "ok";
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

function generateDoctorReport(cwd: string, packageRoot: string): DoctorReport {
  const { settings, found: settingsFound } = loadSettings(cwd);
  const activeExtensions = new Set(settings?.starterKit?.activeExtensions ?? []);
  const activeSkills = new Set(settings?.starterKit?.activeSkills ?? []);
  const existingExtDirs = getExtensionDirs(packageRoot);
  const existingSkillDirs = getSkillDirs(packageRoot);

  const permissionMode = settings?.starterKit?.permissionMode ?? "default";

  const profile = {
    steeringMode: settings?.starterKit?.steeringMode ?? "not-configured",
    interruptMode: settings?.starterKit?.interruptMode ?? "not-configured",
    compactionStrategy: settings?.starterKit?.compactionStrategy ?? "not-configured",
  };

  // -- Extensions table ------------------------------------------------------

  const extensions: TableRow[] = ALL_KNOWN_EXTENSIONS.map((ext) => {
    const dirExists = existingExtDirs.has(ext);
    const activated = activeExtensions.has(ext);
    if (!dirExists) {
      return { capability: ext, status: "warn", notes: "extension folder not found" };
    }
    if (activated) {
      return { capability: ext, status: "ok", notes: "installed + active" };
    }
    return { capability: ext, status: "warn", notes: "installed but not active in settings" };
  });

  // -- Skills table ----------------------------------------------------------

  const skills: TableRow[] = ALL_KNOWN_SKILLS.map((skill) => {
    const dirExists = existingSkillDirs.has(skill);
    const activated = activeSkills.has(skill);
    if (!dirExists) {
      return { capability: skill, status: "warn", notes: "skill folder not found" };
    }
    if (activated) {
      return { capability: skill, status: "ok", notes: "available + active" };
    }
    return { capability: skill, status: "warn", notes: "available but not active in settings" };
  });

  // -- Binaries table --------------------------------------------------------

  const binaries: TableRow[] = [];

  for (const bin of REQUIRED_BINARIES) {
    const ok = checkBinary(bin);
    binaries.push({
      capability: bin.name,
      status: ok ? "ok" : "error",
      notes: ok ? "found" : "MISSING — required for basic operation",
    });
  }

  for (const bin of OPTIONAL_BINARIES) {
    const ok = checkBinary(bin);
    binaries.push({
      capability: bin.name,
      status: ok ? "ok" : "warn",
      notes: ok ? "found" : "not found (optional)",
    });
  }

  for (const ls of LANGUAGE_SERVERS) {
    const ok = checkBinary(ls);
    binaries.push({
      capability: ls.name,
      status: ok ? "ok" : "warn",
      notes: ok ? "found (language server)" : "not found (optional language server)",
    });
  }

  // -- Fixes -----------------------------------------------------------------

  const fixes: FixItem[] = [];
  const criticalMissing = binaries.filter((b) => b.status === "error");
  for (const m of criticalMissing) {
    fixes.push({
      description: `${m.capability} is missing.`,
      command: `Install ${m.capability} and ensure it is on PATH.`,
    });
  }

  if (!settingsFound) {
    fixes.push({
      description: "No .pi/settings.json found in project.",
      command:
        "Run /init-starter-kit or copy templates/settings.template.json to .pi/settings.json",
    });
  }

  // Warn about future extensions not yet implemented
  const futureMissing = ["artifact-read", "ast-tools", "source-navigation"].filter(
    (e) => !existingExtDirs.has(e),
  );
  if (futureMissing.length > 0) {
    fixes.push({
      description: `${futureMissing.join(", ")} — Akita-plan extensions not yet implemented.`,
      command: "These are planned in ai-harness-akita task set; check .scratch/ai-harness-akita/",
    });
  }

  return {
    projectRoot: cwd,
    settingsFound,
    permissionMode,
    profile,
    extensions,
    skills,
    binaries,
    fixes,
  };
}

function renderMarkdown(report: DoctorReport): string {
  const extOverall = overallStatus(report.extensions);
  const skillOverall = overallStatus(report.skills);
  const binOverall = overallStatus(report.binaries);
  const allStatuses: Status[] = [extOverall, skillOverall, binOverall];
  if (report.fixes.length === 0 && allStatuses.every((s) => s === "ok")) {
    allStatuses[0] = "ok";
  }
  const overall: Status = allStatuses.includes("error")
    ? "error"
    : allStatuses.includes("warn")
      ? "warn"
      : "ok";

  const criticalMissing = report.binaries
    .filter((b) => b.status === "error")
    .map((b) => b.capability);

  const lines: string[] = [];
  lines.push("# Starter Kit Doctor");
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Overall: ${statusLabel(overall)} ${overall}`);
  lines.push(`- Project root: \`${report.projectRoot}\``);
  lines.push(`- Settings file (.pi/settings.json): ${report.settingsFound ? "found" : "NOT FOUND"}`);
  lines.push(`- Permission mode: \`${report.permissionMode}\``);
  lines.push(
    `- Critical missing: ${
      criticalMissing.length > 0 ? criticalMissing.join(", ") : "none"
    }`,
  );
  lines.push("");

  // Profile
  lines.push("## Harness Profile");
  lines.push(
    `- steeringMode: \`${report.profile.steeringMode}\``,
  );
  lines.push(
    `- interruptMode: \`${report.profile.interruptMode}\``,
  );
  lines.push(
    `- compactionStrategy: \`${report.profile.compactionStrategy}\``,
  );
  lines.push("");

  // Extensions
  lines.push("## Active Extensions");
  lines.push("");
  lines.push("| Capability | Status | Notes |");
  lines.push("|---|---|---|");
  for (const row of report.extensions) {
    lines.push(
      `| ${row.capability} | ${statusLabel(row.status as Status)} | ${row.notes} |`,
    );
  }
  lines.push("");

  // Skills
  lines.push("## Active Skills");
  lines.push("");
  lines.push("| Capability | Status | Notes |");
  lines.push("|---|---|---|");
  for (const row of report.skills) {
    lines.push(
      `| ${row.capability} | ${statusLabel(row.status as Status)} | ${row.notes} |`,
    );
  }
  lines.push("");

  // Binaries
  lines.push("## Binary / Dependency Checks");
  lines.push("");
  lines.push("| Tool | Status | Notes |");
  lines.push("|---|---|---|");
  for (const row of report.binaries) {
    lines.push(
      `| ${row.capability} | ${statusLabel(row.status as Status)} | ${row.notes} |`,
    );
  }
  lines.push("");

  // Fixes
  if (report.fixes.length > 0) {
    lines.push("## Recommended Fixes");
    lines.push("");
    for (let i = 0; i < report.fixes.length; i++) {
      const fix = report.fixes[i];
      lines.push(`${i + 1}. **${fix.description}**`);
      if (fix.command) {
        lines.push(`   - \`${fix.command}\``);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "starter_kit_doctor",
    label: "Starter Kit Doctor",
    description:
      "Diagnose the Pi.dev Starter Kit environment. Reports which extensions " +
      "and skills are installed/active, which binaries are available, current " +
      "harness profile settings, and actionable fixes. Use this when you need " +
      "to know which starter-kit capabilities are available, or when " +
      "diagnosing why a tool or skill is not working.",
    promptSnippet: "Run a starter kit environment diagnostic",
    promptGuidelines: [
      "Use starter_kit_doctor when a tool or skill appears to be missing or " +
        "not working as expected.",
      "Use after /init-starter-kit to verify the project is set up correctly.",
      "Use before starting a new project to confirm all required dependencies.",
    ],
    parameters: Type.Object({
      // No parameters needed — doctor inspects the environment
    }),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd ?? process.cwd();
      const packageRoot = getPackageRoot();

      const report = generateDoctorReport(cwd, packageRoot);
      const markdown = renderMarkdown(report);

      return {
        content: [
          {
            type: "text" as const,
            text: markdown,
          },
        ],
        details: {
          projectRoot: report.projectRoot,
          settingsFound: report.settingsFound,
          permissionMode: report.permissionMode,
          profile: report.profile,
          criticalMissing: report.binaries
            .filter((b) => b.status === "error")
            .map((b) => b.capability),
          extensionCount: report.extensions.length,
          skillCount: report.skills.length,
          fixCount: report.fixes.length,
        },
      };
    },
  });
}
