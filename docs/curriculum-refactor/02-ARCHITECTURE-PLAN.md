# Multi-subject Curriculum Engine — Target Architecture

## 1. Decision

Evolve the existing content module incrementally. Do not create per-subject CRUD, do not replace the AI engine, and do not introduce EAV. Preserve current IDs and API compatibility while adding stable curriculum identity and validated content blocks.

Target hierarchy:

```text
GradeLevel -> Subject -> Curriculum -> CurriculumEdition -> Chapter -> Lesson
                                                            |          |
                                                            |          +-> ContentBlocks
                                                            |          +-> Objectives / KnowledgeUnits / Skills
                                                            |          +-> Prerequisites / Questions / Resources
                                                            +-> ordering and publication state
```

`TextbookSeries` describes a publisher/series. `CurriculumEdition` binds a curriculum to a textbook series, version/year, and publication lifecycle. A curriculum may also have an edition with no textbook series.

## 2. Reuse versus change

| Existing capability | Decision |
|---|---|
| Content subject/chapter/lesson IDs | Preserve and backfill; add compatibility mapping |
| Content workflow/revisions/audit | Reuse and generalize to new entity types |
| Topics | Keep temporarily; migrate semantic mastery to stable KnowledgeUnit/Skill IDs |
| Videos | Generalize into LessonResource while preserving video API compatibility |
| Questions/assessments | Reuse; add durable keys and mapping tables |
| Import preview/confirm | Consolidate behind one orchestrator after schema foundations |
| Learner curriculum service/client | Extend read models; keep legacy route redirects during transition |
| AI gateway/provider abstraction | Reuse; remove fake/runtime content fallbacks |
| Static/mock repositories | Test fixtures only; no production registration |

## 3. Relational core

Names are conceptual; implementation should follow existing naming conventions and an approved ADR.

### GradeLevel

- `Id`, `Code` (unique, e.g. `10`), `Name`, `OrderIndex`, `Status`, timestamps.
- Grade is data, not parsed from subject code or user text.

### Subject

- Reuse/migrate `ContentSubject` toward generic subject identity.
- `Id`, `Code` (unique, e.g. `MATH`, `HISTORY`), `Name`, `Description`, `Status`, timestamps.
- Remove grade semantics from the subject business key after backfill.

### Curriculum

- `Id`, `Code` (unique), `GradeLevelId`, `SubjectId`, `Name`, `Framework`, `AcademicYearFrom/To`, `Status`, provenance, timestamps.
- Unique active business key should prevent duplicate framework/grade/subject definitions.

### TextbookSeries

- `Id`, `Code` (unique), `Name`, `Publisher`, `Description`, `Status`, provenance/license metadata.

### CurriculumEdition

- `Id`, `Code` (unique), `CurriculumId`, optional `TextbookSeriesId`, `EditionName`, `Volume`, `Version`, `PublicationYear`, `Status`, source/license/review fields.
- Chapters belong to one edition. Publication requires approved provenance and review.

### Chapter and Lesson

- Reuse current tables where safe; add `CurriculumEditionId` to chapter and durable `Code` to chapter/lesson.
- Unique `(CurriculumEditionId, Code)` for chapter and `(ChapterId, Code)` plus `(ChapterId, Slug)` for lesson.
- Archive rather than hard-delete when referenced by learning records.
- Ordering is server validated, transactionally reordered, and unique within the parent.

## 4. Lesson composition

### LessonContentBlock

- `Id`, `LessonId`, `BlockType`, `OrderIndex`, `SchemaVersion`, `PayloadJson`, `Status`, timestamps.
- Closed initial registry: `text`, `markdown`, `formula`, `image`, `video`, `example`, `exercise`, `table`, `diagram`, `timeline`, `summary`, `reference`.
- Each block type has a versioned DTO and server validator. Unknown type/version is rejected.
- JSON is allowed only for flexible block payload. IDs, relationships, lifecycle, ordering, provenance, and searchable domain fields stay relational.
- Optional video/resource is valid; lesson creation and publication do not require video unless a business rule explicitly says so.

### Objective, knowledge, and skill graph

- `LearningObjective`, `KnowledgeUnit`, and `Skill` have stable codes scoped to curriculum/subject as approved.
- Join tables: `LessonObjective`, `LessonKnowledgeUnit`, `LessonSkill`, `LessonPrerequisite`, `QuestionSkill`.
- Prerequisite edges reference stable IDs and prevent self/cyclic dependencies.
- Topic name may remain a display label but cannot be the mastery key.

### LessonResource

- `Id`, `LessonId`, `ResourceType`, `Url/StorageKey`, `Title`, `MimeType`, `Duration`, `OrderIndex`, `VerificationStatus`, `Status`, provenance/license, checksum, timestamps.
- Resource types include video, image, document, link, and attachment.
- URL validation is allowlist/provider aware; delete means archive if historical references exist.
- Existing `ContentLessonVideo` is migrated or adapted behind the resource contract; do not duplicate two live sources of truth.

## 5. Lifecycle and versioning

Canonical states: `draft -> in_review -> approved -> published -> archived`, with `changes_requested` as a review outcome. Server transition handlers own authorization and validation.

- Creation always starts draft.
- Authors edit owned drafts; reviewers cannot silently publish through update endpoints.
- Published content is immutable in place for material changes: create a new version/revision, review, then atomically activate it.
- Learner reads require a published edition, chapter, lesson, and published/valid resources.
- Unpublish/archive must preserve prior attempt/progress display via snapshots or historical version links.

## 6. API slices

Use current API conventions and pagination envelope. Proposed logical routes:

```text
GET/POST/PATCH /content/grades
GET/POST/PATCH /content/subjects
GET/POST/PATCH /content/textbook-series
GET/POST/PATCH /content/curricula
GET/POST/PATCH /content/curriculum-editions
GET/POST/PATCH /content/curriculum-editions/{id}/chapters
GET/POST/PATCH /content/chapters/{id}/lessons
GET/POST/PATCH /content/lessons/{id}/blocks
GET/POST/PATCH /content/lessons/{id}/resources
GET/POST/PATCH /content/knowledge-units
GET/POST/PATCH /content/skills
POST           /content/{entity}/{id}/{transition}

GET /curriculum/grades
GET /curriculum/grades/{gradeId}/subjects
GET /curriculum/grades/{gradeId}/subjects/{subjectId}/editions
GET /curriculum/editions/{editionId}/chapters
GET /curriculum/lessons/{lessonId}
```

Do not add all endpoints at once. Deliver one tested vertical slice per implementation phase. Keep current subject/chapter/lesson routes as adapters until consumers migrate.

Every list supports bounded pagination, search, filter, sort allowlists, and cancellation. List projections must not load full content blocks or question bodies.

## 7. Frontend architecture

- One generic content workspace driven by entity metadata and API contracts; no subject-specific CRUD pages.
- Learner selection is explicit: grade -> subject -> edition -> chapter -> lesson.
- Server data is the only official source. Local storage may retain non-authoritative UI preferences or an explicitly labeled unsynced queue, never curriculum/progress/scores as truth.
- Model loading, empty, error, forbidden, and unavailable states separately.
- Route context contains stable IDs; labels come from APIs.
- Existing design tokens, accessible forms/dialogs, keyboard flow, and 390px behavior remain.

## 8. AI and adaptive learning boundary

- AI requests carry explicit `SubjectId`, `CurriculumEditionId`, `LessonId`, and applicable KnowledgeUnit/Skill IDs.
- Retrieval of curriculum context includes only published, authorized content and returns provenance references.
- If no published context exists, AI states that curriculum context is unavailable; it may answer general knowledge only when product policy allows and labels it as such.
- Fake providers and generated lesson fallbacks are test-only.
- Mastery is derived from persisted evidence; missing evidence is unknown, never 100% or a fabricated recommendation.
- Subject-specific exam blueprints live behind a capability/provider interface and are not the shared default.

## 9. Migration strategy

1. Add new tables/nullable keys and constraints in `StudyAIDb_E2E`; do not mutate production.
2. Backfill a mapping report from current `ContentSubject.Grade`, codes, chapters, and lessons.
3. Dual-read through a compatibility query; new writes use the new identity.
4. Migrate FE/API consumers slice by slice.
5. Verify counts, keys, visibility, and history.
6. Only after approval, make new keys required and retire legacy fields/adapters.

No migration is considered ready without upgrade and rollback rehearsal from a representative disposable copy and a fail-closed target database check.

## 10. Import readiness for the reference dataset

The future import manifest should capture source repository/commit, file path, SHA-256, grade, subject, textbook series, volume, language, parser version, license decision, and reviewer. Filename parsing is only a suggestion; the preview must show unresolved/ambiguous metadata.

Markdown parsing produces candidate blocks and headings, never auto-published curriculum. Zero-byte files, duplicate content, missing headings, unsafe links, malformed formulas, and absent license approval block confirm. The external dataset must not be copied into this repository or imported in the current phase.

