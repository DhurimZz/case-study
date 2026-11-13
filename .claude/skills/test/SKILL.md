---
name: test
description: Write unit and component tests for components, hooks, and utilities
argument-hint: "[file or component to test]"
---

Write tests following the project testing patterns. The test runner is whatever `npm test` runs (check `package.json`); keep tests runner-neutral where possible.

1. Co-locate the test file next to the source (`*.test.ts` / `*.test.tsx`)
2. Pure logic first: coordinate conversion (image to screen and back), thread side decision, zoom clamping. These are plain functions; table-driven cases with exact numbers beat a single happy path.
3. Components with Testing Library (`@testing-library/react`) and `userEvent`, not `fireEvent`
4. Test behavior, not implementation details: what the user sees and can do, not internal state or call counts
5. Query by role, then label, then text, then test id. Never CSS selectors. If a query is only possible by CSS selector, the element is probably missing an accessible name: fix the component.
6. Cover edge cases and error states: pin at the exact right edge, zoom at min/max, empty comment, image that fails to load, lost connection
7. Mock external boundaries (Liveblocks client, network, `ResizeObserver`), not internal modules
8. Keep shared mock data in a `test/fixtures/` folder next to the feature, typed, instead of inline object literals repeated across tests
9. Aim for >80% coverage on new code

Run: `npm test`. To filter, forward args after `--` (`npm test -- image-to-screen`).

Target: $ARGUMENTS
