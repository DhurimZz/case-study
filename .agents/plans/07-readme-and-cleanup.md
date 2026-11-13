# Plan 07: README, AI usage and starter cleanup

**Spec:** [07-readme-and-cleanup](../specs/07-readme-and-cleanup/spec.md)
**Mode:** spec → plan → implement

## Commits

| # | Message | Files |
|---|---|---|
| 1 | `docs(readme): add the readme and cleanup spec and plan` | `.agents/specs/07-readme-and-cleanup/spec.md`, `.agents/plans/07-readme-and-cleanup.md` |
| 2 | `chore(app): remove the starter's unused styles and name the app` | `src/styles/globals.css`, `src/app/layout.tsx`, `package.json`, `package-lock.json` |
| 3 | `fix(api): make the user cookie secure only over https` | `src/users/user-identity.ts`, `src/users/user-identity.test.ts`, `src/proxy.ts`, `src/app/api/liveblocks-auth/route.ts` |
| 4 | `docs(readme): add setup, how it works and the ai usage section` | `README.md`, `assets/screenshots/desktop.png`, `assets/screenshots/phone.png` |

Commit 3 was found while checking how a reviewer runs the app: with `secure` tied to `NODE_ENV`, `npm start` on http://localhost sends a Secure cookie that Safari drops.

## Steps

1. Screenshot before the CSS removal; remove dead rules; title; package name and description, `npm install` to sync the lockfile; screenshot after; compare.
2. Headless screenshots at 1280 by 800 and 375 by 740, taken from the developer's running dev server with the Next.js dev badge hidden (a parallel `next build` would share `.next`; see the spec's corrections log). `npm run build` and `npm start` are checked separately in a fresh copy (step 4).
3. README: what it does, quick start, how to use, how it works (anchoring, flip, canvas, states, identity), project map, tests, decisions and limits, process, AI usage; brief below a rule.
4. Fresh copy of the working tree: follow the README's setup literally.
