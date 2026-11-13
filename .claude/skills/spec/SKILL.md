---
name: spec
description: Use when requirements are unclear, defining a new feature area, or relying on an external API/SDK contract (e.g. Liveblocks); produces a spec before planning
argument-hint: "[feature or change description]"
---

Define WHAT before HOW. Produce a spec document before writing the plan.

## Process

**Before starting, resolve the spec folder.** Specs are numbered, one folder per piece of work:

1. List `.agents/specs/` and take the highest `NN-` prefix. The new folder is the next two-digit number: `01-image-anchoring`, `02-thread-flip`, `03-pan-zoom`.
2. Pick a short kebab-case name that describes the outcome, not the implementation.
3. The folder name flows into the save path (`.agents/specs/NN-short-name/spec.md`) and the `**Spec:**` header in the template.

Then:

1. **Understand the request.** If the user provides extensive context (README requirements, design references, links), organize it first, then identify gaps. If the request is brief, ask clarifying questions until requirements are unambiguous. Use the AskUserQuestion tool to surface edge cases the user forgot.

2. **Assess complexity** to determine spec depth:
   - **Surgical** (1-3 files, clear scope): minimal spec, focused root cause + fix
   - **Bug fix / behavioral change** (multiple files, user-facing): full spec with options A/B/C
   - **Investigation / analysis** (unknown scope, research): deep spec with evidence chains
   - **Migration / large-scale** (codebase-wide, multi-session): split spec with satellite docs

   Reference the tier docs in `.claude/skills/spec/` for section templates and examples.

3. **Contract discovery** (for specs that depend on an external API or SDK; skip for pure UI work):

   Before writing the spec, verify every technical claim from a source:
   - Read the SDK's TypeScript types in `node_modules` (e.g. `node_modules/@liveblocks/react/dist/*.d.ts`), the official docs, and the starter example's existing usage. Use a subagent for context efficiency when the surface is large.
   - Check existing patterns in this repo (grep for similar components, hooks, utilities)
   - Verify hook names, option and return shapes, metadata limits, auth flow and error behavior
   - Tag every external API/SDK claim: **VERIFIED** (cite the type file, doc URL or command), **ASSUMED** (needs verification), **OPEN** (needs human input)
   - Produce a compact verified contract summary (<50 lines)

   If a source is not accessible, tag ALL claims about it as ASSUMED and flag them for the user.

   **What each tag means:**
   - **VERIFIED** = confirmed by reading source or types, running a command, or calling the API. Must cite the source.
   - **ASSUMED** = inferred from patterns, docs summaries or general knowledge. NOT source-verified. Causes spec churn if wrong.
   - **OPEN** = explicitly unknown. Requires human input or access not currently available.

4. **Write the spec** using the structure below. Not every section is needed for every spec; scale with complexity.

5. **Self-audit.** Before saving, re-read the spec and ask:
   - Are there ASSUMED claims that should be VERIFIED?
   - Did I check existing patterns before proposing new ones?
   - Would this spec survive a corrections round, or am I guessing?

6. **Save** to `.agents/specs/NN-short-name/spec.md`.

7. **Get user approval** on the spec before writing the plan.
   - If critical API/SDK claims are still tagged ASSUMED, flag them explicitly: "These claims need verification before implementation: [list]"

## Spec Template

```markdown
# [Title]

**Spec:** NN-short-name
**Status:** SPEC PHASE | READY FOR PLAN | IN PROGRESS | DONE
**Date:** YYYY-MM-DD

---

## Executive Summary
<!-- 2-5 sentences: what, why, and the fix/approach -->

## Current State / Root Cause
<!-- Code-level analysis with file paths and line numbers -->
<!-- Component tree or data flow if relevant -->
<!-- Verified counts: include the grep/command that produced them -->

## What Already Works
<!-- Prevent over-engineering. List what does NOT need changing and why. -->

## Prerequisites
<!-- Dependencies on other specs, setup steps or accounts that must be resolved first -->

## External API / SDK Contract (Verified)
<!-- Only when the feature depends on an external API or SDK. Delete if pure UI. -->
> Verified against: [type files / doc URLs / commands] on [date]

### Surface
<!-- Hooks, functions, endpoints used; their inputs and return shapes -->

### Fields
| Field | Type | Source | Tag |
|-------|------|--------|-----|
| `fieldName` | string | `node_modules/<pkg>/dist/index.d.ts` | VERIFIED |

### Limits & Rules
<!-- Size limits, allowed value types, rate limits, auth requirements that affect the UI -->

### Gotchas
<!-- Naming traps, version differences between the docs and the installed package, etc. -->

## Implementation Options

### Plan A: [Name]
**Blast radius:** N files
**Pros:** ...
**Cons:** ...

### Plan B: [Name]
**Blast radius:** N files
**Pros:** ...
**Cons:** ...

### Plan C: [Name]
**Blast radius:** N files
**Pros:** ...
**Cons:** ...

## Interfaces
<!-- TypeScript types, function signatures, component Props (draft) -->
<!-- Only needed for new features or contract work -->

## Blast Radius

| File | Action | Reason |
|------|--------|--------|
| `path/to/file.tsx` | Modify | ... |

## User Flow Impact
<!-- Which user flows are affected? Enumerate and mark changed vs unchanged. -->

## Secrets & Data
<!-- Which secrets are involved (e.g. the Liveblocks secret key) and where they live: .env.local only, never committed, never sent to the client. -->
<!-- Which user data does this render (names, avatars, comment text) and where does it come from? "None" is valid. -->

## Acceptance Criteria
<!-- Binary pass/fail. Testable. -->
- [ ] ...

## Decision Points
<!-- Trade-off analysis for design choices -->

## Out of Scope
<!-- Explicit list of what this does NOT include -->

## Open Questions
<!-- Anything still unresolved that needs a decision -->

## Additional Information
<!-- Design references, screenshots, related docs -->

## Corrections Log
<!-- Track every wrong claim and its correction. For multi-round specs, organize by version (v2→v3, v3→v4). -->
<!-- Delete if no corrections were needed. REQUIRED for Investigation tier, RECOMMENDED for Migration. -->

| Original Claim | Reality | Impact |
|---|---|---|
| ... | ... | ... |

## Verification
- [ ] ...

## Session Tracking

| Date | Session | Description |
|------|---------|-------------|
| ... | ... | ... |
```

## Section Guide by Complexity

| Section | Surgical | Bug Fix | Investigation | Migration |
|---------|----------|---------|---------------|-----------|
| Executive Summary | Required | Required | Required | Required |
| Root Cause | Required | Required | Required | Required |
| What Already Works | Required | Recommended | Optional | Optional |
| Prerequisites | Optional | Optional | Recommended | Required |
| Implementation Options | 1 plan OK | A/B/C required | A/B/C required | A/B/C required |
| Interfaces | N/A | Optional | Optional | Recommended |
| Blast Radius | Required | Required | Required | Required |
| User Flow Impact | Optional | Required | Recommended | Required |
| Secrets & Data | If secrets or UI | If secrets or UI | If secrets or UI | If secrets or UI |
| Acceptance Criteria | Required | Required | Required | Required |
| Decision Points | Optional | Required | Required | Required |
| Out of Scope | Optional | Required | Required | Required |
| Additional Information | Optional | Optional | Recommended | Recommended |
| External API / SDK Contract | If SDK-driven | Recommended | Required | Required |
| Change Dependency Matrix | N/A | If atomic changes | N/A | Required |
| Truth Tables / Proofs | N/A | If condition changes | N/A | N/A |
| Self-Audit | Optional | Required | Required | Required |
| Evidence Chain | N/A | N/A | Required | Optional |
| Corrections Log | Optional | Optional | Required | Recommended |
| Constraint Evaluation | N/A | N/A | Required | Optional |
| Phase Tracking | N/A | N/A | N/A | Required |
| Verification Spec | N/A | N/A | N/A | Separate doc |
| Session Tracking | Required | Required | Required | Required |

## When to Use Spec-First

- New feature area (canvas, comments, collaboration layer)
- Contract with an external API or SDK (Liveblocks hooks, auth endpoint, thread metadata)
- Requirements are fuzzy or open to interpretation
- Change touches >3 files or more than one feature area
- Bug with unclear root cause
- Investigation or analysis work

## When Plan-Only Is Fine

- Bug fix with obvious root cause and single-file fix
- Single-component or single-file change
- You already know the full shape of the solution

## Key Principles

- **Verify before writing**: never write SDK hook names, option shapes or response fields without reading the types or docs first. If the source is inaccessible, tag as ASSUMED. This is the #1 cause of spec version churn.
- **Claim tagging**: every external API/SDK claim is tagged VERIFIED (with source citation), ASSUMED, or OPEN. Never write assumed claims as verified prose. Tags that survive to approval get flagged.
- **Verified counts**: every number in the spec includes the command that produced it
- **Root cause only**: no bandage fixes. Fix the actual problem.
- **Constraint-first**: define what must NOT happen before seeking a path forward
- **Corrections log**: when a claim turns out wrong, log it. For multi-round specs, organize corrections by version transition (v2→v3, v3→v4 tables).
- **Self-audit**: before finalizing, re-read the spec and ask "what did I miss?"
- **Context budget**: keep specs loadable in a single session. Split large specs into overview + satellite docs.

Task: $ARGUMENTS
