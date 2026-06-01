/**
 * Monitor Bash Extension
 *
 * Registers the `Monitor` tool, allowing the agent to run background shell commands
 * and receive streaming stdout/stderr line-by-line.
 *
 * Implements cancellation, configurable maximum timeout, and respects permission-gate.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { spawn, exec } from "child_process";
import { normalizeError } from "../shared/errors";
import { readFileSync } from "fs";
import { resolve } from "path";
import readline from "readline";

interface Settings {
  starterKit?: {
    monitorBash?: {
      maxTimeout?: number;
    };
  };
}

interface ProcessState {
  timedOut: boolean;
  aborted: boolean;
}

interface Throttler {
  update: (line: string) => void;
  flush: () => void;
}

// ---------------------------------------------------------------------------
// Config & Helpers
// ---------------------------------------------------------------------------

function resolveMaxTimeout(): number {
  try {
    const configPath = resolve(process.cwd(), ".pi", "settings.json");
    const raw = readFileSync(configPath, "utf-8");
    const settings: Settings = JSON.parse(raw);
    return settings.starterKit?.monitorBash?.maxTimeout ?? 600;
  } catch (error) {
    // Missing or invalid settings are non-fatal; default timeout keeps the
    // monitor usable while still normalizing unexpected thrown values.
    void normalizeError(error);
    return 600;
  }
}

function killProcess(pid: number): void {
  if (process.platform === "win32") {
    exec(`taskkill /pid ${pid} /f /t`, () => {});
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch (groupError) {
      const normalizedGroupError = normalizeError(groupError);
      try {
        process.kill(pid, "SIGKILL");
      } catch (processError) {
        // The process may already have exited. Normalize both failures so
        // callers do not lose non-Error throw information during debugging.
        void normalizedGroupError;
        void normalizeError(processError);
      }
    }
  }
}

function setupProcessAbort(
  child: any,
  signal: AbortSignal | undefined,
  onAbort: () => void
): () => void {
  const handler = () => {
    if (child.pid) killProcess(child.pid);
    onAbort();
  };
  if (signal) {
    if (signal.aborted) handler();
    else signal.addEventListener("abort", handler, { once: true });
  }
  return () => {
    if (signal) signal.removeEventListener("abort", handler);
  };
}

function setupProcessTimeout(
  child: any,
  timeoutSecs: number,
  onTimeout: () => void
): NodeJS.Timeout | undefined {
  if (timeoutSecs <= 0) return undefined;
  return setTimeout(() => {
    if (child.pid) killProcess(child.pid);
    onTimeout();
  }, timeoutSecs * 1000);
}

function setupLineReaders(
  child: any,
  onLine: (line: string, stream: "stdout" | "stderr") => void
): void {
  if (child.stdout) {
    readline.createInterface({ input: child.stdout, terminal: false })
      .on("line", (l) => onLine(l, "stdout"));
  }
  if (child.stderr) {
    readline.createInterface({ input: child.stderr, terminal: false })
      .on("line", (l) => onLine(l, "stderr"));
  }
}

function createThrottledUpdater(
  onUpdate: any,
  outputLines: string[]
): Throttler {
  let dirty = false;
  let timer: NodeJS.Timeout | undefined;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (onUpdate && dirty) {
      dirty = false;
      onUpdate({ content: [{ type: "text", text: outputLines.join("\n") }] });
    }
  };
  const update = (line: string) => {
    outputLines.push(line);
    dirty = true;
    if (!timer && onUpdate) {
      timer = setTimeout(() => {
        timer = undefined;
        flush();
      }, 100);
    }
  };
  return { update, flush };
}

function handleProcessClose(
  code: number | null,
  state: ProcessState,
  outputLines: string[]
): any {
  let statusText = `\nProcess exited with code ${code}.`;
  if (state.aborted) {
    statusText = "\nProcess cancelled by user.";
  } else if (state.timedOut) {
    statusText = "\nProcess timed out.";
  }
  return {
    content: [{ type: "text", text: outputLines.join("\n") + statusText }],
    details: {
      exitCode: state.aborted || state.timedOut ? null : code,
      cancelled: state.aborted,
      timedOut: state.timedOut,
    },
  };
}

function executeMonitorPromise(
  child: any,
  timeoutTimer: NodeJS.Timeout | undefined,
  cleanAbort: () => void,
  updater: Throttler,
  state: ProcessState,
  outputLines: string[]
): Promise<any> {
  return new Promise((resolve) => {
    child.on("close", (code: number | null) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      cleanAbort();
      updater.flush();
      resolve(handleProcessClose(code, state, outputLines));
    });
    child.on("error", (err: Error) => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      cleanAbort();
      updater.flush();
      resolve({
        content: [{ type: "text", text: outputLines.join("\n") + `\nError spawning process: ${err.message}` }],
        details: { error: err.message },
        isError: true,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Tool Registration & Execution
// ---------------------------------------------------------------------------

async function handleMonitorExecute(
  _toolCallId: string,
  params: any,
  signal: AbortSignal | undefined,
  onUpdate: any,
  ctx: any
): Promise<any> {
  const maxTimeout = resolveMaxTimeout();
  const timeoutSecs = Math.min(params.timeout ?? 120, maxTimeout);
  const executionCwd = params.cwd || ctx.cwd || process.cwd();
  const child = spawn(params.command, {
    shell: true,
    cwd: executionCwd,
    env: process.env,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const state = { timedOut: false, aborted: false };
  const outputLines: string[] = [];
  const updater = createThrottledUpdater(onUpdate, outputLines);
  setupLineReaders(child, (line, stream) => updater.update(`[${stream}] ${line}`));
  const cleanAbort = setupProcessAbort(child, signal, () => { state.aborted = true; });
  const timeoutTimer = setupProcessTimeout(child, timeoutSecs, () => { state.timedOut = true; });
  return await executeMonitorPromise(child, timeoutTimer, cleanAbort, updater, state, outputLines);
}

function registerMonitorTool(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "Monitor",
    label: "Monitor Bash",
    description: "Run a shell command in the background and stream output line-by-line.",
    parameters: Type.Object({
      command: Type.String({ description: "The command to run in the background" }),
      timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (optional, default 120s)" })),
      cwd: Type.Optional(Type.String({ description: "Working directory (optional, defaults to project root)" })),
    }),
    execute: handleMonitorExecute,
  });
}

// ---------------------------------------------------------------------------
// Extension Entry Point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  registerMonitorTool(pi);
}
