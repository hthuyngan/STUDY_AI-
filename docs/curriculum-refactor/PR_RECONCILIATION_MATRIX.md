# PR Reconciliation Matrix & Official-Data Fallback Inventory (Phase P00)

Date: 2026-11-25  
Branch: `feature/multi-subject-curriculum-refactor` (branched from `feature/backend-redesign-modular-monolith` @ `49407bb2035e64da096521fb6c63648fdd139b92`)

---

## 1. Branch & Open PR Reconciliation Matrix

| Source | Status / Ancestry | Disposition | Rationale & Reuse Mapping |
|---|---|---|---|
| `origin/feature/ai-core-v1` (`9b610795`) | **Ancestor of HEAD** (`git merge-base --is-ancestor` = 0) | **Already Integrated** | Core AI tutor, adaptive learning, and content approval stabilization are already present in `feature/backend-redesign-modular-monolith`. No merge needed. |
| PR #20 (`antigravity/post-l02-zero-mock-remediation`) | **Ancestor of HEAD** (`git merge-base --is-ancestor` = 0) | **Already Integrated** | Zero-mock remediation, `DatabaseSafetyGuard` hardening, and E2E verification fixes are already in HEAD. |
| PR #22 (`audit/fullstack-quality-plan-20261123`) | **Open Draft (docs-only)** | **Reconciled / Absorbed** | Fullstack quality findings (zero-mock, API error handling, RBAC, empty states) are absorbed into `docs/curriculum-refactor/` phases P00–P10. |
| PR #23 (`audit/math-only-cleanup-plan-20261123`) | **Open Draft (docs-only)** | **Superseded in Direction / Safety Rules Reused** | Math-only scope is superseded by `ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md`. Its strict DB guard, read-only dependency inventory, and dry-run/rehearsal safety rules are reused in `03-DATABASE-CLEANUP-PLAN.md` and P09. |
| Local uncommitted remediation (snapshotted at `faa4d932`) | **Committed as baseline on implementation branch** | **Reused as Baseline** | Opt-in `Database:SeedReferenceData` guard in `Program.cs`, lesson/video governance fixes, and editor/player updates preserved cleanly. |

---

## 2. Official-Data Fallback & Demo Seeding Inventory (P00)

| Location | Current Behavior | P00 Action | Remaining Phase Action |
|---|---|---|---|
| `backend/src/StudyAI.Api/Data/DbInitializer.cs` (`SeedReferenceDataAsync`) | Contains hardcoded `sub_math10`, `sub_math11`, `sub_math12`, chapters, lessons, and published questions in runtime API assembly | **Moved to `StudyAI.IntegrationTests/Fixtures/SampleCurriculumFixtureSeeder.cs`**; `DbInitializer` retains only user/identity bootstrap (`BootstrapAdminAsync`, `BootstrapLearnerAsync`, `BootstrapStaffAsync`, `EnsureSystemAuthorAsync`) | None (P00 complete) |
| `backend/src/StudyAI.Api/Program.cs` (`Database:SeedReferenceData`) | Calls `DbInitializer.SeedReferenceDataAsync(db)` when config flag is true | **Removed sample curriculum seeding from runtime `Program.cs`**; if `Database:SeedReferenceData` is true, logs/throws fail-closed notice that sample seeding is test-fixture only | None (P00 complete) |
| `frontend/src/repositories/curriculum.repository.ts` | Exports `MockCurriculumAdapter` and instantiates `curriculumRepository = new MockCurriculumAdapter()` backed by `MASTER_CURRICULUM_SUBJECTS` | **Removed runtime `curriculumRepository` / `MockCurriculumAdapter` instantiation from production repository**; moved `MockCurriculumAdapter` to `frontend/src/test/fixtures/curriculum.mock.ts` | P10 removes dead `curriculum.data.ts` if no test fixtures remain |
| `frontend/src/repositories/questionBank.repository.ts` | Falls back to `mockQuestions` ONLY when `process.env?.NODE_ENV === 'test' && !getAccessToken()`; throws on API error otherwise | **Verified fail-closed in production**; documented in inventory | P05/P10 migrates test fixtures out of `src/data/` |
| `frontend/src/repositories/learningProgress.repository.ts`, `assessmentAttempt.repository.ts`, `learningEvents.repository.ts` | LocalStorage cache + sync queue alongside `/api/v1/me/*` remote endpoints | **Inventoried**; no curriculum/grade seeding | P06/P10 ensures local cache is never treated as authoritative server truth |
| `backend/src/StudyAI.Api/Features/AI/AiHintService.cs` (`FakeLlmProvider` / Math 12 fallback) | Constructs `FakeLlmProvider` / Math 12 fallback text when provider is absent | **Inventoried (out of P00 schema/AI scope)** | **P07** removes runtime fake provider & Math-only fallback |
| `frontend/src/pages/Lesson/LessonPage.tsx` (`assessment-fallback` / `"Toán học"` fallback) | UI fallback scaffolding when assessment/subject metadata is absent | **Inventoried** | **P05/P06** replaces with explicit empty/nullable state |
