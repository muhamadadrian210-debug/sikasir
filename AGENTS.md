<!-- pre-start-skills:start -->
## RULE 0: MANDATORY PRE-START SKILL ACTIVATION (ZERO EXCEPTIONS)
Before starting any task, inspecting files, writing code, or replying, you MUST first read and activate ALL relevant embedded SKILL.md files (using-superpowers, hermes-agent, ponytail, ntislop core + ntislop-ui + ntislop-copywriting + ntislop-human + ntislop-layoutmobile + ntislop-code, ui-ux-pro-max, design-system, ui-styling, and security-audit). Never rely on memory of a skill.
<!-- pre-start-skills:end -->

<!-- ui-ux-pro-max & antislop:start -->
## UI/UX Pro Max & Antislop Quality Standards
For all UI, visual design, copy, human accessibility, and mobile layout work:

- **Antislop Rules**:
  - UI / visual: `antislop-ui` skill
  - Copy & text: `antislop-copywriting` skill
  - People & accessibility: `antislop-human` skill
  - Mobile & responsive: `antislop-layoutmobile` skill
  - Code comments: `antislop-code` skill

- **UI/UX Pro Max Design Intelligence**:
  - Main design skill: `ui-ux-pro-max` skill
  - Design systems & tokens: `design-system` skill
  - Component styling: `ui-styling` skill
  - Design CLI query: `python "C:/Users/AXIOO/.gemini/config/skills/ui-ux-pro-max/scripts/search.py" "<query>" --domain <domain>`
  - Priorities: WCAG 4.5:1 contrast, min 44x44px touch targets, context-aware 150-300ms animations, zero horizontal scroll.
<!-- ui-ux-pro-max & antislop:end -->


<!-- aegis-security & web-pentest:start -->
## Aegis Cyber Defense, Web Pentest & Active Security Standards
For all codebase development, API routes, database connections, and deployments:

- **Security & Pentest Skills**:
  - Full Web Pentest & Attack Simulation: `web-pentest` skill
  - Cloudflare Security Audit: `security-audit` skill
  - Safe SQL Execution: `safe-sql-execution` skill

- **Mandatory Active Defense Rules**:
  - **Zero Secret Leakage**: Zero private secrets, tokens, or service-role keys exposed in client bundles (`VITE_*`, `NEXT_PUBLIC_*`) or committed to Git.
  - **Parameterized Queries**: 100% parameterized queries on Neon, PostgreSQL, and SQLite with zero string-interpolated SQL.
  - **OWASP Top 10 Verification**: Active testing against BOLA/IDOR on order/lead IDs, broken authentication, PIN brute-forcing, and XSS.
  - **Active Deception & Rate Limiting**: Anti-bot rate limiting on auth/form routes, decoy honeypot trap fields, and structured forensic logging.
<!-- aegis-security & web-pentest:end -->


<!-- ponytail-senior-dev:start -->
## Ponytail Lazy Senior Developer Protocol (Anti-Bloat & YAGNI)
Always active across this codebase:
- **Skills**: `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`
- **Core Principle**: The best code is the code never written. Solve the whole problem with the least new code.
- **The 7-Rung Ladder (Stop at the first that works)**:
  1. *Does it need to exist at all?* Skip features, options, and flexibility nobody asked for.
  2. *Already in this codebase?* Reuse existing helpers, components, services, and patterns.
  3. *Standard library or platform native?* Use built-in APIs before adding third-party code.
  4. *Installed dependency?* Use what is already in package.json; never add a dependency for a few lines.
  5. *Can it be written in one clean line?* Write the line.
  6. *Default*: Write the absolute minimum code that works.
- **Non-Negotiables**: Never cut validation at trust boundaries, error handling that prevents data loss, security hardening, or accessibility.
- **Output Hygiene**: End coding replies with what was intentionally skipped or kept minimal.
<!-- ponytail-senior-dev:end -->
