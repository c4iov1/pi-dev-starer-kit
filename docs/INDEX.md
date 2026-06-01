# Knowledge Map — Pi.dev Starter Kit

## Getting Started

- **`AGENTS.md`**: Agent instructions. Project structure, non-negotiable rules, commands.
- **`CONTEXT.md`**: Domain glossary. Terms such as "Starter Kit", "Progressive Disclosure", "Think-in-Code".
- **`repo_init.md`**: Development environment setup + initial prompt to start coding.

## Specification

- **`docs/architecture.md`**: Complete kit architecture. 4 layers (Context, Tools, Workflow, Extensibility), diagrams, and Pi.dev Starter Kit design rationale.
- **`docs/prd.md`**: Product requirements. User stories, modules, testing decisions, out of scope.
- **`docs/akita-harness-ideas-plan.md`**: Akita plan with gaps, technical decisions, discoverability, and implementation sequence.
- **`docs/steering-profiles.md`**: `steeringMode`, `interruptMode`, `compactionStrategy` profiles.
- **`docs/provider-guidance.md`**: Safe provider/subscription guidance without OAuth hacks.
- **`docs/ai-memory-integration-plan.md`**: Integration plan for the `akitaonrails/ai-memory` external service.

## Decisions

- **`docs/adr/`**: Architecture Decision Records. Create as decisions are made during development.

## External References

- **`docs/references/1-The Anatomy of an Agent Harness.md`**: "The Anatomy of an Agent Harness" — harness definition and component derivation (LangChain, 2026).
- **`docs/references/4-harness-reference.md`**: Harness Engineering Reference — comparative benchmark Claude Code vs Codex vs Cursor vs Pi.dev.
- **`docs/references/5-pi-dev-doc.md`**: Pi.dev technical manual — extensions, skills, sessions, SDK, packages.
- **`docs/references/8-mattpocock-skills-doc.md`**: mattpocock/skills manual — SKILL.md format, canonical workflow, feedback loops.
- **`docs/references/9-ai-memory.md`**: AI agent memory — agentmemory issues, Karpathy LLM Wiki, and Akita's ai-memory adoption plan.

## Issue Tracker

- **`.scratch/pi-dev-starter-kit/`**: Original starter kit issues.
- **`.scratch/ai-harness-akita/`**: Detailed tasks for Akita-inspired implementation (doctor, artifact-read, AST tools, LSP symbol ops, source navigation, steering profiles, review-matrix, provider guidance).

## Repository Structure

```
pi-dev-starter-kit/
├── AGENTS.md, CONTEXT.md, repo_init.md    # Root docs
├── package.json                            # Pi.dev manifest (output)
├── SYSTEM.md, APPEND_SYSTEM.md             # System prompt (output)
├── extensions/                             # Core extensions + Akita tools + ai-memory setup
├── skills/                                 # In-house skills + Akita workflows + mattpocock
├── prompts/                                # Prompt templates, including review-matrix
├── templates/                              # Project templates + ai-memory config
├── docs/                                   # Specs + references
└── .scratch/                               # Issues
```
