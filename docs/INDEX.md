# Knowledge Map — Pi.dev Starter Kit

## Ponto de Partida

- **`AGENTS.md`**: Instruções para agentes. Estrutura do projeto, regras não-negociáveis, comandos.
- **`CONTEXT.md`**: Glossário do domínio. Termos como "Starter Kit", "Progressive Disclosure", "Think-in-Code".
- **`repo_init.md`**: Setup do ambiente de desenvolvimento + prompt inicial para começar a codar.

## Especificação

- **`docs/architecture.md`**: Arquitetura completa do kit. 4 camadas (Contexto, Ferramentas, Workflow, Extensibilidade), diagramas, comparação com Claude Code/Codex/OpenCode/Oh-My-Pi.
- **`docs/prd.md`**: Product requirements. User stories, módulos, testing decisions, out of scope.
- **`docs/akita-harness-ideas-plan.md`** / **`docs/akita-harness-ideas-plan.pt-BR.md`**: Plano Akita com gaps, decisões técnicas, discoverability e sequência de implementação.
- **`docs/steering-profiles.md`**: Perfis `steeringMode`, `interruptMode`, `compactionStrategy`.
- **`docs/provider-guidance.md`**: Guidance seguro de providers/subscriptions sem hacks de OAuth.
- **`docs/ai-memory-integration-plan.md`**: Plano de integração do serviço externo `akitaonrails/ai-memory`.

## Decisões

- **`docs/adr/`**: Architecture Decision Records. Criar conforme decisões são tomadas durante o desenvolvimento.

## Referências Externas

- **`docs/references/1-anatomy-harness.md`**: "The Anatomy of an Agent Harness" — definição de harness e derivação de componentes (LangChain, 2026).
- **`docs/references/4-harness-reference.md`**: "Engenharia de Harness — Documento de Referência" — benchmark comparativo Claude Code vs Codex vs Cursor vs Pi.dev.
- **`docs/references/5-pi-dev-doc.md`**: Manual técnico do Pi.dev — extensions, skills, sessions, SDK, packages.
- **`docs/references/8-mattpocock-skills.md`**: Manual do mattpocock/skills — formato SKILL.md, workflow canônico, feedback loops.
- **`docs/references/9-ai-memory.md`**: Memória de agentes IA — problemas do agentmemory, Karpathy LLM Wiki, e plano de adoção do ai-memory de Akita.

## Issue Tracker

- **`.scratch/pi-dev-starter-kit/`**: Issues originais do starter kit.
- **`.scratch/ai-harness-akita/`**: Tasks detalhadas da implementação inspirada no post do Akita (doctor, artifact-read, AST tools, LSP symbol ops, source navigation, steering profiles, review-matrix, provider guidance).

## Estrutura do Repositório

```
pi-dev-starter-kit/
├── AGENTS.md, CONTEXT.md, repo_init.md    # Root docs
├── package.json                            # Pi.dev manifest (output)
├── SYSTEM.md, APPEND_SYSTEM.md             # System prompt (output)
├── extensions/                             # Extensions core + Akita tools + ai-memory setup
├── skills/                                 # Skills autorais + Akita workflows + mattpocock
├── prompts/                                # Prompt templates, incluindo review-matrix
├── templates/                              # Project templates + ai-memory config
├── docs/                                   # Specs + references
└── .scratch/                               # Issues
```
