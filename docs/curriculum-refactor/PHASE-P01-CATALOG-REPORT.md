# Phase P01 Report — Stable Catalog Foundations

- **Date:** 2026-11-25
- **Branch:** `feature/multi-subject-catalog-p01`
- **Base Commit (Approved P00 Baseline):** `bc969b56ca75bff7acc3b1777cadc69543c21a89` (`feature/multi-subject-curriculum-refactor`)
- **Scope:** Additive multi-subject catalog schema, migration, backend CRUD/RBAC/audit/compatibility-mapping, and catalog-only frontend shell for `GradeLevel`, `CatalogSubject`, `Curriculum`, `TextbookSeries`, and `CurriculumEdition`.

---

## 1. Reused vs. New Architecture

- **Reused:**
  - Existing `ContentSubject` (`content_subjects`), `ContentChapter`, `ContentLesson` tables and `/api/v1/content/subjects` compatibility routes preserved untouched.
  - Existing `IAuditWriter` (`StaffAuditLogs`), `IClock`, `ConflictException`, `ValidationException`, `NotFoundException`, `DatabaseSafetyGuard`.
  - Existing Authorization Policies in `Program.cs`: `ContentAuthor` (read) and `ContentAdminOnly` (write/archive/reactivate).
  - Existing Frontend primitives: `tokens.css`, `WorkspaceShell`, `ManagementFilter`, `ManagementTable`, `ManagementPagination`, `ManagementDialog`, `ManagementEmptyState`, `ManagementErrorState`, `Breadcrumb`, `Button`, `ConfirmDialog`, `Skeleton`, `StatusBadge`.
- **New / Updated (P01-only, no per-subject CRUD):**
  - `backend/src/StudyAI.Api/Models/CatalogEntities.cs`
  - `backend/src/StudyAI.Api/Migrations/*_AddMultiSubjectCatalogFoundations.cs`
  - `backend/src/StudyAI.Api/Features/Content/{ContentCatalogDTOs.cs, IContentCatalogService.cs, ContentCatalogService.cs, ContentCatalogController.cs}`
  - `frontend/src/types/catalog.ts`, `frontend/src/services/catalog.service.ts`
  - `frontend/src/components/layout/workspaceNavigation.ts` (`/content/catalog` sidebar entry)
  - `frontend/src/pages/Content/components/CatalogParentSelect.tsx` (server-side search & pagination for parent selection beyond 100 rows)
  - `frontend/src/pages/Content/{ContentCatalogPage.tsx, ContentCatalogPage.css, ContentCatalogPage.test.tsx}`
  - `scripts/e2e_catalog_p01_playwright.ts`

---

## 2. Schema, Constraints, Migration & Rollback

### 2.1 Additive Tables (`AddMultiSubjectCatalogFoundations`)
1. `grade_levels` (`GradeLevel`): `Id`, unique `Code`, `Name`, `OrderIndex`, `Status` (default `"draft"`), `RowVersion` (rowversion).
2. `catalog_subjects` (`CatalogSubject`): `Id`, unique `Code`, `Name`, `Description`, `Status` (default `"draft"`), `RowVersion`.
3. `curricula` (`Curriculum`): `Id`, unique `Code`, `GradeLevelId` (FK `Restrict`), `SubjectId` (FK `Restrict`), `Name`, `Framework`, `AcademicYearFrom`, `AcademicYearTo`, `Status`, `SourceName/Url/License`, `RowVersion`, filtered unique index on `(GradeLevelId, SubjectId, Framework, AcademicYearFrom, AcademicYearTo)` where `[Status] <> 'archived'`.
4. `textbook_series` (`TextbookSeries`): `Id`, unique `Code`, `Name`, `Publisher`, `Description`, `Status`, `SourceName/Url/License`, `RowVersion`.
5. `curriculum_editions` (`CurriculumEdition`): `Id`, unique `Code`, `CurriculumId` (FK `Restrict`), nullable `TextbookSeriesId` (FK `Restrict` — allows standards-only editions), `EditionName`, `Volume`, `Version`, `PublicationYear`, `Status`, `SourceName/Url/License`, `ReviewedBy`, `ReviewedAt`, `RowVersion`, filtered unique index on `(CurriculumId, TextbookSeriesId, Version, Volume, PublicationYear)` where `[Status] <> 'archived'`.

### 2.2 Migration, Compatibility & Rollback Rehearsal
- Verified on disposable `StudyAIDb_Clean_{Guid}` in `ContentCatalogIntegrationTests.Catalog_MigrationUpgradeAndRollback_OnDisposableDb_PreservesLegacyRows`:
  - **Before/after counts:** Legacy `ContentSubject` row (`sub_legacy_keep`) count is `1` before upgrade, `1` after upgrade to `AddMultiSubjectCatalogFoundations`, `1` after rollback to `20261124164959_AddUserNotesAndBookmarksTables`, and `1` after re-upgrade.
  - **Zero sample seeding:** Empty upgraded DB has `0` rows in all 5 new catalog tables (`grade_levels`, `catalog_subjects`, `curricula`, `textbook_series`, `curriculum_editions`).
  - **Unique-key, FK & compatibility validation (`StudyAIDb_E2E`):**
    - Read-only `GET /api/v1/content/catalog/compatibility-mapping` reports `LegacySubjectCount`, `MappedCount`, `UnmappedCount`, `ConflictCount`, and per-row candidates (`Mapped`/`Unmapped`/`Conflict`) without mutating `StudyAIDb` or legacy rows.
    - Filtered unique indexes & FK `Restrict` constraints verified via `409 Conflict` on duplicate codes, active-child archive blocks, and stale `RowVersion` tokens across all 5 entities.
    - Atomic transaction rollback verified via `Catalog_ForcedAuditFailure_RollsBackBusinessMutation` (forced `IAuditWriter` failure rolls back the catalog mutation).
- **Rollback:** `dotnet ef database update 20261124164959_AddUserNotesAndBookmarksTables` drops only the 5 new P01 tables cleanly without touching legacy tables.

---

## 3. API Routes & RBAC Matrix

Base route: `/api/v1/content/catalog` (`ContentCatalogController`)

| Resource | Endpoints | Read Policy | Write/Archive/Reactivate Policy |
|---|---|---|---|
| GradeLevels | `GET /grades`, `GET /grades/{id}`, `POST /grades`, `PUT/PATCH /grades/{id}`, `POST /grades/{id}/archive`, `POST /grades/{id}/reactivate` | `ContentAuthor` | `ContentAdminOnly` |
| Subjects | `GET /subjects`, `GET /subjects/{id}`, `POST /subjects`, `PUT/PATCH /subjects/{id}`, `POST /subjects/{id}/archive`, `POST /subjects/{id}/reactivate` | `ContentAuthor` | `ContentAdminOnly` |
| Curricula | `GET /curricula`, `GET /curricula/{id}`, `POST /curricula`, `PUT/PATCH /curricula/{id}`, `POST /curricula/{id}/archive`, `POST /curricula/{id}/reactivate` | `ContentAuthor` | `ContentAdminOnly` |
| TextbookSeries | `GET /textbook-series`, `GET /textbook-series/{id}`, `POST /textbook-series`, `PUT/PATCH /textbook-series/{id}`, `POST /textbook-series/{id}/archive`, `POST /textbook-series/{id}/reactivate` | `ContentAuthor` | `ContentAdminOnly` |
| Editions | `GET /editions`, `GET /editions/{id}`, `POST /editions`, `PUT/PATCH /editions/{id}`, `POST /editions/{id}/archive`, `POST /editions/{id}/reactivate` | `ContentAuthor` | `ContentAdminOnly` |
| Compatibility | `GET /compatibility-mapping` | `ContentAuthor` | Read-only |

- Unauthenticated -> `401 Unauthorized`; Student/Teacher -> `403 Forbidden`; `author` (`ContentAuthor` only) -> `200` on GET, `403` on mutations.
- All creations start in `"draft"`; updates enforce `RowVersion` (`409 Conflict` on stale token); archive blocks when active child entities exist (`409 Conflict`).

---

## 4. Test & Visual Evidence

| Gate | Command | Result |
|---|---|---|
| Backend Build | `dotnet build StudyAI.sln --no-restore` | **PASS** (0 errors; 2 pre-existing `xUnit2012` warnings in `LearnerNotesAndBookmarksIntegrationTests.cs`) |
| Backend Unit Tests | `dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj --no-build` | **PASS (274/274)** |
| Backend Integration Tests | `dotnet test tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj --no-build` | **PASS (236/236)** (on `StudyAIDb_E2E` & `StudyAIDb_Clean_{Guid}`; includes forced audit rollback, `RowVersion` archive/reactivate across all 5 entities, explicit year-clearing PATCH, RBAC, and migration/rollback) |
| Frontend Lint | `bun run lint` (`oxlint --deny-warnings`) | **PASS** (0 warnings, 0 errors, 497 files) |
| Frontend Unit Tests | `bun run test` (`vitest run`) | **PASS (85 files, 574/574 tests)** (includes `ContentCatalogPage.test.tsx` with server-paginated parent search beyond 100 records) |
| Frontend Build | `bun run build` (`tsc -b && vite build`) | **PASS** |
| Playwright E2E (Live API + `StudyAIDb_E2E`) | `bun scripts/e2e_catalog_p01_playwright.ts` | **PASS (7/7)** — 401/403, Admin Math/History/Biology CRUD + empty state + `/content/catalog` nav link + refresh persistence (1440px), duplicate & stale `RowVersion` 409, Content role CRUD, server pagination/sorting, API 500 no false success, mobile 390px layout & 44px targets (`overlap: false`, `scrollWidth: 390`) |

- **Visual Artifacts:**
  - `docs/visual-qa/catalog-p01/01_desktop_1440.png`
  - `docs/visual-qa/catalog-p01/02_mobile_390.png`
- **Database Safety:** `StudyAIDb` was never written, migrated, seeded, or modified.

---

## 5. Remaining Risks & P02 Move Gate

- **Stop Gate:** P01 stops here for Codex review. Do not start P02 (`CurriculumWorkspace`, chapters/lessons lifecycle) until P01 is approved.
