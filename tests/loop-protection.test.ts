import assert from "node:assert/strict";
import test from "node:test";
import loopProtection from "../extensions/loop-protection/index";
import {
  isToolOnlyAssistantMessage,
  updateDiminishingReturnsState,
} from "../extensions/loop-protection/index";

type Handler = (event?: any, ctx?: any) => any;

function createHarness() {
  const handlers = new Map<string, Handler>();
  const pi = {
    on(eventName: string, handler: Handler) {
      handlers.set(eventName, handler);
    },
  };
  loopProtection(pi as any);

  let aborts = 0;
  const notifications: string[] = [];
  const ctx = {
    cwd: process.cwd(),
    hasUI: true,
    abort() {
      aborts++;
    },
    ui: {
      notify(message: string) {
        notifications.push(message);
      },
    },
    getContextUsage() {
      return { percent: 0 };
    },
  };

  return {
    handlers,
    ctx,
    get aborts() {
      return aborts;
    },
    notifications,
  };
}

function assistantMessage(output: number, content: any = [{ type: "text", text: "ok" }]) {
  return {
    role: "assistant",
    content,
    usage: { output },
  };
}

test("tool-use stop reasons are ignored by diminishing returns tracking", () => {
  const state = { consecutiveLowTokenTurns: 0 };
  const config = { minTokens: 500, maxLowTokenTurns: 3 };
  const msg = {
    role: "assistant",
    stopReason: "toolUse",
    content: [{ type: "toolCall", name: "read" }],
    usage: { output: 10 },
  };

  assert.equal(isToolOnlyAssistantMessage(msg), true);
  assert.equal(updateDiminishingReturnsState(msg, state, config), false);
  assert.equal(state.consecutiveLowTokenTurns, 0);
});

test("assistant messages containing only tool calls are ignored without stopReason", () => {
  const state = { consecutiveLowTokenTurns: 0 };
  const config = { minTokens: 500, maxLowTokenTurns: 3 };
  const msg = {
    role: "assistant",
    content: [
      { type: "thinking", text: "" },
      { type: "toolCall", name: "edit" },
    ],
    usage: { output: 10 },
  };

  assert.equal(isToolOnlyAssistantMessage(msg), true);
  assert.equal(updateDiminishingReturnsState(msg, state, config), false);
  assert.equal(state.consecutiveLowTokenTurns, 0);
});

test("three short tool-only assistant messages do not abort the turn", async () => {
  const harness = createHarness();
  const turnEnd = harness.handlers.get("turn_end");
  assert.ok(turnEnd);

  for (let i = 0; i < 3; i++) {
    await turnEnd({
      message: {
        role: "assistant",
        stopReason: "toolUse",
        content: [{ type: "toolCall", name: "bash" }],
        usage: { output: 12 },
      },
    }, harness.ctx);
  }

  assert.equal(harness.aborts, 0);
});

test("three short final text assistant messages still abort", async () => {
  const harness = createHarness();
  const sessionStart = harness.handlers.get("session_start");
  const turnEnd = harness.handlers.get("turn_end");
  assert.ok(sessionStart);
  assert.ok(turnEnd);

  sessionStart();
  await turnEnd({ message: assistantMessage(25) }, harness.ctx);
  await turnEnd({ message: assistantMessage(30) }, harness.ctx);
  await turnEnd({ message: assistantMessage(40) }, harness.ctx);

  assert.equal(harness.aborts, 1);
});

test("a response above minTokens resets the low-token counter", async () => {
  const harness = createHarness();
  const sessionStart = harness.handlers.get("session_start");
  const turnEnd = harness.handlers.get("turn_end");
  assert.ok(sessionStart);
  assert.ok(turnEnd);

  sessionStart();
  await turnEnd({ message: assistantMessage(25) }, harness.ctx);
  await turnEnd({ message: assistantMessage(600, [{ type: "text", text: "long answer" }]) }, harness.ctx);
  await turnEnd({ message: assistantMessage(30) }, harness.ctx);
  await turnEnd({ message: assistantMessage(40) }, harness.ctx);

  assert.equal(harness.aborts, 0);
});

test("turn_start and session_start reset the low-token counter", async () => {
  const harness = createHarness();
  const sessionStart = harness.handlers.get("session_start");
  const turnStart = harness.handlers.get("turn_start");
  const turnEnd = harness.handlers.get("turn_end");
  assert.ok(sessionStart);
  assert.ok(turnStart);
  assert.ok(turnEnd);

  sessionStart();
  await turnEnd({ message: assistantMessage(25) }, harness.ctx);
  await turnEnd({ message: assistantMessage(30) }, harness.ctx);
  turnStart();
  await turnEnd({ message: assistantMessage(40) }, harness.ctx);
  assert.equal(harness.aborts, 0);

  await turnEnd({ message: assistantMessage(25) }, harness.ctx);
  await turnEnd({ message: assistantMessage(30) }, harness.ctx);
  assert.equal(harness.aborts, 1);

  sessionStart();
  await turnEnd({ message: assistantMessage(25) }, harness.ctx);
  await turnEnd({ message: assistantMessage(30) }, harness.ctx);
  assert.equal(harness.aborts, 1);
});
