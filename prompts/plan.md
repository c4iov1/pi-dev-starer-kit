# Plan Mode

You are in **plan mode**. Do NOT write any code. Do NOT edit any files.

## Your task

{{task}}

## Instructions

1. **Understand the problem**: Read relevant files. Identify what exists and what needs to change.

2. **Identify affected modules**: List every file, function, and interface that will be touched. Use `rg` and `ls` to discover dependencies.

3. **Design the solution**: Describe the approach in prose. Include:
   - Data structures and interfaces
   - Function signatures
   - Module boundaries
   - Error handling strategy
   - Testing approach

4. **Create a checklist**: Break the work into concrete, verifiable steps. Each step should be independently testable.

5. **Estimate complexity**: Mark each step as `[simple]`, `[moderate]`, or `[complex]`.

6. **Identify risks**: What could go wrong? What assumptions are you making?

## Output format

Write your plan to `plan.md` with this structure:

```markdown
# Plan: [Task]

## Problem
[One paragraph]

## Affected Files
- `path/to/file.ts` — [what changes and why]

## Design
[Prose description of the approach]

## Checklist
- [ ] [Step 1] `[complexity]`
- [ ] [Step 2] `[complexity]`

## Risks
- [Risk]: [Mitigation]
```

## Constraints

- Do NOT edit files. This is planning only.
- The plan must be concrete enough that another agent could execute it.
- Prefer small, independently-verifiable steps.
