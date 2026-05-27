# The Anatomy of an Agent Harness

**TLDR:** Agent = Model + Harness. Harness engineering is how we build systems around models to turn them into work engines. The model contains the intelligence and the harness makes that intelligence useful. Today, we define what a harness is and derive the core components that today's and tomorrow's agents need.

> [!NOTE]
> **Translator's Note (Addition):** The term "Harness" in this software context refers to the support infrastructure, tools, scaffolding, and execution control that wrap around the base model. We keep the original term "Harness" as it is widely used in AI engineering.

## Can Someone Please Define a "Harness"?

**Agent = Model + Harness**

If you're not the model, you're the harness.

A harness is every piece of code, configuration, and execution logic that isn't the model itself. A raw model is not an agent. But it becomes one when a harness provides it with things like state, tool execution, feedback loops, and enforceable constraints.

Concretely, a harness includes things like:
* System Prompts
* Tools, Skills, MCPs and their descriptions
* Packaged infrastructure (filesystem, sandbox, browser)
* Orchestration logic (sub-agent spawning, handoffs, model routing)
* Hooks/Middleware for deterministic execution (compaction, continuation, lint checks)

There are many confusing ways to slice the boundaries of an agent system between model and harness. But in my opinion, this is the cleanest definition because it forces us to think about designing systems around the model's intelligence.

The rest of this post walks through the core harness components and derives why each piece exists, working backwards from the central primitive of a model.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ HARNESS (Operational Agent)                                                  │
│                                                                             │
│                        Context Injection                                    │
│                 (prompts, memory, skills, conv.)                            │
│                                │                                            │
│                                ▼                                            │
│   Control               ┌───────────────┐               Action              │
│ (compaction,            │     MODEL     │──────────▶ (calls bash,           │
│  orchestration,  ──────▶│   reasons ➔   │◀ ─ ─ ─ ─ ─  tools, MCPs)        │
│  ralph loops)           │    decides    │     (results back to context)     │
│                         └───────────────┘                                   │
│                           │ ▲       ▲ └ ─ ─ ─ ─ ─ ─ ┐                       │
│                           │ │       │               │                       │
│                    writes │ │ reads │        Observe & Verify               │
│                           ▼ │       │      (browser screenshots,            │
│                        Persist      │        test results, logs)            │
│                (filesystem, git,    │               │                       │
│                 progress files)     └ ─ ─ ─ ─ ─ ─ ─ ┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Why We Need Harnesses… From a Model's Perspective

There are things we want an agent to do that a model cannot do out of the box. This is where a harness comes in.

Models (for the most part) take data as text, images, audio, video and produce text. That's it. Out of the box, they cannot:
* Maintain durable state across interactions
* Execute code
* Access real-time knowledge
* Set up environments and install packages to complete work

These are all harness-level capabilities. The structure of LLMs demands some kind of machinery wrapped around them to perform useful work.

For example, to get a product UX like "chatting", we wrap the model in a *while* loop to track previous messages and append new user messages. Everyone reading this has used this kind of harness. The main idea is that we want to convert desired agent behavior into an actual harness feature.

## Working Backwards: From Desired Agent Behavior to Harness Engineering

Harness Engineering helps humans inject useful *priors* to guide agent behavior. And as models have become more capable, harnesses have been used to extend and surgically fix models to complete previously impossible tasks.

We won't review an exhaustive list of every harness feature. The goal is to derive a set of features from the starting point of helping models do useful work. We'll follow a pattern like this:

**Behavior we want (or want to fix) → Harness Design to help the model achieve it.**

```text
Desired Agent Behavior                      What the Harness Adds
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│   Work with real data durably    │───────▶│         Filesystem + Git         │
└──────────────────────────────────┘        └──────────────────────────────────┘
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│      Write & Execute Code        │───────▶│      Bash + Code Execution       │
└──────────────────────────────────┘        └──────────────────────────────────┘
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│   Safe Execution + Tooling       │───────▶│ Sandboxed Environments + Tooling │
└──────────────────────────────────┘        └──────────────────────────────────┘
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│  Remember & access knowledge     │───────▶│   Memory Files + Search + MCPs   │
└──────────────────────────────────┘        └──────────────────────────────────┘
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│ Maintain performance (long ctx)  │───────▶│  Compaction + Offloading + Skills│
└──────────────────────────────────┘        └──────────────────────────────────┘
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│    Complete long horizon work    │───────▶│ Ralph Loops + Plan + Verification│
└──────────────────────────────────┘        └──────────────────────────────────┘
```

*"Every harness feature derives from a behavior the model cannot deliver on its own"*

### Filesystems for Durable Storage and Context Management

We want agents to have durable storage for interacting with real data, offloading information that doesn't fit in context, and persisting work across sessions.

Models can only operate directly on knowledge within their context window. Before filesystems, users had to copy/paste content directly to the model, which is a clunky UX and doesn't work for autonomous agents. The world was already using filesystems for work, so models were naturally trained on billions of tokens of how to use them. The natural solution became:

**Harnesses are shipped with filesystem abstractions and tools for filesystem operations (fs-ops).**

The filesystem is arguably the most fundamental harness primitive because of what it unlocks:
1. Agents gain a workspace to read data, code, and documentation.
2. Work can be incrementally added and offloaded instead of keeping everything in context. Agents can store intermediate outputs and maintain state that survives a single session.
3. The filesystem is a natural collaboration surface. Multiple agents and humans can coordinate through shared files. Architectures like *Agent Teams* rely on this.
4. Git adds versioning to the filesystem so agents can track work, revert mistakes, and create *branches* for experiments. We'll revisit the filesystem later as it proves to be a key harness primitive for other features we need.

### Bash + Code as a General-Purpose Tool

We want agents to solve problems autonomously, without humans needing to pre-design every tool.

The main agent execution pattern today is a ReAct loop, where a model reasons, executes an action through a tool call, observes the result, and repeats this in a `while` loop. But harnesses can only execute the tools for which they have logic. Instead of forcing users to create tools for every possible action, a better solution is to give agents a general-purpose tool like bash.

**Harnesses come with a bash tool so models can solve problems autonomously by writing and executing code.**

Code + bash execution is a major step toward giving models a computer and letting them figure out the rest autonomously. The model can design its own tools instantly through code instead of being restricted to a fixed set of pre-configured tools.

Harnesses still come with other tools, but code execution has become the default general-purpose strategy for autonomous problem solving.

### Sandboxes and Tools for Running and Verifying Work

Agents need an environment with the right defaults so they can act safely, observe results, and make progress.

We gave models storage and the ability to execute code, but all of this needs to happen somewhere. Running agent-generated code locally is risky and a single local environment doesn't scale to large agent workloads.

**Sandboxes give agents safe operational environments.** Instead of running locally, the harness can connect to a sandbox to run code, inspect files, install dependencies, and complete tasks. This creates isolated, safe code execution. For greater security, harnesses can create command allow-lists and enforce network isolation. Sandboxes also unlock scale, because environments can be created on demand, distributed across many tasks, and destroyed when work is complete.

Good environments come with good default tools. Harnesses are responsible for setting up tools so agents can do useful work. This includes pre-installing language runtimes and packages, CLIs for git and testing, and browsers for web interaction and verification.

Tools like browsers, logs, screenshots, and test runners give agents a way to observe and analyze their work. This helps them create self-verification loops where they can write application code, run tests, inspect logs, and fix errors.

The model doesn't set up its own execution environment out of the box. Deciding where the agent runs, what tools are available, what it can access, and how it verifies its work are all harness-level design decisions.

### Memory and Search for Continuous Learning

Agents should remember what they've seen and access information that didn't exist when they were trained.

Models have no additional knowledge beyond their weights and what's in their current context. Without access to edit model weights, the only way to "add knowledge" is through context injection.

**For memory, the filesystem is again a central primitive.** Harnesses support memory file patterns like `AGENTS.md` that are injected into context when the agent starts. As agents add to and edit this file, harnesses load the updated file into context. This is a form of continuous learning where agents durably store knowledge from one session and inject that knowledge into future sessions.

Knowledge cutoffs mean models cannot directly access new data, like updated library versions, without the user providing it directly. For up-to-date knowledge, **Web Search** and **MCP** (Model Context Protocol) tools like Context7 help agents access information beyond the knowledge cutoff date, like new library versions or current data that didn't exist when training stopped.

Web Search and tools for querying up-to-date context are useful primitives to integrate into a harness.

### Battling "Context Rot"

Agent performance should not degrade over the course of work.

**Context Rot** describes how models become worse at reasoning and completing tasks as their context window fills up. Context is a precious and scarce resource, so harnesses need strategies to manage it.

Harnesses today are, to a large extent, delivery mechanisms for good context engineering.

**Compaction** addresses what to do when the context window is near full. Without compaction, what happens when a conversation exceeds the context window? One option is that the API errors out, and that's not good. The harness has to use some strategy for this case. Therefore, compaction intelligently offloads and summarizes the existing context window so the agent can keep working.

**Tool call offloading** helps reduce the impact of large tool outputs that can noisily pollute the context window without providing useful information. The harness keeps the header and tail tokens of tool outputs above a threshold token count and offloads the full output to the filesystem, so the model can access it if needed.

**Skills** address the problem of having too many tools or MCP servers loaded into context at agent startup, which degrades performance before the agent can begin working. Skills are a harness-level primitive that solves this through **progressive disclosure**. The model didn't choose to have Skill front-matter definitions loaded into context at startup, but the harness can support this to protect the model from context rot.

### Autonomous Long-Horizon Execution

We want agents to complete complex work, autonomously, correctly, and across long time horizons.

Autonomous software creation is the Holy Grail for coding agents. But today's models suffer from early stopping, problems decomposing complex problems, and incoherence as work spans multiple context windows. A good harness has to be designed around all of this.

This is where the previously mentioned harness primitives start to compose. Long-horizon work requires durable state, planning, observation, and verification to keep going across multiple context windows.

*   **Filesystems and git for tracking work across sessions.** Agents produce millions of tokens during a long task, so the filesystem durably captures work for tracking progress over time. Adding git allows new agents to quickly catch up with latest work and project history. For multiple agents working together, the filesystem also acts as a shared ledger of work where agents can collaborate.
*   **Ralph Loops to continue work.** The *Ralph Loop* is a harness pattern that intercepts the model's exit attempt through a hook and re-injects the original prompt into a clean context window, forcing the agent to continue its work toward a completion goal. The filesystem makes this possible because each iteration starts with fresh context but reads the state from the previous iteration.
*   **Planning and self-verification to stay on track.** Planning is when a model decomposes a goal into a series of steps. Harnesses support this through good prompts and injecting reminders of how to use a plan file on the filesystem. After completing each step, agents benefit from verifying work correctness through self-verification. Hooks in harnesses can run a predefined test suite and return to the model on failure with the error message, or models can be prompt-instructed to self-evaluate their code independently. Verification grounds the solution in tests and creates a feedback signal for self-improvement.

## The Future of Harnesses

### The Coupling Between Model Training and Harness Design

Today's agent products, like Claude Code and Codex, are post-trained with models and harnesses together in the loop. This helps models improve at actions that harness designers think they should be natively good at, like filesystem operations, bash execution, planning, or parallelizing work with sub-agents.

This creates a feedback cycle. Useful primitives are discovered, added to the harness, and then used when training the next generation of models. As this cycle repeats, models become more capable within the harness they were trained on.

But this coevolution has interesting side effects for generalization. This shows up in situations like when changing tool logic leads to worse model performance. A good example is described here in the Codex-5.3 prompt guide with the `apply_patch` tool logic for editing files. A truly intelligent model should have little trouble switching between patch methods, but training with a harness in the loop creates this *overfitting*.

But that doesn't mean the best harness for your task is the one a model was post-trained with. The Terminal Bench 2.0 Leaderboard is a good example. Opus 4.6 in Claude Code scores far below Opus 4.6 in other harnesses. In a previous blog, we showed how we improved our coding agent from Top 30 to Top 5 on Terminal Bench 2.0 by changing only the harness. There is a lot of juice to squeeze out of harness optimization for your task.

```text
                ┌──────────────────────────────────────┐
                │          Discover Primitive          │
        ┌─────▶│ e.g. skills, compaction, ralph loops │─────┐
        │      └──────────────────────────────────────┘     │
        │                         │                         │
        │                         │                         │
        │                         ▼                         │
┌──────────────┐         ┌────────────────┐         ┌─────────────────────────┐
│Model Improves│         │     cycle      │         │     Add to Harness      │
│  at using    │         │    repeats     │         │ standardize into product│
│   harness    │         └────────────────┘         └─────────────────────────┐
└──────────────┘                                                    │
        ▲                         │                         │
        │                         │                         │
        │                         ▼                         │
        │      ┌──────────────────────────────────────┐     │
        └──────│          Train Next Model            │◀────┘
               │      with harness in the loop        │
               └──────────────────────────────────────┘
```

### Where Harness Engineering Is Heading

As models become more capable, some of what lives in the harness today will be absorbed by the model. Models will become better at planning, self-verification, and long-horizon coherence natively, thus requiring less context injection, for example.

This suggests harnesses should matter less over time. But just as prompt engineering remains valuable today, harness engineering is likely to remain useful for building good agents.

It's true that harnesses today patch over model deficiencies, but they also design systems around the model's intelligence to make them more effective. A well-configured environment, the right tools, durable state, and verification loops make any model more efficient, regardless of its base intelligence.

Harness engineering is a very active research area that we use to improve our harness-building library `deepagents` at LangChain. Here are some open and interesting problems we're exploring today:
* Orchestrating hundreds of agents working in parallel on a shared codebase.
* Agents that analyze their own traces to identify and fix harness-level failure modes.
* Harnesses that dynamically assemble the right tools and context just-in-time for a given task, rather than being pre-configured.

This blog was an exercise in defining what a harness is and how it is shaped by the work we want models to perform.

The model contains the intelligence and the harness is the system that makes that intelligence useful.

For more harness building, better systems, and better agents.
