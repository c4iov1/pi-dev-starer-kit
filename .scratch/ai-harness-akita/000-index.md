# ai-harness-akita — Implementation Task Index

Source plan:
- `docs/akita-harness-ideas-plan.md`
- `docs/akita-harness-ideas-plan.pt-BR.md`

Goal: implement Akita-inspired harness improvements for Pi.dev Starter Kit, with strong agent discoverability so the LLM knows the tools exist and when to use them.

## Task order

1. `001-starter-kit-doctor.md` — environment/capability doctor.
2. `002-agent-discoverability-routing.md` — SYSTEM/settings/skill routing for new tools.
3. `003-artifact-read-phase-1.md` — universal artifact reader phase 1.
4. `004-ast-tools.md` — AST search/edit tools.
5. `005-lsp-symbol-operations.md` — upgrade LSP bridge.
6. `006-source-navigation-anchors.md` — multi-range reads + edit anchors.
7. `007-steering-profiles.md` — steering/interrupt/compaction settings/docs.
8. `008-review-matrix-skill.md` — multi-pass review workflow.
9. `009-provider-guidance.md` — provider/subscription guidance.
10. `010-integration-docs-tests.md` — final integration, docs, tests.

## Global requirements for every implementation task

- Follow `AGENTS.md`, `CONTEXT.md`, and `docs/architecture.md`.
- Security first: any extension touching tools must respect permission pipeline patterns.
- Progressive disclosure: keep `SYSTEM.md` lean; large instructions go into skills.
- Every new tool must be self-describing to the LLM through its registered description/schema.
- Update `templates/settings.template.json` when adding user-facing flags.
- Add or update README/docs whenever user setup changes.
- Run relevant TypeScript checks/tests before marking done.
