import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Handler = (event?: any, ctx?: any) => any;

export interface IntegrationHarness {
  workspace: string;
  pi: any;
  ctx: any;
  handlers: Map<string, Handler[]>;
  tools: Map<string, any>;
  commands: Map<string, any>;
  notifications: string[];
  prompts: string[];
  loadExtension(extension: (pi: any) => void): void;
  triggerSessionStart(): void;
  triggerToolCall(toolName: string, params: any): Promise<any>;
  triggerToolResult(toolName: string, params: any, result: any): void;
  executeTool(toolName: string, params: any): Promise<any>;
  cleanup(): void;
}

export function createIntegrationHarness(settings: Record<string, unknown> = {}): IntegrationHarness {
  const workspace = mkdtempSync(join(tmpdir(), "pi-starter-integration-"));
  mkdirSync(join(workspace, ".pi"), { recursive: true });
  writeFileSync(join(workspace, ".pi", "settings.json"), JSON.stringify({ starterKit: settings }, null, 2));

  const handlers = new Map<string, Handler[]>();
  const tools = new Map<string, any>();
  const commands = new Map<string, any>();
  const notifications: string[] = [];
  const prompts: string[] = [];

  const pi = {
    on(eventName: string, handler: Handler) {
      const eventHandlers = handlers.get(eventName) ?? [];
      eventHandlers.push(handler);
      handlers.set(eventName, eventHandlers);
    },
    registerTool(tool: any) {
      tools.set(tool.name, tool);
    },
    registerCommand(name: string, command: any) {
      commands.set(name, command);
    },
  };

  const ctx = {
    cwd: workspace,
    hasUI: true,
    ui: {
      select(message: string) {
        prompts.push(message);
        return "No";
      },
      notify(message: string) {
        notifications.push(message);
      },
    },
  };

  return {
    workspace,
    pi,
    ctx,
    handlers,
    tools,
    commands,
    notifications,
    prompts,

    loadExtension(extension: (pi: any) => void) {
      extension(pi);
    },

    triggerSessionStart() {
      for (const handler of handlers.get("session_start") ?? []) {
        handler({}, ctx);
      }
    },

    async triggerToolCall(toolName: string, params: any): Promise<any> {
      const event = { toolName, input: params };
      for (const handler of handlers.get("tool_call") ?? []) {
        const result = await handler(event, ctx);
        if (result?.block) return result;
      }
      return undefined;
    },

    triggerToolResult(toolName: string, params: any, result: any) {
      const event = { toolName, input: params, result };
      for (const handler of handlers.get("tool_result") ?? []) {
        handler(event, ctx);
      }
    },

    async executeTool(toolName: string, params: any): Promise<any> {
      const blocked = await this.triggerToolCall(toolName, params);
      if (blocked) return blocked;

      const tool = tools.get(toolName);
      if (!tool) throw new Error(`Tool not registered: ${toolName}`);

      const result = await tool.execute("integration-call", params, undefined, undefined, ctx);
      this.triggerToolResult(toolName, params, result);
      return result;
    },

    cleanup() {
      rmSync(workspace, { recursive: true, force: true });
    },
  };
}
