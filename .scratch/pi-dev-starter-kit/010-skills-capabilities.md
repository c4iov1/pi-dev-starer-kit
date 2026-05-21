# 010 — Skills: web-research + browser-testing + subagent-delegation + mcp-orchestration

**Status**: ready-for-agent
**Type**: AFK

## Parent

PRD: `docs/prd.md`

## What to build

Four capability skills that activate heavy tools on-demand via progressive disclosure. These skills register their respective tools when loaded and deregister them when the skill completes — keeping the system prompt lean.

### web-research skill

Activates `web_search` and `web_fetch` tools (from `pi-web-access`). Teaches the model the research pattern: search → filter results → fetch relevant pages → synthesize findings. The skill should instruct the model to:
- Search before asking the user for documentation
- Cite sources when providing information from web searches
- Prefer official documentation over blog posts
- Cross-reference multiple sources for critical information

### browser-testing skill

Activates browser automation tools (from `pi-agent-browser-native`). Teaches the model patterns for visual testing:
- Navigate to a URL and take screenshots
- Interact with forms and verify UI state
- Check console errors and network requests
- Run accessibility audits

### subagent-delegation skill

Activates sub-agent tools (from `pi-subagents`). Teaches the model WHEN and HOW to delegate:
- Exploration tasks (searching large codebases) → subagent with read-only tools
- Parallel investigation (trying multiple approaches) → multiple subagents
- Isolated experiments (sandboxed changes) → subagent with its own context window

The skill should emphasize: subagents run in ISOLATED context windows and return a single text result. The parent does not see intermediate tool calls. Use subagents for tasks that would pollute the main conversation context.

### mcp-orchestration skill

Activates MCP tools (from `pi-mcp-adapter`). Teaches the model patterns for external service interaction:
- Querying databases via MCP
- Reading/writing Figma designs
- Interacting with external APIs
- Managing MCP server connections

## Acceptance criteria

### web-research
- [ ] `/web-research` activates `web_search` and `web_fetch` tools
- [ ] Model can search, fetch, and synthesize information
- [ ] Sources are cited
- [ ] Tools deregister when skill completes

### browser-testing
- [ ] `/browser-testing` activates browser tools
- [ ] Model can navigate, screenshot, and verify UI
- [ ] Tools deregister when skill completes

### subagent-delegation
- [ ] `/subagent-delegation` activates sub-agent tools
- [ ] Model can delegate exploration tasks to sub-agents
- [ ] Sub-agents run in isolated context windows
- [ ] Results are returned as text summaries

### mcp-orchestration
- [ ] `/mcp-orchestration` activates MCP tools
- [ ] Model can query connected MCP servers
- [ ] Tools deregister when skill completes

## Blocked by

- #001 (package scaffold must exist)
- #002 (direct dependencies must be installed — `pi-web-access`, `pi-subagents`, `pi-mcp-adapter`, `pi-agent-browser-native`)
