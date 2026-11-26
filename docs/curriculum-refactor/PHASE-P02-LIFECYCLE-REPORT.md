# Phase P02 — Multi-Subject Curriculum Lifecycle Report

- **Date:** 2026-11-25
- **Branch:** `feature/p02-multi-subject-curriculum-lifecycle`
- **Base SHA:** `f109952ffd4141ec3c0855185fb7caa4c3ad3072` (`feature/backend-redesign-modular-monolith`)
- **Database Policy:** All migrations, integration tests, and Playwright runs executed exclusively on per-run guarded `StudyAIDb_Clean_{GUID}` databases. `StudyAIDb` and `StudyAIDb_E2E` were never modified.

---

## Workstream Commits

1. **W1 (`a3d763cb`):** `feat(curriculum): add edition-scoped chapter and lesson lifecycle`
   - Additive migration `20261125134024_AddCurriculumLifecycleChaptersLessons` (nullable transitional `SubjectId`, `CurriculumEditionId` with `Restrict` FK, durable `Code`, SQL `RowVersion`, filtered unique `(CurriculumEditionId, Code)` and `(ChapterId, Code)`).
   - Full canonical lifecycle (`draft → in-review → changes-requested → approved → published → archived`) + `unpublish` & `reactivate` + `RowVersion` 409 + atomic `StaffAuditLog` + four-eyes RBAC + reorder concurrency.
2. **W2 (`8f4bdcef`):** `feat(content-ui): add curriculum workspace and lesson lifecycle editor`
   - Enterprise `CurriculumWorkspacePage` reusing `Breadcrumb`, `Button`, `StatusBadge`, `ConfirmDialog`, `Skeleton`, `PageErrorState`, URL-backed catalog filters (`gradeId`, `subjectId`, `curriculumId`, `seriesId`, `editionId`, `status`, `q`, `sort`, `dir`, `page`), server-driven pagination, and responsive tree/table/mobile layout.
3. **W3 (`c1f64a25`):** `feat(curriculum): expose edition-aware learner projection`
   - Edition-aware learner projection (`GET /api/v1/curriculum/editions/{editionId}/chapters`) enforcing full published ancestor chain (`Curriculum` → `CurriculumEdition` → `ContentChapter` → `ContentLesson`), exact-once visibility, optional video, zero `sub_math10` fallback on edition-aware paths, and legacy route compatibility.
4. **W4 (this commit):** `test(curriculum): prove P02 lifecycle end to end`
   - Full lifecycle, stale `RowVersion` 409, four-eyes RBAC, atomic audit rollback, and Playwright E2E acceptance evidence.

---

## Acceptance Matrix Summary (`P02-ACCEPTANCE-CRITERIA.md`)

| Criteria Group | Status | Evidence |
|---|---|---|
| **AC-P02-ENTRY-01..04** | **PASS** | Integrated baseline `f109952ffd4141ec3c0855185fb7caa4c3ad3072` (CI `45607823423` PASS); deferred legacy backfill; ENV-01/02 guards active. |
| **AC-P02-DB-01..08** | **PASS** | `20261125134024_AddCurriculumLifecycleChaptersLessons` (`Up`/`Down`), `Restrict` FK, `RowVersion`, filtered unique indexes, empty DB stays empty. |
| **AC-P02-API-01..11** | **PASS** | Reused `ContentChapters*`/`ContentLessons*`; server pagination/sort/filter; canonical lifecycle + `unpublish`/`reactivate`; `RowVersion` 409; atomic audit rollback (`CurriculumLifecycleIntegrationTests`). |
| **AC-P02-RBAC-01..06 & CONC-01..02** | **PASS** | 401 anonymous, 403 Student/Teacher, four-eyes self-approval/request-changes blocked, 409 stale update/transition/reorder. |
| **AC-P02-UI-01..12** | **PASS** | `CurriculumWorkspacePage.test.tsx`, `oxlint` (0 warnings/errors, 501 files), `vitest` full pass, `vite build` pass, desktop 1440px & mobile 390px/375px Playwright pass. |
| **AC-P02-E2E-01..08** | **PASS** | `CurriculumLifecycleIntegrationTests` + `e2e_p02_curriculum_workspace_playwright.ts` + `e2e_catalog_p01_playwright.ts` (7/7 + Scenario 0 PASS). |
| **AC-P02-TEST-01..07** | **PASS** | Backend unit **295/295 PASS**; full `StudyAI.IntegrationTests` **268/268 PASS twice** on independent disposable DBs (`2m 10s`, `1m 50s`); zero leftover run-owned DBs. |

---

## P02 Remediation Findings Closure Matrix (`P02-FINAL-REVIEW.md`)

| Finding ID | Root cause | Fix commit | Regression test | Evidence | Status |
|---|---|---|---|---|---|
| **P02-F01** | Lesson Editor lacked `rowVersion` tracking and exposed invalid/incomplete canonical lifecycle buttons | `2cecbc36` | `ContentLessonEditorPage.test.tsx` + `e2e_p02_curriculum_workspace_playwright.ts` | `rowVersion` sent/refreshed on save & transitions; `Xuất bản bài học` hidden on `draft`; form preserved on 409/error | **CLOSED** |
| **P02-F02** | Learner UI (`/subjects`) lacked edition-aware projection and filtered subjects with `/toán\|math/i` + hardcoded Toán pills | `2cecbc36` | `SubjectCurriculum.test.tsx` + `e2e_p02_curriculum_workspace_playwright.ts` | `GET /api/v1/curriculum/editions` + `/subjects/edition/:editionId` routes; multi-subject editions rendered without Toán-only filter | **CLOSED** |
| **P02-F03** | Dual-linked chapters/lessons could bypass unpublished canonical ancestors, and canonical questions/check-answer required legacy `SubjectId` | `8b7c6c5c` | `CurriculumLifecycleIntegrationTests` (`F03_DualLinked_CannotBypassUnpublishedAncestor_And_CanonicalQuestionsWorkWithoutLegacySubject`) | Centralized `IsChapterVisibleToLearner` / `IsLessonVisibleToLearner` across all learner endpoints; canonical practice verified | **CLOSED** |
| **P02-F04** | Filtered unique `(ChapterId, Slug)` index missing, SQL 2601/2627 surfaced as 500, and migration `Down()` risked dropping `SubjectId` with `NULL` rows | `8b7c6c5c` | `CurriculumLifecycleIntegrationTests` (`F04_ConcurrentDuplicateSlug_Returns409_And_F05_ArchiveFirstRetention_Enforced`) | Filtered `IX_content_lessons_ChapterId_Slug` (`[Status] <> 'archived'`), 409 `ConflictException`, fail-closed `Down()` `THROW 50001` | **CLOSED** |
| **P02-F05** | `DeleteLessonAsync` allowed hard-delete without checking all dependent/historical tables and non-draft status | `8b7c6c5c` | `CurriculumLifecycleIntegrationTests` (`F04_ConcurrentDuplicateSlug_Returns409_And_F05_ArchiveFirstRetention_Enforced`) | Hard delete restricted strictly to `draft` with zero rows across all 9 dependent tables; archive-first enforced otherwise | **CLOSED** |
| **P02-F06** | Lesson/chapter reorder operated on current page only, chapter reorder buttons missing, `pageSize` hardcoded, and `updateParams` used `replace: true` | `01f79669` | `CurriculumWorkspacePage.test.tsx` + `e2e_p02_curriculum_workspace_playwright.ts` | Full-scope `moveLesson` / `moveChapter` across pages & filters; URL-backed `pageSize`; navigable history (`replace: false`) | **CLOSED** |
| **P02-F07** | Catalog cascade errors swallowed as `[]`, custom pagination duplicated `ManagementPagination`, mobile/tablet touch-target/CI Playwright evidence incomplete | `01f79669` + W4 | `CurriculumWorkspacePage.test.tsx` + `e2e_p02_curriculum_workspace_playwright.ts` + `.github/workflows/ci.yml` | Catalog errors surfaced via `PageErrorState`; `ManagementPagination` reused; `>=44px` touch targets & zero overflow at 1440/1280/1024/768/390/375px; CI `playwright-e2e` job added | **CLOSED** |
