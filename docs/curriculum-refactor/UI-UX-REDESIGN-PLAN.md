# Curriculum Management UI/UX Redesign Plan

**Status:** Design/audit only — no application code or API/schema change

**Reviewed branch/PR:** `feature/multi-subject-curriculum-refactor`, PR #24

**Application UI baseline audited:** `3bab931f12692a7ae1e6025a5310eb992fc99361`

**Repository synchronized before documentation commit:** `fd753068c748eb7856e7a56ee56250cc50f79396` (P00 test isolation only; no audited UI file changed)

**Audit date:** 2026-11-25
**Scope:** Curriculum Management, Chapter Management, Lesson Management, Content Lesson Editor

## 1. Executive decision

The target should be a compact enterprise content workspace, not a collection of dashboard cards. The recommended information architecture is:

1. one persistent curriculum tree on the left;
2. one server-driven table on the right for the selected level;
3. a short modal/drawer for simple entities;
4. a dedicated page for the multi-section lesson editor;
5. URL-backed selection, filters, sort, and pagination;
6. real empty/error/loading states, never illustrative production data.

Do not implement this redesign while P00 remediation is still red or while the catalog/lifecycle contracts are moving. Build the catalog shell with P01 only after its contracts are approved; implement the chapter/lesson workspace in P02; add editor sections incrementally in P03–P05; finish cross-page visual hardening in P10. This sequencing keeps the redesign from inventing fields or endpoints that the backend has not approved.

## 2. Evidence and constraints

### 2.1 Evidence reviewed

- Routes: `frontend/src/routes/contentRoutes.tsx`.
- Pages: `ContentCurriculumPage.tsx`, `ContentChaptersPage.tsx`, `ContentLessonsPage.tsx`, `ContentLessonEditorPage.tsx` and their CSS.
- Services: `frontend/src/services/education.service.ts` and `content.service.ts`.
- Existing primitives in `frontend/src/components/ui`, `frontend/src/components/admin/ui`, and `frontend/src/components/management`.
- Existing visual QA at desktop 1440px and mobile 390px under `docs/visual-qa/screenshots/content`.
- Phase boundaries in `docs/curriculum-refactor/04-IMPLEMENTATION-PHASES.md`.

This is a static code and screenshot audit. Runtime behavior not proven by an existing test or API contract is marked **NEEDS VERIFICATION**.

### 2.2 Non-negotiable constraints

- Reuse React 19, TypeScript, CSS tokens, Lucide icons, and current routing.
- Do not add a UI/table/editor library unless an approved spike proves that current primitives cannot meet accessibility or performance requirements.
- Do not change schema or API contracts as part of a visual refactor.
- Do not write to `StudyAIDb`; functional write tests use `StudyAIDb_E2E` or disposable SQL with the fail-closed guard.
- Do not add mock rows, sample lessons, placeholder video, client-side “success”, or hardcoded business IDs.
- Video is optional. Absence is an honest state, not a validation error.

## 3. UI audit findings

| ID | Priority | Finding and evidence | Impact | Design response |
|---|---|---|---|---|
| UI-01 | P1 | Curriculum, chapters, and lessons are separate list experiences without a persistent hierarchy. Navigation jumps between routes and loses context. | Users managing thousands of lessons repeatedly reselect subject/chapter and cannot see where they are in the tree. | Introduce one `CurriculumWorkspace` shell with a persistent tree, breadcrumb, and URL-backed selected node. |
| UI-02 | P1 | `ContentLessonEditorPage.tsx` is a long stack of `staff-card` sections. Current sections are Math-shaped (`Introduction`, `Definitions`, `Formulas`, `Examples`) rather than a generic multi-subject model. Visual QA shows the sticky action footer covering fields on desktop and 390px. | Slow scanning, excessive scrolling, hidden input, and a template that does not fit History/Biology. | Dedicated editor page with section navigation: Information, Objectives, Content, Knowledge & skills, Questions, Video & resources, Review & publish. Keep Markdown where sufficient. |
| UI-03 | P1 | `ContentLessonsPage.tsx` computes `filteredLessons` and applies `slice(...)` for pagination after fetching a large page. `education.service.ts` sends page/pageSize but returns only an item array, discarding the API `total`. Chapter filtering is also client-side. | Incorrect scale and counts, unnecessary transfer, stale pages, and no reliable thousands-row experience. | Make filter/sort/page state server-driven after the approved API returns items plus total; preserve query state in the URL. Do not fake server pagination in the UI. |
| UI-04 | P1 | The current lesson/chapter views do not expose a consistent selected-row/bulk workflow even though `ManagementTable` already supports selection. | Repetitive publish/archive/reassign operations and high click cost. | Add a contextual bulk bar only for actions backed by approved atomic endpoints. Do not implement bulk operations as silent client loops. |
| UI-05 | P1 | Chapter create defaults to a subject and derives a fallback name (`subjects[0]` / `math` / “Toán học 12”) in `ContentChaptersPage.tsx`. Service mappings also supply “Quản trị viên” when author is absent. | Multi-subject UI can display or submit invented business context. | Require an explicit DB-backed edition/subject selection; show unknown/missing metadata honestly. Remove business fallbacks in the corresponding data phase, not in a CSS-only change. |
| UI-06 | P2 | Chapter mobile UI renders each record as a tall card with repeated metadata and actions. The 390px visual QA becomes a very long list. | Poor information density and slow scanning. | Use compact list rows on narrow screens; keep title, status, hierarchy, and overflow action. Filters/tree move to drawers. |
| UI-07 | P2 | Large KPI/stat strips precede CRUD lists on subjects, chapters, and lessons. Counts are repeated and consume the first viewport. | The primary task—finding and editing content—is pushed down. | Remove decorative KPI strips from CRUD pages. Keep at most a compact result count in the table toolbar. |
| UI-08 | P2 | Visual vocabulary is inconsistent: generic flat management components coexist with page-specific cards, shadows, inline colors, and hand-built dialogs. `ContentLessonsPage.tsx` and `ContentChaptersPage.tsx` are oversized page components. | “AI-generated dashboard” feel, duplicated behavior, and expensive maintenance. | Standardize on existing semantic tokens and management primitives; extract domain components without adding a parallel design system. |
| UI-09 | P1 | Required grade, curriculum, textbook series/edition filters depend on P01 entities/contracts that are not yet stable. | Building filters now would require mock options or contract invention. | Render filters only from live catalog endpoints after P01. Before that, show only supported filters; no disabled fake catalog. |
| UI-10 | P1 | Destructive and publish actions are inconsistent; at least one flow uses `window.confirm`, while reusable `ConfirmDialog` exists. | Inconsistent keyboard/focus handling and weak consequence communication. | Use one accessible confirmation pattern with entity name, impact, and server error feedback. Keep delete/archive/publish permissions server-enforced. |
| UI-11 | P2 | Search/filter state is partly local and only partly initialized from search params. Back/forward/share behavior is not consistently preserved. | Lost context after edit/refresh and hard-to-share filtered views. | Define a canonical query model: `grade`, `subject`, `curriculum`, `edition`, `node`, `status`, `q`, `sort`, `direction`, `page`, `pageSize`. |
| UI-12 | P2 | Empty/error/loading components exist, but pages implement variations and some dialogs use inline loading/empty text. | Uneven feedback and increased false-success risk. | Reuse `Skeleton`, `EmptyState`, `PageErrorState`, and toast/error conventions with explicit retry. Empty curriculum must never generate sample content. |
| UI-13 | P2 | Inline icon buttons, narrow row controls, and the sticky editor footer create accessibility risks. Sorting is attached to table headers without a dedicated button/`aria-sort`. | Keyboard and touch use are fragile; mobile controls can obscure content. | 32–36px desktop controls, 44px touch target on mobile, visible focus, labeled menu buttons, semantic sortable headers, and no overlay on editor content. |
| UI-14 | P2 | Two table families (`AdminDataTable` and `ManagementTable`) plus page-specific tables overlap. `ManagementTable` has sorting/selection; `AdminDataTable` has pagination. | Continued duplication if the redesign adds another table. | Consolidate capabilities into the existing management table family in a scoped refactor; do not create a third generic table. |

## 4. Target information architecture

```text
Content Management
└── Curriculum
    ├── Catalog: grades / subjects / curricula / textbook series / editions
    ├── Structure: edition / chapters / lessons
    └── Lesson editor
        ├── Information
        ├── Objectives
        ├── Content
        ├── Knowledge & skills
        ├── Questions
        ├── Video & resources
        └── Review & publish
```

The tree is a navigator, not a second source of truth. Counts, labels, status, and hierarchy must come from the same API projection used by the table. Selecting a node updates the URL and table query.

## 5. Wireframes

### 5.1 Curriculum workspace — desktop (recommended)

```text
┌ Breadcrumb: Content / Curriculum / Grade 10 / Mathematics ────────────────┐
│ Curriculum management                         [Import*] [Create ▾]         │
├────────────────────────────────────────────────────────────────────────────┤
│ [Grade ▾] [Subject ▾] [Textbook ▾] [Status ▾] [Search____________] [Reset] │
├────────────── Curriculum tree ─────────┬──────── Selected node / table ─────┤
│ ▾ Grade 10                            │ Mathematics · Horizon 2026          │
│   ▾ Mathematics                       │ 24 chapters · 318 lessons           │
│     ▾ Horizon · Edition 2026          │ ┌─────────────────────────────────┐ │
│       • Overview                      │ │☐ Order  Chapter  Lessons Status │ │
│       ▾ Ch. 1 Sets                    │ │☐ 01     Sets     12      Draft  │ │
│       ▸ Ch. 2 Functions               │ │☐ 02     Functions 18    Published│ │
│   ▸ History                           │ └─────────────────────────────────┘ │
│ + Empty edition                       │ 1–25 of 84   [25 ▾]       ‹ 1 2 3 › │
└───────────────────────────────────────┴────────────────────────────────────┘
* Show only if the existing role and approved phase support it.
```

Behavior:

- Tree width: 280px default, 240–360px allowed if resizing is implemented accessibly.
- Tree and table each scroll inside the workspace; page header and filter toolbar remain visible.
- A node has one primary click target. Actions live in its context menu, not as many inline icons.
- Table uses server pagination/sort/filter. First descriptive column and actions may be sticky on constrained desktop widths.

### 5.2 Chapter/lesson table

```text
┌ Chapter 2: Functions                                  [Create lesson] ┐
│ [Status ▾] [Completeness ▾*] [Search title/code_______] [Sort ▾]      │
│ ☐  Order  Lesson                 Content  Resources  Status   Updated │
│ ☐  01     Domain and range       Complete  1 video   Published 25 Nov │
│ ☐  02     Linear functions       Missing   None      Draft     24 Nov │
│ ───────────────── selected: 2 ── [Submit review*] [Archive*] ──────── │
│ 1–25 of 318    [25 ▾]                                  ‹ 1 2 3 ... › │
└───────────────────────────────────────────────────────────────────────┘
```

`*` Only when a real field/endpoint exists. “Missing” is calculated from approved persisted fields, never guessed from title or client placeholders.

### 5.3 Simple create/edit flow

```text
┌ Create chapter ──────────────────────────────────── × ┐
│ Edition        [Horizon 2026 (read-only context)]     │
│ Name           [___________________________________] │
│ Durable code   [___________________________________] │
│ Order          [____]                                │
│ Status         [Draft ▾]                             │
│                                                     │
│                                   [Cancel] [Create] │
└─────────────────────────────────────────────────────┘
```

- Grade/subject/curriculum/edition/chapter use a short modal or side drawer when fields fit one viewport.
- Lesson creation asks only for required identity and placement, saves a draft, then navigates to the full editor.
- Validation stays adjacent to the field; server errors remain visible and never trigger a success toast.

### 5.4 Lesson editor — desktop

```text
┌ Content / … / Chapter 2 / Linear functions ───────────────────────────────┐
│ Linear functions   Draft · Saved 10:42      [Preview] [Save] [Submit ▾]   │
├──────── Sections ────────┬──────── Editor canvas ─────────┬── Workflow ───┤
│ • Information            │ Section heading                │ Status: Draft │
│ • Objectives             │ [form / Markdown editor]       │ Owner         │
│ • Content                │                                │ Validation    │
│ • Knowledge & skills     │ [Save section]                 │ 2 issues      │
│ • Questions              │                                │ Last updated  │
│ • Video & resources      │                                │ Review history│
│ • Review & publish       │                                │               │
└──────────────────────────┴────────────────────────────────┴───────────────┘
```

- Left section nav: 216–240px. Workflow rail: 280–300px, collapsible below 1280px.
- The center column uses the current Markdown editor where it meets the contract. Do not introduce a block editor merely for appearance.
- Information/objectives/skills/questions/resources are structured forms only when their persisted contracts exist.
- No fixed footer over the canvas. Save/publish actions stay in the sticky page header or in normal document flow.
- “No video” is a valid state with “Add resource”; invalid URLs show validation and are never replaced with a demo URL.

### 5.5 Tablet and mobile

```text
390px
┌ Curriculum                                      + ┐
│ [Filters (3)] [Search__________________________]  │
│ Path: Grade 10 / Mathematics / Horizon            │
│ ┌ 01  Sets                              Draft  ⋮ ┐ │
│ │ 12 lessons · updated 25 Nov                    │ │
│ └────────────────────────────────────────────────┘ │
│ ┌ 02  Functions                       Published ⋮┐ │
│ │ 18 lessons · updated 24 Nov                    │ │
│ └────────────────────────────────────────────────┘ │
│ 1–25 of 84                              ‹ 1 2 ›   │
└────────────────────────────────────────────────────┘
```

- Under 1024px, tree becomes a “Browse curriculum” drawer; filters become a separate drawer.
- Under 768px, table becomes compact semantic rows, not oversized dashboard cards. Keep only the critical metadata; details open on tap.
- Lesson editor section navigation becomes a select/drawer; workflow becomes a dedicated tab/sheet.
- Bottom actions must occupy their own layout space and respect safe areas; never overlay input fields.

## 6. User flows

### 6.1 Find and edit an existing lesson

1. Open Curriculum Management.
2. Choose grade, subject, textbook/edition from live filters.
3. Select a chapter in the tree; URL records the selection.
4. Search/sort the lesson table; open the lesson.
5. Edit one or more sections and save through the real API.
6. Reload and verify persisted content; validation/review status remains server-derived.
7. Submit/publish only if the backend allows the transition and the role has permission.

### 6.2 Create a lesson

1. Select an edition and chapter.
2. Open “Create lesson”; provide only required metadata.
3. Backend creates a draft and returns its ID.
4. UI navigates to `/content/lessons/:id`.
5. Author completes sections progressively; video remains optional.
6. Review validation issues, submit for review, then publish through approved transitions.
7. Published lesson appears exactly once in the learner projection; draft/unpublished ancestors remain hidden.

### 6.3 Empty curriculum

1. API returns an empty result, not an error.
2. Show a concise empty state explaining what is absent.
3. Show a create action only for an authorized role and only when the parent context exists.
4. Never populate sample curriculum, lesson, count, author, video, or progress.

### 6.4 Failure and authorization

1. Keep the current form and user input visible.
2. Show the server error and retry path; do not close the dialog or show success.
3. A 401 leads to the existing authentication flow; a 403 shows a forbidden state.
4. Student/Teacher roles must be rejected by the backend even if they construct the management URL manually.

## 7. Design tokens and visual rules

Use existing values from `frontend/src/styles/tokens.css`; the names below are usage rules, not a new theme.

| Concern | Rule |
|---|---|
| Canvas/surface | `--surface-page`, `--surface-card`, `--surface-sunken`; one bordered surface per functional region. |
| Color | Navy/blue primary plus semantic status colors. No gradients, glass, subject-colored page chrome, or decorative icon circles. |
| Text | Existing Inter/system stack; 24–26px page title, 18–20px section title, 14–15px body, 12–13px metadata. |
| Spacing | Existing 4/8px scale. Page padding 16–24px; toolbar gap 8–12px; section gap 16–24px. |
| Controls | 32px compact and 36–40px default on desktop; 44px touch target on mobile. |
| Rows | 44–52px normal table row; multi-line rows capped at two lines before truncation. |
| Radius | 6px controls, 8px functional surfaces, 12px dialogs. Avoid nested large-radius cards. |
| Border/shadow | `--border-default`; no shadow for inline panels/tables. Use `--shadow-lg` only for modal/popover layers. |
| Icons | Lucide 16–18px. Icon-only actions require accessible names and tooltips; prefer one overflow menu per row. |
| Motion | Existing 100–150ms transitions only for state feedback; respect reduced motion. No entrance animation for list rows. |
| Status | Reuse `StatusBadge`; status must include text, never color alone. |
| Focus | Visible `--ui-focus-ring`; keyboard focus order follows visual order. |

Do not add dark mode in this scope. Do not duplicate token values in page CSS; add a semantic alias only if repeated usage proves a gap.

## 8. Component inventory

### 8.1 Reuse directly

| Existing component | Intended use |
|---|---|
| `Button`, `IconButton` | Primary/secondary/row actions. |
| `Breadcrumb` | All workspace/editor hierarchy. |
| `ConfirmDialog` | Delete/archive/publish confirmations. |
| `FilterBar` / `ManagementFilter` | Canonical filter toolbar after choosing one family. |
| `EmptyState`, `PageErrorState`, `Skeleton` | Honest list/editor states. |
| `StatusBadge` | Draft/review/published/archived labels. |
| `ManagementTable` | Preferred base: already has sort and row selection. Extend it instead of creating a third table. |
| `ManagementPagination` | Server pagination footer. |
| `ManagementLayout`, `ManagementHeader`, `ManagementSidebar` | Existing enterprise shell and typography. |
| `AdminInput`, `AdminSelect`, `AdminModal`, `AdminTabs` | Reuse only if styling is reconciled with management primitives; avoid mixing both families within one screen. |

### 8.2 Add only when implementation begins

| Proposed component | Responsibility |
|---|---|
| `CurriculumWorkspace` | Split-pane layout and responsive drawers; no data fetching. |
| `CurriculumTree` | Accessible hierarchical navigation with loading/empty/error states. |
| `CurriculumFilterBar` | URL-backed live catalog filters. |
| `CurriculumEntityTable` | Domain configuration over the consolidated `ManagementTable`. |
| `BulkActionBar` | Selected count and approved atomic operations. |
| `EntityFormDialog` | Shared short CRUD shell; entity-specific fields supplied as children/config. |
| `LessonEditorShell` | Header, section navigation, canvas, and workflow rail. |
| `LessonSectionStatus` | Persisted completeness/validation state only. |
| `ResourceManager` | Optional video/document/link list in P04. |

Do not make these “universal” components prematurely. Extract after two real call sites or when a page exceeds a clear responsibility boundary.

### 8.3 Consolidate or retire after proof

- Consolidate `AdminDataTable` capabilities (pagination) and `ManagementTable` capabilities (sort/selection) into the management family.
- Replace hand-built page dialogs with the shared modal/confirm primitives.
- Verify whether `AdminLessonsPage.tsx` and card-list components are still routed/imported before removal. Do not delete based on filename alone.

## 9. File impact plan

### 9.1 Expected files to modify in approved implementation phases

- `frontend/src/routes/contentRoutes.tsx` — preserve route compatibility; add redirects only when approved.
- `frontend/src/pages/Content/ContentCurriculumPage.tsx`
- `frontend/src/pages/Content/ContentChaptersPage.tsx`
- `frontend/src/pages/Content/ContentLessonsPage.tsx`
- `frontend/src/pages/Content/ContentLessonEditorPage.tsx`
- `frontend/src/pages/Content/ContentPages.css`
- `frontend/src/pages/Content/ContentChaptersPage.css`
- `frontend/src/components/management/ManagementTable.tsx`
- `frontend/src/components/management/ManagementPagination.tsx`
- `frontend/src/components/management/ManagementFilter.tsx`
- `frontend/src/components/management/ManagementLayout.css`
- new scoped components under `frontend/src/pages/Content/components/curriculum/` and `.../lesson-editor/`.
- relevant Vitest/Testing Library and Playwright specs under the existing test structure.

### 9.2 Files to verify before modifying

- `frontend/src/services/education.service.ts`, `content.service.ts`, DTO/types, and generated/open API contract.
- `frontend/src/components/admin/ui/*` and `frontend/src/components/ui/*` for duplication.
- backend content controller/service/repository/query files introduced by P01–P05.
- RBAC policies and learner read projection used by P02/P06.
- legacy Admin routes/pages and imports before retiring anything.

### 9.3 Out of scope

- Backend schema, migrations, endpoint shapes, seed/import data, learner visual redesign, AI/adaptive modules, global navigation redesign, or a new rich-text framework.

## 10. Phase plan and gates

| Phase | UI work allowed | Entry gate | Exit evidence |
|---|---|---|---|
| P00 | Documentation/audit only. | Current remediation work remains isolated. | No application diff; P00 CI green. |
| P01 | Catalog list/filter/form shell for grade, subject, curriculum, series, edition. | P01 DTO/query contracts and RBAC approved. | Real CRUD, server page/filter/sort, empty/error/403, refresh persistence. |
| P02 | Split curriculum tree, chapter/lesson tables, draft/review/publish lifecycle, learner link verification. | Catalog IDs and edition relationships stable. | Management → SQL_E2E → Student projection passes; no duplicate lesson. |
| P03 | Editor sections for objectives/content/knowledge/skills and revisions. | Closed block and revision contracts approved. | Editor/renderer round-trip and malformed content tests pass. |
| P04 | Optional Resource Manager. | Resource contract and URL validation approved. | Add/edit/remove/no-video/invalid-video tests pass. |
| P05 | Question section and assessment mapping. | Integrity-safe question contract approved. | No answer leakage; missing questions show honest empty state. |
| P10 | Remove proven-dead UI duplication and complete visual/accessibility hardening. | All consumers migrated and relevant E2E green. | Visual matrix, keyboard, performance, and regression gates pass. |

The principal redesign starts in **P02**, after the P01 catalog foundation is stable. P01 may establish the reusable shell, but it must not pre-build chapter/lesson UI against speculative contracts.

## 11. Acceptance criteria

### 11.1 Information architecture and density

- Desktop 1280px and above shows tree + table without decorative KPI cards.
- A user reaches any lesson from curriculum root in no more than three hierarchy interactions.
- Table shows at least title, hierarchy/context, status, updated date, and actions; columns reflect actual DTO fields only.
- Search, filters, sort, page, page size, and selected node survive refresh/back/forward through URL state.

### 11.2 Data and behavior

- Every displayed record/count/status comes from the authenticated API; no runtime mock, placeholder, hardcoded ID, author, video, or success.
- Filters and pagination operate server-side and expose the API total.
- Create/edit/archive/publish persists to isolated SQL and is correct after refresh.
- Management-created published content appears exactly once in learner API/UI; draft or unpublished ancestors are invisible.
- Empty catalog/edition/chapter/lesson/resource/question states remain empty and actionable without sample data.
- No-video lesson is valid; invalid media URL is rejected or represented honestly per P04 contract.
- API failure preserves input and shows error; it never closes the form or reports success.
- Backend enforces Admin/Content permissions; Student/Teacher direct requests receive 401/403 as applicable.

### 11.3 Responsive and accessibility

- Verified at 1440, 1280, 1024, 768, and 390px.
- No editor action bar covers content; no page-wide horizontal overflow. A data table may have an intentional labeled horizontal scroller.
- Tree, dialogs, menus, sortable headers, and editor sections are usable by keyboard with visible focus.
- Dialog focus is trapped/restored; destructive confirmations state the entity and impact.
- Status and validation do not rely on color alone; icon buttons have accessible names.
- Touch targets are at least 44px at 390px.

### 11.4 Engineering

- No new UI library without written approval and bundle/accessibility evidence.
- No schema/API contract modification hidden inside the UI PR.
- No unrelated refactor or deletion of unverified legacy files.
- Frontend lint/test/build and affected Playwright tests pass; backend/integration gates run only when the phase changes their contracts.
- `git diff` contains only the approved phase and does not alter P00 remediation.

## 12. Playwright visual and functional test plan

Use deterministic fixtures in `StudyAIDb_E2E` or disposable SQL. Never use `StudyAIDb` and never depend on production data.

### 12.1 Functional scenarios

1. **Role gate:** Admin and Content can open management; Student/Teacher direct navigation and API calls are denied.
2. **Empty state:** empty catalog and empty edition show no fabricated rows/counts and only authorized actions.
3. **Browse state:** select grade → subject → edition → chapter; URL and table update; refresh restores state.
4. **Server query:** search/filter/sort/page/pageSize send expected parameters and render API `total`.
5. **API failure:** list and mutation 500/network failures show error/retry and no success toast.
6. **Chapter CRUD:** create/edit/order/archive with validation; reload proves persistence.
7. **Lesson lifecycle:** create draft → edit → reload → submit/review/publish → learner page shows it once.
8. **Unpublished chain:** unpublished edition/chapter/lesson is absent from learner API/UI.
9. **Bulk actions:** selection and confirmation work only for approved atomic endpoints; partial/error responses remain explicit.
10. **Editor:** navigate all seven sections, preserve unsaved input on server error, and warn before leaving when dirty.
11. **Resources:** no video, valid URL, invalid URL, edit, remove, provider failure; no placeholder fallback.
12. **Questions:** missing questions are empty; protected answers are not exposed before submission.
13. **Concurrency:** stale edit receives the approved conflict response and does not silently overwrite.
14. **Accessibility:** tab order, focus restoration, `aria-sort`, dialog/menu keyboard use, and automated axe checks.

### 12.2 Visual snapshots

Capture at 1440×900, 1280×800, 1024×768, 768×1024, and 390×844:

- catalog workspace: populated, loading, empty, error;
- chapter table and lesson table: default, filters open, selected/bulk state;
- create/edit dialog: default, validation, server error;
- lesson editor: each section, workflow errors, no-resource state;
- long Vietnamese titles, long breadcrumb, and maximum status text;
- drawer/filter/menu/dialog focus states on 390px.

Mask only nondeterministic timestamps/IDs. Do not mask layout defects. Use stable seeded E2E data with explicit provenance as test fixtures, not runtime demo data. Keep visual thresholds low and review every intentional baseline update.

## 13. Open verification items

- **NEEDS VERIFICATION:** exact P01 server query names and response envelope for catalog filtering/sorting/pagination.
- **NEEDS VERIFICATION:** atomic bulk endpoints and which lifecycle transitions each role may execute.
- **NEEDS VERIFICATION:** whether completeness/validation status is persisted or must be introduced by an approved content phase.
- **NEEDS VERIFICATION:** active imports/routes for legacy Admin pages and card-list components before retirement.
- **NEEDS VERIFICATION:** concurrency/version semantics for editor saves.
- **NEEDS VERIFICATION:** whether the current Markdown editor fully supports accessible tables, media references, and subject-neutral blocks required by P03.

These items are gates, not permission to invent client behavior.
