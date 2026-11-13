# Visible states for loading, empty, lost connection and failed saves

**Spec:** 05-error-states
**Status:** DONE
**Date:** 2026-11-13

---

## Executive Summary

Every async path in the comment layer gets a visible state: loading, no comments yet, connection lost, cannot connect, comments failed to load, and a save that failed. One pure function picks the single most important message from the current state, so states never stack or contradict each other, and the choice is unit tested. A failed post never loses the user's text: the composer reopens at the same spot with the text restored. A thread deleted by someone else while it is open closes cleanly (deferred from step 3).

## Current State

| Path | Today | Problem |
|---|---|---|
| Image fails to load | Error card with "Try again" (step 2) | Fine, unchanged |
| Empty comment | Liveblocks `Composer` disables Send while empty (`primitives/Composer/index.js:899-957`) | Fine, unchanged; verified in the smoke test |
| Threads loading | `ClientSideSuspense fallback={null}` in `image-comments.tsx` | Nothing visible; the user can't tell comments are coming |
| Threads fail to load / auth fails | `ErrorBoundary` fallback "Comments could not be loaded" | Fine for crashes; relies on the suspense hook throwing |
| Connection drops | Nothing | Comments silently stop syncing |
| A post, reply or edit fails on the server | Liveblocks rolls the optimistic change back | Silent; a failed post loses the typed text |
| No comments yet | Nothing | No hint that clicking the image comments |
| Open thread deleted by someone else | Panel disappears, selection stays | Next click is spent clearing it (step 3 review #1) |

## What Already Works

- The image canvas works without Liveblocks (the comment layer is a separate, guarded layer).
- `ErrorBoundary` around the layer stays, for unexpected render errors.
- Escape, click to close, flip and vertical fit are unchanged.

## External API / SDK Contract (Verified)

> Verified against `node_modules/@liveblocks/*` 3.23.0 on 2026-11-13.

| Claim | Source | Tag |
|---|---|---|
| Non-suspense `useThreads()` returns `{ isLoading: true }`, `{ isLoading: false, error }` or `{ isLoading: false, threads, ... }` | `react/dist/room-DUr5FIYB.d.ts:308-310`, `core/dist/index.d.ts:1092-1106` | VERIFIED |
| `useStatus()` returns `"initial" \| "connecting" \| "connected" \| "reconnecting" \| "disconnected"` | `room-DUr5FIYB.d.ts:2475`, `core/dist/index.d.ts:2763` | VERIFIED |
| `useLostConnectionListener(cb)` fires `"lost"` after `lostConnectionTimeout` of `"reconnecting"`, then `"restored"` or `"failed"` (if it ends `"disconnected"`) | `room-DUr5FIYB.d.ts:2508`, `core/dist/index.js:10503-10520` | VERIFIED |
| `lostConnectionTimeout` defaults to 5000 ms | `core/dist/index.js:12354` | VERIFIED |
| `useErrorListener(cb)` receives `LiveblocksError` with a typed `context` | `room-DUr5FIYB.d.ts:2469`, `core/dist/index.d.ts:2255-2260` | VERIFIED |
| `CREATE_THREAD_ERROR` context carries `threadId`, `body`, `metadata` | `core/dist/index.d.ts` (`CommentsOrNotificationsErrorContext`) | VERIFIED |
| Other comment failures: `CREATE_COMMENT_ERROR`, `EDIT_COMMENT_ERROR`, `DELETE_COMMENT_ERROR`, `DELETE_THREAD_ERROR`, `EDIT_THREAD_METADATA_ERROR`, `MARK_THREAD_AS_(UN)RESOLVED_ERROR`, `ADD/REMOVE_REACTION_ERROR`, ... | same union | VERIFIED |
| `Composer` takes `defaultValue?: CommentBody` | `react-ui/dist/index.d.ts:934` | VERIFIED |
| The browser `offline` event makes Liveblocks verify the connection with a heartbeat | `core/dist/index.js:4675, 4756-4768` | VERIFIED (used to test "connection lost") |
| On any failed save Liveblocks first removes the optimistic change, then emits an error event **only for an `HttpError`**; a network failure (offline `fetch` throws `TypeError`) is re-thrown and no event fires | `react/dist/chunk-JMMTB4CU.js:3687-3701` (`onMutationFailure`), thread creation at `:4579-4596` | VERIFIED (review blocker 1; smoke test: offline post) |
| A successful post replaces the optimistic thread with the server's in one batch, same id | `chunk-JMMTB4CU.js:1630-1635` | VERIFIED (so the vanished-thread rule never fires for a successful post) |
| A failed first thread load is retried by Liveblocks: 5 attempts (5 s, 5 s, 10 s, 15 s apart), then the error is reported for 5 s, then loading starts again | `react/dist/chunk-JMMTB4CU.js:599-630` | VERIFIED (smoke test: offline during the first load alternates loading and the retry warning) |
| Vite 8 resolves tsconfig `paths` with `resolve.tsconfigPaths: true` | `vite/dist/node/index.d.ts:2655-2659` | VERIFIED |

## The Notice Rule

`getCommentsNotice(state)` returns the one message to show, or none. First match wins:

| # | Condition | Tone | Message | Dismiss |
|---|---|---|---|---|
| 1 | Connection failed (`useStatus` is `"disconnected"`, e.g. auth refused) | error | Can't reach the comment server. You can still pan and zoom; reload the page to try again. | no |
| 2 | A post failed whose thread is no longer open (rare: only via the error event) | error | A comment could not be posted. Check your connection and try again. | yes |
| 3 | A reply failed | error | Your reply could not be posted. Check your connection and try again. | yes |
| 4 | Another change failed (edit, delete, resolve, reaction) | error | That change could not be saved. Check your connection and try again. | yes |
| 5 | Connection lost for more than 5 s | warning | Connection lost. Reconnecting... New comments can't be saved until it is back. | no |
| 6 | Threads failed to load (Liveblocks retries) | warning | Comments could not be loaded yet. Trying again... | no |
| 7 | Threads loading | info | Loading comments... | no |
| 8 | No threads and nothing open | info | No comments yet. Click anywhere on the image to add one. | no |
| 9 | Otherwise | | (nothing) | |

Errors and warnings go in an always-mounted `role="alert"` region, info in an always-mounted `role="status"` region; only their content changes, so screen readers announce it. A dismissed save error goes away until the next one or the next post; focus then moves to the canvas.

### A failed post

Detected where it shows, not only through the error event, because a network failure emits no event (contract above):

1. On submit, remember `{ threadId, anchor, body }` of the post.
2. The thread opens (optimistic). If it was visible and then disappears while still open, and it is that post, the post failed: the selection becomes a draft at the same anchor with the same text (`Composer defaultValue`) and `hasFailedToPost`, which shows an inline error inside the panel. The inline error goes away with the draft.
3. If it disappears and it is not the user's own post, someone else deleted it: the panel closes.
4. The remembered post is forgotten as soon as its thread is no longer the open one. A failure that arrives later still reaches the error event if it is an `HttpError` (row 2). The error boundary (a crash, not a state) shows its own notice: "Comments stopped working. You can still pan and zoom; reload the page to try again."

Why this order: what waiting cannot fix (1) beats what the user can act on (2 to 4), the cause of a problem beats its effect (a lost connection, 5, explains a failed load, 6), transient states beat the hint (8). Only row 1 and the crash say "reload": everything else recovers by itself.

## Implementation Options

### Plan A: one pure priority function, non-suspense hooks (chosen)
`CommentLayer` switches to the non-suspense hooks, so it sees `isLoading` and `error` itself instead of suspending or throwing. It gathers status, last error and thread count, and `getCommentsNotice` picks the message.
**Blast radius:** 11 files (9 planned, 2 found during implementation).
**Pros:** One place decides what the user sees; testable without a browser; no overlapping banners.
**Cons:** Replaces the suspense pattern the starter used.

### Plan B: keep suspense, add separate banners (connection, errors, empty)
**Cons:** The suspense fallback and the error boundary live in different places than the connection banner, so two messages can sit on top of each other (no key: "could not be loaded" plus "disconnected"). No single rule to test.

### Plan C: a toast library
**Cons:** Extra dependency, and stacked toasts for states that are not events (loading, empty, lost).

## Interfaces

```ts
// src/comments/comments-status.ts
export type ConnectionState = "connected" | "lost" | "failed";
export type CommentErrorKind = "post-thread" | "post-reply" | "save-change";
export interface CommentsState {
  isLoading: boolean;
  hasLoadError: boolean;
  connection: ConnectionState;
  lastError: CommentErrorKind | null;
  threadCount: number;
  hasSelection: boolean;
}
export type NoticeTone = "info" | "warning" | "error";
export interface NoticeContent { tone: NoticeTone; message: string; isDismissible: boolean }
export const CRASHED_NOTICE: NoticeContent; // for the error boundary
export function getCommentsNotice(state: CommentsState): NoticeContent | null;
export function getCommentErrorKind(contextType: string): CommentErrorKind | null;

// src/comments/use-connection-state.ts
export function useConnectionState(): ConnectionState;

// src/comments/comments-notice.tsx
export interface CommentsNoticeProps { notice: NoticeContent; onDismiss?: () => void }

// src/comments/comment-layer.tsx
export type CommentSelection =
  | { kind: "draft"; anchor: Point; body?: CommentBody; hasFailedToPost?: boolean } // set after a failed post
  | { kind: "thread"; threadId: string }
  | null;
// onSelectionChange is now Dispatch<SetStateAction<CommentSelection>>, so effects can update from the latest selection.
```

## Blast Radius

| # | File | Action | Reason |
|---|---|---|---|
| 1 | `.agents/specs/05-error-states/spec.md` | Add | This spec |
| 2 | `.agents/plans/05-error-states.md` | Add | Commit plan |
| 3 | `src/comments/comments-status.ts` | Add | Pure rules: notice priority, error kind, anchor from metadata |
| 4 | `src/comments/comments-status.test.ts` | Add | Priority table and mappings |
| 5 | `src/comments/use-connection-state.ts` | Add | `useStatus` + `useLostConnectionListener` into one state |
| 6 | `src/comments/comments-notice.tsx` | Add | The notice pill |
| 7 | `src/comments/comment-layer.tsx` | Modify | Non-suspense hooks, error listener, restore failed post, vanished thread, notice |
| 8 | `src/comments/image-comments.tsx` | Modify | No `ClientSideSuspense`; error fallback uses the notice style |
| 9 | `src/comments/comments.module.css` | Modify | `.notice` replaces `.layerError`, tones |
| 10 | `vitest.config.ts` | Add | `resolve.tsconfigPaths`: the first test that imports a value through `@/` (found during implementation) |
| 11 | `src/canvas/canvas.module.css` | Modify | `--warning` and `--danger` tokens, light and dark |

### Files NOT affected

| File | Why |
|---|---|
| `src/canvas/*` except `canvas.module.css` | The image states (loading, error, retry) are already done |
| `comment-layout.ts`, `comment-panel.tsx`, `anchored-pin.tsx` | Placement unchanged |
| `src/app/*`, API routes | No server change |

## User Flow Impact

| # | Flow | Before | After | Changed? |
|---|---|---|---|---|
| 1 | Open the app, comments loading | Nothing | "Loading comments..." | YES |
| 2 | Room has no comments | Nothing | "No comments yet. Click anywhere..." until a comment is open or exists | YES |
| 3 | Connection drops for more than 5 s | Nothing | "Connection lost. Reconnecting..."; gone when restored | YES |
| 4 | No key or auth refused | "Comments could not be loaded" | Same or "Can't reach the comment server", one message only | Small |
| 5 | Post fails | Comment silently gone | Error notice; composer reopens at the spot with the text | YES |
| 6 | Reply, edit, reaction fails | Silent rollback | Error notice, dismissible | YES |
| 7 | Open thread deleted by someone else | Stale selection | Panel closes, next click works | YES |
| 8 | Empty comment | Send disabled | Send disabled | NO |
| 9 | Image fails to load | Error card | Error card | NO |

## Secrets & Data

No secret changes. A failed post's text is kept in React state (the selection) only until it is sent again or discarded.

## Acceptance Criteria

| # | Criterion | How to verify |
|---|---|---|
| AC-1 | Exactly one notice at a time, chosen by the table above | Unit tests (priority table) |
| AC-2 | "No comments yet" shows in an empty room and hides while composing | Unit test + smoke test (new empty room via `?exampleId=`) |
| AC-3 | Offline for more than 5 s shows "Connection lost", online again hides it | Smoke test with DevTools offline emulation |
| AC-4 | A failed post reopens the composer at the same spot with the same text and an inline error | Smoke test: post while offline (nothing reaches the server) |
| AC-5 | Without a key, one error notice; the canvas still pans and zooms | Smoke test with the key overridden to empty for the test server only |
| AC-6 | Send is disabled while the composer is empty | Smoke test |
| AC-7 | `npm test`, `tsc`, `build`; each commit type-checks | Commands |

## Decision Points

1. **Plan A**: one rule, one message.
2. **`useLostConnectionListener`, not raw `useStatus`, for "connection lost"**: Liveblocks waits 5 s before calling it lost, so a short blip does not flash a warning.
3. **Restore the failed post's text** instead of only reporting the failure: typed work is never lost.
4. **Save errors are dismissible, states are not**: an error is an event the user can acknowledge; loading or offline end on their own.
5. **The empty hint doubles as the "how to comment" hint**: the brief's core action is not discoverable otherwise.

## Out of Scope

- Retrying a failed reply or edit automatically (Liveblocks does not hand back a reply's composer state).
- An offline queue indicator per comment.
- Mobile layout (step 6).

## Self-Audit

1. **Two banners at once?** Only `getCommentsNotice` renders a notice, and it returns one. The error boundary fallback replaces the whole layer, so it never shows next to a notice.
2. **Vanished thread vs a thread just created**: the selection is cleared only for a thread that was visible and then disappeared, so an optimistic thread that appears a render later is not closed.
3. **Failed post and vanished thread both fire**: the error handler sets a draft, the vanish effect clears a thread selection; in either order the end state is the restored draft.
4. **`useSelf` is null until connected** with the non-suspense hook: the draft pin falls back to no avatar.

## Corrections Log

| Original claim | Reality | Impact |
|---|---|---|
| A thread load error is final: "could not be loaded, reload the page", top priority | Liveblocks retries the first load by itself, forever (`chunk-JMMTB4CU.js:599-630`). The first smoke run (offline mid-load) showed "reload the page" flipping with "Loading" and hiding "Connection lost" | Load error is now a warning, "could not be loaded yet. Trying again...", ranked below "connection lost"; only a refused connection and a crash say "reload". Regression tests for both |
| A failed post always arrives as `CREATE_THREAD_ERROR` through `useErrorListener` (first version restored the draft from the error's metadata) | Only an `HttpError` emits an event; offline, the request throws and Liveblocks only rolls the thread back, so the post vanished silently and its text was lost (review blocker 1) | Detected where it shows: our own open post vanishing. `getAnchorFromMetadata` removed. Smoke test: offline post restores the text |
| "Connection lost... your changes will sync when it is back" | Comments are saved over HTTP, not queued; an offline post fails | Message now says new comments can't be saved until the connection is back; test guards it |
| Tests can import through `@/` without a Vitest config (true in step 4) | Step 4's tests only imported types through `@/`, which are erased; `comments-status.ts` imports a value, and Vitest failed with "Cannot find package '@/canvas/canvas-math'" | `vitest.config.ts` with `resolve.tsconfigPaths: true` |

## Verification

- [x] `npm test` (97 tests, 27 in `comments-status.test.ts`), `npx tsc --noEmit`, `npm run build`
- [x] Each commit type-checks on its own (scratch copy of `HEAD`, commits applied in order); after commit 3 the copy matches the working tree
- [x] Headless Edge smoke tests (real Liveblocks room, nothing submitted):

| Scenario | Notices seen, in order | Check |
|---|---|---|
| Load the main room | "Loading comments...", then none; 5 pins | AC-1 |
| Click the image, empty composer | Send `disabled` | AC-6 |
| Offline after load | none, then "Connection lost..." after 7.0 s; the 5 pins stay | AC-3 |
| Back online | cleared after 0.6 s | AC-3 |
| Offline right after navigating (first load fails) | "Loading comments...", "Comments could not be loaded yet. Trying again..."; never "reload" | Corrections log |
| Back online | "Loading comments...", then none; 5 pins | |
| Empty room (`?exampleId=smoke-test-empty`) | "Loading comments...", "No comments yet..."; hidden while composing; back after Escape | AC-2 |
| Key overridden to empty for the test server only (auth returns 403) | exactly one: "Can't reach the comment server..."; wheel zoom 44% to 80% still works; console shows only Liveblocks' own auth errors | AC-5 |

| Post while offline (after the review fix) | The thread opens, vanishes, and the composer is back at the same spot with "Smoke test, posted while offline" and the inline error; no global notice; 5 pins before, 5 after reconnecting (nothing saved) | AC-4 |

The smoke test created one empty room, `liveblocks:examples:image-comments-smoke-test-empty`, in the developer's Liveblocks project; it can be deleted from the dashboard.

- [x] Code review agent: one blocker, six nits

| # | Finding | Outcome |
|---|---|---|
| B1 | An offline post vanished silently and lost its text (no error event for network failures) | Fixed: own open post vanishing restores the draft with an inline error; verified by the offline-post smoke test |
| N2 | `defaultValue` only applies on mount; a late failure could clobber another open draft | Fixed by design: the restore only replaces the selection if the failed thread is still open (functional update) |
| N3 | "Your text is back in the box" stayed after discarding the draft | Fixed: the restored-draft message is inline in the panel and goes away with it; the global post error is neutral |
| N4 | Live region mounted with its text; role flipped on one node | Fixed: two always-mounted regions, only content changes |
| N5 | Dismiss unmounted the focused button | Fixed: focus moves to the canvas; label "Dismiss error" |
| N6 | Spec behind the code | Fixed |
| N7 | `use-connection-state.ts` restated the type's doc | Fixed: the fact lives on `ConnectionState` only |

- [ ] Developer: same by hand (DevTools > Network > Offline, then post)

## Session Tracking

| Date | Session | Description |
|---|---|---|
| 2026-11-13 | 1 | Contract research, spec, plan, implementation |
