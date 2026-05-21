# Verify

You have just completed a set of code changes. Before declaring the work done, verify everything.

## Verification checklist

Run these checks in order. Stop and fix issues before continuing.

### 1. Build
```bash
{{buildCommand}}
```
- Does it compile without errors?
- Are there any warnings that should be errors?

### 2. Lint
```bash
{{lintCommand}}
```
- Are there any lint violations?
- Run with `--fix` if auto-fixable.

### 3. Type check
```bash
{{typeCheckCommand}}
```
- Are there any type errors?
- Do NOT suppress with `as any` or `// @ts-ignore`.

### 4. Tests
```bash
{{testCommand}}
```
- Do all existing tests pass?
- Are new tests passing?
- Check edge cases: empty input, null, large inputs, error paths.

### 5. Output vs Spec
- Compare the actual output against the specification (NOT against the code).
- Does the behavior match what was requested?
- Test manually if automated tests don't cover the full spec.

## If anything fails

1. Read the error message carefully
2. Identify the root cause — don't guess
3. Fix the minimum necessary to pass
4. Re-run the failing check
5. Continue through the remaining checks

## When everything passes

Report: what was changed, what tests pass, and any caveats.

## Constraints

- Do NOT skip checks. Run them in order.
- Do NOT modify tests to make them pass unless the spec changed.
- Do NOT add `any` types or lint-disable comments.
- Fresh output only — "it passed earlier in the session" is not evidence.
