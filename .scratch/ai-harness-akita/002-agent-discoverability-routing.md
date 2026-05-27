# 002 — Add agent discoverability and routing for new capabilities

Status: ready-for-agent
Priority: P0
Type: SYSTEM + settings + skill index + docs

## Why

The user correctly noted that tools are useless if only humans know they exist. The LLM/agent needs concise always-on routing hints, and deeper workflow instructions must live in skills.

## Deliverable

Update the kit so the agent can discover and choose the new capabilities:

- `artifact_read`
- `ast_grep` / `ast_edit`
- LSP symbol tools
- `read_ranges` / `edit_at_anchor`
- steering profiles
- `review-matrix`
- `starter_kit_doctor`

## Functional requirements

### 1. Update `SYSTEM.md`

Add a small “Advanced Routing” section. Keep it lean; do not paste manuals.

Suggested content:

```md
### Advanced Routing

- Environment/capability checks: use `starter_kit_doctor` when unsure which kit tools are installed or enabled.
- Non-source artifacts (SQLite, CSV/JSON, archives, PDFs, spreadsheets, notebooks): prefer `artifact_read` before shell scripts.
- Structural code patterns or codemods: prefer `ast_grep`; use `ast_edit` dry-run before edits.
- Symbol navigation/refactors: prefer LSP tools (`lsp_definition`, `lsp_references`, `lsp_rename`) over textual search.
- Scattered source context: use `read_ranges`; stale-sensitive edits: use `edit_at_anchor` when available.
- Important reviews: activate `review-matrix` for independent passes.
```

### 2. Update skills list

Add future skills to `SYSTEM.md` progressive disclosure list:

- `artifact-analysis`
- `structural-refactor`
- `review-matrix`

### 3. Update `templates/settings.template.json`

Add future extension/skill names and new profile keys, but keep a sensible default.

Suggested keys:

```json
"steeringMode": "polished-default",
"interruptMode": "safe-steer",
"compactionStrategy": "context-mode-default"
```

### 4. Add docs note

Create or update docs to explain discoverability layers:

1. Tool description/schema.
2. SYSTEM routing.
3. Skill deep guidance.
4. Doctor/settings visibility.

## Acceptance criteria

- `SYSTEM.md` mentions new tools enough for the agent to route to them.
- `SYSTEM.md` remains concise.
- Settings template documents new flags.
- No large workflow manual is added to system prompt.
