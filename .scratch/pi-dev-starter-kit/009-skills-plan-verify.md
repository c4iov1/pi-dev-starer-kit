# 009 — Skills: plan-mode + self-verify

**Status**: completed
**Type**: AFK

## Parent

PRD: `docs/prd.md`

## What to build

Two skills that form the core quality workflow of the starter kit.

### plan-mode skill

A structured planning skill. When invoked (`/plan-mode` or auto-triggered on complex tasks), the model:
1. Creates `plan.md` in the project root with: problem statement, approach, files to modify, verification strategy
2. Registers checklist items as TODOs via the `task-tracker` extension (#006)
3. Updates task status as work progresses
4. Marks the plan as complete when all TODOs are done

The skill teaches the model to plan BEFORE coding, not to jump straight to implementation.

### self-verify skill

A build→test→fix verification skill following LangChain's pattern (Reference Doc 2). When invoked (`/self-verify` or auto-triggered before the model declares work done):
1. Runs the project's test suite (auto-detected: `npm test`, `pytest`, `cargo test`, `go test`)
2. Reads the FULL test output (not just the summary)
3. Compares behavior against the original specification (NOT against the model's own code)
4. For any failures: analyzes the error, fixes the code, re-runs tests
5. Checks both happy path AND edge cases
6. Only declares "done" when all tests pass

The skill must be aggressive about verification — the Reference Doc 2 finding is that "the most common failure pattern was the agent writing a solution, re-reading its own code, confirming it looked good, and stopping."

## Acceptance criteria

### plan-mode
- [x] `/plan-mode` creates `plan.md` with problem, approach, files, verification
- [x] TODOs are registered via task-tracker
- [x] Task status updates as work progresses
- [x] Skill is auto-suggested by the model for complex multi-step tasks

### self-verify
- [x] `/self-verify` runs the test suite with auto-detected command
- [x] Full test output is read and analyzed
- [x] Model compares against spec, not own code
- [x] Failed tests trigger fix → retest loop (max 3 iterations)
- [x] Both happy path and edge cases are checked
- [x] Skill only declares done when all tests pass

## Blocked by

- #001 (package scaffold must exist)
- #006 (task-tracker — plan-mode depends on TaskCreate/TaskUpdate tools)
