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
| Active delivery phase | **P03 COMPLETED**; starting **P04 — Resources and video** |
| Integration branch | `feature/backend-redesign-modular-monolith` (`7363b034`, PR #29 merged) |
| Dual-Agent Workflow | Active (`Trusted Local Developer Workflow`: Antigravity Medium + Codex Local CLI) |
| Protected database | `StudyAIDb` has P03 migration `20261126100005_AddValidatedLessonComposition` applied & verified (`DBCC CHECKDB` + auth smoke test PASS); P04 migration NOT applied |
| Overall verdict | **P03 COMPLETED**; P04 in planning stage |

## Phase ledger

| Scope | State | Evidence / qualification |
|---|---|---|
| P00 curriculum refactor | **COMPLETED** | PR #24 merged |
| P01 stable catalog | **VERIFIED** | PR #25 merged |
| ENV-01 DB separation | **VERIFIED** | PR #26 merged |
| P02 lifecycle | **COMPLETED** | PR #27 merged (`ea2e121e`); `StudyAIDb` P02 migration + `DBCC CHECKDB` + auth smoke test PASS |
| P03 lesson blocks/graph | **COMPLETED** | PR #29 merged (`7363b034`); post-merge CI [45821709436](https://github.com/hthuyngan/STUDY_AI-/actions/runs/45821709436) ALL PASS; `StudyAIDb` P03 migration + `DBCC CHECKDB` + auth smoke test PASS |
| P04 resources & video | **PLANNING** | Generating P04 plan via Codex Local CLI (`medium` reasoning) |

## Next action

Review Codex P04 plan (`docs/curriculum-refactor/PLAN-P04.json`) and implement `LessonResource` (generalizing `ContentLessonVideo` while preserving existing video IDs/data) on `feature/p04-lesson-resources-video`.
