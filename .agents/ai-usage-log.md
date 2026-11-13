# AI usage log

One line per correction: when the AI proposed something that was rejected or changed. The README "AI usage" section is written from this log.

| Date | AI proposed | Changed to | Why |
|---|---|---|---|
| 2026-11-13 | Loosen the Vitest pin from `4.1.12` to `^4.1.12` to match the starter's caret ranges | Rejected; Vitest stays pinned to exactly `4.1.12` | Vitest 5 had just failed to install next to the starter's `@types/node@20`; the exact pin keeps the version that was checked |
