# 009 — Add provider/subscription guidance doc

Status: ready-for-agent
Priority: P3
Type: documentation

## Why

Akita separates model quality, harness quality, API pricing, and subscription/OAuth constraints. The kit claims provider autonomy, but should not encourage unsafe or terms-violating hacks.

## Deliverable

Create `docs/provider-guidance.md` and link it from `README.md`.

## Required content

Explain:

1. Harness quality matters independently from model quality.
2. Pi.dev Starter Kit is model/provider autonomous.
3. API keys and subscription OAuth are different.
4. Do not bypass provider restrictions.
5. Do not route Claude Pro/Max credentials through third-party tools if provider terms prohibit it.
6. Choose legal/provider-compliant paths.
7. Practical recommendations:
   - Use Pi.dev Starter Kit when you want custom harness/model autonomy.
   - Use Claude Code when you specifically want Anthropic plan integration inside Anthropic’s allowed ecosystem.
   - Use OpenCode when it is the compliant route for a given provider/subscription.
   - Use API billing when subscription routing is not permitted.
8. Cost guidance: do not destroy workflow to save tiny token amounts; tests/logs/context are evidence.

## Tone

Pragmatic, not fanboy. Avoid legal absolutism but be clear: no hacks.

## Acceptance criteria

- Doc exists.
- README links to it.
- No instructions for bypassing provider auth restrictions.
