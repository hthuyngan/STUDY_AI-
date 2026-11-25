# ADR: Multi-Subject Curriculum Engine Architecture

- **Status:** Proposed (Phase P00 — Pending Owner Move-Gate Approval for P01 Schema Migration)
- **Date:** 2026-11-25
- **Deciders:** STUDY_AI Architecture & Engineering
- **Context:** Multi-Subject Curriculum Refactoring (`docs/curriculum-refactor/`)
- **Supersedes:** Math-only curriculum scope assumptions in earlier plans and PR #23 (`audit/math-only-cleanup-plan-20261123`), while preserving all `StudyAIDb` safety guards.

---

## 1. Context and Problem Statement

The existing curriculum implementation (`ContentSubject -> ContentChapter -> ContentLesson`) conflates grade level, subject identity, curriculum framework, and textbook edition into a single `ContentSubject` table (`sub_math10`, `sub_math11`, `sub_math12`), stores lesson bodies in Math-shaped fields/JSON without block-level schema validation, and previously included hardcoded Math 10–12 sample seeding in runtime application code (`DbInitializer.SeedReferenceDataAsync`).

To support multiple Vietnamese high-school subjects (e.g., Mathematics, History, Biology, Literature, Physics, Chemistry) across grades 10–12 and multiple textbook series (e.g., Kết Nối Tri Thức, Chân Trời Sáng Tạo, Cánh Diều) without duplicating CRUD controllers or hardcoding subject IDs, we must evolve the existing content module incrementally.

---

## 2. Decision

### 2.1 Target Relational Hierarchy

Evolve the existing SQL Server / EF Core content module incrementally—**no rewrite, no per-subject CRUD, no EAV**:

```text
GradeLevel -> Subject -> Curriculum -> CurriculumEdition -> ContentChapter -> ContentLesson
                                                                 |               |
                                                                 |               +-> LessonContentBlock (versioned closed registry)
                                                                 |               +-> LearningObjective / KnowledgeUnit / Skill
                                                                 |               +-> LessonPrerequisite / QuestionSkill
                                                                 |               +-> LessonResource (generalized from ContentLessonVideo)
                                                                 +-> ordering & publication lifecycle
```

- **GradeLevel**: `Id`, `Code` (unique, e.g., `"10"`, `"11"`, `"12"`), `Name`, `OrderIndex`, `Status`, timestamps.
- **Subject**: Generic subject identity (`Id`, `Code` unique e.g. `"MATH"`, `"HIST"`, `"BIO"`, `Name`, `Description`, `Status`, timestamps). Grade is removed from subject business identity after backfill.
- **Curriculum**: `Id`, `Code` (unique), `GradeLevelId`, `SubjectId`, `Name`, `Framework`, `AcademicYearFrom/To`, `Status`, provenance, timestamps.
- **TextbookSeries**: `Id`, `Code` (unique), `Name`, `Publisher`, `Description`, `Status`, provenance/license metadata.
- **CurriculumEdition**: `Id`, `Code` (unique), `CurriculumId`, optional `TextbookSeriesId`, `EditionName`, `Volume`, `Version`, `PublicationYear`, `Status`, source/license/review fields.
- **ContentChapter & ContentLesson**: Reuse existing tables/IDs where safe; scope chapters to `CurriculumEditionId` with durable `(CurriculumEditionId, Code)` and lessons to `(ChapterId, Code)` and `(ChapterId, Slug)`.

### 2.2 Canonical Lifecycle & Versioning

All authored curriculum entities follow one canonical state machine using the existing persisted/wire hyphenated contract:

`draft -> in-review -> approved -> published -> archived` (with `changes-requested` as a review outcome).

- **Wire & Persistence Compatibility:** Existing backend services (`ContentGovernanceService`, `ContentLessonsService`, `ContentQuestionsService`, `ContentAssessmentsService`, `ContentReviewService`) and frontend types (`ContentStatus`, `ContentApprovalItem`) use `"in-review"` and `"changes-requested"`. This contract is preserved to maintain backward compatibility without unnecessary status-renaming migrations.
- **Creation always starts `draft`.** No implicit `published` or `verified` defaults.
- **Server-owned transitions:** Authorization, ownership, parent lifecycle checks, and provenance/license requirements are enforced in backend handlers and recorded in audit logs.
- **Archive-first retention:** Records referenced by learner progress, attempts, responses, or assignments are archived/tombstoned, never hard-deleted via EF cascade.

### 2.3 Compatibility & Migration Strategy

1. Preserve existing `ContentSubject`, `ContentChapter`, `ContentLesson`, `ContentQuestion`, and `ContentLessonVideo` IDs and API contracts during transition.
2. Add new catalog tables and nullable foreign keys first in `StudyAIDb_E2E` (P01), backfill mapping from `ContentSubject.Grade` and existing codes, and dual-read through compatibility queries.
3. Retire legacy fields/adapters only in P10 after all FE/API consumers migrate and counts/keys/history are verified.

### 2.4 Recurrence Stop & Zero-Mock Boundary (P00)

- Runtime `StudyAI.Api` startup against an empty authorized database creates **zero** curriculum subjects, chapters, lessons, questions, videos, or learner progress.
- Sample curriculum fixture builders live strictly in `StudyAI.IntegrationTests` / test fixtures, never in runtime `StudyAI.Api` source.
- Production frontend bundles must not register `MockCurriculumAdapter` or treat `localStorage` / static datasets as authoritative official curriculum or assessment truth.

### 2.5 AI & Adaptive Boundary

- AI requests carry explicit `SubjectId`, `CurriculumEditionId`, `LessonId`, and `KnowledgeUnitId`/`SkillId`.
- Retrieval uses only published, authorized content with provenance; missing context yields an explicit unavailable state.
- `FakeLlmProvider` is test-only; subject-specific exam blueprints live behind a capability interface.

---

## 3. Consequences

- **Positive:** Single generic CRUD & learner navigation engine; zero subject hardcoding; safe incremental migration preserving existing IDs and learner history; fail-closed database and zero-mock guarantees.
- **Trade-offs:** Requires careful dual-read compatibility during P01–P06 and explicit owner move-gate approval before P01 schema migration.
