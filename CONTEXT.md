# Context — Pi.dev Starter Kit

## Glossário do Projeto

**Starter Kit**
O pacote Pi.dev instalável que adiciona segurança, qualidade, workflow e ferramentas
ao harness base. Não é um produto — é uma fundação universal. Um `pi install`
e toda sessão herda o kit.

**Extension**
Módulo TypeScript que estende o comportamento do Pi.dev via `registerTool()`,
`on()` (lifecycle events), `registerCommand()`, etc. As extensions do kit são
autorais e mantidas neste repositório.

**Skill**
Arquivo `SKILL.md` (YAML frontmatter + Markdown) carregado sob demanda pelo Pi.dev.
Segue o open standard Agent Skills (agentskills.io). O kit inclui skills autorais
e skills integradas do mattpocock/skills.

**Package (Pi.dev)**
Unidade de distribuição do ecossistema Pi.dev. Contém extensions, skills, prompts
e themes. Instalável via `pi install npm:...` ou `pi install git:...`.

**Dependência direta**
Pacote de terceiros referenciado diretamente do repositório original — sem fork.
O kit usa 5 dependências diretas do ecossistema Pi.dev. Caso um repo upstream
quebre ou seja descontinuado, o fallback é forkar naquele momento (reativo, não proativo).

**Progressive Disclosure**
Estratégia de carregamento de contexto: ferramentas e instruções pesadas só entram
no system prompt quando a skill correspondente é ativada. Mantém o cache enxuto.

**Permission Pipeline**
Fluxo em camadas que processa tool calls: deny rules → allow rules → interactive prompt.
Implementado pela extension `permission-gate`. Dois modos: `default` (aprovar cada edit)
e `acceptEdits` (auto-aprovar edits, gatear bash).

**Think-in-Code**
Paradigma imposto pelo context-mode: em vez de ler dados brutos no contexto,
o modelo escreve código que processa os dados em sandbox e retorna apenas o resultado.

**Session Continuity**
Mecanismo do context-mode que indexa todo evento (edição, git op, task, erro, decisão)
em SQLite+FTS5. Após compaction, o modelo recupera apenas o estado relevante via BM25 search.

**Vertical Slice**
Unidade de trabalho que corta todas as camadas (schema → lógica → UI → teste)
entregando um caminho completo e demoável. Oposto de horizontal slice (fazer
todos os testes primeiro, depois toda a implementação).

**ADR (Architecture Decision Record)**
Registro de decisão arquitetural. Contém: Status, Context, Options Considered,
Decision, Consequences. Armazenado em `docs/adr/`.

## Fontes de Verdade

- `docs/architecture.md` — especificação técnica completa (4 camadas, diagramas, comparação)
- `docs/prd.md` — product requirements (user stories, módulos, scope)
- `.scratch/pi-dev-starter-kit/` — issue tracker (17 issues, dependency-ordered)
- `docs/references/` — referências externas (harness engineering, Pi.dev, mattpocock skills)
