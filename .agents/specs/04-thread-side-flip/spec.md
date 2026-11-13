# Threads open inwards near the right edge

**Spec:** 04-thread-side-flip
**Status:** DONE
**Date:** 2026-11-13

---

## Executive Summary

A thread (or the new-comment composer) opens to the right of its pin. When it would not fit before the right edge of the visible canvas, it opens to the left instead, inwards. The decision is a pure function of the pin's screen position, the thread's fixed width and the canvas width, so it is unit tested and re-evaluated on every pan and zoom. The panel also slides up just enough to stay on screen when the pin is near the bottom, without ever leaving the pin's height.

## Current State

- `src/comments/comment-layout.ts:16` `getThreadPosition(pinPoint)` always returns the right side: `x = pin.x + PIN_SIZE + THREAD_GAP`, `y = pin.y`. One caller: `comment-panel.tsx:28` (`grep -rn "getThreadPosition" src`).
- A pin near the right edge opens its thread partly off screen, clipped by the canvas (`overflow: hidden`).
- A pin near the bottom has its panel clipped at the bottom, so the composer's send button can be unreachable.
- The panel's max height comes from CSS (`calc(100% - 2 * var(--space-edge))`), separate from the TypeScript constants.

## What Already Works

- Pins and panels are re-rendered with the current transform on every pan and zoom (step 3), so a new side or position applies immediately, no extra listener needed.
- `THREAD_WIDTH` is a constant passed to the panel's inline style; the side decision reads the same constant, so the two cannot drift.
- `useElementSize` (step 2) already measures elements with `ResizeObserver`.

## Prerequisites

Step 3 committed (`e82f150` to `0917aa6`).

## Decision Taken With the Developer

The brief says "too close to the right edge of the image, it should open inwards"; its design reference shows a pin at the image's right edge opening to the right, onto the grey canvas; `AGENTS.md` says "overflow the visible area". **Decision (developer, 2026-11-13): flip at the visible canvas edge.** A fitted image with empty canvas on its right keeps threads opening right, as in the reference.

## Rules

Horizontal (`getThreadSide`), with `needed = PIN_SIZE + THREAD_GAP + THREAD_WIDTH` = 360 px:

- **Fits right:** `pin.x + needed <= canvasWidth - EDGE_MARGIN`
- **Fits left:** `pin.x - THREAD_GAP - THREAD_WIDTH >= EDGE_MARGIN`

| Fits right | Fits left | Side | Why |
|---|---|---|---|
| yes | any | right | Default, as in the design reference |
| no | yes | **left** | The flip: open inwards |
| no | no | the side with more room (right on a tie) | Narrow screen; least clipping. Step 6 designs small screens |

In code this is two rules: right if it fits, otherwise the side with more room. Row 2 needs no rule of its own: if the right does not fit and the left does, the left has more room (review nit 2).

Vertical (`getThreadTop`), with the panel's measured height `h` (`null` before the first measurement):

```
top = max(pin.y + PIN_SIZE - h, min(pin.y, canvasHeight - BOTTOM_RESERVED - h))
```

- Preferred: top aligned with the pin's top.
- If the bottom would enter the reserved band at the bottom of the canvas, move up until it does not. `BOTTOM_RESERVED` = 16 (edge) + 52 (zoom controls) + 8 (gap) = 76 px: the zoom controls are drawn above the comments and would cover the composer's send button (review blocker 1).
- ...but never so far that the panel's bottom is above the pin's bottom, so the panel always stays level with its pin, even when the pin is panned off screen or sits inside the band itself.
- `h` unknown: `top = pin.y`.
- `h` is the panel's border box (padding and border included), so a later design pass that adds padding cannot break the fit (review nit 1).

Max height: `min(THREAD_MAX_HEIGHT, canvasHeight - EDGE_MARGIN - BOTTOM_RESERVED)`, in TypeScript instead of CSS, so the vertical rule and the rendered height use the same numbers.

## Implementation Options

### Plan A: pure functions in `comment-layout.ts`, panel measures itself (chosen)
**Blast radius:** 9 files (7 planned, 1 bug fix found during verification, 1 from the review).
**Pros:** The decision is plain arithmetic on named constants, testable without a browser; the panel stays a positioned div.
**Cons:** The vertical rule needs the panel's height, measured after the first render, so a panel that needs to slide up appears one frame lower first.

### Plan B: CSS only (`right: ...` for the left side, `translateY(-100%)` near the bottom)
**Pros:** No measurement.
**Cons:** "Near the bottom" still needs a threshold based on an unknown height; the flip rule would live in CSS, untested.

### Plan C: Floating UI / Radix positioning
**Cons:** Brings back the library-owned flip that step 3 moved away from.

## Interfaces

```ts
// src/comments/comment-layout.ts
export const EDGE_MARGIN = 16;             // screen px kept between a panel and the canvas edge
export const BOTTOM_RESERVED = 16 + 52 + 8; // bottom band panels never slide into (zoom controls)
export type ThreadSide = "left" | "right";
export function getThreadSide(pinPoint: Point, canvasWidth: number): ThreadSide;
export function getThreadLeft(pinPoint: Point, side: ThreadSide): number;
export function getThreadTop(pinPoint: Point, panelHeight: number | null, canvasHeight: number): number;
export function getThreadMaxHeight(canvasHeight: number): number;

// src/comments/comment-panel.tsx
export interface CommentPanelProps { id: string; pinPoint: Point; canvasSize: Size; label: string; children: ReactNode }
```

`getThreadPosition` is replaced by `getThreadLeft` and `getThreadTop`: two independent rules, each tested on its own.

## Blast Radius

| # | File | Action | Reason |
|---|---|---|---|
| 1 | `.agents/specs/04-thread-side-flip/spec.md` | Add | This spec |
| 2 | `.agents/plans/04-thread-side-flip.md` | Add | Commit plan |
| 3 | `AGENTS.md` | Modify | Exception for hook actions (developer decision, step 2 open question) |
| 4 | `src/comments/comment-layout.ts` | Modify | Side, left, top, max height |
| 5 | `src/comments/comment-layout.test.ts` | Add | Truth table and vertical cases |
| 6 | `src/comments/comment-panel.tsx` | Modify | Measures itself, applies side and position, `data-side` |
| 7 | `src/comments/comment-layer.tsx` | Modify | Passes the canvas size to both panels |
| 8 | `src/comments/comments.module.css` | Modify | Only the round pin takes clicks, not its square wrapper (step 3 bug found during verification, own commit) |
| 9 | `src/canvas/use-element-size.ts` | Modify | Border-box size instead of content box (review nit 1) |

### Files NOT affected

| File | Why |
|---|---|
| `src/canvas/*` except `use-element-size.ts` | The canvas size is already in `CanvasOverlayState.viewportSize` |
| `anchored-pin.tsx` | The pin's position and corner do not depend on the side |
| Liveblocks metadata | The side is derived on every render, never stored |

## User Flow Impact

| # | Flow | Before | After | Changed? |
|---|---|---|---|---|
| 1 | Click near the right edge of the canvas | Composer clipped on the right | Opens left | **YES** |
| 2 | Click in the middle | Opens right | Opens right | NO |
| 3 | Open a thread whose pin is near the right edge | Clipped | Opens left | **YES** |
| 4 | Pan or zoom an open thread towards the right edge | Slides off screen | Flips left as soon as it would not fit | **YES** |
| 5 | Click near the bottom | Composer clipped, send button unreachable | Composer slides up, level with the pin | **YES** |
| 6 | A long thread near the bottom grows (new reply) | Grows off screen | Slides up as it grows | **YES** |
| 7 | Pan an open thread's pin off screen | Panel follows | Panel follows (never detaches) | NO |
| 8 | Reply, react, resolve, Escape, click to close | Works | Works | NO |

## Secrets & Data

None. Nothing new is stored or rendered.

## Acceptance Criteria

| # | Criterion | How to verify |
|---|---|---|
| AC-1 | Opens right when `pin.x + 360 <= width - 16`, left otherwise (when left fits) | Unit tests at the exact boundary |
| AC-2 | When neither side fits, opens on the side with more room | Unit test |
| AC-3 | A left panel's right edge is `THREAD_GAP` left of the pin | Unit test + smoke test |
| AC-4 | Near the bottom, the panel stays inside the canvas and level with the pin | Unit tests + smoke test |
| AC-5 | The side updates while panning and zooming | Smoke test |
| AC-6 | `npm test`, `tsc`, `build` pass; each commit type-checks | Commands |

## Decision Points

1. **Visible canvas edge** (developer decision above).
2. **Fixed width, not measured.** The side comes from `THREAD_WIDTH`, so typing or a growing thread can never flip the side under the user's cursor; only the pin moving can.
3. **Wider side when neither fits**, instead of always right: less of the panel is clipped on a narrow screen.
4. **Slide up, but stay level with the pin**: the panel never detaches from its pin, even when the pin is panned off screen.
5. **No hysteresis.** Panning across the boundary flips immediately; that is what the brief asks for ("based on position"), and the panel never flickers while the pin is still.

## Out of Scope

- Bottom sheet or full-width panel on phones (step 6).
- Flipping above/below the pin; the panel only slides vertically.
- Animating the flip.

## Self-Audit

1. **First frame near the bottom.** The height is unknown on the first render, so the panel starts at the pin's top and slides up when `ResizeObserver` reports, a one-frame jump. Accepted (Plan A cons).
2. **Side flip feedback loop?** The side depends on the pin and canvas only, never on the panel's measured size, so moving the panel cannot change the side.
3. **Top rule feedback loop?** The top depends on the measured height; moving the panel does not change its height, so it settles after one measurement.
4. **Max height in two places.** Was CSS `calc(100% - 2 * var(--space-edge))`; now one TypeScript function, so the panel and the vertical rule agree. `--space-edge` stays for the zoom controls and error message.

## Corrections Log

| Original claim | Reality | Impact |
|---|---|---|
| A click anywhere outside a pin reaches the canvas (step 3) | The pin is round, its wrapper square: a click on the wrapper's corner hit the wrapper (`pointer-events: auto`) and did nothing. Found when the smoke test clicked at (1150, 300), the corner of an existing pin at (1123..1155, 270..302) | Wrapper `pointer-events: none`, only the pin button `auto`; `elementFromPoint` at the corner now returns the canvas, at the centre the pin |

## Verification

- [x] `npm test` (70 tests, 20 in `comment-layout.test.ts`), `npx tsc --noEmit`, `npm run build`
- [x] Each commit type-checks on its own (scratch copy of `HEAD`, commits applied in order); after commit 4 the copy matches the working tree
- [x] Headless Edge smoke test, 1280 by 800, real room, nothing submitted:

| Step | Pin | Side | Panel (left..right, top..bottom) | Check |
|---|---|---|---|---|
| Click mid-image | (534, 348) | right | 574..894, 348..442 | starts `PIN_SIZE + THREAD_GAP` = 40 px right of the pin |
| Pan right by 300, click at x = 1150 | (1150, 560) | **left** | 822..1142 | ends `THREAD_GAP` = 8 px before the pin (AC-1, AC-3) |
| Drag the canvas back by 300 with the composer open | (850, 560) | **right** | 890..1210 | flips while panning (AC-5) |
| Click near the image bottom | (476, 740) | right | 516..836, 678..772 | the pin sits inside the reserved band, so the panel stays level with it: bottom = pin bottom 772 (AC-4) |
| Review scenario: image under (1100, 690), click there | (1100, 690) | left | 772..1092, 630..724 | bottom 724 = 800 - 76, above the zoom controls (top 732); the send button's centre hits the send button |

(Before the review fixes the near-bottom click gave 690..784, inside the controls' row.)

- [x] Code review agent: one blocker, five nits

| # | Finding | Outcome |
|---|---|---|
| B1 | A left-opening panel sliding up near the bottom-right ended under the zoom controls, covering its send button | Fixed: `BOTTOM_RESERVED` in `getThreadTop` and `getThreadMaxHeight`, regression test with the reported numbers, smoke test step 5 |
| N1 | `contentRect` ignores padding and border | Fixed: `useElementSize` reports the border box |
| N2 | The "fits left" branch never changes the result | Simplified to "right if it fits, else the side with more room"; tie test added |
| N3 | Stay level with the pin's top instead of its bottom, to gain 32 px | Declined: the panel should always overlap its pin vertically |
| N4 | `data-side` not read by CSS or unit tests | Kept: the smoke test reads it and it shows the decision in devtools |
| N5 | Spec counts and the CSS file listed as unaffected | Fixed |
- [ ] Developer: same checks by hand, including a narrow window

## Session Tracking

| Date | Session | Description |
|---|---|---|
| 2026-11-13 | 1 | Developer decided the flip edge and the naming exception; spec, plan, implementation |
