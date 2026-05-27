# Pi.dev Starter Kit — Arquitetura

> **Status**: Draft para revisão
> **Data**: 2026-05-15
> **Referências**: docs/references/1 a 8

---

## 1. Definição

**Pi.dev Starter Kit** é um pacote de fundamentos — AGENTS.md canônico, SYSTEM.md otimizado por modelo, extensions de segurança e qualidade, skills de workflow, templates de documentação e curadoria de pacotes do ecossistema — que transforma o Pi.dev de um harness minimalista em um ambiente produtivo imediato para qualquer projeto, com autonomia total de escolha de modelo.

**O que é:**
- Uma fundação universal que funciona em qualquer stack, domínio ou produto
- Um conjunto opinado de ferramentas, instruções e guardrails que eliminam a fase de "diagnóstico de gaps"
- Um harness que rivaliza com Claude Code/Codex em capacidade, mas mantém a independência de provider

**O que não é:**
- Um produto selado — você adiciona especialização por projeto
- Um substituto do Claude Code/Codex — é uma alternativa para quem quer autonomia de modelo
- Uma camada que prevê o que você vai construir — fornece fundamentos, não produto

---

## 2. Princípios

1. **Autonomia de modelo**: O harness funciona com qualquer provider (Anthropic, OpenAI, Google, GLM, etc.). Nenhuma otimização é exclusiva de um modelo.

2. **Progressive disclosure**: Ferramentas e instruções carregam sob demanda via Skills. O system prompt contém apenas o essencial — o cache é protegido.

3. **Segurança por padrão**: Permission gates, path confinement e write constraints estão ativos desde o primeiro comando. O modelo opera em modo restrito, escalando permissões explicitamente.

4. **Qualidade é estrutural, não opcional**: Lint pós-edição, self-verification e loop protection não dependem do modelo lembrar — são hooks determinísticos que executam sempre.

5. **Index, não enciclopédia**: AGENTS.md, CONTEXT.md e MEMORY.md funcionam como mapa de referências. O modelo consulta sob demanda, não carrega tudo upfront.

6. **Starter, não straitjacket**: Toda extensão e skill pode ser desabilitada por projeto via `settings.json`. O kit é ponto de partida, não destino final.

7. **Ecosystem-first**: Sempre que possível, usa pacotes existentes do ecossistema Pi.dev em vez de reinventar. A curadoria é parte do valor do kit.

8. **Observabilidade**: Toda tool call, erro e decisão de permissão gera rastro. O agente opera em "glass box" — você sempre sabe o que ele fez e por quê.

---

## 3. Interface do Kit — Componentes

### Modelo de instalação

O starter kit é um **pacote Pi.dev instalável** (Reference Doc 5, seção 10). Um único comando instala tudo globalmente:

```bash
pi install git:github.com/user/pi-dev-starter-kit
```

Após a instalação, **toda sessão do Pi.dev** — em qualquer projeto — carrega:
- Extensions (security gates, lint hooks, loop protection, etc.)
- Skills (plan-mode, self-verify, web-research, etc.)
- Prompt templates (plan, verify, review, handoff)
- SYSTEM.md global (tool categories, workflow canônico)
- Dependências do ecossistema (web search, sub-agents, MCP, etc.)

**Por projeto**, o usuário copia apenas os templates:
- `AGENTS.md` (índice do projeto)
- `CONTEXT.md` (glossário de domínio)
- `.pi/settings.json` (feature flags: o que habilitar/desabilitar)
- `docs/INDEX.md` + `docs/adr/` (documentação)

### Estrutura do pacote

```
pi-dev-starter-kit/                    # Repositório git
├── package.json                       # Manifest Pi.dev package
├── README.md
│
├── SYSTEM.md                          # → ~/.pi/agent/SYSTEM.md (global)
├── APPEND_SYSTEM.md                   # → ~/.pi/agent/APPEND_SYSTEM.md (global)
│
├── extensions/                        # → ~/.pi/agent/extensions/ (global)
│   ├── permission-gate/index.ts       #   PreToolUse hook
│   ├── post-edit-lint/index.ts        #   Lint automático pós-edição
│   ├── loop-protection/index.ts       #   Doom-loop + diminishing returns
│   ├── task-tracker/index.ts          #   Tools TaskCreate/TaskUpdate
│   ├── lsp-bridge/index.ts            #   LSP: type errors pós-edição
│   ├── monitor-bash/index.ts          #   Tool Monitor: background bash
│   ├── contrib-gate/index.ts          #   Git workflow: branches + commits
│   ├── auto-memory/index.ts           #   MEMORY.md persistence leve
│   ├── setup-ai-memory/index.ts       #   Hooks Pi + comandos /ai-memory-* para serviço upstream
│   ├── starter-kit-doctor/index.ts    #   Tool starter_kit_doctor: diagnósticos de ambiente
│   ├── artifact-read/index.ts         #   Tool artifact_read: SQLite, CSV/JSON, archives, dirs
│   ├── ast-tools/index.ts             #   Tools ast_grep/ast_edit: busca e edição estrutural
│   └── source-navigation/index.ts     #   Tools read_ranges/edit_at_anchor
│
├── skills/                            # → ~/.pi/agent/skills/ (global)
│   │
│   │  # Skills do kit (autorais, mantidas no repo)
│   ├── plan-mode/SKILL.md             #   Planejamento estruturado
│   ├── self-verify/SKILL.md           #   Ciclo build→test→fix
│   ├── web-research/SKILL.md          #   Web search + fetch + síntese
│   ├── browser-testing/SKILL.md       #   Automação de browser
│   ├── subagent-delegation/SKILL.md   #   Padrões de delegação
│   ├── mcp-orchestration/SKILL.md     #   Uso de MCP servers
│   ├── ai-memory/SKILL.md             #   Uso do serviço externo ai-memory
│   │
│   │  # Skills integradas (mattpocock/skills — Reference Doc 8)
│   │  # Copiadas do repo original, mantidas in-tree
│   ├── setup-mattpocock-skills/SKILL.md
│   ├── grill-with-docs/SKILL.md
│   ├── grill-me/SKILL.md
│   ├── to-prd/SKILL.md
│   ├── to-issues/SKILL.md
│   ├── tdd/SKILL.md
│   ├── diagnose/SKILL.md
│   ├── triage/SKILL.md
│   ├── improve-codebase-architecture/SKILL.md
│   ├── design-an-interface/SKILL.md
│   ├── zoom-out/SKILL.md
│   ├── qa/SKILL.md
│   ├── handoff/SKILL.md
│   └── write-a-skill/SKILL.md
│
├── prompts/                           # → ~/.pi/agent/prompts/ (global)
│   ├── plan.md
│   ├── verify.md
│   ├── review.md
│   └── handoff.md
│
└── templates/                         # → Copiar manualmente por projeto
    ├── AGENTS.template.md             #   → ./AGENTS.md
    ├── CONTEXT.template.md            #   → ./CONTEXT.md
    ├── INDEX.template.md              #   → ./docs/INDEX.md
    ├── ADR.template.md                #   → ./docs/adr/0001-*.md
    └── settings.template.json         #   → ./.pi/settings.json
```

### Manifest do pacote (package.json)

```json
{
  "name": "pi-dev-starter-kit",
  "version": "1.0.0",
  "description": "Pi.dev harness foundation — security, quality, workflow, and tools for any project",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"]
  },
  "dependencies": {
    "pi-web-access": "git:github.com/nicobailon/pi-web-access",
    "pi-subagents": "git:github.com/nicobailon/pi-subagents",
    "pi-mcp-adapter": "git:github.com/nicobailon/pi-mcp-adapter",
    "pi-agent-browser-native": "git:github.com/fitchmultz/pi-agent-browser-native",
    "context-mode": "git:github.com/mksglu/context-mode"
  },
  "peerDependencies": {
    "@anthropic-ai/claude-code": "*",
    "@anthropic-ai/claude-code-core": "*"
  }
}
```

### Curadoria do ecossistema (dependências diretas)

> **Política de dependências diretas**: As dependências de terceiros são referenciadas diretamente dos repositórios originais — sem forks. Isso simplifica a manutenção (um único repositório) e permite receber melhorias upstream automaticamente. Caso um repo upstream quebre ou seja descontinuado, o fallback é forkar naquele momento.

| Pacote | Autor | Categoria | Função |
|---|---|---|---|
| `pi-web-access` | nicobailon | Web | Busca, fetch, GitHub clone, PDF, YouTube |
| `pi-subagents` | nicobailon | Orquestração | Delegação com chains e paralelo |
| `pi-mcp-adapter` | nicobailon | Integração | MCP servers (database, APIs externas) |
| `pi-agent-browser-native` | fitchmultz | Browser | Automação de browser |
| `context-mode` | mksglu | Contexto | Sandbox tools, FTS5 session continuity, 98% context savings, Think-in-Code paradigm |

**Pacotes removidos como dependências externas (reimplementados como extensões internas):**

| Pacote original | Motivo | Substituído por |
|---|---|---|
| `pi-quick-perms` (cmptr) | Redundante com `permission-gate` — ambos implementam permission pipelines | `extensions/permission-gate/` (absorvido) |
| `pi-contrib-gate` (nandal) | Funcionalidade simples (regex sobre git ops) — não justifica dependência externa | `extensions/contrib-gate/` (reimplementado) |
| `pi-memory` (samfoy) | PRD recomenda approach leve (MEMORY.md index-style) — implementação interna mais adequada | `extensions/auto-memory/` (reimplementado) |

> **Nota sobre context-mode**: Esta é uma dependência de alto impacto que **muda o paradigma de processamento de dados** do agente. Em vez de ler arquivos/dados brutos no contexto, o modelo usa sandbox tools (`ctx_execute`, `ctx_batch_execute`, `ctx_search`) que processam dados em isolated runtimes e retornam apenas resultados. Session continuity via SQLite+FTS5 garante que o agente nunca perde o estado entre compactions. O SYSTEM.md do kit integra as regras de routing do context-mode — não há dois arquivos de instrução competindo.

### Integração opcional: ai-memory (serviço externo)

> **Não é dependência do kit** — é um serviço externo upstream de `akitaonrails/ai-memory` que o usuário instala separadamente. O kit deve apenas documentar setup, routing e fallback. Não fazer fork nem copiar código.

O `ai-memory` substitui a proposta anterior baseada em `agentmemory`. A pesquisa de Akita mostrou que o `agentmemory` tinha boas ideias, mas problemas operacionais estruturais: reindexação BM25 em restart, janela de perda de dados no debounce de persistência, configuração inconsistente, hooks que perdiam tool calls, state store dependente do cwd e arquitetura com múltiplos processos/portas.

O `ai-memory` usa um desenho mais simples e auditável:

- **Rust single binary + Axum** para HTTP/MCP e hooks
- **Markdown em git como source of truth** (`wiki/`)
- **SQLite + FTS5** como índice derivado, com writer único e WAL
- **Hooks fire-and-forget** para captura automática sem bloquear o agente
- **Handoff cross-agent** entre Claude Code, Codex, OpenCode, Cursor, Gemini CLI e Oh My Pi/Pi
- **LLM e embeddings opcionais** — FTS5 funciona sem chaves
- **Isolamento workspace/projeto** via `.ai-memory.toml`

Comparação com `auto-memory` (#016):

| | auto-memory (built-in) | ai-memory (opcional externo) |
|---|---|---|
| Storage | `MEMORY.md` flat file | Markdown wiki em git + SQLite/FTS5 |
| Captura | Manual via `memory_save` | Hooks automáticos de prompt/tool/session |
| Busca | Keyword grep | FTS5 + links/graph + embeddings opcionais |
| Handoff | Manual | SessionStart/SessionEnd cross-agent |
| Infra | Zero | Docker/binário + servidor local |
| Papel no kit | Fallback padrão | Memória avançada opcional |

**Setup Pi recomendado**: rodar `/setup-ai-memory`, que baixa o wrapper upstream, sobe o container (`--platform linux/amd64` quando necessário), instala routing em `AGENTS.md` e usa hooks nativos da extension Pi para postar lifecycle events ao `/hook` do ai-memory. Não usa `~/.omp`. Ver `docs/ai-memory-integration-plan.md` e `docs/references/9-ai-memory.md`.


### Skills integradas do mattpocock/skills

> **Política de confiança**: As skills do [mattpocock/skills](https://github.com/mattpocock/skills) (Reference Doc 8) são mantidas por um arquiteto de confiança e seguem o open standard `SKILL.md` compatível com Pi.dev, Claude Code, Codex e Cursor. **Não precisam de fork** — são incluídas diretamente como dependência ou copiadas para o diretório `skills/` do kit.

As skills formam o **workflow de engenharia** do kit. Ordem canônica de uso (Reference Doc 8, seção 10):

```
1. /grill-with-docs    ← Antes de qualquer decisão de design
2. /grill-me           ← Stress-test de planos (alternativa ao grill-with-docs)
3. /to-prd             ← Sintetiza discussão em PRD
4. /to-issues          ← Quebra PRD em issues (vertical slices)
5. /tdd                ← Implementa slice a slice (RED→GREEN→REFACTOR)
6. /qa                 ← QA conversacional → abre issues
7. /triage             ← Processa issues pela state machine
8. /improve-codebase-architecture ← A cada poucos dias
9. /diagnose           ← Hard bugs e performance regressions
10. /handoff           ← Encerra sessão / passa para outro agente
```

**Skills incluídas no kit:**

| Skill | Categoria | Função | Referência |
|---|---|---|---|
| `setup-matt-pocock-skills` | Setup | Entry point obrigatório. Configura `AGENTS.md` com bloco `## Agent skills`, cria `docs/agents/` (issue-tracker, triage-labels, domain). Rodar uma vez por repo. | Ref 8 §5 |
| `grill-with-docs` | Engineering | Entrevista profunda que desafia planos contra o domain model, afina terminologia, atualiza CONTEXT.md e ADRs inline. **A skill mais poderosa do repo.** | Ref 8 §6.1 |
| `grill-me` | Engineering | Entrevista relentlessly sobre um plano até resolver cada branch da decision tree. Alternativa mais leve ao grill-with-docs. | Ref 8 §6.1 |
| `to-prd` | Engineering | Converte contexto da conversa em PRD. Template: problema, solução, user stories, implementation decisions. **Não entrevista** — sintetiza o que já sabe. | Ref 8 §6.1 |
| `to-issues` | Engineering | Quebra PRD/plano em issues independentes usando vertical slices. Anti-pattern: horizontal slicing. | Ref 8 §6.1 |
| `tdd` | Engineering | Red-green-refactor loop. Bundled resources: deep modules, interface design, mocking, refactoring, testing guidelines. | Ref 8 §6.1 |
| `diagnose` | Engineering | Loop disciplinado: reproduce → minimise → hypothesise → instrument → fix → regression-test. Estratégias avançadas: bisection harness, differential loop. | Ref 8 §6.1 |
| `triage` | Engineering | State machine de issues: needs evaluation → waiting on reporter → ready for AFK agent → ready for human → won't fix. | Ref 8 §6.1 |
| `improve-codebase-architecture` | Engineering | Encontra deepening opportunities informado por CONTEXT.md e ADRs. Resgata codebases que viraram ball of mud. | Ref 8 §6.1 |
| `design-an-interface` | Engineering | Gera múltiplos designs radicalmente diferentes de interface usando parallel sub-agents. "Design it twice." | Ref 8 §6.1 |
| `zoom-out` | Engineering | Perspectiva de alto nível sobre código desconhecido. | Ref 8 §6.1 |
| `qa` | Engineering | QA interativa: usuário reporta bugs, agente explora codebase, abre issues. | Ref 8 §6.1 |
| `handoff` | Productivity | Compacta conversa em handoff document para outro agente continuar. | Ref 8 §6.2 |
| `write-a-skill` | Productivity | Cria novas skills com estrutura adequada, progressive disclosure, bundled resources. | Ref 8 §6.2 |

**Skills NÃO incluídas** (específicas demais ou redundantes com o kit):

| Skill | Motivo da exclusão |
|---|---|
| `migrate-to-shoehorn` | Específica do ecossistema Total TypeScript |
| `scaffold-exercises` | Específica para criação de exercícios educacionais |
| `git-guardrails-claude-code` | Redundante — o kit já tem `permission-gate` extension com as mesmas proteções |
| `request-refactor-plan` | Redundante — coberto por `improve-codebase-architecture` + `to-issues` |

### Integração com o workflow do kit

As skills do mattpocock se encaixam nas camadas do kit:

```
┌─────────────────────────────────────────────────────────┐
│                CAMADA C: WORKFLOW & QUALIDADE            │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ PLANEJAMENTO                                     │   │
│  │ /grill-with-docs  →  /grill-me  →  /to-prd       │   │
│  │ /design-an-interface (quando necessário)         │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ DECOMPOSIÇÃO                                     │   │
│  │ /to-issues  →  issues independentes              │   │
│  │ (vertical slices, NÃO horizontal)                │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ EXECUÇÃO                                         │   │
│  │ /tdd (RED→GREEN→REFACTOR)                       │   │
│  │ + self-verify skill do kit                       │   │
│  │ + post-edit-lint extension do kit                │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ VERIFICAÇÃO & ITERAÇÃO                           │   │
│  │ /qa  →  /triage  →  /diagnose (se bug)          │   │
│  │ /improve-codebase-architecture (periódico)      │   │
│  │ /zoom-out (para contexto de código novo)        │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ENCERRAMENTO                                     │   │
│  │ /handoff  →  documento para próximo agente       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Princípios herdados do mattpocock/skills (Reference Doc 8):**

1. **Feedback loops são fundamentais** (Ref 8 §8): Static types + browser access + automated tests. Sem feedback sobre como o código roda, o agente voa às cegas. O kit implementa isso via `post-edit-lint`, `lsp-bridge`, `self-verify` skill e `browser-testing` skill.

2. **Vertical slices, nunca horizontal** (Ref 8 §6.1 `/to-issues`): Cada issue deve ser um slice completo (UI → lógica → dados → teste), não uma camada horizontal ("todos os testes primeiro").

3. **Deep modules** (Ref 8 §6.1 `/to-prd`): Identificar ativamente oportunidades de extrair módulos que encapsulam muita funcionalidade em uma interface simples e testável.

4. **Gaste esforço desproporcional no sinal de feedback** (Ref 8 §6.1 `/diagnose`): Se você tem um sinal pass/fail rápido, determinístico e agent-runnable para o bug, você vai encontrar a causa. Se não tem, nenhuma quantidade de leitura de código vai salvar.

5. **CONTEXT.md paga dividendos** (Ref 8 §7): "There's a problem with the materialization cascade" vs "There's a problem when a lesson inside a section of a course is made real". A concisão do glossário de domínio se paga a cada sessão.

### Fluxo de adoção

```
# 1. Instalação única (global)
pi install git:github.com/user/pi-dev-starter-kit

# 2. Novo projeto — copiar templates
cp ~/.pi/agent/packages/pi-dev-starter-kit/templates/AGENTS.template.md ./AGENTS.md
cp ~/.pi/agent/packages/pi-dev-starter-kit/templates/CONTEXT.template.md ./CONTEXT.md
cp ~/.pi/agent/packages/pi-dev-starter-kit/templates/settings.template.json ./.pi/settings.json
mkdir -p docs/adr
cp ~/.pi/agent/packages/pi-dev-starter-kit/templates/INDEX.template.md ./docs/INDEX.md

# 3. Editar AGENTS.md com detalhes do projeto
# 4. Ajustar .pi/settings.json (habilitar/desabilitar módulos)
# 5. Pronto. Toda sessão `pi` no projeto herda o kit.
```

### O que é global vs o que é por projeto

```
┌─────────────────────────────────────────────────────────┐
│                    GLOBAL (~/.pi/agent/)                 │
│  Instalado UMA vez. Presente em TODA sessão.            │
│                                                         │
│  SYSTEM.md          ← Tool categories + workflow        │
│  APPEND_SYSTEM.md   ← Instruções adicionais             │
│  extensions/        ← permission-gate, post-edit-lint,  │
│                        loop-protection, task-tracker,   │
│                        lsp-bridge, monitor-bash,        │
│                        contrib-gate, auto-memory,       │
│                        starter-kit-doctor               │
│  skills/            ← plan-mode, self-verify,           │
│                        web-research, browser-testing,   │
│                        subagent-delegation,             │
│                        mcp-orchestration                │
│  prompts/           ← plan, verify, review, handoff     │
│  packages/          ← Dependências do ecossistema       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               POR PROJETO (./ e ./.pi/)                 │
│  Copiado dos templates. Único por projeto.              │
│                                                         │
│  ./AGENTS.md        ← Índice do projeto, stack,         │
│                        convenções, docs/ pointers       │
│  ./CONTEXT.md       ← Glossário de domínio              │
│  ./.pi/settings.json← Feature flags: o que habilitar    │
│  ./docs/INDEX.md    ← Índice de referências do projeto  │
│  ./docs/adr/        ← Decisões de arquitetura           │
│  ./.pi/extensions/  ← Extensões específicas do projeto  │
│  ./.pi/skills/      ← Skills de domínio/stack           │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Mapa de Capacidades — 4 Camadas

### Camada A: Contexto & Documentação

```
┌─────────────────────────────────────────────────────┐
│                 CONTEXT INJECTION                    │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ SYSTEM.md                                     │  │
│  │ ├─ Tool categories (6 grupos)                 │  │
│  │ ├─ Workflow canônico (Plan→Search→Edit→Test   │  │
│  │ │   →Lint→Verify→Done)                        │  │
│  │ ├─ Think-in-Code routing (context-mode):      │  │
│  │ │   bash/read p/ operações diretas; dados     │  │
│  │ │   grandes → ctx_execute sandbox             │  │
│  │ ├─ Regras de segurança (permission gates)     │  │
│  │ └─ Progressive disclosure (quando usar skills)│  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ Session Continuity (context-mode SQLite+FTS5) │  │
│  │ ├─ Toda edição, git op, task, erro indexado  │  │
│  │ ├─ Após compaction: BM25 search recupera     │  │
│  │ │   só o relevante — sem flooding de estado  │  │
│  │ └─ Resume: ctx_search(sort:"timeline")      │  │
│  │     recupera estado da sessão anterior       │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ AGENTS.md (~100 linhas)                       │  │
│  │ ├─ Índice de diretórios (docs/, src/, tests/) │  │
│  │ ├─ Ponteiros para CONTEXT.md, docs/adr/       │  │
│  │ ├─ Stack detectada + comandos essenciais      │  │
│  │ └─ Regras não-negociáveis (enforced via CI)   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ CONTEXT.md (glossário de domínio)             │  │
│  │ ├─ Termos canônicos do projeto                │  │
│  │ └─ Sem detalhes de implementação              │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ MEMORY.md (auto memory entre sessões)          │  │
│  │ ├─ Notas do agente sobre o projeto            │  │
│  │ └─ Reload pós-compaction                      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Entregáveis:**
- `SYSTEM.md` global — tool categories + workflow canônico + Think-in-Code routing rules (context-mode integrado)
- `APPEND_SYSTEM.md` global — instruções de workflow anexadas ao system prompt
- `mcp.json` — configuração do MCP server do context-mode (`~/.pi/agent/mcp.json`)
- `AGENTS.template.md` — template para copiar ao root do projeto (~100 linhas, index-style)
- `CONTEXT.template.md` — template de glossário de domínio para copiar ao root
- `INDEX.template.md` — template de índice de referências para `docs/INDEX.md`

---

### Camada B: Ferramentas & Segurança

```
┌─────────────────────────────────────────────────────┐
│              TOOLS & SECURITY                        │
│                                                     │
│  Tool Categories (carregadas no system prompt):      │
│                                                     │
│  ┌─ File I/O ──────────────────────────────────┐   │
│  │ read, write, edit (nativas)                  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Search ────────────────────────────────────┐   │
│  │ grep, glob, find, ls (nativas)               │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Execution ─────────────────────────────────┐   │
│  │ bash (nativa), monitor (extension)           │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Web (ativadas via skill web-research) ──────┐   │
│  │ web_search, web_fetch (pi-web-access)        │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Orchestration (ativadas via skills) ────────┐   │
│  │ subagent (pi-subagents), mcp_* (pi-mcp)      │   │
│  │ browser (pi-agent-browser-native)            │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Quality ───────────────────────────────────┐   │
│  │ task_create, task_update (task-tracker ext)  │   │
│  │ lsp_check (lsp-bridge extension)             │   │
│  │ ask_user (rpiv-ask-user-question)            │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Security Gates (sempre ativos):                    │
│  ┌──────────────────────────────────────────────┐   │
│  │ PreToolUse hook                              │   │
│  │ ├─ Bloqueia: rm -rf, git push --force,       │   │
│  │ │   DROP TABLE, sudo, chmod 777              │   │
│  │ ├─ Write constraint: require leitura prévia  │   │
│  │ └─ Path confinement: não escapa do workspace │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Approval Modes:                                    │
│  ┌─ default ──────┐ ┌─ acceptEdits ───┐             │
│  │ diff visível,   │ │ auto-aprova     │             │
│  │ [y/N] por edit  │ │ edits, bash     │             │
│  │                 │ │ ainda gateado   │             │
│  └─────────────────┘ └─────────────────┘             │
└─────────────────────────────────────────────────────┘
```

**Entregáveis (todas globais, carregadas em toda sessão):**
- Extension `permission-gate` — PreToolUse hook, write constraint, path confinement
- Extension `post-edit-lint` — PostToolUse hook: lint pós-edição
- Extension `loop-protection` — doom-loop detection + diminishing returns
- Extension `task-tracker` — tools TaskCreate/TaskUpdate
- Extension `lsp-bridge` — type errors pós-edição via LSP
- Extension `monitor-bash` — background bash com streaming
- Extension `starter-kit-doctor` — diagnósticos de ambiente e capacidades
- Curadoria de 5 pacotes do ecossistema (dependências diretas dos repos originais)
- Extension `contrib-gate` — git workflow: branch naming + conventional commits
- Extension `auto-memory` — MEMORY.md persistence leve entre sessões

---

### Camada C: Workflow & Qualidade

```
┌─────────────────────────────────────────────────────┐
│            WORKFLOW & QUALITY                        │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │           O CICLO COMPLETO                    │   │
│  │                                              │   │
│  │  ┌──────────┐    ┌──────────┐    ┌────────┐  │   │
│  │  │  PLAN    │───▶│  SEARCH  │───▶│  EDIT  │  │   │
│  │  │ plan.md  │    │ grep,    │    │ read   │  │   │
│  │  │ + TODOs  │    │ glob, ls │    │ before │  │   │
│  │  └──────────┘    └──────────┘    │ write  │  │   │
│  │                                  └───┬────┘  │   │
│  │                                      │       │   │
│  │  ┌──────────┐    ┌──────────┐        │       │   │
│  │  │  DONE    │◀───│ VERIFY   │◀───────┘       │   │
│  │  │ output   │    │ test,    │                │   │
│  │  │ final    │    │ lint,    │    ┌────────┐  │   │
│  │  └──────────┘    │ typeck   │◀───│  FIX   │  │   │
│  │                  └──────────┘    └────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Skills de Workflow:                                │
│  ┌──────────────────────────────────────────────┐   │
│  │ plan-mode                                    │   │
│  │ ├─ Cria plan.md com checklist                │   │
│  │ ├─ Registra TODOs via task-tracker           │   │
│  │ └─ Atualiza progresso a cada milestone       │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ self-verify                                  │   │
│  │ ├─ Roda testes após cada change set          │   │
│  │ ├─ Compara output com spec, não com código   │   │
│  │ ├─ Lint + type-check automático              │   │
│  │ └─ Checklist: happy path + edge cases        │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Hooks Determinísticos:                             │
│  ┌──────────────────────────────────────────────┐   │
│  │ PostToolUse (post-edit-lint)                 │   │
│  │ ├─ Após edit/write: roda lint --fix          │   │
│  │ ├─ Injeta erros/warnings no contexto         │   │
│  │ └─ Modelo vê feedback imediato               │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ PostToolUse (lsp-bridge)                     │   │
│  │ ├─ Após edit: type-check incremental         │   │
│  │ └─ Reporta erros de tipo no contexto         │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ session_before_compact (compaction hook)     │   │
│  │ ├─ Preserva AGENTS.md + SYSTEM.md verbatim   │   │
│  │ └─ Re-injeta pós-compaction                  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Loop Protection (sempre ativo):                    │
│  ┌──────────────────────────────────────────────┐   │
│  │ ├─ Doom-loop: N edições no mesmo arquivo     │   │
│  │ │   → "Considere reconsiderar abordagem"     │   │
│  │ ├─ Diminishing returns: 3 iterações <500     │   │
│  │ │   tokens → força parada                    │   │
│  │ └─ Inanição de contexto: >85% usado          │   │
│  │     → sugestão de /compact                   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Entregáveis (todas globais, carregadas em toda sessão):**
- Skills do kit (autorais):
  - `plan-mode` — planejamento estruturado (plan.md → checklist → execute)
  - `self-verify` — ciclo build→test→lint→fix→verify
  - `web-research` — busca web + fetch + síntese de documentação
  - `browser-testing` — automação de browser para testes visuais
  - `subagent-delegation` — quando e como delegar para sub-agents
  - `mcp-orchestration` — uso de MCP servers
  - `ai-memory` — uso do serviço externo ai-memory quando instalado
- Skills integradas (mattpocock/skills — Reference Doc 8):
  - `setup-matt-pocock-skills`, `grill-with-docs`, `grill-me`, `to-prd`, `to-issues`, `tdd`, `diagnose`, `triage`, `improve-codebase-architecture`, `design-an-interface`, `zoom-out`, `qa`, `handoff`, `write-a-skill`
- Prompt templates — `plan.md`, `verify.md`, `review.md`, `handoff.md`
- Hook de compaction — `session_before_compact`: preserva SYSTEM.md verbatim, re-injeta pós-compactação

---

### Camada D: Extensibilidade por Projeto

```
┌─────────────────────────────────────────────────────┐
│          EXTENSIBILIDADE POR PROJETO                 │
│                                                     │
│  .pi/settings.json (feature flags por projeto):     │
│  ┌──────────────────────────────────────────────┐   │
│  │ {                                            │   │
│  │   "starterKit": {                            │   │
│  │     "permissionMode": "default", // ou       │   │
│  │                           // "acceptEdits"   │   │
│  │     "activeExtensions": [                    │   │
│  │       "permission-gate",                     │   │
│  │       "post-edit-lint",                      │   │
│  │       "loop-protection",                     │   │
│  │       "task-tracker",                        │   │
│  │       "lsp-bridge",    // opcional           │   │
│  │       "monitor-bash",  // opcional           │   │
│  │       "contrib-gate",                        │   │
│  │       "auto-memory",                         │   │
│  │       "setup-ai-memory"                      │   │
│  │     ],                                       │   │
│  │     "activeSkills": [                        │   │
│  │       "plan-mode",                           │   │
│  │       "self-verify",                         │   │
│  │       "web-research",                        │   │
│  │       "browser-testing",  // opcional        │   │
│  │       "subagent-delegation",                 │   │
│  │       "mcp-orchestration", // opcional        │   │
│  │       "ai-memory"         // opcional        │   │
│  │     ],                                       │   │
│  │     "webSearch": "cached",                   │   │
│  │     "autoLint": true,                        │   │
│  │     "autoVerify": true                       │   │
│  │   }                                          │   │
│  │ }                                            │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Pontos de extensão por projeto:                    │
│  ┌──────────────────────────────────────────────┐   │
│  │ .pi/extensions/                              │   │
│  │ ├─ stack-detection.ts    # Detecta Node, Py, │   │
│  │ │                          Rust, Go, etc.    │   │
│  │ ├─ custom-tools.ts       # Tools específicas │   │
│  │ └─ project-hooks.ts      # Hooks do projeto  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ .pi/skills/                                  │   │
│  │ ├─ domain-knowledge/     # Skill de domínio  │   │
│  │ ├─ deployment/           # Skill de deploy   │   │
│  │ └─ database-migrations/  # Skill de DB       │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ AGENTS.md (override de projeto)              │   │
│  │ ├─ Stack específica + comandos               │   │
│  │ ├─ Convenções de código                      │   │
│  │ ├─ Estrutura de diretórios                   │   │
│  │ └─ Ponteiros para docs/ locais               │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ docs/adr/  (decisões de arquitetura)         │   │
│  │ docs/INDEX.md  (índice de referências)       │   │
│  │ CONTEXT.md  (glossário de domínio)           │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Entregáveis:**
- `settings.template.json` — feature flags documentadas, para copiar a `.pi/settings.json`
- Templates de arquivos de projeto — `AGENTS.template.md`, `CONTEXT.template.md`, `INDEX.template.md`, `ADR.template.md`
- `AGENTS.md` do projeto — editado com stack, convenções, estrutura de diretórios
- `.pi/extensions/` — ponto de extensão para tools específicas do projeto
- `.pi/skills/` — ponto de extensão para skills de domínio/stack
- Documentação de como estender o kit por projeto (README.md)

---

## 5. Comparação com Claude Code e Codex

### O que vale COPIAR

| Característica | Origem | Como o kit implementa | Justificativa (ref) |
|---|---|---|---|
| **CLAUDE.md hierárquico** (global→projeto→subdir) | Claude Code (Ref 7) | AGENTS.md com index-style, ~100 linhas | Ref 7: "CLAUDE.md sobrevive à compaction" |
| **3 tiers de ativação de tools** | Claude Code (Ref 7) | Skills com tools embutidas + `setActiveTools` dinâmico | Ref 7: "evita overload no system prompt" |
| **Prompt caching** (prefixo estável) | Codex (Ref 6), Claude Code | SYSTEM.md enxuto, skills via progressive disclosure | Ref 6: "cada turno obtém cache hit" |
| **Layered permission pipeline** | Claude Code (Ref 7) | PreToolUse hook com deny→allow→interactive | Ref 7: "98.4% infraestrutura determinística" |
| **Sandbox modes** (workspace-write / danger-full-access) | Codex (Ref 6) | Permission modes: default / acceptEdits | Ref 6: "3 eixos de controle de autonomia" |
| **PostToolUse lint hook** | Cursor (Ref 4) | Extension `post-edit-lint` | Ref 4: "surfacear erros de lint após cada edição" |
| **PreCompletionChecklistMiddleware** | LangChain (Ref 2) | Skill `self-verify` + prompt template `verify.md` | Ref 2: "padrão de falha mais comum: não verificar" |
| **LoopDetectionMiddleware** | LangChain (Ref 2) | Extension `loop-protection` | Ref 2: "doom loops: 10+ edições no mesmo arquivo" |
| **Diminishing returns detection** | Claude Code (Ref 7) | Extension `loop-protection` | Ref 7: "3 iterações <500 tokens → para" |
| **Task/TODO tracking tool** | Codex (`update_plan`), Claude Code (`TaskCreate`) | Extension `task-tracker` | Ref 3: "Working memory como camada separada" |
| **Plan mode** | Claude Code, Cursor | Skill `plan-mode` + prompt template | Ref 7: "mudança de estado no permission system" |
| **AGENTS.md como índice** | Codex (Ref 6) | Template AGENTS.md canônico | Ref 6: "índice, não enciclopédia" |
| **Web search com cache** | Codex (Ref 6) | `pi-web-access`, configurável | Ref 6: "resultados pré-indexados, reduz injection" |
| **MCP support** | Ambos | `pi-mcp-adapter` | Ref 6, Ref 7 |
| **Sub-agents** | Claude Code (`Agent` tool), Codex (`spawn_agent`) | `pi-subagents` | Ref 7: "context windows isolados" |

### O que NÃO vale copiar

| Característica | Origem | Por que NÃO | Alternativa no kit |
|---|---|---|---|
| **Sandbox via Seatbelt/bubblewrap** | Codex (Ref 6) | Depende de OS, complexo, foge do escopo | Rode Pi.dev dentro de container se precisar |
| **Compaction via Responses API** (`encrypted_content`) | Codex (Ref 6) | API proprietária da OpenAI, inalcançável sem o modelo Codex | Compaction nativa do Pi.dev + hook de preservação de instruções |
| **Agent Teams** | Claude Code (Ref 7) | Experimental, complexo, env var gate | `pi-crew` para times coordenados (se necessário) |
| **Auto Memory expansivo** | Claude Code (Ref 7) | Sobrecarrega contexto, risco de alucinação | MEMORY.md enxuto, index-style |
| **Pós-treinamento no tool set** | Codex (GPT-5-Codex), Claude Code | Inalcançável — depende do provider treinar o modelo | SYSTEM.md com tool categories extremamente claras + exemplos |
| **App Server JSON-RPC** | Codex (Ref 6) | Overkill para uso individual, complexidade de manutenção | RPC mode nativo do Pi.dev |
| **Cloud Sandbox** | Codex (Ref 6) | Infraestrutura OpenAI, não reproduzível | Containers locais se necessário |
| **Plugin marketplace** | Claude Code (Ref 7) | Ecossistema Pi.dev já supre via npm/git packages | `pi install` nativo |
| **Managed Agents (API)** | Claude Code (Ref 7) | Serviço gerenciado, não self-hosted | SDK do Pi.dev para embedding |

---

## 6. Como o Modelo Descobre as Ferramentas

### Estratégia de Progressive Disclosure

```
┌─────────────────────────────────────────────────────┐
│          SYSTEM PROMPT (cache estável)               │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ TOOLS DISPONÍVEIS (categorizadas)             │  │
│  │                                               │  │
│  │ File I/O: read, write, edit                   │  │
│  │ Search: grep, glob, find, ls                  │  │
│  │ Execution: bash, monitor                      │  │
│  │ Quality: task_create, task_update,            │  │
│  │          lsp_check, ask_user                  │  │
│  │                                               │  │
│  │ → Aproximadamente 15 tool descriptions        │  │
│  │   enxutas no system prompt                    │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ SKILLS DISPONÍVEIS (progressive disclosure)   │  │
│  │                                               │  │
│  │ /skill:web-research                           │  │
│  │   → Ativa web_search, web_fetch               │  │
│  │                                               │  │
│  │ /skill:browser-testing                        │  │
│  │   → Ativa browser tools                       │  │
│  │                                               │  │
│  │ /skill:subagent-delegation                    │  │
│  │   → Ativa subagent tools                      │  │
│  │                                               │  │
│  │ /skill:mcp-orchestration                      │  │
│  │   → Ativa MCP tools                           │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Fluxo típico de uma tarefa:**

1. Modelo recebe tarefa → consulta SYSTEM.md → identifica skills relevantes
2. Invoca skill (ex: `web-research`) → SKILL.md carrega + tools ativadas
3. Skill termina → tools são desativadas → contexto volta ao estado base
4. Próxima tarefa → repete o ciclo com cache limpo

**Por que isso funciona para múltiplos modelos:**

- Modelos não precisam ser pós-treinados no tool set do Pi.dev
- O system prompt é descritivo e categorizado — qualquer modelo frontier entende
- Skills fornecem instruções detalhadas on-demand, não upfront
- As tool descriptions seguem um padrão consistente (nome, categoria, quando usar, exemplo)

---

## 7. Próximos Passos

### Fase 1: Setup do pacote + verificar dependências (Agentes A, B)

1. Scaffold do pacote, `package.json` + `SYSTEM.md` global (#001)
2. Verificar instalação das 5 dependências diretas (#002)

### Fase 2: Extensions core (Agentes C, D, E, F, G, H)

3. `permission-gate` — PreToolUse hook + write constraint (#003)
4. `post-edit-lint` — lint automático pós-edição (#004)
5. `loop-protection` — doom-loop + diminishing returns detection (#005)
6. `task-tracker` — TaskCreate/TaskUpdate tools (#006)
7. `contrib-gate` — Git workflow (#015)
8. `auto-memory` — MEMORY.md persistence leve (#016)
9. `setup-ai-memory` — hooks Pi-native + comandos opt-in para instalar/configurar/administrar o serviço upstream ai-memory (#017)

### Fase 3: Core Skills & Templates (Agentes I, J)

9. Core skills: `plan-mode` + `self-verify` (#009)
10. Prompt templates + project templates (#012)
11. Integrar as 14 skills do `mattpocock/skills` (#011)

### Fase 4: Extensions avançadas + skills extras (Agentes K, L, M, N)

12. `lsp-bridge` extension (#007)
13. `monitor-bash` extension (#008)
14. Skills extras: `web-research`, `browser-testing`, `subagent-delegation`, `mcp-orchestration` (#010)
15. `ai-memory` skill para uso do serviço externo opcional (#017)

### Fase 5: Documentação & validação (Agente O + Humano)

16. README.md + teste smoke cross-model (#013)
17. Publicação do pacote & Release (#014)

### Instalação final (visão do usuário)

```bash
# 1. Instalar o kit (uma vez, global) — dependências são resolvidas automaticamente
pi install git:github.com/caioo/pi-dev-starter-kit

# 3. Novo projeto — setup inicial
pi
# → Rodar /setup-matt-pocock-skills
# → Copiar templates: AGENTS.md, CONTEXT.md, .pi/settings.json
# → Editar AGENTS.md com detalhes do projeto

# 4. Pronto. Toda sessão herda o kit.
```
