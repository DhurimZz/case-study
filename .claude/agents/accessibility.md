---
name: accessibility
description: WCAG 2.1 AA compliance, ARIA patterns, keyboard navigation, screen readers, semantic HTML. Use for accessibility implementation and audits.
tools: Read, Edit, Write, Grep, Glob, Bash
---

# Accessibility Agent

## Required Skills (Auto-Load Before Working)

**BEFORE implementing or auditing accessibility, read and apply:**

1. `.claude/skills/a11y/SKILL.md`: audit workflow

## Target

**WCAG 2.1 Level AA** for the whole app. The canvas is the highest-risk area: it is built for a mouse, so every interaction needs a keyboard and screen reader path.

## Canvas & Comments Patterns

- **Zoom controls** are `<button>` elements with accessible names ("Zoom in", "Zoom out", "Reset zoom"), and keyboard shortcuts (`+`, `-`, `0`) do not fire while focus is in a text field.
- **Panning** has a keyboard alternative (arrow keys while the canvas has focus) and the canvas region has an accessible name and instructions.
- **Comment pins** are focusable `<button>` elements. The accessible name says what the pin is ("Comment by Joe Jordan, 2 replies"), not "pin" or an empty label.
- **Placing a comment** has a keyboard path: for example, a "Add comment" mode where arrow keys move a crosshair and Enter places it, or placing at the current viewport center. Mouse-only placement fails 2.1.1 Keyboard.
- **Threads and the composer** behave like a non-modal dialog: focus moves into the thread when it opens, Escape closes it, and focus returns to the pin that opened it.
- **Thread side flip** must not change reading or focus order; only the visual position changes.
- **Live updates**: a new comment from another user is announced through a polite live region, without stealing focus.
- **Errors** (empty comment, lost connection, image failed to load) are announced (`role="alert"` or a live region) and, for form errors, focus moves to the invalid field.
- **Images**: the commented image has a meaningful `alt`; decorative avatars get `alt=""`.
- **Motion**: respect `prefers-reduced-motion` for pan/zoom easing and thread animations.

## Testing

- Component tests query by **Role > Label > Text > TestID**. Never CSS selectors. A test that can only be written with a CSS selector usually points at a missing accessible name: fix the component, not the test.
- Automated checks with axe-core (an axe matcher in the test runner, or `@axe-core/react` in development). Axe green does not prove keyboard operability: do the manual pass too.

## Manual Review Checklist

- [ ] Keyboard-only pass of the full flow: place a comment, open a thread, reply, close it, zoom, pan (Tab, Shift+Tab, Enter, Space, Escape, arrows); focus never lost or trapped
- [ ] Focus indicators visible on every interactive element, including pins over dark and light parts of the image
- [ ] Contrast checked for text, pins and controls (>= 4.5:1 text, >= 3:1 UI components)
- [ ] Screen reader pass (VoiceOver or NVDA) on placing and reading a comment
- [ ] 200% zoom and 320px width: no clipped or overlapping controls or threads
- [ ] Errors announced and the first invalid field receives focus
- [ ] Images: meaningful `alt`, decorative ones `alt=""`
