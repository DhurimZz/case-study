# Plan 06: responsive layout and editing comments

**Spec:** [06-responsive-and-editing](../specs/06-responsive-and-editing/spec.md)
**Mode:** spec → plan → implement

## Commits

| # | Message | Files |
|---|---|---|
| 1 | `docs(comments): add the responsive and editing spec and plan` | `.agents/specs/06-responsive-and-editing/spec.md`, `.agents/plans/06-responsive-and-editing.md` |
| 2 | `feat(comments): open threads as a bottom sheet when neither side fits` | `src/comments/comment-layout.ts`, `src/comments/comment-layout.test.ts`, `src/comments/comment-panel.tsx`, `src/comments/comments.module.css` |
| 3 | `feat(canvas): pinch to zoom, tap on click, fit tighter on phones` | `src/canvas/canvas-math.ts`, `src/canvas/canvas-math.test.ts`, `src/canvas/use-canvas-gestures.ts`, `src/canvas/image-canvas.tsx` |
| 4 | `feat(api): keep one fake user per browser so comments stay editable` | `src/users/user-identity.ts`, `src/users/user-identity.test.ts`, `src/app/api/liveblocks-auth/route.ts`, `src/proxy.ts` |

The commits are independent of each other; each builds on its own.

Changed during verification and review: a first fix made the draft pin inert (a bandage, reverted); the root cause, taps handled on `pointerup`, moved into commit 3 with `image-canvas.tsx`. `src/proxy.ts` joined commit 4 after the review found concurrent auth requests.

## Steps

1. `user-identity.ts` + tests; auth route reads and sets the cookie; `proxy.ts` sets it on the page request. Verify with `curl` and a fresh browser profile.
2. `getThreadPlacement`, `getSheetMaxHeight`, `getPanelStyle`; panel; CSS (pin touch target, notice on narrow screens); update step 4 tests.
3. `getFitPadding`, `getMidpoint`, `getPinchChange` + tests; gestures hook tracks all pointers and taps on click.
4. Verify: tests, tsc, build, per-commit check, smoke test at 375 by 740 with touch emulation, desktop re-runs, review, hand over.
