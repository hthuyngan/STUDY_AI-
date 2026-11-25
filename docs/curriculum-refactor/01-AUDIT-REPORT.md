# STUDY_AI — Multi-subject Curriculum Audit

Date: 2026-11-25  
Repository: `https://github.com/hthuyngan/STUDY_AI-.git`  
Branch: `feature/backend-redesign-modular-monolith`  
HEAD: `49407bb2035e64da096521fb6c63648fdd139b92`  
Review snapshot: HEAD plus the uncommitted working-tree changes present at review time.

## 1. Safety and evidence boundary

- `git fetch origin --prune` completed. The branch was `0` ahead and `0` behind its tracking branch.
- The working tree was not clean. No pull, checkout, stash, reset, commit, push, migration, seed, import, or database write was performed.
- Local changes already contain partial curriculum remediation. Findings below distinguish durable architecture gaps from work that appears to be in progress; uncommitted work is not treated as released or verified.
- `StudyAIDb` was not connected to or modified. Database-content claims that require live inspection are explicitly marked **NEEDS VERIFICATION**.
- Tests were **NOT RUN**: this is a read-only architecture review on a dirty snapshot. Existing reports and screenshots are historical evidence only.

## 2. Executive conclusion

The repository already has reusable SQL-backed subject/chapter/lesson/question/video services, moderation workflow, import preview/confirm, progress, assessment, mastery, authorization policies, and learner routes. It is not, however, a general curriculum engine yet. The persisted hierarchy is currently `ContentSubject(Grade string) -> ContentChapter -> ContentLesson`; subject, grade, curriculum, textbook edition, skill, prerequisite, resource, and content-block concerns are either conflated, absent, or represented as weak strings/JSON.

The immediate risks are not a need for a rewrite. They are:

1. destructive cleanup against a graph with cascade deletes and weak historical foreign keys;
2. seeded/demo curriculum and runtime mock/local-storage paths being confused with official data;
3. Math-specific identifiers and copy embedded across learner, adaptive, AI, teacher, and assessment flows;
4. no stable `Grade -> Subject -> Curriculum/Textbook Edition` identity;
5. unsafe publication defaults and inconsistent workflow semantics;
6. no validated, subject-neutral lesson content-block model.

## 3. Findings summary

| Severity | Count |
|---|---:|
| P0 | 1 |
| P1 | 8 |
| P2 | 5 |
| P3 | 0 |

## 4. Detailed findings

### CURR-001 — Cleanup can cascade through curriculum while learning-history references are not consistently protected

- **Severity:** P0
- **Evidence:** `backend/src/StudyAI.Api/Data/StudyAIDbContext.cs:386`, `:434`, `:444`, `:544`, and `:554` configure cascade paths from subject/chapter/lesson into descendants. Progress, attempt, and event indexes at `:236`, `:274`, `:342`, and `:344` use string IDs without equivalent explicit curriculum foreign-key relationships in those configurations. Recommendations, notes, bookmarks, mastery, conversations, and responses have mixed Cascade/NoAction behavior later in the file.
- **Root cause:** the operational data model grew around string identifiers, while curriculum deletion behavior was configured entity by entity rather than by a single retention policy.
- **Proposed fix:** default curriculum removal to archive/tombstone. Build a dry-run dependency inventory and preserve historical display snapshots or mapping records before any approved hard delete. Do not rely on EF cascade for cleanup.
- **Dependencies:** CURR-003, CURR-004; cleanup design in `03-DATABASE-CLEANUP-PLAN.md`.
- **Acceptance criteria:** a dry run enumerates every affected table and row; `StudyAIDb` is fail-closed; records with learning history are never silently removed; rollback is proven on `StudyAIDb_E2E`.
- **Required tests:** database-name guard, dependency graph, transaction rollback, idempotent rerun, archive-with-history, forbidden-production-target tests.

### CURR-002 — Reference seeder still defines published sample curriculum and questions

- **Severity:** P1
- **Evidence:** `backend/src/StudyAI.Api/Data/DbInitializer.cs:39-137`, `:150-248`, and `:262-395` create `sub_math10`, `sub_math11`, `sub_math12`, chapters, lessons, and published questions. Local `backend/src/StudyAI.Api/Program.cs:518-539` now makes reference seeding opt-in and test-database guarded, which is a positive in-progress remediation, but the demo payload remains in application source.
- **Root cause:** development bootstrap, test fixtures, and product curriculum were combined in one initializer.
- **Proposed fix:** keep only required reference/security bootstrap in runtime code. Move sample curriculum to isolated test fixture builders and prevent fixture registration outside disposable/E2E environments.
- **Dependencies:** CURR-010.
- **Acceptance criteria:** starting the API against an empty allowed database creates no subject, chapter, lesson, question, video, score, or progress unless an explicit isolated test fixture is requested.
- **Required tests:** empty-database startup; seed opt-in/opt-out; test fixture isolation; guard against `StudyAIDb`.

### CURR-003 — Grade, subject, curriculum, and textbook edition are conflated

- **Severity:** P1
- **Evidence:** `backend/src/StudyAI.Api/Models/ContentEntities.cs:3-16` stores `Grade` directly on `ContentSubject`; `StudyAIDbContext.cs:350-386` only enforces a unique subject code and subject-to-chapter relationship. The existing model document at `docs/architecture/curriculum-data-model.md` confirms the same hierarchy.
- **Root cause:** the first vertical slice modeled “Toán 10/11/12” as separate subjects and did not introduce curriculum or textbook-edition identity.
- **Proposed fix:** introduce stable GradeLevel, generic Subject, Curriculum, TextbookSeries, and CurriculumEdition entities, then re-parent chapters through a compatibility migration. Reuse current content IDs during transition.
- **Dependencies:** schema ADR, migration rehearsal, CURR-001.
- **Acceptance criteria:** one subject can be offered for several grades and editions without copied subject definitions; chapter uniqueness is scoped to an edition; learner and staff APIs use IDs, not parsed names.
- **Required tests:** unique keys, cross-grade same subject, multiple editions, archive constraints, migration/backfill integrity.

### CURR-004 — Lesson content is Math-shaped JSON without block-level validation or versioned schema

- **Severity:** P1
- **Evidence:** `ContentEntities.cs:52-84` stores learning objectives, introduction, definitions, formulas, examples, notes, and summary as lesson fields/JSON. There is no persisted content-block, knowledge-unit, skill, prerequisite, reference, or general resource entity in this model. `StudyAIDbContext.cs:492-564` indexes chapter/topic/slug/author but not a stable lesson business key per edition.
- **Root cause:** lesson storage was optimized for a Math lesson template rather than polymorphic, validated subject content.
- **Proposed fix:** retain relational core entities; add ordered `LessonContentBlock` records with a closed block-type registry, `SchemaVersion`, and server-side JSON-schema/domain validation. Model objectives, skills, prerequisites, and references relationally.
- **Dependencies:** CURR-003, CURR-005.
- **Acceptance criteria:** History can use timeline blocks, Biology image/table blocks, and Math formula blocks without subject-specific controllers; invalid payloads are rejected; empty optional media is valid.
- **Required tests:** schema validation for every block type, order/reorder, unknown version rejection, empty lesson, round-trip serialization, accessibility metadata.

### CURR-005 — Publication defaults can expose unreviewed structures and media

- **Severity:** P1
- **Evidence:** `ContentEntities.cs:26` defaults chapters to `published`; `:104` defaults video verification to `verified`; `:107` defaults videos to published; `:146` defaults questions to published. `frontend/src/pages/Content/ContentSubjectsPage.tsx:52`, `:150`, and `:669-671` default subject creation UI to published.
- **Root cause:** early demo-friendly defaults bypass the moderation workflow now present in controllers.
- **Proposed fix:** make all newly authored curriculum objects `draft`; verification must be an explicit server transition; publish requires validated parent state, provenance, and authorized publisher.
- **Dependencies:** content governance and audit log reuse.
- **Acceptance criteria:** create never publishes implicitly; learner APIs return only fully published ancestor chains; invalid/unverified video cannot publish; transitions are audited.
- **Required tests:** state machine, parent/child visibility, author/reviewer/publisher RBAC, concurrent publish, API failure/no false success.

### CURR-006 — Math-only identity and copy are embedded in cross-subject runtime paths

- **Severity:** P1
- **Evidence:** `AiTutorService.cs:398`, `:619-633`; `AiLessonAuthoringService.cs:28`, `:83`; `AiHintService.cs:44`, `:175`, `:457`; `StudentCurriculumService.cs:634`, `:836`; `LearningRecommendationService.cs:36-65`; `LearningAnalyticsService.cs:53-87`; `frontend/src/lib/subjectResolver.ts:28-43`; `SubjectsPage.tsx:98`; `SubjectDetailPage.tsx:284`; `PracticeHubPage.tsx:250`, `:382`; `LearningPathPage.tsx:203`; and `KnowledgeGapsPage.tsx:296-317` contain Math IDs, labels, or fallbacks.
- **Root cause:** grade-to-Math resolution was used as a default subject strategy and spread into shared services.
- **Proposed fix:** require explicit curriculum context from enrollment/user selection; resolve names from persisted catalog; return empty/not-configured states rather than select Math implicitly. Keep truly Math-specific exam rules in a subject capability module.
- **Dependencies:** CURR-003, CURR-009.
- **Acceptance criteria:** identical learner flows work with test fixtures for Math, History, and Biology; missing context produces a clear empty state; no shared service synthesizes `sub_math*`.
- **Required tests:** three-subject matrix, no-enrollment case, invalid ID, deep links, adaptive/AI context isolation.

### CURR-007 — Product runtime still contains mock repositories and browser persistence for official learning data

- **Severity:** P1
- **Evidence:** `frontend/src/repositories/curriculum.repository.ts:7`, `:45-49`, and `:157` export `MockCurriculumAdapter` backed by `MASTER_CURRICULUM_SUBJECTS`; `questionBank.repository.ts:34-61` falls back to an initial mock dataset; `learningProgress.repository.ts:28-63`, `assessmentAttempt.repository.ts:31-69`, and `learningEvents.repository.ts:30-61` persist official-looking learning state in localStorage. Static datasets also exist in `frontend/src/data/curriculum.data.ts`, `lessons.mock.ts`, `questionBank.data.ts`, and staff mock files.
- **Root cause:** offline/demo adapters remained addressable after SQL APIs were introduced.
- **Proposed fix:** inventory actual imports and routes, remove production registration, and retain only explicit test fixtures. Network failure must show error/offline-unsynced state, never substitute official content or achievement.
- **Dependencies:** existing API clients and bootstrap sync; CURR-010.
- **Acceptance criteria:** production bundle has no path that presents fixture curriculum, progress, questions, or success as server truth; refresh and cross-device data come from authenticated APIs.
- **Required tests:** API failure, empty DB, refresh persistence, two-user isolation, offline state, bundle/import graph assertion.

### CURR-008 — AI hints can silently use a fake provider and Math-specific generated fallback

- **Severity:** P1
- **Evidence:** `backend/src/StudyAI.Api/Features/AI/AiHintService.cs:44` constructs `FakeLlmProvider`; `:171-175`, `:245`, and `:457` branch into generated fallback behavior and Math 12 copy. `AiLessonAuthoringService.cs:83` creates a generic lesson introduction when generation is unavailable.
- **Root cause:** test/demo provider behavior is available through production service construction and fallback text is treated as content.
- **Proposed fix:** use the registered AI gateway/provider abstraction only. When unavailable, return an explicit unavailable response; never save or present fabricated curriculum content as reviewed source material.
- **Dependencies:** AI gateway registration, content provenance.
- **Acceptance criteria:** fake provider is test-only; AI cannot author/publish without configured provider and human workflow; responses identify general knowledge versus published curriculum context.
- **Required tests:** provider unavailable, permission, provenance, prompt context, no-database-content, no-LLM-needed paths.

### CURR-009 — Progress, mastery, and question mappings rely on denormalized strings and incomplete identity

- **Severity:** P1
- **Evidence:** `StudyAIDbContext.cs:236-238`, `:274-276`, and `:340-344` index user/lesson/subject strings without the full curriculum-edition key. Mastery uniqueness at `:1007` includes `TopicName`, a mutable label. Questions have separate nullable lesson/subject/chapter IDs and only indexes at `:726-740`; the current import audit notes missing stable chapter/lesson/question business keys.
- **Root cause:** analytics and assessment features were added before stable curriculum identity and skills existed.
- **Proposed fix:** introduce edition-scoped stable IDs and relational question-skill/lesson-skill mappings. Preserve immutable snapshots for attempts while enforcing current references for new writes.
- **Dependencies:** CURR-003 and CURR-004.
- **Acceptance criteria:** rename/reorder does not split mastery; attempts remain readable after archive/version change; cross-curriculum question mapping is explicit.
- **Required tests:** rename stability, archive history, FK integrity, cross-edition isolation, duplicate prevention.

### CURR-010 — Import pipeline cannot safely identify or deduplicate the target hierarchy

- **Severity:** P2
- **Evidence:** `docs/phase18/CURRICULUM_IMPORT_AUDIT.md:24-26`, `:70-88` records that chapters have no code, lesson slug is not unique per chapter, and questions lack code/fingerprint. `StudyAIDbContext.cs:532` confirms a non-unique lesson slug index. Two import surfaces exist: `ContentCurriculumImportController.cs:22-36` and `CurriculumImportController.cs:48`, `:170`, increasing contract ambiguity.
- **Root cause:** import was built around transient file codes before durable business keys existed, and a second endpoint family was added rather than consolidated.
- **Proposed fix:** do not import in this phase. After schema foundations, choose one import orchestrator with preview, manifest, checksum, provenance/license, deterministic keys, transaction, and idempotency.
- **Dependencies:** CURR-003/004, legal approval.
- **Acceptance criteria:** duplicate input is detected deterministically; preview and confirm use the same immutable manifest; no import can target `StudyAIDb` through tests/tools.
- **Required tests:** malformed/oversized input, duplicate, race, rollback, checksum mismatch, license missing, database guard.

### CURR-011 — Learner hierarchy cannot select grade and textbook edition end-to-end

- **Severity:** P2
- **Evidence:** learner controller routes in `StudentCurriculumController.cs:31-106` navigate subject -> chapter -> lesson only. `SubjectsPage.tsx:98` exposes a hardcoded grade label; the lesson route accepts subject/course/lesson at `LessonPage.tsx:41-67`, but there is no persisted curriculum-edition selection.
- **Root cause:** API and routes mirror the current abbreviated schema.
- **Proposed fix:** add read models and routes for grades, subjects by grade, editions by grade/subject, chapters by edition, and published lesson detail. Preserve legacy route redirects during migration.
- **Dependencies:** CURR-003.
- **Acceptance criteria:** learner explicitly selects grade, subject, and edition; published empty catalog is honest; deep links resolve deterministically.
- **Required tests:** happy path, empty state, 404, draft isolation, refresh, mobile 390px.

### CURR-012 — Authorization exists but ownership and transition permissions need one canonical matrix

- **Severity:** P2
- **Evidence:** content controllers use `ContentAuthor`, `ContentAdminOnly`, reviewer, and publisher policies; definitions are at `Program.cs:282-292`. Lessons/questions/videos allow `ContentAuthor` at controller level while transition endpoints add policy checks inconsistently. `StudentCurriculumController.cs:9` is anonymous, including question-check routing at `:129-139`.
- **Root cause:** role aliases and resource ownership checks are distributed between attributes and services.
- **Proposed fix:** document and enforce a resource/transition matrix in handlers: student read published only; author edits owned draft; reviewer cannot self-approve where required; publisher/admin controls release; import/cleanup admin-only. Decide explicitly whether anonymous answer-check is intended.
- **Dependencies:** existing auth policies and audit log.
- **Acceptance criteria:** UI hiding is never the enforcement boundary; every mutation and transition has server tests; cross-author and student mutations return 403.
- **Required tests:** 401/403 matrix, ownership, self-review, role aliases, anonymous published read, anonymous answer-check decision.

### CURR-013 — Question/assessment fallback can fabricate a learner activity shell

- **Severity:** P2
- **Evidence:** `frontend/src/pages/Lesson/LessonPage.tsx:224-226` constructs `assessment-fallback`; `:310` falls back to “Toán học”. This may be display scaffolding, but it is indistinguishable from a real assessment without tracing all consumers.
- **Root cause:** UI normalization guarantees objects instead of modeling absence explicitly.
- **Proposed fix:** use nullable/empty assessment state and render “no exercise available”; never submit or score a synthetic assessment ID.
- **Dependencies:** learner lesson contract.
- **Acceptance criteria:** missing assessment produces no attempt, score, progress, or success; server errors are distinct from empty data.
- **Required tests:** missing assessment, API error, no video, no content blocks, refresh.

### CURR-014 — Existing documentation and open workstreams conflict on Math-only versus multi-subject direction

- **Severity:** P2
- **Evidence:** `README.md:6`, `:20`, and `:159` document a frontend demo and hybrid SQL/offline fallback. Open Draft PR #23 proposes a Math-only inventory/cleanup, while PRs #20 and #22 overlap zero-mock and full-stack remediation. `AGENTS.md:8` requires reconciliation of overlapping PRs and identifies `feature/ai-core-v1` as containing newer work.
- **Root cause:** multiple phased plans describe different target products and are active simultaneously.
- **Proposed fix:** approve one superseding ADR for the multi-subject direction, map each open PR finding/commit to the new phases, and close or rebase only after owner review. Never merge branches blindly.
- **Dependencies:** owner decision.
- **Acceptance criteria:** every overlapping PR is classified as reuse/rebase/superseded; no duplicate migrations or services are introduced.
- **Required tests:** documentation/link check and implementation diff review; no runtime test for the governance decision itself.

## 5. Reusable capabilities

- `ContentSubject`, `ContentChapter`, `ContentTopic`, `ContentLesson`, questions, assessments, and videos as migration sources.
- Content workflow, revisions, audit records, review queue, and policy framework.
- Video verification service and existing learner video endpoint.
- Import parsing limits, preview/confirm concepts, validation, transaction patterns, and dry-run endpoint concepts.
- Authenticated progress, attempts, responses, events, mastery, recommendations, notes, and bookmarks.
- Learner curriculum API/client/pages and Content workspace CRUD UI as compatibility shells.
- `DatabaseSafetyGuard` and isolated integration-test infrastructure.

## 6. Data and configuration verification still required

The following are **NEEDS VERIFICATION** with a read-only inventory approved by the owner:

- exact rows in `StudyAIDb` that came from `DbInitializer` versus real authoring;
- orphan counts and dependency counts for every lesson/chapter candidate;
- invalid/null media URLs currently stored;
- drafts or test/demo lessons currently visible through published ancestors;
- current role assignments and whether anonymous answer checking is intended;
- whether local uncommitted remediation passes the test gates.

These are data/configuration questions; they must not be labeled code bugs without evidence.

## 7. Reference dataset compatibility

The external repository contains large Markdown files named by grade, textbook series, and subject plus seven evaluation directories. Filename convention can populate an import manifest, but Markdown alone is not a stable chapter/lesson schema. At review time, two Grade 12 Cánh Diều Ngữ văn files had size zero, and the repository README provides no concrete license grant—only a direction to comply with copyright law. Therefore it is not approved import data. It is useful only to test future parser/manifest design after legal and content review.

