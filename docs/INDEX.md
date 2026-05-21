# Knowledge Map — Pi.dev Starter Kit

## Ponto de Partida

- **`AGENTS.md`**: Instruções para agentes. Estrutura do projeto, regras não-negociáveis, comandos.
- **`CONTEXT.md`**: Glossário do domínio. Termos como "Starter Kit", "Progressive Disclosure", "Think-in-Code".
- **`repo_init.md`**: Setup do ambiente de desenvolvimento + prompt inicial para começar a codar.

## Especificação

- **`docs/architecture.md`**: Arquitetura completa do kit. 4 camadas (Contexto, Ferramentas, Workflow, Extensibilidade), diagramas, comparação com Claude Code/Codex.
- **`docs/prd.md`**: Product requirements. 27 user stories, módulos, testing decisions, out of scope.

## Decisões

- **`docs/adr/`**: Architecture Decision Records. Criar conforme decisões são tomadas durante o desenvolvimento.

## Referências Externas

- **`docs/references/1-anatomy-harness.md`**: "The Anatomy of an Agent Harness" — definição de harness e derivação de componentes (LangChain, 2026).
- **`docs/references/4-harness-reference.md`**: "Engenharia de Harness — Documento de Referência" — benchmark comparativo Claude Code vs Codex vs Cursor vs Pi.dev.
- **`docs/references/5-pi-dev-doc.md`**: Manual técnico do Pi.dev — extensions, skills, sessions, SDK, packages.
- **`docs/references/8-mattpocock-skills.md`**: Manual do mattpocock/skills — formato SKILL.md, workflow canônico, feedback loops.
- **`docs/references/9-agentmemory-karpathy-wiki.md`**: Memória de agentes IA — Karpathy LLM Wiki, taxonomia CoALA, Ebbinghaus decay, agentmemory MCP server.

## Issue Tracker

- **`.scratch/pi-dev-starter-kit/`**: 17 issues ordenadas por dependência. Fase 2 (#003–#006, #015, #016) roda em paralelo. Fase 3–4 (#007–#010, #017) roda em paralelo.

## Estrutura do Repositório

```
pi-dev-starter-kit/
├── AGENTS.md, CONTEXT.md, repo_init.md    # Root docs
├── package.json                            # Pi.dev manifest (output)
├── SYSTEM.md, APPEND_SYSTEM.md             # System prompt (output)
├── extensions/                             # 8 extensions (output)
├── skills/                                 # 21 skills (output: 7 autorais + 14 mattpocock)
├── prompts/                                # 4 prompt templates (output)
├── templates/                              # 5 project templates (output)
├── docs/                                   # Specs + references
└── .scratch/                               # Issues
```
