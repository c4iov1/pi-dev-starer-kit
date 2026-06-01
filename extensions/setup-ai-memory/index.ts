/*
 * setup-ai-memory — Pi-native integration for Akita's upstream ai-memory.
 *
 * This extension does not fork or vendor ai-memory. It starts/updates the
 * upstream Docker service, posts Pi lifecycle events to ai-memory's /hook
 * endpoint, and exposes convenience slash commands that orchestrate upstream
 * ai-memory CLI operations.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { existsSync, chmodSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const IMAGE = "akitaonrails/ai-memory:latest";
const SERVER_URL = process.env.AI_MEMORY_SERVER_URL || "http://127.0.0.1:49374";
const AUTH_TOKEN = process.env.AI_MEMORY_AUTH_TOKEN;

interface StepResult {
  name: string;
  ok: boolean;
  skipped?: boolean;
  output: string;
}

interface SetupOptions {
  dryRun: boolean;
  skipServer: boolean;
  skipRouting: boolean;
  forceWrapper: boolean;
}

function parseOptions(args: string | undefined): SetupOptions {
  const tokens = (args ?? "").trim().split(/\s+/).filter(Boolean);
  const has = (flag: string) => tokens.includes(flag);
  return {
    dryRun: has("--dry-run"),
    skipServer: has("--skip-server"),
    skipRouting: has("--skip-routing"),
    forceWrapper: has("--force-wrapper"),
  };
}

function wrapperPath(): string {
  return join(homedir(), ".local", "bin", "ai-memory");
}

function envWithLocalBin(): NodeJS.ProcessEnv {
  const localBin = join(homedir(), ".local", "bin");
  return { ...process.env, PATH: `${localBin}:${process.env.PATH ?? ""}` };
}

async function runStep(
  results: StepResult[],
  name: string,
  command: string,
  args: string[],
  options: { dryRun?: boolean } = {},
  timeout = 120_000,
): Promise<void> {
  const rendered = [command, ...args].join(" ");
  if (options.dryRun) {
    results.push({ name, ok: true, skipped: true, output: rendered });
    return;
  }

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      env: envWithLocalBin(),
      timeout,
      maxBuffer: 8 * 1024 * 1024,
    });
    results.push({ name, ok: true, output: [stdout, stderr].filter(Boolean).join("\n").trim() || rendered });
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    results.push({
      name,
      ok: false,
      output: [error.stdout, error.stderr, error.message].filter(Boolean).join("\n").trim(),
    });
  }
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync("/bin/sh", ["-lc", `command -v ${command}`], { env: envWithLocalBin(), timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

async function installWrapper(results: StepResult[], options: SetupOptions): Promise<void> {
  const target = wrapperPath();
  if (existsSync(target) && !options.forceWrapper) {
    results.push({ name: "install wrapper", ok: true, skipped: true, output: `${target} already exists` });
    return;
  }

  const url = "https://raw.githubusercontent.com/akitaonrails/ai-memory/main/bin/ai-memory";
  if (options.dryRun) {
    results.push({ name: "install wrapper", ok: true, skipped: true, output: `curl -fsSL ${url} -o ${target} && chmod +x ${target}` });
    return;
  }

  try {
    await mkdir(dirname(target), { recursive: true });
    const { stdout } = await execFileAsync("curl", ["-fsSL", url], { timeout: 60_000, maxBuffer: 1024 * 1024 });
    await writeFile(target, stdout, "utf8");
    chmodSync(target, 0o755);
    results.push({ name: "install wrapper", ok: true, output: target });
  } catch (err) {
    const error = err as { stderr?: string; message?: string };
    results.push({ name: "install wrapper", ok: false, output: error.stderr ?? error.message ?? String(err) });
  }
}

async function containerExists(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("docker", ["ps", "-a", "--filter", "name=^/ai-memory$", "--format", "{{.Names}}"], { timeout: 10_000 });
    return stdout.trim() === "ai-memory";
  } catch {
    return false;
  }
}

async function containerRunning(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("docker", ["ps", "--filter", "name=^/ai-memory$", "--filter", "status=running", "--format", "{{.Names}}"], { timeout: 10_000 });
    return stdout.trim() === "ai-memory";
  } catch {
    return false;
  }
}

function serverRunArgs(): string[] {
  return [
    "run", "--platform", "linux/amd64", "-d",
    "--name", "ai-memory",
    "--restart", "unless-stopped",
    "-p", "127.0.0.1:49374:49374",
    "-v", "ai-memory-data:/data",
    "-e", "AI_MEMORY_ALLOWED_HOSTS=localhost,127.0.0.1,::1,host.docker.internal",
    IMAGE,
  ];
}

async function ensureServer(results: StepResult[], options: SetupOptions): Promise<void> {
  if (options.skipServer) {
    results.push({ name: "server", ok: true, skipped: true, output: "Skipped by --skip-server" });
    return;
  }
  if (options.dryRun) {
    results.push({ name: "server", ok: true, skipped: true, output: `docker ${serverRunArgs().join(" ")}` });
    return;
  }
  if (!(await commandExists("docker"))) {
    results.push({ name: "server", ok: false, output: "Docker not found on PATH. Install/start Docker and re-run /setup-ai-memory." });
    return;
  }
  if (await containerRunning()) {
    results.push({ name: "server", ok: true, skipped: true, output: "ai-memory container already running" });
    return;
  }
  if (await containerExists()) {
    await runStep(results, "server", "docker", ["start", "ai-memory"], options);
    return;
  }
  await runStep(results, "server", "docker", serverRunArgs(), options, 300_000);
}

function cliDockerArgs(args: string[], cwd: string): string[] {
  const uid = typeof process.getuid === "function" ? String(process.getuid()) : "1000";
  const gid = typeof process.getgid === "function" ? String(process.getgid()) : "1000";
  return [
    "run", "--rm", "--platform", "linux/amd64",
    "-v", `${homedir()}:${homedir()}`,
    "-v", `${cwd}:/work`,
    "-w", "/work",
    "-e", `HOME=${homedir()}`,
    "-e", `AI_MEMORY_HOST_CWD=${cwd}`,
    "-e", "AI_MEMORY_DATA_DIR=/tmp/ai-memory-cli",
    "-e", "AI_MEMORY_SERVER_URL=http://host.docker.internal:49374",
    ...(AUTH_TOKEN ? ["-e", `AI_MEMORY_AUTH_TOKEN=${AUTH_TOKEN}`] : []),
    "-u", `${uid}:${gid}`,
    IMAGE,
    ...args,
  ];
}

async function runAiMemoryCli(
  results: StepResult[],
  name: string,
  args: string[],
  cwd: string,
  options: { dryRun?: boolean } = {},
  timeout = 300_000,
): Promise<void> {
  await runStep(results, name, "docker", cliDockerArgs(args, cwd), options, timeout);
}

async function runAiMemoryCliText(args: string[], cwd: string, timeout = 120_000): Promise<string> {
  const { stdout, stderr } = await execFileAsync("docker", cliDockerArgs(args, cwd), {
    env: envWithLocalBin(),
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  return [stdout, stderr].filter(Boolean).join("\n").trim();
}

function formatResults(results: StepResult[]): string {
  return results.map((r) => {
    const icon = r.ok ? (r.skipped ? "○" : "✓") : "✗";
    return `${icon} ${r.name}${r.output ? `\n${r.output}` : ""}`;
  }).join("\n\n");
}

function notifyResults(ctx: any, title: string, results: StepResult[]): void {
  const failed = results.some((r) => !r.ok);
  ctx.ui.notify(`${title}\n\n${formatResults(results)}`, failed ? "error" : "info");
}

function hookUrl(event: string): string {
  const url = new URL(`${SERVER_URL.replace(/\/$/, "")}/hook`);
  url.searchParams.set("event", event);
  url.searchParams.set("agent", "pi");
  return url.toString();
}

async function postHook(event: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<void> {
  try {
    await fetch(hookUrl(event), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(AUTH_TOKEN ? { authorization: `Bearer ${AUTH_TOKEN}` } : {}),
      },
      body: JSON.stringify({ cwd: process.cwd(), ...payload }),
      signal,
    });
  } catch {
    // Fire-and-forget by design: ai-memory must never break Pi sessions.
  }
}

function safeJson(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

export default function (pi: ExtensionAPI) {
  // ─── ai-memory tools for the agent ──────────────────────────────────────

  pi.registerTool({
    name: "memory_query",
    label: "Memory Query",
    description: "Search the ai-memory wiki for prior decisions, gotchas, session notes, and project knowledge. Uses upstream ai-memory search via Docker.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query for the ai-memory wiki." }),
      limit: Type.Optional(Type.Number({ description: "Maximum number of hits to return (default 10)." })),
    }),
    async execute(_id, params, _signal, _update, ctx) {
      try {
        const args = ["search", params.query, "--limit", String(params.limit ?? 10)];
        const text = await runAiMemoryCliText(args, ctx.cwd, 120_000);
        return { content: [{ type: "text" as const, text: text || "No ai-memory search results." }], details: {} };
      } catch (err: any) {
        return { content: [{ type: "text" as const, text: `ai-memory query failed: ${err.message}` }], details: { error: String(err) }, isError: true };
      }
    },
  });

  pi.registerTool({
    name: "memory_status",
    label: "Memory Status",
    description: "Show ai-memory server/wiki status, including page/session/observation counts.",
    parameters: Type.Object({}),
    async execute(_id, _params, _signal, _update, ctx) {
      try {
        const text = await runAiMemoryCliText(["status"], ctx.cwd, 60_000);
        return { content: [{ type: "text" as const, text }], details: {} };
      } catch (err: any) {
        return { content: [{ type: "text" as const, text: `ai-memory status failed: ${err.message}` }], details: { error: String(err) }, isError: true };
      }
    },
  });

  pi.registerTool({
    name: "memory_write_page",
    label: "Memory Write Page",
    description: "Write durable knowledge to the ai-memory markdown wiki. Use only when the user explicitly asks to remember or annotate something permanently.",
    parameters: Type.Object({
      path: Type.String({ description: "Relative wiki path, e.g. notes/foo.md or decisions/auth.md." }),
      body: Type.String({ description: "Markdown body to write." }),
      title: Type.Optional(Type.String({ description: "Optional page title." })),
    }),
    async execute(_id, params, _signal, _update, ctx) {
      try {
        const args = ["write-page", "--path", params.path, "--body", params.body];
        if (params.title) args.push("--title", params.title);
        const text = await runAiMemoryCliText(args, ctx.cwd, 120_000);
        return { content: [{ type: "text" as const, text: text || `Wrote ${params.path} to ai-memory.` }], details: {} };
      } catch (err: any) {
        return { content: [{ type: "text" as const, text: `ai-memory write-page failed: ${err.message}` }], details: { error: String(err) }, isError: true };
      }
    },
  });

  // ─── Pi lifecycle capture ───────────────────────────────────────────────

  pi.on("session_start", async (event: any, ctx: any) => {
    await postHook("session-start", {
      reason: event.reason,
      session_file: ctx.sessionManager?.getSessionFile?.(),
    }, ctx.signal);
  });

  pi.on("before_agent_start", async (event: any, ctx: any) => {
    await postHook("user-prompt", { prompt: event.prompt, images_count: event.images?.length ?? 0 }, ctx.signal);
  });

  pi.on("tool_call", async (event: any, ctx: any) => {
    await postHook("pre-tool-use", {
      tool_call_id: event.toolCallId,
      tool_name: event.toolName,
      input: safeJson(event.input),
    }, ctx.signal);
  });

  pi.on("tool_result", async (event: any, ctx: any) => {
    await postHook("post-tool-use", {
      tool_call_id: event.toolCallId,
      tool_name: event.toolName,
      input: safeJson(event.input),
      is_error: event.isError,
      content: safeJson(event.content),
    }, ctx.signal);
  });

  pi.on("session_before_compact", async (event: any, ctx: any) => {
    await postHook("pre-compact", { custom_instructions: event.customInstructions ?? "" }, ctx.signal);
  });

  pi.on("agent_end", async (event: any, ctx: any) => {
    await postHook("stop", { messages_count: event.messages?.length ?? 0 }, ctx.signal);
  });

  pi.on("session_shutdown", async (event: any, ctx: any) => {
    await postHook("session-end", { reason: event.reason }, ctx.signal);
  });

  // ─── Setup command ──────────────────────────────────────────────────────

  pi.registerCommand("setup-ai-memory", {
    description: "Install/configure Akita's ai-memory for Pi. Usage: /setup-ai-memory [--dry-run] [--skip-server] [--skip-routing] [--force-wrapper]",
    async handler(args, ctx) {
      const options = parseOptions(args);
      const results: StepResult[] = [];
      await installWrapper(results, options);

      const hasDocker = options.dryRun || await commandExists("docker");
      if (!hasDocker) {
        results.push({ name: "prerequisite: Docker", ok: false, output: "Docker CLI not found on PATH. Install/start Docker and re-run /setup-ai-memory." });
        notifyResults(ctx, "ai-memory setup stopped", results);
        return;
      }

      await ensureServer(results, options);

      if (!options.skipRouting) {
        const agentsPath = resolve(ctx.cwd, "AGENTS.md");
        if (existsSync(agentsPath)) {
          await runAiMemoryCli(results, "install routing", ["install-instructions", "--target", "AGENTS.md"], ctx.cwd, options);
        } else {
          results.push({ name: "install routing", ok: true, skipped: true, output: "AGENTS.md not found; run ai-memory install-instructions --target AGENTS.md later." });
        }
      } else {
        results.push({ name: "install routing", ok: true, skipped: true, output: "Skipped by --skip-routing" });
      }

      results.push({ name: "Pi lifecycle hooks", ok: true, output: "Provided by this starter-kit extension." });
      notifyResults(ctx, "ai-memory setup complete", results);
    },
  });

  // ─── Admin command helpers ──────────────────────────────────────────────

  const registerCliCommand = (name: string, description: string, cliArgs: (args: string | undefined) => string[], timeout = 300_000) => {
    pi.registerCommand(name, {
      description,
      async handler(args, ctx) {
        const results: StepResult[] = [];
        if (!(await commandExists("docker"))) {
          results.push({ name, ok: false, output: "Docker CLI not found on PATH." });
          notifyResults(ctx, name, results);
          return;
        }
        await runAiMemoryCli(results, name, cliArgs(args), ctx.cwd, {}, timeout);
        notifyResults(ctx, name, results);
      },
    });
  };

  registerCliCommand("ai-memory-status", "Show ai-memory server/wiki status", () => ["status"], 60_000);
  registerCliCommand("ai-memory-bootstrap", "Seed ai-memory wiki from git log, README, docs, and project rules. Pass upstream flags after the command.", (args) => ["bootstrap", ...(args ?? "").trim().split(/\s+/).filter(Boolean)], 600_000);
  registerCliCommand("ai-memory-backup", "Create an ai-memory backup. Pass upstream flags after the command.", (args) => ["backup", ...(args ?? "").trim().split(/\s+/).filter(Boolean)], 600_000);
  registerCliCommand("ai-memory-lint", "Audit ai-memory wiki for stale pages, contradictions, and rule suggestions.", (args) => ["lint", ...(args ?? "").trim().split(/\s+/).filter(Boolean)], 600_000);
  registerCliCommand("ai-memory-forget-sweep", "Run ai-memory retention/forget sweep. Pass --dry-run to preview.", (args) => ["forget-sweep", ...(args ?? "").trim().split(/\s+/).filter(Boolean)], 600_000);

  pi.registerCommand("ai-memory-upgrade", {
    description: "Upgrade ai-memory Docker image and restart the local server container.",
    async handler(_args, ctx) {
      const results: StepResult[] = [];
      if (!(await commandExists("docker"))) {
        results.push({ name: "upgrade", ok: false, output: "Docker CLI not found on PATH." });
        notifyResults(ctx, "ai-memory-upgrade", results);
        return;
      }
      await runStep(results, "pull latest image", "docker", ["pull", "--platform", "linux/amd64", IMAGE], {}, 600_000);
      if (await containerExists()) {
        await runStep(results, "stop old container", "docker", ["rm", "-f", "ai-memory"], {}, 120_000);
      }
      await runStep(results, "start upgraded server", "docker", serverRunArgs(), {}, 300_000);
      await installWrapper(results, { dryRun: false, skipServer: true, skipRouting: true, forceWrapper: true });
      notifyResults(ctx, "ai-memory-upgrade", results);
    },
  });
}
