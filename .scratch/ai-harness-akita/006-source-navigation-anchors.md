# 006 — Implement source navigation: `read_ranges` and `edit_at_anchor`

Status: ready-for-agent
Priority: P2
Type: extension

## Why

Akita notes Oh-My-Pi conveniences like multi-range reads and line-hash anchors. These help the agent gather scattered source context in one call and make edits safer when context may be stale.

## Deliverable

Create `extensions/source-navigation/index.ts` registering:

- `read_ranges`
- `edit_at_anchor` optional but preferred

## `read_ranges` requirements

Input:

```ts
{
  path: string,
  ranges: Array<{ start: number, end: number }>,
  includeAnchors?: boolean
}
```

Output:

- requested snippets
- line numbers
- anchor per range if requested: `path:L10-L25#hash`

Rules:

- Path confinement.
- Max number of ranges.
- Max total lines returned.
- Clear error for invalid ranges.

## `edit_at_anchor` requirements

Input:

```ts
{
  anchor: string,
  oldText: string,
  newText: string
}
```

Rules:

- Parse path/range/hash.
- Recompute hash for current file range.
- Fail if hash changed.
- Then apply exact replacement only inside anchored range.
- Must respect permission pipeline / write constraints.

## LLM-facing description

Descriptions must say:

- Use `read_ranges` for scattered sections of the same file.
- Use anchors to avoid stale edits.
- Do not use for whole-file reading.

## Acceptance criteria

- Can read multiple ranges from one file with line numbers.
- Anchors are stable and change when content changes.
- `edit_at_anchor` refuses stale anchors.
- TypeScript check passes.
