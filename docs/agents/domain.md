# Domain Docs

This project uses a single-context layout.

## Structure

```
/
├── CONTEXT.md          # Domain glossary
├── docs/
│   ├── adr/            # Architecture Decision Records
│   └── references/     # External references
└── .scratch/           # Issue tracker
```

## Consumer rules

1. Before any long response, read `CONTEXT.md` to use the correct domain terminology.
2. Before reading files in `docs/references/`, consult `docs/INDEX.md` to know which file to read.
3. Decisions that are hard to reverse, surprising without context, and the result of a real trade-off → create an ADR in `docs/adr/`.
