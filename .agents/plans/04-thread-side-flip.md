# Plan 04: threads open inwards near the right edge

**Spec:** [04-thread-side-flip](../specs/04-thread-side-flip/spec.md)
**Mode:** spec → plan → implement

## Commits

The layout functions change signature together with their only caller, so they share a commit.

| # | Message | Files |
|---|---|---|
| 1 | `docs(comments): add the thread side spec and plan` | `.agents/specs/04-thread-side-flip/spec.md`, `.agents/plans/04-thread-side-flip.md` |
| 2 | `docs(ai): let hook actions be plain verbs` | `AGENTS.md` |
| 3 | `fix(comments): let clicks beside a round pin reach the canvas` | `src/comments/comments.module.css` |
| 4 | `feat(comments): open threads inwards near the right edge and keep them on screen` | `src/comments/comment-layout.ts`, `src/comments/comment-layout.test.ts`, `src/comments/comment-panel.tsx`, `src/comments/comment-layer.tsx`, `src/canvas/use-element-size.ts` |

Commit 3 was added during verification: the smoke test's click landed on the corner of an existing pin's square wrapper and did nothing (a step 3 bug, fixed in its own commit). `use-element-size.ts` joined commit 4 after the review: the panel's height must be its border box.

## Steps

1. `AGENTS.md`: one line under the function prefixes rule.
2. `comment-layout.ts`: `EDGE_MARGIN`, `ThreadSide`, `getThreadSide`, `getThreadLeft`, `getThreadTop`, `getThreadMaxHeight`; remove `getThreadPosition`.
3. Tests: side truth table at the exact boundary, wider side, left position, vertical cases (fits, near bottom, off screen below and above, unknown height), max height.
4. `CommentPanel`: `canvasSize` prop, `useElementSize` on its own ref, `data-side`.
5. `CommentLayer`: pass `overlay.viewportSize`.
6. Verify (spec checklist), review, hand over.
