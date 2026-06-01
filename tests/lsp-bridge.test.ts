import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import lspBridge from "../extensions/lsp-bridge/index.js";

function withCwd<T>(cwd: string, fn: () => T): T {
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    return fn();
  } finally {
    process.chdir(previous);
  }
}

function createHarness(settings: Record<string, unknown> = {}) {
  const workspace = mkdtempSync(join(tmpdir(), "lsp-bridge-"));
  mkdirSync(join(workspace, ".pi"), { recursive: true });
  writeFileSync(join(workspace, ".pi", "settings.json"), JSON.stringify({ starterKit: settings }, null, 2));

  const handlers = new Map<string, any>();
  const tools = new Map<string, any>();
  const pi = {
    on(eventName: string, handler: any) {
      handlers.set(eventName, handler);
    },
    registerTool(tool: any) {
      tools.set(tool.name, tool);
    },
  };

  lspBridge(pi as any);

  return {
    workspace,
    handlers,
    tools,
    ctx: { cwd: workspace },
    async runTool(name: string, params: Record<string, unknown>) {
      const tool = tools.get(name);
      assert.ok(tool, `${name} should be registered`);
      return withCwd(workspace, () => tool.execute("call-1", params, undefined, undefined, { cwd: workspace }));
    },
    async triggerToolResult(event: any) {
      const handler = handlers.get("tool_result");
      assert.ok(handler, "tool_result handler should be registered");
      return withCwd(workspace, () => handler(event, { cwd: workspace }));
    },
    cleanup() {
      rmSync(workspace, { recursive: true, force: true });
    },
  };
}

function writeTsProject(workspace: string) {
  writeFileSync(join(workspace, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2020",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
    },
    include: ["**/*.ts"],
  }, null, 2));
  writeFileSync(join(workspace, "index.ts"), [
    "export function greet(name: string): string {",
    "  return `Hello, ${name}!`;",
    "}",
    "",
    "const message = greet('World');",
    "console.log(message);",
    "",
  ].join("\n"));
}

test("lsp-bridge registers type-check hook and symbol tools", () => {
  const h = createHarness();
  try {
    assert.ok(h.handlers.has("tool_result"));
    for (const name of ["lsp_definition", "lsp_references", "lsp_rename", "lsp_workspace_symbols"]) {
      assert.ok(h.tools.has(name), `${name} should be registered`);
    }
  } finally {
    h.cleanup();
  }
});

test("lsp-bridge type-check hook respects autoTypeCheck settings", async () => {
  const disabled = createHarness({ autoTypeCheck: false });
  try {
    writeTsProject(disabled.workspace);
    writeFileSync(join(disabled.workspace, "bad.ts"), "const value: number = 'oops';\n");
    const event = { tool: "write", arguments: { path: "bad.ts" }, result: { output: "wrote" } };
    await disabled.triggerToolResult(event);
    assert.equal(event.result.output, "wrote");
  } finally {
    disabled.cleanup();
  }

  const enabled = createHarness({ autoTypeCheck: true });
  try {
    writeTsProject(enabled.workspace);
    writeFileSync(join(enabled.workspace, "bad.ts"), "const value: number = 'oops';\n");
    const event = { tool: "write", arguments: { path: "bad.ts" }, result: { output: "wrote" } };
    await enabled.triggerToolResult(event);
    assert.match(event.result.output, /\[starterKit\] Type check:/);
  } finally {
    enabled.cleanup();
  }
});

test("lsp-bridge type-check hook detects project-gated languages without crashing", async () => {
  const h = createHarness({ autoTypeCheck: true });
  try {
    writeFileSync(join(h.workspace, "script.py"), "x: int = 1\n");
    writeFileSync(join(h.workspace, "Cargo.toml"), "[package]\nname='demo'\nversion='0.1.0'\nedition='2021'\n");
    writeFileSync(join(h.workspace, "main.rs"), "fn main() {}\n");
    writeFileSync(join(h.workspace, "go.mod"), "module demo\n");
    writeFileSync(join(h.workspace, "main.go"), "package main\nfunc main() {}\n");

    for (const path of ["script.py", "main.rs", "main.go"]) {
      const event = { tool: "write", arguments: { path }, result: { output: "wrote" } };
      await h.triggerToolResult(event);
      assert.ok(typeof event.result.output === "string" || typeof (event.result as any).typecheck === "string");
    }
  } finally {
    h.cleanup();
  }
});

test("lsp-bridge returns degradation for non-TypeScript symbol lookups", async () => {
  const h = createHarness({ lspBridge: { enableSymbolOps: true } });
  try {
    writeFileSync(join(h.workspace, "script.py"), "def greet(name): return name\n");
    const result = await h.runTool("lsp_definition", { file: "script.py", line: 1, character: 5 });
    assert.match(result.content[0].text, /only available for TypeScript projects/i);
    assert.match(result.content[0].text, /ast_grep|grep/);
  } finally {
    h.cleanup();
  }
});

test("lsp-bridge symbol operations respect enableSymbolOps=false", async () => {
  const h = createHarness({ lspBridge: { enableSymbolOps: false } });
  try {
    writeTsProject(h.workspace);
    const result = await h.runTool("lsp_definition", { file: "index.ts", line: 5, character: 17 });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /disabled/);
  } finally {
    h.cleanup();
  }
});

test("lsp-bridge TypeScript symbol operations work", async () => {
  const h = createHarness({ lspBridge: { enableSymbolOps: true } });
  try {
    writeTsProject(h.workspace);

    const definition = await h.runTool("lsp_definition", { file: "index.ts", line: 5, character: 18 });
    assert.equal(definition.details.found, true);
    assert.match(definition.content[0].text, /index\.ts:1:/);

    const references = await h.runTool("lsp_references", { file: "index.ts", line: 1, character: 17 });
    assert.equal(references.details.found, true);
    assert.ok(references.details.count >= 2);

    const rename = await h.runTool("lsp_rename", { file: "index.ts", line: 1, character: 17, newName: "sayHello", dryRun: true });
    assert.equal(rename.details.dryRun, true);
    assert.ok(rename.details.count >= 2);
    assert.match(rename.content[0].text, /DRY RUN/);

    const symbols = await h.runTool("lsp_workspace_symbols", { query: "greet", limit: 10 });
    assert.equal(symbols.details.found, true);
    assert.match(symbols.content[0].text, /greet/);
  } finally {
    h.cleanup();
  }
});

test("lsp-bridge symbol tools report missing file errors", async () => {
  const h = createHarness({ lspBridge: { enableSymbolOps: true } });
  try {
    writeTsProject(h.workspace);
    const result = await h.runTool("lsp_definition", { file: "missing.ts", line: 1, character: 1 });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /File not found/);
  } finally {
    h.cleanup();
  }
});
