# Antigravity Prompt — PR #27 P02 Targeted Remediation

## Role and immutable scope

You are the implementation agent for the existing Draft PR #27 on `feature/p02-multi-subject-curriculum-lifecycle`. Remediate only findings `P02-F01` through `P02-F07` in `docs/curriculum-refactor/P02-FINAL-REVIEW.md`. Do not rewrite P02, start P03+, import curriculum, clean production data, retire databases, or refactor unrelated modules.

Read completely before editing:

- `AGENTS.md` and its two mandatory plan/prompt files.
- `docs/curriculum-refactor/P02-FINAL-REVIEW.md`.
- `docs/curriculum-refactor/P02-ACCEPTANCE-CRITERIA.md`.
- `docs/curriculum-refactor/NEXT-IMPLEMENTATION-PLAN.md`.
- `.agents/skills/ui-ux/SKILL.md` and only the references it routes to for this workspace/editor review.

Start from reviewed SHA `fddea7116a0f475f7559fa9c780e0c4aa9f1b3b7`. Run git preflight, fetch, and stop on unexpected local changes. Never reset, stash, overwrite, merge, or force-push. Use only owned disposable `StudyAIDb_Clean_{GUID}` databases for migrations/tests. Never write, migrate, seed, reset, clean, or drop `StudyAIDb` or `StudyAIDb_E2E`.

## Required corrections

### R1 — make the existing lesson editor P02-safe

- Carry the server `rowVersion` through `LessonEditorData`, load/save responses, and all update/lifecycle calls.
- Refresh the token after every successful mutation.
- Implement the existing canonical flow without a shortcut: draft/changes-requested → submit; independent reviewer → approve; approved → publish; published → unpublish; archive/reactivate as permitted.
- Render only actions allowed by status/role; backend remains authoritative.
- Preserve form data and show explicit validation, 403, 409, and API errors. Never show saved/published success before the server response.
- Keep editor scope to fields already supported in P02. Do not invent P03 content blocks, P04 resources, or P05 questions.

### R2 — connect learner UI to the edition-aware projection

- Extend the existing learner curriculum client/pages/routes; do not create another curriculum engine.
- Carry real grade, catalog subject, curriculum, edition, chapter, and lesson IDs.
- Consume `/api/v1/curriculum/editions/{editionId}/chapters` and real lesson detail data.
- Preserve explicit legacy compatibility, avoid duplicates, and render honest empty/optional-video states.
- Ensure management-published content appears exactly once in learner UI after refresh/deep link.

### R3 — unify canonical publication guards

- Centralize/reuse a publication visibility predicate for affected learner endpoints.
- When `CurriculumEditionId` exists, require the full canonical published/active chain. Never allow `SubjectId` legacy fallback to bypass a canonical ancestor.
- Use legacy checks only when no canonical mapping exists.
- Apply the rule to edition list, direct lesson, videos, questions, check-answer, and directly affected topic/material/AI-practice consumers.
- Canonical questions/check-answer must work without a legacy `SubjectId`; explicit subject/edition/chapter/lesson context must be preserved; no Math/default fallback.

### R4 — repair migration/data integrity without touching persistent databases

- Add database-enforced normalized unique `(ChapterId, Slug)` behavior consistent with archive policy, plus conflict-to-409 handling.
- Define safe Down behavior for canonical chapters with null legacy `SubjectId`: either an actionable guard or an owner-approved reversible strategy. Never guess/map a subject by name and never invent an empty/default business ID.
- Prove the behavior with a production-shaped disposable migration up/data/down test and concurrent duplicate code/slug tests.
- Keep migration changes limited and additive for Up; no seed/import/sample rows.

### R5 — enforce archive-first retention

- Disable physical delete for canonical lessons unless the row is an explicitly allowed unreferenced draft and all dependent/historical relations are proven absent.
- Published/review/approved/archived or referenced rows must be archived/retained.
- Do not cascade-delete questions, assessments, videos, progress, attempts, notes, bookmarks, conversations, mastery, or recommendations through this remediation.

### R6 — make ordering and URL state honest at catalog scale

- Do not submit only a paged/filtered subset to an exact-scope reorder endpoint.
- Add a safe chapter and lesson ordering flow that works with more than one page and requires row versions for the complete intended scope.
- Make `pageSize` URL-backed. Filter/sort/page changes must survive refresh and browser Back/Forward; use replace only for query normalization.
- Keep server-side search/filter/sort/pagination; do not fetch-all then slice for the table.

### R7 — close UI and evidence gaps

- Reuse/extend existing `ManagementTable`, `ManagementPagination`, tokens, and current UI primitives; remove the redundant raw table/pagination family where practical within this slice.
- Do not swallow catalog API failures as empty results. Distinguish loading, empty, filtered-empty, 403, 409, and retryable errors.
- Implement the approved 1024/768 panel behavior and 390/375 compact mobile rows/filter-tree drawers with 44px touch targets and no inner/page horizontal overflow.
- No new UI library, gradient, decorative card/KPI strip, mock data, fake success, fake video, hardcoded subject, or localStorage persistence.

## Required verification

Run targeted tests after each correction, then final gates on one immutable remediation SHA:

1. Frontend lint, full tests, build.
2. Backend restore/build/unit tests.
3. Full integration suite twice on independent owned disposable databases.
4. Guarded Playwright P02 plus P01 regression in CI or an equally durable reviewed job, covering:
   - real management create/edit/save/reload;
   - independent review/approve/publish and learner UI exact-once visibility;
   - unpublished ancestor/draft/archive hiding;
   - canonical-only, legacy-only, and dual-linked access;
   - editor 409/403/API failure with no false success;
   - validation, request-changes, unpublish/reactivate, ordering beyond one page;
   - canonical questions/practice and explicit AI context regression;
   - desktop 1440/1280, 1024/768, and mobile 390/375 with actual 44px and overflow assertions;
   - P01 catalog regression.
5. Retain sanitized screenshots/traces/results and disposable cleanup evidence. No private data or secrets.
6. Inspect `git diff` against `f109952ffd4141ec3c0855185fb7caa4c3ad3072`, run `git diff --check`, and remove unrelated changes/generated junk.

Do not weaken assertions, skip/disable tests, claim NOT-RUN evidence as PASS, or change production logic solely to satisfy a test. Commit by narrow remediation workstream, push the existing feature branch, update Draft PR #27, and report the new HEAD and CI links. Do not merge or deploy, and do not apply any migration to a persistent database.
