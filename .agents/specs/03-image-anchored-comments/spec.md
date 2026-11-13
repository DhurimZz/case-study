# Comments anchored to the image

**Spec:** 03-image-anchored-comments
**Status:** DONE
**Date:** 2026-11-13

---

## Executive Summary

Click anywhere on the image to start a comment thread at that exact spot. The spot is stored in Liveblocks thread metadata as a fraction of the image's size (`x`, `y` from 0 to 1), never in screen pixels. Every render converts it to a screen position with the same `CanvasTransform` the image uses, so pins and open threads stay on their spot through every pan and zoom. Threads and the new-comment composer are Liveblocks' own `Thread` and `Composer`, placed in a panel we position ourselves. That gives us control over which side the thread opens on (step 4), and the panel stays open while the user drags the canvas. The starter's draggable, screen-pixel threads and dnd-kit are removed.

## Current State

- `src/app/page.tsx` renders `ImageCanvas` only; no comments are visible since step 2.
- `liveblocks.config.ts:12-16`: `ThreadMetadata = { x: number; y: number; zIndex: number }`, where `x`, `y` are **window pixels** (`PlaceThreadButton.tsx:83`, `e.clientX`) and `zIndex` orders dragged threads.
- Unused starter files (`grep -rln "CommentsCanvas\|DraggableThread\|PlaceThreadButton\|useMaxZIndex" src`): `src/components/CommentsCanvas.tsx`, `DraggableThread.tsx`, `PlaceThreadButton.tsx`, `src/hooks.ts`. `src/components/Loading.tsx` is only used by the page's `ClientSideSuspense` fallback.
- `@dnd-kit/core` is imported only by `CommentsCanvas.tsx` and `DraggableThread.tsx` (`grep -rn "@dnd-kit" src`: 2 files).
- `useCanvasGestures` pans on every pointer move; it cannot tell a click from a drag.

## What Already Works

- `CanvasTransform`, `getScreenPoint`, `getImagePoint` and the fit, pan and zoom logic (step 2, 30 tests). Comments reuse them unchanged.
- Liveblocks auth, `resolveUsers`, mention search: unchanged.
- Liveblocks `Thread` already provides replies, reactions, edit, delete, resolve; `Composer` already refuses an empty comment (see contract).

## Prerequisites

- Step 2 committed (`1761266` to `21bd34f`).
- A Liveblocks key in `.env.local` to see comments. Without one, the canvas still works and a "Comments could not be loaded" message shows.

## External API / SDK Contract (Verified)

> Verified against `node_modules/@liveblocks/*` 3.23.0 on 2026-11-13.

| Claim | Source | Tag |
|---|---|---|
| Thread metadata values may be `string \| boolean \| number \| undefined` | `core/dist/index.d.ts:1328` (`BaseMetadata`) | VERIFIED |
| `ThreadData` has `id`, `createdAt`, `comments`, `metadata`, `resolved` | `core/dist/index.d.ts:1461-1471` | VERIFIED |
| Suspense `useThreads(options?)` returns `{ threads }` (never loading) | `react/dist/room-DUr5FIYB.d.ts:1247` | VERIFIED |
| `useCreateThread()` returns `(options) => ThreadData`: the optimistic thread, with its `id`, synchronously. Options: `body`, `attachments?`, `metadata` | `room-DUr5FIYB.d.ts:260-268, 850` | VERIFIED |
| Suspense `useSelf(selector)` returns the selected value, non-null | `room-DUr5FIYB.d.ts:1240` | VERIFIED |
| `Composer` calls `onComposerSubmit(comment, event)` first; if `event.preventDefault()` was called it skips its own `createThread` | `react-ui/dist/components/Composer.js:486-516` | VERIFIED |
| `Composer` cannot submit while empty: `canSubmit = !isEmpty && !isUploadingAttachments`, `submit()` returns early otherwise | `react-ui/dist/primitives/Composer/index.js:899-957` | VERIFIED |
| In the composer, Escape that closes the mention list or formatting toolbar calls `preventDefault()`; a plain Escape only blurs | `primitives/Composer/index.js:650-664` | VERIFIED |
| `Thread` takes `thread`, `autoFocus`, `onThreadDelete`, and `div` props such as `className` | `react-ui/dist/index.d.ts:1359-1476` | VERIFIED |
| `CommentPin` is a `button`; props `corner`, `userId`, `size`; default size 32 px; its CSS sets `transform` per corner | `react-ui/dist/index.d.ts:1263-1291`, `react-ui/styles.css` (`.lb-comment-pin`) | VERIFIED |
| `FloatingThread` is a Radix popover with default collision handling (flips by itself), closes on any outside pointer down, and only exposes `side`, `sideOffset`, `align`, `alignOffset` | `react-ui/dist/components/FloatingThread.js:35-63`, `index.d.ts:1490` | VERIFIED |

## Coordinate Model

```
stored anchor (0..1)  --x imageSize-->  image point (px)  --transform-->  screen point (px)
       ^                                                                      |
       '------------ /imageSize ------- getImagePoint(click) <---------------'
```

- **Click to anchor:** `getImagePoint(click, transform)` gives the image pixel under the cursor; dividing by the natural size gives the anchor. A click outside 0..1 is outside the image.
- **Anchor to pin:** multiply by the natural size, then `getScreenPoint(..., transform)`. The pin's top-left corner (the pointed corner of `CommentPin corner="top-left"`) sits exactly there.
- Fractions instead of image pixels: the anchor survives swapping the image for a higher or lower resolution version of the same picture.

## Implementation Options

### Plan A: keep the starter's `FloatingThread` / `FloatingComposer`
**Pros:** Least code; Radix handles Escape, outside clicks, focus.
**Cons:** Radix flips the thread by itself against the window edge, so step 4's flip rule would be the library's, not ours. Any pointer down outside closes the thread, so dragging the canvas closes it. No access to Radix's `avoidCollisions` or `onPointerDownOutside` (`FloatingThread.js` passes its extra props to `Thread`, not to the popover).

### Plan B: `Thread` and `Composer` in a panel we position (chosen)
**Blast radius:** 21 files, 5 of them deleted.
**Pros:** The panel position is a pure function of the pin position and named layout constants (`THREAD_WIDTH`, `PIN_SIZE`), exactly what step 4 needs. The panel re-renders with the pins, so it follows pan and zoom in the same frame. We decide what closes it: a click, not a drag.
**Cons:** We handle Escape and focus return ourselves (about 20 lines).

### Plan C: `FloatingThread` plus the `lb-portal` class on the canvas
`FloatingThread.js:58-62` ignores outside clicks on elements inside `.lb-portal`. Adding that class to our canvas would stop the drag-to-close problem.
**Cons:** Depends on an undocumented internal class; still flips by itself.

## Interfaces

```ts
// liveblocks.config.ts
ThreadMetadata: { x: number; y: number } // fractions of the image size, 0..1

// src/canvas/canvas-math.ts (added)
export function getNormalizedPoint(imagePoint: Point, imageSize: Size): Point;
export function getImagePointFromNormalized(normalizedPoint: Point, imageSize: Size): Point;
export function isNormalizedPoint(point: Point): boolean; // both finite and within 0..1
export function getScreenPointFromNormalized(normalized: Point, imageSize: Size, transform: CanvasTransform): Point; // anchor -> pin
export function getNormalizedPointFromScreen(screen: Point, imageSize: Size, transform: CanvasTransform): Point;   // click -> anchor
export const DRAG_THRESHOLD = 4;               // px before a press becomes a drag
export function isDrag(startPoint: Point, currentPoint: Point): boolean;

// src/canvas/use-canvas-gestures.ts (changed)
export const SCROLLABLE_OVERLAY_PROPS;         // spread on overlay elements that scroll on wheel
options: { panBy; zoomAt; onTap?: (canvasPoint: Point) => void }

// src/canvas/image-canvas.tsx (changed)
export interface CanvasOverlayState { transform: CanvasTransform; imageSize: Size; viewportSize: Size; focusCanvas: () => void }
export interface ImageCanvasProps {
  src: string; alt: string;
  onImageClick?: (normalizedPoint: Point) => void;
  onBackgroundClick?: () => void;
  renderOverlay?: (overlay: CanvasOverlayState) => ReactNode;
}

// src/comments/comment-layout.ts
export const PIN_SIZE = 32; export const THREAD_WIDTH = 320; export const THREAD_MAX_HEIGHT = 480; export const THREAD_GAP = 8;
export function getThreadPosition(pinPoint: Point): Point; // step 4 adds the side

// src/comments/comment-layer.tsx
export type CommentSelection =
  | { kind: "draft"; anchor: Point }
  | { kind: "thread"; threadId: string }
  | null;
```

Components: `ImageComments` (selection state, wires the canvas to the comment layer), `CommentLayer` (Liveblocks hooks, pins, panel, Escape listener), `AnchoredPin` (a `CommentPin` at a screen point), `CommentPanel` (positioned panel).

### Click handling

| Input | Something open? | Result |
|---|---|---|
| Click on the image | no | Draft pin at the click, composer opens and focuses |
| Click on the image | yes | Closes it; no new draft (like clicking outside a popover) |
| Click on the canvas outside the image | any | Closes what is open |
| Click a pin | its thread closed | Opens that thread (replaces anything open) |
| Click a pin | its thread open | Closes it |
| Drag (moved 4 px or more) | any | Pans; the open thread or draft stays open and follows |
| Wheel or pinch | any | Zooms; the panel follows. Plain wheel over the panel scrolls the panel |
| Escape in the panel | yes | Closes it; focus returns to the thread's pin |
| Submit in the draft composer | draft | Thread created with the anchor, then shown open |

## Blast Radius

| # | File | Action | Reason |
|---|---|---|---|
| 1 | `.agents/specs/03-image-anchored-comments/spec.md` | Add | This spec |
| 2 | `.agents/plans/03-image-anchored-comments.md` | Add | Commit plan |
| 3 | `src/components/CommentsCanvas.tsx` | Delete | Starter screen-pixel threads |
| 4 | `src/components/DraggableThread.tsx` | Delete | Threads are anchored, not dragged |
| 5 | `src/components/PlaceThreadButton.tsx` | Delete | Replaced by clicking the image |
| 6 | `src/hooks.ts` | Delete | `useMaxZIndex`, only for dragged threads |
| 7 | `liveblocks.config.ts` | Modify | Metadata becomes the image-relative anchor |
| 8 | `package.json`, 9 `package-lock.json` | Modify | Remove `@dnd-kit/core` |
| 10 | `src/canvas/canvas-math.ts` | Modify | Normalized point helpers |
| 11 | `src/canvas/canvas-math.test.ts` | Modify | Their tests, plus click-to-pin round trips |
| 12 | `src/canvas/use-canvas-gestures.ts` | Modify | Tap vs drag, scrollable overlays |
| 13 | `src/canvas/image-canvas.tsx` | Modify | Click callbacks, overlay render prop |
| 14 | `src/comments/comment-layout.ts` | Add | Layout constants shared by code and CSS |
| 15 | `src/comments/anchored-pin.tsx` | Add | Pin at a screen point |
| 16 | `src/comments/comment-panel.tsx` | Add | Positioned thread or composer panel |
| 17 | `src/comments/comment-layer.tsx` | Add | Threads, pins, draft, panel |
| 18 | `src/comments/comments.module.css` | Add | Comment layer styles |
| 19 | `src/comments/image-comments.tsx` | Add | Selection state, canvas wiring, error boundary |
| 20 | `src/app/page.tsx` | Modify | Render `ImageComments`; new room id |
| 21 | `src/components/Loading.tsx` | Delete | Its only user (the page fallback) is gone |

### Files NOT affected

| File | Why |
|---|---|
| `src/app/api/**`, `src/database.ts` | Auth and users unchanged; the new room id still matches `liveblocks:examples:*` |
| `src/app/Providers.tsx`, `src/app/layout.tsx` | Providers unchanged |
| `src/canvas/use-canvas-transform.ts`, `use-image-loader.ts`, `use-element-size.ts`, `zoom-controls.tsx`, `canvas.module.css` | Transform and image loading unchanged |
| `src/styles/globals.css` | Its starter rules (`.loading`, `.error`, `.thread`, `.composer`, `main`) become dead; logged as debt, cleaned in the final step |

## Change Dependency (commit order)

| Commit | Content | Builds because |
|---|---|---|
| 1 | spec, plan, delete the 3 starter thread components | Nothing imports them since step 2; `hooks.ts` still compiles |
| 2 | delete `hooks.ts`, new metadata type, remove dnd-kit | The last users of `zIndex` and dnd-kit are gone |
| 3 | canvas: normalized points, tap detection, overlay prop | New props are optional; the page is unchanged |
| 4 | comments: layout, pin, panel, layer, CSS | Not rendered yet |
| 5 | `ImageComments`, page wiring, delete `Loading.tsx` | Everything it imports exists |

## User Flow Impact

| # | Flow | Before (step 2) | After | Changed? |
|---|---|---|---|---|
| 1 | Click the image | Nothing | Composer at the spot | YES |
| 2 | Submit a comment | n/a | Pin stays at the spot, thread opens with the comment | YES |
| 3 | Click an empty spot, then submit nothing | n/a | Send is disabled; Enter does nothing | YES |
| 4 | Pan or zoom with pins | n/a | Pins and the open thread stay on their spot | YES |
| 5 | Open a thread from its pin, reply, react, edit, resolve | n/a | Liveblocks `Thread` features | YES |
| 6 | Second browser on the same room | n/a | Sees the same pins at the same image spots, whatever its window size and zoom | YES |
| 7 | Drag to pan, zoom, fit, image error state | Works | Works; a press under 4 px is now a click, not a pan | Small |
| 8 | No Liveblocks key or auth failure | Page renders the canvas | Canvas works; "Comments could not be loaded" message | YES |

## Secrets & Data

No secret handling changes. Rendered user data: comment bodies, author avatars and names from Liveblocks and `/api/users` (fake names from `src/database.ts`). The room id changes to `liveblocks:examples:image-comments`, so threads created by the starter (window-pixel metadata) stay in the old room and never render here.

## Acceptance Criteria

| # | Criterion | How to verify |
|---|---|---|
| AC-1 | A click on the image opens a composer whose pin's point is exactly at the click | Unit test (click to anchor to pin round trip) + manual |
| AC-2 | The stored metadata is the click position divided by the natural size, within 0..1 | Unit test + Liveblocks dashboard |
| AC-3 | At any zoom and pan, each pin is over the same image pixel it was placed on | Unit test (anchor to image pixel invariant under transforms) + manual |
| AC-4 | An open thread or draft follows its pin while dragging and zooming, and does not close on drag | Manual |
| AC-5 | A click closes what is open; the next click on the image opens a new composer | Manual |
| AC-6 | Escape closes the panel and returns focus to the pin | Manual (keyboard) |
| AC-7 | Threads with invalid metadata (outside 0..1, missing) are not drawn and do not crash | Unit test (`isNormalizedPoint`) |
| AC-8 | Without a valid key the canvas still pans and zooms and shows "Comments could not be loaded" | Manual |
| AC-9 | `npm test`, `tsc`, `npm run build` pass; each commit type-checks on its own | Commands |

## Decision Points

1. **Plan B** (own panel, Liveblocks `Thread` and `Composer` inside). Step 4's flip must be our rule, and the thread must not close while panning.
2. **Anchors as fractions (0..1), not image pixels.** Independent of the image file's resolution, and "is it on the image" is one range check.
3. **New room id.** The metadata meaning changed; old starter threads would land in the wrong place. Also defended in code: threads whose anchor is not a valid fraction are skipped.
4. **4 px drag threshold.** A real click jitters a pixel or two; without a threshold it would pan instead of commenting.
5. **First click closes, second click comments.** Same as clicking outside any popover; avoids a composer popping up when the user only wanted to close a thread.
6. **Create the thread ourselves** (`preventDefault` + `useCreateThread`) so we get its id and can show it open right after posting.
7. **Pins are positioned in TypeScript with `getScreenPoint`, not CSS variables.** Every pin re-renders on pan; with tens of pins that is cheap, and the anchoring math stays in one tested function (review note #6 from step 2, accepted trade-off).

## Out of Scope

- Left/right flip of the thread (step 4). Threads open to the right in this step.
- Keeping a tall thread inside the viewport vertically (a pin near the bottom shows a clipped panel). Considered in step 4.
- Loading, connection-lost, no-comments-yet and failed-post states (step 5). This step only has the error boundary message.
- A keyboard path to place a comment without a mouse.
- Mobile layout of the panel (step 6).
- Removing the dead starter rules in `globals.css` (final cleanup step).
- A selected thread that disappears (deleted by someone else, or a failed post rolled back) leaves one click that only clears the stale selection. Clearing it from an effect could also clear a thread selected right after creation; failed posts are step 5's job, so it is handled there.
- Unit tests for `getThreadPosition`: it changes in step 4 and is tested there with the flip.

## Open Questions

- Step 2 #8 (hook action names vs `AGENTS.md` prefixes) is still open; the new code follows the existing names.

## Self-Audit

1. **What if the image is not loaded yet?** `renderOverlay` is only called once the transform, natural size and viewport size are known, so pins never compute against a missing size.
2. **Pointer down on a pin starting a pan?** The overlay is a sibling of the viewport, not a child, so a pointer down on a pin or panel never reaches the pan handlers. Wheel events still reach the canvas `<section>` listener.
3. **Wheel over a long thread.** The canvas listener calls `preventDefault()`, which would stop the panel from scrolling. Overlays marked scrollable are skipped for plain wheel; a pinch (`ctrlKey`) still zooms the canvas.
4. **Escape inside Liveblocks widgets** (mention list, toolbar) is marked handled by Liveblocks, so the panel only closes on an unhandled Escape.
5. **Selected thread deleted by someone else.** The panel finds no thread and renders nothing; the next click clears the stale selection.
6. **Escape after a drag** (found by the smoke test). Pressing the canvas moves focus to the canvas `<section>` (`tabIndex={-1}`), out of the panel, so a `keydown` handler on the panel never fired. Escape is now a `document` listener in `CommentLayer`, active only while something is open, and re-subscribed only when the selection changes.
7. **A fast flick read as a click.** The pointer handlers decide tap vs drag from a ref, not the `isPanning` state: a `pointerup` can arrive before React re-renders after the threshold was crossed.

## Corrections Log

| Original claim | Reality | Impact |
|---|---|---|
| `CommentPanel` handles Escape with `onKeyDown` | After a drag, focus is on the canvas, not the panel; Escape did nothing (smoke test step 4) | Moved to a `document` listener in `CommentLayer`; `CommentPanel` lost its `onClose` prop |
| `isPanning` state can decide tap vs drag | State lags one render behind fast pointer events | `isDraggingRef` decides; the state only drives the cursor |

## Verification

- [x] `npm test` (50 tests), `npx tsc --noEmit`, `npm run build`
- [x] Each commit type-checks on its own (scratch copy of `HEAD`, each commit's files added or deleted in order); after commit 5 the copy matches the working tree
- [x] Headless Edge smoke test over the DevTools protocol, 1280 by 800, real Liveblocks room, nothing submitted:

| Step | Result |
|---|---|
| Load | Fit at 44%, no error message (auth works) |
| Click at 62% / 31% of the image | Draft pin at exactly the click (703.4, 266.2), anchor (0.62, 0.31), composer open and focused (AC-1, AC-2) |
| Drag by (-150, -100) | Image and pin both moved exactly (-150, -100); composer still open (AC-4) |
| Wheel zoom to 98% | Pin still at (0.62, 0.31) of the image's rendered box (AC-3); composer still open |
| Escape | Closed (after the fix in Self-Audit 6) (AC-6) |
| Click, then click elsewhere on the image | First opens, second only closes (AC-5) |
| Fit, open, click outside the image twice | First closes, second does nothing |
| After the review fixes | Same results; focus in the composer when it opens, on the canvas after Escape on a draft; the pin's `aria-controls` points at the dialog; a thread already in the room renders at its stored anchor |

- [x] Code review agent: no blockers, 12 nits

| # | Finding | Outcome |
|---|---|---|
| 1 | Stale selection when the open thread disappears | Deferred to step 5 (Out of Scope) |
| 2 | Anchor conversions built inside components; tests rebuilt them | Fixed: `getScreenPointFromNormalized`, `getNormalizedPointFromScreen`, used by both components and the tests |
| 3 | Tap vs drag untested | Fixed: `isDrag` + table test |
| 4 | Extract the Escape effect into a hook | Declined: needs a latest-callback ref; the inline effect is easier to follow |
| 5 | `endPress`, `setPinRef`, `logCommentsError` lack prefixes | Renamed `handlePressEnd`, `updatePinRef`, `handleCommentsError` |
| 6 | Compound wheel condition | Named `shouldScrollOverlay` |
| 7 | Magic `480px` | `THREAD_MAX_HEIGHT` |
| 8 | Spec said 6 deleted files | Fixed (5) |
| 9 | Tab from an open pin crossed all other pins first | Panel rendered right after its pin, `aria-controls` on the pin |
| 10 | Focus to `<body>` after closing a draft or deleting a thread | Focus moves to the canvas (`focusCanvas`) |
| 11 | Resolved state only visual | ", resolved" in the pin label |
| 12 | Draft pin was a button that did nothing | Clicking it discards the draft |
- [ ] Developer: post a comment, reply, resolve; AC-6 focus return with the keyboard; AC-8 without a key; ideally two windows on the same room

## Session Tracking

| Date | Session | Description |
|---|---|---|
| 2026-11-13 | 1 | Contract research, spec, plan, implementation |
