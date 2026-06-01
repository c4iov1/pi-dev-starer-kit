import assert from "node:assert/strict";
import test from "node:test";
import artifactRead from "../../extensions/artifact-read/index.js";
import permissionGate from "../../extensions/permission-gate/index.js";
import { loadSettings } from "../../extensions/shared/settings.js";
import { createIntegrationHarness } from "./harness.js";

test("integration: settings are read consistently by shared loader and permission tool", async () => {
  const harness = createIntegrationHarness({ permissionMode: "featureWork" });
  try {
    harness.loadExtension(permissionGate);
    harness.triggerSessionStart();

    const settings = loadSettings(harness.workspace);
    assert.equal(settings?.permissionMode, "featureWork");

    const tool = harness.tools.get("feature_mode_toggle");
    assert.ok(tool, "feature_mode_toggle should be registered");

    const status = await tool.execute("integration-call", { mode: "status" });
    assert.equal(status.details.mode, "featureWork");
    assert.equal(status.details.settingsMode, "featureWork");
  } finally {
    harness.cleanup();
  }
});

test("integration: loading multiple extensions registers tools and handlers without conflicts", () => {
  const harness = createIntegrationHarness({ permissionMode: "default" });
  try {
    harness.loadExtension(permissionGate);
    harness.loadExtension(artifactRead);
    harness.loadExtension((pi) => {
      pi.on("tool_call", () => undefined);
    });
    harness.triggerSessionStart();

    assert.ok(harness.commands.has("feature-mode"));
    assert.ok(harness.tools.has("feature_mode_toggle"));
    assert.ok(harness.tools.has("artifact_read"));
    assert.equal(harness.tools.size, 2, "registered tool names should remain unique");
    assert.ok((harness.handlers.get("tool_call") ?? []).length >= 2, "permission and custom hooks should both register");
  } finally {
    harness.cleanup();
  }
});

test("integration: event handlers execute in registration order", async () => {
  const harness = createIntegrationHarness();
  const order: string[] = [];

  try {
    harness.loadExtension((pi) => {
      pi.on("tool_call", () => {
        order.push("first");
        return undefined;
      });
    });
    harness.loadExtension((pi) => {
      pi.on("tool_call", () => {
        order.push("second");
        return undefined;
      });
    });

    await harness.triggerToolCall("bash", { command: "echo ok" });
    assert.deepEqual(order, ["first", "second"]);
  } finally {
    harness.cleanup();
  }
});
