# Provider & Subscription Guidance

> Model autonomy without violating terms. How to choose and configure providers safely.

## Core Principle

The Pi.dev Starter Kit is model-agnostic. It works with Anthropic Claude, OpenAI GPT, Google Gemini, and any OpenAI-compatible API. **Model autonomy means freedom of choice — not circumventing provider terms.**

## Recommended Setup Paths

### 1. Anthropic (Claude)

**Best for**: Complex reasoning, long sessions, large codebases.

- Use your own API key via `ANTHROPIC_API_KEY` environment variable.
- If you have an Anthropic subscription via Claude Code, do **not** extract or reuse the subscription key outside of Claude Code's authorized client.
- The Starter Kit works with any Anthropic model: `claude-sonnet-4-20250514`, `claude-opus-4-20250514`, etc.

Configuration in Pi.dev (`~/.pi/config.json` or `.pi/settings.json`):
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "apiKey": "${ANTHROPIC_API_KEY}"
}
```

### 2. OpenAI (GPT / Codex)

**Best for**: Speed, multi-step tool calls, parallel execution.

- Use your own API key via `OPENAI_API_KEY`.
- If you have a ChatGPT Plus/Pro/Team subscription, those API endpoints are **not** for programmatic agent use. Use the API platform at platform.openai.com.
- The kit is designed to work with `gpt-5`, `gpt-5-codex`, and other OpenAI models.

Configuration:
```json
{
  "provider": "openai",
  "model": "gpt-5",
  "apiKey": "${OPENAI_API_KEY}"
}
```

### 3. Google (Gemini)

**Best for**: Free tier experiments, large context windows.

- Use `GEMINI_API_KEY`.
- Gemini models have generous free tiers — good for initial exploration.

Configuration:
```json
{
  "provider": "google",
  "model": "gemini-2.5-pro",
  "apiKey": "${GEMINI_API_KEY}"
}
```

### 4. Open-Source / Local Models (via Ollama, vLLM, etc.)

The kit works with any OpenAI-compatible endpoint:
```json
{
  "provider": "openai-compatible",
  "model": "qwen3-235b",
  "baseUrl": "http://localhost:11434/v1",
  "apiKey": "not-needed"
}
```

## Model Quality vs Harness Quality vs Price

Akita's key insight: **harness quality matters as much as model quality.** A strong model with a weak harness produces poor results. A mid-tier model with a polished harness can outperform a better model used raw.

The Starter Kit's harness (permission gates, lint hooks, task tracking, progressive disclosure, skills, structured workflows) provides a strong foundation regardless of model choice. Choose your model based on:

| Factor | Weight | Notes |
|---|---|---|
| Reasoning quality | High | Most important for complex code tasks |
| Tool use reliability | High | The model must call tools correctly |
| Context window | Medium | Larger = more code in view |
| Cost | Medium | API pricing varies dramatically |
| Speed | Low-Medium | Important for iteration velocity |

## What NOT to Do

- ❌ Extract API keys from Claude Code / Codex desktop apps.
- ❌ Use OAuth tokens from web clients for programmatic access.
- ❌ Scrape or proxy requests through web interfaces.
- ❌ Share API keys across teams/projects.
- ❌ Bypass rate limits or auth mechanisms.

## Using Multiple Harnesses Together

Akita observed that different harnesses (Claude Code, Codex, OpenCode, Pi.dev) catch different issues. The Starter Kit is designed to be **one tool in a toolbox**, not a replacement for everything.

For high-stakes reviews:
1. Use the `review-matrix` skill for multi-pass independent review.
2. Optionally, run the same task through a different harness for a second opinion.
3. Consolidate findings — issues found by multiple approaches are highest confidence.

This is **not** required for day-to-day work. Reserve multi-harness review for critical PRs, migrations, or security-sensitive changes.
