# AGENTS.md — STUDY_AI coding and code-review contract

This repository implements an education system for Vietnamese high-school students. Before coding or reviewing, read `docs/plans/AI_TUTOR_MATH10_12_IMPLEMENTATION_PLAN.md` and `docs/prompts/ANTIGRAVITY_MATH10_12_MASTER_PROMPT.md`.

## Stack and baseline

- React 19, TypeScript, Vite, Bun; .NET 10, ASP.NET Core, EF Core, SQL Server. Preserve Clean Architecture and existing API contracts. 
- `feature/ai-core-v1` contains substantial newer implementation compared to `main`. Reconcile open PRs (especially #12, #13, #6, #9) before implementing overlapping changes. Never blindly merge or delete an active branch.
- Evondev UI skill: `.agents/skills/ui-ux/SKILL.md`; keep learner/admin UI restrained, readable and consistent with existing tokens.

## Database guard: highest priority

- **StudyAIDb is a protected production database. Never execute write-oriented tests, migrations, seed, reset, restore, truncate, drop or data import on StudyAIDb.**
- All write tests, migrations and import rehearsals must use `StudyAIDb_E2E` or an isolated disposable SQL Server DB, with a fail-closed connection-string/database-name guard.
- Do not log credentials, student private data or commit real production dumps.

## Review priorities

Flag these as blocking when demonstrated in changed code:
1. Authorization/ownership bypasses: student can access another student's records, chat or uploaded document; insecure Admin CRUD, CSRF, exposed secrets.
2. False success: API failure swallowed while UI claims create/update/publish/grade/sync succeeded; fabricated stats, local mock fallback presented as official data.
3. Assessment integrity: correct answers disclosed before submission, unauthorized grading, race conditions or lost results, mutable finalized results.
4. Migration/import risk: any chance of writing to `StudyAIDb`; non-idempotent upserts, duplicate content, broken FK, silent partial publish, absent rollback.
5. Data provenance: lessons/questions without source/license/review and unverified generated answers; fabricated “full curriculum” claims.
6. Adaptive learning correctness: hardcoded Grade 12/subject IDs, arbitrary 100% mastery without evidence, invalid prerequisites or missing-data handled as certainty.
7. Document tutor security: unsafe uploads, cross-user vector retrieval, prompt injection, missing provenance, failure to remove deleted content from embeddings/index.
8. Regressions: broken FE route/API contract, unusable mobile UI, lack of explicit loading/empty/error or accessibility; deleted tests, new redundant files.

## Test gates per feature PR

- Frontend: `cd frontend && bun install --frozen-lockfile && bun run lint && bun run test && bun run build`.
- Backend: `cd backend && dotnet restore StudyAI.sln && dotnet build StudyAI.sln && dotnet test StudyAI.sln` against **isolated SQL E2E** (check env before execution).
- Playwright E2E: at least happy, 401/403, API failure, empty state, refresh persistence, two-user isolation and mobile 390px in affected feature.
- If test tooling/env is unavailable, report NOT RUN with blocker; never assert PASS without logs. Keep each PR limited to one tested vertical slice.
- Request Codex review via GitHub PR only if the repository Code Review integration is enabled; do not mistake requesting review for completed approval.
