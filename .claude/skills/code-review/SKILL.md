---
name: code-review
description: Review recent changes for quality, DRY, security, and performance
disable-model-invocation: true
---

Perform a comprehensive code review of recent changes.

1. Run `git diff --stat` to see changed files
2. Read each changed file fully
3. Categorize findings:
   - **Blockers**: Security vulnerabilities (a committed or client-exposed secret is always a Blocker), critical bugs, broken core behavior (comment anchoring, thread side, pan/zoom)
   - **Important**: DRY violations, performance issues, accessibility problems, missing error handling, missing tests on canvas math
   - **Nice-to-Have**: Style improvements, refactoring opportunities
4. Include `file:line` references and concrete fix suggestions
5. Check: TypeScript types, React patterns, Server vs Client Components, accessibility, test coverage
6. Note strengths too: what was done well

For the full house rules and response template, use the `code-review` agent (`.claude/agents/code-review.md`).
