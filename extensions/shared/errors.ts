/**
 * Standardized error handling for Pi.dev Starter Kit extensions.
 *
 * Provides consistent error types, error messages, and error handling patterns
 * across all extensions to improve debugging and user experience.
 */

/** Common machine-readable error codes used across extensions. */
export const ErrorCodes = {
  PATH_OUTSIDE_WORKSPACE: "PATH_OUTSIDE_WORKSPACE",
  PATH_NOT_FOUND: "PATH_NOT_FOUND",
  PATH_PROTECTED: "PATH_PROTECTED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  PERMISSION_MODE_INVALID: "PERMISSION_MODE_INVALID",
  SETTINGS_NOT_FOUND: "SETTINGS_NOT_FOUND",
  SETTINGS_INVALID: "SETTINGS_INVALID",
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  TOOL_EXECUTION_FAILED: "TOOL_EXECUTION_FAILED",
  FILE_TYPE_UNSUPPORTED: "FILE_TYPE_UNSUPPORTED",
  FILE_TYPE_UNKNOWN: "FILE_TYPE_UNKNOWN",
  SQLITE_QUERY_NOT_READONLY: "SQLITE_QUERY_NOT_READONLY",
  SQLITE_EXECUTION_FAILED: "SQLITE_EXECUTION_FAILED",
  SQL_VALIDATION_ERROR: "SQL_VALIDATION_ERROR",
  LSP_NOT_AVAILABLE: "LSP_NOT_AVAILABLE",
  LSP_OPERATION_FAILED: "LSP_OPERATION_FAILED",
  LOOP_PROTECTION_TRIGGERED: "LOOP_PROTECTION_TRIGGERED",
  CONTEXT_STARVATION: "CONTEXT_STARVATION",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  NOT_SUPPORTED: "NOT_SUPPORTED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  INVALID_ARGUMENT: "INVALID_ARGUMENT",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Base error class for all extension errors.
 * Provides structured error information including code, message, suggestion,
 * and optional debugging details.
 */
export class ExtensionError extends Error {
  public readonly code: ErrorCode | string;
  public readonly suggestion?: string;
  public readonly details?: Record<string, any>;

  constructor(
    code: ErrorCode | string,
    message: string,
    suggestion?: string,
    details?: Record<string, any>,
  ) {
    super(message);
    this.name = "ExtensionError";
    this.code = code;
    this.suggestion = suggestion;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (V8 engines only).
    const errorConstructor = Error as ErrorConstructor & {
      captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
    };
    if (typeof errorConstructor.captureStackTrace === "function") {
      errorConstructor.captureStackTrace(this, ExtensionError);
    }
  }

  /** Convert error to a user-friendly string representation. */
  toUserMessage(): string {
    return formatError(this);
  }
}

/** Formats an ExtensionError for display to the user. */
export function formatError(err: ExtensionError): string {
  let output = `[${err.code}] ${err.message}`;

  if (err.suggestion) {
    output += `\n\nSuggestion: ${err.suggestion}`;
  }

  return output;
}

/** Creates a structured error result for tool responses. */
export function errorResult(err: ExtensionError): {
  ok: false;
  error: { code: string; message: string; suggestion?: string };
  output: string;
} {
  return {
    ok: false,
    error: {
      code: err.code,
      message: err.message,
      suggestion: err.suggestion,
    },
    output: formatError(err),
  };
}

/** Error thrown when a path is outside the allowed workspace. */
export class PathOutsideWorkspaceError extends ExtensionError {
  constructor(path: string, workspaceRoot: string) {
    super(
      ErrorCodes.PATH_OUTSIDE_WORKSPACE,
      "Path is outside workspace boundary.",
      "Use a path inside the active workspace.",
      { path, workspaceRoot },
    );
  }
}

/** Error thrown when SQL validation fails (for example, dangerous patterns). */
export class SQLValidationError extends ExtensionError {
  constructor(message: string, sql?: string) {
    super(
      ErrorCodes.SQL_VALIDATION_ERROR,
      message,
      "Use a read-only SELECT/PRAGMA query and avoid write/DDL keywords.",
      sql ? { sql } : undefined,
    );
  }
}

/** Error thrown when a tool execution fails. */
export class ToolExecutionError extends ExtensionError {
  constructor(toolName: string, message: string, originalError?: Error) {
    super(
      ErrorCodes.TOOL_EXECUTION_FAILED,
      `Tool '${toolName}' execution failed: ${message}`,
      "Check tool arguments and retry. If the problem persists, inspect the tool logs.",
      { toolName, originalError: originalError?.message },
    );
  }
}

/** Error thrown when configuration is invalid. */
export class ConfigurationError extends ExtensionError {
  constructor(message: string, configKey?: string) {
    super(
      ErrorCodes.CONFIGURATION_ERROR,
      message,
      "Check .pi/settings.json for invalid or unsupported settings.",
      configKey ? { configKey } : undefined,
    );
  }
}

/** Error thrown when a required resource is not found. */
export class ResourceNotFoundError extends ExtensionError {
  constructor(resourceType: string, resourcePath: string) {
    super(
      ErrorCodes.RESOURCE_NOT_FOUND,
      `${resourceType} not found: ${resourcePath}`,
      "Verify that the resource exists and that the path is correct.",
      { resourceType, resourcePath },
    );
  }
}

/** Error thrown when an operation is not supported. */
export class NotSupportedError extends ExtensionError {
  constructor(operation: string, reason?: string) {
    super(
      ErrorCodes.NOT_SUPPORTED,
      `Operation not supported: ${operation}`,
      reason,
      reason ? { reason } : undefined,
    );
  }
}

/** Safely execute async operations with normalized ExtensionError failures. */
export async function safeExecute<T>(
  operation: () => Promise<T>,
): Promise<{ success: true; data: T } | { success: false; error: ExtensionError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

/** Safely execute sync operations with normalized ExtensionError failures. */
export function safeExecuteSync<T>(
  operation: () => T,
): { success: true; data: T } | { success: false; error: ExtensionError } {
  try {
    const data = operation();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}

/** Convert unknown thrown values to ExtensionError. */
export function normalizeError(error: unknown): ExtensionError {
  if (error instanceof ExtensionError) {
    return error;
  }

  return new ExtensionError(
    ErrorCodes.UNKNOWN_ERROR,
    error instanceof Error ? error.message : String(error),
    "Inspect the underlying error and retry with valid inputs.",
  );
}
