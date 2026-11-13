---
name: react-best-practices
description: Enforce Vercel's React performance best practices including eliminating async waterfalls, reducing bundle size, optimizing server-side performance, parallelizing client-side data fetching, and preventing unnecessary re-renders. Use when writing React components, optimizing Next.js pages, refactoring performance issues, or implementing data fetching patterns. Prioritizes high-impact optimizations over micro-optimizations.
user-invocable: false
disable-model-invocation: true
compatibility: Next.js 15+, React 19+
metadata:
  source: vercel-labs/agent-skills
  priority: performance-first
  version: "1.0"
---

# React Best Practices

General React and Next.js knowledge is assumed. What follows is the house position: the order we fix things in, and the specific rules this codebase enforces on top of the defaults.

## Fix in this order

When a change has several performance problems at once, spend the effort top-down:

1. Async waterfalls: each one costs 600ms+
2. Bundle size: an extra 300KB is a permanent tax on every user
3. Server-side fetching and caching
4. Client-side fetch parallelism
5. Re-renders and memoization

Items 1 and 2 are Blockers in review. Item 5 is worth a comment only with a concrete cost behind it: do not add `memo`/`useCallback`/`useMemo` speculatively. The exception is the canvas hot path (pan/zoom), where a profiler run showing per-frame re-renders is the concrete cost.

## Waterfalls

- Guard clauses go above the `await` they can skip. An early return (`if (!roomId) return null`) placed after the fetch is a bug, and so is a validation call that runs before an empty-input check.
- Independent fetches in one Server Component go through `Promise.all`. Sequential `await`s are only acceptable when the later call consumes the earlier call's result.

## Bundle size

- Dynamically import (`next/dynamic`, with a `loading` fallback) any dependency over ~100KB, and anything only reachable behind a conditional UI branch: editors, emoji pickers, modals that rarely open.
- Deep-import from utility libraries: `import sortBy from 'lodash/sortBy'`, never `import _ from 'lodash'` or the named-barrel form.

## Server-side

Wrap fetches shared across the Server Component tree in React `cache()` so they resolve once per request, and set an explicit `next.revalidate` rather than relying on the default:

```typescript
import { cache } from 'react';

export const getImageMeta = cache(async (id: string): Promise<ImageMeta> => {
  const response = await fetch(`${API_URL}/images/${id}`, {
    next: { revalidate: 3600 },
  });
  return response.json();
});
```

## Client-side

Client data hooks (Liveblocks hooks, SWR, etc.) called at the same level already fetch in parallel. Do not make one hook's input depend on another hook's data unless it genuinely does; gate rendering on the combined loading state instead:

```typescript
const { data: user } = useUser();
const { data: settings } = useSettings();
const { data: threads } = useThreadList();

if (!user || !settings || !threads) return <Loading />;
```

## Re-renders

- `useState` initializers that parse or compute must be lazy: `useState(() => JSON.parse(saved))`, not `useState(JSON.parse(saved))`.
- Consolidate multiple passes over the same array into one `reduce` when the array can be large (threads, comments, pins). Leave short fixed-size lists alone: readability wins there.
- Pan and zoom must not re-render every pin. Apply the transform once on a shared layer that both the image and the comment layer read.

## Review checklist

- [ ] No `await` above an early return that could have skipped it
- [ ] Independent awaits use `Promise.all`
- [ ] Deps >100KB dynamically imported; no whole-library imports
- [ ] Shared server fetches use `cache()` with an explicit `revalidate`
- [ ] Expensive `useState` initializers are callbacks
- [ ] `'use client'` only on the interactive code that needs it
- [ ] Pan/zoom does not trigger a React render per pin per frame

## References

- [waterfalls.md](references/waterfalls.md): async waterfall patterns
- [bundle-size.md](references/bundle-size.md): bundle optimization
- [performance.md](references/performance.md): server/client performance patterns
