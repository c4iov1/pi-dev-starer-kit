# repo_init.md — Pi.dev Starter Kit

> O que fazer ANTES de começar a desenvolver. Siga os passos em ordem.

---

## Passo 1: Verificar dependências (HITL — humano)

Antes de qualquer código, verifique que os 5 pacotes do ecossistema estão acessíveis:

| # | Repositório original | Categoria |
|---|---|---|
| 1 | `pi-web-access` (nicobailon/pi-web-access) | Web search/fetch |
| 2 | `pi-subagents` (nicobailon/pi-subagents) | Sub-agents |
| 3 | `pi-mcp-adapter` (nicobailon/pi-mcp-adapter) | MCP integration |
| 4 | `pi-agent-browser-native` (fitchmultz/pi-agent-browser-native) | Browser automation |
| 5 | `context-mode` (mksglu/context-mode) | Sandbox tools + session continuity |

Estes pacotes são **dependências diretas** — apontam para os repos originais, sem fork. Três pacotes da arquitetura original foram removidos e serão reimplementados como extensões internas:
- `pi-quick-perms` → absorvido pelo `permission-gate` (issue #003)
- `pi-contrib-gate` → nova extensão `contrib-gate` (issue #015)
- `pi-memory` → nova extensão `auto-memory` (issue #016)

> **Issue**: `.scratch/pi-dev-starter-kit/002-install-verify-dependencies.md`

---

## Passo 2: Ler a especificação (agente)

Antes de codar, o agente precisa entender o que vai construir. Peça para ele ler:

```
Leia os seguintes arquivos em ordem e me explique o que entendeu:

1. CONTEXT.md — glossário do domínio
2. docs/INDEX.md — mapa de conhecimento
3. docs/architecture.md — especificação técnica completa (4 camadas, diagramas, comparação com Claude Code/Codex)
4. docs/prd.md — product requirements (27 user stories, módulos, scope)

Depois me diga: quais são as 4 camadas do kit, quais são as 8 extensions que vamos construir, e qual a ordem de dependência entre elas?
```

---

## Passo 3: Iniciar o desenvolvimento — Fase 1 (agente, AFK)

A primeira fase tem 2 issues independentes que podem rodar em paralelo:

### Agente A — Package scaffold + SYSTEM.md

```
Leia .scratch/pi-dev-starter-kit/001-package-scaffold.md e implemente.

O que construir:
- package.json com manifest Pi.dev (keywords: ["pi-package"], pi: {extensions, skills, prompts})
- SYSTEM.md com 6 tool categories, workflow canônico (Plan→Search→Edit→Test→Lint→Verify→Done), Think-in-Code routing rules, progressive disclosure
- APPEND_SYSTEM.md com instruções de workflow
- Diretórios vazios: extensions/, skills/, prompts/

Referências:
- docs/references/5-pi-dev-doc.md (seção 10: Packages)
- docs/architecture.md (Camada A: Contexto & Documentação)
```

### Agente B — Copiar skills do mattpocock

```
Leia .scratch/pi-dev-starter-kit/011-integrate-mattpocock-skills.md e implemente.

O que fazer:
- Clonar https://github.com/mattpocock/skills
- Copiar 14 skills para skills/ (lista no issue)
- Verificar que cada SKILL.md tem YAML frontmatter correto
- NÃO incluir: migrate-to-shoehorn, scaffold-exercises, git-guardrails-claude-code, request-refactor-plan

Referência:
- docs/references/8-mattpocock-skills.md
```

> **Rode Agente A e Agente B em paralelo.** Eles não têm dependência entre si.

---

## Passo 4: Fase 2 — Extensions core (6 agentes em paralelo, AFK)

Assim que a Fase 1 terminar, dispare estes 6 agentes simultaneamente:

### Agente C — permission-gate

```
Leia .scratch/pi-dev-starter-kit/003-extension-permission-gate.md e implemente.

Criar extensions/permission-gate/index.ts.
A ExtensionAPI e as referências estão em docs/references/5-pi-dev-doc.md (seção 6: Extensions).
```

### Agente D — post-edit-lint

```
Leia .scratch/pi-dev-starter-kit/004-extension-post-edit-lint.md e implemente.

Criar extensions/post-edit-lint/index.ts.
```

### Agente E — loop-protection

```
Leia .scratch/pi-dev-starter-kit/005-extension-loop-protection.md e implemente.

Criar extensions/loop-protection/index.ts.
```

### Agente F — task-tracker

```
Leia .scratch/pi-dev-starter-kit/006-extension-task-tracker.md e implemente.

Criar extensions/task-tracker/index.ts.
```

### Agente G — contrib-gate

```
Leia .scratch/pi-dev-starter-kit/015-extension-contrib-gate.md e implemente.

Criar extensions/contrib-gate/index.ts.
Antes de implementar, revise o repo original: https://github.com/nandal/pi-ext/tree/main/contrib-gate
```

### Agente H — auto-memory

```
Leia .scratch/pi-dev-starter-kit/016-extension-auto-memory.md e implemente.

Criar extensions/auto-memory/index.ts.
Antes de implementar, revise o repo original: https://github.com/samfoy/pi-memory
```

> **Rode Agentes C, D, E, F, G, H em paralelo.** Todos dependem apenas do package scaffold (#001).

---

## Passo 5: Fase 3 — Skills do kit + templates (2 agentes em paralelo, AFK)

### Agente I — plan-mode + self-verify skills

```
Leia .scratch/pi-dev-starter-kit/009-skills-plan-verify.md e implemente.

Criar:
- skills/plan-mode/SKILL.md
- skills/self-verify/SKILL.md

O plan-mode depende da extension task-tracker (#006) para registrar TODOs.
```

### Agente J — Templates + prompt templates

```
Leia .scratch/pi-dev-starter-kit/012-project-templates.md e implemente.

Criar:
- templates/AGENTS.template.md (~100 linhas, index-style)
- templates/CONTEXT.template.md (glossário de domínio)
- templates/settings.template.json (todas as feature flags)
- templates/INDEX.template.md
- templates/ADR.template.md
- prompts/plan.md, verify.md, review.md, handoff.md
```

> **Rode Agentes I e J em paralelo.** Agente I depende de #006 (task-tracker). Agente J depende apenas de #001.

---

## Passo 6: Fase 4 — Extensions avançadas + skills de capacidades (3 agentes em paralelo, AFK)

### Agente K — lsp-bridge

```
Leia .scratch/pi-dev-starter-kit/007-extension-lsp-bridge.md e implemente.

Criar extensions/lsp-bridge/index.ts.
Depende de #003 (permission-gate) porque type-check roda após edit aprovado.
```

### Agente L — monitor-bash

```
Leia .scratch/pi-dev-starter-kit/008-extension-monitor-bash.md e implemente.

Criar extensions/monitor-bash/index.ts.
Depende de #003 (permission-gate) porque Monitor executa bash e deve passar pelo pipeline.
```

### Agente M — Skills de capacidades

```
Leia .scratch/pi-dev-starter-kit/010-skills-capabilities.md e implemente.

Criar:
- skills/web-research/SKILL.md
- skills/browser-testing/SKILL.md
- skills/subagent-delegation/SKILL.md
- skills/mcp-orchestration/SKILL.md

Estas skills ativam tools de pacotes externos (pi-web-access, pi-subagents, etc.).
As dependências (#002) precisam estar acessíveis, mas as skills podem ser escritas
antes da instalação — elas só não serão testáveis até lá.
```

### Agente N — Skill agent-memory (agentmemory MCP)

```
Leia .scratch/pi-dev-starter-kit/017-skill-agent-memory.md e implemente.

Criar skills/agent-memory/SKILL.md.
Esta skill ensina o agente a usar o agentmemory (MCP server externo) para
memória persistente estruturada. É opcional — faz fallback para auto-memory (#016).
Referência: https://github.com/rohitg00/agentmemory
```

> **Rode Agentes K, L, M, N em paralelo.**

---

## Passo 7: Fase 5 — README, smoke test, publicação (agente + humano)

### Agente O — README + cross-model test

```
Leia .scratch/pi-dev-starter-kit/013-readme-smoke-test.md e implemente.

Criar README.md completo. Rodar smoke test em 3 modelos.
```

### Humano — Publicação (HITL)

```
Leia .scratch/pi-dev-starter-kit/014-publication-release.md.

Checklist humano:
- Clean-room install test
- Git tag v1.0.0
- GitHub release
```

---

## Resumo de paralelismo

```
FASE 1:  ████████████████ Agente A (scaffold)  ████ Agente B (mattpocock) ████
FASE 2:  ████ C (perm-gate) ██ D (lint) ██ E (loop) ██ F (tasks) ██ G (contrib-gate) ██ H (auto-memory) ████
FASE 3:  ████████████ I (plan+verify) ████ J (templates+prompts) ████
FASE 4:  ████ K (lsp) ██ L (monitor) ██ M (capabilities) ██ N (agent-memory) ████
FASE 5:  ████████████ Agente O (README+test) ████ Humano (release) ████

Total de agentes paralelos por fase:
  Fase 1: 2 agentes
  Fase 2: 6 agentes
  Fase 3: 2 agentes
  Fase 4: 4 agentes
  Fase 5: 1 agente + 1 humano
```

---

## ⚡ Prompt inicial — Use este para começar

Copie e cole isto no primeiro agente:

```
Você é um agente de desenvolvimento trabalhando no projeto pi-dev-starter-kit.

## Contexto do projeto

Estamos construindo um pacote Pi.dev instalável que transforma o harness
minimalista do Pi.dev em um ambiente de codificação produtivo e completo —
comparável ao Claude Code e Codex, mas com autonomia total de modelo.

O kit contém:
- 8 extensions TypeScript (permission-gate, post-edit-lint, loop-protection,
  task-tracker, lsp-bridge, monitor-bash, contrib-gate, auto-memory)
- 20 skills (6 autorais + 14 do mattpocock/skills)
- 4 prompt templates
- 5 project templates
- SYSTEM.md global com tool categories, workflow canônico e Think-in-Code routing
- 5 dependências diretas do ecossistema Pi.dev

## Sua tarefa

Leia os arquivos na seguinte ordem:

1. CONTEXT.md — entenda o vocabulário do projeto
2. docs/INDEX.md — entenda onde está cada coisa
3. docs/architecture.md — leia a especificação completa (é longa, ~400 linhas,
   mas contém TODOS os detalhes de design: 4 camadas, diagramas, comparação
   com Claude Code/Codex, progressive disclosure, permission pipeline)
4. docs/prd.md — leia as 27 user stories, os 12 módulos, e o scope

Depois de ler, me diga:

- Quais são as 4 camadas do kit e o que cada uma contém?
- Quais são as 8 extensions e qual a função de cada uma?
- Qual é a ordem de dependência entre as 17 issues em .scratch/pi-dev-starter-kit/?
- Quais issues podem rodar em paralelo?

Quando eu confirmar que você entendeu, começamos a implementar pela
issue #001 (package scaffold + SYSTEM.md).

IMPORTANTE: Não invente nada. Se algo não estiver claro, pergunte.
Todas as decisões de design estão documentadas nos arquivos acima.
Use docs/references/5-pi-dev-doc.md como referência da API do Pi.dev
quando for escrever extensions.
```

---

## Notas finais

- O `repo_init.md` é seu guia. Quando terminar uma fase, volte aqui para ver a próxima.
- Issues em `.scratch/pi-dev-starter-kit/` contêm os acceptance criteria detalhados.
- `docs/architecture.md` é a fonte canônica de design. Em caso de dúvida, ele vence.
- `docs/references/5-pi-dev-doc.md` é a referência da API do Pi.dev (ExtensionAPI, tools, hooks).
- Após cada fase concluída, marque a issue como `Status: done` e continue.
- Não esqueça de commitar após cada issue concluída (commits atômicos, um por issue).
