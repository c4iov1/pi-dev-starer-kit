# Extension Layers

Pi.dev Starter Kit extensions follow a one-way dependency model. The goal is to keep security-critical hooks small, avoid circular dependencies, and make optional capabilities easy to enable or disable.

## Layer diagram

```text
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Integration Extensions                             │
│ setup-ai-memory, starter-kit-doctor, init-starter-kit       │
│ Can import from: Layer 1, Layer 2, Layer 3                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Feature Extensions                                 │
│ artifact-read, lsp-bridge, ast-tools, source-navigation,    │
│ auto-memory, contrib-gate, monitor-bash, rtk-rewrite        │
│ Can import from: Layer 1                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Core Extensions                                    │
│ permission-gate, post-edit-lint, loop-protection,           │
│ task-tracker                                                │
│ Can import from: Layer 1                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Shared Utilities                                   │
│ extensions/shared/path-utils, settings, errors, constants   │
│ Can be imported by: any extension                           │
└─────────────────────────────────────────────────────────────┘
```

## Dependency rules

1. `extensions/shared/*` is Layer 1 and may not import from extension folders.
2. Core extensions may import only from Layer 1.
3. Feature extensions may import from Layer 1. Cross-feature imports are discouraged; promote reusable code to Layer 1 instead.
4. Integration extensions may import from any lower layer when needed, but should prefer public APIs and shared utilities.
5. Same-layer imports are discouraged unless explicitly documented.
6. Circular dependencies are not allowed.

## Extension catalog

| Layer | Extension | Required? | Notes |
|---|---|---:|---|
| 1 | `extensions/shared/*` | Yes | Shared constants, errors, path utilities, settings. |
| 2 | `permission-gate` | Yes | Security-critical pre-tool permission pipeline. Must run before optimization hooks. |
| 2 | `post-edit-lint` | Recommended | Deterministic quality hook after edits. |
| 2 | `loop-protection` | Recommended | Prevents doom loops and context starvation. |
| 2 | `task-tracker` | Recommended | Persistent task progress tracking. |
| 3 | `artifact-read` | Optional | Read-only structured artifact inspection. |
| 3 | `lsp-bridge` | Optional | TypeScript LSP symbol operations and type checks. |
| 3 | `ast-tools` | Optional | Structural code search and preview-only rewrites. |
| 3 | `source-navigation` | Optional | Multi-range reads and anchor-pinned edit previews. |
| 3 | `auto-memory` | Optional | Lightweight project memory capture. |
| 3 | `contrib-gate` | Optional | Branch and commit convention guidance. |
| 3 | `monitor-bash` | Optional | Background command monitoring. |
| 3 | `rtk-rewrite` | Optional | Context-efficiency bash rewrites; never a security layer. |
| 4 | `setup-ai-memory` | Optional | ai-memory setup and operations. |
| 4 | `starter-kit-doctor` | Optional | Diagnostics for capabilities and environment health. |
| 4 | `init-starter-kit` | Optional | Project template initialization. |

## Required vs optional defaults

Required:
- `permission-gate`

Recommended defaults:
- `post-edit-lint`
- `loop-protection`
- `task-tracker`
- `rtk-rewrite` when RTK is installed
- `starter-kit-doctor` for diagnostics

Optional feature packs:
- Navigation: `lsp-bridge`, `ast-tools`, `source-navigation`, `artifact-read`
- Workflow: `contrib-gate`, `monitor-bash`
- Memory: `auto-memory`, `setup-ai-memory`
- Initialization/diagnostics: `init-starter-kit`, `starter-kit-doctor`

## Adding a new extension

1. Pick the lowest possible layer.
2. If multiple extensions need the same helper, add it to `extensions/shared/`.
3. Avoid importing from sibling extension directories.
4. Keep security-sensitive behavior in or behind `permission-gate`.
5. Add tests for any new layer boundary or permission behavior.
6. Run dependency checks before merging.

## Dependency check

Preferred check when available:

```bash
npx madge extensions --extensions ts --circular
```

Fallback check without madge:

```bash
grep -R "from \"../[a-z-]*/" -n extensions --include='*.ts'
```

The fallback should show imports into `../shared/*` only, unless a documented exception exists.
