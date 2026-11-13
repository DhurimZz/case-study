# Plan 03: comments anchored to the image

**Spec:** [03-image-anchored-comments](../specs/03-image-anchored-comments/spec.md)
**Mode:** spec → plan → implement

## Commits

Each file lands in exactly one commit, in dependency order, so every commit builds.

| # | Message | Files |
|---|---|---|
| 1 | `chore(comments): add the comments spec and plan, remove the starter's draggable threads` | `.agents/specs/03-image-anchored-comments/spec.md`, `.agents/plans/03-image-anchored-comments.md`, `src/components/CommentsCanvas.tsx` (delete), `src/components/DraggableThread.tsx` (delete), `src/components/PlaceThreadButton.tsx` (delete) |
| 2 | `refactor(comments): store thread anchors as fractions of the image size` | `src/hooks.ts` (delete), `liveblocks.config.ts`, `package.json`, `package-lock.json` |
| 3 | `feat(canvas): report image clicks as normalized points and render an overlay` | `src/canvas/canvas-math.ts`, `src/canvas/canvas-math.test.ts`, `src/canvas/use-canvas-gestures.ts`, `src/canvas/image-canvas.tsx` |
| 4 | `feat(comments): add anchored pins and the thread panel` | `src/comments/comment-layout.ts`, `src/comments/anchored-pin.tsx`, `src/comments/comment-panel.tsx`, `src/comments/comment-layer.tsx`, `src/comments/comments.module.css` |
| 5 | `feat(comments): click the image to comment, threads stay on their spot` | `src/comments/image-comments.tsx`, `src/app/page.tsx`, `src/components/Loading.tsx` (delete) |

## Steps

1. Delete the starter thread components; `npm uninstall @dnd-kit/core`; delete `hooks.ts`; metadata `{ x, y }` with doc comments.
2. `canvas-math.ts`: `getNormalizedPoint`, `getImagePointFromNormalized`, `isNormalizedPoint` + tests, including the two invariants: click → anchor → pin lands on the click; the anchor's image pixel is the same under any transform.
3. `use-canvas-gestures.ts`: drag threshold, `onTap`, scrollable overlay exception for the wheel.
4. `image-canvas.tsx`: `handleTap` → `onImageClick` (normalized, inside 0..1) or `onBackgroundClick`; `renderOverlay` after the viewport.
5. Comments folder: layout constants, `AnchoredPin`, `CommentPanel` (Escape, scrollable), `CommentLayer` (threads, draft, create thread, focus return), CSS.
6. `ImageComments`: selection state, click handlers, `ErrorBoundary` + `ClientSideSuspense` around the layer. Page: room `liveblocks:examples:image-comments`.
7. Verify: tests, tsc, build, per-commit type check, dev server smoke test and screenshot, cleanup of processes; code review agent; hand over.
