# Reference Doc 9 — ai-memory (Akita) para memória de agentes

> **Fonte principal**: https://akitaonrails.com/2026/05/23/criei-sistema-memoria-agentes-codigo-ai-memory/
> **Repositório**: https://github.com/akitaonrails/ai-memory

## Por que remover agentmemory

Akita relata que o `agentmemory` tinha boas ideias (LLM Wiki de Karpathy, consolidação, hooks automáticos, MCP), mas problemas estruturais em uso diário:

- Reindexação BM25 em todo restart quando a persistência do índice falha, causando minutos de rebuild.
- Janela de perda de dados por debounce de 5s + timeout de persistência que pode derrubar o processo Node.
- Caminhos inconsistentes de leitura de configuração (`process.env` vs helper), tornando env vars não confiáveis.
- Hook incorreto para parte das tool calls do Claude Code (`tool_output` vs `tool_response`), perdendo observações silenciosamente.
- Engine rodando no cwd do chamador, causando state stores diferentes em Windows/terminais distintos.
- Arquitetura complexa demais para o problema: TypeScript MCP + iii-engine Rust separado + múltiplos processos/portas + índices em memória persistidos via KV remoto.

## O que o ai-memory propõe

- Um binário Rust único com servidor Axum HTTP/MCP.
- Markdown em disco como source of truth, versionado por git.
- SQLite + FTS5 como índice derivado, WAL mode e writer único via mpsc.
- Hooks fire-and-forget para capturar prompts, tool calls, compaction e boundaries de sessão.
- Handoff cross-agent: sair do Claude Code e continuar no Codex/Pi/OpenCode no mesmo diretório.
- MCP tools para consulta (`memory_query`, `memory_explore`, `memory_recent`, `memory_status`), handoff e manutenção.
- LLM/embeddings opcionais: sem chave ainda funciona com FTS5 e resumo rule-based; com LLM melhora consolidação.
- Isolamento por workspace/projeto via UUIDs e `.ai-memory.toml`.
- Suporte a múltiplos agentes. Para Pi.dev, o starter kit usa hooks nativos de extension em vez de arquivos `~/.omp`.

## Implicação para o kit

O kit não deve fork/copy o ai-memory. Deve tratá-lo como serviço externo opcional, instalado diretamente do upstream, e fornecer apenas:

1. Documentação de setup e operação.
2. Skill/instruções leves para roteamento de uso das MCP tools quando disponíveis.
3. Template opcional de `.ai-memory.toml`.
4. Healthcheck/diagnóstico e comandos administrativos que não bloqueiem o agente quando o serviço está offline.
5. Extension Pi-native que posta lifecycle events para `/hook`.

`auto-memory` continua como fallback zero-infra (`MEMORY.md`) para usuários que não querem Docker/servidor externo.
