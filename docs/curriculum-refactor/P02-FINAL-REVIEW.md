# P02 Final Review — Multi-Subject Curriculum — PR #27

**Review date:** 2026-11-25  
**PR:** [#27](https://github.com/hthuyngan/STUDY_AI-/pull/27)  
**Base:** `f109952ffd4141ec3c0855185fb7caa4c3ad3072`  
**Reviewed HEAD:** `fddea7116a0f475f7559fa9c780e0c4aa9f1b3b7`  
**CI:** [45638944076](https://github.com/hthuyngan/STUDY_AI-/actions/runs/45638944076), success on the reviewed HEAD

## Verdict

**P02 CODE READINESS — BLOCKED**

The additive schema direction, canonical lifecycle endpoints, basic four-eyes checks, server-side list queries, and disposable CI runs are useful progress. The merge gate remains blocked because the shipped lesson editor cannot mutate canonical P02 lessons, the learner frontend does not consume the new edition-aware projection, canonical learner checks can be bypassed or fail on adjacent endpoints, rollback/data-integrity requirements are incomplete, and required Playwright evidence is neither CI-backed nor broad enough for the accepted matrix.

No application code, migration, database data, or test fixture was changed during this review. No test suite was rerun because direct code evidence establishes the blockers and CI already proves the existing suites are green.

## Preflight and evidence

- Local branch and upstream: `feature/p02-multi-subject-curriculum-lifecycle`, clean, at expected HEAD; no pull was needed.
- PR base/head and four W1–W4 commits match the request.
- CI checked out `fddea7116a0f475f7559fa9c780e0c4aa9f1b3b7` in all jobs.
- Frontend CI: lint `0` warnings/errors, `87` test files passed, production build passed.
- Backend CI: unit `295/295` in both jobs; integration `265/265` in two independent `StudyAIDb_Clean_{GUID}` databases; both CI databases reported remaining count `0`.
- The workflow does not execute `e2e_p02_curriculum_workspace_playwright.ts` or the P01 Playwright runner. No committed screenshots, trace, report, or durable Playwright artifact was found for PR #27.
- UI audit: the repository already has semantic tokens and `Button`, `Breadcrumb`, `ManagementTable`, and `ManagementPagination`; P02 adds a separate raw table/pagination family.

## Findings

### P02-F01

- **Severity:** P1
- **Area:** W2 — lesson editor / concurrency / lifecycle
- **File:line evidence:**
  - `frontend/src/services/content.service.ts:149-177,180-227,234-250`
  - `frontend/src/hooks/useContent.ts:197-249`
  - `frontend/src/pages/Content/ContentLessonEditorPage.tsx:166-239,763-813`
  - `backend/src/StudyAI.Api/Features/Content/ContentLessonsService.cs:364,503-581`
- **Root cause:** The workspace links each lesson to the pre-existing editor, but its DTO drops `rowVersion`; save, submit-review, and publish requests therefore omit the mandatory concurrency token. The editor also offers direct publish without the separate approve step/four-eyes flow required by the new state machine.
- **User/business impact:** A newly created edition-linked lesson opens in the editor but save/submit/publish fails. The central P02 authoring flow is not end-to-end and users can lose confidence that edits persist after reload.
- **Minimal correction:** Add `rowVersion` to `LessonEditorData`, map it from every response, send it on save and every lifecycle action, refresh it after success, expose actions allowed by current status/role, and retain the form on 403/409/API failure. Do not redesign P03–P05 content blocks.
- **Regression test required:** Component plus Playwright flow: create lesson in workspace → open editor → edit supported content → save → reload → submit → independent reviewer approve → publish; stale second session returns visible 409 without false success.

### P02-F02

- **Severity:** P1
- **Area:** W3 — learner end-to-end integration
- **File:line evidence:**
  - `backend/src/StudyAI.Api/Features/Student/StudentCurriculumController.cs:73-77`
  - `frontend/src/services/curriculum.service.ts:119-147`
  - PR frontend diff contains only management navigation/page/service files; no learner route, page, or client consumes `/api/v1/curriculum/editions/{editionId}/chapters`.
- **Root cause:** W3 added an edition-aware backend projection but did not connect the learner frontend to it. Existing learner navigation still starts from legacy subject/chapter endpoints.
- **User/business impact:** Content created and published through the P02 management flow can be present in SQL and the new API yet remain absent from the actual learner curriculum UI. This fails the primary Management → DB → Student UI acceptance path.
- **Minimal correction:** Extend the existing learner client/routes to select and carry real grade/subject/curriculum/edition/chapter/lesson IDs, call the edition-aware endpoint, preserve explicit legacy compatibility, and render honest empty/video-optional states. Do not create a parallel curriculum engine.
- **Regression test required:** Browser test using real APIs: publish two subjects/editions, load learner UI, verify each lesson appears exactly once under the correct edition, survives refresh/deep link, and draft/archived content is absent.

### P02-F03

- **Severity:** P1
- **Area:** W3 — publication boundary / practice compatibility
- **File:line evidence:**
  - `backend/src/StudyAI.Api/Features/Student/StudentCurriculumService.cs:421-428,464-471,528-537,579-589`
- **Root cause:** Direct lesson/video visibility uses `legacyVisible || canonicalVisible`. A dual-linked chapter can therefore bypass an unpublished/archived canonical ancestor through an active legacy subject. In the opposite direction, question retrieval/check-answer still requires the legacy `Chapter.Subject`; a canonical chapter with nullable `SubjectId` can display its lesson but cannot serve/check its questions.
- **User/business impact:** Unpublished canonical content can leak after transitional linking, while valid multi-subject canonical lessons can break practice/questions. The learner, AI/adaptive, and assessment context is not consistently edition-aware.
- **Minimal correction:** If `CurriculumEditionId` is present, require only the complete canonical published chain and never fall back to legacy visibility. Use legacy checks only when no canonical mapping exists. Apply the same helper/predicate consistently to lesson, video, questions, check-answer, topic/material consumers affected by P02, and return explicit IDs rather than Math/default context.
- **Regression test required:** Matrix for canonical-only, legacy-only, and dual-linked rows across every direct learner endpoint; unpublished grade/subject/curriculum/edition/chapter/lesson must return 404, canonical questions must work, and no draft content may reach AI/practice context.

### P02-F04

- **Severity:** P1
- **Area:** W1 — migration rollback and uniqueness
- **File:line evidence:**
  - `backend/src/StudyAI.Api/Migrations/20261125134024_AddCurriculumLifecycleChaptersLessons.cs:89-137`
  - `backend/src/StudyAI.Api/Data/StudyAIDbContext.cs:559-567`
  - `backend/src/StudyAI.Api/Features/Content/ContentLessonsService.cs:280-288,375-382`
- **Root cause:** `Down` makes `content_chapters.SubjectId` non-null after dropping `CurriculumEditionId`, but canonical P02 chapters legitimately have null `SubjectId`; the migration supplies a default but does not safely transform or reject those existing rows. In addition, slug uniqueness is checked only in application code; the database has no unique `(ChapterId, Slug)` constraint, so concurrent creates can commit duplicates.
- **User/business impact:** A rollback after canonical data exists is not executable/safe, and concurrent writes can corrupt durable lesson identity despite the accepted schema contract.
- **Minimal correction:** Define and test an explicit rollback boundary for canonical rows (fail with an actionable guard or a separately approved reversible mapping; never invent a subject). Add a normalized, scoped filtered unique index for `(ChapterId, Slug)` and translate unique conflicts to 409. Keep the migration additive and do not touch `StudyAIDb` during remediation.
- **Regression test required:** Production-shaped disposable migration up → insert canonical chapter/lesson → down behavior test; concurrent duplicate code/slug create/update tests proving one success and one 409 with no duplicate rows.

### P02-F05

- **Severity:** P1
- **Area:** W1 — retention / destructive CRUD
- **File:line evidence:**
  - `backend/src/StudyAI.Api/Features/Content/ContentLessonsService.cs:409-437`
  - `backend/src/StudyAI.Api/Data/StudyAIDbContext.cs:573-599`
- **Root cause:** `DELETE /content/lessons/{id}` permits physical deletion of any lesson status when no `LessonProgress` exists. It does not require an unreferenced draft and model relationships cascade videos and assessments.
- **User/business impact:** Staff can physically delete published/reviewed curriculum and dependent assessment/resource data, violating archive-first retention and risking loss of learning assets not covered by the single progress check.
- **Minimal correction:** Make archive the normal action. Permit hard delete only for a draft proven unreferenced across all dependent/historical tables under an explicit admin policy, or disable hard delete for canonical P02 lessons. Return a validation error directing users to archive.
- **Regression test required:** Published/review/approved and referenced draft deletion denied; canonical archive preserves questions, assessments, videos, progress, attempts, notes/bookmarks/conversations; only the explicitly allowed unreferenced draft case may delete.

### P02-F06

- **Severity:** P2
- **Area:** W2 — ordering and URL/server-state behavior
- **File:line evidence:**
  - `frontend/src/pages/Content/CurriculumWorkspacePage.tsx:111-117,173-204,331-349,562-583,726-748`
  - `backend/src/StudyAI.Api/Features/Content/ContentLessonsService.cs:440-481`
- **Root cause:** Lesson reorder sends only the currently displayed page/filter result, while the backend correctly requires the exact full chapter scope. Chapter reorder has a client method but no workspace control. `pageSize` is fixed rather than URL-backed, and query updates use history replacement, so browser Back cannot restore prior filter states.
- **User/business impact:** Reorder fails for chapters with more than 20 lessons or active filters—the exact large-catalog case P02 targets—and the promised chapter ordering/back-forward behavior is absent.
- **Minimal correction:** Provide a safe full-scope ordering interaction/endpoint contract independent of paged filtered results, expose chapter ordering, URL-back `pageSize`, and use navigable history for user filter changes while reserving replace for normalization.
- **Regression test required:** More-than-one-page chapter/lesson ordering, filtered view ordering policy, stale row versions, refresh and browser back/forward restoration.

### P02-F07

- **Severity:** P2
- **Area:** W2/W4 — UI contract and evidence
- **File:line evidence:**
  - `frontend/src/pages/Content/CurriculumWorkspacePage.tsx:136-160,589-748,791-827`
  - `frontend/src/pages/Content/CurriculumWorkspacePage.css:101-148,205-251`
  - `frontend/src/pages/Content/CurriculumWorkspacePage.test.tsx:1-111`
  - `scripts/e2e_p02_curriculum_workspace_playwright.ts:133-253`
  - `.github/workflows/ci.yml:38-44,108-112`
- **Root cause:** Catalog cascade failures are converted to empty lists; the workspace creates a new raw table/pagination/form family instead of management primitives; mobile keeps the desktop table/actions rather than compact rows/filter drawer. The component suite has only two focused scenarios. The Playwright script is not run by CI, does not assert its measured touch height, and omits validation, archive/unpublish/reactivate, reorder, editor persistence, request-changes, learner UI, AI/adaptive context, P01 regression, screenshots/traces, and several required permission cases.
- **User/business impact:** API failures can look like empty catalogs; responsive/accessibility claims are not demonstrated; CI green does not establish the P02 visual/functional acceptance matrix.
- **Minimal correction:** Reuse/extend the existing management primitives, distinguish catalog error from empty, implement the approved mobile layout, add the missing focused tests, and run the guarded P02 plus P01 regression Playwright jobs on the final remediation SHA with durable artifacts. No new UI library.
- **Regression test required:** The accepted AC-P02-UI/TEST matrix, including 1440/1280/1024/768/390/375, 44px assertions, no inner/page overflow, screenshots, API failure/no false success, forbidden/conflict, editor refresh persistence, and P01 regression.

## Workstream assessment

| Workstream | Result | Notes |
|---|---|---|
| W1 — backend/database | **BLOCKED** | Core lifecycle exists, but rollback, DB slug uniqueness, and destructive delete policy fail accepted requirements. |
| W2 — management UI | **BLOCKED** | Real API workspace exists, but the dedicated editor is incompatible with canonical concurrency/workflow; ordering and responsive/state requirements are incomplete. |
| W3 — learner/AI | **BLOCKED** | Backend projection exists; learner UI integration is absent and visibility/practice predicates are inconsistent. |
| W4 — evidence | **BLOCKED** | CI unit/integration/frontend gates are real and green; required Playwright/visual/AI/P01 regression evidence is not durable or complete. |

## Gate decision

Do not merge PR #27 and do not apply the P02 migration to `StudyAIDb`. Remediate only P02-F01 through P02-F07 on the feature branch, run targeted tests during each fix, then run the required final CI and guarded Playwright gates at one immutable application SHA. Database cleanup, curriculum import, `StudyAIDb_E2E` retirement, and P03+ remain out of scope.
