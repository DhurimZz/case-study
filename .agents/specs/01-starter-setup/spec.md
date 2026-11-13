# Import the Liveblocks Canvas Comments starter

**Spec:** 01-starter-setup
**Status:** DONE
**Date:** 2026-11-13

---

## Executive Summary

The case study says to start from the official Liveblocks `nextjs-comments-canvas` example and build from there. This step copies that example into the repo with as few changes as possible, so later diffs show exactly what was built on top of it. The one deliberate code change fixes a starter bug: the auth route builds the Liveblocks client when the module loads, so `npm run build` crashes without a secret key, and the route's own "missing key" check can never run.

## Current State

- The repo holds only the brief (`README.md`, `RESPONSE.md`, `assets/`) and the AI tooling (`AGENTS.md`, `.claude/`, `.agents/`). There is no `package.json` and no app code.
- `.gitignore` (5 lines, `cat .gitignore`) ignores `node_modules/`, `.env.local`, `.env*.local`, `.DS_Store`, `.claude/settings.local.json`. It does not ignore Next.js build output (`.next/`, `next-env.d.ts`, `*.tsbuildinfo`).
- `.env.local` does not exist yet (`test -f .env.local` returns false). The app cannot reach Liveblocks until the developer adds a key.

### The starter

Source: `github.com/liveblocks/liveblocks`, `examples/nextjs-comments-canvas`, commit `acf97db` (2026-11-12).

23 tracked files (`git ls-files examples/nextjs-comments-canvas | wc -l`), 13 of them TypeScript (`... | grep -c "\.tsx\?$"`).

| Area | Files | What it does |
|---|---|---|
| Tooling | `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.js`, `.prettierrc` | Next.js 16, React 18, Liveblocks 3.23, dnd-kit, Prettier |
| Env and ignore rules | `.env.example`, `.gitignore` | One variable: `LIVEBLOCKS_SECRET_KEY` |
| Liveblocks types | `liveblocks.config.ts` | Global `UserMeta` and `ThreadMetadata` (`x`, `y`, `zIndex`) |
| API routes | `src/app/api/liveblocks-auth/route.ts`, `src/app/api/users/route.ts`, `src/app/api/users/search/route.ts`, `src/database.ts` | Access-token auth with a random fake user, user lookup for avatars, mention search |
| App shell | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/Providers.tsx`, `src/styles/globals.css` | `LiveblocksProvider`, `RoomProvider`, error boundary, Liveblocks UI styles |
| Canvas | `src/components/CommentsCanvas.tsx`, `DraggableThread.tsx`, `PlaceThreadButton.tsx`, `Loading.tsx`, `src/hooks.ts` | Threads placed in screen pixels and dragged with dnd-kit |
| Not copied | `README.md`, `vercel.json` | Our README is the brief (setup instructions are added in a later step); no Vercel deploy is planned |

### Root cause of the build failure

`src/app/api/liveblocks-auth/route.ts:10-12` calls `new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! })` at module scope. The SDK asserts the key in the constructor (`node_modules/@liveblocks/node/dist/index.js:149-160`, `assertSecretKey` throws unless the value starts with `sk_`). Next.js evaluates route modules while collecting page data during `next build`, so:

| `LIVEBLOCKS_SECRET_KEY` | `npm run build` (starter) | `POST /api/liveblocks-auth` (starter) |
|---|---|---|
| set, valid | passes | 200, token |
| missing | **crashes**: "Failed to collect page data for /api/liveblocks-auth" | never reached, module throws first; the `403 Missing LIVEBLOCKS_SECRET_KEY` branch at line 15 is dead code |

Reproduced in a scratch copy with `npx next build` and no `.env.local`.

## What Already Works

- Auth flow, user resolution and mention search: used as is.
- `FloatingThread`, `FloatingComposer` and `CommentPin` from `@liveblocks/react-ui` render threads, composers, replies, reactions and comment editing. Later steps reuse them instead of building a thread UI from scratch.
- The error boundary in `page.tsx` and the `Loading` fallback: kept, and extended in the error-states step.

## Prerequisites

- Node.js >= 20.9.0 (`node_modules/next/package.json` `engines.node`). Local: v26.12.1 (`node -v`).
- A Liveblocks secret key in `.env.local` to actually use the app. Not needed to build.

## External API / SDK Contract (Verified)

> Verified against the example source and `node_modules` after `npm ci` in a scratch copy, 2026-11-13.

| Claim | Source | Tag |
|---|---|---|
| Installed versions: `@liveblocks/client`, `node`, `react`, `react-ui` all 3.23.0; `next` 16.3.8; `react` 18.3.1 | `node -p "require('./node_modules/<pkg>/package.json').version"` | VERIFIED |
| `npm ci` installs 137 packages | `npm ci` output: "added 137 packages" | VERIFIED |
| The lockfile resolves 170 tarballs, all from `registry.npmjs.org` | `grep -o '"resolved": "[^"]*"' package-lock.json` grouped by host | VERIFIED |
| Secret key env var is `LIVEBLOCKS_SECRET_KEY`, read only on the server | `.env.example`, `route.ts:11`; `grep -rn LIVEBLOCKS_SECRET_KEY src` finds only the auth route | VERIFIED |
| `new Liveblocks({ secret })` throws unless `secret` starts with `sk_` | `node_modules/@liveblocks/node/dist/index.js:149-160` | VERIFIED |
| The client authenticates through `authEndpoint="/api/liveblocks-auth"` | `src/app/Providers.tsx:9` | VERIFIED |
| The auth route grants `*:write` on rooms matching `liveblocks:examples:*`, and the page uses room `liveblocks:examples:nextjs-comments-canvas` | `route.ts:31`, `page.tsx:11` | VERIFIED |
| Thread metadata is `{ x: number; y: number; zIndex: number }`, stored in screen pixels | `liveblocks.config.ts:12-16`, `PlaceThreadButton.tsx:83` (`e.clientX`) | VERIFIED |

## Implementation Options

### Plan A: copy verbatim, fix only the build crash (chosen)
**Blast radius:** 21 files added or changed, plus this spec and its plan.
**Pros:** History shows a clean "this is the starter" baseline, and every later diff is our own work. Smallest thing that builds.
**Cons:** The starter breaks some `AGENTS.md` conventions (PascalCase filenames, missing explicit return types, `../../../` imports) until later steps rewrite those files.

### Plan B: copy and adapt to `AGENTS.md` conventions in the same step
**Blast radius:** same files, most of them edited.
**Pros:** Conventions hold from the first commit.
**Cons:** Mixes "what came from Liveblocks" with "what I changed", and much of that work is thrown away: the canvas components are replaced in the pan/zoom and anchoring steps.

### Plan C: `npx create-liveblocks-app --example nextjs-comments-canvas`
**Pros:** Official one-liner.
**Cons:** Interactive (asks for browser access to fetch the key); writes a `.env.local` and its own README. Same files as Plan A in the end, with less control.

## Deliberate Deviations From the Starter

| File | Change | Why |
|---|---|---|
| `src/app/api/liveblocks-auth/route.ts` | Create the `Liveblocks` client inside `POST`, after the key check | Fixes the build crash and makes the `403 Missing LIVEBLOCKS_SECRET_KEY` response reachable (see Root Cause) |
| `.gitignore` | Merge the starter's rules into ours | Keep our existing entries, add Next.js build output and the `.env*` rule with the `!.env.example` exception |
| `next.config.js` | Add `agentRules: false` | Next.js 16.3 `next dev` appends a managed rules block to `AGENTS.md` when it detects an AI agent (`node_modules/next/dist/server/lib/start-server.js:416-429`, VERIFIED). `AGENTS.md` is hand-maintained and the single source of truth, so the auto-write is off (`config-shared.d.ts:1565-1574`, `@default true`, VERIFIED) |

Everything else is byte-for-byte the starter (`cmp` against the scratch copy for `package.json`, `package-lock.json`, `tsconfig.json`).

## Blast Radius

| File | Action | Reason |
|---|---|---|
| `.agents/specs/01-starter-setup/spec.md` | Add | This spec |
| `.agents/plans/01-starter-setup.md` | Add | Commit plan |
| `.env.example` | Add | Documents the one required env var |
| `.gitignore` | Modify | Build output and env file rules |
| `package.json`, `package-lock.json`, `tsconfig.json`, `.prettierrc` | Add | Tooling, verbatim |
| `next.config.js` | Add | Starter plus `agentRules: false` |
| `liveblocks.config.ts`, `src/database.ts`, `src/app/api/users/route.ts`, `src/app/api/users/search/route.ts` | Add | Verbatim |
| `src/app/api/liveblocks-auth/route.ts` | Add | Starter plus the build-crash fix |
| `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/Providers.tsx`, `src/styles/globals.css` | Add | Verbatim |
| `src/components/CommentsCanvas.tsx`, `DraggableThread.tsx`, `PlaceThreadButton.tsx`, `Loading.tsx`, `src/hooks.ts` | Add | Verbatim |

Files NOT affected: `README.md`, `RESPONSE.md`, `assets/`, `AGENTS.md`, `.claude/`. The README gets setup instructions in the final step.

## Secrets & Data

- `LIVEBLOCKS_SECRET_KEY` lives in `.env.local` only. The new `.gitignore` rule `.env*` with `!.env.example` keeps every env file out of git except the empty template. The key is read only in the auth route (server side) and never sent to the browser.
- User data shown: fake names from `src/database.ts` and avatar URLs from `liveblocks.io`. Every visitor gets a random fake identity per session.

## Acceptance Criteria

| # | Criterion | How to verify |
|---|---|---|
| AC-1 | `npm install` succeeds from the lockfile | Run it in the repo |
| AC-2 | `npm run build` passes **without** `.env.local` | Run it with no env file present |
| AC-3 | `.env.local`, `.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo` are ignored; `.env.example` is not | `git check-ignore -v <path>` |
| AC-4 | Without a key, `POST /api/liveblocks-auth` returns 403 "Missing LIVEBLOCKS_SECRET_KEY" instead of a 500 | `curl -X POST` against `npm run dev` |
| AC-5 | Without a key, `GET /` still returns 200 (the page renders its error state, not a server crash) | `curl` against `npm run dev` |
| AC-6 | With a key in `.env.local`, the starter works: place a comment with the `+` button, reply, drag it | Manual check by the developer (no key available to the agent) |

## Decision Points

1. **Verbatim vs adapted import**: verbatim (Plan A). Reviewers can diff our work against a known baseline.
2. **Keep dnd-kit for now**: yes. The anchoring step removes thread dragging (threads must stay on their image spot), and the dependency goes with it.
3. **Keep the room id and the `liveblocks:examples:*` permission**: yes for now. Renaming is cosmetic and touches the auth rule; revisit when the page is rewritten.

## Out of Scope (later steps)

| Step | Spec | Covers |
|---|---|---|
| 2 | `02-pan-zoom-canvas` | Image on a canvas, one pan/zoom transform state, drag to pan, zoom controls, test runner, image load failure |
| 3 | `03-image-anchored-comments` | Click on the image to comment; positions stored in image coordinates; pins follow pan and zoom; replaces dnd-kit dragging |
| 4 | `04-thread-side-flip` | Thread opens left when it would overflow on the right |
| 5 | `05-error-states` | Connection lost, auth failure, empty comment, no comments yet |
| 6 | `06-optional-features` | Responsive layout, editing comments |
| 7 | `07-readme` | Setup instructions and the "AI usage" section |

Also out of scope: a lint setup. Next.js 16 no longer ships `next lint` and the starter has no `lint` script.

## Corrections Log

| Original claim | Reality | Impact |
|---|---|---|
| `AGENTS.md`: "Use the path alias the example ships with" | The starter's `tsconfig.json` has no `paths` (`grep -n "paths\|baseUrl" tsconfig.json` finds nothing) | Add an `@/*` alias in step 2, when the first new feature folder needs it, and fix the line in `AGENTS.md` then |
| `AGENTS.md`: `npm run lint` | The starter has no `lint` script | Note only; lint stays out of scope unless time allows |
| The starter builds out of the box | It only builds with a valid key set | Fixed in the auth route (see Deviations) |
| Running the starter only touches its own files | First `next dev` appended 10 lines to `AGENTS.md` (`git diff --stat AGENTS.md`) | Block removed, `agentRules: false` added; second `next dev` left `AGENTS.md` unchanged (`git diff AGENTS.md \| wc -l` returns 0) |

## Self-Audit

1. **Does the fix change behavior with a valid key?** No. Same constructor, same options, called per request instead of once. The constructor only validates the key and stores it with the base URL, no network call (`node_modules/@liveblocks/node/dist/index.js:512-519`, VERIFIED), so per-request construction costs nothing measurable.
2. **Could `.env*` hide a file we need?** Only `.env.example` is meant to be committed, and it is re-included with `!.env.example`.
3. **Can every commit build on its own?** No. The import is split over 5 commits to respect the 5-files-per-commit rule, and the app builds once all 5 are in. Acceptable for a one-time scaffold; every later commit must build.
4. **Missed files?** `next-env.d.ts` is generated by `next build`, so it is ignored, not copied (the starter ignores it too).
5. **Side effects of running the app?** Found one: `next dev` writes to `AGENTS.md` (see Corrections Log). Checked `git status` after build and dev; no other tracked file changed.

## Verification

- [x] `npm install` in the repo
- [x] `npm run build` with no `.env.local`
- [x] `git check-ignore -v` for the four ignored paths, and `.env.example` not ignored
- [x] `npm run dev`: `POST /api/liveblocks-auth` returns 403, `GET /` returns 200
- [x] `npm run dev` with `agentRules: false` leaves `AGENTS.md` unchanged
- [ ] Developer: add a key and check AC-6 in the browser

## Session Tracking

| Date | Session | Description |
|---|---|---|
| 2026-11-13 | 1 | Researched the starter in a scratch copy, found the build crash, wrote spec and plan, imported |
