# Plan 02: image canvas with pan and zoom

**Spec:** [02-pan-zoom-canvas](../specs/02-pan-zoom-canvas/spec.md)
**Mode:** spec → plan → implement

## Commits

Every file lands in exactly one commit, in dependency order, so each commit builds on its own.

| # | Message | Files |
|---|---|---|
| 1 | `chore(canvas): add pan and zoom spec and plan, and the @ import alias` | `.agents/specs/02-pan-zoom-canvas/spec.md`, `.agents/plans/02-pan-zoom-canvas.md`, `tsconfig.json`, `AGENTS.md`, `.agents/ai-usage-log.md` |
| 2 | `feat(canvas): add pan and zoom math with vitest unit tests` | `package.json`, `package-lock.json`, `src/canvas/canvas-math.ts`, `src/canvas/canvas-math.test.ts` |
| 3 | `feat(canvas): add hooks for image loading, viewport size, transform state and gestures` | `src/canvas/use-image-loader.ts`, `src/canvas/use-element-size.ts`, `src/canvas/use-canvas-transform.ts`, `src/canvas/use-canvas-gestures.ts` |
| 4 | `feat(canvas): add the image canvas with zoom controls and loading and error states` | `src/canvas/zoom-controls.tsx`, `src/canvas/image-loading.tsx`, `src/canvas/image-load-error.tsx`, `src/canvas/canvas.module.css`, `src/canvas/image-canvas.tsx` |
| 5 | `feat(canvas): show the poster on the image canvas` | `src/app/page.tsx`, `src/app/Providers.tsx`, `public/poster.svg` |

## Steps

1. `tsconfig.json`: add `"paths": { "@/*": ["./src/*"] }`. `AGENTS.md`: replace "the path alias the example ships with" with the `@/*` alias.
2. `npm install --save-dev --save-exact vitest@4.1.12`; add `"test": "vitest run"` and `"test:watch": "vitest"`.
3. Write `canvas-math.ts`, then table-driven tests: round trip image to screen and back, zoom keeps the focal point fixed, clamping at both limits, fit (large image, small image, tiny viewport), wheel factor (pixel and line deltas, symmetry).
4. Hooks, each in its own file, each with an explicit return type.
5. Components and the CSS module (tokens as CSS variables on `.canvas`, dark mode, focus ring, 44 px targets).
6. `page.tsx`: swap `CommentsCanvas` for `ImageCanvas src="/poster.svg"`. Write the poster SVG.
7. Verify: `npm test`, `npm run build`, type-check each commit in a scratch worktree, start `npm run dev` and fetch `/` and `/poster.svg`, then stop the server and confirm no `next` process is left.
8. Dry-run each commit's `git add`, hand over.
