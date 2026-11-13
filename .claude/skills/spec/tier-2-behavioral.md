# Tier 2 -- Bug Fix / Behavioral Change

**When:** Multiple files, behavioral change, user-facing impact.
**Size:** 100-500 lines.
**Example domain:** A thread opening off-screen, a composer submitting an empty comment, a pin not following the image while panning. The patterns below apply to any multi-file behavioral change; adapt the examples to your code.

---

## Required Sections

| Section                  | Purpose                                                |
| ------------------------ | ------------------------------------------------------ |
| Executive Summary        | What is broken, who is affected, scope of fix          |
| Root Cause               | Code-level with line numbers, explain WHY it breaks    |
| What Already Works       | Prevent over-engineering                               |
| Implementation Options   | A/B/C plans with blast radius + trade-offs             |
| Blast Radius             | Files modified + files receiving different runtime props |
| User Flow Impact         | Enumerate all affected flows, mark changed vs unchanged |
| Acceptance Criteria      | Binary pass/fail                                       |
| Change Dependency Matrix | Which changes must be applied together                 |
| Out of Scope             | Explicit exclusions                                    |
| Decision Points          | Trade-offs that need human judgment                    |
| Self-Audit               | Issues found during spec review                        |

**Recommended:** Truth tables, "Files NOT affected" analysis.

---

## Pattern: Truth Table

When a fix changes a boolean condition, enumerate all input combinations.

```markdown
### Change 2: Decide which side a thread opens on

| `fitsRight` | `fitsLeft` | Before          | After                    | Changed?          |
| ----------- | ---------- | --------------- | ------------------------ | ----------------- |
| `true`      | `true`     | Opens right     | Opens right              | NO                |
| `true`      | `false`    | Opens right     | Opens right              | NO                |
| `false`     | `true`     | Opens right     | **Opens left**           | **YES (the fix)** |
| `false`     | `false`    | Opens right     | Opens on the wider side  | **YES (edge case)** |

Row 3 is the reported bug: a pin near the right edge opened its thread off-screen.
Row 4 covers a viewport narrower than the thread on both sides.
```

**Why this works:** Proves the fix is surgical. Reviewers can verify that only the intended rows change.

---

## Pattern: Change Dependency Matrix

When multiple changes exist, document which must be applied together.

```markdown
### Changes 1+2+3 MUST be applied together

| Applied alone         | Result                                                         |
| --------------------- | -------------------------------------------------------------- |
| Change 2 only         | **CRASH.** Thread reads `side` from props -> undefined         |
| Change 1 only         | No visible effect -- thread still always opens right           |
| Change 3 only         | Arrow points the wrong way on left-opening threads             |
| Changes 1+2 without 3 | Thread opens left but its arrow still points right             |
| Changes 1+2+3         | Correct. Side decision, thread placement and arrow consistent. |

Change 4 (open/close animation) is independent and can be applied separately.
```

**Why this works:** Prevents partial application that causes crashes. Reviewers know the atomic unit.

---

## Pattern: User Flow Verification

Enumerate every flow that touches the changed code. Mark each as changed or unchanged.

```markdown
## User Flow Impact (8 flows)

| # | Flow                                          | Before             | After               | Changed?          |
|---|-----------------------------------------------|--------------------|---------------------|-------------------|
| 1 | Click near right edge -> composer opens       | Off-screen         | **Opens left**      | **YES (the fix)** |
| 2 | Click in the middle -> composer opens         | Opens right        | Opens right         | NO                |
| 3 | Open existing thread near right edge          | Off-screen         | **Opens left**      | **YES (the fix)** |
| 4 | Zoom in until an open thread nears the edge   | Stays right        | **Flips left**      | **YES (the fix)** |
| ...                                                                                                          |
| 8 | Reply in an open thread                       | --                 | Reply posts         | NO                |

Flows 1, 3, 4 are fixed. All others unchanged. No regressions.
```

**Why this works:** Exhaustive. If a flow is missing, the spec is incomplete. "NO" rows prove no regression.

---

## Pattern: Files NOT Affected

Explicitly state what does NOT change and why. Prevents "what about X?" questions.

```markdown
### Files NOT affected

| File                     | Why not affected                                     |
| ------------------------ | ---------------------------------------------------- |
| `image-to-screen.ts`     | Produces the pin position; the side decision reads it |
| `comment-pin.tsx`        | Pin rendering does not depend on thread side          |
| Liveblocks room setup    | No change to stored thread metadata                   |
| Auth route               | No server-side change                                 |
```

---

## Pattern: Self-Audit

Review your own spec. List issues you found and how you addressed them.

```markdown
## Review Notes (Self-Audit)

**Issues found during review:**

1. **CRITICAL -- side flips while typing:** Original Plan A recomputed the
   side on every render. Typing into the composer resized it and flipped the
   thread mid-sentence. The side is now decided when the thread opens and
   on pan/zoom, not on content resize.

2. **Missing zoom flow:** Initial flow analysis only covered clicks.
   Zooming can push an already open thread past the edge. Added flow 4.

3. **Narrow viewport:** Neither side fits on small screens. Added the
   "wider side" rule (truth table row 4).

4. **Change dependency:** Documented that Changes 1+2+3 MUST be applied
   together. Added dependency table showing the crash when applied alone.
```

**Why this works:** Shows intellectual honesty. If the author found 4 issues, the reviewer trusts the analysis. Numbers the issues for easy reference in review.

---

## Anti-Patterns for Tier 2

- **Do not** skip truth tables when changing boolean conditions
- **Do not** assume "only 1 file changed = no cascading effects" -- check runtime consumers
- **Do not** skip the self-audit -- it catches more issues than external review
- **Do not** list files as "NOT affected" without explaining why
- **Do not** skip user flow verification for user-facing changes
