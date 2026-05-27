import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import permissionGate from "../extensions/permission-gate/index";

type Handler = (event?: any, ctx?: any) => any;

function createHarness(selectChoice = "No", settingsMode = "default") {
  const workspace = mkdtempSync(join(tmpdir(), "permission-gate-"));
  mkdirSync(join(workspace, ".pi"), { recursive: true });
  writeFileSync(join(workspace, ".pi", "settings.json"), JSON.stringify({ starterKit: { permissionMode: settingsMode } }));

  const handlers = new Map<string, Handler>();
  const commands = new Map<string, any>();
  const tools = new Map<string, any>();
  const prompts: string[] = [];
  const notifications: string[] = [];

  const pi = {
    on(eventName: string, handler: Handler) {
      handlers.set(eventName, handler);
    },
    registerCommand(name: string, command: any) {
      commands.set(name, command);
    },
    registerTool(tool: any) {
      tools.set(tool.name, tool);
    },
  };

  permissionGate(pi as any);

  const ctx = {
    cwd: workspace,
    hasUI: true,
    ui: {
      select(message: string) {
        prompts.push(message);
        return selectChoice;
      },
      notify(message: string) {
        notifications.push(message);
      },
    },
  };

  handlers.get("session_start")?.({}, ctx);

  return {
    workspace,
    handlers,
    commands,
    tools,
    ctx,
    prompts,
    notifications,
    cleanup() {
      rmSync(workspace, { recursive: true, force: true });
    },
  };
}

async function enableFeatureWork(harness: ReturnType<typeof createHarness>) {
  const tool = harness.tools.get("feature_mode_toggle");
  assert.ok(tool, "feature_mode_toggle should be registered");
  const result = await tool.execute("call-1", { mode: "on" });
  assert.equal(result.details.mode, "featureWork");
}

function bashEvent(command: string, cwd?: string) {
  return { toolName: "bash", input: { command, ...(cwd ? { cwd } : {}) } };
}

test("featureWork auto-allows read/write/edit tools inside the active project", async () => {
  const harness = createHarness();
  try {
    await enableFeatureWork(harness);
    const toolCall = harness.handlers.get("tool_call");
    assert.ok(toolCall);

    assert.equal(await toolCall({ toolName: "read", input: { path: "src/app.ts" } }, harness.ctx), undefined);
    assert.equal(await toolCall({ toolName: "write", input: { path: "src/app.ts" } }, harness.ctx), undefined);
    assert.equal(await toolCall({ toolName: "edit", input: { path: "src/app.ts" } }, harness.ctx), undefined);
    assert.equal(harness.prompts.length, 0);
  } finally {
    harness.cleanup();
  }
});

test("featureWork auto-allows project-scoped bash including recursive rm", async () => {
  const harness = createHarness();
  try {
    await enableFeatureWork(harness);
    const toolCall = harness.handlers.get("tool_call");
    assert.ok(toolCall);

    assert.equal(await toolCall(bashEvent("mkdir -p src && rm -rf node_modules && git status"), harness.ctx), undefined);
    assert.equal(harness.prompts.length, 0);
  } finally {
    harness.cleanup();
  }
});

test("featureWork auto-allows exact implementation commands used during verification", async () => {
  const harness = createHarness();
  try {
    await enableFeatureWork(harness);
    const toolCall = harness.handlers.get("tool_call");
    assert.ok(toolCall);

    const commands = [
      "ls -la",
      "grep -R \"permissionMode\" -n README.md docs",
      "npx tsc --noEmit --skipLibCheck extensions/permission-gate/index.ts",
      "npm run test:permission-gate",
    ];

    for (const command of commands) {
      assert.equal(await toolCall(bashEvent(command), harness.ctx), undefined, command);
    }

    assert.equal(await toolCall({ toolName: "read", input: { path: "README.md" } }, harness.ctx), undefined);
    assert.equal(await toolCall({ toolName: "edit", input: { path: "README.md" } }, harness.ctx), undefined);
    assert.equal(harness.prompts.length, 0);
  } finally {
    harness.cleanup();
  }
});

test("featureWork blocks recursive rm outside the active project", async () => {
  const harness = createHarness();
  try {
    await enableFeatureWork(harness);
    const toolCall = harness.handlers.get("tool_call");
    assert.ok(toolCall);

    const result = await toolCall(bashEvent("rm -rf /"), harness.ctx);
    assert.equal(result.block, true);
    assert.match(result.reason, /rm -rf/);
    assert.equal(harness.prompts.length, 0);
  } finally {
    harness.cleanup();
  }
});

test("featureWork asks before git commit and git push", async () => {
  const harness = createHarness("No");
  try {
    await enableFeatureWork(harness);
    const toolCall = harness.handlers.get("tool_call");
    assert.ok(toolCall);

    const commitResult = await toolCall(bashEvent('git commit -m "feat: test"'), harness.ctx);
    assert.equal(commitResult.block, true);
    assert.match(commitResult.reason, /Blocked by user/);

    const pushResult = await toolCall(bashEvent("git push origin main"), harness.ctx);
    assert.equal(pushResult.block, true);
    assert.match(pushResult.reason, /Blocked by user/);

    assert.equal(harness.prompts.length, 2);
  } finally {
    harness.cleanup();
  }
});

test("featureWork asks before bash paths outside the active project", async () => {
  const harness = createHarness("No");
  try {
    await enableFeatureWork(harness);
    const toolCall = harness.handlers.get("tool_call");
    assert.ok(toolCall);

    const result = await toolCall(bashEvent("cat /etc/passwd"), harness.ctx);
    assert.equal(result.block, true);
    assert.match(result.reason, /Blocked by user/);
    assert.equal(harness.prompts.length, 1);
  } finally {
    harness.cleanup();
  }
});

test("acceptEdits still gates bash commands", async () => {
  const harness = createHarness("No", "acceptEdits");
  try {
    const command = harness.commands.get("feature-mode");
    assert.ok(command);
    await command.handler("off", harness.ctx);

    const toolCall = harness.handlers.get("tool_call");
    assert.ok(toolCall);

    const result = await toolCall(bashEvent("git status"), harness.ctx);
    assert.equal(result.block, true);
    assert.match(result.reason, /Blocked by user/);
    assert.equal(harness.prompts.length, 1);
  } finally {
    harness.cleanup();
  }
});
