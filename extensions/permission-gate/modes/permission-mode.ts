import { loadSettings } from "../../shared/settings.js";
import type { PermissionMode } from "../types.js";

/** Normalize unknown settings input into a supported permission mode. */
export function normalizePermissionMode(raw: unknown): PermissionMode {
  if (raw === "acceptEdits" || raw === "featureWork") return raw;
  return "default";
}

/** Resolve the configured permission mode from `.pi/settings.json`. */
export function resolvePermissionMode(workspaceRoot = process.cwd()): PermissionMode {
  return normalizePermissionMode(loadSettings(workspaceRoot)?.permissionMode);
}
