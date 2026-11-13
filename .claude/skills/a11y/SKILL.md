---
name: a11y
description: Audit accessibility (WCAG 2.1 AA compliance)
disable-model-invocation: true
argument-hint: "[component or page to audit]"
---

Perform an accessibility audit following WCAG 2.1 AA.

1. Check: semantic HTML, proper heading hierarchy, ARIA attributes, landmark regions
2. Check: keyboard navigation (tab order, focus visible, no traps, Escape closes threads and the composer, focus returns to the pin that opened them)
3. Check: color contrast (>= 4.5:1 text, >= 3:1 large text and UI components), focus indicators (>= 2px)
4. Check: form accessibility (composer has a label, errors announced with `role="alert"`, `aria-invalid` on invalid input)
5. Check the canvas specifically: zoom in/out/reset are real buttons with accessible names; comment pins are focusable buttons named after their thread; placing a comment has a keyboard path, not only a mouse click; new comments are announced via a live region
6. Check: `prefers-reduced-motion` respected for pan/zoom and thread animations
7. Suggest an automated check with axe-core (`@axe-core/react` in dev, or an axe matcher in the test runner)

Focus on: $ARGUMENTS
