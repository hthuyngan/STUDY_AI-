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
| Active delivery phase | **P03 — Validated lesson blocks, objectives, knowledge units, and skills**, local verification complete, awaiting Codex review & Draft PR CI |
| Implementation branch | `feature/p03-lesson-composition-graph` (branched from `feature/backend-redesign-modular-monolith` at `2d23a154`) |
| P03 Plan | [`docs/curriculum-refactor/PLAN-P03.json`](docs/curriculum-refactor/PLAN-P03.json) (`P03-W0..P03-W5`) |
| Dual-Agent Workflow | Active (`Trusted Local Developer Workflow`: Antigravity Medium + Codex Local CLI) |
| Protected database | `StudyAIDb` has P02 migration `20261125134024_AddCurriculumLifecycleChaptersLessons` applied; P03 migration NOT applied to `StudyAIDb` |
| Overall verdict | **IMPLEMENTED / VERIFIED LOCALLY**, awaiting Codex review, CI & owner acceptance |

## Phase ledger

| Scope | State | Evidence / qualification |
|---|---|---|
| P00 curriculum refactor | **COMPLETED** | PR #24 merged |
| P01 stable catalog | **VERIFIED** | PR #25 merged |
| ENV-01 DB separation | **VERIFIED** | PR #26 merged |
| P02 lifecycle | **COMPLETED** | PR #27 merged (`ea2e121e`); `StudyAIDb` P02 migration applied & verified (`DBCC CHECKDB` + smoke test PASS) |
| P03 lesson blocks/graph | **IMPLEMENTED** | `P03-W0..P03-W5` implemented; local BE/FE/Playwright gates PASS; pending Codex review & Draft PR CI |

## P03 implementation & local test evidence

- **P03-W1/W2/W3 (BE)**: `LessonContentBlock` (12 closed types, `SchemaVersion=1`, `PayloadJson`), `LearningObjective`, `KnowledgeUnit`, `Skill`, relational joins + `QuestionSkill`, `LessonPrerequisite` cycle prevention under `Serializable` transaction, `ContentRevision` (`SnapshotSchemaVersion=2`) + rollback, learner `ContentBlocks` projection with `exercise` answer stripping, migration `AddValidatedLessonComposition`.
- **P03-W3/W4 (FE)**: `LessonContentBlockRenderer` (12 types + explicit alert on unsupported type/version + safe Markdown subset), `LessonPage` integration, `LessonCompositionPanel` in `ContentLessonEditorPage` (Objectives, Blocks, Knowledge & Skills, Prerequisites, Revisions & `ConfirmDialog` rollback).
- **Local tests (2026-11-26)**:
  - `StudyAI.UnitTests`: **320/320 PASS** (incl. 25 `LessonContentBlockValidationTests` + 11 P03 routes in `ControllerRouteDiscoveryTests`).
  - `StudyAI.IntegrationTests` (`StudyAIDb_Clean_{GUID}`): **269/269 PASS** (incl. `LessonCompositionIntegrationTests`).
  - `frontend` `oxlint` (0 warnings/errors), `vitest` (**88 files / 587 tests PASS**), `vite build` **PASS**.
  - `bun scripts/e2e_p03_lesson_composition_playwright.ts` (`StudyAIDb_Clean_{GUID}`): **PASS**.

## Next action

Complete Codex Local CLI review on `feature/p03-lesson-composition-graph`, fix any findings, push, and open a Draft PR against `feature/backend-redesign-modular-monolith`. Do not auto-merge or apply P03 migration to `StudyAIDb`.
