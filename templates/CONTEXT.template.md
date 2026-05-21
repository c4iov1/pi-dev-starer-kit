# CONTEXT.md — [PROJECT_NAME]

> Domain glossary. Define the canonical terms of your project here.
> One term per section. Definitions only — no implementation details.
> The agent reads this to speak your language precisely.

## [First Domain Term]

[Definition. What does this term mean in your project? Be precise and concise.
Avoid implementation details — this is about meaning, not mechanics.]

## [Second Domain Term]

[Definition. Same format. One concept per section.]

## [Third Domain Term]

[Definition. Continue for all important domain concepts.]

---

## Usage Notes

- **One term per `##` heading.** Keep definitions to one paragraph.
- **No implementation details.** This is a dictionary, not a design doc.
- **Update as the domain evolves.** When new terms enter the conversation, add them.
- **The agent uses these exact terms.** Consistency here = consistency in output.
- **Reference from AGENTS.md.** The agent knows to `rg` this file when encountering unfamiliar terms.

## Examples

```markdown
## Materialization

The process of converting a lesson template into a concrete, runnable instance
for a specific student. Materialization resolves template parameters against the
student's current state and produces an executable exercise.

## Cascade

When a materialization of a parent lesson triggers automatic materialization of
its child lessons. Cascades propagate through the lesson dependency graph until
all prerequisites are satisfied.
```
