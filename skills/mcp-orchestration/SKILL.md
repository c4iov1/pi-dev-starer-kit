---
name: mcp-orchestration
description: Activates the mcp proxy tool (from pi-mcp-adapter). Teaches the model how to discover, connect, and interact with MCP servers for databases, external APIs, Figma designs, and other services. Use when the user needs to query a database, interact with an API via MCP, or access MCP-connected services.
---

# MCP Orchestration

This skill activates the `mcp` proxy tool provided by `pi-mcp-adapter`. MCP (Model Context Protocol) servers expose external services as tools the agent can call — without burning context on verbose tool definitions.

## How MCP Works

Instead of loading every tool from every MCP server into context (which can burn 10k+ tokens), the adapter provides a single **`mcp` proxy tool** (~200 tokens). The agent uses it to:

1. **Discover** what tools are available across all connected servers
2. **Call** specific tools when needed
3. **Connect** servers lazily (they only start when you use them)

## Core Pattern

### Discovery
```
mcp({ search: "database" })
```
Returns all MCP tools matching "database" across all configured servers. This is how you find what's available without pre-loading definitions.

### Invocation
```
mcp({ tool: "server_name_tool_name", args: '{"key": "value"}' })
```
Calls a specific MCP tool. Note: `args` is a **JSON string**, not an object.

### Server Management
```
mcp({ connect: "server_name" })   // Explicitly start a server
mcp({ disconnect: "server_name" }) // Stop a server
mcp({ status: true })             // Show all server statuses
```

## Common MCP Use Cases

### Database Queries
```
mcp({ search: "query" })           // Find database tools
mcp({ tool: "postgres_query", args: '{"sql": "SELECT * FROM users LIMIT 10"}' })
```

### External APIs
```
mcp({ search: "github" })          // Find GitHub tools
mcp({ tool: "github_search_repositories", args: '{"query": "react hooks"}' })
```

### Design Tools (Figma)
```
mcp({ search: "figma" })           // Find Figma tools
mcp({ tool: "figma_get_file", args: '{"fileKey": "abc123"}' })
```

### Browser DevTools
```
mcp({ search: "screenshot" })      // Find browser tools
mcp({ tool: "chrome_devtools_take_screenshot", args: '{"format": "png"}' })
```

## Workflow

### 1. Discover
Before using any MCP server, discover what's available:
```
mcp({ search: "keyword" })
```
The result shows matching tool names and descriptions across all configured servers.

### 2. Understand
For detailed tool information:
```
mcp({ describe: "full_tool_name" })
```
This shows parameters, types, defaults, and descriptions for a specific tool.

### 3. Call
Once you understand the tool, call it:
```
mcp({ tool: "full_tool_name", args: '{"param": "value"}' })
```

### 4. Iterate
MCP servers stay connected while idle (configurable timeout). Call multiple tools on the same server without reconnection overhead.

## When to Use

Use MCP when:
- The user asks to "query the database"
- The user mentions a connected service (Figma, GitHub, Jira, etc.)
- The user asks to "check the API" of a service with an MCP server
- You need data or actions from an external service that has an MCP integration

## When NOT to Use

Skip MCP when:
- No MCP servers are configured (check with `mcp({ status: true })`)
- The task can be done with built-in tools (reading files, running local commands)
- The user hasn't set up the MCP server yet
- A direct API call via `bash` + `curl` would be simpler and more reliable

## Rules

- **Discover first.** Always search before calling. Don't assume tool names.
- **Use describe.** Check parameters and types before invoking unfamiliar tools.
- **Handle errors gracefully.** MCP servers can fail. Report errors to the user with context.
- **Lazy connection is fine.** Servers start automatically on first use — you rarely need explicit `connect`.
- **Don't overload.** Call one tool at a time. MCP tools are not parallel-safe unless documented.
- **Security.** MCP servers run with the user's permissions. Don't pass unsanitized user input directly to MCP tools.
