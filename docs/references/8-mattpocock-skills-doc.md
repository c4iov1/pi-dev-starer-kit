# `mattpocock/skills` — Technical Manual

> **Skills for Real Engineers. Straight from the `.claude` directory.**

---

## 1. What it is

A collection of agent skills (slash commands and behaviors) loaded by Claude Code. Skills are organized into buckets and consumed via per-repo configuration emitted by `/setup-matt-pocock-skills`.

Agent skills are modular capabilities that extend AI coding agents. Each skill packages instructions, metadata (`name` and `description`), and optionally resources (scripts, templates) in a single `SKILL.md` file. The format uses YAML frontmatter + Markdown instructions, following an open standard launched by Anthropic in December 2025.

---

## 2. `SKILL.md` Format — Specification

In `SKILL.md`, the `description` field is the only entry point through which the agent perceives the skill. Strict format requirement: the first sentence must say **what the skill does**; the second must say **when it should trigger**. Use trigger phrases to help the AI auto-load the skill.

The `description` is limited to **1024 characters** — be precise. Vague descriptions (e.g., "help process documentation") don't allow the AI to distinguish this skill from others.

```yaml
---
name: my-skill
description: >
  What it does (1st sentence). Use when the user mentions "X", "Y", or "Z" (2nd sentence).
---
# Body in Markdown with instructions for the agent
```

Each `SKILL.md` is exposed to the agent as a callable tool. The frontmatter says **when to use it**; the body says **how to execute it**.

---

## 3. Directory Structure


```
skills/
├── CLAUDE.md                          # Skill directory specification
├── README.md
├── skills/
│   ├── engineering/
│   │   ├── diagnose/          → SKILL.md
│   │   ├── grill-with-docs/   → SKILL.md
│   │   ├── improve-codebase-architecture/ → SKILL.md
│   │   ├── setup-matt-pocock-skills/ → SKILL.md
│   │   ├── tdd/               → SKILL.md + tests.md + mocking.md
│   │   │                        + refactoring.md + deep-modules.md
│   │   │                        + interface-design.md
│   │   ├── to-issues/         → SKILL.md
│   │   ├── to-prd/            → SKILL.md
│   │   ├── triage/            → SKILL.md
│   │   └── zoom-out/          → SKILL.md
│   ├── productivity/
│   │   ├── handoff/           → SKILL.md
│   │   └── write-a-skill/     → SKILL.md
│   ├── misc/
│   │   ├── git-guardrails-claude-code/ → SKILL.md
│   │   ├── migrate-to-shoehorn/        → SKILL.md
│   │   └── scaffold-exercises/         → SKILL.md
│   └── personal/
│       ├── edit-article/      → SKILL.md
│       └── obsidian-vault/    → SKILL.md
└── docs/
    └── adr/
```


---

## 4. Installation

```bash
npx skills@latest add mattpocock/skills/<skill-name>
```

You can fork the repo, drop it into `~/.claude/skills/`, and have a working set on day one.

`Skills Over MCP` turns any public `SKILL.md` repo into a live MCP server. The `mattpocock/skills` share link page lets a colleague paste the MCP URL into Claude Code, Cursor, or Codex in seconds.

---

## 5. Initial Setup: `/setup-matt-pocock-skills`

**Mandatory entry point before any other engineering skill.**

Sets up a `## Agent skills` block in `AGENTS.md`/`CLAUDE.md` and `docs/agents/` so that engineering skills know: the repo's issue tracker (GitHub or local markdown), triage label vocabulary, and domain doc layout.

**When to run:** before first use of `to-issues`, `to-prd`, `triage`, `diagnose`, `tdd`, `improve-codebase-architecture`, or `zoom-out` — or if these skills are missing context about the issue tracker, triage labels, or domain docs.

### What the setup configures

Three mandatory decisions:
1. **Issue tracker** — where issues live (GitHub by default; local markdown supported out of the box)
2. **Triage labels** — the strings used for the 5 canonical triage roles
3. **Domain docs** — where `CONTEXT.md` and ADRs live, and the consumer rules for reading them

The setup writes a `## Agent skills` block (with three `###` subsections, each with a short summary + pointer) inside `AGENTS.md` (preferred) or `CLAUDE.md`, and seeds three files in `docs/agents/`. The user owns these files from then on — they are human-editable prose.

**Generated files:**
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `docs/agents/domain.md`

Since `AGENTS.md` is in the model's context, references resolve naturally without explicit pointers in the skill text.

No validation or halt-on-missing — if the config isn't there, the model produces fuzzy output, and that's acceptable.

---

## 6. Skills by Category

### 6.1 — `engineering/` (Daily Use)

#### `/grill-me`
Relentlessly interviews about a plan or design until every branch of the decision tree is resolved.

#### `/grill-with-docs`
Grilling session that challenges your plan against the existing domain model, sharpens terminology, and updates `CONTEXT.md` and ADRs inline.

It's the most powerful skill in the repo. Builds a shared language with the AI and documents hard-to-explain decisions in ADRs.

#### `/to-prd`
Converts the current conversation context into a PRD and publishes it to the project issue tracker. Use when the user wants to create a PRD from the current context. The skill takes the conversation context and codebase understanding and produces a PRD. **Does not interview the user** — synthesizes what it already knows.

**Mandatory PRD template:**

- User problem (user perspective)
- Solution (user perspective)
- Long numbered list of user stories in the format `As a <role>, I want <feature>, so that <benefit>`
- List of implementation decisions made
- **Does NOT include** specific file paths or code snippets (go stale quickly)

Uses the project's domain glossary vocabulary in the PRD, respects ADRs in the touched area. Actively identifies opportunities to extract **deep modules** — modules that encapsulate lots of functionality behind a simple, testable interface that rarely changes.

#### `/to-issues`
Breaks any plan, spec, or PRD into independently executable GitHub issues, using vertical slices.

#### `/tdd`
Test-driven development with red-green-refactor loop. Builds features or fixes bugs one vertical slice at a time.

**Critical anti-pattern:** horizontal slicing — finishing all tests first, then all implementation. The correct approach:
- **RED:** write a test describing the first behavior → test fails
- **GREEN:** write minimal code for the test to pass
- **REFACTOR:** refactor (optional)
- Repeat the loop

**Bundled resources in `/tdd`:**
Includes deep modules, interface design, mocking, refactoring, and testing guidelines.

#### `/diagnose`
Disciplined diagnosis loop for hard bugs and performance regressions: `reproduce → minimise → hypothesise → instrument → fix → regression-test`.

**Feedback loop strategies from `/diagnose`:**


- Failing test at a seam that reaches the bug (unit, integration, e2e)
- Curl / HTTP script against a running dev server
- CLI invocation with fixture input, diff stdout against known-good snapshot
- Headless browser script (Playwright/Puppeteer) — UI, DOM/console/network

Advanced strategies:
- **Bisection harness:** if the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" for `git bisect run`
- **Differential loop:** run the same input through old-version vs new-version and diff outputs

If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause. If you don't, no amount of code reading will save you. **Spend disproportionate effort here.**

#### `/triage`
When the triage skill processes a received issue, it moves it through a state machine — `needs evaluation`, `waiting on reporter`, `ready for AFK agent`, `ready for human`, or `won't fix`. To do this, it needs to apply labels (or equivalent) that match the configured strings.

#### `/improve-codebase-architecture`
Finds deepening opportunities in a codebase, informed by the domain language in `CONTEXT.md` and decisions in `docs/adr/`.

The problem: most apps built with agents are complex and hard to change. Because agents radically accelerate coding, they also accelerate software entropy. Codebases become more complex at an unprecedented rate.

`/improve-codebase-architecture` helps rescue a codebase that became a ball of mud. Recommended to run once every few days.

#### `/zoom-out`
Tells the agent to give broader context or a high-level perspective on an unfamiliar section of code.

#### `/qa`
Interactive QA session where the user reports bugs or issues conversationally, and the agent opens GitHub issues. Explores the codebase in the background for context and domain language. Use when the user wants to report bugs, do QA, or file issues conversationally.

#### `/request-refactor-plan`
Creates a detailed refactor plan with tiny commits via user interview and files it as a GitHub issue. Use when the user wants to plan a refactor or break a refactor into safe incremental steps.

#### `/design-an-interface`
Generates multiple radically different interface designs for a module using **parallel sub-agents**. Use when the user wants to explore interface options or mentions "design it twice."

---

### 6.2 — `productivity/`

#### `/handoff`
Compacts the current conversation into a handoff document so another agent can continue the work.

#### `/write-a-skill`
Creates new skills with proper structure, progressive disclosure, and bundled resources.

---

### 6.3 — `misc/` (Rarely Used)

| Skill | Function |
|---|---|
| `/git-guardrails-claude-code` | Configures Claude Code hooks to block dangerous git commands (push, reset --hard, clean, etc.) before execution. |
| `/migrate-to-shoehorn` | Migrates test files from `as` type assertions to `@total-typescript/shoehorn`. |
| `/scaffold-exercises` | Creates exercise directory structures with sections, problems, solutions, and explainers. |

---

## 7. Domain Model: `CONTEXT.md` + ADRs

### The Problem
At the start of a project, devs and domain experts speak different languages. The same problem exists with agents. Agents are typically dropped into a project and told to figure out the jargon as they go. Then they use 20 words where 1 would suffice.

### The Solution
`CONTEXT.md` is a document that helps agents decode the jargon used in the project.

**Concrete example of the impact:**
BEFORE: "There's a problem when a lesson inside a section of a course is made 'real' (i.e. given a spot in the file system)" → AFTER: "There's a problem with the materialization cascade." This conciseness pays dividends session after session.

### Triage State Machine (canonical roles)
**Triage role**: state machine label applied to an Issue during triage (e.g., `needs-triage`, `ready-for-afk`). Each role maps to an actual label string in the Issue tracker via `docs/agents/triage-labels.md`.

---

## 8. Feedback Loops: Core Principle

Without feedback on how the produced code runs, the agent flies blind. The fix: you need the usual set of feedback loops — **static types**, **browser access**, and **automated tests**. For automated tests, a red-green-refactor loop is critical.

---

## 9. Runtime Compatibility

The same `SKILL.md` file works in Claude Code, Cursor, Gemini CLI, Codex CLI, and Antigravity IDE. No vendor lock-in. No proprietary formats. If you migrate from Claude Code to Cursor tomorrow, your skills go with you.

The same `SKILL.md` works in Claude Code, Cursor (via cc-switch), and any harness that reads the open SKILL.md spec. Combines naturally with `obra/superpowers`, `warp`, and `cc-switch` for a complete agent-skills runtime stack.

---

## 10. Recommended Invocation Order (complete workflow)

```
1. /setup-matt-pocock-skills   ← once per repo
2. /grill-me or /grill-with-docs  ← before writing code
3. /to-prd                     ← synthesize plan into PRD
4. /to-issues                  ← break PRD into issues (vertical slices)
5. /tdd                        ← implement slice by slice (RED→GREEN→REFACTOR)
6. /qa                         ← conversational QA → file issues
7. /triage                     ← process issues through state machine
8. /improve-codebase-architecture  ← periodically (every few days)
9. /diagnose                   ← when there are hard bugs
10. /handoff                   ← close session / hand off to another agent
```

---

## 11. Harness Behavior Without Configuration

Engineering skills use vague terminology ("publish to the backlog", "the AFK-ready label", "the domain glossary") instead of referencing GitHub or label strings explicitly. Since `AGENTS.md` is in the model's context, references resolve naturally without explicit pointers in the skill text.

Never overwrites an existing `docs/agents/*.md` without confirmation; the user owns these files. Can fill in missing sections without disturbing existing ones.
