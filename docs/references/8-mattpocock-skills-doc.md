
# `mattpocock/skills` — Manual Técnico

> **Skills for Real Engineers. Straight from the `.claude` directory.**

---

## 1. O que é

Uma coleção de agent skills (slash commands e behaviors) carregados pelo Claude Code. As skills são organizadas em buckets e consumidas por configuração per-repo emitida pelo `/setup-matt-pocock-skills`.

Agent skills são capacidades modulares que estendem AI coding agents. Cada skill empacota instruções, metadados (`name` e `description`), e opcionalmente recursos (scripts, templates) em um único arquivo `SKILL.md`. O formato usa YAML frontmatter + Markdown instructions, seguindo um open standard lançado pela Anthropic em dezembro de 2025.

---

## 2. Formato `SKILL.md` — Especificação

Em `SKILL.md`, o campo `description` é o único entry point pelo qual o agente percebe a skill. Requisito estrito de formato: a primeira frase deve dizer **o que a skill faz**; a segunda deve dizer **quando ela deve disparar**. Use trigger phrases para ajudar o AI a auto-carregar a skill.

A `description` é limitada a **1024 caracteres** — seja preciso. Descriptions vagas (ex: "help process documentation") não permitem ao AI distinguir essa skill de outras.

```yaml
---
name: my-skill
description: >
  O que faz (1ª frase). Use quando o usuário mencionar "X", "Y", ou "Z" (2ª frase).
---
# Corpo em Markdown com instruções para o agente
```

Cada `SKILL.md` é exposto ao agente como uma callable tool. O frontmatter diz **quando usar**; o corpo diz **como executar**.

---

## 3. Estrutura de Diretórios


```
skills/
├── CLAUDE.md                          # Skill directory specification
├── README.md
├── skills/
│   ├── engineering/
│   │   ├── diagnose/          → SKILL.md
│   │   ├── grill-with-docs/   → SKILL.md
│   │   ├── improve-codebase-architecture/ → SKILL.md
│   │   ├── setup-matt-pocock-skills/ → SKILL.md
│   │   ├── tdd/               → SKILL.md + tests.md + mocking.md
│   │   │                        + refactoring.md + deep-modules.md
│   │   │                        + interface-design.md
│   │   ├── to-issues/         → SKILL.md
│   │   ├── to-prd/            → SKILL.md
│   │   ├── triage/            → SKILL.md
│   │   └── zoom-out/          → SKILL.md
│   ├── productivity/
│   │   ├── handoff/           → SKILL.md
│   │   └── write-a-skill/     → SKILL.md
│   ├── misc/
│   │   ├── git-guardrails-claude-code/ → SKILL.md
│   │   ├── migrate-to-shoehorn/        → SKILL.md
│   │   └── scaffold-exercises/         → SKILL.md
│   └── personal/
│       ├── edit-article/      → SKILL.md
│       └── obsidian-vault/    → SKILL.md
└── docs/
    └── adr/
```


---

## 4. Instalação

```bash
npx skills@latest add mattpocock/skills/<nome-da-skill>
```

Você pode fazer fork do repo, soltar em `~/.claude/skills/`, e ter um working set no dia um.

O `Skills Over MCP` transforma qualquer repo público de `SKILL.md` em um live MCP server. A página de share link do `mattpocock/skills` permite que um colega cole a MCP URL no Claude Code, Cursor ou Codex em segundos.

---

## 5. Configuração Inicial: `/setup-matt-pocock-skills`

**Entry point obrigatório antes de qualquer outra engineering skill.**

Seta um bloco `## Agent skills` em `AGENTS.md`/`CLAUDE.md` e `docs/agents/` para que as engineering skills conheçam: issue tracker do repo (GitHub ou local markdown), vocabulário de triage labels, e domain doc layout.

**Quando rodar:** antes do primeiro uso de `to-issues`, `to-prd`, `triage`, `diagnose`, `tdd`, `improve-codebase-architecture`, ou `zoom-out` — ou se essas skills estiverem com contexto faltando sobre issue tracker, triage labels ou domain docs.

### O que o setup configura

Três decisões obrigatórias:
1. **Issue tracker** — onde as issues vivem (GitHub por default; local markdown suportado out of the box)
2. **Triage labels** — as strings usadas para os 5 papéis canônicos de triage
3. **Domain docs** — onde `CONTEXT.md` e ADRs vivem, e as consumer rules para lê-los

O setup escreve um bloco `## Agent skills` (com três sub-seções `###`, cada uma com um curto resumo + pointer) dentro de `AGENTS.md` (preferido) ou `CLAUDE.md`, e seed três arquivos em `docs/agents/`. O usuário é o dono desses arquivos a partir daí — são prosa human-editable.

**Arquivos gerados:**
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `docs/agents/domain.md`

Como `AGENTS.md` está no contexto do modelo, as referências resolvem naturalmente sem pointers explícitos no texto das skills.

Sem validação ou halt-on-missing — se a config não estiver lá, o modelo produz output fuzzy, e isso é aceitável.

---

## 6. Skills por Categoria

### 6.1 — `engineering/` (Daily Use)

#### `/grill-me`
Entrevista relentlessly sobre um plano ou design até que todo branch da decision tree esteja resolvido.

#### `/grill-with-docs`
Grilling session que desafia seu plano contra o domain model existente, afina a terminologia, e atualiza `CONTEXT.md` e ADRs inline.

É a skill mais poderosa do repo. Constrói uma shared language com o AI e documenta decisões difíceis de explicar em ADRs.

#### `/to-prd`
Transforma o contexto da conversa atual em um PRD e publica no project issue tracker. Use quando o usuário quer criar um PRD do contexto atual. A skill toma o contexto da conversa e o entendimento da codebase e produz um PRD. **Não entrevista o usuário** — sintetiza o que já sabe.

**Template obrigatório do PRD:**

- Problema do usuário (perspectiva do usuário)
- Solução (perspectiva do usuário)
- Lista longa e numerada de user stories no formato `As a <role>, I want <feature>, so that <benefit>`
- Lista de implementation decisions tomadas
- **NÃO inclui** file paths específicos ou code snippets (ficam desatualizados rapidamente)

Usa o vocabulário do domain glossary do projeto no PRD, respeita ADRs na área tocada. Identifica ativamente oportunidades de extrair **deep modules** — módulos que encapsulam muita funcionalidade em uma interface simples e testável que raramente muda.

#### `/to-issues`
Quebra qualquer plano, spec ou PRD em GitHub issues independentemente executáveis, usando vertical slices.

#### `/tdd`
Test-driven development com red-green-refactor loop. Constrói features ou corrige bugs um vertical slice por vez.

**Anti-pattern crítico:** horizontal slicing — terminar todos os testes primeiro, depois toda a implementação. O approach correto:
- **RED:** escreve um teste que descreve o primeiro behavior → teste falha
- **GREEN:** escreve o código mínimo para o teste passar
- **REFACTOR:** refatorar (opcional)
- Repete o loop

**Resources bundled no `/tdd`:**
Inclui deep modules, interface design, mocking, refactoring e testing guidelines.

#### `/diagnose`
Loop disciplinado de diagnóstico para hard bugs e performance regressions: `reproduce → minimise → hypothesise → instrument → fix → regression-test`.

**Estratégias de feedback loop do `/diagnose`:**


- Failing test no seam que alcança o bug (unit, integration, e2e)
- Curl / HTTP script contra um dev server rodando
- CLI invocation com fixture input, diff de stdout contra snapshot known-good
- Headless browser script (Playwright/Puppeteer) — UI, DOM/console/network

Estratégias avançadas:
- **Bisection harness:** se o bug apareceu entre dois estados conhecidos (commit, dataset, versão), automatiza "boot at state X, check, repeat" para `git bisect run`
- **Differential loop:** roda o mesmo input por old-version vs new-version e diff de outputs

Se você tem um sinal pass/fail rápido, determinístico e agent-runnable para o bug, você vai encontrar a causa. Se não tem, nenhuma quantidade de leitura de código vai salvar. **Gaste esforço desproporcional aqui.**

#### `/triage`
Quando a triage skill processa uma issue recebida, move-a através de uma state machine — `needs evaluation`, `waiting on reporter`, `ready for AFK agent`, `ready for human`, ou `won't fix`. Para isso, precisa aplicar labels (ou equivalente) que correspondam às strings configuradas.

#### `/improve-codebase-architecture`
Encontra deepening opportunities em uma codebase, informado pelo domain language em `CONTEXT.md` e decisões em `docs/adr/`.

O problema: a maioria dos apps construídos com agents são complexos e difíceis de mudar. Como agents aceleram radicalmente o coding, também aceleram a software entropy. Codebases ficam mais complexas em uma taxa sem precedentes.

O `/improve-codebase-architecture` ajuda a resgatar uma codebase que virou um ball of mud. Recomendado rodar uma vez a cada poucos dias.

#### `/zoom-out`
Diz ao agente para dar broader context ou uma perspectiva de alto nível sobre uma seção de código desconhecida.

#### `/qa`
QA session interativa onde o usuário reporta bugs ou issues conversacionalmente, e o agente abre GitHub issues. Explora a codebase em background para contexto e domain language. Use quando o usuário quer reportar bugs, fazer QA ou file issues conversacionalmente.

#### `/request-refactor-plan`
Cria um plano de refactor detalhado com tiny commits via user interview e o arquiva como GitHub issue. Use quando o usuário quer planejar um refactor ou quebrar um refactor em passos incrementais seguros.

#### `/design-an-interface`
Gera múltiplos designs radicalmente diferentes de interface para um módulo usando **parallel sub-agents**. Use quando o usuário quer explorar opções de interface ou menciona "design it twice".

---

### 6.2 — `productivity/`

#### `/handoff`
Compacta a conversa atual em um handoff document para que outro agente possa continuar o trabalho.

#### `/write-a-skill`
Cria novas skills com estrutura adequada, progressive disclosure e bundled resources.

---

### 6.3 — `misc/` (Rarely Used)

| Skill | Função |
|---|---|
| `/git-guardrails-claude-code` | Configura Claude Code hooks para bloquear git commands perigosos (push, reset --hard, clean, etc.) antes de executar. |
| `/migrate-to-shoehorn` | Migra test files de `as` type assertions para `@total-typescript/shoehorn`. |
| `/scaffold-exercises` | Cria estruturas de diretório de exercícios com sections, problems, solutions e explainers. |

---

## 7. Domain Model: `CONTEXT.md` + ADRs

### O Problema
No início de um projeto, devs e domain experts falam línguas diferentes. O mesmo problema existe com agents. Agents são normalmente lançados em um projeto e mandados para descobrir o jargão conforme avançam. Então usam 20 palavras onde 1 resolveria.

### A Solução
`CONTEXT.md` é um documento que ajuda agents a decodificar o jargão usado no projeto.

**Exemplo concreto do impacto:**
BEFORE: "There's a problem when a lesson inside a section of a course is made 'real' (i.e. given a spot in the file system)" → AFTER: "There's a problem with the materialization cascade." Essa concisão paga dividendos sessão após sessão.

### Triage State Machine (canonical roles)
**Triage role**: label de state machine aplicado a uma Issue durante triage (ex: `needs-triage`, `ready-for-afk`). Cada role mapeia para uma real label string no Issue tracker via `docs/agents/triage-labels.md`.

---

## 8. Feedback Loops: Princípio Fundamental

Sem feedback sobre como o código produzido roda, o agente voa às cegas. O fix: você precisa do tranche usual de feedback loops — **static types**, **browser access**, e **automated tests**. Para automated tests, um red-green-refactor loop é crítico.

---

## 9. Compatibilidade de Runtime

O mesmo arquivo `SKILL.md` funciona no Claude Code, Cursor, Gemini CLI, Codex CLI e Antigravity IDE. Sem vendor lock-in. Sem formatos proprietários. Se você migrar do Claude Code para o Cursor amanhã, suas skills vão junto.

Mesmo `SKILL.md` funciona no Claude Code, Cursor (via cc-switch), e qualquer harness que leia o open SKILL.md spec. Combina naturalmente com `obra/superpowers`, `warp` e `cc-switch` para um stack completo de agent-skills runtime.

---

## 10. Ordem de Invocação Recomendada (workflow completo)

```
1. /setup-matt-pocock-skills   ← uma vez por repo
2. /grill-me ou /grill-with-docs  ← antes de escrever código
3. /to-prd                     ← sintetiza o plano em PRD
4. /to-issues                  ← quebra PRD em issues (vertical slices)
5. /tdd                        ← implementa slice a slice (RED→GREEN→REFACTOR)
6. /qa                         ← QA conversacional → abre issues
7. /triage                     ← processa issues pela state machine
8. /improve-codebase-architecture  ← periodicamente (a cada poucos dias)
9. /diagnose                   ← quando há hard bugs
10. /handoff                   ← encerra sessão / passa para outro agente
```

---

## 11. Comportamento do Harness sem Configuração

As engineering skills usam terminologia vaga ("publish to the backlog", "the AFK-ready label", "the domain glossary") em vez de referenciar GitHub ou label strings explicitamente. Como `AGENTS.md` está no contexto do modelo, as referências resolvem naturalmente sem pointers explícitos no texto das skills.

Nunca sobrescreve um `docs/agents/*.md` existente sem confirmação; o usuário é dono desses arquivos. Pode preencher seções faltando sem disturbar as presentes.