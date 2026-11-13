# Plan 05: visible states for loading, empty, lost connection and failed saves

**Spec:** [05-error-states](../specs/05-error-states/spec.md)
**Mode:** spec → plan → implement

## Commits

| # | Message | Files |
|---|---|---|
| 1 | `docs(comments): add the error states spec and plan` | `.agents/specs/05-error-states/spec.md`, `.agents/plans/05-error-states.md` |
| 2 | `feat(comments): add the notice rules and a connection state hook` | `src/comments/comments-status.ts`, `src/comments/comments-status.test.ts`, `src/comments/use-connection-state.ts`, `vitest.config.ts` |
| 3 | `feat(comments): show loading, empty, connection and failed-save states` | `src/comments/comments-notice.tsx`, `src/comments/comments.module.css`, `src/comments/comment-layer.tsx`, `src/comments/image-comments.tsx`, `src/canvas/canvas.module.css` |

Commit 2 adds code nothing renders yet; commit 3 wires it in and removes `ClientSideSuspense`. Added during implementation: `vitest.config.ts` (the first test that imports a value through `@/`), `canvas.module.css` (`--warning` and `--danger` tokens).

## Steps

1. `comments-status.ts`: types, `getCommentsNotice` (priority table), `getCommentErrorKind`, `getAnchorFromMetadata`; tests.
2. `use-connection-state.ts`: `useStatus` + `useLostConnectionListener`.
3. `CommentsNotice` component: pill, `role` by tone, dismiss button for save errors.
4. `CommentLayer`: non-suspense `useThreads`, `useSelf`, `useCreateThread`; `useErrorListener` (kind, restore failed post); vanished-thread effect; draft `defaultValue`; render the notice.
5. `ImageComments`: drop `ClientSideSuspense`; fallback uses the notice style.
6. Verify: tests, tsc, build, per-commit check, smoke test (empty room via `?exampleId=`, offline emulation, Send disabled, no-key server on another port), review, hand over.
