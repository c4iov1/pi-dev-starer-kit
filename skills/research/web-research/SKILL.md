---
name: web-research
description: "Activates web_search, code_search, fetch_content, and get_search_content tools (from pi-web-access). Teaches the model research patterns: search → filter → fetch → synthesize. Use when the model needs current documentation, library versions, API references, or any information beyond its training cutoff."
---

# Web Research

This skill activates the web tools provided by `pi-web-access`. Use these tools instead of guessing or asking the user for documentation.

## Available Tools

| Tool | Purpose |
|------|---------|
| `web_search` | Search the web with multiple queries. Prefer `{ queries: [...] }` with 2-4 varied angles. |
| `code_search` | Search for code examples, API references, and library documentation. |
| `fetch_content` | Fetch URL(s) and extract readable content. Supports YouTube, GitHub repos, local videos. |
| `get_search_content` | Retrieve full stored content from a previous search/fetch by responseId. |

## Research Pattern

Follow this workflow for any question that requires external information:

### 1. Search
```
web_search({ queries: ["angle 1", "angle 2", "angle 3"] })
code_search({ query: "specific API or library question" })
```
- Use 2-4 varied search angles for broader coverage.
- Prefer official documentation sources (devdocs.io, official sites).
- For library questions, use `code_search` first — it returns code snippets and docs.

### 2. Filter
Scan the search results and identify:
- **Official docs** — highest priority
- **GitHub repos** — source of truth for implementation
- **Stack Overflow** — practical solutions, check dates
- **Blog posts** — contextual, verify against official docs

Skip: outdated content (>2 years for fast-moving frameworks), low-quality aggregators, paywalled articles.

### 3. Fetch
```
fetch_content({ urls: ["url1", "url2"] })
fetch_content({ url: "github.com/user/repo", forceClone: true })
```
- Fetch multiple URLs in one call (supports up to 3 concurrent).
- For YouTube: pass the user's specific question via the `prompt` parameter.
- For GitHub: use `forceClone: true` to get full repository contents.

### 4. Synthesize
- Cross-reference multiple sources for critical claims.
- Cite sources with URLs.
- Distinguish between "the docs say", "a blog post suggests", and "I infer".
- If sources conflict, note the conflict and recommend the official source.

## When to Use

This skill activates automatically when you need:
- Current documentation or API references
- Library version-specific behavior
- Solutions to errors or debugging help
- Technology comparisons or best practices
- Any information beyond your training cutoff

## When NOT to Use

Skip web research when:
- The user explicitly provides the documentation or context needed
- The question is about the local codebase (use `grep`, `read`, `find` instead)
- The answer is basic computer science (no version-specific nuance)
- The user says "don't search the web"

## Rules

- **Cite sources.** Every claim from the web must include where it came from.
- **Prefer official docs.** Devdocs.io, official sites, and GitHub READMEs over blog posts.
- **Cross-reference.** For critical information (security, breaking changes), verify with 2+ sources.
- **Be fast.** Don't over-research. One good source is better than five mediocre ones.
- **Search before asking.** Don't ask the user for documentation — search for it first.
