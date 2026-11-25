# Antigravity Prompt — P01 Stable Catalog Foundations

## Authorization and objective

P00 passed its final move gate at commit `3c94769c53d6ce5cb4c9272bb940dc255a6e7e7f`. Implement **P01 only**: the stable multi-subject catalog foundation for:

- `GradeLevel`;
- generic `Subject`;
- `Curriculum`;
- `TextbookSeries`;
- `CurriculumEdition`.

Deliver one tested vertical slice spanning additive SQL schema, EF Core, backend CRUD/RBAC/audit, and the catalog-only frontend shell after the API contract is stable. Do not implement P02 chapter/lesson lifecycle, curriculum tree, lesson management, learner catalog, lesson editor, resources, questions, AI, import, or cleanup.

## 1. Mandatory preflight

Before changing code:

1. Run `git status`, identify branch/upstream, and inspect uncommitted work. Run `git fetch origin`. Fast-forward only when the working tree is clean. Never reset, stash, overwrite, merge, or delete another branch automatically.
2. Read `AGENTS.md` completely.
3. Read and follow:
   - `docs/curriculum-refactor/FINAL-P00-REVIEW-AND-P01-MOVE-GATE.md`;
   - `docs/curriculum-refactor/04-IMPLEMENTATION-PHASES.md`;
   - `docs/curriculum-refactor/06-ACCEPTANCE-CRITERIA.md`;
   - `docs/curriculum-refactor/02-ARCHITECTURE-PLAN.md`;
   - `docs/curriculum-refactor/UI-UX-REDESIGN-PLAN.md`;
   - `docs/curriculum-refactor/ANTIGRAVITY-UI-REDESIGN-PROMPT.md`;
   - `docs/architecture/ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md`;
   - `docs/plans/AI_TUTOR_MATH10_12_IMPLEMENTATION_PLAN.md`;
   - `docs/prompts/ANTIGRAVITY_MATH10_12_MASTER_PROMPT.md`.
4. Read `.agents/skills/ui-ux/SKILL.md` before frontend work and reuse the project's existing design tokens and Management primitives.
5. Inspect open PRs/branches that overlap catalog schema or Content CRUD, especially the reconciliation matrix and newer `feature/ai-core-v1`. Do not blindly merge or cherry-pick.
6. Inspect only directly related existing entities, EF configurations, migrations, DbContext registration, Content controllers/services/DTOs, authorization policies, audit service, frontend routes/services/components, and tests.
7. Confirm the test connection targets `StudyAIDb_E2E` or a disposable database and that `DatabaseSafetyGuard` fails closed. Do not print credentials.

Create a dedicated P01 branch/PR from the approved P00 baseline unless the owner explicitly directs otherwise. Do not merge PR #24 or any implementation PR automatically.

Before coding, report:

- current branch and commit;
- overlapping work found and reuse decision;
- existing tables/routes/services to extend;
- proposed P01-only schema and API contract;
- exact files expected to change;
- isolated database name/guard evidence;
- test plan and any `NEEDS VERIFICATION` item.

## 2. Hard scope boundary

### In scope

- additive schema and constraints for the five catalog entity types;
- EF entities/configurations/DbSets and one migration;
- compatibility mapping/read path for existing `ContentSubject` grade-specific identities;
- backend list/detail/create/update/archive CRUD;
- server-side pagination, search, filter, and allowlisted sort;
- validation, optimistic concurrency where existing conventions support it, audit records, and RBAC;
- catalog-only frontend list/filter/forms after backend contracts pass;
- loading, empty, error, forbidden, validation, conflict, and retry states;
- unit, integration, migration/rollback, frontend, and P01 Playwright tests;
- P01 implementation report, migration/backfill report, and rollback notes.

### Out of scope

- `ContentChapter`/`ContentLesson` lifecycle or foreign-key migration to editions beyond compatibility analysis;
- `CurriculumWorkspace`, curriculum tree, chapter/lesson tables, or lesson editor;
- lesson blocks, objectives, knowledge units, skills, resources/video, or questions;
- learner grade → subject → edition navigation;
- AI/adaptive changes;
- import execution, real curriculum/textbook ingestion, cleanup, seed, or production migration;
- deletion of legacy fields/routes/adapters;
- unrelated refactoring or a new UI library.

If P01 cannot be completed without changing a P02+ contract, stop and report `NEEDS VERIFICATION`; do not expand scope.

## 3. Required domain model

Follow existing naming/ID/timestamp conventions and the approved ADR. Do not introduce EAV or per-subject tables/controllers.

### GradeLevel

- stable ID;
- unique normalized `Code` such as `10`, `11`, `12`;
- `Name`, `OrderIndex`, canonical `Status`, timestamps and existing audit/concurrency fields where applicable;
- grade must be data, never parsed from subject code or label.

### Subject

- generic subject identity independent of grade;
- stable ID, unique normalized `Code`, `Name`, optional `Description`, canonical `Status`, timestamps/audit/concurrency fields;
- one subject may participate in multiple grades/curricula/editions;
- no `sub_math10`/`sub_math12` or Math default in new business logic.

### Curriculum

- stable ID and unique normalized `Code`;
- required `GradeLevelId` and `SubjectId` foreign keys;
- `Name`, `Framework`, academic year range, canonical `Status`, provenance fields required by the approved contract, timestamps/audit/concurrency fields;
- database-enforced active business key preventing duplicate grade + subject + framework/year definitions.

### TextbookSeries

- stable ID and unique normalized `Code`;
- `Name`, `Publisher`, optional `Description`, canonical `Status`;
- source/license/provenance fields approved for P01;
- timestamps/audit/concurrency fields.

### CurriculumEdition

- stable ID and unique normalized `Code`;
- required `CurriculumId`;
- optional `TextbookSeriesId` so a standards-only edition is valid;
- `EditionName`, optional volume/version, publication year, canonical `Status`;
- source/license/review metadata required by the approved contract;
- timestamps/audit/concurrency fields;
- database-enforced business uniqueness appropriate to curriculum + series + version/volume/year.

Use the canonical persisted/wire lifecycle exactly:

```text
draft -> in-review -> approved -> published -> archived
```

`changes-requested` remains a review outcome. Creation starts `draft`. Do not silently publish. P01 CRUD may expose only transitions already supported and approved; do not invent workflow behavior in the frontend.

## 4. Migration and compatibility rules

1. Audit the latest migration and actual model before creating a new migration. Do not duplicate an entity/table from another active branch.
2. Keep the migration additive and reversible. Preserve existing `ContentSubject`, `ContentChapter`, `ContentLesson`, IDs, history, and API behavior.
3. Add new tables/keys/indexes/constraints first. Do not drop or reinterpret legacy columns in P01.
4. Build a deterministic compatibility mapping from existing grade-specific `ContentSubject` rows to generic subject + grade + curriculum/edition candidates. Do not infer truth from a code when a stored grade/value exists; flag conflicts.
5. Do not automatically backfill protected production data. Backfill rehearsal is test/tool logic executed only on disposable SQL, with dry-run/count/key/conflict output.
6. New P01 writes use the new catalog identity. Existing consumers continue through a documented compatibility read until later phases.
7. Prove migration upgrade and rollback on a disposable database containing representative legacy rows. Verify unrelated row counts/checksums remain unchanged.
8. Produce a report containing before/after counts, unique-key conflicts, unmapped rows, duplicate candidates, FK results, and rollback result. Do not claim zero conflicts without query evidence.
9. `StudyAIDb` must never be migrated, written, seeded, reset, restored, truncated, or imported.

## 5. Backend API and architecture

Reuse current Clean Architecture patterns, API versioning, response envelopes, cancellation, validation, authorization, and audit mechanisms. Do not create one controller/service per school subject.

Provide catalog CRUD for the five entities using the existing route conventions. Logical capabilities are:

- list with bounded `page`, `pageSize`, `search`, entity-specific filters, `status`, allowlisted `sort`, and direction;
- detail by stable ID;
- create in `draft`;
- update with validation and concurrency semantics;
- archive/reactivate only if allowed by the canonical lifecycle and dependency rules;
- no hard delete for referenced catalog entities.

Contract requirements:

- return a consistent `{ items, total, page, pageSize }`-style envelope matching the repository's approved convention;
- never return full lesson/question bodies in catalog projections;
- validate normalized code uniqueness, required parents, academic/publication year ranges, status transitions, and provenance/license requirements;
- use database constraints as the final defense against duplicates/races;
- return correct `400`, `401`, `403`, `404`, `409`, and `500` semantics;
- mutation failures must not report success;
- record actor, target, action, prior/new state, timestamp, and reason without secrets/private content.

RBAC must be enforced by the backend:

- Admin and approved Content roles may perform the catalog mutations allowed by policy;
- Student and Teacher cannot mutate catalog entities even with direct HTTP calls;
- unauthenticated calls return `401`; authenticated unauthorized calls return `403`;
- do not rely on hidden frontend controls.

If the exact Content-role transition matrix is absent or contradictory, mark it `NEEDS VERIFICATION` before implementing that transition. Do not broaden permission by assumption.

## 6. Frontend catalog shell

Begin frontend work only after backend contract/integration tests are stable.

Build a restrained enterprise catalog shell for the five P01 entities only:

- compact breadcrumb/header with one primary create action;
- tabs or navigation between Grades, Subjects, Curricula, Textbook Series, and Editions;
- server-driven data table with search, relevant filters, allowlisted sorting, result total, bounded pagination, and page size;
- short create/edit modal or drawer using real API data;
- explicit loading, real empty, error/retry, forbidden, validation, conflict, and success states;
- URL-backed search/filter/sort/page state where consistent with existing routing;
- responsive behavior at desktop, tablet, and 390px;
- visible focus, semantic labels, accessible sort controls, dialog focus trap/restore, and 44px mobile touch targets.

Reuse:

- `frontend/src/styles/tokens.css`;
- `ManagementLayout`, `ManagementHeader`, `ManagementTable`, `ManagementPagination`, `ManagementFilter`;
- `Button`, `IconButton`, `Breadcrumb`, `ConfirmDialog`;
- `EmptyState`, `PageErrorState`, `Skeleton`, `StatusBadge`;
- existing form/modal primitives after checking their current usage.

Do not:

- add a UI/table/editor library;
- add gradient, glassmorphism, decorative KPI/stat cards, unnecessary shadow/animation, or subject-specific page colors;
- create a third generic table family;
- use mock data, static option arrays for business catalog values, fake APIs, localStorage authority, placeholder counts, or hardcoded subject/grade IDs;
- implement the P02 split `CurriculumWorkspace`, curriculum tree, chapter/lesson management, bulk lesson actions, or lesson editor;
- fetch all rows and slice client-side to imitate server pagination.

## 7. Required tests and evidence

All write tests must target `StudyAIDb_E2E` or a disposable guarded SQL Server database.

### Backend unit tests

- normalization and validation for each entity;
- academic/publication year validation;
- canonical status/default `draft` behavior;
- sort allowlist and page bounds;
- RBAC policy decisions;
- compatibility mapping, conflict, and unmapped cases.

### Backend integration tests

- migration upgrade and rollback on disposable SQL;
- empty database remains empty until explicit test CRUD;
- CRUD/read-back/archive for all five entities;
- unique code and composite business-key conflicts;
- required/optional FK behavior, including edition without textbook series;
- pagination/search/filter/sort and total correctness;
- `401`, role-specific `403`, `404`, validation `400`, concurrency/duplicate `409`, and failure rollback;
- audit record creation;
- Math, History, and Biology test fixtures coexist across grades/editions without subject hardcoding;
- compatibility reads preserve existing IDs and do not duplicate records;
- database guard rejects `StudyAIDb` and seed/import flags remain fail-closed.

### Frontend unit/component tests

- loading, empty, error/retry, forbidden, populated and pagination states;
- server query mapping and API total;
- create/edit/archive success only after server success;
- validation and `409` conflict preserve user input;
- no mock fallback or fabricated row when API fails;
- URL state and accessible keyboard/dialog/sort behavior.

### Playwright against isolated SQL

- Admin/Content happy CRUD and refresh persistence;
- Student/Teacher mutation `403` and unauthenticated `401`;
- empty catalog with no sample rows;
- search/filter/sort/server pagination;
- API/network failure with no false success;
- duplicate/concurrency conflict;
- Math/History/Biology catalog coexistence;
- 1440px desktop and 390px mobile visual/functional coverage.

Store sanitized logs and screenshot/report artifact paths. Mask only nondeterministic IDs/timestamps. Do not use `page.route().fulfill()` as evidence for FE → API → backend → SQL persistence; mocked routes are allowed only in isolated frontend tests.

Run the repository gates and report actual results:

```text
cd frontend
bun install --frozen-lockfile
bun run lint
bun run test
bun run build

cd ../backend
dotnet restore StudyAI.sln
dotnet build StudyAI.sln
dotnet test StudyAI.sln
```

Before `dotnet test`, prove the connection target and safety guard without logging credentials. If any gate cannot run, report `NOT RUN` with the exact blocker. Never disable, delete, loosen, or skip tests to make them pass.

## 8. Completion and P02 stop gate

Before finishing:

1. Run `git diff --check`.
2. Inspect `git status`, `git diff --stat`, and the complete diff.
3. Confirm only P01 files changed and no P02+ behavior entered the diff.
4. Search changed production code for `mock`, `demo`, `sample`, `fallback`, `sub_math`, `math12`, static catalog arrays, fake API, seed/import, and review every match.
5. Verify no production data, credential, dump, generated dataset, or unrelated file is present.
6. Verify the migration is additive/reversible and the target database guard is fail-closed.
7. Create/update a P01 report with schema/API decisions, migration/backfill counts, compatibility behavior, RBAC matrix, commands/results, Playwright artifacts, risks, and rollback.

P01 is complete only when:

- all five catalog entity types persist through real API and isolated SQL;
- server pagination/search/filter/sort and frontend states work end-to-end;
- RBAC/audit/validation/uniqueness/concurrency tests pass;
- empty catalog shows no fabricated data;
- migration upgrade/rollback and count/key/backfill report are approved;
- no duplicate catalog controller/service or Math-specific default remains in the P01 path;
- all required gates have evidence.

Stop after P01. Do not begin P02 `CurriculumWorkspace`, chapter/lesson lifecycle, or learner projection. Do not commit or push unless the owner explicitly authorizes it for the implementation run; never merge automatically.

## 9. Required final response

Return:

1. P01 scope completed and exact branch/commit;
2. reused versus new architecture/components;
3. schema, constraints, migration, compatibility and rollback summary;
4. backend routes/contracts and RBAC matrix;
5. frontend catalog states and responsive evidence;
6. exact tests with PASS/FAIL/NOT RUN and artifact paths;
7. database target/guard proof and confirmation that `StudyAIDb` was untouched;
8. diff audit, remaining risks, `NEEDS VERIFICATION` items, and P02 move-gate blockers;
9. PR URL only if explicitly authorized and actually created.
