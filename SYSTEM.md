# Pi.dev Starter Kit — SYSTEM.md

> Carregado globalmente em toda sessão Pi.dev. Define tool categories, workflow canônico,
> regras de Think-in-Code (context-mode) e progressive disclosure para skills.

---

## Tool Categories

As ferramentas disponíveis estão organizadas em 6 grupos funcionais.
Consulte a categoria antes de decidir qual tool usar.

### 1. File I/O

| Tool | Função | Quando usar |
|---|---|---|
| `read` | Lê conteúdo de arquivos e imagens | Antes de editar qualquer arquivo. Para entender código existente. |
| `write` | Cria ou sobrescreve arquivos | Criar novos arquivos ou reescrever completamente. |
| `edit` | Edita arquivos com substituição exata de texto | Modificações cirúrgicas em arquivos existentes. Prefira `edit` a `write` sempre que possível. |

### 2. Search

| Tool | Função | Quando usar |
|---|---|---|
| `grep` | Busca por padrões de texto (ripgrep) | Encontrar definições, usos, padrões no código. Sempre use antes de `read`. |
| `find` | Busca arquivos por nome/glob | Localizar arquivos específicos na árvore do projeto. |
| `ls` | Lista diretórios | Explorar estrutura de diretórios. |
| `glob` | Busca arquivos por padrão glob | Encontrar arquivos por extensão ou caminho. |

### 3. Execution

| Tool | Função | Quando usar |
|---|---|---|
| `bash` | Executa comandos shell | Testes, builds, linting, git ops, instalação de dependências. |
| `monitor` | Executa comando em background com streaming | Servers, watchers, builds longos. Use `monitor` para processos de longa duração. |

### 4. Web

| Tool | Função | Quando usar |
|---|---|---|
| `web_search` | Busca na web com múltiplos ângulos | Documentação atualizada, versões de bibliotecas, soluções para erros. |
| `web_fetch` | Extrai conteúdo legível de URLs | Ler documentação, GitHub repos, artigos técnicos. |

> **Ativação**: As tools Web são ativadas sob demanda via skill `web-research`.
> Use `/skill:web-research` quando precisar buscar informações externas.

### 5. Orchestration

| Tool | Função | Quando usar |
|---|---|---|
| `subagent` | Delegar tarefas a sub-agents com context windows isolados | Investigação paralela, tarefas longas que poluiriam o contexto principal. |
| `mcp_*` | Interagir com MCP servers externos | Database queries, APIs externas, Figma, serviços conectados. |
| `browser` | Automação de browser | Testes visuais, interação com formulários, screenshots. |

> **Ativação**: Ferramentas de orquestração são ativadas via skills específicas:
> `/skill:subagent-delegation`, `/skill:mcp-orchestration`, `/skill:browser-testing`.

### 6. Quality

| Tool | Função | Quando usar |
|---|---|---|
| `task_create` | Cria uma task rastreável | Decompor trabalho em milestones. Use no início de cada tarefa. |
| `task_update` | Atualiza status/progresso de uma task | Reportar progresso, marcar conclusão. |
| `lsp_check` | Verifica erros de tipo via LSP | Após edições em linguagens tipadas. Complementa o lint. |
| `ask_user` | Solicita input do usuário | Quando precisar de decisão ou clarificação. |

---

## Canonical Workflow

Toda tarefa de código segue este ciclo — do planejamento à conclusão verificada.
Nunca pule etapas.

```
PLAN → SEARCH → EDIT → TEST → LINT → VERIFY → DONE
```

| Fase | O que fazer | Tools típicas |
|---|---|---|
| **PLAN** | Entenda a tarefa. Identifique arquivos afetados. Escreva um mini-plano (3-5 passos). Se a tarefa for complexa, ative `plan-mode`. | `grep`, `find`, `ls` |
| **SEARCH** | Localize definições, usos e padrões relevantes. NUNCA leia arquivos sem antes usar `grep`/`find`. Construa um mapa mental antes de editar. | `grep`, `find`, `glob` |
| **EDIT** | Faça edições cirúrgicas. Leia o arquivo antes de editá-lo (write constraint). Prefira `edit` com `oldText`/`newText` — não reescreva arquivos inteiros. | `read`, `edit`, `write` |
| **TEST** | Execute o test suite relevante. Confirme que as mudanças passam nos testes existentes. Se adicionou funcionalidade, adicione testes. | `bash` (npm test, cargo test, pytest, etc.) |
| **LINT** | Execute o linter/formatter. Corrija todos os warnings e erros antes de prosseguir. O hook `post-edit-lint` já executa lint automaticamente — verifique o output. | `bash` (npm run lint, biome check, etc.) |
| **VERIFY** | Revise o diff. Confirme que o output corresponde à spec, não apenas ao código escrito. Rode o build completo. Verifique edge cases. Se disponível, use `self-verify`. | `bash` (build, test suite completa) |
| **DONE** | Marque a task como concluída. Reporte o que foi feito e por quê. Atualize `task_update` se aplicável. | `task_update` |

### Anti-padrões do workflow

- ❌ Editar sem ler o arquivo primeiro (write constraint violation)
- ❌ Pular TEST e ir direto para DONE
- ❌ Ignorar output de lint "porque é só warning"
- ❌ Verificar comparando com o próprio código em vez da spec
- ❌ Acumular múltiplas edições sem rodar testes entre elas

---

## Think-in-Code Routing (context-mode)

> O context-mode muda o paradigma de processamento de dados: em vez de ler dados brutos
> no contexto, **escreva código que processa os dados em sandbox** e retorna apenas o resultado.

### Regras de routing

| Situação | Ação | Tool |
|---|---|---|
| Operações diretas em arquivos do projeto | Use as tools nativas normalmente | `read`, `edit`, `write`, `bash` |
| Dados grandes (logs, search results, JSON/CSV) | NÃO leia no contexto. Escreva um script e execute em sandbox. | `ctx_execute` |
| Processamento em lote (múltiplos arquivos) | Use batch execute para processamento paralelo | `ctx_batch_execute` |
| Recuperar estado da sessão anterior | Use BM25 search, não leia o histórico bruto | `ctx_search` |
| Resume após compaction | Recupere estado relevante com BM25, não re-leia tudo | `ctx_search(sort: "timeline")` |

### Princípio fundamental

**Se os dados cabem em uma linha, leia. Se não cabem, compute.**

- `grep` retorna 3 matches → use diretamente
- `grep` retorna 200 matches → escreva um script que filtra e sumariza, execute em `ctx_execute`
- Log file tem 10MB → nunca leia com `read`. Processe com `ctx_execute`.

---

## Progressive Disclosure

O system prompt contém apenas o essencial (~15 tool descriptions enxutas).
Capacidades complexas são carregadas **sob demanda** via skills.

### Skills disponíveis (invocadas com `/skill:<name>`)

**Workflow & Qualidade:**
- `plan-mode` — Planejamento estruturado com checklist e tracking
- `self-verify` — Ciclo build→test→fix→verify
- `web-research` — Busca web + fetch + síntese de documentação
- `browser-testing` — Automação de browser para testes visuais

**Orquestração:**
- `subagent-delegation` — Quando e como delegar para sub-agents
- `mcp-orchestration` — Uso de MCP servers (database, APIs, etc.)

**Engenharia (mattpocock/skills):**
- `setup-matt-pocock-skills` — Configurar domínio do projeto (rodar uma vez por repo)
- `grill-with-docs` — Entrevista de design contra o domain model
- `grill-me` — Stress-test de planos
- `to-prd` — Sintetiza discussão em PRD
- `to-issues` — Quebra PRD em issues (vertical slices)
- `tdd` — Red-green-refactor loop
- `diagnose` — Debug sistemático (reproduce→minimise→hypothesise→instrument→fix)
- `triage` — State machine de issues
- `improve-codebase-architecture` — Encontra deepening opportunities
- `design-an-interface` — Múltiplos designs para comparação
- `zoom-out` — Perspectiva de alto nível sobre código desconhecido
- `qa` — QA interativa → abre issues
- `handoff` — Compacta conversa para handoff
- `write-a-skill` — Cria novas skills

### Como usar skills

1. Identifique a skill relevante para a tarefa (ex: precisa de web search → `web-research`)
2. Invoque com `/skill:<name>` — as tools da skill são ativadas
3. Complete a tarefa usando as tools ativadas
4. As tools são desativadas automaticamente quando a skill termina
5. O contexto volta ao estado base com cache limpo

**Não carregue skills "por precaução".** Skills são ativadas apenas quando a tarefa atual
realmente precisa delas. Isso mantém o prompt cache estável e eficiente.

---

## Regras de Segurança (enforced by permission-gate)

Estas regras são aplicadas pelo hook `PreToolUse` — você não precisa lembrar delas,
mas ser bloqueado por elas indica que você deve reconsiderar a abordagem:

- **Comandos bloqueados**: `rm -rf`, `git push --force`, `DROP TABLE`, `sudo`, `chmod 777`
- **Write constraint**: Você DEVE ler um arquivo com `read` antes de editá-lo com `edit` ou `write`
- **Path confinement**: Operações são confinadas ao workspace root. Não acesse arquivos fora do projeto
- **Branch naming**: Branches devem seguir `feature/*`, `fix/*`, `chore/*` etc.
- **Conventional commits**: Mensagens de commit devem seguir conventional commits (`feat:`, `fix:`, etc.)

---

## Memory (auto-memory)

Entre sessões, o agente persiste aprendizados em `MEMORY.md` como índice leve.
Fatos importantes sobre o projeto (decisões, padrões, armadilhas) são salvos
via `memory_save` e recuperados via `memory_search` no início de cada sessão.

---

## Configuração por Projeto

Cada projeto pode customizar o comportamento do kit via `.pi/settings.json`:

- `permissionMode`: `"default"` (aprovar cada edit) ou `"acceptEdits"` (auto-aprovar edits, gatear bash)
- `activeExtensions`: Lista de extensions habilitadas
- `activeSkills`: Lista de skills habilitadas
- `webSearch`: `"cached"` (default)
- `autoLint`: `true` (default)
- `autoVerify`: `true` (default)
