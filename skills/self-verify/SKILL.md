---
name: self-verify
description: Build-test-fix quality workflow. Use before declaring tasks done to auto-detect and run test suites, inspect full logs, and iteratively resolve issues.
---

# Self-Verify Skill

## Philosophy

**Core Principle**: Never verify success solely by reading your own code. The most common agent failure pattern is writing a solution, re-reading the modified code, confirming it "looks good," and stopping without executing tests.

Verification must be **specification-driven**, not code-driven. Code changes can introduce unexpected regressions or syntax errors that only executing compilation, builds, and test runner suites can surface.

---

## Workflow

### 1. Auto-Detect Test Commands
Analyze the workspace files to identify the appropriate testing framework and commands:
- **Node.js (JavaScript/TypeScript)**: Check for `package.json`. Use `npm test`, `npm run test`, `npx vitest run`, or `npx jest`.
- **Python**: Check for `requirements.txt`, `pyproject.toml`, or `setup.py`. Use `pytest` or `python -m unittest`.
- **Go**: Check for `go.mod`. Use `go test ./...`.
- **Rust**: Check for `Cargo.toml`. Use `cargo test`.
- **Custom scripts**: Check the verification strategy in `plan.md` if available.

### 2. Execute & Inspect Full Output
Run the test suite. When parsing results:
- **Do not read summaries only**: Review the complete stdout and stderr.
- **Inspect failures**: Analyze the exact stack traces, line references, and assertion messages.
- **Compile/build errors**: If compiler checks fail (e.g., TS transpilation or Rust cargo build), treat them as test failures.

### 3. Iterative Correction Loop (Max 3 cycles)
If any checks or tests fail:
- **Step A: Root Cause Analysis**: Contrast the failure against the original spec or `plan.md` goals, rather than assuming your implementation is correct.
- **Step B: Apply Fix**: Edit the code to resolve the defect.
- **Step C: Retest**: Run the test suite again.
- **Threshold**: You are allowed a maximum of **3 fail-fix-retest iterations**. If tests are still failing after the 3rd run, stop tool executions, output the detailed logs, and ask the human user for guidance.

### 4. Happy Path + Edge Cases Checklist
Before declaring the turn or task done, ensure you check:
- [ ] **Happy Path**: The primary usage scenario works as intended.
- [ ] **Edge Cases**: Empty bounds, negative limits, null variables, or invalid formats are gracefully handled.
- [ ] **Error Paths**: Exceptions are caught and proper messages or error statuses are returned.

---

## Escalation Guidelines

When escalating to the user after 3 failed loops:
- Detail what was changed.
- Provide the exact test command executed.
- Provide the full output of the failing assertion/error trace.
- State your hypotheses on why it is failing and what choices need human guidance.
