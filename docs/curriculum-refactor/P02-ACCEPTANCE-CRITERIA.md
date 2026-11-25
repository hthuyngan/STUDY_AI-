# P02 Acceptance Criteria — Multi-Subject Chapter and Lesson Lifecycle

**Phase boundary:** P02 covers edition-scoped chapters/lessons, workflow, management workspace, and learner published-chain projection. It does not import datasets or implement P03 content blocks, P04 generalized resources, P05 question mapping, or P07 AI/adaptive redesign.

## 1. Entry gates

- **AC-P02-ENTRY-01:** PR #24, #25 and #26 are merge-committed in order into `feature/backend-redesign-modular-monolith`; final target CI is green at one recorded release SHA.
- **AC-P02-ENTRY-02:** Owner records the P01 compatibility-mapping decision. No name-based automatic legacy backfill is pending.
- **AC-P02-ENTRY-03:** Baseline contains accepted database guards and disposable test lifecycle. Test connection to `StudyAIDb` or static `StudyAIDb_E2E` fails closed.
- **AC-P02-ENTRY-04:** `StudyAIDb` deployment readiness is tracked separately. P02 development does not require or authorize a production migration.

## 2. Schema and migration

- **AC-P02-DB-01:** Existing content IDs and protected learner/history rows survive migration up/down rehearsal on production-shaped disposable SQL.
- **AC-P02-DB-02:** Chapter can reference a real `CurriculumEdition`; new catalog-linked chapter creation requires it. Legacy null mapping is explicit and never guessed.
- **AC-P02-DB-03:** Chapter and lesson have durable codes with normalized, scoped uniqueness. Lesson slug is unique within chapter.
- **AC-P02-DB-04:** Chapter and lesson have SQL row versions; every mutation detects stale input and returns `409` without lost update.
- **AC-P02-DB-05:** Parent FKs are restrictive/no-action; deleting a catalog parent cannot cascade curriculum or learner history.
- **AC-P02-DB-06:** New rows start `draft`; migration contains no seed/import/sample rows and no implicit publication of new data.
- **AC-P02-DB-07:** Indexes support edition/status/order and paged lookup and are justified by query shape. FKs remain enabled/trusted and constraint checks pass.
- **AC-P02-DB-08:** Empty disposable database remains empty after startup/migration.

## 3. Backend API and business rules

- **AC-P02-API-01:** Existing chapter/lesson controllers/services are reused; no per-subject CRUD or duplicate curriculum engine exists.
- **AC-P02-API-02:** Chapter and lesson lists support database-side search, allow-listed filtering/sorting, page/pageSize and accurate total.
- **AC-P02-API-03:** Create/read/update/archive/reactivate and reorder persist through API to SQL and survive reload.
- **AC-P02-API-04:** Reorder validates exact edition/chapter scope, duplicate/missing IDs, row versions and transaction atomicity.
- **AC-P02-API-05:** Generic update cannot set lifecycle status. Invalid transition returns 400/409 and leaves SQL unchanged.
- **AC-P02-API-06:** Canonical transitions use exact wire values: `draft → in-review → approved → published → archived`, with `changes-requested` as review outcome and explicit allowed return paths.
- **AC-P02-API-07:** Publish is blocked when required curriculum/edition/chapter ancestor is not publishable.
- **AC-P02-API-08:** Audit event and business mutation commit atomically; forced audit failure rolls back the mutation.
- **AC-P02-API-09:** Validation covers required IDs/codes/titles, normalized code/slug uniqueness, lengths, source URL shape where applicable, invalid parent, archived parent and malformed row version.
- **AC-P02-API-10:** Video is optional. Creating, publishing and viewing a lesson without video succeeds and returns an honest empty resource state.
- **AC-P02-API-11:** No response fabricates author, subject, grade, edition, lesson content, video, progress or success.

## 4. Authorization and concurrency

- **AC-P02-RBAC-01:** Unauthenticated management request is 401.
- **AC-P02-RBAC-02:** Student cannot create/update/delete/reorder/review/publish/archive curriculum.
- **AC-P02-RBAC-03:** Teacher cannot mutate curriculum unless an existing explicit permission grants it; role alone is not enough.
- **AC-P02-RBAC-04:** Content author/creator can read management data and mutate/submit only content allowed by ownership policy.
- **AC-P02-RBAC-05:** Reviewer/content admin/admin transitions are enforced by backend policy, not only hidden buttons.
- **AC-P02-RBAC-06:** Four-eyes test proves an author cannot approve/publish their own lesson under the approved policy.
- **AC-P02-CONC-01:** Two sessions editing the same row produce one success and one visible stale conflict; no last-write-wins loss.
- **AC-P02-CONC-02:** Concurrent reorder/update is deterministic or rejected atomically, with valid unique order afterward.

## 5. Management frontend and UI/UX

- **AC-P02-UI-01:** One curriculum workspace presents breadcrumb, live catalog filters, hierarchy tree and selected-node table; tree/table use the same real API identity.
- **AC-P02-UI-02:** Grade, subject, curriculum, textbook series/edition and status filters contain only API data. No `subjects[0]`, `math`, `Toán học 12`, sample option or hardcoded subject list.
- **AC-P02-UI-03:** Search/filter/sort/node/page/pageSize are URL-backed and restored by refresh/back/forward.
- **AC-P02-UI-04:** Table pagination/sort/filter is server-driven; frontend does not fetch 100/all then `.slice()`.
- **AC-P02-UI-05:** Chapter and lesson CRUD shows server validation, permission and stale-conflict errors and never closes/shows success on failed mutation.
- **AC-P02-UI-06:** Empty database, empty edition, filtered-empty, loading, retryable error, forbidden and conflict states are distinct and actionable; no sample content appears.
- **AC-P02-UI-07:** Bulk action exists only with a server-side atomic endpoint and clear selected count; no silent client request loop.
- **AC-P02-UI-08:** Dedicated lesson editor in P02 handles supported metadata and lifecycle only. P03/P04/P05 sections do not pretend to save unsupported content.
- **AC-P02-UI-09:** Existing semantic tokens and management primitives are reused; no new UI framework or third table family is introduced.
- **AC-P02-UI-10:** CRUD view is neutral/data-dense: no decorative gradient, redundant KPI/card grid, oversized shadow, or unnecessary animation.
- **AC-P02-UI-11:** At 1440/1280 the tree/table toolbar remains usable; at 1024/768 tree/filter adapt to a panel; at 390/375 there is no page horizontal scroll, primary actions remain reachable and touch targets are at least 44px.
- **AC-P02-UI-12:** One `h1`, semantic sortable controls with `aria-sort`, labeled icon buttons, keyboard dialog/focus return and visible focus pass accessibility checks.

## 6. Learner and cross-module consistency

- **AC-P02-E2E-01:** Admin/Content creates an edition-linked chapter and draft lesson; SQL contains the exact IDs/values returned by API.
- **AC-P02-E2E-02:** After independent review and publication, the lesson appears exactly once in learner API and UI after refresh/deep link.
- **AC-P02-E2E-03:** Draft/review/approved-only lesson, or lesson under unpublished/archived required ancestor, is absent from learner projection.
- **AC-P02-E2E-04:** Archive/unpublish removes new learner visibility but preserves historical progress/attempt references.
- **AC-P02-E2E-05:** Math, History and Biology (or equivalent synthetic test subjects) coexist through one generic path; assertions use IDs returned by setup, not production business IDs.
- **AC-P02-E2E-06:** Edition-aware DTO contains real grade/subject/curriculum/edition/chapter/lesson IDs. Missing mapping is explicit; no `sub_math10` fallback.
- **AC-P02-E2E-07:** AI Tutor/adaptive regression verifies the affected learner route passes explicit context and does not create content, mastery or recommendations for empty/missing curriculum. No new AI service is added.
- **AC-P02-E2E-08:** Optional/missing video does not block lesson display and does not render a fake player/URL.

## 7. Required tests and evidence

- **AC-P02-TEST-01:** Frontend lint, full unit/component tests and production build pass.
- **AC-P02-TEST-02:** Backend restore/build/unit tests pass.
- **AC-P02-TEST-03:** Full integration suite passes twice on independent guarded `StudyAIDb_Clean_{GUID}` databases at the same application SHA.
- **AC-P02-TEST-04:** Playwright proves happy path, 401/403, validation, 409, API/network 500 no false success, empty state, refresh persistence, two-session concurrency and mobile 390px/375px.
- **AC-P02-TEST-05:** UI skill probe/sweep is run on affected routes after implementation; remaining measured issues are fixed or explicitly blocked with evidence.
- **AC-P02-TEST-06:** CI jobs run against the final P02 application SHA; disposable ownership/cleanup artifacts show successful drop only after verified process termination.
- **AC-P02-TEST-07:** `git diff --check` passes; diff contains no unrelated refactor, mock/runtime fallback, generated dump, credential, production data or disabled test.

## 8. Stop / no-go conditions

P02 is BLOCKED and must not be merged when any condition holds:

- a command would write/migrate/seed/restore/cleanup/drop `StudyAIDb`;
- a test uses `StudyAIDb_E2E` or an unguarded/static database;
- migration guesses legacy mapping, deletes protected data, or adds sample rows;
- management success is shown before failed API/SQL persistence is known;
- learner can see draft/unpublished-chain content;
- Student/Teacher can mutate through backend;
- stale update overwrites another session;
- UI uses mock/hardcoded subject/lesson/video/content;
- P03/P04/P05/data import work is bundled into P02;
- required CI/E2E evidence is missing or runs at a different SHA.

## 9. Exit report

The P02 report must map every acceptance ID to `PASS`, `FAIL`, `NOT RUN`, or `NEEDS VERIFICATION`, with file/line, test name/command, CI URL, application SHA and disposable database evidence. A missing test is not PASS. Do not commit/push/merge beyond the explicitly authorized Draft PR workflow.
