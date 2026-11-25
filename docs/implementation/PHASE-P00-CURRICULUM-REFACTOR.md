# Phase P00 Report — Baseline, ADR, and Recurrence Stop

- **Date:** 2026-11-25
- **Branch:** `feature/multi-subject-curriculum-refactor`
- **Base Commit:** `49407bb2035e64da096521fb6c63648fdd139b92` (`feature/backend-redesign-modular-monolith`)
- **Baseline Snapshots:** `f81d7eea` (Codex docs), `faa4d932` (local in-progress remediation)
- **Findings Addressed:** `CURR-002`, `CURR-007` (partial/runtime boundary), `CURR-014`

---

## 1. Deliverables Completed

1. **Architecture Decision Record:** [ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md](../architecture/ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md)
   - Defines target hierarchy (`GradeLevel -> Subject -> Curriculum -> CurriculumEdition -> ContentChapter -> ContentLesson`), canonical lifecycle (`draft -> in-review -> approved -> published -> archived`, `changes-requested`), compatibility/migration strategy, and AI/adaptive boundaries.
2. **PR Reconciliation Matrix & Fallback Inventory:** [PR_RECONCILIATION_MATRIX.md](../curriculum-refactor/PR_RECONCILIATION_MATRIX.md)
   - Verified `origin/feature/ai-core-v1` and PR #20 are ancestors of `HEAD`.
   - Reconciled PR #22 (absorbed into `docs/curriculum-refactor/`) and PR #23 (Math-only direction superseded; DB safety & dry-run rules reused in P09).
   - Inventoried all runtime mock/localStorage fallbacks.
3. **Recurrence Stop (`CURR-002`):**
   - Moved `SeedReferenceDataAsync` (hardcoded `sub_math10`, `sub_math11`, `sub_math12`, sample chapters, lessons, and questions) out of `backend/src/StudyAI.Api/Data/DbInitializer.cs` into `backend/tests/StudyAI.IntegrationTests/Fixtures/SampleCurriculumFixtureSeeder.cs` (guarded by `DatabaseSafetyGuard.EnsureSafeTestDatabase`).
   - Updated `backend/src/StudyAI.Api/Program.cs` so `Database:SeedReferenceData=true` fails closed in runtime `StudyAI.Api` instead of seeding sample curriculum.
   - Updated `backend/tests/StudyAI.IntegrationTests/CleanDatabaseMigrationIntegrationTests.cs` to use `SampleCurriculumFixtureSeeder.SeedAsync`.
   - Added `backend/tests/StudyAI.IntegrationTests/EmptyDatabaseStartupTests.cs` proving empty-DB startup creates 0 subjects, 0 chapters, 0 lessons, 0 questions, 0 videos, and 0 progress.
4. **Production Mock Adapter Isolation (`CURR-007`):**
   - Removed `MockCurriculumAdapter` and `export const curriculumRepository = new MockCurriculumAdapter()` from `frontend/src/repositories/curriculum.repository.ts`.
   - Moved `MockCurriculumAdapter` to `frontend/src/test/fixtures/curriculum.mock.ts` and updated test imports (`curriculum.repository.test.ts`, `InteractiveLearning.test.tsx`).

---

## 2. Database Safety & Integrity

- `StudyAIDb` was **never** written to, migrated, seeded, or modified.
- All SQL write tests ran exclusively against `StudyAIDb_Clean_{Guid}` (disposable) and `StudyAIDb_E2E` via `DatabaseSafetyGuard`.

---

## 3. Verification Evidence

| Check | Scope | Result |
|---|---|---|
| `dotnet build StudyAI.sln` | Full backend solution | **PASS** (0 errors, 2 pre-existing xUnit warnings in `LearnerNotesAndBookmarksIntegrationTests.cs`) |
| `dotnet test StudyAI.UnitTests.csproj` | Backend unit tests | **PASS** (268/268) |
| `dotnet test StudyAI.IntegrationTests.csproj --filter "DatabaseSafetyGuardTests\|EmptyDatabaseStartupTests\|CleanDatabaseMigrationIntegrationTests"` | DB guard, empty-DB startup, clean migration + fixture seed | **PASS** (45/45) |
| `bun run lint` (`oxlint --deny-warnings`) | Frontend (492 files) | **PASS** (0 warnings, 0 errors) |
| `bun run test` (`vitest run`) | Frontend unit/component suite | **PASS** (exit code 0) |
| `bun run build` (`tsc -b && vite build`) | Frontend TypeScript & Vite bundle | **PASS** (exit code 0) |
| Full `StudyAI.IntegrationTests` & Playwright E2E | Unchanged modules | **NOT RUN** (scoped to P00 baseline/guard/empty-startup) |

---

## 4. Next Move Gate (Before Phase P01)

Per `docs/curriculum-refactor/04-IMPLEMENTATION-PHASES.md`, **Phase P01 (Stable catalog foundations)** requires owner confirmation of the ADR in [ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md](../architecture/ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md):
- Target entity names (`GradeLevel`, `Subject`, `Curriculum`, `TextbookSeries`, `CurriculumEdition`),
- Canonical status model (`draft -> in-review -> approved -> published -> archived`, `changes-requested`),
- Compatibility strategy (preserve existing `ContentSubject`/`ContentChapter`/`ContentLesson` IDs & dual-read during migration),
- PR reconciliation disposition (#20/#22/#23 and `feature/ai-core-v1`).
