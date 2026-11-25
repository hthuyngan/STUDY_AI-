# Multi-subject Curriculum Refactor — Implementation Phases

## Global gates

Every phase is a reviewed vertical slice. Before work, reconcile overlapping PRs #23, #22, #20 and the newer `feature/ai-core-v1` implementation; never merge/delete active branches blindly. Use `StudyAIDb_E2E` or disposable SQL only. No phase imports real textbook content or generates filler content.

Required verification for affected slices:

- Frontend: frozen Bun install where needed, lint, unit tests, TypeScript/build.
- Backend: restore, build, unit/integration tests against isolated SQL.
- Playwright: happy path, 401/403, API failure, empty state, refresh, two-user isolation where relevant, and 390px.
- Inspect `git diff` and test logs; never disable tests or claim pass without evidence.

## P00 — Baseline, ADR, and recurrence stop

- **Modify:** architecture ADRs, runtime registration/configuration, `DbInitializer` boundary, production mock adapter registrations, relevant tests/docs.
- **Do not modify:** curriculum schema or real data.
- **Deliver:** approved multi-subject ADR; PR reconciliation matrix; reference seeding restricted to isolated test fixtures; production server/client show honest empty/error states.
- **Done when:** empty allowed DB starts with no curriculum; all official-data fallbacks are inventoried; `StudyAIDb` guard tests pass.
- **Move gate:** owner approves target entity names, status model, compatibility strategy, and which PR work is reused.

## P01 — Stable catalog foundations

- **Modify:** content entities/configurations/migrations/DTOs/services/controllers for GradeLevel, generic Subject, Curriculum, TextbookSeries, CurriculumEdition; content catalog FE/API.
- **Do not modify:** lessons, AI, mastery, or import behavior beyond compatibility reads.
- **Deliver:** real CRUD with pagination/search/filter/sort, validation, audit, RBAC, draft/archive, unique keys; compatibility mapping for current subjects.
- **Done when:** Math, History, Biology fixtures coexist across grades/editions in `StudyAIDb_E2E`; migration/rollback and empty catalog pass.
- **Move gate:** count/key/backfill report approved; no duplicate catalog controllers/services.

## P02 — Edition chapter and lesson lifecycle

- **Modify:** chapter/lesson schema and services, workflow transitions, ordering, management UI, learner read projection.
- **Do not modify:** content blocks/resources/questions beyond stable references.
- **Deliver:** chapters scoped to editions; durable codes; safe ordering; draft/review/publish/archive; learner published-chain filtering.
- **Done when:** Management create/edit/publish persists to SQL and appears exactly once in Student API/UI; draft/unpublished ancestors are invisible.
- **Move gate:** CRUD lifecycle, RBAC, API failure/no false success, and two-author tests pass.

## P03 — Validated lesson blocks, objectives, knowledge units, and skills

- **Modify:** lesson composition entities/configuration/contracts/validators/editor/renderer; content revisions.
- **Do not modify:** AI-generated content or real textbook import.
- **Deliver:** versioned closed block schemas; relational objectives/knowledge/skills/prerequisites; accessible generic rendering.
- **Done when:** subject-neutral fixtures prove formula, timeline, image/table, text, example, exercise, summary, and reference blocks; malformed JSON/type/version is rejected.
- **Move gate:** renderer/editor round-trip and revision/rollback tests pass.

## P04 — Resources and video

- **Modify:** consolidate/generalize `ContentLessonVideo` into LessonResource contract, URL/provider validation, verification/publish workflow, editor and learner components.
- **Do not modify:** require video for a lesson or create placeholder media.
- **Deliver:** optional video/image/document/link; create/edit/remove/archive/reorder; verified publication; honest missing/invalid states.
- **Done when:** Management changes persist and Student receives the same published resource; null/invalid URL and provider failure are handled without fake fallback.
- **Move gate:** resource RBAC, URL safety, no-video, invalid-video, and mobile tests pass.

## P05 — Question mapping and assessment integrity

- **Modify:** question durable key/fingerprint, lesson/skill mappings, assessment services, editor/question bank, learner exercise projection.
- **Do not modify:** VNHSGE data except approved non-destructive mapping support.
- **Deliver:** deterministic identity, no synthetic assessment, correct answer protected before submission, immutable finalized attempts.
- **Done when:** questions map by IDs, duplicate/race controls work, missing exercises produce empty state, historical attempts survive archive/version changes.
- **Move gate:** grading, zero-leak, concurrency, ownership, and history tests pass.

## P06 — Learner catalog end-to-end

- **Modify:** learner routes/read models/services/pages for grade -> subject -> edition -> chapter -> lesson; progress integration.
- **Do not modify:** add offline official-data fallback.
- **Deliver:** explicit selection, deep links, loading/empty/error/forbidden states, real SQL progress, legacy redirects.
- **Done when:** three-subject fixture matrix passes FE -> API -> BE -> SQL; refresh/cross-device and two-user isolation pass.
- **Move gate:** no learner page derives subject/grade from Math-specific defaults.

## P07 — AI and adaptive multi-subject context

- **Modify:** AI tutor/hint/authoring, analytics, mastery, recommendation, learning path, subject capability providers.
- **Do not modify:** replace AI Gateway, add a new vector database/RAG service, or auto-publish generated content.
- **Deliver:** explicit curriculum/lesson/skill IDs; published-context provenance; unknown-evidence behavior; test-only fake provider.
- **Done when:** Math/History/Biology context isolation passes and empty curriculum generates neither lesson, path, mastery nor fake answer.
- **Move gate:** security, provenance, unnecessary-LLM, and subject-capability tests pass.

## P08 — Import readiness, no real import

- **Modify:** consolidate import API/orchestrator, manifest, schema mapping, preview validators, immutable checksum and license gates.
- **Do not modify:** download dataset into repo, import real content, or call AI to fill gaps.
- **Deliver:** preview-only compatibility proof using tiny licensed/synthetic fixtures; unresolved mappings and zero-byte files block confirmation.
- **Done when:** deterministic key, duplicate, malformed input, race, transaction, and target DB guard tests pass.
- **Move gate:** owner/legal approves a separate import phase and data license.

## P09 — Cleanup tooling rehearsal

- **Modify:** approved cleanup tool/endpoint, safety guard, dependency reporter, audit ledger, tests.
- **Do not modify:** `StudyAIDb`; do not hard-delete by default.
- **Deliver:** default dry run, manifest/hash approval, archive-first policy, recovery rehearsal in disposable SQL.
- **Done when:** every test in `03-DATABASE-CLEANUP-PLAN.md` passes and unrelated row checksums are unchanged.
- **Move gate:** owner/DBA approves a separate execution request. This phase itself performs no real cleanup.

## P10 — Compatibility retirement and release hardening

- **Modify:** remove proven-dead mock adapters, legacy route adapters/fields only after all consumers migrate; docs and operational runbooks.
- **Do not modify:** unrelated modules or historical evidence.
- **Deliver:** one source of truth, query/performance budgets, indexes based on measured plans, observability without private data, complete acceptance matrix.
- **Done when:** full relevant gates pass; static search/import graph finds no official-data mock fallback or shared Math defaults; release/rollback runbooks are approved.
- **Move gate:** human approval for production migration/deployment. No automatic merge.

