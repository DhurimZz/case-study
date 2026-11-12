# Image Commenting App

A React app where users click an image to leave comment threads anchored to that exact spot, then pan and zoom the image with the comments staying attached. Liveblocks is the real-time collaboration layer. The starting point is the official Liveblocks Canvas Comments example.

## AI Agent Setup (read first)

This file is the single source of truth for every AI coding agent. Edit only this file and the folders below; never a tool-specific copy of the rules.

- `AGENTS.md`: canonical instructions (this file)
- `CLAUDE.md`: one line, imports this file (`@AGENTS.md`)
- `.claude/skills/`: reusable workflows (`SKILL.md` per folder)
- `.claude/agents/`: specialized subagents (code review, implementation, accessibility, UI design)
- `.claude/settings.json`: shared permissions and plugins (`settings.local.json` is per-developer and gitignored)
- `.agents/specs/`: spec documents, one folder per piece of work
- `.agents/plans/`: implementation plans
- `.agents/ai-usage-log.md`: running log that feeds the README "AI usage" section

Skills and agents are real folders under `.claude/`, not symlinks: Git for Windows checks symlinks out as plain text files, and Claude Code then never loads them.

## Tech Stack

- **Framework**: Next.js (App Router), React, TypeScript, as shipped by the Liveblocks example. Exact versions in `package.json`.
- **Collaboration**: Liveblocks (`@liveblocks/react`, `@liveblocks/react-ui`)
- **Package manager**: npm. Reviewers run `npm install` and `npm run dev`, so do not switch it.

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # production build, must pass before handing over a step
npm run lint
npm test           # once a test runner is set up
```

## Secrets

- The Liveblocks secret key lives in `.env.local` only. Never commit it, never print it in logs, specs, plans or chat.
- `.env.local` and `.claude/settings.local.json` must be in `.gitignore`. Check `git status` before every handover.
- A committed key is burned even after a revert: rotate it in the Liveblocks dashboard.

## Core Problem (keep these right)

1. **Anchoring**: a comment's position is stored in image coordinates (relative to the image's natural size), never in screen pixels. Screen position is derived from it with the current pan and zoom, so a comment stays on its spot at every zoom level.
2. **Thread side**: a thread opens to the right of its pin unless that would overflow the visible area, then it opens to the left (inwards). Decide from the pin's screen position and the thread's width.
3. **Canvas**: drag to pan, zoom in and out with controls. Pan and zoom live in one transform state that both the image and the comment layer read.

## Coding Standards

### Explainability first

The author must walk reviewers through every line live. Prefer plain, explicit code over clever abstractions. A small named helper with a clear return type beats a dense one-liner. After each step, give the user a short explanation of what changed and why, so they can defend it.

### Components

- Default to Server Components. Use `'use client'` only for state, effects, browser APIs and event handlers, at the highest level that needs it.
- One component per file. Keep canvas math (coordinate transforms, flip logic) in pure functions outside components so it can be unit tested.

### TypeScript

- `interface` over `type` wherever possible
- `Props` suffix for component props; the interface name matches the component name (`CommentPinProps`)
- All functions have explicit return types
- No `any`
- Semantic function prefixes: `get`, `use`, `fetch`, `create`, `update`, `delete`, `handle`, `is`, `has`, `should`

### Files & Naming

- kebab-case filenames, PascalCase components
- No default exports, except where Next.js requires them (pages, layouts)
- Use the path alias the example ships with; no deep relative climbs (`../../..`)
- Group by feature (for example `canvas/`, `comments/`), not by file type

### Imports

Order: external, then relative (`./`, `../`), then aliased internal. No blank lines between groups. Alphabetical within each group.

### Readability

- No nested ternaries inside JSX; extract to a variable before the return
- No magic numbers: name zoom limits, step sizes and thread widths as constants
- Extract compound conditions into named booleans

### Comments

- Comment only the "why" the code cannot express: library quirks, workarounds, deliberate deviations. Never restate what the code does.
- State a fact once, at the function or type that owns it.
- Plain punctuation, no em-dashes.

### Error handling

Every async path has a visible failure state: Liveblocks connection lost, image fails to load, empty comment submitted, no comments yet. Never swallow an error silently.

## Development Workflow

Two modes depending on complexity. Always state which mode you're using before proceeding, e.g. "Using spec → plan → implement".

**Spec → Plan → Implement** (structural work, unclear requirements, change touching more than 3 files, bug with unclear root cause)

- `/spec` (`.claude/skills/spec/SKILL.md`): WHAT. Interfaces, contracts, acceptance criteria. Saved to `.agents/specs/NN-short-name/spec.md`.
- Plan: HOW. Steps and files to touch, saved to `.agents/plans/`.
- Implement.

**Plan → Implement** (well-understood work: obvious bug fix, single-file change, known shape)

If a plan is requested but the work warrants a spec, pause and ask: "This looks like it needs a spec first. Run `/spec` or proceed with plan-only?"

### Rules

- **Phase separation**: do not mix research with implementation.
- **Verified counts**: every number in a spec or plan includes the command that produced it. Use `~` for estimates.
- **Claim tagging**: every claim about an external API or SDK (Liveblocks) is VERIFIED (cite docs or the type in `node_modules`), ASSUMED, or OPEN.
- **Corrections log**: when a claim is proven wrong, log the original claim, the reality and the impact.
- **Self-audit**: before finalizing a spec, re-read it and ask "What did I miss? What breaks if I'm wrong about X?"
- **Root cause only**: no bandage fixes. Log unrelated debt separately instead of fixing it in the same step.
- **Blast radius**: every spec and plan declares which files change and why. If the diff touches more files than planned, stop and flag it.
- **Context to blast**: surplus context at the end of a phase goes into verification, not new work.

### UI work

Before building or reshaping any visible UI (comment pins, thread popovers, composer, zoom controls, empty and error states), load the `frontend-design:frontend-design` skill and follow it. The design reference in the README is a guide; working functionality matters more than matching it exactly.

### Commits

- Small steps, one logical concern per commit, at most 5 files (ideally 3 to 4).
- Conventional Commits with an area scope: `feat(comments): anchor threads to image coordinates`, `fix(canvas): keep zoom centered on the cursor`.
- The user runs `git commit` and `git push`. Agents prepare the change and hand over the message.

### AI usage log

The README needs an "AI usage" section: which tools were used, for what, and at least one thing the AI got wrong that was changed. Whenever the user corrects or rejects AI output, append one line to `.agents/ai-usage-log.md` (date, what the AI proposed, what was changed and why). The README section is written from this log at the end.

## Testing

- Unit tests co-located with source (`*.test.ts` / `*.test.tsx`)
- Pure canvas math (image to screen coordinates, flip decision, zoom clamping) is unit tested first; it is the core of the evaluation
- Components with Testing Library; prefer `userEvent` over `fireEvent`; test behavior, not implementation
- Selector priority: role, then label, then text, then test id. Never CSS selectors.
