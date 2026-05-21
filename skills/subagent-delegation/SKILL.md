---
name: subagent-delegation
description: Activates the subagent tool (from pi-subagents). Teaches the model when and how to delegate work to sub-agents with isolated context windows. Use for code review, scouting large codebases, parallel investigation, implementation handoffs, and any task that benefits from a second set of model eyes without polluting the main conversation.
---

# Subagent Delegation

This skill activates the `subagent` tool provided by `pi-subagents`. Sub-agents run in isolated context windows — they see only their assigned task and return a single text result. The parent does not see intermediate tool calls.

## Available Agents

| Agent | Use when you want... |
|-------|---------------------|
| `scout` | Fast local codebase recon: relevant files, entry points, data flow, risks, and where another agent should start. |
| `researcher` | Web/docs research with sources: official docs, specs, benchmarks, recent changes, and a concise research brief. |
| `planner` | A concrete implementation plan from existing context. Reads and plans, does not edit code. |
| `worker` | Implementation work, including approved oracle handoffs. Edits files, validates, and escalates unapproved decisions. |
| `reviewer` | Code review and small fixes. Checks implementation against task/plan, tests, edge cases, and simplicity. |
| `oracle` | A second opinion before acting. Challenges assumptions, catches drift, recommends safest next move. |
| `delegate` | Lightweight general delegate when you want a child agent that behaves close to the parent session. |

## Delegation Patterns

### Pattern 1: Exploration (scout)
```
subagent({ agent: "scout", task: "Find all files related to authentication. Map the entry points, middleware, and token handling." })
```
Use `scout` for reconnaissance tasks. The scout returns a map of relevant files and their roles — read it, then proceed with implementation.

### Pattern 2: Research (researcher)
```
subagent({ agent: "researcher", task: "Research the latest best practices for React Server Components in Next.js 15. Use official docs and recent blog posts." })
```
Use `researcher` for gathering external information. The researcher searches the web, evaluates sources, and returns a structured research brief.

### Pattern 3: Parallel Investigation (multiple agents simultaneously)
```
subagent({ tasks: [
  { agent: "scout", task: "Map the database layer — all models, migrations, and query patterns" },
  { agent: "scout", task: "Map the API layer — all routes, middleware, request/response types" }
] })
```
Use parallel sub-agents when you need to explore multiple areas independently. Results are collected into a single response.

### Pattern 4: Review (reviewer)
```
subagent({ agent: "reviewer", task: "Review the changes in src/auth/ for security issues, edge cases, and test coverage. Reference the task: 'Add JWT authentication to API routes'." })
```
Use `reviewer` after completing implementation. The reviewer checks against the original task specification.

### Pattern 5: Advisory (oracle)
```
subagent({ agent: "oracle", task: "We're about to refactor the payment module. The plan is: extract PaymentProcessor interface, add Stripe and PayPal implementations, add factory. What risks do you see?" })
```
Use `oracle` before making large architectural changes. The oracle identifies risks without editing code.

### Pattern 6: Implementation (worker)
```
subagent({ agent: "worker", task: "Implement the UserRepository class with findById, findByEmail, and create methods. Ensure validation and error handling." })
```
Use `worker` for self-contained implementation tasks. The worker edits files and validates its own work.

## When to Use

Use sub-agents for:
- **Exploration** that would require reading many files → scout prevents context pollution
- **Research** that requires web access → researcher keeps main context focused on code
- **Parallel work** on independent areas → multiple sub-agents save wall-clock time
- **Code review** before declaring work done → reviewer catches issues you missed
- **Risk assessment** before major changes → oracle challenges your assumptions
- **Isolated implementation** of well-specified modules → worker delivers a clean changeset

## When NOT to Use

Skip sub-agents when:
- The task is trivial (reading one file, making a single edit)
- The task requires tight coupling with the current conversation state
- You need to see intermediate tool calls (sub-agents return only final text)
- The task requires user interaction (sub-agents can't prompt the user)

## Rules

- **Give clear tasks.** Sub-agents can't ask clarifying questions. Be specific about what you want.
- **Read the result.** Don't fire-and-forget. Sub-agent results contain valuable context.
- **Match agent to task.** scout for exploration, reviewer for review, oracle for risk assessment.
- **Don't nest.** Sub-agents should not spawn their own sub-agents. Keep delegation one level deep.
- **Isolate by concern.** Each sub-agent should own one clear concern. Don't give one agent two unrelated tasks.
- **Limit parallel count.** 2-4 parallel agents is sweet spot. More than 6 wastes resources.
