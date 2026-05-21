import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Cache of unsupported/missing compilers to prevent repeat execution attempts
const unsupportedCheckers = new Set<string>();

interface CheckerConfig {
  command: string;
  args: string[];
}

/**
 * Checks if autotypecheck is enabled via settings.json.
 * Defaults to true.
 */
function isAutoTypeCheckEnabled(): boolean {
  try {
    const settingsPath = path.resolve(process.cwd(), ".pi/settings.json");
    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, "utf8");
      const settings = JSON.parse(content);
      if (settings?.starterKit?.autoTypeCheck === false) {
        return false;
      }
    }
  } catch (err) {
    // Default to true if config load fails
  }
  return true;
}

/**
 * Detects project type-checker commands based on file extensions and manifest files.
 */
function detectTypeChecker(filePath: string): CheckerConfig | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const ext = path.extname(filePath).toLowerCase();
  const root = process.cwd();

  // 1. TypeScript / TSX
  if (ext === ".ts" || ext === ".tsx") {
    if (fs.existsSync(path.join(root, "tsconfig.json"))) {
      return {
        command: "npx",
        args: ["tsc", "--noEmit"],
      };
    }
  }

  // 2. Python
  if (ext === ".py") {
    return {
      command: "npx",
      args: ["pyright", filePath],
    };
  }

  // 3. Rust
  if (ext === ".rs") {
    if (fs.existsSync(path.join(root, "Cargo.toml"))) {
      return {
        command: "cargo",
        args: ["check"],
      };
    }
  }

  // 4. Go
  if (ext === ".go") {
    if (fs.existsSync(path.join(root, "go.mod"))) {
      return {
        command: "go",
        args: ["vet", filePath],
      };
    }
  }

  return null;
}

/**
 * Runs the selected compiler checks with timeout and returns success/output.
 * Gracefully skips if the command does not exist on the machine.
 */
function runTypeCheck(checker: CheckerConfig): { success: boolean; output: string; skipped: boolean } {
  const { command, args } = checker;

  if (unsupportedCheckers.has(command)) {
    return { success: true, output: "", skipped: true };
  }

  try {
    const result = spawnSync(command, args, {
      cwd: process.cwd(),
      timeout: 10000, // 10s maximum timeout
      encoding: "utf8",
      shell: true,
    });

    if (result.error) {
      const err = result.error as any;
      if (err.code === "ENOENT" || result.status === 127) {
        unsupportedCheckers.add(command);
        return { success: true, output: "", skipped: true };
      }
      return { success: false, output: err.message || "Execution error", skipped: false };
    }

    const success = result.status === 0;
    const output = (result.stdout || "") + (result.stderr || "");
    return { success, output, skipped: false };
  } catch (err: any) {
    return {
      success: false,
      output: err.message || "Unexpected execution error",
      skipped: false,
    };
  }
}

/**
 * Filters output to grab error lines, formats and truncates to max 10.
 */
function formatTypeCheckOutput(success: boolean, output: string): string {
  if (success) {
    return "Type check: OK";
  }

  const trimmed = output.trim();
  if (!trimmed) {
    return "Type check: Failed with no output details.";
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Extract lines likely containing compiler error reports
  const errorLines = lines.filter((line) => {
    const lower = line.toLowerCase();
    return (
      lower.includes("error") ||
      lower.includes("failed") ||
      /:\d+:\d+/.test(line) ||
      /\(\d+,\d+\)/.test(line)
    );
  });

  const listToTruncate = errorLines.length > 0 ? errorLines : lines;
  const maxErrors = 10;
  const truncated = listToTruncate.slice(0, maxErrors);
  let formatted =
    `Type check: Errors found:\n` + truncated.map((l) => `  ${l}`).join("\n");
  if (listToTruncate.length > maxErrors) {
    formatted += `\n  ... (and ${listToTruncate.length - maxErrors} more errors)`;
  }
  return formatted;
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_result", async (event: any, _ctx: any) => {
    // Intercept edit / write tool calls
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

    // Skip if disabled by configurations
    if (!isAutoTypeCheckEnabled()) {
      return;
    }

    // Parse target file path from parameters
    const args = event.arguments || event.args || {};
    const rawFilePath =
      args.TargetFile || args.targetFile || args.path || args.file || args.filepath;

    if (typeof rawFilePath !== "string") {
      return;
    }

    const filePath = path.resolve(process.cwd(), rawFilePath);
    const checker = detectTypeChecker(filePath);

    if (!checker) {
      return;
    }

    const { success, output, skipped } = runTypeCheck(checker);
    if (skipped) {
      return;
    }

    const checkSummary = formatTypeCheckOutput(success, output);

    // Append typecheck diagnostics output back to event results
    if (typeof event.result === "string") {
      event.result += `\n\n[starterKit] ${checkSummary}`;
    } else if (event.result && typeof event.result === "object") {
      if (typeof event.result.output === "string") {
        event.result.output += `\n\n[starterKit] ${checkSummary}`;
      } else if (typeof event.result.content === "string") {
        event.result.content += `\n\n[starterKit] ${checkSummary}`;
      } else {
        event.result.typecheck = checkSummary;
      }
    } else if (typeof event.output === "string") {
      event.output += `\n\n[starterKit] ${checkSummary}`;
    } else {
      event.result = `[starterKit] ${checkSummary}`;
    }
  });
}
