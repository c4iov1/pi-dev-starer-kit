import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import artifactRead from "../extensions/artifact-read/index.js";

function hasCommand(cmd: string, args = ["--version"]): boolean {
  const result = spawnSync(cmd, args, { encoding: "utf-8", timeout: 5000 });
  return result.status === 0 && !result.error;
}

function createHarness() {
  const workspace = mkdtempSync(join(tmpdir(), "artifact-read-"));
  const tools = new Map<string, any>();
  const pi = {
    registerTool(tool: any) {
      tools.set(tool.name, tool);
    },
  };

  artifactRead(pi as any);
  const tool = tools.get("artifact_read");
  assert.ok(tool, "artifact_read should register a tool");

  return {
    workspace,
    tool,
    ctx: { cwd: workspace },
    async run(params: Record<string, unknown>) {
      return tool.execute("call-1", params, undefined, undefined, { cwd: workspace });
    },
    cleanup() {
      rmSync(workspace, { recursive: true, force: true });
    },
  };
}

test("artifact-read confines paths to the workspace", async () => {
  const h = createHarness();
  try {
    writeFileSync(join(h.workspace, "inside.csv"), "a,b\n1,2\n");

    const traversal = await h.run({ path: "../outside.csv" });
    assert.equal(traversal.details.ok, false);
    assert.match(traversal.content[0].text, /escapes workspace root/);

    const absolute = await h.run({ path: "/etc/passwd" });
    assert.equal(absolute.details.ok, false);

    const inside = await h.run({ path: "inside.csv", mode: "summary" });
    assert.equal(inside.details.ok, true);
    assert.equal(inside.details.detectedType, "csv");
  } finally {
    h.cleanup();
  }
});

test("artifact-read reports missing files as structured errors", async () => {
  const h = createHarness();
  try {
    const result = await h.run({ path: "missing.json" });
    assert.equal(result.details.ok, false);
    assert.match(result.content[0].text, /does not exist/);
    assert.match(result.details.suggestion, /Check the path/);
  } finally {
    h.cleanup();
  }
});

test("artifact-read handles directory summary, schema, and list modes", async () => {
  const h = createHarness();
  try {
    mkdirSync(join(h.workspace, "data"));
    writeFileSync(join(h.workspace, "data", "one.txt"), "one");
    writeFileSync(join(h.workspace, "data", "two.json"), "{\"ok\":true}");

    for (const mode of ["summary", "schema", "list"] as const) {
      const result = await h.run({ path: "data", mode });
      assert.equal(result.details.ok, true, `${mode} should succeed`);
      assert.equal(result.details.detectedType, "directory");
      if (mode === "list") {
        assert.match(result.content[0].text, /one\.txt|two\.json/);
      } else {
        assert.match(result.content[0].text, /\.txt|\.json|entries/);
      }
    }

    const invalid = await h.run({ path: "data", mode: "query" });
    assert.equal(invalid.details.ok, false);
    assert.match(invalid.content[0].text, /not supported for directories/);
  } finally {
    h.cleanup();
  }
});

test("artifact-read parses CSV edge cases and modes", async () => {
  const h = createHarness();
  try {
    writeFileSync(h.workspace + "/people.csv", 'name,age,city\n"Alice, A.",30,NYC\nBob,25,LA\n');
    writeFileSync(h.workspace + "/empty.csv", "");

    const summary = await h.run({ path: "people.csv", mode: "summary" });
    assert.equal(summary.details.ok, true);
    assert.match(summary.content[0].text, /Rows: 2/);
    assert.match(summary.content[0].text, /Columns: 3/);

    const schema = await h.run({ path: "people.csv", mode: "schema" });
    assert.equal(schema.details.ok, true);
    assert.match(schema.content[0].text, /name/);

    const sample = await h.run({ path: "people.csv", mode: "sample", limit: 1 });
    assert.equal(sample.details.ok, true);
    assert.match(sample.content[0].text, /Alice, A\./);

    const empty = await h.run({ path: "empty.csv", mode: "summary" });
    assert.equal(empty.details.ok, true);
    assert.match(empty.content[0].text, /Rows: 0/);
  } finally {
    h.cleanup();
  }
});

test("artifact-read parses JSON and JSONL modes", async () => {
  const h = createHarness();
  try {
    writeFileSync(join(h.workspace, "items.json"), JSON.stringify([{ id: 1, name: "A" }, { id: 2, name: "B" }]));
    writeFileSync(join(h.workspace, "events.jsonl"), '{"id":1,"type":"start"}\nnot-json\n{"id":2,"type":"stop"}\n');

    const jsonSummary = await h.run({ path: "items.json", mode: "summary" });
    assert.equal(jsonSummary.details.ok, true);
    assert.match(jsonSummary.content[0].text, /Type: array/);

    const jsonSample = await h.run({ path: "items.json", mode: "sample", limit: 1 });
    assert.equal(jsonSample.details.ok, true);
    assert.match(jsonSample.content[0].text, /"name": "A"/);

    const jsonlSummary = await h.run({ path: "events.jsonl", mode: "summary" });
    assert.equal(jsonlSummary.details.ok, true);
    assert.match(jsonlSummary.content[0].text, /Lines: 3/);

    const jsonlSchema = await h.run({ path: "events.jsonl", mode: "schema" });
    assert.equal(jsonlSchema.details.ok, true);
    assert.match(jsonlSchema.content[0].text, /type/);
  } finally {
    h.cleanup();
  }
});

test("artifact-read enforces SQLite read-only queries", async (t) => {
  if (!hasCommand("sqlite3", ["--version"])) {
    t.skip("sqlite3 not installed");
    return;
  }

  const h = createHarness();
  try {
    const dbPath = join(h.workspace, "test.db");
    const create = spawnSync("sqlite3", [dbPath, 'CREATE TABLE users (id INTEGER, name TEXT); INSERT INTO users VALUES (1, "Alice");'], { encoding: "utf-8" });
    assert.equal(create.status, 0, create.stderr);

    const summary = await h.run({ path: "test.db", mode: "summary" });
    assert.equal(summary.details.ok, true);
    assert.match(summary.content[0].text, /users/);

    const schema = await h.run({ path: "test.db", mode: "schema" });
    assert.equal(schema.details.ok, true);
    assert.match(schema.content[0].text, /CREATE TABLE users/);

    const sample = await h.run({ path: "test.db", mode: "sample", table: "users" });
    assert.equal(sample.details.ok, true);
    assert.match(sample.content[0].text, /Alice/);

    const select = await h.run({ path: "test.db", mode: "query", query: "SELECT name FROM users" });
    assert.equal(select.details.ok, true);
    assert.match(select.content[0].text, /Alice/);

    const list = await h.run({ path: "test.db", mode: "list" });
    assert.equal(list.details.ok, true);
    assert.match(list.content[0].text, /users: 1 rows/);

    for (const query of [
      'INSERT INTO users VALUES (2, "Bob")',
      'UPDATE users SET name = "Charlie" WHERE id = 1',
      'DELETE FROM users WHERE id = 1',
      'DROP TABLE users',
      'SELECT * FROM users; DROP TABLE users',
    ]) {
      const blocked = await h.run({ path: "test.db", mode: "query", query });
      assert.equal(blocked.details.ok, false, query);
      assert.match(blocked.content[0].text, /Only SELECT|write\/modify operations/);
    }
  } finally {
    h.cleanup();
  }
});

test("artifact-read handles archive listing, preview, and unsafe entries", async (t) => {
  const hasTar = hasCommand("tar", ["--version"]) || hasCommand("tar", ["--help"]);
  if (!hasTar) {
    t.skip("tar not installed");
    return;
  }

  const h = createHarness();
  try {
    mkdirSync(join(h.workspace, "archive-src"));
    writeFileSync(join(h.workspace, "archive-src", "hello.txt"), "hello archive\n");
    const tarPath = join(h.workspace, "safe.tar");
    const create = spawnSync("tar", ["cf", tarPath, "-C", join(h.workspace, "archive-src"), "hello.txt"], { encoding: "utf-8" });
    assert.equal(create.status, 0, create.stderr);

    const list = await h.run({ path: "safe.tar", mode: "list" });
    assert.equal(list.details.ok, true);
    assert.match(list.content[0].text, /hello\.txt/);

    const preview = await h.run({ path: "safe.tar", mode: "extract-preview" });
    assert.equal(preview.details.ok, true);
    assert.match(preview.content[0].text, /hello archive/);

    if (hasCommand("python3", ["--version"]) && hasCommand("unzip", ["-v"])) {
      const zipPath = join(h.workspace, "unsafe.zip");
      const script = `import zipfile\nwith zipfile.ZipFile(r"${zipPath}", "w") as z:\n    z.writestr("../evil.txt", "bad")\n`;
      const py = spawnSync("python3", ["-c", script], { encoding: "utf-8" });
      assert.equal(py.status, 0, py.stderr);
      assert.ok(existsSync(zipPath));

      const unsafe = await h.run({ path: "unsafe.zip", mode: "list" });
      assert.equal(unsafe.details.ok, false);
      assert.match(unsafe.content[0].text, /unsafe path entry/);
    }
  } finally {
    h.cleanup();
  }
});
