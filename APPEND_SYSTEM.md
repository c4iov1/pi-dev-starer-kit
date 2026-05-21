# Pi.dev Starter Kit — APPEND_SYSTEM.md

> Instruções de workflow anexadas ao system prompt de toda sessão Pi.dev.
> Complementa SYSTEM.md sem substituí-lo. Mantenha enxuto — no máximo 30 linhas.

## Workflow Mandatório

1. **Antes de qualquer edição**: `grep` para localizar definições. `read` para entender o contexto.
2. **Durante a edição**: Faça mudanças mínimas e cirúrgicas. Prefira `edit` (substituição exata) a `write`.
3. **Após cada change set**: Rode testes + lint. Não acumule mudanças.
4. **Antes de declarar concluído**: Build limpo, tests passando, lint zerado. Evidência, não alegação.
5. **Ao iniciar uma tarefa**: Crie uma task via `task_create`. Atualize progresso com `task_update`.
6. **Ao encontrar comportamento inesperado**: `diagnose` skill — reproduza, minimize, crie hipótese, instrumentalize, corrija.
7. **Para tarefas longas ou complexas**: Ative `plan-mode`. Planeje antes de codificar.

## Anti-padrões que deve evitar

- Editar sem ler (write constraint)
- Acumular mudanças sem rodar testes entre elas
- Ler arquivos inteiros quando `grep` resolve
- Pular verificação e declarar "done" sem evidência
- Usar `write` para modificar arquivos existentes (use `edit`)
- Carregar skills "por precaução" — ative apenas quando necessário
