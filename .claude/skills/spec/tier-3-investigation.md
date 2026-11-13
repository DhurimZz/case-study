# Tier 3 -- Investigation / Analysis

**When:** Unknown scope, research-heavy, multiple hypotheses to evaluate.
**Size:** 500+ lines (split on demand via overview + satellite docs).
**Example domain:** Janky panning with many comments, a real-time sync delay, a memory leak. The patterns below apply to any investigation; adapt the examples to your code.

---

## Required Sections

| Section               | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| Executive Summary     | What is unknown, why it matters, scope of investigation   |
| Root Cause / Hypothesis | Initial hypotheses with confidence levels               |
| Implementation Options | A/B/C plans with blast radius + trade-offs               |
| Blast Radius          | Files modified + projected impact                         |
| Acceptance Criteria   | Binary pass/fail                                          |
| Out of Scope          | Explicit exclusions                                       |
| Decision Points       | Trade-offs that need human judgment                       |
| Constraints           | Non-negotiable boundaries before exploring solutions      |
| Corrections Log       | Track every wrong claim and its correction                |
| Evidence Chain        | Source-verified data with commands that produced it        |
| Honest Assessment     | Tag claims as PROVEN / PROBABLE / UNVERIFIED              |
| "What We Ruled Out"   | Dead ends with reasons -- saves future sessions from repeating |
| Expected Outcomes     | Projected impact per phase                                |

**Recommended:** Profiler screenshots, experiment logs, architecture diagrams.

---

## Pattern: Constraints Table (Non-Negotiable)

Define the search space BEFORE exploring solutions. Constraints prevent wasted passes.

```markdown
## Constraints (Non-Negotiable)

| #      | Constraint                              | Rationale                                         |
| ------ | --------------------------------------- | ------------------------------------------------- |
| **C1** | **No new paid services**                | Free Liveblocks tier only.                        |
| **C2** | **Pan/zoom stays at 60fps with 50 pins** | The core interaction must feel smooth.            |
| **C3** | **Same feature set**                    | No removing replies, editing or the composer.     |
| **C4** | **Positions stay in image coordinates** | Changing the stored model breaks existing threads. |
| **C5** | **Tests must keep passing**             | No change can cause passing tests to fail.        |

**Implications of C2+C4:**
- Pins must move via a shared CSS transform, not per-pin state updates
- Coordinate conversion must stay a pure function of (point, pan, zoom)
```

**Why this works:** Every approach evaluation can reference "violates C2" instead of re-explaining. The implications section pre-answers "but what about..." questions.

---

## Pattern: Corrections Log

Track every wrong claim and its correction. This is the single most important section for multi-pass investigations. Format: original claim, reality, impact on spec.

```markdown
## Corrections Log

| Original Claim                          | Reality                                           | Impact                      |
| --------------------------------------- | ------------------------------------------------- | --------------------------- |
| Image decoding causes the jank          | Every pin re-renders on each pan event            | Root cause analysis revised |
| Liveblocks sync is slow                 | Sync is ~80ms; the delay is a debounce in our code | Focus shifted to our code  |
| "3 listeners leak"                      | **1 listener added 3 times** (missing cleanup)    | Single fix instead of 3     |
| Memoizing pins would fix it             | Pins already memoized; the transform prop changes | Move transform to the layer |
```

**Why this works:** Prevents future sessions from repeating debunked hypotheses. Shows intellectual honesty; the path to truth matters as much as the final answer.

---

## Pattern: Evidence Chain with Verified Metrics

Every metric must cite its source: a command, a profiler run, `performance.mark()`, etc.

```markdown
## Current State (Verified Metrics)

### Pan performance -- VERIFIED via Chrome Performance panel (5 runs, median)

(`npm run build && npm start`, 50 seeded pins, 5s continuous drag):

| Metric              | Current | Target  | Gap     |
| ------------------- | ------- | ------- | ------- |
| Avg frame time      | 31ms    | < 16ms  | -15ms   |
| Long tasks (>50ms)  | 12      | 0       | -12     |
| React commits/sec   | 58      | ~0      | -58     |

### Bundle (`npm run build` route table):

| Route   | First Load JS |
| ------- | ------------- |
| `/`     | 142 kB        |
```

**Why this works:** Every number is reproducible. Commands allow re-verification.

---

## Pattern: Honest Assessment

Tag conclusions by confidence level. Never present hypotheses as facts.

```markdown
### Summary

**Honest assessment:** Pan frame time can realistically drop from 31ms to
~12ms by moving the transform onto the shared layer. Further gains would
require virtualizing off-screen pins, which is out of scope for 50 pins.
```

Use these tags in the body of the spec:

| Tag            | Meaning                                          |
| -------------- | ------------------------------------------------ |
| **PROVEN**     | Verified via command output or experiment         |
| **PROBABLE**   | Strong evidence but not yet confirmed             |
| **UNVERIFIED** | Hypothesis only -- needs benchmarking or testing  |
| **DEAD**       | Experimentally disproven -- do not revisit        |

Example inline usage:
```markdown
- Shared layer transform: **PROVEN** (prototype: 0 React commits during pan)
- requestAnimationFrame throttling of wheel zoom: **PROBABLE** (profiler flags it, untested fix)
- Virtualizing off-screen pins: **UNVERIFIED** (theoretical, no prototype yet)
- Canvas-rendered pins: **DEAD** (lost accessibility and hit testing)
```

---

## Pattern: Expected Outcomes Table

Project impact per phase. Include the metrics that matter for your investigation.

```markdown
## Expected Outcomes

| Metric             | Current | Phase 1 | Phase 2 | Phase 3 |
| ------------------ | ------- | ------- | ------- | ------- |
| Avg frame time     | 31ms    | ~14ms   | ~12ms   | ~10ms   |
| React commits/sec  | 58      | ~0      | ~0      | ~0      |
| Long tasks         | 12      | ~2      | 0       | 0       |

Phase 1: Shared layer transform (PROVEN fix)
Phase 2: rAF-throttled wheel zoom (PROBABLE)
Phase 3: Off-screen pin virtualization (UNVERIFIED)
```

---

## Anti-Patterns for Tier 3

- **Do not** present hypotheses as conclusions -- use PROVEN/PROBABLE/UNVERIFIED tags
- **Do not** skip the corrections log -- it is the most valuable section for multi-pass work
- **Do not** evaluate approaches without referencing constraints ("violates C2")
- **Do not** use bare numbers without the command that produced them
- **Do not** explore solutions before defining the constraint space
- **Do not** keep the spec in one massive file -- split into overview + satellite docs when > 20K tokens
