# Ideias de Harness do Akita — Plano de Implementação

> Fonte: AkitaOnRails, “Primeiras Impressões usando Oh-My-Pi e OpenCode” (2026-05-25).
> Objetivo: extrair os pontos positivos de harness que o Akita elogiou em Claude Code, OpenCode, Oh-My-Pi e os poucos pontos positivos/neutros sobre Codex/GPT; comparar com o Pi.dev Starter Kit; propor ideias de implementação apenas onde o kit ainda não cobre bem.

## Resumo

O ponto principal do Akita é que **a qualidade do harness importa tanto quanto a qualidade do modelo**. As capacidades elogiadas não são mágica do modelo; elas vêm de design de tools, prompts de roteamento, memória/compaction, planejamento, interrupção/steering, leitores de artefatos, suporte a LSP/AST e polimento de produto.

O starter kit já cobre muitos recursos básicos de harness: permission gates, tasks, skills de plan/self-verify, integrações com web/browser/MCP/subagents, auto-memory/ai-memory, lint pós-edição, loop protection, monitor bash e roteamento de context-mode. Os gaps mais fortes são:

1. Comportamento de `read` universal e consciente de artefatos.
2. Tools de busca/edição AST para codemods.
3. Roteamento LSP mais forte e operações de símbolo, não só diagnósticos.
4. Leituras multi-range e anchors de edição.
5. Knobs explícitos de política para steering/interrupção/compaction.
6. Polimento de produto em defaults e setup com pouca configuração.
7. Workflow de revisão multi-harness para auditorias importantes.

## Pontos elogiados por harness

### Claude Code

Pontos positivos que o Akita destacou:

- Modo de planejamento forte.
- Lista clara de todo/tasks que o agente segue passo a passo.
- Boa interrupção e redirecionamento sem destruir a sessão.
- Capacidade de injetar prompts enquanto o agente está trabalhando.
- Memória e compaction mais sofisticadas que as alternativas.
- Melhor escolha ao usar Anthropic/Opus pelo plano subsidiado da Anthropic.

Status no starter kit:

- Parcialmente coberto por `plan-mode`, `task-tracker`, `handoff`, `auto-memory`, `ai-memory` opcional e context-mode.
- Não claramente coberto: injeção de prompt ao vivo durante execução, modos de interrupção first-class, knobs explícitos de estratégia de compaction.

### Codex / GPT

Pontos positivos que o Akita destacou:

- O GPT em si é excelente.
- Codex é usável e funciona, mas o Akita critica principalmente o harness.
- Lição: não nerfar um modelo forte com um harness fraco.

Status no starter kit:

- Coberto em princípio pela autonomia de modelo.
- Gap: devemos documentar recomendações de roteamento de modelo/provider sem virar provider-specific ou violar termos de OAuth/provider.

### OpenCode

Pontos positivos que o Akita destacou:

- Experiência de produto coesa e polida.
- Bom kit normal para programação: shell, read, glob, grep, edit/write/apply_patch, task/subagents, todo, web fetch/search, skills, LSP opcional, plugins, MCP.
- Harness melhor para GPT do que Codex, na experiência dele.
- Esconde alguns knobs e entrega bons defaults para o dia a dia.
- Suporta planejamento, tasks, tools, subagents, LSP, compaction, interrupção e steering bem o suficiente.

Status no starter kit:

- Majoritariamente coberto pelas dependências e extensões atuais.
- Os gaps são mais sobre polimento/defaults do que capacidade bruta: onboarding, defaults mais claros, menos verbosidade e um perfil estável de “funciona imediatamente”.

### Oh-My-Pi

Pontos positivos que o Akita destacou:

- Distribuição Pi com baterias inclusas, ponto de partida útil contra Pi puro.
- Muitas tools e prompts fortes de roteamento de tools.
- `read` universal é a vantagem mais clara: arquivos, diretórios, archives, SQLite, imagens, PDF/DOCX/PPTX/XLSX/RTF/EPUB, notebooks Jupyter, URLs em modo reader e URIs internas.
- Protocolo de leitura SQLite: listar tabelas/contagens, schema/amostra, linha por chave primária, paginação, filtros/order, SQL read-only.
- Conveniências para source code: resumos estruturais, leituras multi-range, anchors com hash de linha, roteamento LSP agressivo, `ast_grep`, `ast_edit`.
- Bom quando projetos incluem artefatos de dados/documentos, auditorias, migrações, notebooks, planilhas, archives, PDFs, imagens e páginas web.
- Expõe comportamento do harness como knobs de configuração: steering mode, interrupt mode, compaction strategy.

Status no starter kit:

- Coberto: web, browser, MCP, subagents, memória, context-mode, diagnósticos LSP básicos.
- Não coberto ou fraco: leitor universal de artefatos, protocolos para SQLite/documentos/archives/notebooks, tools AST, anchors de linha, leituras multi-range, operações LSP em nível de símbolo, configurações explícitas de steering/interrupção/compaction.

## Plano de implementação

### 1. Adicionar uma extensão de leitura universal de artefatos

**Ideia:** Implementar `artifact-read` ou estender o kit com uma nova tool como `artifact_read`, oferecendo leituras estruturadas no estilo Oh-My-Pi para artefatos que não são source code.

**Por que é ótimo:** O Akita identifica isso como a vantagem real mais clara do Oh-My-Pi. Evita que o modelo invente comandos shell frágeis, reduz dumps de contexto e torna práticos projetos pesados em dados/documentos.

**Escopo:**

- Resumo de diretório com tamanhos, tipos de arquivo e árvore top-level.
- Archives: listar `.zip`, `.tar`, `.tar.gz`, `.tgz` e preview seletivo de extração.
- SQLite: lista/contagem de tabelas, schema/amostra, linha por chave primária, paginação, leitura filtrada, SELECT read-only.
- CSV/JSON/JSONL: schema/amostra/resumo de query.
- Documentos: extração de texto de PDF/DOCX/PPTX/XLSX/RTF/EPUB quando dependências estiverem disponíveis.
- Notebooks: outline de células markdown/code e leitura de células selecionadas.
- Modo reader de URL pode inicialmente delegar para `pi-web-access`.

**Gap atual do kit:** Não há um protocolo único de leitura para SQLite, archives, documentos, planilhas ou notebooks.

**Notas de implementação:** Manter escrita impossível. Aplicar path confinement. Retornar resumos por default, nunca payloads brutos gigantes.

### 2. Adicionar tools de busca AST e edição AST

**Ideia:** Adicionar uma extensão `ast-tools` envolvendo `ast-grep`, com tools como `ast_grep` e `ast_edit`.

**Por que é ótimo:** O Akita destaca AST como útil para codemods e refactors estruturais: imports, chamadas de função, declarações, metavariáveis repetidas e evitar falsos positivos em strings/comentários.

**Escopo:**

- `ast_grep(pattern, language?, paths?)` retorna matches estruturais com arquivo/range/contexto.
- `ast_edit(pattern, replacement, language?, paths?, dryRun=true)` faz preview de patches de codemod.
- Exigir aprovação explícita do usuário para edições non-dry-run via permission pipeline.
- Documentar quando rename via LSP é preferível a AST.

**Gap atual do kit:** Temos grep e edit; não temos busca/edição estrutural.

### 3. Evoluir o LSP bridge de diagnósticos para operações de símbolo

**Ideia:** Expandir `lsp-bridge` além da execução de type-check para tools práticas symbol-aware.

**Por que é ótimo:** O Akita elogia roteamento LSP agressivo para navegação/refactor de source code com mais corretude. LSP pode superar reescritas textuais ou AST em rename/references quando a linguagem tem bom suporte.

**Escopo:**

- `lsp_references(symbol/file/position)`.
- `lsp_definition(file/position)`.
- `lsp_rename(file/position,newName,dryRun=true)`.
- `lsp_workspace_symbols(query)`.
- Manter fluxo existente de diagnósticos/type-check.

**Gap atual do kit:** `lsp-bridge` é majoritariamente orientado a diagnósticos/type-check.

### 4. Adicionar read multi-range e anchors de edição

**Ideia:** Fornecer leituras e edições de source code mais seguras com batch de ranges e anchors com hash de linha.

**Por que é ótimo:** O Akita observa que leituras multi-range e anchors tornam navegação de source mais barata e edições textuais mais seguras. Reduzem tool calls repetidas e edições acidentais em ranges stale.

**Escopo:**

- `read_ranges(path, ranges[])` retornando apenas seções selecionadas.
- Incluir anchors estáveis como `path:L10-L25#hash` baseados no conteúdo das linhas.
- Opcional: `edit_at_anchor(anchor, oldText, newText)` que falha se o hash mudou.

**Gap atual do kit:** O `read` base suporta leitura de um arquivo com offset/limit opcional; não há ranges em batch nem anchors com hash.

### 5. Definir perfis de steering, interrupção e compaction

**Ideia:** Adicionar knobs documentados em `.pi/settings.json` e roteamento de system para perfis de comportamento do harness.

**Por que é ótimo:** O Akita trata steering como obrigatório para Agile Vibe Coding. Claude Code é forte nisso; Oh-My-Pi expõe knobs. Usuários precisam redirecionar agentes sem perder a sessão.

**Escopo:**

- Adicionar chaves de settings: `steeringMode`, `interruptMode`, `compactionStrategy`.
- Documentar perfis recomendados: `polished-default`, `power-user`, `low-verbosity`, `audit-heavy`.
- Mapear essas configurações para comportamentos disponíveis de Pi/context-mode onde possível; onde Pi não tiver hooks, documentar como integração futura.

**Gap atual do kit:** Mencionamos workflow e context-mode, mas não há perfis user-facing de steering/interrupção/compaction.

### 6. Criar um perfil default polido

**Ideia:** Fazer o kit parecer mais próximo dos defaults coesos do OpenCode e menos como uma caixa de knobs.

**Por que é ótimo:** O Akita prefere OpenCode no dia a dia porque é coeso e polido. Um starter kit deve ser produtivo no primeiro dia, sem exigir uma tarde de tuning.

**Escopo:**

- `settings.template.json` default deve habilitar as tools seguras mais úteis (`monitor-bash`, `lsp-bridge` se estável) ou explicar claramente por que são opcionais.
- Adicionar um comando `/starter-kit-doctor` para verificar dependências e mostrar o que está ativo/faltando.
- Adicionar um caminho curto de README para “default recomendado” e mover tuning avançado para um doc separado.
- Reduzir verbosidade em prompts/templates gerados.

**Gap atual do kit:** Boas capacidades existem, mas o onboarding ainda expõe muitas peças móveis.

### 7. Adicionar um workflow de revisão multi-pass

**Ideia:** Adicionar uma skill/prompt `review-matrix` que execute passes independentes de revisão com perspectivas diferentes ou modelos/harnesses quando disponíveis.

**Por que é ótimo:** O experimento de review do Akita mostrou que cada harness/modelo encontra problemas diferentes. A lição correta não é “winner takes all”; é “reviews importantes precisam de passes independentes”.

**Escopo:**

- Passo de revisão 1: corretude/regressão.
- Passo de revisão 2: segurança/perda de dados.
- Passo de revisão 3: manutenibilidade/API/design.
- Opcional: delegar cada passo para subagents ou harnesses externos manualmente.
- Consolidar achados em severidade, evidência e recomendações de correção.

**Gap atual do kit:** Temos `self-verify`, `qa` e prompt de review, mas não uma matriz estruturada de review multi-pass.

### 8. Documentar guidance de provider/subscription sem hacks

**Ideia:** Adicionar um doc curto de orientação de providers que separa qualidade do modelo, qualidade do harness, API keys e restrições de subscription/OAuth.

**Por que é ótimo:** O Akita enfatiza que planos subsidiados mudam a economia, mas também alerta contra violar termos de providers. O kit deve ajudar usuários a escolher caminhos seguros.

**Escopo:**

- Recomendar padrões de setup legais e compatíveis com providers.
- Explicar que autonomia de modelo não significa burlar restrições de provider.
- Clarificar quando usar Pi kit, Claude Code, OpenCode ou ferramentas externas junto com o kit.

**Gap atual do kit:** A arquitetura fala de autonomia de modelo, mas não dá guidance pragmático de provider.

## Plano de discoverability e roteamento para o agente

Uma tool não é útil só porque existe no código. A LLM precisa enxergar informação suficiente para saber **que a tool existe**, **quando ela é melhor que shell/grep/read** e **qual formato de input é seguro**. Para cada nova capacidade, a implementação deve incluir quatro camadas de discoverability:

1. **Schema/descrição da tool na extensão** — a fonte canônica. Cada extensão deve registrar tools com descrições curtas, parâmetros, exemplos, limites de segurança e orientação de “prefira isto quando…”. É isso que o modelo vê na lista de tools.
2. **Tabela de roteamento no SYSTEM.md** — hints curtos e sempre ativos só para categorias de alto nível. Manter enxuto: “SQLite/archive/documento/notebook → use `artifact_read`”, “busca estrutural/codemod → use `ast_grep`/`ast_edit`”, “rename/references de símbolo → use LSP”.
3. **Guidance profundo em skills** — instruções maiores ficam em skills e só são carregadas quando a tarefa precisa. Exemplo: `artifact-analysis` ensina investigação de dados/documentos; `structural-refactor` ensina workflows AST/LSP; `review-matrix` ensina review multi-pass.
4. **Visibilidade via doctor/settings** — `/starter-kit-doctor` informa quais tools estão instaladas, habilitadas, com dependências faltando ou desativadas por settings. Isso ajuda usuário e agente a entenderem a capacidade atual.

### Mudanças obrigatórias de discoverability por capacidade

| Capacidade | Consciência always-on do agente | Guidance profundo | Visibilidade em runtime |
|---|---|---|---|
| `artifact_read` | Adicionar em Tool Categories do SYSTEM em File/Data I/O. Roteamento: usar para SQLite, archives, CSV/JSON, documentos, notebooks, URLs/artefatos em vez de shell ad hoc. | `skills/artifact-analysis/SKILL.md` com exemplos para queries SQLite, inspeção de archives, extração de documentos, outlines de notebooks. | `starter-kit-doctor` verifica parsers/deps e lista tipos de artefato suportados. |
| `ast_grep` / `ast_edit` | Adicionar ao SYSTEM em categoria Search/Refactor. Roteamento: usar para padrões estruturais/codemods, não busca textual. | `skills/structural-refactor/SKILL.md` com padrões ast-grep, workflow dry-run, quando preferir LSP. | Doctor verifica binário `ast-grep` e suporte de linguagens. |
| Tools LSP de símbolo | Adicionar ao SYSTEM em categoria Quality/Navigation. Roteamento: usar para definitions, references, rename, workspace symbols. | `structural-refactor` inclui workflow LSP-first para rename/references. | Doctor lista language servers detectados e tools LSP habilitadas. |
| `read_ranges` / `edit_at_anchor` | Adicionar regra curta no SYSTEM: usar range reads para seções espalhadas e anchors para edições seguras contra stale context. | `self-verify`/`structural-refactor` podem referenciar edições anchor-safe. | Doctor verifica extensão habilitada. |
| Perfis de steering/interrupção/compaction | Adicionar nota compacta no SYSTEM dizendo que o perfil ativo controla estilo de interação. | `docs/steering-profiles.md` explica perfis; sem prompt gigante no system. | Doctor imprime perfil ativo e settings efetivos. |
| `review-matrix` | Adicionar à lista de skills do SYSTEM com trigger de uma linha: audit/review importante. | `skills/review-matrix/SKILL.md` contém workflow completo. | Doctor lista disponibilidade da skill. |

### Adições ao SYSTEM.md devem continuar pequenas

Não despejar manuais completos de tool no `SYSTEM.md`. Adicionar só um bloco compacto de roteamento como:

```md
### Advanced Routing

- Artefatos que não são source code (SQLite, CSV/JSON, archives, PDFs, planilhas, notebooks): prefira `artifact_read` antes de scripts shell.
- Padrões estruturais de código ou codemods: prefira `ast_grep`; use `ast_edit` em dry-run antes de editar.
- Navegação/refactors de símbolo: prefira tools LSP (`lsp_definition`, `lsp_references`, `lsp_rename`) em vez de busca textual.
- Contexto de source espalhado: use `read_ranges`; edições sensíveis a stale context: use `edit_at_anchor` quando disponível.
- Reviews importantes: ative `review-matrix` para passes independentes.
```

### Requisito de implementação das extensões

Toda nova extensão deve exportar/registrar tools com descrições que incluam:

- Propósito em uma frase.
- Lista de triggers “use quando…”.
- Limites “não use quando…”.
- Parâmetros com exemplos.
- Limites de tamanho de output e comportamento de paginação.
- Comportamento de segurança: read-only, dry-run, permission-gated, path-confined.

Isso torna as tools auto-descritivas para a LLM e evita depender do usuário lembrar manualmente delas.

## Mapa técnico de implementação no kit

Esta é a forma como cada ideia deve ser entregue no Pi.dev Starter Kit. A regra default é: **comportamento determinístico e tools viram extensões; workflow/processo vira skill; comportamento default vira settings/templates; orientação de provider vira documentação.**

| Ideia | Entrega no kit | Arquivos a adicionar/alterar | Solução técnica |
|---|---|---|---|
| Leitor universal de artefatos | **Extensão** | `extensions/artifact-read/index.ts`, `skills/artifact-analysis/SKILL.md` opcional, `templates/settings.template.json`, roteamento em `SYSTEM.md` | Registrar uma tool `artifact_read`. Ela deve detectar o tipo de arquivo, aplicar path confinement, retornar resumos estruturados e usar parsers seguros/queries read-only. A skill opcional ensina workflows para investigação de dados/documentos. |
| Busca/edição AST | **Extensão + guidance em skill** | `extensions/ast-tools/index.ts`, `skills/structural-refactor/SKILL.md` opcional, roteamento em `SYSTEM.md` | Registrar wrappers `ast_grep` e `ast_edit` em cima de `ast-grep`. `ast_edit` deve ser dry-run por default e rotear edições reais pela permission pipeline. A skill explica padrões de codemod e quando preferir LSP. |
| LSP mais forte | **Upgrade de extensão** | `extensions/lsp-bridge/index.ts`, talvez `extensions/lsp-bridge/lsp-client.ts`, `templates/settings.template.json` | Expandir de diagnósticos/type-check para operações de cliente LSP: definition, references, rename preview, workspace symbols. Detectar language servers por projeto e degradar graciosamente quando não houver servidor. |
| Read multi-range + anchors | **Extensão** | `extensions/source-navigation/index.ts` ou integrado ao `artifact-read`, roteamento em `SYSTEM.md` | Registrar `read_ranges` e opcionalmente `edit_at_anchor`. Anchors incluem path, range de linhas e hash de conteúdo; edições falham se o range alvo mudou. Isso é segurança em nível de tool, não só regra de prompt. |
| Perfis de steering/interrupção/compaction | **Settings + prompt template + docs; extensão só se Pi expuser hooks** | `templates/settings.template.json`, `SYSTEM.md`, `APPEND_SYSTEM.md`, `docs/steering-profiles.md` | Adicionar `starterKit.steeringMode`, `interruptMode` e `compactionStrategy`. Inicialmente usar como hints documentados de roteamento/perfil. Se o Pi expuser hooks/eventos de runtime, adicionar extensão para aplicar o comportamento do perfil. |
| Default polido + doctor | **Comando/extensão + templates** | `extensions/starter-kit-doctor/index.ts`, `templates/settings.template.json`, `README.md` | Registrar `/starter-kit-doctor` ou tool/comando `starter_kit_doctor` que verifica dependências instaladas, extensões ativas, skills ativas, `.pi/settings.json`, binários necessários e imprime correções acionáveis. Ajustar templates para um perfil default recomendado. |
| Review multi-pass | **Skill + prompt** | `skills/review-matrix/SKILL.md`, `prompts/review-matrix.md`, lista de skills no `SYSTEM.md` | Adicionar uma skill de workflow que roda passes independentes de review: corretude/regressão, segurança/perda de dados, manutenibilidade/API. Pode usar subagents quando disponíveis, mas também deve funcionar sequencialmente. |
| Guidance de provider/subscription | **Documentação** | `docs/provider-guidance.md`, link no `README.md` | Documentar escolhas seguras e compatíveis com providers. Sem hacks de OAuth, sem roteamento de credenciais que viole termos. Explicar qualidade do modelo vs qualidade do harness vs preço. |

### Novas estruturas propostas no pacote

```text
extensions/
├── artifact-read/          # artifact_read: SQLite, archives, CSV/JSON, docs, notebooks
├── ast-tools/              # ast_grep, ast_edit
├── source-navigation/      # read_ranges, edit_at_anchor
└── starter-kit-doctor/     # diagnósticos de setup/dependências/perfil

skills/
├── artifact-analysis/      # workflow opcional para investigação de documentos/dados
├── structural-refactor/    # workflow opcional para codemods AST/LSP
└── review-matrix/          # workflow independente de review multi-pass

docs/
├── steering-profiles.md
└── provider-guidance.md
```

### Sequência de implementação por dependência técnica

1. **Extensão `starter-kit-doctor` primeiro**, porque ela valida o ambiente para todas as capacidades seguintes.
2. **`artifact-read` fase 1** com dependências leves/zero-heavy: diretórios, CSV/JSON/JSONL, SQLite via `better-sqlite3`, archives via libs Node ou system tools com fallbacks seguros.
3. **`ast-tools`** envolvendo `ast-grep`; o doctor deve detectar o binário `ast-grep` e orientar instalação.
4. **Upgrade do `lsp-bridge`** depois que o doctor conseguir detectar language servers.
5. **`source-navigation`** quando a semântica de read/edit anchors estiver fechada.
6. **Skills/docs** podem ser adicionadas em paralelo porque principalmente roteiam humanos/modelos para as novas tools.

## Ordem de prioridade sugerida

1. **Perfil default polido + starter-kit doctor** — melhoria mais rápida para experiência de primeiro dia.
2. **Leitor universal de artefatos, fase 1: SQLite + archives + CSV/JSON** — maior ganho de capacidade inspirado no Oh-My-Pi.
3. **Tools AST** — alto leverage para codemods e refactors.
4. **Operações LSP de símbolo** — melhoria de corretude para refactors reais em source.
5. **Read multi-range + anchors** — melhoria de segurança/eficiência de contexto.
6. **Perfis de steering/interrupção/compaction** — depende de suporte de hooks do Pi; começar com docs/settings.
7. **Skill review matrix** — baixo custo de implementação, alto valor de processo.
8. **Doc de provider guidance** — baixo custo de implementação, evita expectativas inseguras dos usuários.

## Não-objetivos

- Não copiar o Oh-My-Pi inteiro nem transformar o kit em um prompt gigante sempre ativo.
- Não burlar restrições de subscription da Anthropic/OpenAI.
- Não forçar subagents para trabalho normal de coding coeso; use-os apenas para tarefas genuinamente paralelas.
- Não otimizar para system prompts minúsculos ao custo de perder logs de teste, output de build ou evidência.
