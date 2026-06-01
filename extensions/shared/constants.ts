/**
 * Shared constants for Pi.dev Starter Kit extensions.
 *
 * Centralizes magic numbers and configuration defaults used across
 * multiple extensions for consistency and maintainability.
 *
 * @module constants
 */

// ============================================================================
// Pagination & Output Limits
// ============================================================================

/**
 * Default number of rows or entries returned by paginated artifact tools.
 * Chosen to show data shape without overwhelming the model context.
 */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Maximum rows or entries accepted from a tool request.
 * Prevents accidental large context dumps from data-heavy artifacts.
 */
export const MAX_PAGE_SIZE = 200;

/**
 * Maximum directory entries to inspect when summarizing a directory.
 * Large directories such as node_modules can contain thousands of entries.
 */
export const MAX_DIRECTORY_ENTRIES = 500;

/** Maximum number of LSP references shown in one response. */
export const MAX_LSP_REFERENCES = 50;

// ============================================================================
// File Type Detection and Sizes
// ============================================================================

/**
 * Number of bytes needed to identify SQLite magic bytes: "SQLite format 3\0".
 */
export const MAGIC_BYTES_LENGTH = 16;

/** Number of bytes in a kibibyte, used for human-readable size formatting. */
export const BYTES_PER_KIB = 1024;

/** Maximum stdout/stderr buffer for artifact helper processes. */
export const ARTIFACT_PROCESS_MAX_BUFFER_BYTES = 1024 * 1024;

/** Timeout for artifact helper processes such as sqlite3, unzip, and tar. */
export const ARTIFACT_PROCESS_TIMEOUT_MS = 10_000;

/** Maximum lines returned from SQLite command output before truncation. */
export const SQLITE_OUTPUT_MAX_LINES = 100;

/** Maximum number of text files previewed from an archive. */
export const ARCHIVE_PREVIEW_MAX_FILES = 5;

/** Maximum bytes for an individual archive member to preview as text. */
export const MAX_ARCHIVE_TEXT_MEMBER_BYTES = 10 * 1024;

/** Maximum lines returned for each archive member preview. */
export const ARCHIVE_PREVIEW_MAX_LINES = 20;

/** Timeout for per-member archive content preview commands. */
export const ARCHIVE_PREVIEW_TIMEOUT_MS = 5_000;

/** Smaller buffer for archive member previews to avoid large context dumps. */
export const ARCHIVE_PREVIEW_MAX_BUFFER_BYTES = 512 * 1024;

// ============================================================================
// Loop Protection Defaults
// ============================================================================

/**
 * Default threshold for diminishing returns detection.
 * After this many consecutive low-token responses, trigger protection.
 */
export const DEFAULT_DIMINISHING_RETURNS_THRESHOLD = 5;

/**
 * Default minimum token count for a response to be considered "substantial".
 * Responses below this count increment the low-token counter.
 */
export const DEFAULT_DIMINISHING_RETURNS_MIN_TOKENS = 100;

/**
 * Default minimum token count used by loop-protection's active runtime config.
 * Kept at 500 to avoid interrupting concise but useful assistant responses.
 */
export const DEFAULT_LOOP_PROTECTION_MIN_TOKENS = 500;

/**
 * Default number of short assistant messages before triggering loop protection.
 */
export const DEFAULT_SHORT_MESSAGE_THRESHOLD = 3;

/**
 * Default minimum token count for an assistant message to be considered "not short".
 */
export const DEFAULT_SHORT_MESSAGE_MIN_TOKENS = 50;

// ============================================================================
// RTK Rewrite Defaults
// ============================================================================

/**
 * Default timeout for RTK rewrite operations in milliseconds.
 */
export const DEFAULT_RTK_REWRITE_TIMEOUT_MS = 2000;

/**
 * Environment variable name for process-level RTK opt-out.
 */
export const RTK_PROCESS_OPT_OUT_ENV = 'RTK_OPT_OUT';

/**
 * Environment variable name for per-command RTK opt-out.
 */
export const RTK_COMMAND_OPT_OUT_ENV = 'RTK_COMMAND_OPT_OUT';

// ============================================================================
// File and Path Limits
// ============================================================================

/**
 * Maximum file size (in bytes) to process for linting/type-checking.
 * Files larger than this are skipped to prevent performance issues.
 */
export const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

/**
 * Maximum path length (in characters) to process.
 * Paths longer than this are rejected as potentially malicious.
 */
export const MAX_PATH_LENGTH = 4096;

/**
 * Maximum number of parent directories to inspect while locating package roots.
 * Ten levels covers nested worktrees without risking an accidental filesystem walk.
 */
export const PACKAGE_ROOT_SEARCH_MAX_DEPTH = 10;

// ============================================================================
// Tool Names
// ============================================================================

/**
 * Set of tool names that modify files and should trigger post-edit hooks.
 */
export const EDIT_TOOLS = new Set([
  'edit',
  'write',
  'str_replace',
  'insert',
  'create',
]);

/**
 * Set of tool names that are read-only and should not trigger post-edit hooks.
 */
export const READ_ONLY_TOOLS = new Set([
  'read',
  'glob',
  'grep',
  'list',
  'search',
]);

/**
 * Set of tool names that execute shell commands.
 */
export const SHELL_TOOLS = new Set([
  'bash',
  'shell',
  'command',
]);

// ============================================================================
// Timing and Delays
// ============================================================================

/**
 * Default debounce delay (in milliseconds) for post-edit operations.
 */
export const DEFAULT_DEBOUNCE_DELAY_MS = 100;

/**
 * Maximum time (in milliseconds) to wait for a tool to complete.
 */
export const DEFAULT_TOOL_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Short timeout for binary availability/version checks in diagnostic tools.
 * Five seconds is enough for version commands while keeping doctor responsive.
 */
export const BINARY_CHECK_TIMEOUT_MS = 5000;

// ============================================================================
// Messages and Notifications
// ============================================================================

/**
 * Standard prefix for extension notifications.
 */
export const NOTIFICATION_PREFIX = '[Pi Starter Kit]';

/**
 * Standard error message for path traversal attempts.
 */
export const PATH_TRAVERSAL_ERROR = 'Path traversal attempt detected: operation blocked for security';

/**
 * Standard error message for missing settings file.
 */
export const SETTINGS_NOT_FOUND_MESSAGE = 'Settings file not found, using defaults';
