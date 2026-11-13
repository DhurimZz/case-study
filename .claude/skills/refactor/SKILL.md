---
name: refactor
description: Safe refactoring with impact analysis and incremental, test-backed steps
argument-hint: "[what to refactor and why]"
---

# Safe Refactoring

Refactoring task. Follow this process strictly.

## Process

### 1. Impact Analysis (before touching code)

```bash
# Find all usages of what you're refactoring
grep -rl "oldPattern" src/ --include="*.ts" --include="*.tsx"

# Check history to understand why it looks the way it does
git log --oneline --follow path/to/file

# Count affected files
grep -rl "oldPattern" src/ | wc -l
```

Report to the user:
- Files affected: [count, with the command that produced it]
- Areas touched: [list]
- Risk level: low/medium/high

### 2. Verify the Baseline Before Changes

```bash
npm run lint && npm test && npm run build
```

If anything fails BEFORE your changes, stop and report.

### 3. Incremental Migration

- Change ONE file/pattern at a time
- Type-check after each change (`npx tsc --noEmit`, or `npm run build`)
- Run the affected tests after each change (`npm test -- path/to/changed`)
- End each successful step with a small, reviewable commit (the user commits; hand over the message)

### 4. Common Refactoring Patterns

**Rename export:**
1. Add the new name alongside the old (backwards compatible)
2. Update all consumers
3. Remove the old name
4. Never break an `index.ts` barrel

**Move file:**
1. Copy to the new location
2. Update imports in all consumers
3. Re-export from the old location temporarily
4. Remove the old file after all consumers are updated

**Extract component:**
1. Write a test for the new component first
2. Extract with the same props interface
3. Update the parent to use the new component
4. Verify visually unchanged

**Extract pure logic (canvas math, flip decision):**
1. Write table-driven tests against the current behavior
2. Move the logic into a pure function with an explicit return type
3. Call it from the component
4. Tests stay green without changes

**Change prop interface:**
1. Add the new prop alongside the old (optional)
2. Update the component to handle both
3. Migrate all consumers to the new prop
4. Remove the old prop

### 5. Final Verification

```bash
npm run lint && npm test && npm run build
```

### 6. Rules

- NEVER rename and change logic in the same commit
- NEVER refactor files unrelated to the task
- Keep barrel exports (`index.ts`) stable
- Test at every step, not just at the end
- If >20 files are affected, discuss the approach with the user first

Refactor: $ARGUMENTS
