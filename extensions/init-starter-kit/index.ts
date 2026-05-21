/**
 * init-starter-kit — Extension that registers a `/init-starter-kit` command
 * to copy templates and scaffold a new project directory structure.
 *
 * Usage: `/init-starter-kit <project-name> [stack]`
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { mkdirSync, cpSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function templateDir(): string {
  // Templates live next to this extension's index.ts in the starter kit repo.
  // When installed as a pi package, they're at ~/.pi/agent/.../templates/
  const extDir = __dirname;
  // Walk up from extensions/contrib-gate to the repo root
  const repoRoot = resolve(extDir, "..", "..");
  return join(repoRoot, "templates");
}

function replacePlaceholders(
  targetPath: string,
  projectName: string,
): void {
  const content = readFileSync(targetPath, "utf-8");
  const replaced = content.replace(/\[PROJECT_NAME\]/g, projectName);
  writeFileSync(targetPath, replaced, "utf-8");
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.registerCommand("init-starter-kit", {
    description:
      "Initialize a new project with Pi.dev Starter Kit templates. " +
      "Usage: /init-starter-kit <project-name> [stack]",
    async handler(args, ctx) {
      const parts = (args ?? "").trim().split(/\s+/);
      const projectName = parts[0];
      const stack = parts.slice(1).join(" ") || "TypeScript/Node.js";

      if (!projectName) {
        ctx.ui.notify(
          "Usage: /init-starter-kit <project-name> [stack]",
          "error",
        );
        return;
      }

      const cwd = ctx.cwd;
      const src = templateDir();

      if (!existsSync(src)) {
        ctx.ui.notify(
          `Templates directory not found: ${src}`,
          "error",
        );
        return;
      }

      // ── Create directories ─────────────────────────────────────

      mkdirSync(join(cwd, ".pi", "extensions"), { recursive: true });
      mkdirSync(join(cwd, ".pi", "skills"), { recursive: true });
      mkdirSync(join(cwd, ".pi", "prompts"), { recursive: true });
      mkdirSync(join(cwd, "docs", "adr"), { recursive: true });
      mkdirSync(join(cwd, "docs", "references"), { recursive: true });
      mkdirSync(join(cwd, "docs", "explorations"), { recursive: true });

      // ── Copy templates ─────────────────────────────────────────

      const copies: Array<[string, string]> = [
        ["AGENTS.template.md", "AGENTS.md"],
        ["CONTEXT.template.md", "CONTEXT.md"],
        ["settings.template.json", join(".pi", "settings.json")],
        ["INDEX.template.md", join("docs", "INDEX.md")],
        ["ADR.template.md", join("docs", "adr", "0001-template.md")],
      ];

      for (const [srcFile, destRel] of copies) {
        const srcPath = join(src, srcFile);
        const destPath = join(cwd, destRel);
        if (existsSync(srcPath)) {
          cpSync(srcPath, destPath);
        }
      }

      // ── Replace placeholders ───────────────────────────────────

      const filesToReplace = [
        "AGENTS.md",
        "CONTEXT.md",
        join("docs", "INDEX.md"),
      ];
      for (const rel of filesToReplace) {
        const target = join(cwd, rel);
        if (existsSync(target)) {
          replacePlaceholders(target, projectName);
        }
      }

      const created: string[] = [
        "AGENTS.md",
        "CONTEXT.md",
        ".pi/settings.json",
        "docs/INDEX.md",
        "docs/adr/0001-template.md",
        ".pi/extensions/",
        ".pi/skills/",
        ".pi/prompts/",
        "docs/adr/",
        "docs/references/",
        "docs/explorations/",
      ];

      ctx.ui.notify(
        `Initialized "${projectName}" (${stack})`,
        created.map((f) => `  ✓ ${f}`).join("\n"),
      );
    },
  });
}
