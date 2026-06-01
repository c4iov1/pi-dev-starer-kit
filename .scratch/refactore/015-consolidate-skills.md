# Issue 015: Consolidate Skill Categories

**Priority**: P2 — Low Impact / Low Risk  
**Phase**: 4 (Architecture)  
**Estimated Effort**: 3-4 hours  
**Confidence**: Medium

---

## Problem Statement

The project has 24 skills in the `skills/` directory with no clear categorization:

```
skills/
  ai-memory/
  artifact-analysis/
  browser-testing/
  design-an-interface/
  diagnose/
  grill-me/
  grill-with-docs/
  handoff/
  improve-codebase-architecture/
  mcp-orchestration/
  plan-mode/
  qa/
  review-matrix/
  self-verify/
  setup-matt-pocock-skills/
  structural-refactor/
  subagent-delegation/
  tdd/
  to-issues/
  to-prd/
  triage/
  web-research/
  write-a-skill/
  zoom-out/
```

**Problems**:
- Hard to discover relevant skills
- Some skills overlap (e.g., `grill-me` vs `grill-with-docs`)
- No clear workflow guidance (which skill to use when)
- Difficult for new users to understand the skill ecosystem

**Overlaps identified**:
- `grill-me` vs `grill-with-docs` — Both challenge plans
- `diagnose` vs `improve-codebase-architecture` — Both analyze code
- `qa` vs `triage` — Both manage issues
- `plan-mode` vs `to-prd` vs `to-issues` — All planning-related

---

## Acceptance Criteria

- [x] Define 6 skill categories based on workflow stage
- [x] Move skills into category subdirectories
- [x] Update `AGENTS.md` to document categories
- [x] Update `SYSTEM.md` to reference categories
- [x] Update `docs/architecture.md` with skill taxonomy
- [x] Add `README.md` to each category explaining when to use each skill
- [x] All skills still work (no broken imports)

---

## Files to Modify

### Directory Restructure
```
skills/
  planning/
    plan-mode/
    grill-me/
    grill-with-docs/
    to-prd/
    to-issues/
    zoom-out/
  quality/
    self-verify/
    review-matrix/
    tdd/
    diagnose/
    improve-codebase-architecture/
    structural-refactor/
  workflow/
    handoff/
    triage/
    qa/
    setup-matt-pocock-skills/
  research/
    web-research/
    browser-testing/
    mcp-orchestration/
    subagent-delegation/
  tools/
    artifact-analysis/
    write-a-skill/
  memory/
    ai-memory/
```

### New Files
- `skills/planning/README.md`
- `skills/quality/README.md`
- `skills/workflow/README.md`
- `skills/research/README.md`
- `skills/tools/README.md`
- `skills/memory/README.md`

### Modified Files
- `AGENTS.md` — Document skill categories
- `SYSTEM.md` — Reference categories
- `docs/architecture.md` — Add skill taxonomy section
- `package.json` — Update skill paths if needed

---

## Implementation Approach

### 1. Define Categories

Based on workflow stage and purpose:

1. **Planning** — Skills for designing solutions before implementation
   - `plan-mode` — Structured planning workflow
   - `grill-me` — Challenge plans with questions
   - `grill-with-docs` — Challenge plans against documentation
   - `to-prd` — Convert context to PRD
   - `to-issues` — Break PRD into issues
   - `zoom-out` — High-level architecture review

2. **Quality** — Skills for ensuring code quality and correctness
   - `self-verify` — Run tests and verify output
   - `review-matrix` — Multi-pass code review
   - `tdd` — Test-driven development
   - `diagnose` — Debug hard problems
   - `improve-codebase-architecture` — Find refactoring opportunities
   - `structural-refactor` — Perform structural refactoring

3. **Workflow** — Skills for managing development workflow
   - `handoff` — Create handoff documents
   - `triage` — Manage issue workflow
   - `qa` — Report bugs conversationally
   - `setup-matt-pocock-skills` — Install additional skills

4. **Research** — Skills for gathering information
   - `web-research` — Search the web
   - `browser-testing` — Automate browser tasks
   - `mcp-orchestration` — Interact with MCP servers
   - `subagent-delegation` — Delegate to sub-agents

5. **Tools** — Skills for using specific tools
   - `artifact-analysis` — Analyze data artifacts
   - `write-a-skill` — Create new skills

6. **Memory** — Skills for managing project memory
   - `ai-memory` — Long-term project memory

### 2. Move Skills

```bash
# Create category directories
mkdir -p skills/{planning,quality,workflow,research,tools,memory}

# Move skills into categories
mv skills/plan-mode skills/planning/
mv skills/grill-me skills/planning/
mv skills/grill-with-docs skills/planning/
mv skills/to-prd skills/planning/
mv skills/to-issues skills/planning/
mv skills/zoom-out skills/planning/

mv skills/self-verify skills/quality/
mv skills/review-matrix skills/quality/
mv skills/tdd skills/quality/
mv skills/diagnose skills/quality/
mv skills/improve-codebase-architecture skills/quality/
mv skills/structural-refactor skills/quality/

mv skills/handoff skills/workflow/
mv skills/triage skills/workflow/
mv skills/qa skills/workflow/
mv skills/setup-matt-pocock-skills skills/workflow/

mv skills/web-research skills/research/
mv skills/browser-testing skills/research/
mv skills/mcp-orchestration skills/research/
mv skills/subagent-delegation skills/research/

mv skills/artifact-analysis skills/tools/
mv skills/write-a-skill skills/tools/

mv skills/ai-memory skills/memory/
```

### 3. Create Category READMEs

```markdown
# skills/planning/README.md

# Planning Skills

Skills for designing solutions before implementation.

## When to Use

Use planning skills **before** writing code to:
- Design the solution architecture
- Identify edge cases and risks
- Break work into manageable tasks
- Get feedback on your approach

## Available Skills

### plan-mode
Structured planning workflow that creates a `plan.md` and registers tasks.

**Use when**: Starting a complex, multi-step task.

**Example**: `/plan-mode` → Creates `plan.md` with design and task breakdown.

---

### grill-me
Challenges your plan with relentless questions until reaching shared understanding.

**Use when**: You want to stress-test your design decisions.

**Example**: `/grill-me` → Agent asks probing questions about your plan.

---

### grill-with-docs
Like `grill-me`, but challenges your plan against existing documentation (CONTEXT.md, ADRs).

**Use when**: You want to ensure your plan aligns with project conventions.

**Example**: `/grill-with-docs` → Agent checks your plan against glossary and decisions.

---

### to-prd
Converts the current conversation context into a Product Requirements Document.

**Use when**: You've discussed requirements and want to formalize them.

**Example**: `/to-prd` → Creates PRD in `.scratch/` directory.

---

### to-issues
Breaks a PRD or plan into independently-implementable issues.

**Use when**: You have a plan and want to create implementation tickets.

**Example**: `/to-issues` → Creates issues in `.scratch/` with acceptance criteria.

---

### zoom-out
High-level architecture review using graphify.

**Use when**: You want to understand the big picture before making changes.

**Example**: `/zoom-out` → Analyzes graph and suggests improvements.

---

## Workflow

Typical planning workflow:

1. **zoom-out** — Understand the architecture
2. **grill-me** or **grill-with-docs** — Stress-test your design
3. **plan-mode** — Create structured plan with tasks
4. **to-prd** (optional) — Formalize requirements
5. **to-issues** — Break into implementation tickets
```

```markdown
# skills/quality/README.md

# Quality Skills

Skills for ensuring code quality and correctness.

## When to Use

Use quality skills **during and after** implementation to:
- Verify code works correctly
- Catch bugs and regressions
- Improve code structure
- Ensure tests pass

## Available Skills

### self-verify
Runs tests, inspects output, and iteratively fixes issues.

**Use when**: You want to verify your changes work before declaring done.

**Example**: `/self-verify` → Runs test suite, fixes failures.

---

### review-matrix
Multi-pass code review (correctness, security, maintainability).

**Use when**: You want thorough review of important changes.

**Example**: `/review-matrix` → Three independent review passes.

---

### tdd
Test-driven development with red-green-refactor loop.

**Use when**: Building features or fixing bugs with tests first.

**Example**: `/tdd` → Write test → implement → refactor.

---

### diagnose
Disciplined diagnosis loop for hard bugs.

**Use when**: Something is broken and you need to find the root cause.

**Example**: `/diagnose` → Reproduce → minimize → hypothesize → fix.

---

### improve-codebase-architecture
Finds refactoring opportunities using CONTEXT.md and ADRs.

**Use when**: You want to improve code structure and reduce coupling.

**Example**: `/improve-codebase-architecture` → Suggests consolidations and splits.

---

### structural-refactor
Performs structural refactoring using AST and LSP tools.

**Use when**: Renaming symbols, moving files, updating signatures.

**Example**: `/structural-refactor` → Safe, automated refactoring.

---

## Workflow

Typical quality workflow:

1. **tdd** — Write tests first (if applicable)
2. Implement the feature
3. **self-verify** — Run tests and verify
4. **review-matrix** — Get thorough review (for important changes)
5. **diagnose** — Debug any issues found
6. **structural-refactor** — Clean up code structure
```

### 4. Update AGENTS.md

Add section:

```markdown
## Skills by Category

Skills are organized into 6 categories based on workflow stage:

### Planning
Design solutions before implementation.
- `plan-mode` — Structured planning workflow
- `grill-me` — Challenge plans with questions
- `grill-with-docs` — Challenge plans against docs
- `to-prd` — Convert context to PRD
- `to-issues` — Break PRD into issues
- `zoom-out` — High-level architecture review

### Quality
Ensure code quality and correctness.
- `self-verify` — Run tests and verify output
- `review-matrix` — Multi-pass code review
- `tdd` — Test-driven development
- `diagnose` — Debug hard problems
- `improve-codebase-architecture` — Find refactoring opportunities
- `structural-refactor` — Perform structural refactoring

### Workflow
Manage development workflow.
- `handoff` — Create handoff documents
- `triage` — Manage issue workflow
- `qa` — Report bugs conversationally
- `setup-matt-pocock-skills` — Install additional skills

### Research
Gather information.
- `web-research` — Search the web
- `browser-testing` — Automate browser tasks
- `mcp-orchestration` — Interact with MCP servers
- `subagent-delegation` — Delegate to sub-agents

### Tools
Use specific tools.
- `artifact-analysis` — Analyze data artifacts
- `write-a-skill` — Create new skills

### Memory
Manage project memory.
- `ai-memory` — Long-term project memory

See each category's `README.md` for detailed usage guidance.
```

### 5. Update package.json

If skills are referenced by path, update:

```json
{
  "pi": {
    "skills": [
      "./skills/planning",
      "./skills/quality",
      "./skills/workflow",
      "./skills/research",
      "./skills/tools",
      "./skills/memory",
      "./node_modules/pi-graphify/skills"
    ]
  }
}
```

---

## Testing Strategy

1. **Skill discovery**: Verify all skills are still discoverable
2. **Skill execution**: Test a few skills from each category
3. **Documentation**: Verify READMEs render correctly
4. **Links**: Check for broken links in AGENTS.md and SYSTEM.md

---

## Risk Assessment

**Risk Level**: Low

**Mitigations**:
- Pure directory reorganization
- Skills are self-contained (no cross-skill imports)
- Test a few skills after moving

**Potential Issues**:
- Some skills may be referenced by absolute path in documentation
- Users may have muscle memory for old skill locations

---

## Success Metrics

- ✅ Skills organized into 6 clear categories
- ✅ Each category has README with usage guidance
- ✅ AGENTS.md documents categories
- ✅ Easy to discover relevant skills
- ✅ All skills still work

---

## References

- `REFACTORING_REVIEW.md` — Section 2.3
- `skills/` directory — Current structure
- Skill documentation: https://docs.pi.dev/skills
