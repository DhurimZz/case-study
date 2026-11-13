# Image canvas with drag to pan and zoom controls

**Spec:** 02-pan-zoom-canvas
**Status:** DONE
**Date:** 2026-11-13

---

## Executive Summary

Put an image on a full-screen canvas that the user can drag to pan and zoom with buttons or the mouse wheel. Pan and zoom live in one `CanvasTransform` (`x`, `y`, `scale`) that maps image coordinates to screen coordinates. The math is a set of pure, unit-tested functions, so step 3 can place comment pins with the same functions and they stay on their spot at every zoom level. The step also adds the test runner (Vitest), the `@/*` import alias, and visible loading and error states for the image.

## Current State

- `src/app/page.tsx:22` renders the starter's `CommentsCanvas` (`grep -rn "CommentsCanvas" src --include=*.tsx`: 1 import, 1 usage). It places threads in window pixels (`e.clientX`, `PlaceThreadButton.tsx:83`) inside a 100vw by 100vh div. There is no image, no pan and no zoom.
- No test runner: `package.json` has only `dev`, `build`, `start`.
- No path alias: the starter imports with `../../../` in 3 places (`grep -rn '"\.\./\.\./\.\./' src | wc -l`). `AGENTS.md` wrongly says the starter ships one (logged in spec 01).

## What Already Works

- Liveblocks auth, room and providers: unchanged. The canvas does not talk to Liveblocks in this step.
- The page's `RoomProvider`, `ErrorBoundary` and `ClientSideSuspense` stay; only the child changes.
- The starter comment components stay in the repo, unused, until step 3 replaces them (see Decision 4).

## Prerequisites

- Spec 01 merged (it is: commits `1860b54` to `6334244`).
- No Liveblocks key needed for this step: the canvas renders without one.

## External Contracts (Verified)

> Verified on 2026-11-13 against `node_modules` and the npm registry.

| Claim | Source | Tag |
|---|---|---|
| Next.js supports `paths` in `tsconfig.json` out of the box | `node_modules/next/dist/docs/01-app/01-getting-started/01-installation.md:422-460` | VERIFIED |
| React attaches `wheel`, `touchstart` and `touchmove` listeners as passive, so `preventDefault()` in a React `onWheel` handler does nothing | `node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:20828-20832` | VERIFIED |
| A native `addEventListener("wheel", fn, { passive: false })` can call `preventDefault()` and stop page scroll and browser zoom | DOM spec behavior, `lib.dom.d.ts` `AddEventListenerOptions.passive` | VERIFIED (type), behavior ASSUMED, checked manually |
| Vitest 5.1.0 conflicts with the starter's `@types/node@20.19.30`: it requires `^22 \|\| >=24` | `npm install -D vitest@5.1.0 --dry-run` fails with ERESOLVE | VERIFIED |
| Vitest 4.1.12 installs cleanly; engines `^20 \|\| ^22 \|\| >=24`, released 2026-10-15 | `npm view vitest@4.1.12 engines`, `--dry-run`: "added 40 packages" | VERIFIED |
| An SVG with `width` and `height` attributes reports them as `naturalWidth` and `naturalHeight` when loaded in an `Image` | Browser behavior | ASSUMED; a zero size is treated as a load error, so a wrong assumption shows the error state instead of a broken canvas |
| `ResizeObserver` fires once right after `observe()`, so the first size arrives without a resize | Browser behavior | ASSUMED; headless Edge screenshot shows the poster fitted on first load |
| A trackpad pinch arrives as `wheel` events with `ctrlKey: true` and small deltas | Browser behavior (Chrome, Edge, Firefox, Safari) | ASSUMED; pinch zoom speed to be checked manually |
| `LiveblocksProvider` accepts `badgeLocation: "top-right" \| "bottom-right" \| "bottom-left" \| "top-left"` (default `"bottom-right"`) for the free-plan badge | `node_modules/@liveblocks/react/dist/room-DUr5FIYB.d.ts:2196` (props are `ClientOptions`), `node_modules/@liveblocks/core/dist/index.d.ts:1717, 2637-2641` | VERIFIED |

## Coordinate Model

Two coordinate systems:

- **Image coordinates**: pixels of the image at its natural size. `(0, 0)` is the image's top-left corner. Comments are stored in these in step 3.
- **Screen coordinates**: CSS pixels relative to the canvas viewport element's top-left corner (not the window).

One transform converts between them:

```
screen = image * scale + (x, y)
image  = (screen - (x, y)) / scale
```

`(x, y)` is where the image's top-left corner sits on screen; `scale` is how many screen pixels one image pixel covers (1 = 100%).

**Zooming around a point** (cursor for the wheel, viewport center for the buttons): the image point under the focal point must stay under it. Take that image point with the current transform, apply the new scale, and solve for the offset:

```
p      = (focal - (x, y)) / scale        // image point under the focal point
x'     = focal.x - p.x * scale'
y'     = focal.y - p.y * scale'
```

This is the same property comments need: a fixed image point, with the transform deciding where it lands on screen.

## Implementation Options

### Plan A: CSS transform on a "world" layer, state in our own hook (chosen)
The image sits inside a div styled `transform: translate(x, y) scale(scale)` with `transform-origin: 0 0`. Pan and zoom are a `CanvasTransform` in React state. Comment pins (step 3) go in a separate layer that is *not* scaled; each pin's screen position is `getScreenPoint(pin, transform)`.
**Blast radius:** 21 files (see table).
**Pros:** All math is ours, pure and testable. One state object read by the image and, later, by the comment layer. Pins stay a constant size at every zoom.
**Cons:** More code to write and explain than a library.

### Plan B: a pan/zoom library (for example `react-zoom-pan-pinch`)
**Pros:** Less code, pinch zoom for free.
**Cons:** The transform lives inside the library; the comment layer needs it too, so we would sync it back out. Children are scaled, so pins would grow with zoom unless counter-scaled. The hardest part of the evaluation ("comments staying anchored through zoom and pan") would be the part we did not write.

### Plan C: draw on an HTML `<canvas>`
**Pros:** Fast for many objects.
**Cons:** Liveblocks threads, composers and pins are DOM components; we would still need a DOM overlay and the same math, plus redraw logic. No benefit for one image.

## Interfaces

```ts
// src/canvas/canvas-math.ts
export interface Point { x: number; y: number }
export interface Size { width: number; height: number }
export interface CanvasTransform { x: number; y: number; scale: number }

export const MIN_SCALE = 0.1;            // 10%
export const MAX_SCALE = 8;              // 800%
export const ZOOM_BUTTON_FACTOR = 1.25;  // one button press
export const FIT_PADDING = 48;           // screen px around the fitted image

export function getScreenPoint(imagePoint: Point, transform: CanvasTransform): Point;
export function getImagePoint(screenPoint: Point, transform: CanvasTransform): Point;
export function getClampedScale(scale: number): number;
export function getPannedTransform(transform: CanvasTransform, delta: Point): CanvasTransform;
export function getZoomedTransform(transform: CanvasTransform, factor: number, focalPoint: Point): CanvasTransform;
export function getFitTransform(imageSize: Size, viewportSize: Size): CanvasTransform;
export interface WheelInput { deltaY: number; deltaMode: number; ctrlKey: boolean } // a WheelEvent fits
export function getWheelZoomFactor(wheel: WheelInput): number;
export function isSameTransform(a: CanvasTransform, b: CanvasTransform): boolean;
export function getCenter(size: Size): Point;
export function getCssTransform(transform: CanvasTransform): string; // "translate(xpx, ypx) scale(s)"

// src/canvas/use-image-loader.ts
export type ImageLoadStatus = "loading" | "loaded" | "error";
export function useImageLoader(src: string): { status; naturalSize: Size | null; retry(): void };

// src/canvas/use-element-size.ts
export function useElementSize(ref: RefObject<HTMLElement>): Size | null;

// src/canvas/use-canvas-transform.ts
export function useCanvasTransform(imageSize: Size | null, viewportSize: Size | null): {
  transform: CanvasTransform | null;   // null until both sizes are known
  panBy(delta: Point): void;
  zoomAt(focalPoint: Point, factor: number): void;
  zoomIn(): void; zoomOut(): void; fitToScreen(): void;
};

// src/canvas/use-canvas-gestures.ts
// The wheel listener goes on the whole canvas <section>, so pinching over the zoom controls zooms the canvas, not the page.
export function useCanvasGestures(canvasRef, { panBy, zoomAt }): { isPanning; onPointerDown; onPointerMove; onPointerUp; onPointerCancel; onLostPointerCapture };

// src/canvas/image-canvas.tsx
export interface ImageCanvasProps { src: string; alt: string }
```

### Where the transform comes from

The hook stores `userTransform: CanvasTransform | null`. `null` means "fit to screen". The transform the canvas renders is `userTransform ?? fitTransform`, where `fitTransform` is derived from the two sizes.

| Image loaded | Viewport measured | User has panned or zoomed | Rendered transform |
|---|---|---|---|
| no | any | any | `null`: no image, loading or error state |
| yes | no | any | `null` (first frame only) |
| yes | yes | no | fit, recomputed on every resize |
| yes | yes | yes | the user's transform; resizes keep the user's view |
| yes | yes | yes, then "Fit to screen" | back to fit (`userTransform` reset to `null`) |

The image keeps fitting while the window resizes until the user takes control, without an effect that copies derived state into state.

### Zoom buttons

| Scale | Zoom out | Zoom in |
|---|---|---|
| `MIN_SCALE` | disabled | enabled |
| between | enabled | enabled |
| `MAX_SCALE` | enabled | disabled |

`getClampedScale` returns exactly `MIN_SCALE` or `MAX_SCALE` at the limits, so the comparison is exact.

## Blast Radius

| # | File | Action | Reason |
|---|---|---|---|
| 1 | `.agents/specs/02-pan-zoom-canvas/spec.md` | Add | This spec |
| 2 | `.agents/plans/02-pan-zoom-canvas.md` | Add | Commit plan |
| 3 | `tsconfig.json` | Modify | `paths: { "@/*": ["./src/*"] }` |
| 4 | `AGENTS.md` | Modify | Fix the alias rule (corrections log, spec 01) |
| 5 | `package.json` | Modify | `vitest` dev dependency, `test` and `test:watch` scripts |
| 6 | `package-lock.json` | Modify | Lockfile for Vitest |
| 7 | `src/canvas/canvas-math.ts` | Add | Types, constants, pure transform math |
| 8 | `src/canvas/canvas-math.test.ts` | Add | Unit tests |
| 9 | `src/canvas/use-image-loader.ts` | Add | Load status, natural size, retry |
| 10 | `src/canvas/use-element-size.ts` | Add | Viewport size from `ResizeObserver` |
| 11 | `src/canvas/use-canvas-transform.ts` | Add | The one transform state and its actions |
| 12 | `src/canvas/use-canvas-gestures.ts` | Add | Drag to pan (pointer events), wheel zoom (native listener) |
| 13 | `src/canvas/zoom-controls.tsx` | Add | Zoom out, level, zoom in, fit |
| 14 | `src/canvas/image-loading.tsx` | Add | Loading state |
| 15 | `src/canvas/image-load-error.tsx` | Add | Error state with "Try again" |
| 16 | `src/canvas/canvas.module.css` | Add | Canvas styles and design tokens |
| 17 | `src/canvas/image-canvas.tsx` | Add | Composes the above |
| 18 | `src/app/page.tsx` | Modify | Render `ImageCanvas` instead of `CommentsCanvas` |
| 19 | `public/poster.svg` | Add | The image to comment on |
| 20 | `src/app/Providers.tsx` | Modify | `badgeLocation="top-right"`: the Liveblocks badge covered the zoom controls (found during verification) |
| 21 | `.agents/ai-usage-log.md` | Modify | Logged the rejected Vitest range change |

### Files NOT affected

| File | Why |
|---|---|
| `src/components/*`, `src/hooks.ts` | Starter comment UI; replaced in step 3, untouched here |
| `src/app/api/**`, `liveblocks.config.ts` | No auth or metadata change |
| `src/app/layout.tsx`, `src/styles/globals.css` | Canvas styles live in the canvas CSS module |

## Change Dependency (commit order)

Each file lands in exactly one commit, in dependency order, so every commit builds:

| Commit | Adds | Depends on |
|---|---|---|
| 1 | spec, plan, alias, `AGENTS.md` fix, AI usage log entry | nothing |
| 2 | Vitest, `canvas-math.ts` and its tests | nothing |
| 3 | the four hooks | commit 2 |
| 4 | the components and the CSS module | commits 2 and 3 |
| 5 | `page.tsx` wiring, the poster, the badge location | commit 4 (`ImageCanvas`), commit 1 (alias) |

Commits 1 to 4 add code that nothing renders yet; the canvas appears with commit 5.

## User Flow Impact

| # | Flow | Before | After | Changed? |
|---|---|---|---|---|
| 1 | Open the app | Empty grey page with a `+` button | Poster fitted and centered on the canvas | YES |
| 2 | Drag anywhere on the canvas | Nothing (or drags a thread) | Image pans; cursor `grab` / `grabbing` | YES |
| 3 | Click zoom in / zoom out | n/a | Zooms by 1.25x around the viewport center; level shown in % | YES |
| 4 | Scroll the wheel or pinch on a trackpad | Page does nothing | Zooms around the cursor; the page does not scroll or browser-zoom | YES |
| 5 | Click "Fit to screen" | n/a | Back to the fitted view | YES |
| 6 | Resize the window before panning | n/a | Image re-fits | YES |
| 7 | Resize the window after panning | n/a | View stays where the user left it | YES |
| 8 | Image fails to load | n/a | "The image could not be loaded" with "Try again" | YES |
| 9 | Place, open and reply to comments | Works (starter) | **Not available until step 3** | YES (temporary) |
| 10 | Liveblocks auth, room connection | Works | Works | NO |

## Secrets & Data

No secrets touched. The image is a local static file. No user data rendered.

## Acceptance Criteria

| # | Criterion | How to verify |
|---|---|---|
| AC-1 | `npm test` runs and passes the canvas math tests | `npm test` |
| AC-2 | `npm run build` passes | `npm run build` |
| AC-3 | The poster is fitted and centered on load, never above 100% | Manual, `npm run dev` |
| AC-4 | Dragging pans the image; releasing outside the window ends the drag | Manual |
| AC-5 | The point under the cursor stays under the cursor while wheel zooming | Unit test (`getZoomedTransform`) + manual |
| AC-6 | Zoom buttons change the level by 25% steps and disable at 10% and 800% | Unit test (`getClampedScale`) + manual |
| AC-7 | Wheel over the canvas never scrolls or zooms the page itself | Manual |
| AC-8 | Missing image shows the error state; "Try again" retries | Manual: rename `public/poster.svg`, reload, rename back, click "Try again" |
| AC-9 | Zoom controls are buttons with accessible names, reachable with Tab, with a visible focus ring, at least 44 by 44 px | Manual + code review |

## Decision Points

1. **Plan A** (own transform state and math). The anchoring math is the core of the evaluation, so we own it.
2. **The wheel zooms, it does not pan.** Simple image-viewer behavior; drag is the pan gesture. Trackpad pinch arrives as a wheel event with `ctrlKey`, so it zooms too. Figma-style "wheel pans, Ctrl+wheel zooms" is out of scope.
3. **Fit never upscales.** A small image shows at 100% instead of being blown up and blurred.
4. **Starter comments disappear for one step.** The starter's comment layer is a full-window div that would sit on top of the canvas and eat every drag. Rewiring it is step 3's job, so this step renders only the canvas, and the starter components stay in the repo untouched until step 3 replaces them.
5. **Vitest pinned to exactly 4.1.12, not 5.1.0.** 5.x needs a newer `@types/node` than the starter ships; 4.x supports the same Node range as Next.js 16 and needs no starter change. The exact pin (no `^`) was the developer's call (AI usage log, 2026-11-13).
6. **A hand-made SVG poster, not a photo.** No licence questions, sharp at 800%, small text in git. Lorem Picsum was down (HTTP 522) when tried. Swapping the image is one prop in `page.tsx`.
7. **Zoom by `e^(-deltaY * speed)` for the wheel.** Small trackpad deltas zoom a little, big mouse-wheel steps zoom more, and zooming in then out by the same delta returns to the same scale. Firefox reports some wheels in lines, not pixels, so line deltas are converted first.
8. **Move the Liveblocks badge, not our controls.** The free-plan badge sits bottom-right by default, exactly over the zoom controls. Bottom-left collides with the Next.js dev indicator, so the badge goes top-right and the controls keep the corner the design reference uses.
9. **`aria-disabled` on the zoom buttons at the limits, not `disabled`.** A `disabled` button loses keyboard focus the moment the limit is reached; clicking at the limit is harmless because the scale is clamped.

## Out of Scope

- Comments on the canvas (step 3), thread side flip (step 4), connection and comment error states (step 5).
- Two-finger pinch zoom on touch screens; touch drag pans (step 6, responsive).
- Keyboard shortcuts for zoom (`+`, `-`, `0`) and panning with arrow keys. The buttons are keyboard accessible.
- Keeping the image inside the viewport while panning. "Fit to screen" brings it back.
- Component tests with Testing Library and jsdom: added when the comment layer needs them.
- Changing `src` on a mounted `ImageCanvas`: the old natural size would linger until the new image loads. The app never changes `src`; if it ever does, key `ImageCanvas` by `src`.
- Announcing the zoom level only after button presses. The `<output>` is a polite live region, so wheel zoom also announces; kept because button presses need the feedback and wheel zoom is not a screen reader path.

## Open Questions

- Hook actions `panBy`, `zoomAt`, `zoomIn`, `zoomOut`, `fitToScreen` and `retry` do not use the `AGENTS.md` function prefixes (`get`, `handle`, `update`, ...). OPEN: rename them, or add "hook actions are plain verbs" to `AGENTS.md`.
- `frontend-design:frontend-design` skill (required for UI work by `AGENTS.md`) is not installed in this session (`Skill` tool: "Unknown skill"). Followed `.claude/agents/ui-design.md` and `.claude/skills/a11y/SKILL.md` instead. OPEN: install the plugin if it should be used for later UI steps.

## Corrections Log

| Original claim | Reality | Impact |
|---|---|---|
| Use the latest Vitest | 5.1.0 fails to install next to the starter's `@types/node@20` (ERESOLVE) | Pinned Vitest 4.1.12 |
| Use a royalty-free photo from Lorem Picsum | Picsum returned HTTP 522 | Hand-made SVG poster |
| `Providers.tsx` is not affected | The Liveblocks free-plan badge covered the zoom-in and fit buttons (headless Edge screenshot at 1280 by 800) | `badgeLocation="top-right"`, one line in `Providers.tsx` |
| Loosen the Vitest pin to `^4.1.12` to match the starter's style | Rejected by the developer | Kept `4.1.12`; logged in `.agents/ai-usage-log.md` |

## Self-Audit

1. **Stale transform during fast drags.** Several `pointermove` events can fire before React re-renders; reading `transform` from the render closure would drop deltas. Every update goes through `setUserTransform(current => ...)`, so each event builds on the latest state.
2. **Wheel listener re-attached on every render.** The effect depends on `zoomAt`; `zoomAt` is wrapped in `useCallback` and only changes when the fit transform changes (window resize).
3. **`will-change: transform` blurs zoomed content in Chrome** (the layer is rasterized once at the starting scale). Not used.
4. **A second finger on a touch screen** would overwrite the drag's last point and make the image jump. Only the first pointer that went down pans; others are ignored until it lifts.
5. **Image already loaded before hydration** would miss React's `onLoad`. The image is loaded with `new Image()` in an effect instead, which also gives the natural size before the first paint.
6. **Clicks vs drags for step 3.** Pointer capture on the viewport will also catch pointer-downs on pins. Step 3 must stop pins from starting a pan and add a small drag threshold to tell a click from a drag. Noted for spec 03.

### Code review (code-review agent, 2026-11-13): no blockers, 10 nits

| # | Finding | Outcome |
|---|---|---|
| 1 | A zoom that changes nothing (sideways scroll, zoom at a limit) stored an equal transform, which left fit mode and broke flow 6 | Fixed: `isSameTransform`; an unchanged update keeps the current state (`use-canvas-transform.ts`) |
| 2 | A drag only ended on `pointerup`/`pointercancel`; if the browser takes the pointer away, hovering kept panning | Fixed: `lostpointercapture` also ends the drag |
| 3 | Pinch over the zoom controls zoomed the browser page (listener was on the viewport only) | Fixed: wheel listener on the canvas `<section>` |
| 4 | Trackpad pinch (small `ctrlKey` deltas) zoomed slowly; page-mode deltas barely zoomed | Fixed: `PINCH_ZOOM_MULTIPLIER = 10` for `ctrlKey`, `WHEEL_PAGE_HEIGHT` for page deltas |
| 5 | Changing `src` keeps the old natural size while loading | Deferred (Out of Scope): `src` is constant |
| 6 | Step 3: positioning every pin with `getScreenPoint` re-renders all pins on each pan event | Carried to spec 03 |
| 7 | Missing return types on effect and test callbacks | Fixed |
| 8 | Hook action names lack the `AGENTS.md` prefixes | Open Question for the developer |
| 9 | Keyboard focus dropped to `<body>` when "Try again" unmounts | Fixed: focus moves to the canvas section (`tabIndex={-1}`) |
| 10 | The zoom level live region also announces during wheel zoom | Kept on purpose (Out of Scope) |

## Verification

- [x] `npm test`: 30 tests in `canvas-math.test.ts` pass (26 before the review fixes)
- [x] `npx tsc --noEmit` and `npm run build` pass
- [x] Every commit type-checks on its own: `git archive HEAD` into a scratch folder, then each commit's files added in order with `tsc --noEmit` after each (all exit 0, tests pass from commit 2). After commit 5 the folder matches the working tree (`diff -rq --strip-trailing-cr`, no output), so the five `git add` lists cover every change
- [x] Headless Edge screenshots at 1280 by 800, dark and light: poster fitted and centered, controls visible, badge top-right. Caveat: headless Edge lays the page out about 97 px shorter than the window and resizes it only for the capture, so the screenshot shows the fit for the shorter viewport
- [x] `GET /` and `GET /poster.svg` return 200 on `npm run dev`; server and its node processes stopped afterwards
- [ ] Developer: AC-3 to AC-9 in a real browser

## Session Tracking

| Date | Session | Description |
|---|---|---|
| 2026-11-13 | 1 | Research, spec, plan, implementation |
