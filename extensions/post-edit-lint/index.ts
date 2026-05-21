import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

// Cache of warned missing linters to avoid terminal spam
const warnedLinters = new Set<string>();

interface LinterConfig {
  command: string;
  args: string[];
}

/**
 * Checks if autolint is enabled via .pi/settings.json configuration.
 * Defaults to true if no settings file is present.
 */
function isAutoLintEnabled(): boolean {
  try {
    const settingsPath = path.resolve(process.cwd(), ".pi/settings.json");
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, "utf8");
      const settings = JSON.parse(content);
      if (settings?.starterKit?.autoLint === false) {
        return false;
      }
    }
  } catch (err) {
    // Default to true if settings parsing fails
  }
  return true;
}

/**
 * Detects the appropriate linter/formatter based on project configuration files and file extension.
 */
function detectLinter(filePath: string): LinterConfig | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const ext = path.extname(filePath).toLowerCase();
  const root = process.cwd();

  // 1. Biome: biome.json or biome.jsonc
  const hasBiome =
    fs.existsSync(path.join(root, "biome.json")) ||
    fs.existsSync(path.join(root, "biome.jsonc"));
  if (
    hasBiome &&
    [".js", ".jsx", ".ts", ".tsx", ".json", ".jsonc", ".css"].includes(ext)
  ) {
    return {
      command: "npx",
      args: ["biome", "check", "--write", filePath],
    };
  }

  // 2. ESLint: .eslintrc.* or eslint.config.*
  const hasESLint = fs
    .readdirSync(root)
    .some(
      (file) => file.startsWith(".eslintrc") || file.startsWith("eslint.config.")
    );
  if (hasESLint && [".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
    return {
      command: "npx",
      args: ["eslint", "--fix", filePath],
    };
  }

  // 3. Prettier: .prettierrc* or prettier.config.*
  const hasPrettier = fs
    .readdirSync(root)
    .some(
      (file) =>
        file.startsWith(".prettierrc") || file.startsWith("prettier.config.")
    );
  if (
    hasPrettier &&
    [".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".md", ".html"].includes(ext)
  ) {
    return {
      command: "npx",
      args: ["prettier", "--write", filePath],
    };
  }

  // 4. Native/Language-specific formatters
  if (ext === ".go") {
    return {
      command: "gofmt",
      args: ["-w", filePath],
    };
  }
  if (ext === ".rs") {
    return {
      command: "rustfmt",
      args: [filePath],
    };
  }
  if (ext === ".py") {
    return {
      command: "black",
      args: [filePath],
    };
  }

  return null;
}

/**
 * Runs the selected linter configuration.
 * Warns once per linter if not installed on the system, then skips.
 */
function runLinter(linter: LinterConfig): { success: boolean; output: string } {
  const { command, args } = linter;

  if (warnedLinters.has(command)) {
    return { success: true, output: "" };
  }

  try {
    const result = spawnSync(command, args, {
      cwd: process.cwd(),
      timeout: 5000,
      encoding: "utf8",
      shell: true,
    });

    if (result.error) {
      const err = result.error as any;
      if (err.code === "ENOENT" || result.status === 127) {
        console.warn(
          `[starterKit] Linter command '${command}' is not installed. Skipping subsequent runs.`
        );
        warnedLinters.add(command);
        return { success: true, output: "" };
      }
      return { success: false, output: err.message || "Execution error" };
    }

    // Code 0 or 127 with stdout/stderr (sometimes linter exit codes represent error counts)
    const success = result.status === 0;
    const output = (result.stdout || "") + (result.stderr || "");
    return { success, output };
  } catch (err: any) {
    return {
      success: false,
      output: err.message || "Unexpected execution error",
    };
  }
}

/**
 * Formats the lint output to be concise and fit within LLM context window constraints.
 */
function formatLintOutput(success: boolean, output: string): string {
  if (success) {
    return "Lint: OK";
  }

  const trimmed = output.trim();
  if (!trimmed) {
    return "Lint: Failed with no output details.";
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const maxLines = 12;
  const truncated = lines.slice(0, maxLines);
  let formatted =
    `Lint: Errors found:\n` + truncated.map((l) => `  ${l}`).join("\n");
  if (lines.length > maxLines) {
    formatted += `\n  ... (and ${lines.length - maxLines} more lines of errors)`;
  }
  return formatted;
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_result", async (event: any, ctx: any) => {
    // Only intercept edit or write related tools
    const targetTools = [
      "edit",
      "write",
      "replace_file_content",
      "multi_replace_file_content",
      "write_to_file",
    ];
    if (!targetTools.includes(event.tool)) {
      return;
    }

    // Skip if disabled in settings
    if (!isAutoLintEnabled()) {
      return;
    }

    // Extract target file path
    const args = event.arguments || event.args || {};
    const rawFilePath =
      args.TargetFile || args.targetFile || args.path || args.file || args.filepath;

    if (typeof rawFilePath !== "string") {
      return;
    }

    const filePath = path.resolve(process.cwd(), rawFilePath);
    const linter = detectLinter(filePath);

    if (!linter) {
      return;
    }

    // Run detected linter/formatter
    const { success, output } = runLinter(linter);
    const lintSummary = formatLintOutput(success, output);

    // Inject lint output into event result/output
    if (typeof event.result === "string") {
      event.result += `\n\n[starterKit] ${lintSummary}`;
    } else if (event.result && typeof event.result === "object") {
      if (typeof event.result.output === "string") {
        event.result.output += `\n\n[starterKit] ${lintSummary}`;
      } else if (typeof event.result.content === "string") {
        event.result.content += `\n\n[starterKit] ${lintSummary}`;
      } else {
        event.result.lint = lintSummary;
      }
    } else if (typeof event.output === "string") {
      event.output += `\n\n[starterKit] ${lintSummary}`;
    } else {
      event.result = `[starterKit] ${lintSummary}`;
    }
  });
}
