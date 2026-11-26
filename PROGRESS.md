# STUDY_AI persistent progress checkpoint

> Last reconciled: 2026-11-26 (Asia/Ho_Chi_Minh). Re-check Git/GitHub before acting; this file can become stale.

## Status contract

- `IMPLEMENTED`: code/docs exist, but required independent verification or acceptance is incomplete.
- `VERIFIED`: named evidence passed for the stated SHA/scope; this is not owner acceptance.
- `BLOCKED`: a required gate, fix, decision, environment or acceptance is still open.
- `COMPLETED`: required verification and explicit acceptance/merge gate are both recorded. Never infer this from implementation or green CI alone.

## Current checkpoint

| Field | Observed state |
|---|---|
| Active delivery phase | **P02 — edition chapter/lesson lifecycle**, remediation/E2E verification stage |
| Implementation branch | `feature/p02-multi-subject-curriculum-lifecycle` |
| Pull request | [#27 — Draft, OPEN](https://github.com/hthuyngan/STUDY_AI-/pull/27), base `feature/backend-redesign-modular-monolith` |
| Dual-Agent Workflow | Integrated from PR #28 (`Trusted Local Developer Workflow`); `Test-SafeAgentBridge.ps1` 14/14 PASS |
| Protected database | `StudyAIDb` untouched; tests may use only guarded `StudyAIDb_Clean_{GUID}` |
| Overall verdict | **IMPLEMENTED + BLOCKED**, awaiting CI `playwright-e2e` & owner acceptance |

## Phase ledger

| Scope | State | Evidence / qualification |
|---|---|---|
| P00 curriculum refactor | **COMPLETED** | Explicit PASS/move gate in [`FINAL-P00-REVIEW-AND-P01-MOVE-GATE.md`](docs/curriculum-refactor/FINAL-P00-REVIEW-AND-P01-MOVE-GATE.md); PR #24 merged |
| P01 stable catalog | **VERIFIED** | PR #25 merged; green CI at `1baa9de8`: [`PHASE-P01-CATALOG-REPORT.md`](docs/curriculum-refactor/PHASE-P01-CATALOG-REPORT.md) |
| ENV-01 DB separation | **VERIFIED** | PR #26 merged; CI green and guarded disposable DB evidence: [`ENV-01-FINAL-REMEDIATION-REPORT.md`](docs/curriculum-refactor/ENV-01-FINAL-REMEDIATION-REPORT.md) |
| P02 lifecycle | **IMPLEMENTED / BLOCKED** | PR #27 Draft; unit/integration/FE CI pass at `f0f525e2`, but `P02 Playwright E2E` CI failed and owner acceptance is pending |
| P03+ | **BLOCKED** | Do not start until P02 blockers close and the move gate is explicitly recorded |

## P02 implementation, findings and blockers

Remote PR #27 implements edition-scoped chapter/lesson lifecycle, staff UI, learner projection and test coverage. Detailed handoff: [`PHASE-P02-LIFECYCLE-REPORT.md`](docs/curriculum-refactor/PHASE-P02-LIFECYCLE-REPORT.md).

Completed P02 commits on `feature/p02-multi-subject-curriculum-lifecycle`:
- `8b7c6c5c`, `2cecbc36`, `01f79669`: migration Down guard, slug uniqueness, RowVersion propagation, full-scope reorder, URL pageSize/history, catalog error surfacing, responsive UI.
- `b73d4ff0`, `e7e804ad`, `25f2a9df`, `f0f525e2`: expanded P02 Playwright E2E, `playwright-e2e` CI job, `loadEdition` memoization, frontend dist build + `VITE_BASE_URL=/`.

Blocking conditions:
1. Investigate and fix the failing `P02 Playwright E2E (Real SQL Server Disposable DB)` CI job on PR #27 (`f0f525e2`).
2. Run required gates on the final SHA and complete Codex review (max 3 rounds) via Dual-Agent Workflow.
3. Obtain explicit owner acceptance/move gate before merging PR #27 or starting P03.

## Test evidence (SHA-scoped)

- Local verification (2026-11-26):
  - `Test-SafeAgentBridge.ps1`: **14/14 PASS** (including `LiveCodex_Plan` and `LiveCodex_Review_ReadOnly_And_Schema`).
  - `bun scripts/e2e_p02_curriculum_workspace_playwright.ts` on `StudyAIDb_Clean_{GUID}`: **PASS** (empty, CRUD, lesson editor, page>1 reorder, lifecycle round-trip, learner edition UI, 401/403, stale 409, API 500, tablet 1024/768 & mobile 390/375px).
  - `frontend` `bun run lint && bun run test && bun run build`: **PASS**.
- GitHub CI [run 45651751110](https://github.com/hthuyngan/STUDY_AI-/actions/runs/45651751110) at `f0f525e2`:
  - `Frontend Lint, Test & Build` & `.NET 10 Backend Build & Tests (Isolated Run 1 & 2)`: **PASS**; `P02 Playwright E2E`: **FAIL** (addressed by E2E host/spawn hardening; re-verify on push).

## Next action

Complete automated Codex review on `feature/p02-multi-subject-curriculum-lifecycle`, push to PR #27, confirm CI `playwright-e2e` passes on `ubuntu-latest`, and request explicit owner acceptance/move gate before merging PR #27 or starting P03.
