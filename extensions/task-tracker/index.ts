/**
 * task-tracker — Persistent task tracking across turns for Pi.dev agents.
 *
 * Registers TaskCreate and TaskUpdate tools. Tasks persist to .pi/tasks.jsonl
 * (JSONL, one task per line). Active (non-done) tasks are re-injected into
 * context at the start of every turn via before_agent_start.
 *
 * Statuses: pending | in_progress | done | blocked
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const TASK_STATUSES = ["pending", "in_progress", "done", "blocked"] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  notes: string;
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function taskFilePath(cwd: string): string {
  return resolve(cwd, ".pi", "tasks.jsonl");
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadTasks(filePath: string): Task[] {
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, "utf-8").trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => JSON.parse(line) as Task);
}

function saveTasks(filePath: string, tasks: Task[]): void {
  ensureDir(filePath);
  const lines = tasks.map((t) => JSON.stringify(t)).join("\n") + "\n";
  writeFileSync(filePath, lines, "utf-8");
}

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function taskLine(task: Task): string {
  const icon = statusIcon(task.status);
  return `[${icon} ${task.id}] ${task.title} — ${task.status}`;
}

function statusIcon(status: TaskStatus): string {
  switch (status) {
    case "pending": return "○";
    case "in_progress": return "◉";
    case "done": return "✓";
    case "blocked": return "⊘";
  }
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  // -- Tool: TaskCreate ------------------------------------------------------

  pi.registerTool({
    name: "TaskCreate",
    label: "Task Create",
    description:
      "Create a new task in the persistent task tracker. Tasks survive " +
      "compaction and session restarts. Use this to track progress across " +
      "long-running work.",
    promptSnippet: "Create a task (title, description, status)",
    promptGuidelines: [
      "Use TaskCreate when you start a new unit of work. Break complex " +
        "requests into multiple tasks.",
      "Use TaskUpdate to change status or add notes as you progress.",
    ],
    parameters: Type.Object({
      title: Type.String({ description: "Short task title (max 120 chars)" }),
      description: Type.Optional(
        Type.String({ description: "What to do and why" }),
      ),
      status: Type.Optional(
        StringEnum(["pending", "in_progress", "blocked"] as const),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const filePath = taskFilePath(ctx.cwd);

      // On-the-fly: don't hold a stale cache. Read → mutate → write.
      const tasks = loadTasks(filePath);

      const task: Task = {
        id: generateId(),
        title: params.title.slice(0, 120),
        description: params.description ?? "",
        status: params.status ?? "pending",
        notes: "",
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };

      tasks.push(task);
      saveTasks(filePath, tasks);

      return {
        content: [
          {
            type: "text" as const,
            text: `Created task ${task.id}: "${task.title}" [${task.status}]`,
          },
        ],
        details: { task },
      };
    },
  });

  // -- Tool: TaskUpdate ------------------------------------------------------

  pi.registerTool({
    name: "TaskUpdate",
    label: "Task Update",
    description:
      "Update an existing task's status or add notes. Tasks persist in " +
      ".pi/tasks.jsonl.",
    promptSnippet: "Update a task (taskId, status, notes)",
    promptGuidelines: [
      "Use TaskUpdate to mark tasks in_progress when you start working on " +
        "them, done when completed, or blocked when stuck.",
    ],
    parameters: Type.Object({
      taskId: Type.String({ description: "The task ID returned by TaskCreate" }),
      status: Type.Optional(
        StringEnum([...TASK_STATUSES] as unknown as [string, ...string[]]),
      ),
      notes: Type.Optional(
        Type.String({ description: "Progress notes or reason for blocked status" }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const filePath = taskFilePath(ctx.cwd);
      const tasks = loadTasks(filePath);

      const index = tasks.findIndex((t) => t.id === params.taskId);
      if (index === -1) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Task "${params.taskId}" not found. ` +
                `Use TaskCreate to create it first, or check the task ID.`,
            },
          ],
          details: {},
        };
      }

      const task = tasks[index];
      task.updatedAt = nowISO();

      if (params.status !== undefined) {
        task.status = params.status as TaskStatus; // enum validated by TypeBox
      }
      if (params.notes !== undefined) {
        task.notes = task.notes
          ? `${task.notes}\n${params.notes}`
          : params.notes;
      }

      tasks[index] = task;
      saveTasks(filePath, tasks);

      return {
        content: [
          {
            type: "text" as const,
            text:
              `Updated task ${task.id}: "${task.title}" → [${task.status}]` +
              (params.notes ? `\nNotes: ${params.notes}` : ""),
          },
        ],
        details: { task },
      };
    },
  });

  // -- Inject active tasks into context at the start of every turn ----------

  pi.on("before_agent_start", async (_event, ctx) => {
    const filePath = taskFilePath(ctx.cwd);
    const tasks = loadTasks(filePath);
    const active = tasks.filter((t) => t.status !== "done");

    if (active.length === 0) return;

    const bulletPoints = active
      .map((t) => `- [${t.status}] ${taskLine(t)}`)
      .join("\n");

    const taskBlock =
      `\n\n---\n## Active Tasks (from task-tracker)\n` +
      `${bulletPoints}\n` +
      `---\n`;

    return {
      systemPrompt: (_event as any).systemPrompt + taskBlock,
    };
  });
}
