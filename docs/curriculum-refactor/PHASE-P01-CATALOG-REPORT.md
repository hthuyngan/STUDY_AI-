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
  - Existing Frontend primitives: `tokens.css`, `ManagementHeader`, `ManagementFilter`, `ManagementTable`, `ManagementPagination`, `ManagementDialog`, `ManagementEmptyState`, `ManagementErrorState`, `Breadcrumb`, `Button`, `ConfirmDialog`, `Skeleton`, `StatusBadge`.
- **New (P01-only, no per-subject CRUD):**
  - `backend/src/StudyAI.Api/Models/CatalogEntities.cs`
  - `backend/src/StudyAI.Api/Migrations/*_AddMultiSubjectCatalogFoundations.cs`
  - `backend/src/StudyAI.Api/Features/Content/{ContentCatalogDTOs.cs, IContentCatalogService.cs, ContentCatalogService.cs, ContentCatalogController.cs}`
  - `frontend/src/types/catalog.ts`, `frontend/src/services/catalog.service.ts`
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
  - Legacy `ContentSubject` row (`sub_legacy_keep`) preserved across upgrade -> rollback (`20261124164959_AddUserNotesAndBookmarksTables`) -> re-upgrade.
  - Empty upgraded DB has `0` rows in all 5 new catalog tables (zero sample seeding).
  - Read-only compatibility mapping endpoint `GET /api/v1/content/catalog/compatibility-mapping` reports `LegacySubjectCount`, `MappedCount`, `UnmappedCount`, `ConflictCount`, and per-row candidates without mutating `StudyAIDb` or legacy rows.
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
| Backend Build | `dotnet build StudyAI.sln` | **PASS** (0 warnings, 0 errors) |
| Backend Unit Tests | `dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj` | **PASS (274/274)** (includes 5 new `ContentCatalogServiceUnitTests` + updated `ControllerRouteDiscoveryTests`) |
| Backend Integration Tests | `dotnet test tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj` | **PASS (233/233)** (includes 3 new `ContentCatalogIntegrationTests` on `StudyAIDb_E2E` & `StudyAIDb_Clean_{Guid}`) |
| Frontend Lint | `bun run lint` (`oxlint --deny-warnings`) | **PASS** (0 warnings, 0 errors, 496 files) |
| Frontend Unit Tests | `bun run test` (`vitest run`) | **PASS (85 files, 573/573 tests)** (includes 4 new `ContentCatalogPage.test.tsx` tests) |
| Frontend Build | `bun run build` (`tsc -b && vite build`) | **PASS** |
| Playwright E2E (Live API + `StudyAIDb_E2E`) | `bun scripts/e2e_catalog_p01_playwright.ts` | **PASS (4/4)** — 401/403, multi-subject CRUD + refresh persistence, 409 conflict, 1440px & 390px screenshots |

- **Visual Artifacts:**
  - `docs/visual-qa/catalog-p01/01_desktop_1440.png`
  - `docs/visual-qa/catalog-p01/02_mobile_390.png`
- **Database Safety:** `StudyAIDb` was never written, migrated, seeded, or modified.

---

## 5. Remaining Risks & P02 Move Gate

- **Note:** `frontend/src/components/layout/workspaceNavigation.ts` was not modified (file permission lock on local disk); `/content/catalog` route is live in `contentRoutes.tsx` and verified end-to-end. Adding the sidebar link can be done in P02 or when file permissions allow.
- **Stop Gate:** P01 stops here for Codex review. Do not start P02 (`CurriculumWorkspace`, chapters/lessons lifecycle) until P01 is approved.
