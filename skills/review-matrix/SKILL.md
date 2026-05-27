---
name: review-matrix
description: Run independent multi-pass code review for important changes. Three passes — correctness, security, maintainability — with consolidated findings and fix recommendations.
---

# Review Matrix Skill

## Philosophy

**Core Principle**: One review pass finds some problems. Three independent passes, each with a different lens, find more. Never trust a single LLM review for important changes.

This skill is inspired by Akita's observation that different harnesses and models catch different issues. The correct response isn't "pick the best one" — it's "run multiple independent reviews and consolidate the findings."

## When to Activate

Activate this skill when:
- Reviewing a PR or changeset that affects production code.
- The change involves security-sensitive logic (auth, payment, data access).
- A migration or schema change is involved.
- The user asks for "code review", "audit", or "multiple perspectives".
- Before merging a large or high-revision-count branch.

## Workflow

### 1. Identify scope
Determine what to review:
- `git diff main...feature-branch` for branch reviews.
- Specific file paths for targeted reviews.
- The complete changeset as determined by the user.

### 2. Run three independent passes

Each pass examines the **same changeset** through a different lens. Do not share context between passes — each pass must start fresh.

#### Pass 1: Correctness & Regression
**Focus**: Does this change behave as intended?
- Does the implementation match the spec/stated goal?
- Are there missing test cases for the changed behavior?
- Are edge cases and error paths covered?
- Could this change break existing behavior?
- Are there silent assumptions or race conditions?

#### Pass 2: Security & Data Safety
**Focus**: Could this change cause harm?
- Injection vectors (SQL, command, XSS, path traversal).
- Authentication/authorization bypass.
- Secret or credential exposure (env vars, hardcoded keys).
- Destructive operations without safeguards (DROP, DELETE, rm -rf).
- Data integrity: migrations, schema changes, serialization.
- Rate limiting, resource exhaustion, unbounded operations.

#### Pass 3: Maintainability & Design
**Focus**: Is this change built to last?
- Naming clarity and domain alignment.
- Interface design and coupling.
- Backwards compatibility.
- Complexity and future change cost.
- Testability and logging.

### 3. Consolidate findings

Synthesize findings from all three passes into a structured matrix:

```md
# Review Matrix Result

## Summary
- Files reviewed: N
- Total issues: N
- Blockers: N
- High confidence: N
- Needs decision: N

## Blockers (must fix before merge)
| ID | Pass | File | Description |
|---|---|---|---|

## High Confidence Issues
| ID | Pass | File | Description | Fix suggestion |
|---|---|---|---|---|

## Needs Human Decision
| ID | Pass | File | Question |
|---|---|---|---|

## Suggested Fixes
- ...

## What Was Checked
- Correctness: [checklist]
- Security: [checklist]
- Design: [checklist]
```

### 4. Present and iterate

- Show the matrix to the user.
- For blockers: propose fix and apply after user approval.
- For "needs decision": ask the user and document the answer.
- For high-confidence issues: propose fixes and ask if user wants them applied.

## Subagent Delegation

For large changesets (>10 files or >500 lines), delegate passes to sub-agents:

- **Pass 1 (correctness)**: Sub-agent with test-focused prompt.
- **Pass 2 (security)**: Sub-agent with security-gate prompt.
- **Pass 3 (design)**: Sub-agent with maintainability prompt.

For small changesets, run passes sequentially in the main agent. Sub-agent overhead isn't justified for <10 files.

Each sub-agent gets:
- The full diff or file list.
- Its specific pass focus.
- Instructions to return findings in the matrix format.

The main agent consolidates with:
- Deduplication (same issue found by multiple passes).
- Severity normalization.
- Blocker identification.

## Output Guidelines

- **Blockers** are issues that could cause crashes, data loss, or security breaches. Mark clearly.
- **High confidence** are patterns with clear evidence. Provide fix suggestions.
- **Needs decision** are subjective or trade-off questions. Phrase as clear yes/no questions.
- Never down-severity an issue to avoid additional work. The user decides priority.
