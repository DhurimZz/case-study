---
name: security
description: Audit code for security vulnerabilities (OWASP Top 10)
disable-model-invocation: true
argument-hint: "[files or feature to audit]"
---

Perform a security audit following the OWASP Top 10.

1. Secrets first:
   - The Liveblocks secret key exists only in `.env.local`, which is gitignored. Check `git status`, `git diff --cached` and `git log -p -S "sk_"` for any trace of it.
   - The secret key is read only in server code (the auth route). It never gets a `NEXT_PUBLIC_` prefix and never reaches a Client Component.
   - A key that was ever committed is burned even after a revert: rotate it.
2. Check: input validation on the auth route and on comment input (length limits, empty input), XSS (comment bodies rendered as text, no `dangerouslySetInnerHTML` without sanitization), CSRF, authentication and room access rules, CSP
3. Verify: no hardcoded secrets, no client-exposed server secrets, no secrets in logs, specs, plans or error messages
4. Flag each vulnerability with: severity (Critical/High/Medium/Low), `file:line`, attack vector, concrete fix
5. Run `npm audit` to check dependency vulnerabilities and report only the ones reachable from this app

Focus on: $ARGUMENTS
