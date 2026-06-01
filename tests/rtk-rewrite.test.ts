import assert from "node:assert/strict";
import test from "node:test";
import {
  getEffectiveSettings,
  hasCommandOptOut,
  hasProcessOptOut,
  isAlreadyRtk,
  rewriteCommand,
  selectRewrite,
  shouldSkipRewrite,
  DEFAULT_RTK_REWRITE_SETTINGS,
  parseRtkVersion,
  isSupportedRtkVersion,
  shouldUseRtkAvailability,
} from "../extensions/rtk-rewrite/index";

test("settings default to enabled when missing", () => {
  assert.equal(getEffectiveSettings(null).enabled, true);
  assert.equal(getEffectiveSettings({}).enabled, true);
});

test("explicit enabled:false disables rewrite", () => {
  const settings = getEffectiveSettings({ rtkRewrite: { enabled: false } });
  assert.equal(settings.enabled, false);
  assert.equal(shouldSkipRewrite("git status", settings, {}), true);
});

test("process-level opt-outs are truthy", () => {
  assert.equal(hasProcessOptOut({ RTK_DISABLE_REWRITE: "1" }), true);
  assert.equal(hasProcessOptOut({ RTK_DISABLED: "true" }), true);
  assert.equal(hasProcessOptOut({ RTK_DISABLED: "yes" }), true);
  assert.equal(hasProcessOptOut({ RTK_DISABLED: "on" }), true);
  assert.equal(hasProcessOptOut({ RTK_DISABLED: "0" }), false);
});

test("per-command opt-outs are detected", () => {
  assert.equal(hasCommandOptOut("RTK_DISABLE_REWRITE=1 git status"), true);
  assert.equal(hasCommandOptOut("RTK_DISABLED=true ls -la"), true);
  assert.equal(hasCommandOptOut("env RTK_DISABLED=yes find . -type f"), true);
  assert.equal(hasCommandOptOut("FOO=bar git status"), false);
});

test("already-RTK commands are skipped", () => {
  assert.equal(isAlreadyRtk("rtk git status"), true);
  assert.equal(isAlreadyRtk("FOO=bar rtk ls -la"), true);
  assert.equal(shouldSkipRewrite("rtk git status", DEFAULT_RTK_REWRITE_SETTINGS, {}), true);
});

test("exit code 0 with non-empty different stdout rewrites", () => {
  assert.equal(selectRewrite("git status", { code: 0, stdout: "rtk git status\n" }), "rtk git status");
});

test("exit code 3 with non-empty different stdout rewrites", () => {
  assert.equal(selectRewrite("ls -la", { code: 3, stdout: "rtk ls -la\n" }), "rtk ls -la");
});

test("exit code 1 passes through", () => {
  assert.equal(selectRewrite("echo hello", { code: 1, stdout: "" }), null);
});

test("exit code 2 passes through", () => {
  assert.equal(selectRewrite("git status", { code: 2, stdout: "rtk git status" }), null);
});

test("empty stdout passes through", () => {
  assert.equal(selectRewrite("git status", { code: 0, stdout: "" }), null);
});

test("identical stdout passes through", () => {
  assert.equal(selectRewrite("git status", { code: 0, stdout: "git status" }), null);
});

test("killed process passes through", () => {
  assert.equal(selectRewrite("git status", { code: 0, stdout: "rtk git status", killed: true }), null);
});

test("thrown rewrite errors pass through", async () => {
  const pi = {
    exec: async () => {
      throw new Error("timeout");
    },
  };
  assert.equal(await rewriteCommand(pi as any, "git status", DEFAULT_RTK_REWRITE_SETTINGS), null);
});

test("rewriteCommand uses rtk rewrite argv and accepts code 3", async () => {
  const calls: any[] = [];
  const pi = {
    exec: async (cmd: string, args: string[], options: any) => {
      calls.push({ cmd, args, options });
      return { code: 3, stdout: "rtk git status\n" };
    },
  };
  assert.equal(await rewriteCommand(pi as any, "git status", DEFAULT_RTK_REWRITE_SETTINGS), "rtk git status");
  assert.deepEqual(calls[0].args, ["rewrite", "git status"]);
  assert.equal(calls[0].cmd, "rtk");
});

test("version parser recognizes supported RTK", () => {
  assert.deepEqual(parseRtkVersion("rtk 0.42.0"), [0, 42, 0]);
  assert.equal(isSupportedRtkVersion("rtk 0.42.0"), true);
  assert.equal(isSupportedRtkVersion("rtk 0.22.0"), false);
});

test("availability guard requires installed and supported RTK", () => {
  assert.equal(shouldUseRtkAvailability({ available: true, supported: true, version: "rtk 0.42.0" }), true);
  assert.equal(shouldUseRtkAvailability({ available: true, supported: false, version: "rtk 0.22.0" }), false);
  assert.equal(shouldUseRtkAvailability({ available: false, supported: false, version: null }), false);
});
