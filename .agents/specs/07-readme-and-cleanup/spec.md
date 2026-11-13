# README, AI usage and starter cleanup

**Spec:** 07-readme-and-cleanup
**Status:** IN PROGRESS
**Date:** 2026-11-13

---

## Executive Summary

The brief requires setup instructions in the README ("so we can run it in a few minutes") and an "AI usage" section (tools, what for, at least one thing the AI got wrong or that was changed, and why). This step adds both above the original brief, which stays unchanged at the bottom of the README, and removes the starter leftovers logged as debt in step 3: dead global CSS, the "Liveblocks" tab title, and the example's package name and description.

## Current State

- `README.md` is the case-study brief only.
- `src/styles/globals.css`: `main`, `.loading`, `.error`, `.thread`, `.composer` and their dark-mode variants are unused (`grep -rhoE 'className="[^"]+"' src` finds no plain class names; components use CSS modules). Kept: the Liveblocks style imports, `html`/`body`, `*`, `.lb-root` accent.
- `src/app/layout.tsx:13`: `<title>Liveblocks</title>`.
- `package.json`: name `@liveblocks-examples/nextjs-comments-canvas`, description "a 2D canvas with draggable comments" (no longer true).
- `.agents/ai-usage-log.md`: one developer correction (the Vitest pin). The specs' corrections logs record what else the AI got wrong and how it was found.
- Developer answer (2026-11-13): the only AI tool used was Claude Code.

## Facts the README states (all checked)

| Fact | Source |
|---|---|
| Node >= 20.9 | `node_modules/next/package.json` `engines` |
| `npm test`: 125 tests in 4 files | `npm test` |
| Room `liveblocks:examples:image-comments`; the auth route grants `liveblocks:examples:*` | `src/app/page.tsx`, `src/app/api/liveblocks-auth/route.ts` |
| Env var `LIVEBLOCKS_SECRET_KEY`, template `.env.example` | `.env.example` |
| Without a key the canvas works and one notice explains it | step 5 smoke test |

## Blast Radius

| # | File | Action | Reason |
|---|---|---|---|
| 1 | `.agents/specs/07-readme-and-cleanup/spec.md` | Add | This spec |
| 2 | `.agents/plans/07-readme-and-cleanup.md` | Add | Plan |
| 3 | `src/styles/globals.css` | Modify | Remove dead starter rules |
| 4 | `src/app/layout.tsx` | Modify | Tab title |
| 5 | `package.json`, 6 `package-lock.json` | Modify | Project name and description |
| 7 | `README.md` | Modify | Setup, usage, how it works, AI usage; brief kept below |
| 8 | `assets/screenshots/desktop.png`, 9 `assets/screenshots/phone.png` | Add | Screenshots (dev server, the Next.js dev badge hidden) |
| 10 | `src/users/user-identity.ts`, 11 its test, 12 `src/proxy.ts`, 13 `src/app/api/liveblocks-auth/route.ts` | Modify | `secure` follows the request protocol, not `NODE_ENV` (found while checking `npm start`) |

## Corrections Log

| Original claim | Reality | Impact |
|---|---|---|
| `secure: process.env.NODE_ENV === "production"` (step 6 review nit) is safe | `npm start` is production over plain http://localhost; Safari drops Secure cookies there, so the user would be random per request again | `getUserCookieOptions(requestUrl)`: secure only over https; tests; production server over http now sets the cookie without `Secure` |
| Screenshots from a production build | Your own `npm run dev` was running; a parallel `next build` in the same folder would share `.next` | Taken from the running dev server with the Next.js badge hidden by a CSS rule during capture |
| README draft: a failed reply, edit, resolve or reaction shows a dismissible error | Only when the server answers with an error. Offline, Liveblocks rolls the change back without an error event (`chunk-JMMTB4CU.js:3687-3701`, the same path step 5 found for new comments), so nothing is shown (code review) | README states the gap in "States and errors" and under limits; logged as debt below. Not fixed in a docs step |

## Acceptance Criteria

| # | Criterion | How to verify |
|---|---|---|
| AC-1 | A reviewer can run the app from the README alone | Follow it in a fresh clone of the working tree: `npm install`, `.env.local`, `npm run dev` |
| AC-2 | The AI usage section names the tool, what it was used for, and things it got wrong that were changed, with why | Read against the brief's rule 3 |
| AC-3 | Every number in the README comes from a command or a spec | Cross-check |
| AC-4 | Removing the CSS changes nothing visible | Smoke screenshots before and after; `npm run build` |
| AC-5 | The original brief is unchanged | `git diff` shows only additions above it |

## Out of Scope

- Part A (`RESPONSE.md`), set aside by the developer.
- Component tests (deferred in step 6).

## Verification

- [x] `npm test` (125), `tsc`, `build`; each commit type-checks on its own; after commit 4 the scratch copy matches the working tree
- [x] Fresh copy of the working tree (no `node_modules`, no `.env.local`), README steps followed literally: `npm install` (174 packages), `cp .env.example .env.local`, `npm test` (125 pass), `npm run build`, `npm start`: `GET /` 200 with the cookie set (no `Secure` over http), auth 403 with the empty key, title "Image comments" (AC-1)
- [x] CSS removal: same computed body background and same composer position and size before and after (732, 470, 320 by 94, placed left); after-screenshot inspected (AC-4). The removed selectors had no users (`grep` for plain `className` strings: none)
- [x] The brief below the new README part is identical to `HEAD` (`diff`, line endings ignored) (AC-5)
- [x] Code review agent (outcome below)
- [ ] Developer reads the AI usage section (it is written in their voice)

## Code Review Outcome

| Finding | Severity | Outcome |
|---|---|---|
| README claims a dismissible error for every failed reply, edit, resolve or reaction; offline ones are silent | Blocker | README corrected: priority table only lists what `getCommentsNotice` returns, a "Not handled" paragraph and a limits bullet name the gap. Code gap logged as debt |
| Notice table mixes `getCommentsNotice` results with states handled in other files | Nit | Split into a priority table and "Handled elsewhere" with the owning file |
| "Only the pin moving can flip it" misses window resizing | Nit | Fixed |
| `null` transform described loosely | Nit | Fixed: stored `null`, fit computed from sizes, first pan or zoom stores a real transform |
| No hint when the key is missing or wrong | Nit | Added under Quick start |
| A second browser can get the same fake user | Nit | "One time in eight" note |
| "Cheap for tens of pins" was not measured | Nit | "Not profiled" |
| AI usage row wording did not match the log (one auth request assumed) | Nit | Fixed |
| "Type-checked and reviewed" applies from step 2 on only | Nit | Fixed in both places |
| `cp` does not exist in Windows `cmd` | Nit | Both commands given |
| Test name "does not over plain http" missing a word; "away from other sites" overstates SameSite=Lax | Nit | Renamed; the test now also checks `maxAge` |
| `USER_COOKIE_MAX_AGE_SECONDS` exported but used only in its own file | Nit | Unexported |
| Plan step 2 still said "production build" for the screenshots | Nit | Fixed |

## Debt (not fixed in this step)

- Offline replies, edits, resolves and reactions fail silently. Liveblocks emits no error event when the request never reaches the server, and only new comments are covered (by watching for the user's own open post vanishing). A fix needs to track each optimistic change or listen to the connection status while a change is pending. Candidate for a follow-up spec.

## Session Tracking

| Date | Session | Description |
|---|---|---|
| 2026-11-13 | 1 | Spec, cleanup, README |
