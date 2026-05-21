---
name: plan-mode
description: Structured planning workflow to design solutions and register tracking tasks via task-tracker before modifying files. Use for complex, multi-step, or ambiguous tasks.
---

# Plan Mode Skill

## Philosophy

**Core Principle**: Plan first, implement second. Writing code without a structured plan leads to regression, wasted token window capacity, and messy architectural designs.

By designing the technical approach and defining the checklist upfront, you can validate assumptions with the user before executing destructive tool calls.

---

## Workflow

### 1. Identify Complexity & Trigger
You should auto-suggest or trigger this skill whenever:
- The task requires changes across more than 2 files.
- The request introduces new architecture, dependencies, or extensions.
- The user request is ambiguous or high-level (e.g. "Integrate X feature").

### 2. Create `plan.md`
Create a `plan.md` file at the root of the project. The plan must follow this template structure:

```markdown
# Plan: [Brief Goal Description]

## Problem Statement
Provide a detailed description of the problem, requirements, constraints, and background context.

## Technical Approach
Explain the structural changes, logic flow, and architectural decisions.

## Proposed Changes
List the files to be modified, created, or deleted using absolute markdown file links:
- [NEW] [basename](file:///absolute/path/to/new_file)
- [MODIFY] [basename](file:///absolute/path/to/modified_file)
- [DELETE] [basename](file:///absolute/path/to/deleted_file)

## Verification Strategy
- Automated tests (exact commands to run)
- Manual verification steps (behavior checks)
```

### 3. Register Tasks via `task-tracker`
Once `plan.md` is approved or established, break the implementation checklist into technical components and register each one as a task using the `TaskCreate` tool:
- **Title**: Short and descriptive (max 120 chars), e.g., "Implement extension scaffolding" or "Write integration tests".
- **Description**: Technical approach for this specific step.
- **Status**: Set to `pending` (default) or `in_progress` if you are starting immediately.

### 4. Incremental Progress Loop
As you execute:
- Update the active task status to `in_progress` using `TaskUpdate`.
- Mark corresponding checkboxes in the `plan.md` file (e.g. `[ ]` -> `[x]`).
- Write code iteratively (one task/file at a time).
- When a task is complete, use `TaskUpdate` to change status to `done` and add progress notes. If you are stuck or need user input, set status to `blocked` with a clear explanation in `notes`.

### 5. Completion
Once all tasks are marked as `done` and verified, final check-offs are applied to `plan.md`, and the user is informed.

---

## Guidelines for Writing Plans

- **Be Specific**: Do not write vague approaches like "fix the logic". Specify exact modules, functions, or event hooks.
- **Keep it Updated**: If requirements drift during implementation, update the `plan.md` file and modify/create tasks accordingly before continuing.
- **Trace slices**: Focus on vertical slices (tracer bullets) that can be verified immediately, rather than building all structure first.
