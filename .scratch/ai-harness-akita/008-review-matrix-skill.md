# 008 — Implement `review-matrix` skill and prompt

Status: ready-for-agent
Priority: P2
Type: skill + prompt

## Why

Akita’s PR review experiment showed each harness/model caught different issues. The lesson: important reviews need independent passes, not trust in one LLM pass.

## Deliverable

Create:

- `skills/review-matrix/SKILL.md`
- `prompts/review-matrix.md`

Update `SYSTEM.md` skill list and `templates/settings.template.json` optional skills.

## Skill trigger

Use when:

- User asks for code review/audit.
- A PR is important or risky.
- Security/data loss/regression risk exists.
- User asks for “multiple perspectives” or “independent review passes”.

## Workflow

The skill must run three independent passes:

1. **Correctness/regression pass**
   - Does behavior match spec?
   - Are tests missing?
   - Are edge cases broken?

2. **Security/data-loss pass**
   - Injection, auth, secret exposure.
   - Destructive operations.
   - Migration/data integrity risks.

3. **Maintainability/API/design pass**
   - Coupling, unclear interfaces, naming.
   - Backwards compatibility.
   - Complexity and future change cost.

Then consolidate:

```md
# Review Matrix Result

## Blockers
...

## High confidence issues
...

## Needs human decision
...

## Suggested fixes
...

## What was checked
...
```

## Subagent behavior

- If subagents are available and task is large, delegate passes independently.
- If not, run sequentially in the main agent.
- Do not force subagents for small cohesive changes.

## Acceptance criteria

- Skill can be loaded independently.
- Prompt exists and matches skill workflow.
- SYSTEM includes one-line trigger only.
- No giant review manual in SYSTEM.
