# Tier 1 -- Surgical Fix

**When:** Single-file or few-line change with clear root cause.
**Size:** < 100 lines.
**Example domain:** A coordinate conversion bug, a wrong constant, a missing null check. The patterns below apply to any small, scoped fix; adapt the examples to your code.

---

## Required Sections

| Section              | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| Executive Summary    | 2-3 sentences: what is wrong, how big is the fix |
| Root Cause           | Code-level analysis with file paths + line nums  |
| What Already Works   | Prevent over-engineering -- list what NOT to fix  |
| Implementation Plan  | 1 plan is OK (no A/B/C needed for surgical)      |
| Blast Radius         | Files + lines changed                            |
| Verified Counts      | Every number backed by a command                  |
| Acceptance Criteria  | Binary pass/fail table                           |

**Optional:** Decision Points, Out of Scope, Risks.

---

## Pattern: Executive Summary

State the scope and size of the fix upfront. Anchor to specific line numbers.

```markdown
## Executive Summary

`imageToScreen` converts a comment's image coordinates to screen pixels
correctly at zoom 1, but **applies the pan offset before scaling** instead of
after. At any zoom other than 1, pins drift away from their anchor.
This is a 1-line fix in the transform helper + test coverage for zoom != 1.
```

**Why this works:** Reader knows within 3 sentences that this is a small fix, not a redesign.

---

## Pattern: Root Cause with Discrepancy Table

Show current vs required state in a table. Mark each row with a pass/fail indicator.

```markdown
## Root Cause Analysis

### Current State (`image-to-screen.ts:8-14`)

Image point (100, 50), pan (20, 10):

| Zoom | Current Output | Required Output | Impact                       |
| ---- | -------------- | --------------- | ---------------------------- |
| 1    | (120, 60)      | (120, 60)       | Correct                      |
| 2    | (240, 120)     | (220, 110)      | Pin 20px off its anchor      |
| 0.5  | (60, 30)       | (70, 35)        | Pin 10px off its anchor      |
```

**Why this works:** Discrepancies are immediately visible. The "Impact" column justifies the fix.

---

## Pattern: What Already Works

Prevents over-engineering by listing what does NOT need changing and why.

```markdown
### What Already Works

- Storing positions in image coordinates -- correct model, no migration needed
- Zoom clamping (min/max) -- separate helper, already tested
- Pin rendering -- reads the helper's output, no change needed
- Persisted thread metadata -- holds image coordinates, unaffected by the fix
```

**Why this works:** Stops the implementer from "fixing" things that work. Each point explains WHY it is safe.

---

## Pattern: Verified Counts

Every number must include the command that produced it. No bare assertions.

```markdown
### Caller Impact

`imageToScreen` has 2 callers
(`grep -rn "imageToScreen(" src/ --include=*.tsx` -- 2 matches)

3 unit tests cover zoom 1 only
(`grep -c "imageToScreen" src/canvas/image-to-screen.test.ts` -- 3)
```

**Why this works:** Reviewers can re-run the command to verify the claim. Counts do not go stale silently.

---

## Pattern: Blast Radius Table

Small, precise. Files + change description + line count.

```markdown
## Files to Modify

| # | File                       | Change                                  |
|---|----------------------------|-----------------------------------------|
| 1 | `image-to-screen.ts`       | Scale first, then add pan offset (line 11) |
| 2 | `image-to-screen.test.ts`  | Add cases for zoom 0.5, 2 and 4         |

**Blast radius:** 2 files, ~1 line change + ~30 lines of tests.
```

---

## Pattern: Acceptance Criteria Table

Binary pass/fail. Each criterion has a verification method.

```markdown
## Acceptance Criteria

| #    | Criterion                                   | How to Verify                     |
| ---- | ------------------------------------------- | --------------------------------- |
| AC-1 | Pin stays on its anchor at zoom 2           | Unit test for zoom 2              |
| AC-2 | Pin stays on its anchor at zoom 0.5         | Unit test for zoom 0.5            |
| AC-3 | Zoom 1 output unchanged                     | Existing test passes unchanged    |
| AC-4 | No regression in other canvas helpers       | `npm test image-to-screen`        |
| AC-5 | Pin visually stays put while zooming        | Manual check in `npm run dev`     |
```

---

## Anti-Patterns for Tier 1

- **Do not** add implementation options A/B/C for a 1-line fix
- **Do not** write a change dependency matrix for a single file
- **Do not** add a corrections log unless you actually corrected a wrong claim
- **Do not** skip "What Already Works" -- this is what prevents scope creep
