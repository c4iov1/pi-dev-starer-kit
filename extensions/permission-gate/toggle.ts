import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FeatureModeAction, PermissionMode } from "./types.js";

/** Read project settings, returning an empty object when missing or invalid. */
export function readProjectSettings(workspaceRoot: string): Record<string, unknown> {
  const configPath = resolve(workspaceRoot, ".pi", "settings.json");

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Missing or invalid settings should not block enabling feature mode.
  }

  return {};
}

/** Persist a permission mode into `.pi/settings.json` for future sessions. */
export function writeProjectPermissionMode(workspaceRoot: string, mode: PermissionMode): void {
  const settings = readProjectSettings(workspaceRoot);
  const starterKit =
    typeof settings.starterKit === "object" && settings.starterKit !== null && !Array.isArray(settings.starterKit)
      ? { ...(settings.starterKit as Record<string, unknown>) }
      : {};

  starterKit.permissionMode = mode;
  settings.starterKit = starterKit;

  const configDir = resolve(workspaceRoot, ".pi");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(resolve(configDir, "settings.json"), `${JSON.stringify(settings, null, 2)}\n`);
}

/** Apply a feature-mode toggle action and return the new runtime/settings state. */
export function applyFeatureModeAction(
  action: FeatureModeAction,
  currentMode: PermissionMode,
  settingsMode: PermissionMode,
  workspaceRoot: string,
): { mode: PermissionMode; settingsMode: PermissionMode; message: string } {
  if (action === "on") {
    writeProjectPermissionMode(workspaceRoot, "featureWork");
    return {
      mode: "featureWork",
      settingsMode: "featureWork",
      message: "featureWork mode ON and saved to this project — future sessions here will start with project-local read/write/edit and bash auto-approved. git commit, git push, network, protected paths, and outside-project paths still ask/block.",
    };
  }

  if (action === "off") {
    writeProjectPermissionMode(workspaceRoot, "default");
    return {
      mode: "default",
      settingsMode: "default",
      message: "featureWork mode OFF and saved to this project — future sessions here will start in default permission mode.",
    };
  }

  return {
    mode: currentMode,
    settingsMode,
    message: `Current permission mode: ${currentMode}. Project settings mode: ${settingsMode}.`,
  };
}

/** Parse unknown input into a feature-mode action. */
export function parseFeatureModeAction(raw: unknown): FeatureModeAction {
  if (raw === "on" || raw === "off" || raw === "status") return raw;
  return "status";
}
