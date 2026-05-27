# 017 — Plano: integração ai-memory (Akita)

**Status**: completed
**Type**: AFK

## Parent

PRD: `docs/prd.md`
Plano: `docs/ai-memory-integration-plan.md`
Referência: `docs/references/9-ai-memory.md`

## What to build

Substituir a integração antiga com `agentmemory` por uma integração opcional com [`akitaonrails/ai-memory`](https://github.com/akitaonrails/ai-memory), sem fork/copy. O kit deve usar o serviço upstream via Pi-native lifecycle hooks/comandos e manter `auto-memory` como fallback zero-infra.

## Acceptance criteria

- [x] `skills/ai-memory/SKILL.md` criado com setup, uso das MCP tools e fallback para `auto-memory`.
- [x] `templates/ai-memory.toml.template` criado com exemplos de workspace/project routing.
- [x] `templates/AGENTS.template.md` documenta como instalar routing (`ai-memory install-instructions --target AGENTS.md`) ou aponta para a skill.
- [x] `docs/architecture.md` e `docs/prd.md` não citam `agent-memory` como skill ativa.
- [x] Smoke test documentado para cenário sem servidor e com servidor local.
- [x] `/setup-ai-memory` command criado em `extensions/setup-ai-memory/index.ts`.
- [x] Comandos `/ai-memory-status`, `/ai-memory-upgrade`, `/ai-memory-bootstrap`, `/ai-memory-backup`, `/ai-memory-lint`, `/ai-memory-forget-sweep` criados.
- [x] Tools `memory_query`, `memory_status`, `memory_write_page` criadas para uso direto pelo agente.
- [x] Integração OMP removida; Pi usa hooks nativos da extension.

## Notes

Não adicionar `ai-memory` ao `package.json`. A instalação roda Docker/binário e altera configs globais; deve ser explícita pelo usuário.
