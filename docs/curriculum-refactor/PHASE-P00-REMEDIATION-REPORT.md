# Phase P00 Remediation Report — Codex Review Findings (PR #24)

- **Date:** 2026-11-25
- **Repository:** `hthuyngan/STUDY_AI-`
- **Branch:** `feature/multi-subject-curriculum-refactor`
- **PR:** https://github.com/hthuyngan/STUDY_AI-/pull/24
- **Review Base:** `c056bf191f82bf769aca9e06e230ff120941ba22`

---

## 1. P0 Fix — 9 Failing Integration Tests (CI Run `45524074296`)

### 1.1 Exact List of 9 CI Failures & Root Causes

All 9 failures occurred on a fresh empty `StudyAIDb_E2E` in CI because runtime sample curriculum seeding (`DbInitializer.SeedReferenceDataAsync`) was removed in P00, exposing hidden test dependencies on pre-seeded `sub_math10` / `sub_math12` / `ContentSubjects`:

| # | Test Name | Root Cause | Fix Applied |
|---|---|---|---|
| 1 | `AiChatIntegrationTests.SendMessage_LearnerAccessingDraftLesson_Returns403` | Called `await db.ContentSubjects.FirstAsync()` on empty DB (`Sequence contains no elements`) | Created isolated `ContentSubject` and `ContentChapter` with unique GUID IDs inside test setup (`AiChatIntegrationTests.cs:272-308`) |
| 2 | `PhaseAi06LearningOperationsIntegrationTests.Practice_SubmitSession_PastDeadline_RestrictsToAutosave_And_PreservesScoreMax` | Inserted `ContentQuestion` and `AssessmentAttempt` with hardcoded `SubjectId = "sub_math12"` without ensuring subject row existed (FK violation) | Created isolated `ContentSubject` (`sub_p06_{guid}`) inside test setup and bound questions/attempt to it (`PhaseAi06LearningOperationsIntegrationTests.cs:339-388`) |
| 3 | `PracticeIntegrationTests.GetQuestionCount_ReturnsRealPublishedCountFromSql` | Queried `sub_math10` on empty DB | Implemented `IAsyncLifetime` on `PracticeIntegrationTests` calling `SampleCurriculumFixtureSeeder.SeedAsync(db)` (`PracticeIntegrationTests.cs:16-39`) |
| 4 | `PracticeIntegrationTests.GetQuestionCount_And_CreateSession_UseExactSamePredicate_Including_Skill_Type_Difficulty` | Queried `sub_math10` / `sub_math12` on empty DB | Covered by `SampleCurriculumFixtureSeeder.SeedAsync(db)` in `PracticeIntegrationTests.InitializeAsync` |
| 5 | `PracticeIntegrationTests.Curriculum_GetMaterials_ReturnsRealPublishedLessonsAndFormulas` | Queried `/api/v1/curriculum/materials?subjectId=sub_math12` on empty DB | Covered by `SampleCurriculumFixtureSeeder.SeedAsync(db)` in `PracticeIntegrationTests.InitializeAsync` |
| 6 | `PracticeIntegrationTests.AdaptiveMode_AdheresToAllFilters_And_NeverReturnsQuestionsOutsideFilter` | Queried `sub_math10` / `sub_math12` on empty DB | Covered by `SampleCurriculumFixtureSeeder.SeedAsync(db)` in `PracticeIntegrationTests.InitializeAsync` |
| 7 | `PracticeIntegrationTests.GetSessionResult_Lifecycle_Auth_Ownership_And_ResultPersistence` | Created practice session for `sub_math10` on empty DB | Covered by `SampleCurriculumFixtureSeeder.SeedAsync(db)` in `PracticeIntegrationTests.InitializeAsync` |
| 8 | `PracticeIntegrationTests.PracticeFlow_Create_Answer_Submit_And_CheckStats` | Created practice session for `sub_math12` on empty DB | Covered by `SampleCurriculumFixtureSeeder.SeedAsync(db)` in `PracticeIntegrationTests.InitializeAsync` |
| 9 | `PracticeIntegrationTests.Practice_RBAC_Student_Teacher_Content_Admin_Isolation` | Created practice session / queries for `sub_math12` on empty DB (returned `500 InternalServerError`) | Covered by `SampleCurriculumFixtureSeeder.SeedAsync(db)` in `PracticeIntegrationTests.InitializeAsync` |

### 1.2 Fixture Isolation Evidence

- Runtime seeding was **not** restored in `StudyAI.Api`.
- `AiChatIntegrationTests` and `PhaseAi06LearningOperationsIntegrationTests` create unique GUID-scoped subjects/chapters.
- `PracticeIntegrationTests` seeds only through `SampleCurriculumFixtureSeeder.SeedAsync(db)` (which enforces `DatabaseSafetyGuard.EnsureSafeTestDatabase`) inside test-project `IAsyncLifetime`.

---

## 2. P1 Fix — Fail-Closed `Database:SeedReferenceData=true` Before Migration

- **File modified:** `backend/src/StudyAI.Api/Program.cs:513-536`
- **Root cause:** `if (shouldSeed)` was previously evaluated *after* `DatabaseSafetyGuard.EnsureSafeDatabaseForDevelopmentOrMigration` and `await db.Database.MigrateAsync()`.
- **Fix:** Moved `shouldSeed` check immediately after reading `IConfiguration` and **before** `DatabaseSafetyGuard`, `GetRequiredService<StudyAIDbContext>()`, `db.Database.MigrateAsync()`, and any user bootstrap.
- **Verification test:** `EmptyDatabaseStartupTests.Startup_WithSeedReferenceDataTrue_FailsClosedBeforeMigration_WithZeroSchemaOrDataWrite` (`backend/tests/StudyAI.IntegrationTests/EmptyDatabaseStartupTests.cs:90-156`)
  - Creates disposable `StudyAIDb_Clean_{Guid}` with 0 tables.
  - Launches `StudyAI.Api.dll` with `Database__SeedReferenceData=true` and `Database__ApplyMigrationsOnStartup=true`.
  - Verifies non-zero exit code, error message `"Database:SeedReferenceData is disabled in runtime StudyAI.Api"`, and `SELECT COUNT(*) FROM sys.tables` == `0` (proving zero schema/data writes occurred).

---

## 3. P1 Fix — Status Contract Alignment

- **Audit:** Existing backend services (`ContentGovernanceService`, `ContentLessonsService`, `ContentQuestionsService`, `ContentAssessmentsService`, `ContentReviewService`) and frontend types (`ContentStatus`, `ContentApprovalItem`) use hyphenated `"in-review"` and `"changes-requested"` on the wire and in SQL.
- **Fix:** Updated [ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md](../architecture/ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md) and [PHASE-P00-CURRICULUM-REFACTOR.md](../implementation/PHASE-P00-CURRICULUM-REFACTOR.md) to standardize on `draft -> in-review -> approved -> published -> archived` and `changes-requested` without breaking backward compatibility or adding unnecessary status-renaming migrations.
- **Contract test added:** `ContentStatusContractTests.AdrAndGovernanceServices_UseCanonicalHyphenatedStatusContract` (`backend/tests/StudyAI.UnitTests/ContentStatusContractTests.cs`).

---

## 4. Test Gate Results

| Gate | Command / Scope | Result | Notes |
|---|---|---|---|
| 1. Targeted 9 failures + Guard + Seed rejection | `dotnet test StudyAI.IntegrationTests.csproj --filter ...` | **PASS** | All 9 previously failing tests + `DatabaseSafetyGuardTests` + `EmptyDatabaseStartupTests` passed |
| 2. Full Backend Integration Tests | `dotnet test tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj --no-build` | **PASS (230/230)** | Total increased from 229 → 230 due to new `Startup_WithSeedReferenceDataTrue_FailsClosedBeforeMigration_WithZeroSchemaOrDataWrite` test; 0 skipped, 0 failed |
| 3. Backend Unit Tests | `dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj --no-build` | **PASS (269/269)** | Total increased from 268 → 269 due to new `ContentStatusContractTests`; 0 skipped, 0 failed |
| 4. Backend Build | `dotnet build StudyAI.sln` | **PASS** | 0 errors (2 pre-existing xUnit2012 warnings in `LearnerNotesAndBookmarksIntegrationTests.cs`) |
| 5. Frontend Lint, Test & Build | `cd frontend && bun run lint && bun run test && bun run build` | **PASS** | 0 lint warnings/errors; Vitest & Vite build exited 0 |
| 6. Playwright E2E (UI Smoke) | `bun scripts/e2e_p00_p01_remediation_playwright.ts` | **PASS (4/4)** | Classroom transfer auth, teacher lock, admin settings concurrency, assessment fail-closed |
| 7. Playwright E2E (Live BE + SQL) | `bun scripts/e2e_math_curriculum_real_video_playwright.ts` | **PASS (5/5)** | Live `StudyAIDb_E2E`: grades filter, hierarchy, video player/attribution, KaTeX, SSRF & dry-run API |

---

## 5. Database Safety Evidence

- `StudyAIDb` was **never** connected to for writes, migrations, seeding, truncation, or cleanup.
- All integration and Playwright E2E write tests executed strictly against `StudyAIDb_E2E` and disposable `StudyAIDb_Clean_{Guid}` databases guarded by `DatabaseSafetyGuard`.

---

## 6. Remaining Findings (Out of P00 Scope — Scheduled in Subsequent Phases)

- `CURR-003` / `CURR-004` / `CURR-005` / `CURR-011` (Multi-subject catalog schema, content blocks, draft defaults, learner grade->subject->edition flow): **P01–P06**.
- `CURR-008` (`AiHintService` fake provider / Math 12 fallback): **P07**.
- `CURR-001` / `CURR-010` (Import consolidation & dry-run cleanup tooling): **P08–P09**.
- Remaining findings (P01–P10 out of scope)

---

## 7. Final P00 Remediation — Practice Test Isolation (CI Run `45526969484`)

- **CI Before Fix (Run `45526969484`):** **228/230 PASS, 2 FAIL**:
  1. `PracticeIntegrationTests.Practice_ExamMode_CheckQuestionBeforeSubmit_ReturnsForbidden` (`ArgumentOutOfRangeException` at `session.Questions[0].Options[0]`)
  2. `PracticeIntegrationTests.PracticeFlow_Create_Answer_Submit_And_CheckStats` (`Assert.NotEmpty(firstQ.Options)` failed)
- **Root Cause:** `PracticeIntegrationTests.InitializeAsync()` seeded shared `sub_math10`/`sub_math12` via `SampleCurriculumFixtureSeeder.SeedAsync(db)`. On `sub_math12`, seeded question data included a question with empty `Options`, and sharing fixed IDs across tests created cross-test coupling.
- **Fixture Isolation Strategy:**
  - Removed `IAsyncLifetime` / `SampleCurriculumFixtureSeeder.SeedAsync(db)` from `PracticeIntegrationTests`.
  - Added `SeedIsolatedPracticeFixtureAsync(...)` creating unique GUID-scoped `SubjectId`, `ChapterId`, `LessonId`, `AlternateLessonId`, `QuestionIds`, and valid published `multiple-choice` questions (`OptionsJson = "[\"A\", \"B\", \"C\", \"D\"]"`, `CorrectAnswer = "A"`, `Status = "published"`) per test.
  - Updated all curriculum/question-dependent tests in `PracticeIntegrationTests.cs` to query only their own isolated `SubjectId`/`LessonId` (leaving `Practice_Unauthenticated_ReturnsUnauthorized` and `Me_Bookmarks_Add_Query_Delete_PersistedInSql` free of unnecessary curriculum seeding).
- **Files Changed:**
  - `backend/tests/StudyAI.IntegrationTests/PracticeIntegrationTests.cs`
  - `backend/tests/StudyAI.IntegrationTests/AdaptiveLearningIntegrationTests.cs` (isolated subject/question seeding replacing `sub_math12`)
  - `backend/tests/StudyAI.IntegrationTests/CurriculumImportConfirmIntegrationTests.cs` (isolated GUID-scoped `ContentSubject`/`ContentChapter` per test, removing shared `MATH12` collision with `ClassroomAssignmentIntegrationTests`)
  - `docs/curriculum-refactor/PHASE-P00-REMEDIATION-REPORT.md`
- **Local Test Results (after final edit, on brand-new empty `StudyAIDb_Clean_{Guid}` + `StudyAIDb_E2E`):**
  - Targeted 2 failing tests: **2/2 PASS**
  - Repeated `PracticeIntegrationTests`: **12/12 PASS**
  - Full `StudyAI.IntegrationTests` on fresh empty `StudyAIDb_Clean_{Guid}` (including `DatabaseSafetyGuardTests` & `EmptyDatabaseStartupTests`): **230/230 PASS** (0 failed, 0 skipped, 51s)
