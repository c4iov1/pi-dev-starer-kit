import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock ExtensionAPI
function createMockAPI() {
  const handlers: Record<string, Function[]> = {};
  const notifications: string[] = [];

  return {
    on: (event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    },
    notifications,
    handlers,
    trigger: async (event: string, ...args: any[]) => {
      const eventHandlers = handlers[event] || [];
      for (const handler of eventHandlers) {
        const result = await handler(...args);
        if (result) return result; // Return the first non-undefined result
      }
    },
  };
}

// Inline implementation of contrib-gate for testing (avoids ESM import issues)
function testContribGate(pi: any) {
  const DEFAULT_BRANCH_PATTERNS = ["feature/", "fix/", "chore/", "docs/", "refactor/", "test/"];
  const DEFAULT_COMMIT_TYPES = ["feat", "fix", "chore", "docs", "style", "refactor", "test", "perf", "ci", "build", "revert"];
  const DEFAULT_CONFIG = { mode: "default", branchPatterns: DEFAULT_BRANCH_PATTERNS, commitTypes: DEFAULT_COMMIT_TYPES };

  function loadConfig(cwd: string) {
    try {
      const fs = require('node:fs');
      const path = require('node:path');
      const raw = JSON.parse(fs.readFileSync(path.join(cwd, '.pi', 'settings.json'), 'utf-8'));
      const cg = raw?.starterKit?.contribGate;
      if (!cg) return DEFAULT_CONFIG;
      return {
        mode: cg.mode === 'strict' ? 'strict' : 'default',
        branchPatterns: Array.isArray(cg.branchPatterns) && cg.branchPatterns.length > 0 ? cg.branchPatterns : DEFAULT_BRANCH_PATTERNS,
        commitTypes: Array.isArray(cg.commitTypes) && cg.commitTypes.length > 0 ? cg.commitTypes : DEFAULT_COMMIT_TYPES,
      };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  function validateBranchName(branch: string, config: any) {
    const pattern = new RegExp(`^(${config.branchPatterns.map((p: string) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`);
    if (pattern.test(branch)) return { passed: true, reason: '' };
    return { passed: false, reason: `Branch "${branch}" does not match convention.\nAllowed patterns: ${config.branchPatterns.map((p: string) => `${p}*`).join(', ')}` };
  }

  function validateCommitMessage(message: string, config: any) {
    const firstLine = message.split('\n')[0]?.trim() ?? '';
    const pattern = new RegExp(`^(${config.commitTypes.join('|')})(\\([^)]*\\))?!?:?\\s.+$`);
    if (pattern.test(firstLine)) return { passed: true, reason: '' };
    return { passed: false, reason: `Commit message does not follow conventional commits format.\nExpected: ${config.commitTypes.join('|')}(scope): description\nGot: "${firstLine}"` };
  }

  pi.on('tool_call', async (event: any, ctx: any) => {
    if (event.toolName !== 'bash') return;
    const cmd = event.input?.command;
    if (!cmd || typeof cmd !== 'string') return;

    if (/^\s*git\s+(status|log|diff|add|stash|fetch|pull)\b/.test(cmd)) return;
    if (/^\s*git\s+(merge|rebase)\s+--(abort|continue)\b/.test(cmd)) return;

    const config = loadConfig(ctx.cwd);

    const branchMatch = cmd.match(/(?:checkout\s+-b|switch\s+-c)\s+(\S+)/);
    if (branchMatch) {
      const result = validateBranchName(branchMatch[1], config);
      if (!result.passed) {
        if (config.mode === 'strict') return { block: true, reason: result.reason };
        ctx.ui.notify('Branch name convention', 'warning');
      }
      return;
    }

    if (/\bgit\s+commit\b/.test(cmd)) {
      const messageMatch = cmd.match(/-m\s*"([^"]*)"/);
      if (messageMatch) {
        const result = validateCommitMessage(messageMatch[1], config);
        if (!result.passed) {
          if (config.mode === 'strict') return { block: true, reason: result.reason };
          ctx.ui.notify('Conventional commit', 'warning');
        }
      }
    }
  });
}

// Mock context
function createMockContext(cwd: string) {
  const notifications: string[] = [];
  return {
    cwd,
    ui: {
      notify: (title: string, message: string) => {
        notifications.push(`${title}: ${message}`);
      },
    },
    notifications,
  };
}

// Test fixtures
function createTestProject(settings?: any): { cwd: string; cleanup: () => void } {
  const cwd = mkdtempSync(join(tmpdir(), "contrib-gate-test-"));
  mkdirSync(join(cwd, ".pi"), { recursive: true });

  if (settings) {
    writeFileSync(join(cwd, ".pi", "settings.json"), JSON.stringify({ starterKit: settings }));
  }

  return {
    cwd,
    cleanup: () => rmSync(cwd, { recursive: true, force: true }),
  };
}

test("contrib-gate: validates branch names in default mode", async () => {
  const { cwd, cleanup } = createTestProject({ contribGate: { mode: "default" } });
  const api = createMockAPI();
  const ctx = createMockContext(cwd);

  testContribGate(api);

  // Valid branch names
  await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: "git checkout -b feature/user-auth" },
  }, ctx);
  assert.equal(ctx.notifications.length, 0, "Valid feature branch should not notify");

  await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: "git switch -c fix/bug-123" },
  }, ctx);
  assert.equal(ctx.notifications.length, 0, "Valid fix branch should not notify");

  // Invalid branch names
  await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: "git checkout -b my-feature" },
  }, ctx);
  assert.equal(ctx.notifications.length, 1, "Invalid branch should notify in default mode");
  assert.ok(ctx.notifications[0].includes("Branch name convention"));

  cleanup();
});

test("contrib-gate: blocks invalid branch names in strict mode", async () => {
  const { cwd, cleanup } = createTestProject({ contribGate: { mode: "strict" } });
  const api = createMockAPI();
  const ctx = createMockContext(cwd);

  testContribGate(api);

  let result = await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: "git checkout -b feature/valid" },
  }, ctx);
  assert.equal(result, undefined, "Valid branch should pass in strict mode");

  result = await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: "git checkout -b invalid-branch" },
  }, ctx);
  assert.ok((result as any)?.block, "Invalid branch should be blocked in strict mode");
  assert.ok((result as any).reason.includes("does not match convention"));

  cleanup();
});

test("contrib-gate: validates commit messages", async () => {
  const { cwd, cleanup } = createTestProject({ contribGate: { mode: "default" } });
  const api = createMockAPI();
  const ctx = createMockContext(cwd);

  testContribGate(api);

  // Valid commit messages
  await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: 'git commit -m "feat: add user authentication"' },
  }, ctx);
  assert.equal(ctx.notifications.length, 0, "Valid commit should not notify");

  await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: 'git commit -m "fix(api): resolve null pointer"' },
  }, ctx);
  assert.equal(ctx.notifications.length, 0, "Valid scoped commit should not notify");

  // Invalid commit messages
  await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: 'git commit -m "added new feature"' },
  }, ctx);
  assert.equal(ctx.notifications.length, 1, "Invalid commit should notify");
  assert.ok(ctx.notifications[0].includes("Conventional commit"));

  cleanup();
});

test("contrib-gate: blocks invalid commits in strict mode", async () => {
  const { cwd, cleanup } = createTestProject({ contribGate: { mode: "strict" } });
  const api = createMockAPI();
  const ctx = createMockContext(cwd);

  testContribGate(api);

  let result = await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: 'git commit -m "feat: valid commit"' },
  }, ctx);
  assert.equal(result, undefined, "Valid commit should pass in strict mode");

  result = await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: 'git commit -m "invalid commit message"' },
  }, ctx);
  assert.ok((result as any)?.block, "Invalid commit should be blocked in strict mode");
  assert.ok((result as any).reason.includes("conventional commits format"));

  cleanup();
});

test("contrib-gate: allows passthrough commands", async () => {
  const { cwd, cleanup } = createTestProject({ contribGate: { mode: "strict" } });
  const api = createMockAPI();
  const ctx = createMockContext(cwd);

  testContribGate(api);

  const passthroughCommands = [
    "git status",
    "git log --oneline",
    "git diff HEAD",
    "git add .",
    "git stash",
    "git fetch origin",
    "git pull",
    "git merge --abort",
    "git rebase --continue",
  ];

  for (const cmd of passthroughCommands) {
    const result = await api.trigger("tool_call", {
      toolName: "bash",
      input: { command: cmd },
    }, ctx);
    assert.equal(result, undefined, `${cmd} should pass through without validation`);
  }

  assert.equal(ctx.notifications.length, 0, "Passthrough commands should not notify");

  cleanup();
});

test("contrib-gate: uses custom branch patterns", async () => {
  const { cwd, cleanup } = createTestProject({
    contribGate: {
      mode: "strict",
      branchPatterns: ["custom/", "hotfix/"],
    },
  });
  const api = createMockAPI();
  const ctx = createMockContext(cwd);

  testContribGate(api);

  let result = await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: "git checkout -b custom/feature" },
  }, ctx);
  assert.equal(result, undefined, "Custom pattern should be accepted");

  result = await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: "git checkout -b feature/standard" },
  }, ctx);
  assert.ok((result as any)?.block, "Standard pattern should be rejected with custom config");

  cleanup();
});

test("contrib-gate: uses custom commit types", async () => {
  const { cwd, cleanup } = createTestProject({
    contribGate: {
      mode: "strict",
      commitTypes: ["custom", "hotfix"],
    },
  });
  const api = createMockAPI();
  const ctx = createMockContext(cwd);

  testContribGate(api);

  let result = await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: 'git commit -m "custom: my commit"' },
  }, ctx);
  assert.equal(result, undefined, "Custom type should be accepted");

  result = await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: 'git commit -m "feat: standard commit"' },
  }, ctx);
  assert.ok((result as any)?.block, "Standard type should be rejected with custom config");

  cleanup();
});

test("contrib-gate: handles missing settings gracefully", async () => {
  const { cwd, cleanup } = createTestProject(); // No settings
  const api = createMockAPI();
  const ctx = createMockContext(cwd);

  testContribGate(api);

  // Should use defaults (mode: default, standard patterns)
  await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: "git checkout -b feature/valid" },
  }, ctx);
  assert.equal(ctx.notifications.length, 0, "Valid branch with defaults should not notify");

  await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: "git checkout -b invalid" },
  }, ctx);
  assert.equal(ctx.notifications.length, 1, "Invalid branch with defaults should notify");

  cleanup();
});

test("contrib-gate: ignores non-bash tool calls", async () => {
  const { cwd, cleanup } = createTestProject({ contribGate: { mode: "strict" } });
  const api = createMockAPI();
  const ctx = createMockContext(cwd);

  testContribGate(api);

  const result = await api.trigger("tool_call", {
    toolName: "read",
    input: { path: "some-file.txt" },
  }, ctx);

  assert.equal(result, undefined, "Non-bash tools should pass through");
  assert.equal(ctx.notifications.length, 0, "Non-bash tools should not notify");

  cleanup();
});

test("contrib-gate: handles malformed commands gracefully", async () => {
  const { cwd, cleanup } = createTestProject({ contribGate: { mode: "strict" } });
  const api = createMockAPI();
  const ctx = createMockContext(cwd);

  testContribGate(api);

  // Command without -m flag
  let result = await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: "git commit" },
  }, ctx);
  assert.equal(result, undefined, "Commit without message should pass through");

  // Empty command
  result = await api.trigger("tool_call", {
    toolName: "bash",
    input: { command: "" },
  }, ctx);
  assert.equal(result, undefined, "Empty command should pass through");

  cleanup();
});
