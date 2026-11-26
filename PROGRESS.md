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
| Active delivery phase | **P05 — Question mapping & assessment integrity** (Draft PR open; awaiting CI & human review) |
| Integration branch | `feature/backend-redesign-modular-monolith` (`0143e2df`, PR #30 merged) |
| Feature branch | `feature/p05-question-mapping-assessment-integrity` |
| Dual-Agent Workflow | Active (`Trusted Local Developer Workflow`: Antigravity Medium + Codex Local CLI) |
| Protected database | `StudyAIDb` has P04 migration `20261126125233_AddGeneralizedLessonResources` applied & verified (`27/27` videos preserved, `DBCC CHECKDB` + auth smoke test PASS); P05 migration `20261126142439_AddQuestionMappingAndAssessmentIntegrity` NOT applied |
| Overall verdict | **P05 IMPLEMENTED & LOCALLY TESTED**; awaiting CI & human review |

## Phase ledger

| Scope | State | Evidence / qualification |
|---|---|---|
| P00 curriculum refactor | **COMPLETED** | PR #24 merged |
| P01 stable catalog | **VERIFIED** | PR #25 merged |
| ENV-01 DB separation | **VERIFIED** | PR #26 merged |
| P02 lifecycle | **COMPLETED** | PR #27 merged (`ea2e121e`); `StudyAIDb` P02 migration + `DBCC CHECKDB` + auth smoke test PASS |
| P03 lesson blocks/graph | **COMPLETED** | PR #29 merged (`7363b034`); post-merge CI [45821709436](https://github.com/hthuyngan/STUDY_AI-/actions/runs/45821709436) ALL PASS; `StudyAIDb` P03 migration + `DBCC CHECKDB` + auth smoke test PASS |
| P04 resources & video | **COMPLETED** | PR #30 merged (`6b1c8a1d`); post-merge CI [45835480689](https://github.com/hthuyngan/STUDY_AI-/actions/runs/45835480689) ALL PASS (incl. Playwright P02/P03/P04); `StudyAIDb` P04 migration (`27/27` videos preserved) + `DBCC CHECKDB` + auth smoke test PASS |
| P05 question & assessment | **IMPLEMENTED** | Local gates PASS: UnitTests 353/353, IntegrationTests 271/271 (`StudyAIDb_Clean_{GUID}`), `oxlint` 0 errors, `vitest` 89/89 (591/591), `vite build` PASS, `e2e_p05_question_assessment_playwright.ts` PASS; Codex R1-R3 completed (max 3 rounds; post-R3 start-attempt `ValidateMappedQuestionEligibility` guard added & verified in 271/271 IntegrationTests) |

## Next action

Wait for GitHub Actions CI on Draft PR (`feature/p05-question-mapping-assessment-integrity` -> `feature/backend-redesign-modular-monolith`) and human review before merge or P05 migration rehearsal/application on `StudyAIDb`.
