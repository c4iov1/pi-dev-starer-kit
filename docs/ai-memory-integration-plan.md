# Plano — integrar ai-memory ao Pi.dev Starter Kit

## Objetivo

Substituir a integração opcional com `agentmemory` por uma integração opcional com o upstream `akitaonrails/ai-memory`, sem fork e sem copiar código. O kit deve ensinar, configurar e validar o uso do serviço externo com lifecycle hooks nativos do Pi e comandos de administração.

## Decisão de arquitetura

- **Não adicionar `ai-memory` em `dependencies` do `package.json`**: é um serviço externo Docker/binário, não um pacote Pi.dev.
- **Não substituir `auto-memory`**: `auto-memory` segue como fallback local zero-infra em `MEMORY.md`.
- **Adicionar skill `ai-memory`**: instruções de quando usar `memory_query`, `memory_explore`, `memory_handoff_begin`, `memory_consolidate`, etc.
- **Adicionar template opcional `.ai-memory.toml`** para workspace/project routing.
- **Pi-native hooks**: não usar `~/.omp` nem instaladores Oh My Pi. A extension do kit posta eventos Pi (`session_start`, `before_agent_start`, `tool_call`, `tool_result`, `session_before_compact`, `session_shutdown`) para o endpoint `/hook` do ai-memory.

## Pesquisa resumida

### Problemas do agentmemory identificados no post

- BM25 reindexava em restart quando a persistência falhava.
- Debounce de persistência criava janela de perda de dados.
- Configuração inconsistente dificultava operação.
- Hooks errados perdiam tool calls silenciosamente.
- State store dependia do cwd do chamador.
- Arquitetura com múltiplos processos/portas/índices em memória era frágil.

### Por que ai-memory é melhor encaixe

- Rust single binary + SQLite/FTS5 + Markdown/git como fonte da verdade.
- Hooks fire-and-forget; se o servidor estiver offline, o agente continua.
- Handoff/memória entre agentes via servidor central; para Pi, captura é feita pela extension do kit.
- LLM/embeddings opcionais, evitando custo/complexidade obrigatória.
- Ferramentas MCP explícitas e pequenas para consulta/manutenção.

## Escopo de implementação

1. **Remoção completa de agentmemory** — concluído
   - Remover `skills/agent-memory/`.
   - Remover issue/documentos que recomendam `rohitg00/agentmemory`.
   - Atualizar PRD/arquitetura/AGENTS para não listar `agent-memory`.

2. **Nova skill `ai-memory`** — implementada em `skills/ai-memory/SKILL.md`
   - Criar `skills/ai-memory/SKILL.md`.
   - Conteúdo:
     - Setup rápido com Docker + wrapper upstream.
     - Setup Pi-native:
       - iniciar servidor Docker upstream;
       - instalar routing em `AGENTS.md`;
       - lifecycle capture feito por `extensions/setup-ai-memory/index.ts`.
     - Healthcheck: `ai-memory status` e `curl http://127.0.0.1:49374/web` quando web habilitado.
     - Uso das tools MCP:
       - `memory_query`: decisões/gotchas anteriores.
       - `memory_explore`: catch-up.
       - `memory_handoff_begin`: preparar próxima sessão quando não houver hook de session-end.
       - `memory_recent`/`memory_briefing`: recuperar contexto após compaction.
       - `memory_write_page`: só quando usuário pedir memória durável explícita.
     - Fallback para `auto-memory` se tools MCP não existirem.

3. **Templates** — implementados
   - Criar `templates/ai-memory.toml.template` com exemplos:
     - workspace padrão por cliente/time.
     - `project_strategy = "repo-root"` para monorepos/worktrees.
   - Atualizar `templates/AGENTS.template.md` com bloco opcional de routing ou instruir a rodar `ai-memory install-instructions --target AGENTS.md`.

4. **Documentação** — implementada
   - Atualizar `docs/architecture.md` com seção “Integração opcional: ai-memory”.
   - Atualizar `docs/prd.md` para listar a skill `ai-memory` (se aprovada) e remover `agent-memory`.
   - Manter `docs/references/9-ai-memory.md` como síntese dos links pesquisados.

5. **Validação**
   - Smoke local sem servidor: skill deve orientar fallback para `auto-memory`.
   - Smoke com servidor:
     - iniciar container upstream;
     - verificar `/ai-memory-status`;
     - confirmar que hooks Pi postam para `/hook` sem quebrar a sessão;
     - chamar comandos administrativos quando necessário;
     - confirmar que `auto-memory` não conflita.

## Comando do kit

```text
/setup-ai-memory
```

Flags úteis:

- `--dry-run`: mostra comandos sem executar.
- `--skip-server`: não inicia container local; use quando o servidor é remoto.
- `--skip-routing`: não altera `AGENTS.md`.
- `--force-wrapper`: baixa novamente o wrapper upstream.

Comandos administrativos adicionais:

- `/ai-memory-status`
- `/ai-memory-upgrade`
- `/ai-memory-bootstrap [flags]`
- `/ai-memory-backup [flags]`
- `/ai-memory-lint [flags]`
- `/ai-memory-forget-sweep [flags]`

## Comandos upstream recomendados

```bash
mkdir -p ~/.local/bin
curl -fsSL https://raw.githubusercontent.com/akitaonrails/ai-memory/main/bin/ai-memory \
  -o ~/.local/bin/ai-memory
chmod +x ~/.local/bin/ai-memory

# Servidor local loopback, sem auth para laptop single-user.
docker run --platform linux/amd64 -d --name ai-memory \
  --restart unless-stopped \
  -p 127.0.0.1:49374:49374 \
  -v ai-memory-data:/data \
  akitaonrails/ai-memory:latest

# Nota: --platform linux/amd64 contorna a ausência de manifest arm64 no upstream.

# Pi-native: a extension do starter kit posta hooks diretamente.
# Opcional: instalar routing no AGENTS.md do projeto.
ai-memory install-instructions --target AGENTS.md
```

## Decisões respondidas

1. **Nome da skill: `ai-memory`**
   - Não manter compatibilidade nominal com `agent-memory`, para não carregar a associação com `agentmemory`.

2. **Quando o usuário instala/usa o serviço**
   - `ai-memory` é para usuários que querem memória persistente sempre ativa entre sessões, projetos longos e handoff cross-agent.
   - Cenários principais:
     - alternar entre Pi, Claude Code, Codex, OpenCode, Cursor ou Gemini no mesmo projeto;
     - parar uma tarefa hoje e retomar dias/semanas depois sem reexplicar contexto;
     - consultar decisões antigas, gotchas e pesquisas já feitas;
     - bootstrap de projetos existentes com meses de histórico;
     - manter wiki de memória navegável em Markdown/git.
   - Depois de instalado, o **serviço fica ativo o tempo todo** via servidor + hooks. A skill não “liga” a memória; ela só ensina o agente a consultar/manter a memória quando necessário.

3. **Automação pelo kit**
   - O kit não deve instalar automaticamente o servidor durante `pi install`, porque isso rodaria Docker, poderia exigir tokens LLM/auth e mudaria estado fora do projeto atual.
   - O kit deve, porém, oferecer um caminho de setup explícito e fácil: documentação + skill + comandos idempotentes upstream.
   - O kit adiciona o comando opt-in `/setup-ai-memory` e comandos administrativos que orquestram o upstream com confirmação explícita do usuário ao invocar.
