# Integration Test Patterns

Integration tests use `tests/integration/harness.ts` to load multiple Pi extensions into one mock ExtensionAPI instance.

Use these tests for behavior that depends on extension interaction rather than a single helper function:

- tool registration conflicts
- event handler ordering
- settings consistency across extensions
- permission-gate behavior for non-core tools
- end-to-end flow: load extension → trigger session → trigger tool call → execute tool → trigger tool result

Pattern:

```ts
const harness = createIntegrationHarness({ permissionMode: "featureWork" });
try {
  harness.loadExtension(permissionGate);
  harness.loadExtension(artifactRead);
  harness.triggerSessionStart();

  const result = await harness.executeTool("artifact_read", { path: "data.csv" });
  // assert result
} finally {
  harness.cleanup();
}
```

Keep integration tests small and deterministic. Prefer unit tests for pure helpers or single-extension edge cases.
