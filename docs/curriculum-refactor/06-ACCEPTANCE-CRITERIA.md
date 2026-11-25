# Multi-subject Curriculum Refactor — Acceptance Criteria

## A. Safety and provenance

- [ ] `StudyAIDb` is refused by migration, seed, import, cleanup, and write-test tooling.
- [ ] All write tests identify `StudyAIDb_E2E` or a disposable DB in logs without secrets.
- [ ] Empty application startup creates no curriculum/demo learning data.
- [ ] Every published edition/lesson/resource has source, license decision, reviewer, version, and audit trail required by policy.
- [ ] External dataset content is not present or imported until a separately approved license/import phase.

## B. Catalog and schema

- [ ] Grade, generic subject, curriculum, textbook series, and edition have stable IDs and database-enforced business keys.
- [ ] One subject supports multiple grades and editions without duplicate subject definitions.
- [ ] Chapter/lesson identity and ordering are scoped to the correct parent and protected from duplicates/races.
- [ ] Archive/history policy prevents curriculum maintenance from deleting learning evidence.
- [ ] Upgrade, backfill, compatibility read, and rollback are proven on isolated SQL with count/key reports.

## C. Management CRUD

- [ ] Admin/Content can create/read/update/archive approved catalog entities through real FE -> API -> BE -> SQL flows.
- [ ] Chapter, lesson, content block, objective, skill, prerequisite, resource, and question mappings persist and reload correctly.
- [ ] Lists have bounded pagination, search, filtering, sorting, loading, empty, error, and forbidden states.
- [ ] Creation starts draft; review/publish/archive transitions are explicit, server authorized, audited, and concurrency safe.
- [ ] Reorder is atomic and cannot produce duplicate positions.
- [ ] API failure never displays success or retains a fabricated entity.

## D. Lesson content and media

- [ ] Closed, versioned validators exist for Text, Markdown, Formula, Image, Video, Example, Exercise, Table, Diagram, Timeline, Summary, and Reference blocks.
- [ ] Unknown block type/version and malformed payload are rejected server-side.
- [ ] Subjects may use any subset of block types; no Math-only fields are required.
- [ ] Video/resources are optional. Null/missing video does not block lesson creation or learning.
- [ ] Invalid URL/provider, failed verification, or unpublished resource is not shown to learners.
- [ ] Create/edit/remove/reorder resource changes persist and match learner output after publication.

## E. Learner curriculum

- [ ] Learner can select grade -> subject -> curriculum/textbook edition -> chapter -> published lesson.
- [ ] Only a fully published ancestor chain is visible.
- [ ] Lesson content, resources, exercises, and related material come from SQL-backed APIs.
- [ ] Empty DB/catalog/content/video/exercise states are honest and distinct from API errors.
- [ ] No placeholder chapter, lesson, video, assessment, score, mastery, or progress is shown.
- [ ] Deep links, refresh, browser navigation, and mobile 390px work.
- [ ] Management-created published content appears once and correctly in learner UI.

## F. Progress and assessment

- [ ] Authenticated progress, attempts, responses, and events are server persisted and user isolated.
- [ ] Browser storage is not authoritative for official progress/scores/content.
- [ ] Missing assessment creates no attempt or score.
- [ ] Correct answers are not disclosed before submission; finalized results are immutable per policy.
- [ ] Rename, reorder, archive, and new content version do not corrupt historical attempts/mastery.
- [ ] Question/lesson/skill mappings use stable IDs and database integrity constraints.

## G. AI and adaptive learning

- [ ] Shared AI/adaptive paths contain no implicit `sub_math*`, Toán 12, grade, chapter, or lesson fallback.
- [ ] Requests carry explicit subject/curriculum/lesson/knowledge/skill context as applicable.
- [ ] Curriculum-grounded answers use only published authorized content and expose provenance.
- [ ] General-knowledge answers are clearly distinguished from curriculum-grounded answers.
- [ ] Empty/missing evidence yields unknown/unavailable, not fabricated paths, mastery, progress, or curriculum knowledge.
- [ ] Fake provider and generated fallback content are test-only.
- [ ] Subject-specific exam behavior is isolated behind a capability and cannot become the global default.

## H. RBAC and audit

- [ ] Student cannot mutate curriculum or access another student's learning records.
- [ ] Author cannot edit unauthorized content; reviewer/publisher/admin transitions match the approved matrix.
- [ ] Backend returns correct 401/403 independently of hidden UI controls.
- [ ] Import and cleanup are admin-only and database-guarded.
- [ ] Mutations/transitions record actor, target, action, prior/new state, timestamp, and reason without secrets/private content.

## I. Import readiness

- [ ] One import orchestrator owns preview/confirm; duplicate endpoint behavior is removed or adapted.
- [ ] Immutable manifest records repository/commit/path/hash, grade, subject, series, version, parser, provenance, and license approval.
- [ ] Preview performs no writes and surfaces unresolved mappings, zero-byte files, duplicate keys, unsafe links, and validation errors.
- [ ] Confirm rejects changed manifest/checksum and is transactional/idempotent.
- [ ] No real textbook content or AI filler is imported in the refactor phases.

## J. Cleanup readiness

- [ ] Dry-run is default and writes nothing.
- [ ] Candidate classification is evidence-based and exact-ID approved; ID/title heuristics alone cannot delete.
- [ ] Dependency report covers curriculum, questions, assessments, progress, attempts, responses, events, mastery, recommendations, notes, bookmarks, AI context, assignments, revisions, and audit.
- [ ] Records with learning history use archive/tombstone/snapshot preservation.
- [ ] Recovery is restored and verified on a disposable DB before any execution request.
- [ ] Transaction rollback, changed-manifest refusal, concurrent edit, rerun no-op, and unrelated-row checksum tests pass.
- [ ] A separate human/DBA approval is required for any real execution; this plan grants none.

## K. Test and release evidence

- [ ] Backend unit and integration tests pass on isolated SQL.
- [ ] Frontend unit tests, lint, TypeScript/build pass.
- [ ] Playwright covers happy path, 401/403, API failure, empty state, refresh, two-user isolation, and mobile 390px for affected flows.
- [ ] Database integrity, migration/rollback, CRUD lifecycle, cleanup dry-run, and regression tests pass.
- [ ] Math, History, and Biology fixtures are test-only and prove subject-neutral behavior.
- [ ] Final scoped diff contains no mock/fallback official data, hardcoded business curriculum, secret, DB dump, dataset, disabled test, or unrelated refactor.
- [ ] Test logs and `git status`/diff summary are attached; anything not executed is labeled `NOT RUN` with a blocker.

