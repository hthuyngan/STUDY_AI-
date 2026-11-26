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
| Active delivery phase | **P03 — Validated lesson blocks, objectives, knowledge units, and skills**, local gates & Codex review PASS; Draft PR opened |
| Implementation branch | `feature/p03-lesson-composition-graph` (from `feature/backend-redesign-modular-monolith` at `2d23a154`) |
| P03 Plan | [`docs/curriculum-refactor/PLAN-P03.json`](docs/curriculum-refactor/PLAN-P03.json) (`P03-W0..P03-W5`) |
| Dual-Agent Workflow | Active (`Trusted Local Developer Workflow`: Antigravity Medium + Codex Local CLI) |
| Protected database | `StudyAIDb` has P02 migration `20261125134024_AddCurriculumLifecycleChaptersLessons` applied; P03 migration NOT applied to `StudyAIDb` |
| Overall verdict | **VERIFIED LOCALLY**, awaiting Draft PR CI & explicit owner acceptance |

## Phase ledger

| Scope | State | Evidence / qualification |
|---|---|---|
| P00 curriculum refactor | **COMPLETED** | PR #24 merged |
| P01 stable catalog | **VERIFIED** | PR #25 merged |
| ENV-01 DB separation | **VERIFIED** | PR #26 merged |
| P02 lifecycle | **COMPLETED** | PR #27 merged (`ea2e121e`); `StudyAIDb` P02 migration applied & verified (`DBCC CHECKDB` + smoke test PASS) |
| P03 lesson blocks/graph | **VERIFIED** | `P03-W0..P03-W5` implemented; local BE/FE/Playwright gates PASS; Codex review Round 3 `PASS` (`0` findings); Draft PR opened |

## P03 implementation, remediation & test evidence

- **P03-W1..W4**: `LessonContentBlock` (12 closed types, `SchemaVersion=1`), `LearningObjective`, `KnowledgeUnit`, `Skill`, relational joins + `QuestionSkill`, `LessonPrerequisite` cycle prevention (`Serializable`), `ContentRevision` (`SnapshotSchemaVersion=2`) + rollback, `LessonContentBlockRenderer`, `LessonPage`, `LessonCompositionPanel`.
- **Codex Review Remediation (3 rounds)**:
  - `b374a624`: `P03-REV-001` (draft-first curriculum nodes + provenance-gated reviewer publish), `P03-REV-002` (fail-closed `TryGetCurrentUserId` without `"staff"` fallback).
  - `1373d272`: `P03-RR2-001` (block rollback on `published`/`archived` lessons until `unpublish`), `P03-RR2-002` (`xUnit2012` fixes). Round 3 delta rereview (`b374a624..1373d272`): **PASS** (`0` findings).
- **Local tests at `1373d272` (`TEST-SUMMARY-P03-R3.json`: `PASS`, `1265` passed, `0` failed, `0` errors)**:
  - `StudyAI.UnitTests`: **321/321 PASS**; `StudyAI.IntegrationTests` (`StudyAIDb_Clean_{GUID}`): **269/269 PASS**.
  - `frontend` `oxlint` (0 warnings/errors), `vitest` (**88 files / 587 tests PASS**), `vite build` **PASS**.
  - `bun scripts/e2e_p03_lesson_composition_playwright.ts` (`StudyAIDb_Clean_{GUID}`): **PASS**.

## Next action

Monitor Draft PR CI on GitHub Actions; obtain explicit owner acceptance before merging P03 or applying P03 migration to `StudyAIDb`.
