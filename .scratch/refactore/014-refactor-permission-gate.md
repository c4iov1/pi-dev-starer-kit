# Issue 014: Refactor permission-gate into Pipeline Stages

**Priority**: P2 — Medium Impact / Medium Risk  
**Phase**: 4 (Architecture)  
**Estimated Effort**: 8-10 hours  
**Confidence**: Medium  
**Depends On**: [001-extract-path-utils.md](./001-extract-path-utils.md), [008-expand-permission-gate-tests.md](./008-expand-permission-gate-tests.md), [009-standardize-errors.md](./009-standardize-errors.md)

---

## Problem Statement

The permission-gate extension (802 lines) implements a 5-stage permission pipeline but mixes all concerns in a single file:

1. **Stage 1: Protected paths** (L60-90) — `.env`, `secrets.json`, `.ssh/`
2. **Stage 2: Deny rules** (L60-80) — `git push --force`, `DROP TABLE`, `sudo`
3. **Stage 3: Path confinement** (L393-420) — Workspace boundary checks
4. **Stage 4: Write constraint** (L422-450) — Read-first enforcement
5. **Stage 5: Interactive prompt** (L452-500) — User approval

Plus:
- Feature mode toggle (L700-802)
- Helper functions (L200-390)
- Type definitions (L30-60)

**Problems**:
- Hard to understand the pipeline flow
- Hard to test individual stages
- Hard to add custom stages (e.g., audit logging)
- Violates single-responsibility principle
- "God function" smell in `handleToolCall()`

---

## Acceptance Criteria

- [x] Create `extensions/permission-gate/stages/` directory
- [x] Split protected paths into `stages/protected-paths.ts`
- [x] Split deny rules into `stages/deny-rules.ts`
- [x] Split path confinement into `stages/path-confinement.ts`
- [x] Split write constraint into `stages/write-constraint.ts`
- [x] Split interactive prompt into `stages/interactive.ts`
- [x] Create `modes/` directory for permission mode logic
- [x] Split feature mode toggle into `toggle.ts`
- [x] Refactor `index.ts` to only orchestrate the pipeline (<150 lines)
- [x] All existing tests still pass
- [x] Pipeline stages are clearly documented

---

## Files to Modify

### New Files
- `extensions/permission-gate/stages/protected-paths.ts`
- `extensions/permission-gate/stages/deny-rules.ts`
- `extensions/permission-gate/stages/path-confinement.ts`
- `extensions/permission-gate/stages/write-constraint.ts`
- `extensions/permission-gate/stages/interactive.ts`
- `extensions/permission-gate/modes/default.ts`
- `extensions/permission-gate/modes/accept-edits.ts`
- `extensions/permission-gate/modes/feature-work.ts`
- `extensions/permission-gate/toggle.ts`
- `extensions/permission-gate/types.ts`

### Modified Files
- `extensions/permission-gate/index.ts` — Reduce to ~150 lines (pipeline orchestration)

---

## Implementation Approach

### 1. Design Pipeline Architecture

```
extensions/permission-gate/
  index.ts              # Pipeline orchestration (~150 lines)
  stages/
    protected-paths.ts  # Stage 1: Protected path checking (~80 lines)
    deny-rules.ts       # Stage 2: Static deny rules (~100 lines)
    path-confinement.ts # Stage 3: Workspace confinement (~80 lines)
    write-constraint.ts # Stage 4: Read-first enforcement (~80 lines)
    interactive.ts      # Stage 5: User prompts (~100 lines)
  modes/
    default.ts          # Default mode logic (~50 lines)
    accept-edits.ts     # Accept-edits mode (~30 lines)
    feature-work.ts     # Feature-work mode (~80 lines)
  toggle.ts             # Feature mode toggle command/tool (~100 lines)
  types.ts              # Shared types (~50 lines)
  helpers.ts            # Shared helper functions (~100 lines)
```

### 2. Define Pipeline Interface

```typescript
// extensions/permission-gate/types.ts

export type PermissionMode = 'default' | 'acceptEdits' | 'featureWork';

export interface BlockResult {
  blocked: true;
  reason: string;
}

export interface StageContext {
  toolName: string;
  params: Record<string, unknown>;
  ctx: any;
  workspaceRoot: string;
  permissionMode: PermissionMode;
}

export interface PipelineStage {
  name: string;
  check(context: StageContext): BlockResult | null | Promise<BlockResult | null>;
}
```

### 3. Implement Pipeline Stages

```typescript
// extensions/permission-gate/stages/protected-paths.ts

import type { PipelineStage, StageContext, BlockResult } from '../types';
import { ExtensionError, ErrorCodes } from '../../shared/errors';

const PROTECTED_PATH_PATTERNS = [
  /\.env$/,
  /\.env\.[a-z]+$/i,
  /secrets?\.(json|yaml|yml|toml)$/i,
  /credentials?\.(json|yaml|yml|toml)$/i,
  /\/\.ssh\//,
  /\/\.aws\//,
  /\/\.gnupg\//,
];

/**
 * Stage 1: Checks if the tool call accesses protected paths.
 * 
 * Protected paths include:
 * - `.env` files (environment variables)
 * - `secrets.json`, `credentials.yaml` (secret files)
 * - `.ssh/` directory (SSH keys)
 * - `.aws/` directory (AWS credentials)
 * - `.gnupg/` directory (GPG keys)
 * 
 * This stage always blocks, regardless of permission mode.
 */
export const protectedPathsStage: PipelineStage = {
  name: 'protected-paths',
  
  check(context: StageContext): BlockResult | null {
    const { toolName, params } = context;
    
    // Extract paths from tool parameters
    const paths = extractToolPaths(toolName, params);
    
    for (const path of paths) {
      for (const pattern of PROTECTED_PATH_PATTERNS) {
        if (pattern.test(path)) {
          throw new ExtensionError(
            ErrorCodes.PATH_PROTECTED,
            `Path "${path}" is protected.`,
            'Protected paths include .env files, secrets, and credential files. Do not modify these files directly.'
          );
        }
      }
    }
    
    return null;
  },
};

function extractToolPaths(toolName: string, params: Record<string, unknown>): string[] {
  // ... path extraction logic
}
```

```typescript
// extensions/permission-gate/stages/deny-rules.ts

import type { PipelineStage, StageContext, BlockResult } from '../types';
import { ExtensionError, ErrorCodes } from '../../shared/errors';

const STATIC_DENY_RULES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bgit\s+push\s+.*(--force|-f)/i, label: 'git push --force' },
  { pattern: /\bgit\s+reset\s+--hard\b/i, label: 'git reset --hard' },
  { pattern: /\bDROP\s+(TABLE|DATABASE)/i, label: 'DROP TABLE/DATABASE' },
  { pattern: /\bTRUNCATE\s+(TABLE\s+)?/i, label: 'TRUNCATE TABLE' },
  { pattern: /\bsudo\b/i, label: 'sudo' },
  { pattern: /\bchmod\s+.*777/i, label: 'chmod 777' },
  { pattern: /\bcurl\s+.*\|\s*(ba)?sh\b/i, label: 'curl piped to shell' },
  { pattern: /\bwget\s+.*\|\s*(ba)?sh\b/i, label: 'wget piped to shell' },
  { pattern: /\bnpm\s+publish\b/i, label: 'npm publish' },
  // ... more rules
];

/**
 * Stage 2: Checks if the tool call matches static deny rules.
 * 
 * Deny rules block dangerous operations like:
 * - `git push --force` (rewrites history)
 * - `DROP TABLE` (destructive SQL)
 * - `sudo` (privilege escalation)
 * - `curl | sh` (remote code execution)
 * 
 * This stage always blocks, regardless of permission mode.
 */
export const denyRulesStage: PipelineStage = {
  name: 'deny-rules',
  
  check(context: StageContext): BlockResult | null {
    const { toolName, params } = context;
    
    if (toolName !== 'bash') return null;
    
    const command = String(params.command || '');
    
    for (const rule of STATIC_DENY_RULES) {
      if (rule.pattern.test(command)) {
        throw new ExtensionError(
          ErrorCodes.PERMISSION_DENIED,
          `Command blocked by deny rule: ${rule.label}`,
          `This command is considered dangerous and is always blocked. If you need to run it, use a safer alternative.`
        );
      }
    }
    
    return null;
  },
};
```

```typescript
// extensions/permission-gate/stages/path-confinement.ts

import type { PipelineStage, StageContext, BlockResult } from '../types';
import { confineToWorkspace } from '../../shared/path-utils';
import { ExtensionError, ErrorCodes } from '../../shared/errors';

/**
 * Stage 3: Checks if the tool call accesses paths outside the workspace.
 * 
 * All file operations must be confined to the workspace root to prevent
 * accidental or malicious access to system files.
 * 
 * This stage always blocks, regardless of permission mode.
 */
export const pathConfinementStage: PipelineStage = {
  name: 'path-confinement',
  
  check(context: StageContext): BlockResult | null {
    const { toolName, params, workspaceRoot } = context;
    
    const paths = extractToolPaths(toolName, params);
    
    for (const rawPath of paths) {
      const { safe } = confineToWorkspace(rawPath, workspaceRoot);
      
      if (!safe) {
        throw new ExtensionError(
          ErrorCodes.PATH_OUTSIDE_WORKSPACE,
          `Path "${rawPath}" is outside the workspace root.`,
          'All file operations must be within the project workspace.'
        );
      }
    }
    
    return null;
  },
};

function extractToolPaths(toolName: string, params: Record<string, unknown>): string[] {
  // ... path extraction logic
}
```

```typescript
// extensions/permission-gate/stages/write-constraint.ts

import type { PipelineStage, StageContext, BlockResult } from '../types';
import { ExtensionError, ErrorCodes } from '../../shared/errors';

const READ_TOOLS = new Set(['read', 'read_file']);
const WRITE_TOOLS = new Set(['write', 'edit', 'replace_file_content']);

/**
 * Stage 4: Enforces read-first constraint for file edits.
 * 
 * Before editing a file, the agent must read it first. This prevents
 * blind edits that could introduce bugs or overwrite important code.
 * 
 * This stage blocks in all permission modes except 'acceptEdits'.
 */
export const writeConstraintStage: PipelineStage = {
  name: 'write-constraint',
  
  check(context: StageContext): BlockResult | null {
    const { toolName, params, workspaceRoot, permissionMode } = context;
    
    // Skip in acceptEdits mode
    if (permissionMode === 'acceptEdits') return null;
    
    if (!WRITE_TOOLS.has(toolName)) return null;
    
    const path = String(params.path || '');
    
    // Check if file was previously read
    if (!readFileRegistry.has(resolvePath(path, workspaceRoot))) {
      throw new ExtensionError(
        ErrorCodes.PERMISSION_DENIED,
        `File "${path}" has not been read yet.`,
        'Read the file first before editing it to understand the context.'
      );
    }
    
    return null;
  },
};

// Shared registry (will be managed by index.ts)
const readFileRegistry = new Set<string>();

export function addReadPath(path: string): void {
  readFileRegistry.add(path);
}

export function clearReadRegistry(): void {
  readFileRegistry.clear();
}
```

```typescript
// extensions/permission-gate/stages/interactive.ts

import type { PipelineStage, StageContext, BlockResult } from '../types';

const WRITE_TOOLS = new Set(['write', 'edit', 'replace_file_content']);
const SHELL_TOOLS = new Set(['bash', 'Monitor', 'monitor']);

/**
 * Stage 5: Prompts the user for approval on edits and shell commands.
 * 
 * In 'default' mode, shows a diff for edits and asks for approval.
 * In 'acceptEdits' mode, auto-approves edits but still prompts for bash.
 * In 'featureWork' mode, auto-approves project-scoped operations.
 */
export const interactiveStage: PipelineStage = {
  name: 'interactive',
  
  async check(context: StageContext): Promise<BlockResult | null> {
    const { toolName, params, ctx, permissionMode, workspaceRoot } = context;
    
    if (permissionMode === 'featureWork') {
      // Auto-approve project-scoped operations
      if (isProjectScoped(toolName, params, workspaceRoot)) {
        return null;
      }
    }
    
    if (permissionMode === 'default') {
      if (WRITE_TOOLS.has(toolName) || SHELL_TOOLS.has(toolName)) {
        return await promptEditApproval(toolName, params, ctx, workspaceRoot);
      }
    }
    
    if (permissionMode === 'acceptEdits') {
      if (SHELL_TOOLS.has(toolName)) {
        return await promptEditApproval(toolName, params, ctx, workspaceRoot);
      }
    }
    
    return null;
  },
};

async function promptEditApproval(
  toolName: string,
  params: Record<string, unknown>,
  ctx: any,
  workspaceRoot: string
): Promise<BlockResult | null> {
  // ... prompt logic
}

function isProjectScoped(
  toolName: string,
  params: Record<string, unknown>,
  workspaceRoot: string
): boolean {
  // ... check if operation is project-scoped
}
```

### 4. Orchestrate Pipeline

```typescript
// extensions/permission-gate/index.ts (reduced to ~150 lines)

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { resolve } from 'node:path';
import type { PipelineStage, StageContext, PermissionMode } from './types';
import { protectedPathsStage } from './stages/protected-paths';
import { denyRulesStage } from './stages/deny-rules';
import { pathConfinementStage } from './stages/path-confinement';
import { writeConstraintStage, addReadPath, clearReadRegistry } from './stages/write-constraint';
import { interactiveStage } from './stages/interactive';
import { registerToggle } from './toggle';
import { formatError, ExtensionError } from '../shared/errors';

/**
 * The 5-stage permission pipeline.
 * 
 * Stages execute in order. If any stage returns a BlockResult, the pipeline stops.
 */
const pipeline: PipelineStage[] = [
  protectedPathsStage,
  denyRulesStage,
  pathConfinementStage,
  writeConstraintStage,
  interactiveStage,
];

export default function (pi: ExtensionAPI) {
  let permissionMode: PermissionMode = 'default';
  let workspaceRoot = resolve(process.cwd());

  pi.on('session_start', (_event, ctx) => {
    workspaceRoot = resolve(typeof ctx?.cwd === 'string' ? ctx.cwd : process.cwd());
    permissionMode = resolvePermissionMode(workspaceRoot);
    clearReadRegistry();
  });

  pi.on('tool_result', (event, ctx) => {
    // Track read files for write-constraint stage
    handleToolResult(event, ctx, workspaceRoot);
  });

  pi.on('tool_call', async (event, ctx) => {
    const toolName = getEventToolName(event);
    const params = getEventParams(event);
    
    const context: StageContext = {
      toolName,
      params,
      ctx,
      workspaceRoot,
      permissionMode,
    };

    try {
      for (const stage of pipeline) {
        const result = await stage.check(context);
        if (result) {
          return { block: true, reason: result.reason };
        }
      }
      return undefined;
    } catch (err) {
      if (err instanceof ExtensionError) {
        return { block: true, reason: formatError(err) };
      }
      throw err;
    }
  });

  registerToggle(pi, () => permissionMode, (mode) => { permissionMode = mode; });
}

function resolvePermissionMode(workspaceRoot: string): PermissionMode {
  // ... load from settings
}

function handleToolResult(event: any, ctx: any, workspaceRoot: string): void {
  // ... track read files
}

function getEventToolName(event: any): string {
  return String(event.toolName ?? event.tool ?? '');
}

function getEventParams(event: any): Record<string, unknown> {
  return (event.input ?? event.arguments ?? event.args ?? {}) as Record<string, unknown>;
}
```

---

## Testing Strategy

1. **Unit tests**: Test each stage in isolation
2. **Integration tests**: Test the full pipeline
3. **Regression tests**: Run existing permission-gate tests
4. **Pipeline order tests**: Verify stages execute in correct order

---

## Risk Assessment

**Risk Level**: Medium

**Mitigations**:
- Requires comprehensive tests from issue 008 first
- Keep the same public API (tool_call handler)
- Test each stage independently before integrating
- Document pipeline order clearly

**Potential Issues**:
- Shared state between stages (readFileRegistry)
- Async stages may have race conditions
- Breaking changes to internal APIs

---

## Success Metrics

- ✅ index.ts reduced to <150 lines
- ✅ Each stage is <100 lines
- ✅ Pipeline stages are clearly documented
- ✅ Easy to add custom stages (e.g., audit logging)
- ✅ All tests pass

---

## Future Improvements

1. **Custom stages**: Allow extensions to register custom pipeline stages
2. **Audit logging**: Add a stage that logs all tool calls for compliance
3. **Rate limiting**: Add a stage that limits tool call frequency
4. **Stage configuration**: Make stages configurable via settings

---

## References

- `REFACTORING_REVIEW.md` — Section 2.2
- `extensions/permission-gate/index.ts` — Current monolith
- Pipeline pattern: https://martinfowler.com/articles/collection-pipeline/
