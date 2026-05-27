# 010 — Final integration, docs, and tests for ai-harness-akita work

Status: ready-for-agent
Priority: P0 after implementation tasks
Type: integration + QA

## Why

The new capabilities must feel like one coherent starter kit, not scattered tools. This task verifies integration, docs, settings, and agent discoverability.

## Deliverable

Perform final integration after tasks 001–009.

## Checklist

### Package/settings

- `package.json` includes any necessary dependencies.
- `templates/settings.template.json` includes new extensions/skills/profile settings.
- Defaults are safe and not overly verbose.

### SYSTEM/APPEND_SYSTEM

- New routing hints exist but are concise.
- No full manuals in system prompt.
- Skill list includes new skills.

### README/docs

- README feature index includes new extensions/skills.
- README links:
  - `docs/steering-profiles.md`
  - `docs/provider-guidance.md`
  - artifact/AST/LSP docs if created.
- Architecture doc updated if component structure changed.

### Doctor

- Doctor recognizes all new capabilities.
- Doctor warns on missing optional dependencies.
- Doctor reports active profile settings.

### Tests/checks

Run relevant checks, examples:

```bash
npx tsc extensions/starter-kit-doctor/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/artifact-read/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/ast-tools/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/source-navigation/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
npx tsc extensions/lsp-bridge/index.ts --noEmit --module NodeNext --target ESNext --moduleResolution NodeNext --skipLibCheck
```

Adjust commands based on actual files.

## Acceptance criteria

- Fresh agent can read only this task set + repo docs and understand what to implement.
- New tools are discoverable to the LLM through tool descriptions and SYSTEM routing.
- Skills hold detailed workflows; SYSTEM remains lean.
- No unsafe provider/auth guidance.
- TypeScript checks pass or documented blockers exist.
