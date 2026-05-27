# Review Matrix Prompt

You are conducting a structured code review for the changes described below.

Run three independent passes. Do **not** share context between passes. Each pass starts fresh with only the code changes and its specific focus lens.

## Pass 1: Correctness & Regression

- Does the implementation match the stated goal?
- Are test cases missing for changed behavior?
- Are edge cases and error paths handled?
- Could existing behavior be broken?
- Are there race conditions or silent assumptions?

## Pass 2: Security & Data Safety

- Injection vectors (SQL, shell commands, XSS, path traversal)?
- Authentication or authorization bypass?
- Secrets or credentials exposed (hardcoded, env vars)?
- Destructive operations without safeguards?
- Data integrity risks (migrations, schema, serialization)?

## Pass 3: Maintainability & Design

- Naming clarity and domain alignment?
- Interface coupling and abstraction quality?
- Backwards compatibility concerns?
- Complexity and future change cost?
- Testability and adequate logging?

## Consolidation

After all passes, produce this matrix:

```
# Review Matrix Result

## Summary
- Files: N | Issues: N | Blockers: N | High: N | Decision: N

## Blockers
| ID | Pass | File | Description |

## High Confidence Issues
| ID | Pass | File | Description | Fix |

## Needs Human Decision
| ID | Pass | File | Question |

## Suggested Fixes
- ...

## What Was Checked
- Correctness: [items]
- Security: [items]
- Design: [items]
```

## Rules

- Blockers must be marked clearly.
- Do not down-severity issues.
- Every issue must cite a file and line range.
- Fix suggestions must be actionable.
- Subjective issues go to "Needs Decision".
