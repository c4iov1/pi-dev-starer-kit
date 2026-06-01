import assert from "node:assert/strict";
import test from "node:test";
import {
  ErrorCodes,
  ExtensionError,
  PathOutsideWorkspaceError,
  errorResult,
  formatError,
  normalizeError,
  safeExecuteSync,
} from "../extensions/shared/errors.js";

test("formatError includes code, message, and suggestion", () => {
  const err = new ExtensionError(
    ErrorCodes.INVALID_ARGUMENT,
    "Invalid value.",
    "Provide a positive integer.",
  );

  assert.equal(
    formatError(err),
    "[INVALID_ARGUMENT] Invalid value.\n\nSuggestion: Provide a positive integer.",
  );
});

test("formatError omits suggestion when absent", () => {
  const err = new ExtensionError(ErrorCodes.UNKNOWN_ERROR, "Something failed.");

  assert.equal(formatError(err), "[UNKNOWN_ERROR] Something failed.");
});

test("errorResult returns a structured tool error payload", () => {
  const err = new ExtensionError(
    ErrorCodes.SETTINGS_INVALID,
    "Settings file is invalid.",
    "Fix .pi/settings.json.",
  );

  assert.deepEqual(errorResult(err), {
    ok: false,
    error: {
      code: ErrorCodes.SETTINGS_INVALID,
      message: "Settings file is invalid.",
      suggestion: "Fix .pi/settings.json.",
    },
    output: "[SETTINGS_INVALID] Settings file is invalid.\n\nSuggestion: Fix .pi/settings.json.",
  });
});

test("normalizeError preserves ExtensionError instances", () => {
  const err = new PathOutsideWorkspaceError("/etc/passwd", "/workspace");

  assert.equal(normalizeError(err), err);
});

test("normalizeError wraps unknown thrown values", () => {
  const err = normalizeError("boom");

  assert.equal(err.code, ErrorCodes.UNKNOWN_ERROR);
  assert.equal(err.message, "boom");
});

test("safeExecuteSync returns success data and normalized errors", () => {
  assert.deepEqual(safeExecuteSync(() => 42), { success: true, data: 42 });

  const result = safeExecuteSync(() => {
    throw new Error("failed");
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.code, ErrorCodes.UNKNOWN_ERROR);
    assert.equal(result.error.message, "failed");
  }
});
