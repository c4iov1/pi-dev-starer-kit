import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import artifactRead from "../../extensions/artifact-read/index.js";
import permissionGate from "../../extensions/permission-gate/index.js";
import { createIntegrationHarness } from "./harness.js";

test("integration: permission-gate and artifact-read work together", async () => {
  const harness = createIntegrationHarness({ permissionMode: "featureWork" });
  try {
    harness.loadExtension(permissionGate);
    harness.loadExtension(artifactRead);
    harness.triggerSessionStart();

    assert.ok(harness.tools.has("artifact_read"), "artifact_read should be registered");

    const outside = await harness.triggerToolCall("artifact_read", {
      path: "../../etc/passwd",
      mode: "summary",
    });

    assert.equal(outside?.block, true, "permission-gate should block artifact_read paths outside workspace");
    assert.match(outside.reason, /PATH_OUTSIDE_WORKSPACE|outside active project|Path confinement/i);

    writeFileSync(join(harness.workspace, "sample.csv"), "name,age\nAda,36\n");

    const inside = await harness.executeTool("artifact_read", {
      path: "sample.csv",
      mode: "summary",
    });

    assert.equal(inside.details.ok, true);
    assert.equal(inside.details.detectedType, "csv");
    assert.match(inside.content[0].text, /CSV File: sample\.csv/);
  } finally {
    harness.cleanup();
  }
});

test("integration: permission-gate read tracking allows later edit", async () => {
  const harness = createIntegrationHarness({ permissionMode: "default" });
  try {
    harness.loadExtension(permissionGate);
    harness.triggerSessionStart();

    writeFileSync(join(harness.workspace, "existing.txt"), "before\n");

    const blockedBeforeRead = await harness.triggerToolCall("edit", { path: "existing.txt" });
    assert.equal(blockedBeforeRead?.block, true);
    assert.match(blockedBeforeRead.reason, /Write constraint|PERMISSION_DENIED/);

    harness.triggerToolResult("read", { path: "existing.txt" }, { details: { path: "existing.txt" } });

    const afterRead = await harness.triggerToolCall("edit", { path: "existing.txt" });
    assert.equal(afterRead?.block, true, "default mode should still prompt and block when UI says No");
    assert.match(afterRead.reason, /Blocked by user|PERMISSION_DENIED/);
    assert.equal(harness.prompts.length, 1, "second edit should reach interactive prompt after read tracking passes");
  } finally {
    harness.cleanup();
  }
});
