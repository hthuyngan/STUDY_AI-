# Antigravity Prompt — Curriculum Management UI Redesign

## Role and objective

You are Antigravity acting as a Senior Frontend Architect and implementation engineer for STUDY_AI. Implement the approved Curriculum Management UI redesign as a sequence of narrow, tested vertical slices. The target is a practical enterprise content workspace for thousands of multi-subject lessons: neutral, dense, accessible, responsive, and fully backed by real APIs and SQL.

This prompt does **not** authorize immediate implementation across all phases. Start only when the owner names an approved phase and its entry gate is satisfied.

## Mandatory reading and preflight

Before changing code:

1. Run `git status`, identify the current branch/upstream, inspect uncommitted work, fetch safely, and fast-forward only when the working tree is clean. Never overwrite, stash, merge, or delete other work automatically.
2. Read `AGENTS.md` completely and follow it.
3. Read:
   - `docs/plans/AI_TUTOR_MATH10_12_IMPLEMENTATION_PLAN.md`
   - `docs/prompts/ANTIGRAVITY_MATH10_12_MASTER_PROMPT.md`
   - `docs/curriculum-refactor/01-AUDIT-REPORT.md`
   - `docs/curriculum-refactor/02-ARCHITECTURE-PLAN.md`
   - `docs/curriculum-refactor/04-IMPLEMENTATION-PHASES.md`
   - `docs/curriculum-refactor/06-ACCEPTANCE-CRITERIA.md`
   - `docs/curriculum-refactor/UI-UX-REDESIGN-PLAN.md`
4. Read `.agents/skills/ui-ux/SKILL.md` and only the references required for app layout, tables, forms, empty states, and responsive behavior.
5. Inspect PR #24 and current CI. Do not disrupt or duplicate P00 remediation. Do not start the redesign until P00 is green and the owner has approved the target phase.
6. Inspect the current routes, page components, services, DTOs/OpenAPI, backend authorization, and tests directly related to the phase. Reconcile overlapping open PRs before editing; never blindly merge/cherry-pick.

Report a concise preflight summary before coding: current branch/commit, approved phase, verified contracts, reusable components, exact files in scope, DB/test environment, and blockers.

## Scope and phase gates

Implement **one approved phase at a time**:

- **P01 — Catalog shell:** grade, subject, curriculum, textbook series, edition list/filter/forms only after P01 APIs and RBAC are stable.
- **P02 — Primary redesign:** curriculum tree, chapter/lesson tables, ordering and lifecycle only after catalog relationships are stable.
- **P03 — Lesson composition:** objectives, content, knowledge and skills editor sections only after closed block/revision contracts are approved.
- **P04 — Resources:** optional video/document/link manager only after resource and URL validation contracts are approved.
- **P05 — Questions:** question mapping/editor section only after assessment-integrity contracts are approved.
- **P10 — Cleanup/hardening:** retire proven-dead duplicates and finish visual/accessibility polish only after all consumers have migrated.

Do not combine these phases. Do not pre-build controls for fields/endpoints that do not exist. If a required contract is missing or ambiguous, stop that slice and report **NEEDS VERIFICATION**; do not create a frontend-only substitute.

## Target experience

Follow `UI-UX-REDESIGN-PLAN.md` exactly:

- desktop-first split workspace with a curriculum tree on the left and server-driven data table on the right;
- filters for grade, subject, textbook/edition, and status only when live endpoints support them;
- URL-backed selection, search, filter, sorting, page, and page size;
- contextual bulk actions only when approved atomic backend endpoints exist;
- breadcrumb and one primary action per screen;
- short modal/drawer for simple CRUD; create lesson as a minimal draft then navigate to a dedicated editor;
- editor sections: Information, Objectives, Content, Knowledge & skills, Questions, Video & resources, Review & publish;
- keep the current Markdown editor if it meets the approved contract; do not introduce a complex editor for appearance;
- video is optional; no-video is valid;
- clear loading, empty, forbidden, error, conflict, and retry states;
- mobile tree/filter drawers and compact list rows, with no action bar covering content.

## Reuse and visual system

Use the existing React 19/TypeScript/Vite/Bun stack, CSS tokens in `frontend/src/styles/tokens.css`, Lucide icons, and current design-system components.

Prefer and improve the existing management family:

- `ManagementLayout`, `ManagementHeader`, `ManagementSidebar`
- `ManagementTable`, `ManagementPagination`, `ManagementFilter`
- `Button`, `IconButton`, `Breadcrumb`, `ConfirmDialog`
- `EmptyState`, `PageErrorState`, `Skeleton`, `StatusBadge`

Consolidate useful pagination from `AdminDataTable` and sorting/selection from `ManagementTable` without creating a third generic table. Reuse current form/modal primitives after verifying consistency. Extract domain components only at clear responsibility boundaries.

Visual rules:

- navy/blue plus neutral and semantic status colors;
- no gradient, glassmorphism, decorative statistic cards, large icon circles, unnecessary shadows, or row entrance animation;
- no new UI library unless the owner explicitly approves a written technical justification;
- no dark mode in this scope;
- use the existing 4/8px spacing scale, 6–8px control/surface radii, flat bordered tables/panels, and shadows only for overlays;
- visible focus, keyboard access, accessible sort/menu/dialog behavior, text labels for status, 44px mobile touch targets.

## Data and contract rules

These are blocking rules:

1. No mock data, sample rows, demo lessons, placeholder counts, hardcoded business IDs, hardcoded authors, hardcoded lesson/video/content, fake progress, fake API, or local runtime fallback.
2. Every displayed entity, count, relationship, status, completeness marker, and resource must come from the authenticated API and approved persisted data.
3. FE → API → backend → SQL must work end-to-end for every CRUD path in the phase. A management-created published lesson must appear exactly once in the learner projection; drafts and unpublished ancestors must remain hidden.
4. Use server-side search/filter/sort/pagination and the API total. Do not fetch a large page and `slice` it client-side to imitate pagination.
5. Do not change schema or API contracts unless that exact change belongs to the owner-approved phase and is documented before implementation.
6. Do not synthesize missing metadata. Show honest unknown/empty states.
7. Do not implement bulk mutations as silent client loops. Require approved atomic semantics and expose partial/conflict errors.
8. Preserve API failures and validation errors. Never close a form or show a success toast unless the server mutation succeeded.
9. Backend must enforce Admin/Content permissions. Hiding buttons is not authorization. Student/Teacher direct calls must be rejected.
10. Do not write, migrate, seed, reset, restore, truncate, import, or run write-oriented tests against protected `StudyAIDb`. Use `StudyAIDb_E2E` or disposable SQL with the fail-closed guard.

## Implementation boundaries

Modify only files required by the approved phase. Expected frontend scope may include:

- `frontend/src/routes/contentRoutes.tsx`
- `frontend/src/pages/Content/ContentCurriculumPage.tsx`
- `frontend/src/pages/Content/ContentChaptersPage.tsx`
- `frontend/src/pages/Content/ContentLessonsPage.tsx`
- `frontend/src/pages/Content/ContentLessonEditorPage.tsx`
- scoped Content CSS and new components under `frontend/src/pages/Content/components/curriculum/` or `lesson-editor/`
- existing management primitives when consolidation is required by at least two real consumers
- focused unit and Playwright specs.

Verify before changing:

- `frontend/src/services/education.service.ts`, `content.service.ts`, DTOs and generated/OpenAPI contracts;
- relevant backend controllers/services/repositories/query projections and RBAC;
- legacy Admin routes/pages and card-list imports before retiring anything.

Do not refactor unrelated modules, global navigation, learner UI, AI/adaptive code, or the whole design system. Do not delete files merely because they look legacy. Do not alter P00 remediation files unless the owner explicitly moves them into the same approved scope.

## Required implementation order for each slice

1. Confirm the server contract and RBAC behavior with focused tests or existing evidence.
2. Define the URL/query state and typed frontend mapping.
3. Extend the smallest reusable primitive needed; avoid page-specific duplicates.
4. Implement loading, empty, error, forbidden, conflict, and success states before decorative polish.
5. Implement responsive behavior at 1440, 1280, 1024, 768, and 390px.
6. Add focused unit/component tests.
7. Add Playwright happy/negative/responsive flows against isolated SQL.
8. Inspect the complete diff for scope, mock/hardcoded data, false success, accessibility, and unrelated changes.

## Required tests

For the affected phase, run and preserve logs for:

```text
cd frontend
bun install --frozen-lockfile
bun run lint
bun run test
bun run build
```

Run backend gates only with a verified isolated database when backend/contracts are affected:

```text
cd backend
dotnet restore StudyAI.sln
dotnet build StudyAI.sln
dotnet test StudyAI.sln
```

Before any integration/write test, prove the connection targets `StudyAIDb_E2E` or disposable SQL and that the database safety guard passes. Never print secrets.

Playwright coverage for the relevant slice must include:

- Admin/Content happy path and Student/Teacher 401/403;
- real empty state with no fabricated data;
- search/filter/sort/server pagination and URL refresh persistence;
- API/network failure with no false success;
- create/edit/archive/order and refresh read-back;
- lesson draft → edit → review/publish → learner visibility when P02 applies;
- unpublished ancestor invisibility;
- no video, invalid URL, valid URL, edit/remove/provider failure when P04 applies;
- keyboard/focus/dialog/menu/sort accessibility;
- visual snapshots at 1440×900, 1280×800, 1024×768, 768×1024, and 390×844.

Mask only nondeterministic timestamps/IDs. Do not mask layout defects. Do not disable, delete, loosen, or skip tests to make them pass. If tooling or environment is unavailable, report **NOT RUN** with the exact blocker; never claim PASS without logs.

## Completion checklist

Before finishing:

1. Run `git diff --check`.
2. Inspect `git status`, `git diff --stat`, and the full `git diff`.
3. Confirm the diff contains only the approved phase and no P00 or unrelated work.
4. Search the changed production paths for mock/demo/sample/fallback/hardcoded IDs and review every match.
5. Confirm no new UI dependency, schema change, API change, or migration slipped into a UI-only slice.
6. Confirm no editor action overlays content at 390px and all empty/error states are honest.
7. Record commands and actual PASS/FAIL/NOT RUN results, screenshots, known risks, and rollback notes in the phase document.

Do not commit or push unless the owner explicitly authorizes it for that implementation run. Never merge automatically.

## Required final report

Return a concise report containing:

1. approved phase and scope completed;
2. verified contracts and any `NEEDS VERIFICATION` items;
3. changed files and why each was necessary;
4. FE → API → backend → SQL behavior proven;
5. exact test commands and PASS/FAIL/NOT RUN results;
6. visual QA viewports and artifact paths;
7. diff audit results, remaining risks, and next phase gate;
8. commit/branch/PR only if explicitly authorized and actually created.
