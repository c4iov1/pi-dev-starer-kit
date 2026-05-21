

# Pi — Manual Técnico de Harness

> **Stack**: `earendil-works/pi` (monorepo MIT). Pacote principal: `@earendil-works/pi-coding-agent`.
> O domínio `pi.dev` é cedido por `exe.dev`. Pi é um *minimal terminal coding harness*.
> `pi-ai` cuida da comunicação com LLMs multi-provider; `pi-agent-core` adiciona o agent loop com tool calling; `pi-coding-agent` entrega o agente completo com built-in tools, session persistence e extensibilidade; `pi-tui` provê a terminal UI.

---

## 1. Filosofia de Design

**Sem MCP** — use Skills (CLI tools com READMEs) ou escreva uma extension que adicione MCP. **Sem sub-agents** — spawne instâncias via tmux ou construa com extensions. **Sem permission popups** — rode em container ou construa seu próprio fluxo de confirmação via extensions. **Sem plan mode** — escreva planos em arquivos ou construa com extensions. Todos esses padrões estão disponíveis como exemplos de extensions (50+ exemplos fornecidos).

Os built-in tools shipped são: `read`, `bash`, `edit`, `write`, `grep`, `find` e `ls`. O projeto trata o core como algo para adaptar, não um produto selado.

---

## 2. Providers & Models

Pi suporta Anthropic, OpenAI, Google, Azure, Bedrock, Mistral, Groq, Cerebras, xAI, Hugging Face, Kimi, MiniMax, OpenRouter, Ollama e mais — ao contrário de Claude Code (Anthropic-only) ou GitHub Copilot (tied to GitHub/OpenAI).

Providers customizados: adicione via `~/.pi/agent/models.json` se falam API suportada (OpenAI, Anthropic, Google). Para APIs customizadas ou OAuth, use extensions.

OAuth login suportado: use subscrições existentes (Claude Pro/Max, ChatGPT Plus/Pro, GitHub Copilot, Google Gemini CLI) em vez de apenas API keys.

Todas as credenciais ficam em `~/.pi/agent/auth.json` com permissões `0o600`. File locking via `proper-lockfile` previne race conditions em refresh de tokens simultâneos. Pi **não** usa macOS Keychain, keytar ou qualquer OS-level credential store. Prioridade de resolução: runtime override → auth.json → env var → fallback resolver.

O campo `transport` seleciona preferência de transporte do provider (`"sse"`, `"websocket"` ou `"auto"`) para providers que suportam múltiplos transportes.

Mid-session switching: `/model` ou `Ctrl+L`. `Ctrl+P` cicla uma lista de favoritos com escopo (`/scoped-models`).

---

## 3. Modos de Execução

Pi roda em quatro modos: **interactive**, **print** ou **JSON**, **RPC** para integração de processos, e **SDK** para embedding em suas próprias apps.

| Modo | Flag | Descrição |
|---|---|---|
| Interactive | *(default)* | TUI completa no terminal |
| Print/JSON | `--mode json` | Newline-delimited JSON events |
| RPC | `--mode rpc` | JSONL over stdin/stdout |
| SDK | — | Import direto do pacote TypeScript |

`--export [out]` escreve uma session em HTML sem acionar a interactive UI.

---

## 4. Sessions

### 4.1 Formato de Armazenamento

Sessions são armazenadas como arquivos JSONL (JSON Lines). Cada linha é um JSON object com um campo `type`. Entries formam uma **árvore** via campos `id`/`parentId`, habilitando branching in-place sem criar novos arquivos.

Path de armazenamento: `~/.pi/agent/sessions/--<path>--/<timestamp>_<uuid>.jsonl`, onde `<path>` é o working directory com `/` substituído por `-`.

### 4.2 Tipos de Entry

**SessionEntryBase** (base de todos exceto SessionHeader):
```typescript
interface SessionEntryBase {
  type: string;
  id: string;        // 8-char hex ID
  parentId: string | null;  // null no primeiro entry
  timestamp: string; // ISO timestamp
}
```
O **SessionHeader** é a primeira linha do arquivo — metadata only, sem `id`/`parentId`.

Exemplo de header de session com parent (fork/clone):
```json
{
  "type": "session", "version": 3, "id": "uuid",
  "timestamp": "...", "cwd": "/path/to/project",
  "parentSession": "/path/to/original/session.jsonl"
}
```

**Union de tipos de entry disponíveis:**


- `message` — mensagem na conversa (user/assistant/tool result)
- `model_change` — emitido quando o usuário troca de model mid-session
- `thinking_level_change` — emitido ao mudar nível de reasoning
- `compaction` — armazena summary de mensagens anteriores; inclui `summary`, `firstKeptEntryId`, `tokensBefore`
- `branch_summary` — criado ao navegar entre branches distantes com summary LLM-gerado da branch anterior
- `custom` — entry de dados arbitrários de extension
- `custom_message` — mensagem injetada por extension no contexto LLM
- `label` — bookmark em entry específico


Sessions legadas são automaticamente migradas para a versão atual (v3) ao carregar.

### 4.3 Session Management — CLI


```bash
pi -c              # continua a session mais recente
pi -r              # browse e seleciona sessions passadas
pi --no-session    # modo efêmero (não salva)
pi --session <id>  # usa session específica por path ou ID
pi --fork <id>     # fork de session específica em nova session
```


### 4.4 Branching & Tree Navigation

Pi-agent usa formato tree-structured JSONL para persistir interações. Essa arquitetura permite histórico não-linear (forking/branching) dentro de um único arquivo de session, appending eficiente de novos eventos e migração automática entre versões.

`/fork` cria um novo `.jsonl` partindo do estado atual, efetivamente "detachando" o branch em sua própria session. **Branch Summarization**: ao mover entre branches distantes, o sistema pode gerar um `BranchSummaryEntry` para carregar contexto do branch "esquerdo" para o "direito".

O `SessionSelectorComponent` (via `pi --resume` ou `/resume`) provê TUI para busca e restauração de sessions. Suporta fuzzy matching, frases exatas (com aspas) e Regex (`re:<pattern>`).

### 4.5 SessionManager — API interna


- `appendEntry(entry)` — persiste novo entry no JSONL e atualiza a árvore in-memory
- `getTree()` — retorna cópia defensiva da session como `SessionTreeNode` hierárquico
- `getBranch(leafId)` — resolve o caminho linear de um leaf específico até a raiz, filtrando entries fora daquele branch
- `fork(entryId)` — cria novo arquivo de session a partir de um ponto específico


`buildSessionContext()` é chamado para reconstruir o array de mensagens para o LLM. Se um `CompactionEntry` está presente no branch, as mensagens anteriores ao seu `firstKeptEntryId` são omitidas e substituídas pelo compaction summary.

---

## 5. Compaction

Compaction sumariza mensagens antigas mantendo as recentes. Manual: `/compact` ou `/compact <custom instructions>`. Automático: habilitado por padrão. Dispara em context overflow (recupera e retenta) ou ao se aproximar do limite (proativo).

**Compaction é lossy.** O histórico completo permanece no JSONL; use `/tree` para revisitar.

O built-in compaction de pi é simples e eficaz, mas ainda é um passo de sumarização single-pass.

### 5.1 Hooks de Compaction via Extension


```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, signal } = event;
  // Cancelar: return { cancel: true };
  // Summary customizado:
  return {
    compaction: {
      summary: "...",
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
    }
  };
});

pi.on("session_compact", async (event, ctx) => {
  // event.compactionEntry - a compaction salva
  // event.fromExtension - se a extension proveu
});
```


---

## 6. Extensions

Extensions são módulos TypeScript que estendem o comportamento de pi. Podem subscrever lifecycle events, registrar custom tools chamáveis pelo LLM, adicionar commands e mais.

Extensions são escritas em TypeScript e carregadas dinamicamente **sem compilação**.

Extensions são descobertas em `~/.pi/agent/extensions/` (global) e `.pi/extensions/` (project-local). A função `discoverAndLoadExtensions` usa **jiti** para carregar os módulos TypeScript, provendo um ambiente virtualizado que inclui pacotes core como `@mariozechner/pi-coding-agent` e `@sinclair/typebox`.

### 6.1 Estrutura mínima

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => { ... });
  pi.registerTool({ ... });
  pi.registerCommand("name", { ... });
  pi.registerShortcut("ctrl+x", { ... });
  pi.registerFlag("my-flag", { ... });
}
```

Estrutura de diretório de uma extension:
```
~/.pi/agent/extensions/
└── my-extension/
    ├── index.ts   # Entry point (exports default function)
    ├── tools.ts
    └── utils.ts
```


### 6.2 ExtensionAPI — Métodos de Registro

A API provê três grupos funcionais: **Registration methods** — `on()`, `registerTool()`, `registerCommand()`, `registerShortcut()`, `registerFlag()`, `registerMessageRenderer()`. **Flag access** — `getFlag()` para ler valores de configuração.

Gerenciamento de tools ativas:
```typescript
const active = pi.getActiveTools(); // ["read", "bash", "edit", "write"]
const all = pi.getAllTools();
pi.setActiveTools(["read", "bash"]); // Switch para read-only
```


Controle de modelo e thinking level:
```typescript
const model = ctx.modelRegistry.find("anthropic", "claude-sonnet-4-5");
await pi.setModel(model); // retorna false se sem API key

const current = pi.getThinkingLevel(); // "off"|"minimal"|"low"|"medium"|"high"|"xhigh"
pi.setThinkingLevel("high"); // clampado às capacidades do modelo

// Event bus compartilhado entre extensions:
pi.events.on("my:event", (data) => { ... });
```


### 6.3 ExtensionContext (ctx) — Disponível nos handlers


```typescript
ctx.sessionManager.getEntries()  // todos os entries
ctx.sessionManager.getBranch()   // branch atual
ctx.sessionManager.getLeafId()   // ID do leaf entry atual
```


`ctx.signal` — AbortSignal atual do agente, ou `undefined` quando nenhum turn ativo. Definido durante eventos de turn ativo (`tool_call`, `tool_result`, `message_update`, `turn_end`). Geralmente `undefined` em contextos idle (`session events`, `extension commands`, `shortcuts` disparados enquanto pi está idle).

`ctx.getContextUsage()` — retorna uso de contexto atual para o model ativo. Usa último `assistant usage` quando disponível, depois estima tokens para mensagens trailing:
```typescript
const usage = ctx.getContextUsage();
if (usage && usage.tokens > 100_000) { ... }
```


### 6.4 Lifecycle Events — Sequência completa


```
startup
  └─► session_start { reason: "startup" }
      └─► resources_discover { reason: "startup" }

/fork ou /clone
  ├─► session_before_fork   (pode cancelar)
  ├─► session_shutdown
  ├─► session_start { reason: "fork", previousSessionFile }
  └─► resources_discover { reason: "startup" }

/compact ou auto-compaction
  ├─► session_before_compact  (pode cancelar ou customizar)
  └─► session_compact

/tree navigation
  ├─► session_before_tree   (pode cancelar ou customizar)
  └─► session_tree

/model ou Ctrl+P
  ├─► thinking_level_select  (se troca de model altera thinking level)
  └─► model_select

exit (Ctrl+C, Ctrl+D, SIGHUP, SIGTERM)
  └─► session_shutdown
```


### 6.5 State Persistence entre branches

Extensions com estado devem armazená-lo em `tool result details` para suporte correto a branching — reconstruindo-o em `session_start` iterando sobre o branch atual.

### 6.6 UI — Primitivas disponíveis


- `ctx.ui.custom()` — full TUI components com keyboard input para interações complexas
- `pi.registerCommand()` — registra comandos como `/mycommand`
- `pi.appendEntry()` — session persistence, sobrevive a restarts
- Controle de como tool calls/results e mensagens aparecem na TUI


No UI Phase, extensions podem requisitar user input ou exibir status via `ctx.ui`. No **interactive mode** renderiza componentes TUI; no **RPC mode** traduz essas requisições em JSON messages para o client remoto.

---

## 7. Skills

Skills são pacotes de capability on-demand — **progressive disclosure sem bustar o prompt cache**.

Skills são extensions especializadas definidas via arquivos `SKILL.md`. O `ResourceLoader` descobre essas skills e as injeta no system prompt via YAML frontmatter.

Extensions podem registrar custom commands; skills ficam disponíveis como `/skill:name`; prompt templates expandem via `/templatename`.

Sessions seguem o **Agent Skills standard** (`agentskills.io`) para definições de skill.

---

## 8. Prompt Templates

Prompts reutilizáveis como arquivos Markdown. Tipo `/name` para expandir.

```markdown
<!-- ~/.pi/agent/prompts/review.md -->
Review this code for bugs, security issues, and performance problems.
```

Substitua o default system prompt com `.pi/SYSTEM.md` (project) ou `~/.pi/agent/SYSTEM.md` (global). Anexe sem substituir via `APPEND_SYSTEM.md`.

Pi carrega `AGENTS.md` (ou `CLAUDE.md`) ao startup de múltiplos locais. Todos os arquivos encontrados são concatenados.

---

## 9. Context Engineering — Camadas de Controle

Pi adota abordagem de **"context engineering"** com system prompt deliberadamente mínimo e múltiplas camadas de controle:
- `AGENTS.md / CLAUDE.md` — project instructions carregadas ao startup
- `SYSTEM.md` — substitui ou anexa ao default system prompt por projeto
- **Skills** — capability packages on-demand
- **Prompt Templates** — prompts Markdown reutilizáveis expandidos via `/name`
- **Dynamic context via extensions** — injeta mensagens antes de cada turn, filtra histórico, implementa RAG ou long-term memory
- **Customizable compaction** — auto-sumariza mensagens antigas; totalmente overridable


---

## 10. Packages

Estrutura de um Pi Package (`package.json`):
```json
{
  "name": "my-pi-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```
Sem manifest `pi`, pi auto-descobre a partir de diretórios convencionais (`extensions/`, `skills/`, `prompts/`, `themes/`).

Git packages instalam dependências com `npm install --omit=dev` por padrão, portanto runtime deps devem estar listadas em `dependencies`. Se usar Node version manager, configure `npmCommand` em `settings.json`.

---

## 11. RPC Mode

Quando executado com `--rpc`, pi opera como serviço headless JSON-over-stdio. Lê JSON commands do stdin, escreve JSON events/responses no stdout.

RPC mode usa semântica JSONL estrita com LF (`\n`) como único delimitador de records.

Clientes devem splittar records em `\n` apenas. **Não use** readers genéricos como Node `readline`, que também splitta em Unicode separators (`U+2028`, `U+2029`) presentes dentro de JSON payloads.

### 11.1 Comandos RPC disponíveis

**`prompt`** — envia um user prompt ao agente. A resposta do comando é emitida após o prompt ser aceito, enfileirado ou tratado. Events continuam streamando assincronamente após a aceitação:
```json
{"id": "req-1", "type": "prompt", "message": "Hello, world!"}
```


Todos os comandos suportam campo `id` opcional para correlação request/response. Se provido, a resposta correspondente incluirá o mesmo `id`.

**`get_state`** — retorna estado atual da session:
```json
{
  "type": "response", "command": "get_state", "success": true,
  "data": {
    "model": {...}, "thinkingLevel": "medium",
    "isStreaming": false, "isCompacting": false,
    "steeringMode": "all", "followUpMode": "one-at-a-time",
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123", "sessionName": "my-feature-work",
    "autoCompactionEnabled": true
  }
}
```


**`get_commands`** — retorna commands disponíveis (extension commands, prompt templates e skills). Podem ser invocados via command `prompt` prefixando com `/`.

Skill commands e prompt templates são expandidos no RPC. Extension commands **não são permitidos** (use `prompt` em vez disso).

Events são streamados para stdout como JSON lines durante a operação do agente.

### 11.2 Steering & Follow-up


- **Enter** — enfileira steering message, entregue após o assistant turn terminar seus tool calls
- **Alt+Enter** — enfileira follow-up, entregue apenas após o agente finalizar todo o trabalho


`steeringMode` e `followUpMode` podem ser `"one-at-a-time"` (default, aguarda resposta) ou `"all"` (entrega todos de uma vez).

---

## 12. SDK

Para Node.js/TypeScript: use `AgentSession` diretamente de `@earendil-works/pi-coding-agent` em vez de spawnar subprocesso. Veja `src/core/agent-session.ts` para a API.

Uso básico do SDK:
```typescript
import { AuthStorage, createAgentSession, ModelRegistry, SessionManager }
  from "@earendil-works/pi-coding-agent";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage,
  modelRegistry,
});

await session.prompt("What files are in the current directory?");
```


Use a runtime API quando precisar substituir a session ativa e reconstruir runtime state bound a cwd. É a mesma camada usada pelos modos built-in: interactive, print e RPC. `createAgentSessionRuntime()` recebe uma runtime factory mais o cwd/session target inicial. A factory fecha sobre inputs fixos global-process, recria serviços bound a cwd, resolve session options contra esses serviços e retorna um runtime result completo.

### 12.1 Exports do SDK


```typescript
// Factories
createAgentSession
createAgentSessionRuntime
AgentSessionRuntime

// Auth e Models
AuthStorage
ModelRegistry

// Resource loading
DefaultResourceLoader
type ResourceLoader
createEventBus

// Helpers
defineTool

// Session management
SessionManager
SettingsManager

// Built-in tools (usam process.cwd())
codingTools, readOnlyTools
readTool, bashTool, editTool, writeTool
grepTool, findTool, lsTool

// Tool factories (para custom cwd)
createCodingTools, createReadOnlyTools
createReadTool, createBashTool, createEditTool, createWriteTool
createGrepTool, createFindTool, createLsTool

// Types
type CreateAgentSessionOptions
type CreateAgentSessionResult
type ExtensionFactory
type ExtensionAPI
type ToolDefinition
type Skill
type PromptTemplate
type Tool
```


### 12.2 Steering e Follow-up via SDK


```typescript
// Steering: entregue após o turn atual finalizar seus tool calls
await session.steer("New instruction");

// Follow-up: entregue apenas quando o agente parar
await session.followUp("After you're done, also do this");
```
Ambos expandem prompt templates file-based mas erram em extension commands (não podem ser enfileirados).


A classe `Agent` (de `@earendil-works/pi-agent-core`) cuida da interação core com o LLM. Acesse via `session.agent`.

---

## 13. JSON Mode

`--mode json` — newline-delimited JSON events. `--mode rpc` — JSONL over stdin/stdout.

No JSON mode, todos os eventos do agente são emitidos como JSON lines para stdout — adequado para pipelines de CI/CD ou processos que consomem output do agente sem controle bidirecional (ao contrário do RPC, que é full-duplex).

---

## 14. Telemetria & Rede

Telemetria de install/update: após primeiro install ou update detectado via changelog, envia um ping anônimo de versão para `https://pi.dev/api/report-install`. Opt-out: `enableInstallTelemetry: false` em `settings.json` ou `PI_TELEMETRY=0`. Isso **não** desabilita update checks; pi ainda pode contatar `pi.dev` pela versão mais recente, a menos que update checks sejam desabilitados ou offline mode habilitado.

Pi respeita `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, `https_proxy`, `no_proxy`, `NO_PROXY` via `undici`'s `EnvHttpProxyAgent`.

---

## 15. Configuração — Hierarquia de Arquivos

| Arquivo | Escopo | Função |
|---|---|---|
| `~/.pi/agent/settings.json` | Global | Settings gerais |
| `.pi/settings.json` | Project | Override local |
| `~/.pi/agent/models.json` | Global | Providers/models customizados |
| `~/.pi/agent/auth.json` | Global | Credenciais (`0o600`) |
| `~/.pi/agent/SYSTEM.md` | Global | System prompt global |
| `.pi/SYSTEM.md` | Project | System prompt de projeto (substitui) |
| `APPEND_SYSTEM.md` | Project | Anexa ao system prompt |
| `AGENTS.md` / `CLAUDE.md` | Project | Instruções de projeto (concatenadas) |
| `~/.pi/agent/keybindings.json` | Global | Keybindings customizados |

Project-level override: `.pi/settings.json`, `.pi/extensions/`, `.pi/skills/` permitem comportamento de agente específico por projeto.

---

## Sumário da Arquitetura em Camadas

```
┌─────────────────────────────────────────────┐
│           Interactive / Print / JSON / RPC  │  ← Modos de execução
├─────────────────────────────────────────────┤
│     pi-coding-agent  (harness principal)    │
│  ┌────────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Extensions │  │  Skills  │  │Prompts  │ │  ← Camada de extensibilidade
│  └────────────┘  └──────────┘  └─────────┘ │
│  ┌─────────────────────────────────────────┐│
│  │  SessionManager  (JSONL tree, branches) ││  ← Persistência
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │  Compaction  (context budget control)   ││  ← Context engineering
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│     pi-agent-core  (agent loop + tools)     │
├─────────────────────────────────────────────┤
│     pi-ai  (provider abstraction layer)     │  ← Anthropic/OpenAI/Google/...
└─────────────────────────────────────────────┘
```