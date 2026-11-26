# AGENTS.md — STUDY_AI coding and code-review contract

This repository implements an education system for Vietnamese high-school students. Before coding or reviewing, read `docs/plans/AI_TUTOR_MATH10_12_IMPLEMENTATION_PLAN.md` and `docs/prompts/ANTIGRAVITY_MATH10_12_MASTER_PROMPT.md`.

## Persistent progress & Dual-Agent workflow (auto-routing; Codex automation gated)

When the user enters a feature/fix prompt in Antigravity Hydrogen Medium, restore context and route the task automatically. **Full unattended Codex invocation is currently BLOCKED** pending an independently verified different-identity Windows launcher and available Codex quota; do not claim that a one-prompt review loop is operational. Run read-only `scripts/agents/Test-DualAgentReadiness.ps1` to inspect blockers. Follow these workflow steps:
1. **Receive & Restore Context**: Read `AGENTS.md`, `PROGRESS.md`, active `TASK.json`/`PLAN.json`/unresolved findings, and verify local Git `HEAD`/worktree and PR state. Never re-read the full repository or chat history.
2. **Classify (`ECO` / `STANDARD`)**: Validate `TASK.json` via `scripts/agents/invoke-dual-agent.ps1` (`ECO` for docs/formatting only; `STANDARD` default for code/API/UI/DB/security). `ADVANCED`, `invoke_subagent`, and parallel workers are disabled.
3. **Plan**: Reuse approved PLAN or skip for simple tasks; for complex tasks, call `scripts/agents/codex-plan.ps1` (`medium` reasoning).
4. **Implement (Single Writer)**: Antigravity directly edits scoped files under cooperative `Enter-WorkerLock` (`invoke-dual-agent.ps1`). Never spawn implementation subagents.
5. **Test**: Run targeted tests (full gates for high-risk/phase) and filter output via `scripts/agents/summarize-logs.ps1` -> `TEST-SUMMARY.json`.
6. **Review & Remediate (Max 3 Attempts)**: Run `scripts/agents/codex-review.ps1` (`medium` initial, `low` delta re-review) when `automatedCodexEnabled` is verified and enabled (or use manual independent Codex review fallback while `automatedCodexEnabled: false`). Fix findings directly and re-verify.
7. **Checkpoint & Deliver**: Update `PROGRESS.md` (< 150 lines, no secrets; writer checkpoints are handoff aids, not independent acceptance) and commit/push only when permitted. Never auto-merge, auto-advance phase, or write `StudyAIDb`.

## Stack and baseline

- React 19, TypeScript, Vite, Bun; .NET 10, ASP.NET Core, EF Core, SQL Server. Preserve Clean Architecture and existing API contracts. 
- `feature/ai-core-v1` contains substantial newer implementation compared to `main`. Reconcile open PRs (especially #12, #13, #6, #9) before implementing overlapping changes. Never blindly merge or delete an active branch.
- Evondev UI skill: `.agents/skills/ui-ux/SKILL.md`; keep learner/admin UI restrained, readable and consistent with existing tokens.

## Database guard: highest priority

- **StudyAIDb is the single persistent database for Development website runtime and Production.** Never execute automated tests, test fixtures, Playwright, auto-migrations, sample curriculum seeding, test-account bootstrap, reset, truncate, drop, or unapproved data import on `StudyAIDb`. Migrations on `StudyAIDb` must be applied explicitly under controlled maintenance.
- **Strict 2-tier separation (ENV-01 Single Persistent DB):**
  - `StudyAIDb`: single persistent website/production database (`Development` and `Production` only, via explicit `ConnectionStrings:DefaultConnection`).
  - `StudyAIDb_Clean_{GUID}` (`Guid:N` or `Guid:D`): the ONLY authorized database for `Testing`, xUnit Integration Tests, CI, and Playwright E2E — auto-created before tests with per-run atomic ownership manifests, interrupted-run recovery before provisioning, and safe `LOCK_TIMEOUT` drop in `finally` / `Dispose` (never `SINGLE_USER WITH ROLLBACK IMMEDIATE`). Static `StudyAIDb_E2E` and `StudyAIDb_Dev` are forbidden in test runners.
- Startup must fail closed when `ConnectionStrings:DefaultConnection` is missing or empty; no hardcoded fallback connection string is allowed in `Program.cs`, `appsettings.json`, or `appsettings.Testing.json`.
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

## Current owner directive — L02 integrated delivery (2026-11-20)

**When working on branch `feature/math10-12-integrated-learner-ai-fullstack`**, read and execute in this order:
1. `docs/audit/2026-11-20_L02_SOURCE_REVIEW.md` (risk-driven verified findings + latest failing HEAD CI).
2. `docs/plans/PHASE-L02-MATH10_12-INTEGRATED-DELIVERY.md` (one big integrated phase, FE → API → SQL → E2E).
3. `docs/prompts/ANTIGRAVITY_L02_BIG_PHASE_EXECUTION_PROMPT.md` (direct run instructions for Antigravity, including Git preflight, continuous implementation, mandatory verification).

The owner now wants **one LARGE phase / one Draft PR / commits grouped by full-stack workstream**, instead of many small, interrupted PRs for P02–P10. This packaging supersedes the earlier “one small PR per vertical slice” instruction for L02 **only**; strict data safety, authenticated no-mock rules, test gates, and explicit human approval remain in force. The prompt file alone does not trigger an autonomous agent; start Antigravity and provide that file's instructions. Keep protected production database `StudyAIDb` untouched.
