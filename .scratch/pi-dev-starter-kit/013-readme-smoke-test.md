# 013 — README + cross-model smoke test

**Status**: completed
**Completed At**: 2026-05-21T03:09:30-03:00
**Type**: AFK

## Parent

PRD: `docs/prd.md`

## What to build

### README.md

Comprehensive installation and usage guide for the starter kit. Must cover:

1. **What this is**: 2-sentence description with comparison to Claude Code/Codex
2. **Prerequisites**: Pi.dev installed, git, Node.js
3. **Dependencies**: List of 5 direct dependencies with links to original repos
4. **Installation**: `pi install git:github.com/caioo/pi-dev-starter-kit`
5. **New project setup**:
   - Run `/init-starter-kit`
   - Run `/setup-matt-pocock-skills`
   - Edit AGENTS.md with project details
   - Adjust `.pi/settings.json` feature flags
6. **What you get**: Table of extensions, skills, prompts, and tools
7. **Permission modes**: `default` vs `acceptEdits` with examples
8. **Extending per project**: `.pi/extensions/`, `.pi/skills/`
9. **Troubleshooting**: common issues and solutions
10. **Architecture overview**: pointer to the architecture doc

### Cross-model smoke test

Run the same task on at least 3 different models to verify the harness performs consistently regardless of provider. This validates the kit's core promise: model autonomy.

Test task (choose one that exercises multiple kit features):
1. "Create a simple REST API with Express that has one endpoint GET /health returning { status: 'ok', uptime: <seconds> }. Write tests, verify they pass, and document the endpoint."
2. Or equivalent task in Python/FastAPI, Rust/Actix, Go/chi

Models to test:
- Claude Opus 4.x (Anthropic)
- GPT-5.x (OpenAI)
- At least one more: GLM-5, Gemini, or Groq

For each model run, verify:
- [x] Permission gate blocks destructive commands if attempted
- [x] Post-edit lint runs and reports results
- [x] Task tracker creates and updates tasks
- [x] Self-verify runs tests and reports pass/fail
- [x] Plan-mode creates plan.md before coding
- [x] Web research can search for documentation (if needed)
- [x] Output quality is comparable across models (tests pass, code is clean)

## Acceptance criteria

### README
- [x] README.md is complete with all 10 sections
- [x] Installation instructions work when followed step-by-step
- [x] Feature flag documentation is accurate
- [x] Troubleshooting section covers common failures

### Cross-model test
- [x] Same task completes successfully on Claude Opus
- [x] Same task completes successfully on GPT-5
- [x] Same task completes successfully on at least one additional model
- [x] All 7 verification points pass for each model
- [x] Test results documented in `docs/cross-model-results.md`

## Blocked by

- #001–#012 (all previous slices must be complete)
