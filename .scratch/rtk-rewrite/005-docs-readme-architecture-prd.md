# 005 — Document RTK rewrite integration

**Status**: done
**Type**: AFK

## Parent

PRD: `docs/prd.md`
Architecture: `docs/architecture.md`
README: `README.md`

## What to build

Update project documentation so RTK rewrite is a first-class starter-kit capability.

The user explicitly requested docs/readme/architecture/prd updates, not only code.

## Files to update

At minimum:

```text
README.md
docs/architecture.md
docs/prd.md
templates/settings.template.json
```

Consider also:

```text
CONTEXT.md
SYSTEM.md
APPEND_SYSTEM.md
```

Only update prompt/system files if needed; avoid bloating system prompt. Prefer README/architecture/PRD for detailed behavior.

## Documentation requirements

Document:

- the context-efficiency problem RTK solves;
- that RTK is an external executable dependency, not vendored by the starter kit;
- RTK must be installed and available in `PATH`;
- starter-kit users do **not** need to run `rtk init --agent pi` for this integration;
- when the starter kit extension is enabled, RTK rewrite is active by default globally across Pi sessions/projects;
- control is via `starterKit.rtkRewrite.enabled`, not by requiring RTK init;
- permission-gate runs first, then RTK rewrite;
- RTK is not a permission/security layer;
- fail-open behavior;
- opt-out env vars:

```bash
RTK_DISABLE_REWRITE=1
RTK_DISABLED=1
```

- commands:

```text
/rtk-status
/rtk-gain
/rtk-toggle
```

- validation/smoke test:

```bash
rtk --version
rtk rewrite "git status"
pi -e ./extensions/rtk-rewrite/index.ts
rtk gain --history
```

## PRD updates

Add a user story similar to:

> As a developer, I want verbose shell commands to be automatically rewritten through RTK before execution, so that repository inspection, git, test, and build output consumes far less model context without changing my workflow.

Update extension/module list to include `rtk-rewrite`.

## Architecture updates

Update:

- package structure diagram;
- Layer A / context-efficiency discussion;
- Layer B tools/security extension list;
- settings examples;
- global-vs-project behavior;
- extension ordering: `permission-gate` before `rtk-rewrite`.

## README updates

Update:

- prerequisites: RTK optional/recommended executable;
- feature index extension table;
- settings section;
- commands section;
- troubleshooting: RTK missing, no rewrites, how to disable.

## Acceptance criteria

- [x] README clearly explains RTK setup and commands.
- [x] Architecture includes `rtk-rewrite` in package structure and extension list.
- [x] PRD includes RTK context-efficiency user story and module entry.
- [x] Docs clearly say `rtk init --agent pi` is not required with this starter-kit extension.
- [x] Docs clearly say permission-gate runs before RTK rewrite.
- [x] Docs include opt-out and permanent disable instructions.

## Blocked by

- #002 Extension: rtk-rewrite.
- #003 RTK commands and doctor integration.
- #004 RTK settings defaults and tests.
