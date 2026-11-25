# Final P00 Review and P01 Move Gate

**Decision:** PASS

**Review date:** 2026-11-25

**Repository:** `hthuyngan/STUDY_AI-`

**Branch:** `feature/multi-subject-curriculum-refactor`

**PR:** [#24](https://github.com/hthuyngan/STUDY_AI-/pull/24)

**Reviewed HEAD:** `3c94769c53d6ce5cb4c9272bb940dc255a6e7e7f`

**CI:** [run 45529527784](https://github.com/hthuyngan/STUDY_AI-/actions/runs/45529527784)

## 1. Review boundary

This is a diff-first final review. The new range since the previous P00 review is:

```text
3bab931f12692a7ae1e6025a5310eb992fc99361
..
3c94769c53d6ce5cb4c9272bb940dc255a6e7e7f
```

New commits:

1. `fd753068` — isolate practice integration test data.
2. `46c38d71` — add Curriculum Management UI/UX planning documents.
3. `3c94769c` — isolate adaptive-learning and curriculum-import integration test data.

The range changes three integration-test files and three documentation files. It changes no production source, migration, workflow, package dependency, or runtime configuration.

## 2. Preflight result

- `AGENTS.md` and required curriculum architecture/phase documents were read.
- Working tree was clean before review.
- `git fetch origin --prune` completed successfully.
- Local and upstream were synchronized (`0 behind / 0 ahead`) at review start.
- Local HEAD, remote branch HEAD, and PR #24 `headRefOid` all matched `3c94769c53d6ce5cb4c9272bb940dc255a6e7e7f`.
- No reset, stash, merge, or overwrite was performed.

## 3. Final finding disposition

No new blocking code finding was found in the reviewed diff.

### P00-F01 — Practice test fixture isolation

**Result:** CLOSED

Evidence in `backend/tests/StudyAI.IntegrationTests/PracticeIntegrationTests.cs`:

- `SeedIsolatedPracticeFixtureAsync` creates a unique GUID-scoped subject, chapter, two lessons, and question IDs for each dependent test.
- Questions have deterministic valid multiple-choice options, answer, explanation, status, author/reviewer, and parent relationships.
- `PracticeFlow_Create_Answer_Submit_And_CheckStats` uses only `fix.SubjectId` and verifies:
  - HTTP success;
  - exactly three questions;
  - every returned ID belongs to the test fixture;
  - no correct answer or explanation before submission;
  - non-empty options;
  - persisted answer/submit result and dashboard evidence.
- `Practice_ExamMode_CheckQuestionBeforeSubmit_ReturnsForbidden` uses only its own fixture and verifies:
  - exactly two questions;
  - every returned ID belongs to the fixture;
  - non-empty options;
  - pre-submit answer checking remains `403 Forbidden`.
- Remaining `sub_math12` strings in this file are limited to an unauthenticated request that must fail before data access and bookmark payload metadata; the two remediated tests do not depend on them.
- GUID-scoped parents/questions remove dependency on shared `sub_math10`/`sub_math12`, shared fixture ordering, or another test's curriculum rows.

The remediation did not weaken assertions. It added fixture-membership and exact question-count assertions while preserving zero-leak, persistence, score-range, and authorization checks.

### P00-F02 — Shared mutable integration data

**Result:** CLOSED for the failing paths reviewed

- `PracticeIntegrationTests` no longer implements `IAsyncLifetime` to seed the shared `SampleCurriculumFixtureSeeder` dataset.
- Adaptive hint/exam tests now create GUID-scoped curriculum/question data.
- Curriculum import confirmation tests use unique catalog parents rather than colliding with fixed `MATH12` data.
- The new fixtures are written only by integration tests and queried through their returned IDs.
- No production seed registration was restored.

### P00-F03 — Production behavior changed to make tests pass

**Result:** CLOSED

The reviewed range contains no file under `backend/src`, `frontend/src`, migrations, or `.github/workflows`. The fix is test isolation only. Runtime seeding remains rejected by `StudyAI.Api`.

### P00-F04 — Database safety and seed-before-migration guard

**Result:** CLOSED

- `Program.cs` resolves `Database:SeedReferenceData` and throws at lines 513–520 before resolving `StudyAIDbContext` or calling `MigrateAsync` at lines 535–538.
- `Startup_WithSeedReferenceDataTrue_FailsClosedBeforeMigration_WithZeroSchemaOrDataWrite` verifies rejection with zero schema/data writes on a disposable guarded database.
- CI integration tests ran against an ephemeral SQL Server container and pre-created test database, not protected `StudyAIDb`.
- No migration, import, seed, cleanup, or application data write was executed during this review.

### P00-F05 — Status contract

**Result:** CLOSED

- The ADR preserves the existing persisted/wire contract: `draft -> in-review -> approved -> published -> archived`, with `changes-requested` as a review outcome.
- `ContentStatusContractTests` asserts the ADR and governance services use the canonical hyphenated values.
- The new diff does not alter lifecycle production code.

### P00-F06 — Backend and frontend gates

**Result:** CLOSED

CI run `45529527784` is a push run for exact SHA `3c94769c53d6ce5cb4c9272bb940dc255a6e7e7f`.

| Gate | Evidence | Result |
|---|---|---|
| Backend Release build | GitHub Actions job `138921088288` | PASS |
| Backend unit tests | 269 total | PASS, 0 failed |
| Backend integration tests | 230 total on real ephemeral SQL Server | PASS, 0 failed |
| Frontend lint | 492 files, 0 warnings/errors | PASS |
| Frontend Vitest | 84 files, 569 tests | PASS |
| Frontend TypeScript/Vite build | completed successfully | PASS |

The full suites were not rerun locally because the exact-HEAD CI evidence was complete and the review found no new uncertainty requiring reproduction.

### P00-F07 — Playwright regression evidence

**Result:** CLOSED for P00; carried forward explicitly

The current CI workflow does not contain a Playwright job and has no uploaded artifact. The P00 remediation report and PR comment record these executions against the application state at `3bab931f`:

- `bun scripts/e2e_p00_p01_remediation_playwright.ts`: 4/4 UI smoke scenarios.
- `bun scripts/e2e_math_curriculum_real_video_playwright.ts`: 5/5 live backend + `StudyAIDb_E2E` scenarios, including curriculum hierarchy/rendering and unauthenticated reorder rejection.

This evidence remains applicable to application code at `3c94769c` because the complete range after `3bab931f` changes only tests and documentation. Exact-HEAD CI additionally rebuilt and retested the application. This decision does not convert the UI-smoke suite into browser-to-SQL evidence and does not waive P01's required Playwright matrix.

## 4. Blocking findings status

| Prior blocker | Final status |
|---|---|
| Practice tests depended on fixed/shared sample curriculum | CLOSED |
| Two Practice tests could receive questions without options | CLOSED |
| Runtime reference seed could be enabled | CLOSED |
| Seed rejection occurred too late | CLOSED |
| Status names diverged between ADR and persisted/wire contract | CLOSED |
| Backend CI failure | CLOSED |
| Frontend CI failure | CLOSED |
| Protected database risk in the reviewed execution | CLOSED |

No blocking P00 finding remains open in the reviewed scope.

## 5. Move-gate decision

## PASS — P00 is complete; P01 may begin

The owner request defines and therefore approves the P01 entity scope: `GradeLevel`, generic `Subject`, `Curriculum`, `TextbookSeries`, and `CurriculumEdition`. The canonical lifecycle, compatibility-first migration, and reuse strategy remain those in `ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md`.

P01 authorization is conditional on the following implementation boundaries:

- use a dedicated P01 implementation branch/PR from the approved P00 baseline;
- implement only catalog foundations, not chapter/lesson lifecycle or `CurriculumWorkspace` from P02;
- use additive migration and compatibility reads; preserve current IDs/contracts;
- run all migration/write tests only on `StudyAIDb_E2E` or disposable SQL;
- do not import curriculum, generate sample production content, or mutate `StudyAIDb`;
- complete the count/key/backfill report and prove upgrade/rollback before the P02 move gate.

The implementation instructions are in `docs/curriculum-refactor/ANTIGRAVITY-P01-IMPLEMENTATION-PROMPT.md`.
