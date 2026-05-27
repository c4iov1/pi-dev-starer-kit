I have everything I need. I'll assemble the full document now.

---

# 📄 Harness Engineering — Reference Document

---

## 1. What is Harness Engineering?

### Definition

Harness Engineering (*harness engineering*) is the practice of designing the environment around an AI coding agent to maximize its output.

In technical terms, the harness is composed of four fundamental elements that you customize: **System Prompt**, **Tools/MCP**, **Context**, and **Sub-agents**.

The simplest definition comes directly from Codex's source code: at the heart of every coding agent is a surprisingly simple loop — collect conversation history, send it to the LLM with tools, process the response: if there are tool calls, execute them, add results to history, and continue; if it's only text, end the turn. The "agentic" behavior emerges from this loop running until the model decides it's done. There is no complex planning system, no separate "reasoning engine" — just repeated calls to the same LLM with a growing context.

### Why does the Harness matter more than the model?

Matt Maher's independent benchmark showed that Claude Opus went from 77% in the terminal to 93% inside Cursor — a 16-point leap without changing the model at all, only changing the environment around it.

The biggest performance gains don't come from choosing a smarter model. They come from designing better scaffolding around the model you already have.

---

## 2. The Pillars of Harness Engineering

### 2.1 — The Agent Loop

The agent loop is the central logic responsible for orchestrating the interaction between the user, the model, and the tools the model invokes to perform real software work.

Each iteration follows the same pattern:

```
User sends message
  → Harness builds context (system prompt + history + tools)
  → LLM responds (text or tool call)
  → If tool call: harness executes, result goes back to context
  → LLM continues until it decides it's done
  → Final response to user
```

### 2.2 — Context Management

An agent may decide to make hundreds of tool calls in a single turn, potentially exhausting the context window. Therefore, context management is one of the agent's most critical responsibilities.

At the heart of LLM interaction is the context window. When you ask the agent to build something, the window starts with the system prompt and tool descriptions, followed by the current conversation state, and finally the user's request.

The harness doesn't just store text — it preserves structure. A shell command and its output are linked by `call_id`, so the model understands the causal relationship between them.

### 2.3 — Tool Descriptions as Agent UX

The harness matters because different models respond differently to the same prompts. A model trained intensively on shell-oriented workflows may prefer `grep` over a dedicated search tool. Another may need explicit instructions to call linter tools after edits.

This is the central principle the video demonstrated in practice: just change a tool's description from "reads the contents of a file" to "DEPRECATED — use bash" to make the model change behavior without changing a line of functional code.

### 2.4 — AGENTS.md / CLAUDE.md as Context System

Instead of treating AGENTS.md as an encyclopedia, the best use is to treat it as an index. The repository's knowledge base lives in a structured `docs/` directory, treated as a system of record. A short AGENTS.md (~100 lines) is injected into context and serves primarily as a map, with pointers to deeper sources of truth.

### 2.5 — Context Compaction

When the model approaches the token limit during a long task, the harness triggers a self-summarization step. The model condenses its own context to approximately 1,000 tokens, reducing compaction errors by 50% and allowing the model to handle 170+ turn tasks, compressing over 100,000 tokens of accumulated context without losing the thread.

### 2.6 — Engineering at Scale

What became clear is that building software still demands discipline, but that discipline shows up more in the *scaffolding* than in the code. The tools, abstractions, and feedback loops that maintain codebase coherence are increasingly important. The hardest challenges now center on designing environments, feedback loops, and control systems that help agents achieve the goal: building and maintaining complex, reliable software at scale.

---

## 3. Base References

| Source | Main Contribution |
|---|---|
| **Mihail Eric** — *"The Emperor Has No Clothes"* (Jan. 2026) | Demonstrates that the core of tools like Claude Code is ~200 lines of Python. *"The LLM never actually touches your filesystem. It just asks for things to happen, and your code makes them happen."* |
| **Thorsten Ball / AmpCode** — *"How to Build an Agent"* (Apr. 2025) | Builds a functional agent in Go in ~400 lines. Proves the pattern is language-independent. *"There's no secret. It's an LLM, a loop, and enough tools."* |
| **OpenAI** — *"Harness Engineering"* (Feb. 2026) | Takes the concept to industrial scale: 1M lines of code, 0 written manually, 3 engineers → 3.5 PRs/day. *"Building software still demands discipline, but the discipline shows up more in the scaffolding rather than the code."* |
| **OpenAI** — *"Unrolling the Codex Agent Loop"* (2025) | Official documentation of Codex's internal loop. |
| **Cursor** — *"Continually Improving Our Agent Harness"* (2026) | Documents Cursor's continuous harness improvement philosophy. |

---

## 4. What is Pi.dev?

**Pi.dev** is a minimalist, extensible coding agent. Unlike Cursor (which comes ready-made), Claude Code (which is opinionated), and Codex (which is optimized for the OpenAI ecosystem), Pi.dev positions itself as a **base harness that you design**.

### What Pi.dev already delivers natively

| Component | Description |
|---|---|
| **7 core tools** | `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls` — the minimal set proven sufficient by the reference articles |
| **Session system** | JSONL history, tree navigation, branching, compaction |
| **Skills** | Loaded on demand via `/skill:name` — equivalent to Codex's `SKILL.md` |
| **Prompt templates** | Expansion via `/name` — pre-built context |
| **Extensions** | TypeScript for custom tools and commands — the customization layer |
| **Settings** | JSON with per-project override (equivalent to per-repository `AGENTS.md`) |

### What Pi.dev does **not** deliver (and where harness engineering comes in)

- No model-optimized system prompt
- No automatic context compaction
- No permission gates for destructive operations
- No native Git workflow integration
- No automatic stack detection
- No tool call observability

These are exactly the gaps that harness engineering fills.

---

## 5. Checklist — What makes Claude Code, Codex, and Cursor the most powerful harnesses

### ✅ CLAUDE CODE CLI

| Component | Status | Detail |
|---|---|---|
| **Agent loop** | ✅ | Native tool calls via Anthropic SDK |
| **Built-in tools** | ✅ | 24 native tools, including bash, read, write, edit, web fetch, browser, and sub-agents |
| **Layered system prompt** | ✅ | Agent identity system prompt, harness instructions for markdown output, permissions, and interactive behavior |
| **CLAUDE.md / AGENTS.md** | ✅ | Injected into context at session bootstrap |
| **Specialized sub-agents** | ✅ | Separate Plan, Explore, and Task agents; "dream" system for memory consolidation |
| **Context compaction** | ✅ | Conversation summarization with verbatim preservation of security instructions and constraints |
| **Managed Agents (API)** | ✅ | Fully managed agent harness to run Claude autonomously with secure sandboxing, built-in tools, and server-sent event streaming |
| **Lifecycle hooks** | ✅ | PreToolCall, PostToolCall, Stop |
| **MCP support** | ✅ | Extensible via Model Context Protocol |
| **Skills** | ✅ | Via `.md` files in the project directory |
| **System prompt customization** | ✅ | `--system-prompt` and `--append-system-prompt` via CLI |
| **Thinking frequency tuning** | ✅ | System reminder instructing Claude to calibrate thinking frequency based on task complexity |

**Weak point**: Claude Code's tool descriptions and system prompts have likely never been changed since the product launched — the opposite of Cursor's continuous tuning philosophy.

---

### ✅ CODEX CLI (OpenAI)

| Component | Status | Detail |
|---|---|---|
| **Agent loop** | ✅ | Open source, built in Rust for speed and efficiency |
| **Native Responses API** | ✅ | `parallel_tool_calls`, `tool_choice` (auto/required/specific), `prompt_cache_key` — features designed specifically for agentic contexts |
| **Context management** | ✅ | The harness estimates token count for each message. When approaching the model's context limit, it triggers compaction |
| **Zero Data Retention** | ✅ | Stateless request handling for Zero Data Retention compliance |
| **AGENTS.md** | ✅ | AGENTS.md and MCP support makes it easy to adapt Codex to your repository and extend it with third-party tools |
| **Skills** | ✅ | With Skills, Codex goes beyond writing code to directly contribute to work that turns PRs into products, such as code understanding, prototyping, and documentation |
| **Automations** | ✅ | With Automations, Codex works unsolicited, picking up routine work like issue triage, alert monitoring, CI/CD |
| **App Server (multi-surface)** | ✅ | Codex exists on multiple surfaces — web app, CLI, IDE extension, and macOS app. Underneath, all are powered by the same Codex harness |
| **Sandboxing** | ✅ | Per-session isolated environments |
| **Thread persistence** | ✅ | Codex creates, resumes, forks, and archives threads, and persists event history so clients can reconnect and render a consistent timeline |
| **MCP support** | ✅ | Access to additional third-party tools via Model Context Protocol |
| **Prompt caching** | ✅ | Strategic prompt caching optimization to achieve linear rather than quadratic performance |

**Strong point**: Codex CLI's codebase is open source and worth studying — it's well-structured Rust with comprehensive tests and clear architectural separation.

---

### ✅ CURSOR

| Component | Status | Detail |
|---|---|---|
| **Per-model harness** | ✅ | Cursor's harness orchestrates all components for each supported model. They tune instructions and tools specifically for each frontier model based on internal evals and external benchmarks. |
| **Dynamic Context Discovery** | ✅ | As models improved as agents, Cursor had success providing fewer details upfront, letting the agent fetch relevant context on its own. This is called *dynamic context discovery*, in contrast to static context that is always included. It's much more token-efficient and can improve response quality by reducing potentially confusing information. |
| **Continuous harness improvement** | ✅ | Occasionally they discover step-change improvements. More often, improving the harness is a matter of obsessively stacking small optimizations that together make agents better at building software. |
| **Per-model and per-provider tuning** | ✅ | Customization goes very deep, including custom prompting for different providers and even model versions. When they get early access to a new model, they start from the closest existing model's harness and iterate — running offline evals, having team members use it and tune the harness in response — until they have a model-harness combination they feel good about launching. |
| **Parallelism / Worktrees** | ✅ | Cursor makes it easy to run multiple agents in parallel without them interfering with each other. Having multiple models try the same problem and choosing the best result significantly improves final output. Cursor automatically creates and manages git worktrees for parallel agents. Each agent runs in its own worktree with isolated files and changes. |
| **Context Window management** | ✅ | When they developed the coding agent in 2024, models were much worse at choosing their own context, and Cursor invested heavily in guardrails — like surfacing lint and type errors to the agent after every edit, rewriting file reads when the agent requested too many lines, and even limiting the maximum tool calls per turn. |
| **MCP token reduction** | ✅ | The agent receives only a small portion of static context, including tool names, asking it to fetch tools when the task requires. In an A/B test, this strategy reduced total agent tokens by 46.9%. |
| **CursorBench** | ✅ | Cursor maintains public benchmarks alongside their own eval suite, CursorBench, which provides a quick, standardized quality reading and allows comparison over time. |
| **Plan Mode** | ✅ | Explicit planning before coding |
| **Commands (.cursor/commands/)** | ✅ | Ideal commands for workflows executed many times a day. Stored as Markdown files in `.cursor/commands/` and versioned in git for team-wide use. |
| **Agent-first (Cursor 3)** | ✅ | Anysphere launched Cursor 3, a ground-up redesigned interface that shifts the primary model from file editing to parallel agent management. The new workspace supports local→cloud handoff, parallel multi-repo execution, and a plugin marketplace. |

---

## 6. Final Comparison

```
┌─────────────────────┬──────────────┬─────────────┬──────────────┐
│ Dimension           │ Claude Code  │ Codex CLI   │ Cursor       │
├─────────────────────┼──────────────┼─────────────┼──────────────┤
│ Philosophy          │ Opinionated  │ Open/Rust   │ Iterative    │
│ Customization       │ Medium       │ High        │ High         │
│ Per-model tuning    │ Low          │ Medium      │ Very High    │
│ Context mgmt        │ Good         │ Excellent   │ Excellent    │
│ Multi-agent         │ Sub-agents   │ Parallel    │ Worktrees    │
│ Open source         │ ❌           │ ✅          │ ❌           │
│ MCP                 │ ✅           │ ✅          │ ✅           │
│ Skills              │ ✅           │ ✅          │ ✅           │
│ Automations         │ ❌           │ ✅          │ Partial      │
│ Own benchmark       │ ❌           │ ❌          │ ✅           │
└─────────────────────┴──────────────┴─────────────┴──────────────┘
```

### The common thread between the three

Agent harnesses like Codex and Claude Code are still emergent. Architectures are converging toward similar patterns — the loop, the context manager, the tool registry, and the approval system.

What differentiates them today isn't the loop — they're all the same. It's the **degree of obsession with fine-tuning the environment**: tool descriptions, per-model system prompts, selective context management, and quality feedback loops. Harnesses commoditize "agent infrastructure" and shift effort to where it compounds: prompts, tools, and context tuned for your domain.
