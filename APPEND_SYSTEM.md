# Pi.dev Starter Kit — APPEND_SYSTEM.md

> Workflow instructions appended to the system prompt of every Pi.dev session.
> Complements SYSTEM.md without replacing it. Keep it lean — max 30 lines.

## Mandatory Workflow

1. **Before any edit**: `grep` to locate definitions. `read` to understand context.
2. **During editing**: Make minimal, surgical changes. Prefer `edit` (exact replacement) over `write`.
3. **After each change set**: Run tests + lint. Don't accumulate changes.
4. **Before declaring done**: Clean build, passing tests, zero lint. Evidence, not claims.
5. **When starting a task**: Create a task via `task_create`. Update progress with `task_update`.
6. **When encountering unexpected behavior**: `diagnose` skill — reproduce, minimize, hypothesize, instrument, fix.
7. **For long or complex tasks**: Activate `plan-mode`. Plan before coding.

## Anti-patterns to avoid

- Editing without reading (write constraint)
- Accumulating changes without running tests in between
- Reading entire files when `grep` suffices
- Skipping verification and declaring "done" without evidence
- Using `write` to modify existing files (use `edit`)
- Loading skills "just in case" — activate only when needed
