# Code Review

Review the following code changes for correctness, security, performance, and quality.

## Changes to review

{{changes}}

## Review checklist

### Correctness
- Does the code do what it claims to do?
- Are edge cases handled? (null, empty, boundary values)
- Are error paths covered with specific exceptions?
- Are there any off-by-one errors or race conditions?

### Security
- Is user input validated and sanitized?
- Are secrets or credentials exposed?
- Are file paths confined to the expected directory?
- Are SQL queries parameterized (no string concatenation)?

### Performance
- Are there unnecessary allocations in hot paths?
- Are database queries missing indexes?
- Is there N+1 query problem?
- Are large datasets paginated?

### Quality
- Are functions under 30 lines?
- Are files under 200 lines?
- Are names specific and searchable (no `data`, `info`, `temp`)?
- Is dependency injection used (no hardcoded dependencies)?
- Are there any empty catch blocks?

### Testing
- Do tests verify behavior, not implementation?
- Are happy path AND error paths tested?
- Can tests run deterministically (no flakiness)?

## Output format

For each finding, report:
```
[severity] file:line — issue
  → suggestion
```

Severity: `[critical]` `[high]` `[medium]` `[low]` `[nit]`

## Constraints

- Review the actual diff, not assumptions about it.
- Every finding must reference a specific file and line.
- Suggest concrete fixes, not vague observations.
