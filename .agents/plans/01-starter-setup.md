# Plan 01: import the starter

**Spec:** [01-starter-setup](../specs/01-starter-setup/spec.md)
**Mode:** spec → plan → implement

Source: scratch sparse clone of `liveblocks/liveblocks` at `acf97db`, folder `examples/nextjs-comments-canvas`.

## Commits

The import is 23 file changes. At most 5 files per commit, so it is split by concern into 5 commits. The app builds once all 5 are in (see spec, Self-Audit 3).

| # | Message | Files |
|---|---|---|
| 1 | `chore(setup): add starter spec, env template and ignore rules` | `.agents/specs/01-starter-setup/spec.md`, `.agents/plans/01-starter-setup.md`, `.env.example`, `.gitignore` |
| 2 | `chore(setup): add next.js tooling from the liveblocks canvas comments example` | `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.js`, `.prettierrc` |
| 3 | `chore(api): add liveblocks config and api routes from the example` (body notes the auth route fix) | `liveblocks.config.ts`, `src/database.ts`, `src/app/api/liveblocks-auth/route.ts`, `src/app/api/users/route.ts`, `src/app/api/users/search/route.ts` |
| 4 | `chore(app): add app shell, providers and global styles from the example` | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/Providers.tsx`, `src/styles/globals.css` |
| 5 | `chore(canvas): add the example canvas and comment components` | `src/components/CommentsCanvas.tsx`, `src/components/DraggableThread.tsx`, `src/components/PlaceThreadButton.tsx`, `src/components/Loading.tsx`, `src/hooks.ts` |

## Steps

1. Copy every file listed above from the scratch clone, except `README.md` and `vercel.json`.
2. Merge `.gitignore`: keep our entries, add `.next/`, `out/`, `next-env.d.ts`, `*.tsbuildinfo`, `.vercel`, `.env*` with `!.env.example`.
3. Edit `src/app/api/liveblocks-auth/route.ts`: read the key into a local, return 403 if it is missing, then create the `Liveblocks` client inside `POST`.
4. Add `agentRules: false` to `next.config.js` (added during verification: `next dev` wrote to `AGENTS.md`).
5. `npm install`.
6. Verify (spec AC-1 to AC-5): `npm run build` without `.env.local`, `git check-ignore -v`, `curl` the auth route and the page on `npm run dev`.
7. Dry-run each commit's `git add` and hand the commands over.
