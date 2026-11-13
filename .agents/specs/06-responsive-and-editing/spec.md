# Responsive layout and editing comments (optional features)

**Spec:** 06-responsive-and-editing
**Status:** DONE
**Date:** 2026-11-13

---

## Executive Summary

The brief's two optional features. **Responsive**: on a screen too narrow for a thread on either side of its pin, the thread opens as a bottom sheet above the zoom controls; two fingers pinch to zoom around the point between them; pins get a 44 px touch target on touch screens; the fitted image uses a smaller margin on narrow screens, and notices move below the Liveblocks badge there. **Editing**: Liveblocks' `Thread` already offers Edit and Delete on your own comments, but the starter's auth route gives every connection a random fake user, so after a reload you can no longer edit what you wrote. The auth route now remembers this browser's fake user in a cookie.

## Current State

| Area | Today (file:line) | Problem |
|---|---|---|
| Thread on a narrow canvas | `comment-layout.ts` `getThreadSide`: neither side fits, so the side with more room (step 4) | On a 375 px phone a 320 px thread is cut off on one side |
| Second finger | `use-canvas-gestures.ts`: only the first pointer pans, others are ignored | No pinch zoom on touch screens |
| Pin hit area | 32 px (`PIN_SIZE`) | Below the 44 px touch target (`.claude/agents/ui-design.md`) |
| Fit margin | `FIT_PADDING = 48` everywhere | On 375 px the poster fits at 23% |
| Notice on narrow screens | Top centre, up to `100% - 32px` wide | Overlaps the Liveblocks badge (top right) |
| Identity | `src/app/api/liveblocks-auth/route.ts`: `Math.floor(Math.random() * NAMES.length)` per auth request | A reload makes you a different user; Edit and Delete disappear from your own comments |

## What Already Works

- Editing and deleting: `Comment.js:489` shows Edit and Delete when `comment.userId === currentUserId`; the edit composer, saving and failure (`EDIT_COMMENT_ERROR`, step 5 notice) are Liveblocks' and ours already.
- Wheel and trackpad pinch (`ctrlKey` wheel) zoom on desktop (step 2).
- `touch-action: none` on the viewport and `user-scalable=no` in the layout: the browser does not zoom the page itself.
- Flip and vertical fit for wide screens (step 4) are unchanged.

## External API / SDK Contract (Verified)

| Claim | Source | Tag |
|---|---|---|
| Edit and Delete are offered only on comments whose `userId` equals the current user's | `react-ui/dist/components/Comment.js:489-492` | VERIFIED |
| With `authEndpoint` as a string, Liveblocks POSTs `{ room }` as JSON with `window.fetch` | `core/dist/index.js:6616-6626, 6789-6797` | VERIFIED |
| A 400/401/403 from the auth endpoint stops retrying | `core/dist/index.js:6579-6582, 6798-6802` | VERIFIED |
| Same-origin `fetch` sends cookies and stores `Set-Cookie` (default `credentials: "same-origin"`) | Fetch standard | ASSUMED; verified with `curl` and in the browser |
| `NextRequest.cookies.get` and `NextResponse.cookies.set` | `node_modules/next/dist/server/web/spec-extension/` | ASSUMED, checked by the type checker |
| `.lb-comment-pin` has an `::after` (shadow, focus ring) and no `::before` | `react-ui/styles.css` (`grep ":before"` on `.lb-comment-pin`: none) | VERIFIED, so `::before` is free for the touch target |
| Pointer events give one `pointerId` per finger | DOM spec | ASSUMED, verified with two synthetic touch points in the smoke test |

## Rules

### Thread placement (replaces "the side with more room")

| Fits right | Fits left | Placement |
|---|---|---|
| yes | any | right of the pin (step 4) |
| no | yes | left of the pin (step 4) |
| no | no | **bottom sheet**: `EDGE_MARGIN` from the left and right edges, its bottom at `BOTTOM_RESERVED` (above the zoom controls), at most `min(THREAD_MAX_HEIGHT, 55% of the canvas height)` tall |

"Neither fits" happens on any canvas narrower than about 2 x 328 + 32 + 32 = 720 px when the pin is near the middle, and on any canvas under 360 px wherever the pin is. The sheet is positioned with CSS `bottom`, so it needs no measured height.

### Pinch

For two touching pointers, from the previous pair of points to the next:

```
pan    = midpoint(next) - midpoint(previous)
factor = distance(next) / distance(previous)
focal  = midpoint(next)
```

Applied as `panBy(pan)` then `zoomAt(focal, factor)`: the image point under the previous midpoint moves to the next midpoint, then stays there while scaling. A press that ever had two pointers is never a tap. When one finger lifts, the other keeps panning.

### Fit margin

`FIT_PADDING` (48 px) on canvases at least `NARROW_CANVAS_WIDTH` (640 px) wide, `FIT_PADDING_NARROW` (16 px) below that.

### Taps

A tap (a press that never became a drag) is handled in the viewport's `click`, not on `pointerup`. On touch screens the browser sends its click after `pointerup`, at the same spot; whatever the tap drew there in between (the new pin, the sheet's buttons) would receive it.

### Identity

`getUserIndex(cookieValue, userCount, random)`: the cookie's value if it is an integer in `0..userCount-1`, otherwise a new random index. `src/proxy.ts` sets the cookie on the page request (`httpOnly`, `sameSite: "lax"`, one year, `secure` in production), so it exists before any script runs: Liveblocks sends one auth request per room, resource and access level at the same time (`core/dist/index.js:6673-6713`), and on a first visit each would otherwise pick its own random user. The auth route reads the cookie and keeps a random fallback.

## Implementation Options

### Plan A: cookie set by the auth route (chosen)
**Pros:** One server file plus a pure helper; the client keeps the starter's string `authEndpoint`.
**Cons:** Anyone can pick a fake user by editing the cookie; acceptable for fake demo users, not for real auth (out of scope).

### Plan B: `authEndpoint` callback sending a user index from `localStorage`
**Cons:** Reimplements the request, error mapping and retry rules that the string endpoint already gets right (`core/dist/index.js:6789-6820`).

### Plan C: no identity change
**Cons:** "Editing existing comments" stops working after any reload, so a reviewer who reloads finds no Edit.

## Interfaces

```ts
// src/comments/comment-layout.ts
export type ThreadPlacement = "right" | "left" | "sheet";   // replaces ThreadSide
export const SHEET_HEIGHT_RATIO = 0.55;
export function getThreadPlacement(pinPoint: Point, canvasWidth: number): ThreadPlacement;
export function getSheetMaxHeight(canvasHeight: number): number;
export function getPanelStyle(placement: ThreadPlacement, pinPoint: Point, canvasSize: Size, panelHeight: number | null): CSSProperties;
// getThreadLeft takes "left" | "right" only

// src/canvas/canvas-math.ts
export const FIT_PADDING_NARROW = 16;
export const NARROW_CANVAS_WIDTH = 640;
export function getFitPadding(viewportWidth: number): number;
export function getMidpoint(a: Point, b: Point): Point;
export interface PinchChange { pan: Point; factor: number; focalPoint: Point }
export function getPinchChange(previous: [Point, Point], next: [Point, Point]): PinchChange;

// src/users/user-identity.ts
export const USER_COOKIE = "image-comments-user";
export const USER_COOKIE_OPTIONS; // httpOnly, lax, path "/", one year, secure in production
export function getUserIndex(cookieValue: string | undefined, userCount: number, random: () => number): number;

// src/proxy.ts (Next.js 16 middleware)
export function proxy(request: NextRequest): NextResponse; // sets the cookie on "/"
export const config = { matcher: "/" };
```

## Blast Radius

| # | File | Action | Reason |
|---|---|---|---|
| 1 | `.agents/specs/06-responsive-and-editing/spec.md` | Add | This spec |
| 2 | `.agents/plans/06-responsive-and-editing.md` | Add | Commit plan |
| 3 | `src/comments/comment-layout.ts` | Modify | Placement with the sheet, sheet max height |
| 4 | `src/comments/comment-layout.test.ts` | Modify | "Neither fits" now means sheet; sheet height |
| 5 | `src/comments/comment-panel.tsx` | Modify | Sheet style; `data-placement` |
| 6 | `src/comments/comments.module.css` | Modify | Pin touch target, notice below the badge on narrow screens |
| 7 | `src/canvas/canvas-math.ts` | Modify | Fit padding by width, midpoint, pinch change |
| 8 | `src/canvas/canvas-math.test.ts` | Modify | Their tests |
| 9 | `src/canvas/use-canvas-gestures.ts` | Modify | Track every pointer; pinch with two |
| 10 | `src/users/user-identity.ts` | Add | Pure cookie-to-index rule |
| 11 | `src/users/user-identity.test.ts` | Add | Its tests |
| 12 | `src/app/api/liveblocks-auth/route.ts` | Modify | Read and set the cookie; `@/database` instead of `../../../database` |
| 13 | `src/proxy.ts` | Add | Sets the cookie on the page request, before Liveblocks' concurrent auth requests (review blocker 2) |
| 14 | `src/canvas/image-canvas.tsx` | Modify | Viewport `onClick`: taps happen on click (review blocker 1) |

### Files NOT affected

| File | Why |
|---|---|
| `src/app/Providers.tsx` | `authEndpoint` stays the string; the browser sends the cookie by itself |
| `src/app/api/users/*`, `src/database.ts` | User lookup by id is unchanged |
| `use-canvas-transform.ts` | Called with `panBy`/`zoomAt` as before |
| `comment-layer.tsx`, `anchored-pin.tsx` | Unchanged after the inert-pin bandage was reverted |

## User Flow Impact

| # | Flow | Before | After | Changed? |
|---|---|---|---|---|
| 1 | Phone: tap the image | Composer cut off at one side | Bottom sheet above the zoom controls | YES |
| 2 | Phone: open a thread | Cut off | Bottom sheet | YES |
| 3 | Phone: two fingers | Second finger ignored | Pinch zoom around the fingers, pan with them | YES |
| 4 | Phone: tap a pin | 32 px target | 44 px target | YES |
| 5 | Phone: open the app | Poster at 23% | Poster at about 29% | YES |
| 6 | Reload, then open your earlier comment | No Edit (you are someone else) | Edit and Delete in the "..." menu | YES |
| 7 | Desktop: everything | | Unchanged (wide canvas never uses the sheet) | NO |

## Secrets & Data

The new cookie holds a fake user index (0 to 7), not a secret and not personal data. `httpOnly`, so page scripts cannot read it. The Liveblocks secret key handling is unchanged.

## Acceptance Criteria

| # | Criterion | How to verify |
|---|---|---|
| AC-1 | No thread is cut off at 320, 375 and 768 px wide | Unit tests (placement truth table) + smoke test at 375 px |
| AC-2 | Pinch keeps the image point between the fingers under the fingers | Unit test (`getPinchChange` + transforms) + smoke test with two synthetic touch points |
| AC-3 | Pins have a 44 px hit area on coarse pointers | Smoke test (`elementFromPoint` 6 px outside the pin, touch emulation) |
| AC-4 | The same browser gets the same user on every auth request | `curl` with a cookie jar: same `uid` in both tokens |
| AC-5 | Desktop behaviour unchanged | Step 4 smoke test re-run |
| AC-6 | `npm test`, `tsc`, `build`; each commit type-checks | Commands |

## Decision Points

1. **Sheet only when neither side fits**, not by a fixed breakpoint: a tablet in landscape still gets the side-by-side thread when it fits.
2. **Cookie (Plan A)**.
3. **The remaining finger keeps panning after a pinch**, as in maps and photo apps.
4. **The sheet does not move the canvas** to keep the pin visible above it; the user can pan. Auto-panning is out of scope.

## Out of Scope

- Real authentication; any user can pick another fake user by editing the cookie.
- Auto-panning a pin out from under the sheet.
- Landscape-phone specific layouts.

## Self-Audit

1. **Sheet and the vertical rule**: the sheet ignores `getThreadTop`; it is anchored by `bottom`, so its first frame is already right.
2. **Pinch and tap**: the press is marked as a drag as soon as a second pointer goes down, so lifting both fingers never places a comment.
3. **Pointer capture with two fingers**: each pointer is captured separately on the viewport; both end in `pointerup`/`lostpointercapture`.
4. **Cookie on the 403 path**: without a key the route returns 403 before reading the cookie; nothing changes there.

## Corrections Log

| Original claim | Reality | Impact |
|---|---|---|
| Clicking the draft pin to discard the draft is harmless (step 3 review nit 12) | On touch, the browser's compatibility `click` arrives about 40 ms after the finger lifts, at the same spot, where the new draft pin has just been drawn: the click discarded the draft 14 ms after it opened (traced in the 375 px smoke test: `pointerup`, dialog opens, `click` on the draft pin, dialog gone) | First fix: an inert draft pin. The review showed it was a bandage (the sheet's mention, emoji and attach buttons can appear under the finger too). Root cause: the tap was handled on `pointerup`, before the click. Taps now happen on `click`; the inert pin was reverted |
| One auth request per page load, so a cookie set by the auth response is enough | Liveblocks sends the connection's and the comments' auth requests at the same time (fresh profile: "2 sent before the first response came back"); each picked its own random user (review blocker 2) | `src/proxy.ts` sets the cookie on the page request; fresh profiles now get one user for both requests |
| A tap's position is fractional, like `pointerup`'s | `click` coordinates are whole pixels | The anchor moves by under half a screen pixel (under 0.06 image px at 800%); accepted |
| "Neither side fits" opens on the side with more room (step 4) | Planned replacement | Now a bottom sheet (this spec) |

## Verification

- [x] `npm test` (122 tests), `npx tsc --noEmit`, `npm run build` (lists `ƒ Proxy (Middleware)`)
- [x] Each commit type-checks on its own (scratch copy of `HEAD`, commits in order); after commit 4 the copy matches the working tree
- [x] `curl`: three auth requests with one cookie jar all got `uid` `user-6` (cookie `image-comments-user=6`); three without a jar got `user-6`, `user-4`, `user-2`; `GET /` without a cookie answers `Set-Cookie: image-comments-user=1; Path=/; Max-Age=31536000; HttpOnly; SameSite=lax`
- [x] Fresh browser profile, three runs: 2 auth requests each, both sent before the first response; both carry the same user (user-5/5, 2/2, 3/3) (AC-4)
- [x] Headless Edge at 375 by 740, `mobile: true`, touch emulation (nothing submitted):

| Check | Result |
|---|---|
| `(pointer: coarse)` | matches |
| Fit | 29% (was 23%), image 16..359 px |
| Tap the image | bottom sheet: left 16, right 359, bottom 664 (= 740 - 76) (AC-1) |
| Two-finger pinch, 100 px to 200 px apart | 29% to 57%; image point under the fingers (0.5364, 0.5656) before and after (AC-2) |
| Pin hit area | 4 px outside the pin (left and above) hits it, 9 px outside does not (AC-3) |
| Notice in the empty room | top 64, below the badge |
| After zooming in, tap where the sheet's emoji, mention and attach buttons appear | the sheet opens and stays empty: no "@", no emoji picker, no file chooser (review blocker 1) |

- [x] Desktop re-runs after the review fixes: step 3 (click, drag, wheel, Escape, click to close, background) and step 4 (flip, bottom fit, send button clear of the controls) give the same results as before
- [x] Step 4's bottom fit, across 19 headless runs: 17 correct (panel lifted to 678 and 630 within about 10 ms); 2 early runs, back to back, kept the panel at the pin's height. Not reproduced in 17 later runs, including the same sequence with a screenshot and with `ResizeObserver` counters; no code path found (the measuring code is unchanged since step 4). Recorded as an unexplained intermittent headless result; to check by hand
- [x] Code review agent: two blockers, five nits

| # | Finding | Outcome |
|---|---|---|
| B1 | The inert draft pin was a bandage: the follow-up click lands on anything drawn under the finger, e.g. the sheet's buttons | Root cause fixed: taps on `click`; inert pin reverted; verified by tapping where the sheet's buttons appear |
| B2 | Concurrent auth requests on a first visit pick different random users | Fixed: `src/proxy.ts`; verified with fresh profiles |
| N3 | No `secure` cookie flag | Added, production only |
| N4 | Placement-to-style logic inside the component, untested | `getPanelStyle` in `comment-layout.ts`, three tests |
| N5 | No tests for the multi-pointer bookkeeping | Deferred: needs Testing Library, jsdom and a `setPointerCapture` stub (new dev dependencies); pinch and tap are covered by the touch smoke test |
| N6 | Magic `-6px` and `64px` in CSS | `--pin-touch-inset` (from `--pin-size` and `--control-size`) and `--badge-clearance` |
| N7 | `(pointer: coarse)` misses touch laptops | `(any-pointer: coarse)` |

- [ ] Developer: on a phone (or DevTools device mode), post, reload, edit; near the bottom-right on desktop, check the panel slides up above the zoom controls

## Session Tracking

| Date | Session | Description |
|---|---|---|
| 2026-11-13 | 1 | Contract research, spec, plan, implementation |
