/** Shared types for the permission-gate pipeline. */

/** Permission modes supported by permission-gate. */
export type PermissionMode = "default" | "acceptEdits" | "featureWork";

/** Actions accepted by the feature mode toggle command/tool. */
export type FeatureModeAction = "on" | "off" | "status";


/** Internal block result returned by pipeline stages. */
export interface BlockResult {
  blocked: true;
  reason: string;
}

/** Result of checking whether a bash command is scoped to the workspace. */
export interface BashScopeResult {
  projectScoped: boolean;
  reason?: string;
  paths: string[];
}

/** Context passed to an individual permission pipeline stage. */
export interface StageContext {
  toolName: string;
  params: Record<string, unknown>;
  ctx: any;
  workspaceRoot: string;
  permissionMode: PermissionMode;
}

/** A single stage in the permission pipeline. */
export interface PipelineStage {
  name: string;
  check(context: StageContext): BlockResult | null | Promise<BlockResult | null>;
}
