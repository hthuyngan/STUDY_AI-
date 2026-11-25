# STUDY_AI persistent progress checkpoint

> Last reconciled: 2026-11-25 (Asia/Bangkok) by Codex. Re-check Git/GitHub before acting; this file can become stale.

## Status contract

- `IMPLEMENTED`: code/docs exist, but required independent verification or acceptance is incomplete.
- `VERIFIED`: named evidence passed for the stated SHA/scope; this is not owner acceptance.
- `BLOCKED`: a required gate, fix, decision, environment or acceptance is still open.
- `COMPLETED`: required verification and explicit acceptance/merge gate are both recorded. Never infer this from implementation or green CI alone.

## Current checkpoint

| Field | Observed state |
|---|---|
| Active delivery phase | **P02 — edition chapter/lesson lifecycle**, remediation/re-review stage |
| Implementation branch (local) | `feature/p02-multi-subject-curriculum-lifecycle` |
| Local HEAD | `01f79669154e3e84d9910f4673c110b6b8140dc7` (3 commits ahead of remote when observed) |
| Remote PR HEAD | `fddea7116a0f475f7559fa9c780e0c4aa9f1b3b7` |
| Pull request | [#27 — Draft, OPEN](https://github.com/hthuyngan/STUDY_AI-/pull/27), base `feature/backend-redesign-modular-monolith` |
| PR review/acceptance | No submitted review and no recorded owner acceptance; `reviewDecision` empty |
| Working tree at observation | P02 worktree had 3 modified CI/frontend/E2E files; preserve them and do not overwrite |
| Protected database | `StudyAIDb` untouched by this docs task; tests may use only guarded `StudyAIDb_Clean_{GUID}` |
| Overall verdict | **IMPLEMENTED + BLOCKED**, not `COMPLETED` |

The docs branch carrying this checkpoint is `codex/docs-agent-progress-tracking`, based on PR #27 remote HEAD. Its SHA is intentionally not the implementation HEAD above.

## Phase ledger

| Scope | State | Evidence / qualification |
|---|---|---|
| P00 curriculum refactor | **COMPLETED** | Explicit PASS/move gate in [`FINAL-P00-REVIEW-AND-P01-MOVE-GATE.md`](docs/curriculum-refactor/FINAL-P00-REVIEW-AND-P01-MOVE-GATE.md); PR #24 merged |
| P01 stable catalog | **VERIFIED** | PR #25 merged; green CI at `1baa9de8`; report still says stop for review, so do not invent separate owner acceptance: [`PHASE-P01-CATALOG-REPORT.md`](docs/curriculum-refactor/PHASE-P01-CATALOG-REPORT.md) |
| ENV-01 DB separation | **VERIFIED** | PR #26 merged; CI green and guarded disposable DB evidence: [`ENV-01-FINAL-REMEDIATION-REPORT.md`](docs/curriculum-refactor/ENV-01-FINAL-REMEDIATION-REPORT.md) |
| P02 lifecycle | **IMPLEMENTED / BLOCKED** | PR #27 Draft; remote implementation and tests exist, but later local remediation has not been pushed/reviewed/accepted |
| P03+ | **BLOCKED** | Do not start until P02 blockers close and the move gate is explicitly recorded |

## P02 implementation, findings and blockers

Remote PR #27 implements edition-scoped chapter/lesson lifecycle, staff UI, learner projection and test coverage. Detailed handoff: [`PHASE-P02-LIFECYCLE-REPORT.md`](docs/curriculum-refactor/PHASE-P02-LIFECYCLE-REPORT.md).

Observed remediation after the remote PR head:

- `8b7c6c5c`: migration Down guard, slug uniqueness, archive-first retention and canonical learner visibility.
- `2cecbc36`: RowVersion propagation in lesson editing and learner UI wiring to edition-aware projection.
- `01f79669`: full-scope reorder, URL page size/history, catalog error surfacing and responsive workspace UI (F06/F07).
- Uncommitted P02 work remained in `.github/workflows/ci.yml`, `SubjectDetailPage.tsx` and `e2e_p02_curriculum_workspace_playwright.ts`; ownership remains with the active P02 agent.

Blocking conditions:

1. Push the two local remediation commits plus the active agent's completed UI fixes to PR #27 without losing its uncommitted work.
2. Run required gates on the resulting final SHA; existing CI does not verify local HEAD or uncommitted changes.
3. Obtain Codex review verdict and explicit owner acceptance/move gate. Draft + green CI is not completion.
4. Keep P03 closed until all blocking findings are resolved and checkpointed.

Open historical PRs #6, #9, #12 and #13 remain overlap risks. Use [`PR_RECONCILIATION_MATRIX.md`](docs/curriculum-refactor/PR_RECONCILIATION_MATRIX.md) before touching their areas; never merge/delete them blindly.

## Test evidence (SHA-scoped)

- GitHub CI [run 45638944076](https://github.com/hthuyngan/STUDY_AI-/actions/runs/45638944076) passed at remote SHA `fddea711`: frontend lint/test/build and two isolated .NET build/test runs.
- P02 report records backend unit `295/295`, integration `265/265` twice on independent disposable DBs, and curriculum/catalog Playwright scenarios. Treat these as evidence for `fddea711` only.
- No test was run by this documentation-only task. Status for local `01f79669` plus uncommitted files: **NOT VERIFIED**.

## Next action

Active P02 agent: finish and checkpoint the in-progress UI remediation, inspect the diff, run targeted then full safe gates, push PR #27, and request Codex re-review. Codex: review the final pushed SHA, record findings/verdict here, and only mark P02 `COMPLETED` after explicit acceptance.

## Detailed sources

- Phase sequence and gates: [`04-IMPLEMENTATION-PHASES.md`](docs/curriculum-refactor/04-IMPLEMENTATION-PHASES.md)
- Current P02 report: [`PHASE-P02-LIFECYCLE-REPORT.md`](docs/curriculum-refactor/PHASE-P02-LIFECYCLE-REPORT.md)
- Database guard: [`ENV-01-FINAL-REMEDIATION-REPORT.md`](docs/curriculum-refactor/ENV-01-FINAL-REMEDIATION-REPORT.md)
- Broader audit/remediation evidence: [`2026-11-24_ANTIGRAVITY_CODEX_REVIEW_2_VERIFICATION_REPORT.md`](docs/audit/2026-11-24_ANTIGRAVITY_CODEX_REVIEW_2_VERIFICATION_REPORT.md)
