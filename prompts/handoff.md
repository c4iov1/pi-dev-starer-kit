# Handoff

Compress the current conversation into a handoff document for another agent to continue the work.

## What to include

### 1. Current state
- What was being worked on?
- What files were modified?
- What is the current branch and last commit?

### 2. Decisions made
- What architectural or design decisions were made and why?
- What trade-offs were accepted?
- Reference any ADRs created or updated.

### 3. Work remaining
- What tasks are incomplete?
- What is the next concrete step?
- What is blocked and by what?

### 4. Context the next agent needs
- Domain terms and their meanings
- File paths and their purposes
- Any non-obvious patterns or conventions

### 5. Verification status
- What tests pass?
- What tests are pending?
- What was manually verified?

## Output format

Write to `HANDOFF.md`:

```markdown
# Handoff: [Task] — [Date]

## Current State
[Branch, last commit, modified files]

## Decisions
- [Decision]: [Why]

## Remaining Work
- [ ] [Task 1]
- [ ] [Task 2]

## Context
- [Term]: [Definition]

## Verification
- [x] [Check that passed]
- [ ] [Check pending]
```

## Constraints

- Keep it concise — the next agent has limited context.
- Include file paths and commit hashes — no ambiguity.
- Do NOT assume the next agent has read this conversation.
