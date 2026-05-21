# Reference Doc 9 — Memória de Agentes IA: Karpathy LLM Wiki e agentmemory

> **Fonte**: https://akitaonrails.com/2026/05/18/memoria-agentes-karpathy-llm-wiki-agentmemory/
> **Autor**: Fabio Akita (AkitaOnRails)
> **Data**: 2026-05-18
> **Repositório**: https://github.com/rohitg00/agentmemory

## Resumo

Análise comparativa de como Claude Code, Codex CLI e opencode gerenciam memória de agentes. O post examina o código-fonte dos três e fecha testando o `agentmemory` — um servidor MCP open source que implementa memória persistente de longo prazo.

## Conceitos-chave

### LLM Wiki (Karpathy)

O padrão proposto por Andrej Karpathy para memória de agentes:

- **Ao invés de RAG** (redescobrir conhecimento a cada query), o agente **compila** conhecimento em páginas wiki estruturadas que ele mesmo mantém
- Heavy lifting acontece no **ingest time** (compilação), não no query time
- O formato é Markdown com `[[wiki-links]]` — viewable em Obsidian
- O LLM age como "research librarian" — periódicamente fazendo "lint" do wiki (flagging contradições, atualizando entidades)

### Taxonomia CoALA

Framework de memória baseado em ciência cognitiva, adotado pelo agentmemory:

| Tipo | Descrição | Exemplo |
|---|---|---|
| Working Memory | Observações recentes, contexto ativo | Estado da sessão atual |
| Episodic Memory | Sumários de sessão, eventos passados específicos | "Na sessão X, corrigimos o bug Y" |
| Semantic Memory | Fatos consolidados cross-sessão | "Este projeto usa React 19 com RSC" |
| Procedural Memory | Workflows extraídos, skills, padrões | "Deploy: rodar X, depois Y, depois Z" |

### Ebbinghaus Decay

Modelo de esquecimento exponencial aplicado a memórias de agentes:

- Memórias **decaem exponencialmente** a menos que sejam reforçadas
- **Reforço**: Acessar ou confirmar uma memória reseta sua curva de decay
- **Retenção por tier**: Decisões de arquitetura decaem lentamente; bugs transitórios decaem rápido
- Previne o efeito "junk drawer" — memórias stale desaparecem naturalmente

### Comparação de memória entre harnesses

| Feature | Claude Code | OpenCode | agentmemory |
|---|---|---|---|
| Primary memory | CLAUDE.md + /memory dir | Configurable | MCP server centralizado |
| Cross-agent sharing | Não | Não | Sim |
| Memory decay | Não | Não | Sim (Ebbinghaus) |
| Knowledge graph | Não | Não | Sim |
| Busca | Flat file | Incremental summaries | Híbrida (BM25 + vetores + graph) |

## Relevância para o kit

- O kit implementa **duas camadas de memória**: `auto-memory` extension (#016, MEMORY.md leve) + skill `agent-memory` (#017, integração opcional com agentmemory MCP server)
- O `context-mode` já provê session continuity via SQLite+FTS5 — agentmemory complementa com memória cross-sessão e cross-agente
- O padrão Ebbinghaus decay resolve o problema documentado no PRD: "Risk of context overload and hallucination from stale notes"
