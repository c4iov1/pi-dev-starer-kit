# 005 — Extension: loop-protection

**Status**: ready-for-agent
**Type**: AFK

## Parent

PRD: `docs/plans/pi-dev-starter-kit-prd.md`

## What to build

A Pi.dev extension that detects and interrupts pathological agent behavior — doom-loops and diminishing returns. Follows patterns from Claude Code (Reference Doc 7 §3.3) and LangChain's `LoopDetectionMiddleware` (Reference Doc 2).

Three detection mechanisms:

1. **Doom-loop detection**: Track edits per file. After N edits (default: 5) to the same file within the same turn, inject a context warning: "You have edited <file> N times. Consider whether your approach is correct or if you need to reconsider your plan."

2. **Diminishing returns**: Track token output per iteration. After 3 consecutive iterations each producing <500 tokens, force-stop the turn with a message suggesting the user provide more direction.

3. **Context starvation warning**: When context usage exceeds 85%, inject a warning suggesting `/compact`.

The extension must:
- Track state within a session (reset on new turn or new session)
- Be configurable via `.pi/settings.json` (thresholds for each mechanism)
- Not interfere with legitimate multi-edit workflows (e.g., editing 3 files is fine; editing the same file 10 times is not)

## Acceptance criteria

- [ ] Editing the same file 5+ times within one turn triggers the doom-loop warning
- [ ] 3 consecutive iterations with <500 tokens each force-stops the turn
- [ ] Context >85% triggers compaction suggestion
- [ ] Legitimate multi-file edits (same file 2-3 times) do NOT trigger
- [ ] Thresholds are configurable via `.pi/settings.json`

## Blocked by

- #001 (package scaffold must exist)
