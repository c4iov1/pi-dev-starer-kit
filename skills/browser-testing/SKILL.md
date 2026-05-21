---
name: browser-testing
description: Activates the agent_browser tool (from pi-agent-browser-native). Teaches the model patterns for browser automation: navigate pages, take screenshots, fill forms, click buttons, run QA presets, and verify UI state. Use when the user asks to test a web app, verify UI behavior, capture screenshots, or automate any browser task.
---

# Browser Testing

This skill activates the `agent_browser` tool provided by `pi-agent-browser-native`. Use it for visual testing, form interaction, and UI verification.

## Available Tool

**`agent_browser`** — Drive a real browser session with structured commands.

### Core Patterns

#### Open a page and take a snapshot
```
agent_browser({ args: ["open", "https://example.com"] })
agent_browser({ args: ["snapshot", "-i"] })
```
The `-i` flag produces an interactive snapshot with `@eN` refs for follow-up clicks.

#### Click and fill forms
```
agent_browser({ semanticAction: { action: "click", locator: "text", value: "Login" } })
agent_browser({ semanticAction: { action: "fill", locator: "label", value: "Email", text: "user@example.com" } })
```

#### QA preset (all-in-one)
```
agent_browser({ qa: { url: "https://example.com", expectedText: "Welcome", checkConsole: true, checkErrors: true } })
```

#### Screenshot
```
agent_browser({ args: ["screenshot", "result.png"] })
```

## Testing Workflow

### 1. Visual Verification
1. **Open** the target URL
2. **Snapshot** to see the page structure and interactive elements (`-i`)
3. **Screenshot** to capture visual state
4. **Compare** against expected behavior

### 2. Form Interaction
1. **Snapshot** to find form elements
2. **Fill** fields using label, placeholder, or text locators
3. **Click** submit buttons
4. **Snapshot** to verify resulting state
5. **Check for errors** — look for validation messages, console errors

### 3. QA Automation
Use the `qa` preset for comprehensive checks:
```
agent_browser({ qa: { url: "...", expectedText: "...", expectedSelector: "@e1", checkConsole: true, checkErrors: true, checkNetwork: true } })
```
The preset automatically:
- Opens the URL
- Waits for the page to load (domcontentloaded by default)
- Checks for expected text and/or selectors
- Reports console errors
- Reports network failures
- Takes an optional evidence screenshot

### 4. Accessibility Audit
```
agent_browser({ args: ["snapshot", "-i"] })
```
Review the snapshot for:
- Missing alt text on images
- Form inputs without labels
- Low contrast issues (visual inspection)
- Keyboard navigation barriers

## When to Use

- User asks to "test this page", "check the UI", "verify the form works"
- User asks to "take a screenshot of..."
- User asks to "fill out a form" on a web page
- User asks to "run a QA check" on a URL
- User reports a UI bug and you need to reproduce it
- User asks about accessibility or visual quality

## When NOT to Use

Skip browser testing when:
- The task is purely backend/API — no UI involved
- The user asks for unit/integration tests (use the test framework)
- The page requires authentication you don't have
- A simple `fetch` would suffice for content extraction

## Rules

- **Snapshot before acting.** Always understand the page structure before clicking.
- **Verify after acting.** Take a snapshot or screenshot after every state-changing action.
- **Check console and network.** QA preset reports errors the user might miss.
- **Use semantic actions.** Prefer `semanticAction` over raw `args` for common operations — it's more robust.
- **Handle stale refs.** If `@eN` refs become stale, re-snapshot with `-i` to get fresh refs.
- **Don't over-test.** One QA pass is usually enough. Don't re-test the same page repeatedly.
