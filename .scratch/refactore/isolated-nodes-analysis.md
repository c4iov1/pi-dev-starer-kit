# Isolated Nodes Analysis

**Date**: 2026-05-30  
**Source**: `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md`  
**Graph commit**: `621f6a9f` (matches `HEAD`; working tree contains uncommitted refactor changes that were re-extracted by `graphify update .`)

## Summary

After running `graphify update .` against the refactored working tree, the local graph reports:

- Total nodes: 2607
- Total links: 2974
- Nodes with degree <= 1 in `graph.json`: 1657
- The count increased versus the earlier stale graph because the corpus now includes many new tests, split modules, skill category READMEs, and scratch planning docs.

Breakdown of degree <= 1 nodes:

| Category | Count |
|---|---:|
| document | 1361 |
| code | 296 |

By source prefix:

| Prefix | Count |
|---|---:|
| `.scratch` | 629 |
| `skills` | 321 |
| `docs` | 214 |
| `extensions` | 158 |
| `templates` | 78 |
| `tests` | 60 |
| `prompts` | 37 |
| `REFACTORING_REVIEW.md` | 35 |
| `package.json` | 27 |
| `README.md` | 22 |
| `repo_init.md` | 22 |
| `SYSTEM.md` | 17 |
| `API.md` | 13 |
| `AGENTS.md` | 13 |
| `.ts-prune.json` | 3 |
| `CONTEXT.md` | 3 |
| `APPEND_SYSTEM.md` | 3 |
| `init-starter-kit.sh` | 2 |

## Findings

1. **Most low-degree nodes are still documentation/planning artifacts**.
   - `.scratch`, `skills`, docs, templates, prompts, and review files dominate the count.
   - These nodes are often headings, checklist items, examples, package keys, or workflow concepts.
   - They should not be treated as dead code.

2. **The code-node subset is smaller and should be audited separately**.
   - 296 degree<=1 nodes are `file_type=code`.
   - 158 degree<=1 nodes come from `extensions/`; many are constants, helper names, or newly split module boundaries.
   - Removal requires Issue 018-style export/reference validation, not graph degree alone.

3. **The 50% reduction target is not met by graph refresh alone**.
   - Fresh graph: 1657 degree<=1 nodes.
   - Target from old issue: <500.
   - The target appears unrealistic for this corpus because graphify models documentation headings/config keys as nodes. Treat it as an audit prompt, not a deletion goal.

4. **Safe action remains non-destructive**.
   - No source code was removed based only on graph degree.
   - New docs (`.scratch/INDEX.md`, `docs/extension-layers.md`, skill category READMEs) improve navigability even if isolated-node counts remain high.

## Decision categories

| Category | Action |
|---|---|
| Documentation headings/examples | Accept unless misleading; add cross-links when useful. |
| Scratch issue/checklist nodes | Accept; local planning artifacts naturally have low degree. |
| Package/config keys | Accept; these are not dead code. |
| Test-local helpers/variables | Accept; test-scoped nodes are expected to be low-degree. |
| Exported code symbols | Audit under Issue 018 before removal. |
| Internal extension helpers | Only remove after grep/LSP proves no references and tests cover behavior. |

## Non-destructive actions completed

- Ran `graphify update .` after refactors.
- Recomputed degree<=1 counts from `graphify-out/graph.json` using `links` edges.
- Confirmed the graph now contains split `artifact-read` modules, new tests, and skill category docs.
- Kept deletion decisions deferred to export/reference audit.

## Recommended next steps

1. Use Issue 018 export audit for the `extensions/` code subset.
2. Do not remove documentation-only isolated nodes unless the content is obsolete.
3. If reducing graph noise becomes important, configure graphify exclusions for `.scratch/` or generated planning docs rather than deleting source/docs.

## Verification command used

```bash
python3 - <<'PY'
import json
from collections import Counter

g = json.load(open('graphify-out/graph.json'))
deg = Counter()
for e in g.get('links', []):
    deg[e['source']] += 1
    deg[e['target']] += 1
isolated = [n for n in g['nodes'] if deg[n['id']] <= 1]
print('nodes', len(g['nodes']), 'links', len(g.get('links', [])), 'degree<=1', len(isolated))
print(Counter(n.get('file_type', '?') for n in isolated))
print(Counter((n.get('source_file') or '').split('/')[0] for n in isolated).most_common())
PY
```
