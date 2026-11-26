# STUDY_AI persistent progress checkpoint

> Last reconciled: 2026-11-26 (Asia/Bangkok). Re-check Git/GitHub before acting; this file can become stale.

## Status contract

- `IMPLEMENTED`: code/docs exist, but required independent verification or acceptance is incomplete.
- `VERIFIED`: named evidence passed for the stated SHA/scope; this is not owner acceptance.
- `BLOCKED`: a required gate, fix, decision, environment or acceptance is still open.
- `COMPLETED`: required verification and explicit acceptance/merge gate are both recorded. Never infer this from implementation or green CI alone.

## Current checkpoint

| Field | Observed state |
|---|---|
| Active delivery phase | **P04 — Resources and video** (`VERIFIED` locally, Draft PR open; awaiting CI & human approval) |
| Integration branch | `feature/backend-redesign-modular-monolith` (`d4cb44b7`, PR #29 merged) |
| Feature branch | `feature/p04-lesson-resources-video` (`dc1c6091` + checkpoint) |
| Dual-Agent Workflow | Active (`Trusted Local Developer Workflow`: Antigravity Medium + Codex Local CLI) |
| Protected database | `StudyAIDb` has P03 migration `20261126100005_AddValidatedLessonComposition` applied & verified (`DBCC CHECKDB` + auth smoke test PASS); P04 migration `20261126125233_AddGeneralizedLessonResources` NOT applied |
| Overall verdict | **P04 VERIFIED (Local Gates + Codex R2 PASS)**; ready for CI & human review |

## Phase ledger

| Scope | State | Evidence / qualification |
|---|---|---|
| P00 curriculum refactor | **COMPLETED** | PR #24 merged |
| P01 stable catalog | **VERIFIED** | PR #25 merged |
| ENV-01 DB separation | **VERIFIED** | PR #26 merged |
| P02 lifecycle | **COMPLETED** | PR #27 merged (`ea2e121e`); `StudyAIDb` P02 migration + `DBCC CHECKDB` + auth smoke test PASS |
| P03 lesson blocks/graph | **COMPLETED** | PR #29 merged (`7363b034`); post-merge CI [45821709436](https://github.com/hthuyngan/STUDY_AI-/actions/runs/45821709436) ALL PASS; `StudyAIDb` P03 migration + `DBCC CHECKDB` + auth smoke test PASS |
| P04 resources & video | **VERIFIED** | Local gates PASS on `dc1c6091`: `StudyAI.UnitTests` 351/351, `StudyAI.IntegrationTests` 270/270 (`StudyAIDb_Clean_{GUID}`), `oxlint` 0 errors, `vitest` 89/89 files (591/591), `vite build` PASS, `e2e_p04_lesson_resources_playwright.ts` PASS; Codex `REVIEW-P04-R2.json` **PASS** (0 findings) |

## Next action

Wait for GitHub CI on Draft PR (`feature/p04-lesson-resources-video` -> `feature/backend-redesign-modular-monolith`) and explicit human approval before merge or P04 migration rehearsal/application on `StudyAIDb`.
