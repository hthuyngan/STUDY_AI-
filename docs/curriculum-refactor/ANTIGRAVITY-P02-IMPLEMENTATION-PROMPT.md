# Antigravity Prompt — P02 Multi-Subject Curriculum Lifecycle

## PROMPT

Bạn là Senior Full-stack Implementation Agent cho STUDY_AI. Hãy triển khai **một integrated P02 phase** cho chapter/lesson lifecycle đa môn trên một feature branch/Draft PR, theo các workstream và commit checkpoint bên dưới. Không chia thành nhiều phase hạ tầng nhỏ và không mở rộng sang import/dataset/content-block/resource/question redesign.

### Required reading and baseline

Read completely before editing:

- `AGENTS.md` and its mandatory plan/prompt.
- `docs/architecture/ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md`.
- `docs/curriculum-refactor/NEXT-IMPLEMENTATION-PLAN.md`.
- `docs/curriculum-refactor/04-IMPLEMENTATION-PHASES.md`.
- `docs/curriculum-refactor/UI-UX-REDESIGN-PLAN.md`.
- `docs/curriculum-refactor/ANTIGRAVITY-UI-REDESIGN-PROMPT.md`.
- `docs/curriculum-refactor/P02-ACCEPTANCE-CRITERIA.md`.
- `.agents/skills/ui-ux/SKILL.md` and the references it routes to.

Baseline must be the final CI-green integration SHA after PR #24→#25→#26 is merged into `feature/backend-redesign-modular-monolith`. Do not start from `main` or from an unmerged stacked PR. Record the immutable baseline SHA.

### Non-negotiable scope

Implement real shared CRUD/lifecycle for:

`GradeLevel → CatalogSubject → Curriculum → CurriculumEdition → ContentChapter → ContentLesson`.

P01 catalog CRUD is already present. Reuse it. P02 owns edition-scoped chapter/lesson relationships, lifecycle, ordering, management workspace, and learner published-chain projection.

Do not:

- hardcode Math/Toán, grade 12, subject IDs, first-item defaults, lesson/video/content;
- add runtime mock/demo/sample/fallback data or seed an empty database;
- import any curriculum dataset or call AI to create filler;
- create a per-subject controller/service or new AI service;
- redesign versioned content blocks (P03), resources/video (P04), or assessment/question mapping (P05);
- require video; a lesson without video is valid;
- add a UI framework/table/editor package without an approved blocker;
- weaken/disable tests, swallow API errors, or show success before server confirmation;
- write/migrate/seed/cleanup/drop `StudyAIDb` or use static `StudyAIDb_E2E` for tests.

All write tests and migrations run on a per-run guarded `StudyAIDb_Clean_{GUID}` database and dispose through the accepted ENV-01 lifecycle.

### Preflight and targeted audit

1. `git status`, branch/upstream/HEAD, `git fetch --all --prune`; stop on local changes. Never reset/stash/overwrite.
2. Confirm baseline includes P00, P01 and ENV-01/ENV-02 and CI is green at that SHA.
3. Diff-first inspect only the files listed below and direct dependencies. Reconcile any new overlapping PR; do not blindly merge it.
4. Verify the exact current API/OpenAPI, migration head, P01 entity names and frontend primitives. Do not invent a second `Subject` entity: P01 uses `CatalogSubject` alongside legacy `ContentSubject` during transition.
5. Print a short pre-implementation summary: reuse, confirmed gaps, files, migration effect, disposable DB name strategy, tests.

## Workstream 1 — schema, contracts, lifecycle, and RBAC

### Scope

Extend existing chapter/lesson code rather than creating parallel modules.

Primary files to inspect/modify as needed:

- `backend/src/StudyAI.Api/Models/ContentEntities.cs`.
- `backend/src/StudyAI.Api/Data/{StudyAIDbContext.cs,IApplicationDbContext.cs}`.
- a new additive EF migration and model snapshot.
- `Features/Content/ContentChapters{Controller,Service,DTOs/IService}.cs`.
- `Features/Content/ContentLessons{Controller,Service,DTOs/IService}.cs`.
- P01 `ContentCatalog*` only for the minimum parent lifecycle transitions required by published-chain rules.
- existing audit, exception, authorization and row-version helpers.
- focused unit/integration tests.

### Database design

- Add nullable transitional `CurriculumEditionId` to existing chapters, with FK `Restrict/NO ACTION`.
- Add durable chapter `Code`; unique active `(CurriculumEditionId, Code)` for catalog-linked rows.
- Add durable lesson `Code`; unique active `(ChapterId, Code)` and `(ChapterId, Slug)`.
- Add `RowVersion` to chapters and lessons and require it for update/reorder/archive/workflow actions.
- Use canonical wire/persistence lifecycle: `draft`, `in-review`, `changes-requested`, `approved`, `published`, `archived`.
- New chapters/lessons start `draft`; no implicit publication.
- Preserve existing IDs, legacy `SubjectId`, progress, attempts, questions, revisions and API compatibility. Do not infer existing edition/code mapping from names. Legacy links may remain null and must be reported explicitly.
- Use archive-first retention. Hard delete is allowed only for an unreferenced draft under a reviewed rule; never cascade protected learner/history data.
- Add only measured indexes needed by edition/status/order/search queries.

Migration must be additive and safe on a restored production-shaped disposable clone. It must not contain seed, data import, guessed backfill, destructive delete, table rewrite unrelated to this slice, or production connection data.

### API contract

Reuse and extend current routes:

- `GET /api/v1/content/chapters?editionId=&status=&search=&sort=&direction=&page=&pageSize=`.
- `GET /api/v1/content/chapters/{id}`.
- `POST /api/v1/content/chapters`.
- `PUT/PATCH /api/v1/content/chapters/{id}`.
- explicit chapter transition endpoints and `POST /api/v1/content/chapters/reorder`.
- existing lesson list/detail/create/update routes extended with edition-aware filters and typed pagination.
- explicit lesson transition endpoints: submit review, request changes, approve, publish, unpublish/archive/reactivate as allowed by the state machine.
- `POST /api/v1/content/lessons/reorder` with exact scope and row versions.

Paged lists return a typed `{ items, total, page, pageSize }`. Sorting is allow-listed. Generic PATCH cannot set status. All parent IDs are validated, archived/unpublished ancestors block publication, codes/slugs are normalized by backend rules, and stale row versions return `409` without lost updates.

Create separate `approve` and `publish` behavior: approval produces `approved`; publication requires approved content and a publishable ancestor chain. Preserve the hyphenated status strings.

### RBAC and audit

- Unauthenticated: `401`.
- Student: published learner reads only; no management mutations.
- Teacher: published learner reads; no curriculum mutation unless an existing explicit permission policy says otherwise. UI hiding is not enforcement.
- Content author/creator: management read and own-draft authoring/submit within existing policy.
- Content reviewer/content admin/admin: transitions according to current role matrix.
- Enforce four-eyes review; author cannot approve/publish own lesson unless an owner-approved existing policy explicitly differs and has tests.
- Every mutation and transition is audited with actor from authenticated claims, before/after identifiers/status, reason, and correlation metadata without private content.
- Business mutation and audit persist atomically; forced audit failure rolls back the mutation.

### Workstream 1 tests and stop gate

Test migration up/down on disposable SQL, empty DB zero rows, constraints, duplicate code/slug, invalid parent, archived parent, status matrix, stale row version, concurrent reorder/update, transaction rollback, ownership, 401/403, and preserved legacy rows.

Stop if the migration needs guessed backfill, deletes/rewrites existing content, production schema differs from the rehearsed baseline, P01 contract must be broken, or a protected dependency cannot be retained.

Commit checkpoint: `feat(curriculum): add edition-scoped chapter and lesson lifecycle`.

## Workstream 2 — management workspace and lesson editor shell

### UI direction

Implement the already approved enterprise layout; do not ask for new wireframe selection:

- breadcrumb and compact header;
- filters for grade, subject, curriculum/edition/textbook series and status, all populated from real APIs;
- left lazy hierarchy tree, right server-driven chapter/lesson table;
- search, allow-listed sort, server pagination, result count and contextual bulk actions only when an atomic backend endpoint exists;
- short create/edit dialogs for chapter/simple metadata;
- dedicated lesson editor route for **Information**, **Objectives metadata currently supported**, and **Review & publish** in P02;
- expose current legacy content fields only without inventing a new generic block schema. Navigation shells for P03/P04/P05 must not pretend unavailable sections work;
- video/resources are optional and unchanged in P02.

Reuse semantic variables in `frontend/src/styles/tokens.css`, `ContentCatalogPage` query/parent-select patterns, and the existing `Management*` plus UI primitives. Consolidate needed pagination/sort/selection into the management table family; do not create a third generic table.

Style is neutral, flat and data-dense. No decorative gradients, glass, oversized shadows, KPI cards, emoji icons or unnecessary animation. Use existing brand roles rather than replacing the theme. Plain CSS only; Tailwind classes do not compile in this project.

### Frontend files

Inspect/modify narrowly:

- `frontend/src/routes/contentRoutes.tsx` and workspace navigation.
- current `ContentCurriculumPage`, `ContentChaptersPage`, `ContentLessonsPage`, and `ContentLessonEditorPage` plus CSS/tests.
- `frontend/src/services/education.service.ts`, or extract one narrow curriculum client only if it reduces the current mixed contract without duplicating `catalog.service.ts`.
- education/catalog types and existing management/UI primitives.

Remove affected-route runtime fallbacks such as `subjects[0]`, `math`, `Toán học 12`, fabricated author labels, client `.slice()` pagination, and `window.confirm`. Do not remove test fixtures from test files merely because they are mocks.

URL query parameters own edition/node/status/search/sort/direction/page/pageSize. Browser back/forward and refresh must restore the view. Keep old data visible while refetching where appropriate, with an explicit progress indicator; do not flash empty state.

Required states: first-load skeleton, empty curriculum, empty edition, filtered-empty with clear action, permission denied, API error with retry, stale `409` conflict, validation errors, and save/publish progress. No false success toast.

Responsive requirements:

- 1440/1280 desktop: tree and table fit with no toolbar wrap that hides actions.
- 1024/768: tree becomes a controlled panel/drawer when space is insufficient.
- 390/375: compact list rows, filter/tree drawers, 44px touch targets, no horizontal page scroll, all primary actions remain reachable.
- semantic table/sort buttons, `aria-sort`, labeled icon actions, visible keyboard focus, focus return after dialogs, one page `h1`.

### Workstream 2 tests and stop gate

Component tests cover real service mapping and loading/empty/filtered-empty/error/403/409/success. Playwright covers create/edit/reorder/submit/publish/archive, refresh persistence, API 500 no false success, and mobile.

Stop when a field/action has no approved API, bulk requires client loops, a new library is proposed without proof, or full P03–P05 editor scope is being implemented.

Commit checkpoint: `feat(content-ui): add curriculum workspace and lesson lifecycle editor`.

## Workstream 3 — learner published-chain projection

Extend the existing `StudentCurriculumService` and learner client/pages; do not create a parallel curriculum engine.

Required behavior:

- edition-aware navigation carries real GradeLevel, CatalogSubject, Curriculum, CurriculumEdition, Chapter and Lesson IDs;
- management-created lesson appears exactly once after publication and refresh;
- lesson is invisible if itself or any required ancestor is not published/active;
- archived/unpublished content cannot be newly selected; historical progress remains intact;
- missing mapping/content/video returns honest empty/unavailable state;
- remove `sub_math10`/Math string fallback from the new edition-aware path;
- retain legacy routes/adapters until P10, with tests proving no duplicate result;
- verify existing AI Tutor/adaptive calls receive explicit subject/edition/lesson context where the affected route already supplies context. Do not redesign AI/mastery or add a service.

Prefer additive edition-aware learner routes under the existing `/api/v1/curriculum` controller and preserve existing consumers. Document exact OpenAPI changes.

Tests cover multi-subject records, published-chain permutations, deep link/refresh, no duplicate lesson, draft leakage, empty catalog, legacy compatibility, and AI/adaptive regression without invented mastery.

Stop if draft data leaks, a legacy consumer must be deleted without proof, or the solution adds hardcoded subject logic.

Commit checkpoint: `feat(curriculum): expose edition-aware learner projection`.

## Workstream 4 — integrated verification

Run and report, using only disposable SQL:

1. Frontend frozen install if dependencies changed, lint, targeted tests, full tests, and build.
2. Backend restore/build, unit tests, and full integration suite twice on independent `StudyAIDb_Clean_{GUID}` databases.
3. Targeted Playwright with Admin, Content, Teacher and Student sessions:
   - create edition-linked chapter/lesson;
   - edit and reorder with refresh persistence;
   - status workflow and four-eyes review;
   - management publish → SQL → learner API/UI exactly once;
   - unpublished ancestor/draft hidden;
   - 401/403, validation, stale 409, API 500/no false success;
   - empty database/edition;
   - two-session concurrency;
   - desktop and 390px/375px.
4. Run the repository UI skill probe on affected routes at its required widths after implementation; inspect screenshots and fix measured issues. Do not install UI libraries into the project for the probe.
5. Verify both disposable databases are dropped only by their owning runs after process termination; retain cleanup artifacts on failure.
6. Inspect `git diff`, `git diff --check`, generated migration, bundle/runtime searches for mock/fallback/hardcoded subject data, and unrelated files.

No test may connect to `StudyAIDb` or `StudyAIDb_E2E`. Do not run migration rehearsal or cleanup.

Commit checkpoint: `test(curriculum): prove P02 lifecycle end to end`.

### Final deliverables

- Code and migration limited to P02.
- Updated OpenAPI/contracts and focused architecture/implementation report.
- Acceptance matrix mapped to `P02-ACCEPTANCE-CRITERIA.md` with commands, results, disposable DB names, CI run URL and application SHA.
- Desktop/mobile visual evidence with no private data.
- One Draft PR targeting the integrated feature branch; commits grouped by the workstreams above.

Before finishing, inspect the entire PR diff against baseline. Remove unrelated/generated junk, but do not rewrite or delete user work. Do not commit/push until tests in the current workstream pass; once complete, commit and push the P02 branch and create/update the Draft PR. Never merge, deploy, migrate `StudyAIDb`, retire a database, import data, or begin P03.
