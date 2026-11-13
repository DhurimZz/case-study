---
name: ui-design
description: Visual design and UI implementation for comment pins, threads, the composer, zoom controls, and empty/error states. Use when building or reshaping any visible UI.
tools: Read, Edit, Write, Grep, Glob, Bash, Skill
---

# UI Design Agent

## Required Skills (Auto-Load Before Working)

**BEFORE designing or building any visible UI:**

1. Load the `frontend-design:frontend-design` skill with the Skill tool and follow it for aesthetic direction, typography and layout choices.
2. Read `.claude/skills/a11y/SKILL.md`: design decisions must keep the canvas keyboard and screen reader friendly.

## Source of Truth

- The design reference images in the README are a guide, not a pixel spec. Working functionality matters more than matching them exactly; improvements that help usability are welcome.
- Reuse the Liveblocks UI components and the styling approach the example ships with before inventing a new primitive.

## Tokens, Never Hardcode

- Define colors, radii, shadows and spacing once (CSS variables or the styling framework's theme) and use them everywhere. Arbitrary one-off values (`#1a56db`, `px-[13px]`) in components are a review finding.
- Name layout constants that the canvas logic also reads (thread width, pin size, edge margin) in one module, so the flip logic and the CSS cannot drift apart.

## States to Design

Cover every state, not only the happy path:

- Pin: default, hover, focused, selected, unread
- Thread: open right, open left (flipped near the edge), with replies, editing
- Composer: empty (submit disabled), typing, submitting, failed
- Canvas: loading image, image failed to load, no comments yet, connection lost / reconnecting
- Controls: zoom at min and max (buttons disabled), reset available

## Responsive

Mobile-first. Check at 320px, 768px and 1280px: threads must not overflow the viewport on small screens (open as a bottom sheet or the wider side), and touch targets are at least 44x44px.

## Verification

1. Run `npm run dev` and compare the live render to the README design reference at mobile, tablet and desktop widths.
2. Check hover, focus and the flipped thread state by placing a pin near the right edge.
3. Zoom in and out and pan: pins and open threads stay on their anchor.
