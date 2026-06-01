# repo_init.md — Pi.dev Starter Kit

> What to do BEFORE you start developing. Follow the steps in order.

---

## Step 1: Verify dependencies (HITL — human)

Before any code, verify the 5 ecosystem packages are accessible:

| # | Original repository | Category |
|---|---|---|
| 1 | `pi-web-access` (nicobailon/pi-web-access) | Web search/fetch |
| 2 | `pi-subagents` (nicobailon/pi-subagents) | Sub-agents |
| 3 | `pi-mcp-adapter` (nicobailon/pi-mcp-adapter) | MCP integration |
| 4 | `pi-agent-browser-native` (fitchmultz/pi-agent-browser-native) | Browser automation |
| 5 | `context-mode` (mksglu/context-mode) | Sandbox tools + session continuity |

These packages are **direct dependencies** — they point to the original repos, no fork. Three packages from the original architecture were removed and will be reimplemented as internal extensions:
- `pi-quick-perms` → absorbed by `permission-gate` (issue #003)
- `pi-contrib-gate` → new extension `contrib-gate` (issue #015)
- `pi-memory` → new extension `auto-memory` (issue #016)

> **Issue**: `.scratch/pi-dev-starter-kit/002-fork-dependencies.md`

---

## Step 2: Read the spec (agent)

Before coding, the agent needs to understand what it will build. Ask it to read:

```
Read the following files in order and explain what you understood:

1. CONTEXT.md — domain glossary
2. docs/INDEX.md — knowledge map
3. docs/architecture.md — complete technical specification (4 layers, diagrams, comparison with Claude Code/Codex)
4. docs/prd.md — product requirements (31 user stories, modules, scope)

Then tell me: what are the 4 layers of the kit, which extensions already exist, which Akita-inspired capabilities were added, and what is the dependency order between them?
```

---

## Step 3: Start development — Phase 1 (agent, AFK)

The first phase has 2 independent issues that can run in parallel:

### Agent A — Package scaffold + SYSTEM.md

```
Read .scratch/pi-dev-starter-kit/001-package-scaffold.md and implement.

What to build:
- package.json with Pi.dev manifest (keywords: ["pi-package"], pi: {extensions, skills, prompts})
- SYSTEM.md with 6 tool categories, canonical workflow (Plan→Search→Edit→Test→Lint→Verify→Done), Think-in-Code routing rules, progressive disclosure
- APPEND_SYSTEM.md with workflow instructions
- Empty directories: extensions/, skills/, prompts/

References:
- docs/references/5-pi-dev-doc.md (section 10: Packages)
- docs/architecture.md (Layer A: Context & Documentation)
```

### Agent B — Copy mattpocock skills

```
Read .scratch/pi-dev-starter-kit/011-integrate-mattpocock-skills.md and implement.

What to do:
- Clone https://github.com/mattpocock/skills
- Copy 14 skills to skills/ (list in the issue)
- Verify each SKILL.md has correct YAML frontmatter
- Do NOT include: migrate-to-shoehorn, scaffold-exercises, git-guardrails-claude-code, request-refactor-plan

Reference:
- docs/references/8-mattpocock-skills-doc.md
```

> **Run Agent A and Agent B in parallel.** They have no dependency between them.

---

## Step 4: Phase 2 — Core extensions (6 agents in parallel, AFK)

Once Phase 1 finishes, launch these 6 agents simultaneously:

### Agent C — permission-gate

```
Read .scratch/pi-dev-starter-kit/003-extension-permission-gate.md and implement.

Create extensions/permission-gate/index.ts.
ExtensionAPI and references are in docs/references/5-pi-dev-doc.md (section 6: Extensions).
```

### Agent D — post-edit-lint

```
Read .scratch/pi-dev-starter-kit/004-extension-post-edit-lint.md and implement.

Create extensions/post-edit-lint/index.ts.
```

### Agent E — loop-protection

```
Read .scratch/pi-dev-starter-kit/005-extension-loop-protection.md and implement.

Create extensions/loop-protection/index.ts.
```

### Agent F — task-tracker

```
Read .scratch/pi-dev-starter-kit/006-extension-task-tracker.md and implement.

Create extensions/task-tracker/index.ts.
```

### Agent G — contrib-gate

```
Read .scratch/pi-dev-starter-kit/015-extension-contrib-gate.md and implement.

Create extensions/contrib-gate/index.ts.
Before implementing, review the original repo: https://github.com/nandal/pi-ext/tree/main/contrib-gate
```

### Agent H — auto-memory

```
Read .scratch/pi-dev-starter-kit/016-extension-auto-memory.md and implement.

Create extensions/auto-memory/index.ts.
Before implementing, review the original repo: https://github.com/samfoy/pi-memory
```

> **Run Agents C, D, E, F, G, H in parallel.** They all depend only on the package scaffold (#001).

---

## Step 5: Phase 3 — Kit skills + templates (2 agents in parallel, AFK)

### Agent I — plan-mode + self-verify skills

```
Read .scratch/pi-dev-starter-kit/009-skills-plan-verify.md and implement.

Create:
- skills/planning/plan-mode/SKILL.md
- skills/quality/self-verify/SKILL.md

plan-mode depends on the task-tracker extension (#006) to register TODOs.
```

### Agent J — Templates + prompt templates

```
Read .scratch/pi-dev-starter-kit/012-project-templates.md and implement.

Create:
- templates/AGENTS.template.md (~100 lines, index-style)
- templates/CONTEXT.template.md (domain glossary)
- templates/settings.template.json (all feature flags)
- templates/INDEX.template.md
- templates/ADR.template.md
- prompts/plan.md, verify.md, review.md, handoff.md
```

> **Run Agents I and J in parallel.** Agent I depends on #006 (task-tracker). Agent J depends only on #001.

---

## Step 6: Phase 4 — Advanced extensions + capability skills (4 agents in parallel, AFK)

### Agent K — lsp-bridge

```
Read .scratch/pi-dev-starter-kit/007-extension-lsp-bridge.md and implement.

Create extensions/lsp-bridge/index.ts.
Depends on #003 (permission-gate) because type-check runs after approved edit.
```

### Agent L — monitor-bash

```
Read .scratch/pi-dev-starter-kit/008-extension-monitor-bash.md and implement.

Create extensions/monitor-bash/index.ts.
Depends on #003 (permission-gate) because Monitor runs bash and must go through the pipeline.
```

### Agent M — Capability skills

```
Read .scratch/pi-dev-starter-kit/010-skills-capabilities.md and implement.

Create:
- skills/research/web-research/SKILL.md
- skills/research/browser-testing/SKILL.md
- skills/research/subagent-delegation/SKILL.md
- skills/research/mcp-orchestration/SKILL.md

These skills activate tools from external packages (pi-web-access, pi-subagents, etc.).
Dependencies (#002) need to be accessible, but the skills can be written
before installation — they just won't be testable until then.
```

### Agent N — ai-memory integration (plan)

```
Read docs/ai-memory-integration-plan.md and implement the ai-memory integration.

Do not fork/copy the project. Use upstream ai-memory as an external service via MCP + hooks.
The kit integration should document setup, routing, healthcheck, and coexistence with auto-memory.
Reference: https://github.com/akitaonrails/ai-memory
```

> **Run Agents K, L, M, N in parallel.**

---

## Step 7: Phase 5 — README, smoke test, publication (agent + human)

### Agent O — README + cross-model test

```
Read .scratch/pi-dev-starter-kit/013-readme-smoke-test.md and implement.

Create complete README.md. Run smoke test on 3 models.
```

### Human — Publication (HITL)

```
Read .scratch/pi-dev-starter-kit/014-publication-release.md.

Human checklist:
- Clean-room install test
- Git tag v1.0.0
- GitHub release
```

---

## Parallelism Summary

```
PHASE 1:  ████████████████ Agent A (scaffold)  ████ Agent B (mattpocock) ████
PHASE 2:  ████ C (perm-gate) ██ D (lint) ██ E (loop) ██ F (tasks) ██ G (contrib-gate) ██ H (auto-memory) ████
PHASE 3:  ████████████ I (plan+verify) ████ J (templates+prompts) ████
PHASE 4:  ████ K (lsp) ██ L (monitor) ██ M (capabilities) ██ N (ai-memory plan) ████
PHASE 5:  ████████████ Agent O (README+test) ████ Human (release) ████

Total parallel agents per phase:
  Phase 1: 2 agents
  Phase 2: 6 agents
  Phase 3: 2 agents
  Phase 4: 4 agents
  Phase 5: 1 agent + 1 human
```

---

## ⚡ Initial Prompt — Use this to get started

Copy and paste this into the first agent:

```
You are a development agent working on the pi-dev-starter-kit project.

## Project Context

We are building an installable Pi.dev package that transforms the
minimalist Pi.dev harness into a complete, production-ready coding environment —
comparable to Claude Code and Codex, but with full model autonomy.

The kit contains:
- 14 TypeScript extensions (core security/quality, ai-memory setup, init-starter-kit, and Akita-inspired tools: starter-kit-doctor, artifact-read, ast-tools, source-navigation)
- 24 skills (starter-kit workflows, Akita-inspired workflows, ai-memory, and mattpocock/skills)
- 5 prompt templates
- 6 project templates
- Global SYSTEM.md with tool categories, canonical workflow, and Think-in-Code routing
- 5 direct dependencies from the Pi.dev ecosystem

## Your Task

Read the files in the following order:

1. CONTEXT.md — understand the project vocabulary
2. docs/INDEX.md — understand where everything is
3. docs/architecture.md — read the complete specification (it's long, ~400 lines,
   but contains ALL design details: 4 layers, diagrams, comparison
   with Claude Code/Codex, progressive disclosure, permission pipeline)
4. docs/prd.md — read the 31 user stories, modules, and scope

After reading, tell me:

- What are the 4 layers of the kit and what does each contain?
- What are the core extensions and what does each do?
- What is the dependency order between issues in `.scratch/pi-dev-starter-kit/` and `.scratch/ai-harness-akita/`?
- Which issues can run in parallel?

Once I confirm you understand, we'll start implementing from
issue #001 (package scaffold + SYSTEM.md).

IMPORTANT: Don't invent anything. If something is unclear, ask.
All design decisions are documented in the files above.
Use docs/references/5-pi-dev-doc.md as the Pi.dev API reference
when writing extensions.
```

---

## Final Notes

- `repo_init.md` is your guide. When you finish a phase, come back here to see the next one.
- Issues in `.scratch/pi-dev-starter-kit/` contain detailed acceptance criteria.
- `docs/architecture.md` is the canonical design source. In case of doubt, it wins.
- `docs/references/5-pi-dev-doc.md` is the Pi.dev API reference (ExtensionAPI, tools, hooks).
- After each phase is complete, mark the issue as `Status: done` and continue.
- Don't forget to commit after each completed issue (atomic commits, one per issue).
