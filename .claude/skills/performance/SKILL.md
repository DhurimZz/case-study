---
name: performance
description: Analyze performance and suggest optimizations
disable-model-invocation: true
argument-hint: "[files or page to analyze]"
---

Analyze performance against these budgets.

1. Budgets: LCP < 2.5s, INP < 200ms, CLS < 0.1, FCP < 1.8s. Pan and zoom hold 60fps (frame time < 16ms) with ~50 comment pins.
2. Check the canvas hot path: pan/zoom applied as one CSS `transform` on a shared layer, not per-pin state updates; pointer and wheel handlers throttled to `requestAnimationFrame`; no layout reads (`getBoundingClientRect`) inside the per-frame loop without batching
3. Check: unnecessary re-renders (pins re-rendering on every pan event), missing memoization where a profiler shows the cost, Server Component opportunities
4. Check: bundle size impact, dynamic imports for large deps, image optimization (intrinsic size known up front to avoid layout shift), async waterfalls
5. Suggest concrete optimizations with expected impact, measured with the React Profiler or the browser Performance panel against a production build (`npm run build && npm start`)

Load `.claude/skills/react-best-practices/SKILL.md` for the fix order and patterns.

Focus on: $ARGUMENTS
