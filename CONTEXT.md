# Context — Pi.dev Starter Kit

## Project Glossary

**Starter Kit**
The installable Pi.dev package that adds security, quality, workflow, and tools
to the base harness. It's not a product — it's a universal foundation. One `pi install`
and every session inherits the kit.

**Extension**
A TypeScript module that extends Pi.dev behavior via `registerTool()`,
`on()` (lifecycle events), `registerCommand()`, etc. The kit's extensions are
built in-house and maintained in this repository.

**Skill**
A `SKILL.md` file (YAML frontmatter + Markdown) loaded on-demand by Pi.dev.
Follows the open Agent Skills standard (agentskills.io). The kit includes in-house skills
and integrated skills from mattpocock/skills.

**Package (Pi.dev)**
A distribution unit in the Pi.dev ecosystem. Contains extensions, skills, prompts,
and themes. Installable via `pi install npm:...` or `pi install git:...`.

**Direct Dependency**
Third-party package referenced directly from the original repository — no fork.
The kit uses 5 direct dependencies from the Pi.dev ecosystem. If an upstream repo
breaks or is discontinued, the fallback is to fork at that point (reactive, not proactive).

**Progressive Disclosure**
Context loading strategy: heavy tools and instructions only enter the system prompt
when the corresponding skill is activated. Keeps the prompt cache lean.

**Permission Pipeline**
Layered flow that processes tool calls: deny rules → allow rules → interactive prompt.
Implemented by the `permission-gate` extension. Two modes: `default` (approve each edit)
and `acceptEdits` (auto-approve edits, gate bash).

**Think-in-Code**
Paradigm enforced by context-mode: instead of reading raw data into context,
the model writes code that processes data in a sandbox and returns only the result.

**Session Continuity**
Context-mode mechanism that indexes every event (edit, git op, task, error, decision)
into SQLite+FTS5. After compaction, the model recovers only relevant state via BM25 search.

**Vertical Slice**
A unit of work that cuts across all layers (schema → logic → UI → test),
delivering a complete, demoable path. Opposite of horizontal slice (doing
all tests first, then all implementation).

**ADR (Architecture Decision Record)**
Architectural decision record. Contains: Status, Context, Options Considered,
Decision, Consequences. Stored in `docs/adr/`.

## Sources of Truth

- `docs/architecture.md` — complete technical specification (4 layers, diagrams, comparison)
- `docs/prd.md` — product requirements (user stories, modules, scope)
- `.scratch/pi-dev-starter-kit/` — issue tracker (17 issues, dependency-ordered)
- `docs/references/` — external references (harness engineering, Pi.dev, mattpocock skills)
