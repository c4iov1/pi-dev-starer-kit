Tenho tudo que preciso. Vou montar o documento completo agora.

---

# 📄 Engenharia de Harness — Documento de Referência

---

## 1. O que é Engenharia de Harness?

### Definição

Engenharia de Harness (*harness engineering*) é a prática de projetar o ambiente ao redor de um agente de codificação com IA para maximizar o seu resultado.

Em termos técnicos, o harness é composto por quatro elementos fundamentais que você customiza: **System Prompt**, **Ferramentas/MCP**, **Contexto** e **Subagentes**.

A definição mais simples vem diretamente do código-fonte do Codex: no coração de todo agente de codificação existe um loop surpreendentemente simples — coletar histórico da conversa, enviar ao LLM com as ferramentas, processar a resposta: se houver tool calls, executá-las, adicionar os resultados ao histórico e continuar; se for apenas texto, encerrar o turno. O comportamento "agêntico" emerge desse loop rodando até que o modelo decida que terminou. Não existe um sistema de planejamento complexo, nem um "motor de raciocínio" separado — apenas chamadas repetidas ao mesmo LLM com um contexto que vai crescendo.

### Por que o Harness importa mais que o modelo?

O benchmark independente de Matt Maher mostrou que o Claude Opus foi de 77% no terminal para 93% dentro do Cursor — um salto de 16 pontos sem mudar nada no modelo, mudando apenas o ambiente ao redor dele.

Os maiores ganhos de performance não vêm de escolher um modelo mais inteligente. Vêm de projetar um scaffolding melhor ao redor do modelo que você já tem.

---

## 2. Os Pilares da Engenharia de Harness

### 2.1 — O Loop do Agente

O agent loop é a lógica central responsável por orquestrar a interação entre o usuário, o modelo e as ferramentas que o modelo invoca para realizar trabalho real de software.

Cada iteração segue o mesmo padrão:

```
Usuário envia mensagem
  → Harness constrói contexto (system prompt + histórico + ferramentas)
  → LLM responde (texto ou tool call)
  → Se tool call: harness executa, resultado volta ao contexto
  → LLM continua até decidir que terminou
  → Resposta final ao usuário
```

### 2.2 — Gerenciamento de Contexto

Um agente pode decidir fazer centenas de tool calls em um único turno, potencialmente esgotando a context window. Por isso, o gerenciamento de contexto é uma das responsabilidades mais críticas do agente.

No coração da interação com LLMs está a context window. Quando você pede ao agente que construa algo, a janela começa com o system prompt e as descrições das ferramentas, seguidos pelo estado atual da conversa, e finalmente o pedido do usuário.

O harness não armazena apenas texto — ele preserva a estrutura. Um comando shell e seu output são vinculados por `call_id`, para que o modelo entenda a relação causal entre eles.

### 2.3 — Descrições de Ferramentas como UX do Agente

O harness importa porque modelos diferentes respondem de forma diferente aos mesmos prompts. Um modelo treinado intensivamente em workflows orientados a shell pode preferir `grep` a uma ferramenta de busca dedicada. Outro pode precisar de instruções explícitas para chamar ferramentas de linter após edições.

Este é o princípio central que o vídeo demonstrou na prática: basta mudar a descrição de uma ferramenta de "lê o conteúdo de um arquivo" para "DEPRECIADA — use bash" para que o modelo mude de comportamento sem alterar uma linha de código funcional.

### 2.4 — AGENTS.md / CLAUDE.md como Sistema de Contexto

Em vez de tratar o AGENTS.md como uma enciclopédia, o melhor uso é tratá-lo como um índice. A base de conhecimento do repositório vive em um diretório `docs/` estruturado, tratado como sistema de registro. Um AGENTS.md curto (~100 linhas) é injetado no contexto e serve primariamente como mapa, com ponteiros para fontes de verdade mais profundas.

### 2.5 — Compactação de Contexto

Quando o modelo se aproxima do limite de tokens durante uma tarefa longa, o harness dispara uma etapa de auto-sumarização. O modelo condensa seu próprio contexto para aproximadamente 1.000 tokens, reduzindo erros de compactação em 50% e permitindo que o modelo lide com tarefas de 170+ turnos, comprimindo mais de 100.000 tokens de contexto acumulado sem perder o fio.

### 2.6 — Engenharia em Escala

O que ficou claro é que construir software ainda exige disciplina, mas essa disciplina aparece mais no *scaffolding* do que no código. As ferramentas, abstrações e feedback loops que mantêm a coerência do codebase são cada vez mais importantes. Os desafios mais difíceis agora centram-se em projetar ambientes, feedback loops e sistemas de controle que ajudem os agentes a alcançar o objetivo: construir e manter software complexo e confiável em escala.

---

## 3. Referências Base

| Fonte | Contribuição Principal |
|---|---|
| **Mihail Eric** — *"The Emperor Has No Clothes"* (jan. 2026) | Demonstra que o núcleo de ferramentas como Claude Code são ~200 linhas de Python. *"The LLM never actually touches your filesystem. It just asks for things to happen, and your code makes them happen."* |
| **Thorsten Ball / AmpCode** — *"How to Build an Agent"* (abr. 2025) | Constrói um agente funcional em Go em ~400 linhas. Prova que o padrão é independente de linguagem. *"There's no secret. It's an LLM, a loop, and enough tools."* |
| **OpenAI** — *"Harness Engineering"* (fev. 2026) | Leva o conceito a escala industrial: 1M linhas de código, 0 escritas manualmente, 3 engenheiros → 3,5 PRs/dia. *"Building software still demands discipline, but the discipline shows up more in the scaffolding rather than the code."* |
| **OpenAI** — *"Unrolling the Codex Agent Loop"* (2025) | Documentação oficial do loop interno do Codex. |
| **Cursor** — *"Continually Improving Our Agent Harness"* (2026) | Documenta a filosofia de melhoria contínua do harness do Cursor. |

---

## 4. O que é o Pi.dev?

**Pi.dev** é um agente de codificação minimalista e extensível. Diferente do Cursor (que vem pronto), do Claude Code (que é opinionado) e do Codex (que é otimizado para o ecossistema OpenAI), o Pi.dev se posiciona como um **harness base que você projeta**.

### O que o Pi.dev já entrega nativamente

| Componente | Descrição |
|---|---|
| **7 ferramentas core** | `read`, `bash`, `edit`, `write`, `grep`, `find`, `ls` — o conjunto mínimo provado suficiente pelos artigos de referência |
| **Sistema de sessions** | Histórico em JSONL, navegação em árvore, branching, compactação |
| **Skills** | Carregadas sob demanda via `/skill:nome` — equivalente ao `SKILL.md` do Codex |
| **Prompt templates** | Expansão via `/nome` — contexto pré-construído |
| **Extensions** | TypeScript para tools e comandos custom — a camada de customização |
| **Settings** | JSON com override por projeto (equivalente ao `AGENTS.md` por repositório) |

### O que o Pi.dev **não entrega** (e onde entra o harness engineering)

- Sem system prompt otimizado por modelo
- Sem compactação automática de contexto
- Sem permission gates para operações destrutivas
- Sem integração nativa com Git workflow
- Sem detecção automática de stack
- Sem observabilidade de tool calls

Esses são exatamente os gaps que a engenharia de harness preenche.

---

## 5. Lista de Verificação — O que torna Claude Code, Codex e Cursor os harnesses mais poderosos

### ✅ CLAUDE CODE CLI

| Componente | Status | Detalhe |
|---|---|---|
| **Loop do agente** | ✅ | Tool calls nativas via SDK Anthropic |
| **Ferramentas built-in** | ✅ | 24 ferramentas nativas, incluindo bash, read, write, edit, web fetch, browser, e sub-agentes |
| **System prompt em camadas** | ✅ | System prompt de identidade do agente, instruções do harness para output em markdown, permissões e comportamento interativo |
| **CLAUDE.md / AGENTS.md** | ✅ | Injetado no contexto no bootstrap da sessão |
| **Sub-agentes especializados** | ✅ | Agentes de Plan, Explore e Task separados; sistema de "dream" para consolidação de memória |
| **Compactação de contexto** | ✅ | Sumarização de conversa com preservação de instruções de segurança e constraints verbatim |
| **Managed Agents (API)** | ✅ | Harness de agente totalmente gerenciado para rodar Claude de forma autônoma com sandboxing seguro, ferramentas built-in e streaming via server-sent events |
| **Hooks de ciclo de vida** | ✅ | PreToolCall, PostToolCall, Stop |
| **MCP support** | ✅ | Extensível via Model Context Protocol |
| **Skills** | ✅ | Via arquivos `.md` no diretório do projeto |
| **Customização de system prompt** | ✅ | `--system-prompt` e `--append-system-prompt` via CLI |
| **Thinking frequency tuning** | ✅ | System reminder que instrui o Claude a calibrar a frequência de thinking com base na complexidade da tarefa |

**Ponto fraco**: As descrições de ferramentas e system prompts do Claude Code provavelmente nunca foram alteradas desde que o produto foi lançado — o oposto da filosofia de ajuste contínuo do Cursor.

---

### ✅ CODEX CLI (OpenAI)

| Componente | Status | Detalhe |
|---|---|---|
| **Loop do agente** | ✅ | Open source, construído em Rust para velocidade e eficiência |
| **Responses API nativa** | ✅ | `parallel_tool_calls`, `tool_choice` (auto/required/specific), `prompt_cache_key` — features projetadas especificamente para contextos agênticos |
| **Gerenciamento de contexto** | ✅ | O harness estima contagem de tokens para cada mensagem. Quando se aproxima do limite de contexto do modelo, dispara compactação |
| **Zero Data Retention** | ✅ | Stateless request handling para conformidade com Zero Data Retention |
| **AGENTS.md** | ✅ | Suporte a AGENTS.md e MCP facilita adaptar o Codex ao seu repositório e estendê-lo com ferramentas de terceiros |
| **Skills** | ✅ | Com Skills, o Codex vai além de escrever código para contribuir diretamente ao trabalho que transforma PRs em produtos, como entendimento de código, prototipagem e documentação |
| **Automations** | ✅ | Com Automations, o Codex trabalha sem ser solicitado, pegando trabalho rotineiro como triagem de issues, monitoramento de alertas, CI/CD |
| **App Server (multi-surface)** | ✅ | O Codex existe em múltiplas superfícies — web app, CLI, extensão de IDE e app macOS. Por baixo, todos são alimentados pelo mesmo harness do Codex |
| **Sandboxing** | ✅ | Ambientes isolados por sessão |
| **Thread persistence** | ✅ | O Codex cria, resume, faz fork e arquiva threads, e persiste o histórico de eventos para que clientes possam se reconectar e renderizar uma timeline consistente |
| **MCP support** | ✅ | Acesso a ferramentas adicionais de terceiros via Model Context Protocol |
| **Prompt caching** | ✅ | Otimização estratégica de prompt caching para obter performance linear em vez de quadrática |

**Ponto forte**: O codebase do Codex CLI é open source e vale ser estudado — é Rust bem estruturado com testes abrangentes e separação arquitetural clara.

---

### ✅ CURSOR

| Componente | Status | Detalhe |
|---|---|---|
| **Harness por modelo** | ✅ | O harness do Cursor orquestra todos os componentes para cada modelo suportado. Eles ajustam instruções e ferramentas especificamente para cada modelo frontier com base em evals internos e benchmarks externos. |
| **Dynamic Context Discovery** | ✅ | À medida que os modelos melhoraram como agentes, o Cursor teve sucesso fornecendo menos detalhes upfront, deixando o agente buscar contexto relevante por conta própria. Isso é chamado de *dynamic context discovery*, em contraste com contexto estático que é sempre incluído. É muito mais eficiente em tokens e pode melhorar a qualidade da resposta reduzindo informações potencialmente confusas. |
| **Melhoria contínua do harness** | ✅ | Ocasionalmente eles descobrem melhorias de step-change. Mais frequentemente, melhorar o harness é uma questão de obsessivamente empilhar pequenas otimizações que juntas tornam os agentes melhores em construir software. |
| **Ajuste por modelo e provider** | ✅ | A customização vai muito fundo, incluindo prompting customizado para diferentes providers e até versões de modelo. Quando recebem acesso antecipado a um novo modelo, começam do harness do modelo mais próximo existente e iteram — rodando evals offline, tendo pessoas da equipe usando e ajustando o harness em resposta — até ter uma combinação modelo-harness que se sintam bem em lançar. |
| **Parallelism / Worktrees** | ✅ | O Cursor facilita rodar múltiplos agentes em paralelo sem interferirem uns nos outros. Ter múltiplos modelos tentando o mesmo problema e escolhendo o melhor resultado melhora significativamente o output final. O Cursor cria e gerencia git worktrees para agentes paralelos automaticamente. Cada agente roda em seu próprio worktree com arquivos e mudanças isolados. |
| **Context Window management** | ✅ | Quando desenvolveram o agente de codificação em 2024, os modelos eram muito piores em escolher seu próprio contexto, e o Cursor investiu muito em guardrails — como surfacear erros de lint e tipo para o agente após cada edição, reescrever leituras de arquivo quando o agente solicitava linhas demais, e até limitar o número máximo de tool calls por turno. |
| **Redução de tokens MCP** | ✅ | O agente recebe apenas uma pequena parte do contexto estático, incluindo nomes das ferramentas, pedindo que ele busque ferramentas quando a tarefa exigir. Em um A/B test, essa estratégia reduziu o total de tokens do agente em 46,9%. |
| **CursorBench** | ✅ | O Cursor mantém benchmarks públicos ao lado de seu próprio eval suite, o CursorBench, que fornece uma leitura rápida e padronizada de qualidade e permite comparar ao longo do tempo. |
| **Plan Mode** | ✅ | Planejamento explícito antes de codificação |
| **Commands (.cursor/commands/)** | ✅ | Comandos ideais para workflows executados muitas vezes por dia. Armazenados como arquivos Markdown em `.cursor/commands/` e versionados em git para uso de toda a equipe. |
| **Agent-first (Cursor 3)** | ✅ | A Anysphere lançou o Cursor 3, uma interface redesenhada do zero que muda o modelo primário de edição de arquivos para gerenciamento de agentes paralelos. O novo workspace suporta handoff local→cloud, execução paralela multi-repo e um marketplace de plugins. |

---

## 6. Comparativo Final

```
┌─────────────────────┬──────────────┬─────────────┬──────────────┐
│ Dimensão            │ Claude Code  │ Codex CLI   │ Cursor       │
├─────────────────────┼──────────────┼─────────────┼──────────────┤
│ Filosofia           │ Opinionated  │ Open/Rust   │ Iterativo    │
│ Customização        │ Média        │ Alta        │ Alta         │
│ Ajuste por modelo   │ Baixo        │ Médio       │ Altíssimo    │
│ Context mgmt        │ Bom          │ Excelente   │ Excelente    │
│ Multi-agente        │ Sub-agents   │ Paralelo    │ Worktrees    │
│ Open source         │ ❌           │ ✅          │ ❌           │
│ MCP                 │ ✅           │ ✅          │ ✅           │
│ Skills              │ ✅           │ ✅          │ ✅           │
│ Automations         │ ❌           │ ✅          │ Parcial      │
│ Benchmark próprio   │ ❌           │ ❌          │ ✅           │
└─────────────────────┴──────────────┴─────────────┴──────────────┘
```

### O fio condutor entre os três

Harnesses de agentes como Codex e Claude Code ainda são emergentes. As arquiteturas estão convergindo para padrões similares — o loop, o gerenciador de contexto, o registry de ferramentas e o sistema de aprovação.

O que os diferencia hoje não é o loop — todos são iguais. É o **grau de obsessão com o ajuste fino do ambiente**: descrições de ferramentas, system prompts por modelo, gerenciamento de contexto seletivo e feedback loops de qualidade. Harnesses commodificam a "infraestrutura de agentes" e deslocam o esforço para onde ele se compõe: prompts, ferramentas e contexto ajustados para o seu domínio.