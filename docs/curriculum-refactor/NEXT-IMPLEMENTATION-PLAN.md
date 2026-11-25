# Next Implementation Plan — Integration, Database, Cleanup, and P02

**Plan date:** 2026-11-25

**Planning baseline:** `be856ebaa7ed302cf0cc40e078bafb7b53f1e3a3` (PR #26 accepted HEAD)

**Documentation branch:** `codex/docs-p02-integration-plan`

**Mode:** architecture/review only; no application code, merge, migration, import, or data mutation was performed

## 1. Evidence and decisions

### 1.1 Git and PR preflight

The repository was clean and exactly matched `origin/feature/database-environment-isolation` before this documentation branch was created. `git fetch --all --prune` completed without changing the reviewed HEAD.

| PR | Head | Base | State | Current CI evidence | Gate |
|---|---|---|---|---|---|
| #24 — P00 | `bc969b56ca75bff7acc3b1777cadc69543c21a89` | `feature/backend-redesign-modular-monolith` | Draft, mergeable | run `45531835806`, FE and BE success | PASS |
| #25 — P01 | `1baa9de8b26fab37b203e696204e26b5cd77c8a6` | PR #24 branch | Draft, mergeable | run `45541102294`, FE and BE success | CONDITIONAL PASS |
| #26 — ENV-01/ENV-02 | `be856ebaa7ed302cf0cc40e078bafb7b53f1e3a3` | PR #25 branch | Draft, mergeable | run `45590636859`, FE plus two isolated BE runs success | PASS |

P01 code acceptance is satisfied for the additive five-entity catalog: real SQL CRUD, server pagination/search/filter/sort, optimistic concurrency, audit rollback, RBAC, empty state, and zero catalog seeding are covered by `ContentCatalogIntegrationTests.cs`, `ContentCatalogPage.test.tsx`, and `e2e_catalog_p01_playwright.ts`. PR #26 then ran the complete backend suite twice on independent disposable databases at the stacked application SHA.

Before integration, the owner must explicitly close the remaining P01 governance gate: accept the compatibility-mapping report or record that legacy backfill is deferred. The rehearsed production snapshot contains `21` legacy subjects with `0` mapped, `13` unmapped, and `8` conflicts. No automatic mapping or name-based backfill is allowed. Also update the ADR status after the owner decision; it still says P01 schema migration is pending.

### 1.2 Current architecture audit

P01 should be reused, not duplicated:

- Catalog entities and SQL mappings: `backend/src/StudyAI.Api/Models/CatalogEntities.cs` and `StudyAIDbContext.cs`.
- Catalog API/service: `ContentCatalogController.cs`, `ContentCatalogService.cs`, `IContentCatalogService.cs`, and `ContentCatalogDTOs.cs`.
- Catalog UI/API client: `ContentCatalogPage.tsx`, `CatalogParentSelect.tsx`, `catalog.service.ts`, and `catalog.ts`.
- Shared UI: `tokens.css`, `components/management/*`, `components/ui/Breadcrumb`, `Button`, `ConfirmDialog`, `Skeleton`, `PageErrorState`, and `StatusBadge`.
- Existing chapter, lesson, workflow, revision, video, and learner services remain the starting point. Do not create parallel controllers for each subject.

Confirmed P02 gaps, with direct evidence:

| Gap | Evidence | P02 response |
|---|---|---|
| Chapter belongs to legacy `ContentSubject`, not `CurriculumEdition`; no durable chapter code or row version. | `Models/ContentEntities.cs:18-35`; `ContentChaptersService.cs:25-62,90-110` | Add transitional `CurriculumEditionId`, durable `Code`, canonical lifecycle, and `RowVersion`; preserve legacy ID/relationship during migration. |
| Chapter list has no server pagination/status/sort and returns all rows. | `ContentChaptersService.cs:25-62` | Add typed paged query/response and DB-side filtering/sorting. |
| Chapter delete is physical and chapter status is not used by the service. | `ContentChaptersService.cs:232-254` | Archive by default; hard delete only for an unreferenced draft under an explicit policy. |
| Lesson lacks `RowVersion` and durable `Code`; update can change `ChapterId` without validating the target. | `ContentEntities.cs:52-84`; `ContentLessonsService.cs:303-346` | Validate parent, uniqueness, lifecycle, and optimistic concurrency in every mutation. |
| Workflow skips canonical `approved`: approve immediately publishes; request-changes returns to `draft`. | `ContentLessonsService.cs:442-576` | Implement the ADR state machine and distinct approve/publish transitions while preserving wire values `in-review` and `changes-requested`. |
| Learner projection checks only legacy subject/chapter activity and contains `sub_math10` and Math string fallbacks. | `StudentCurriculumService.cs:376-450,606-680,836` | Require a published catalog/edition/chapter/lesson chain for new projections and remove affected-route Math fallbacks; keep explicit compatibility behavior only where proven necessary. |
| Frontend discards lesson total and performs client filtering/pagination. | `education.service.ts:509-568`; `ContentLessonsPage.tsx:275-295` | Return and consume a typed paged response; make URL query state authoritative. |
| Create chapter invents business context. | `ContentChaptersPage.tsx:138,173` | Require a live edition selection; no `subjects[0]`, `math`, or `Toán học 12` fallback. |
| Current editor is a Math-shaped stack of cards. | `ContentLessonEditorPage.tsx:326-645` | In P02 implement the metadata/workflow editor shell only. Generic versioned content blocks remain P03; resources/video remain P04; questions remain P05. |
| Video defaults are unsafe for future records (`verified`, `published`). | `ContentEntities.cs:86-111`; `StudyAIDbContext.cs:580-626` | Do not broaden P02 into P04. Preserve current resources, make video optional, and require P04 to correct resource defaults/contracts. |

### 1.3 UI/UX audit routing

Audit: React 19 + TypeScript + Vite/Bun, plain CSS with semantic variables in `frontend/src/styles/tokens.css`; no Tailwind runtime; shared management and UI primitives already exist; no active dark-mode requirement was found in the curriculum plan. The existing curriculum CRUD uses oversized page components, client-side pagination, repeated card layouts, hardcoded fallback context, and inconsistent dialogs. The target stays the approved enterprise workspace from `UI-UX-REDESIGN-PLAN.md`:

- desktop: persistent 240–360px hierarchy tree plus server-driven table;
- mobile: tree/filter drawers and compact record rows, no squeezed desktop table;
- neutral, flat, data-dense presentation using existing tokens;
- no decorative KPI strip, gradients, redundant cards, or new UI framework;
- explicit loading, empty, filtered-empty, error, unauthorized, conflict, and retry states;
- dedicated lesson editor route, but P02 exposes only fields supported by the approved schema.

## 2. Plan A — stacked PR integration

Target branch: `feature/backend-redesign-modular-monolith`. Never merge these PRs into `main` as part of this sequence.

### A1. Freeze and verify

1. Record target SHA (currently `49407bb2`) and the three PR head SHAs above.
2. Require clean working trees, mergeable PRs, successful checks, and no new application commits after the recorded CI runs. If a head changes, invalidate its gate and review only the new diff.
3. Close the P01 governance gate described in section 1.1.

### A2. Merge order and retargeting

1. Merge PR #24 into `feature/backend-redesign-modular-monolith` with a **merge commit**.
2. Retarget PR #25 from `feature/multi-subject-curriculum-refactor` to `feature/backend-redesign-modular-monolith`. Verify its diff contains only P01, then require CI success on the retargeted base and merge with a merge commit.
3. Retarget PR #26 from `feature/multi-subject-catalog-p01` to `feature/backend-redesign-modular-monolith`. Verify its diff contains only ENV-01/ENV-02, then require CI success on the retargeted base and merge with a merge commit.

Do not squash or rebase these reviewed PRs. Merge commits preserve the reviewed checkpoints and make the stack ancestry auditable.

### A3. Gate after each merge

- Confirm the target advanced by exactly the expected merge commit.
- Confirm the next PR's diff shrank to its own layer and remains mergeable.
- Run/observe the repository CI at the new target SHA. For PR #26/final target, require FE plus two independent disposable backend jobs.
- Inspect the final migration list and database-safety guard tests; do not run against `StudyAIDb`.
- Stop immediately on unexpected files, migration ordering changes, conflict resolution, missing checks, red CI, or a PR head mismatch. Do not resolve conflicts by choosing “ours/theirs” wholesale.

The **release SHA** is the final merge commit on `feature/backend-redesign-modular-monolith` after PR #26 and final CI success. It cannot be named in advance; record it in the integration report and use that immutable SHA for the controlled database change.

## 3. Plan B — controlled database transition

Database deployment readiness is separate from code readiness. Today `StudyAIDb` is online with `8/17` migrations. The rehearsed path applies nine pending migrations and the full-restore rollback has passed on a clone.

Execution order after explicit owner/DBA approval:

1. Finalize the release SHA and regenerate/review the migration script from migration 8 to 17.
2. Schedule a maintenance window; stop application writers and verify active sessions.
3. Capture migration history, row-count/checksum baselines, FK/index/trust state, and sufficient free disk space.
4. Create a SQL Server `COPY_ONLY, CHECKSUM` backup of `StudyAIDb`; run `RESTORE VERIFYONLY`; copy the backup to the approved protected location.
5. Apply exactly the reviewed migration set to `StudyAIDb` using the explicit connection and release binaries. Automatic startup migration stays disabled.
6. Verify 17 migrations, table/row preservation, FK/index/unique constraints, no untrusted/disabled FK, and `DBCC CHECKCONSTRAINTS`.
7. Start the release and run health, authentication, legacy curriculum reads, P01 catalog reads/writes only as an approved smoke account, then stop on any mismatch.
8. On failure, stop the app and perform the rehearsed full backup restore. EF downgrade is not the default rollback.
9. After an agreed observation period, create and verify a final backup of `StudyAIDb_E2E`, prove runtime/CI has no reference to it, then retire it under a separate owner-approved change.
10. Treat `StudyAIDb_Clean_f1842579f7224ba1ad14598ea2751d2b` as an orphan candidate only. It is online and lacks `__EFMigrationsHistory`; no active session was observed in the read-only snapshot. Ownership still must be proven from the recovery manifest before separate deletion approval.

All test writes remain limited to per-run `StudyAIDb_Clean_{GUID}` databases. The full runbook is in `ANTIGRAVITY-DATABASE-MIGRATION-PROMPT.md`.

## 4. Plan C — fake/test curriculum cleanup

### 4.1 Read-only production snapshot

The 2026-11-25 aggregate read used only `SELECT` statements:

- `StudyAIDb`: 21 subjects, 18 chapters, 35 lessons, 27 videos.
- Lessons: 31 `published`, 4 `draft`; 4 have no body in any current lesson field; 16 have no video.
- Videos: all 27 have nonblank HTTP-like URLs and are currently `verified` + published. This proves only stored shape, not reachability, licensing, or correctness.
- No duplicate `(ChapterId, Slug)` lessons or duplicate `(SubjectId, Title)` chapters were found.
- Lesson/chapter dependents include questions, assessments, progress, AI conversations/recommendations, topics, and videos. Several test-looking lessons have question rows, and several Math lessons have learner progress. Nothing can be deleted based on its name.
- `StudyAIDb_E2E` currently contains 1,026 subjects, 1,021 chapters, 1,518 lessons, and 150 videos; it is clearly not a safe runtime catalog and must be retired only after backup/reference checks.

Unclassified candidate groups requiring provenance/owner confirmation include repeated Physics rows, security-test rows, and draft-test rows. Their exact lesson IDs observed were:

```text
Physics: les_99c0dd4fe9ab42fb8f83b24c6a45d60a, les_a5d86cf0ba654eb884ad94a87c721d5b,
         les_6810911061314bd0bff2eecd98da2929, les_5f1c2b37c64247f4b6b85884fd564e17,
         les_9c538e07e811436a8be848fab7fb86d0, les_9fc89006dde5400fa21b4fc7eaaa704f,
         les_5b37625af9474f0eba247d4c88bb89c3, les_4a43b543ff9245f39c475b44813fa98f
Security: les_b903798d5c98459a8a1575cbbc50b146, les_315ca0933b9541d38e0664e78e0e5d10,
          les_0e0a4aa52189478a904161e4a633a6bf, les_054bf74a0e234b738e62f7cbe081bbd0
Draft-test: les_980bd6f7d1894de9b74d06b221660cc2, les_af8afe9c068740cf809de50ebc1ae531,
            les_663dcf18194e48c29d5fc492672f0e83, les_54de4cef9ccd440ea273cd6e58b0708d
```

These are **not** an approved deletion manifest. Their labels and repetition are investigation signals only.

### 4.2 Cleanup workflow

1. Export a read-only manifest with exact subject/chapter/lesson IDs, provenance evidence, creation source, status, and every dependent count.
2. Owner marks each row `KEEP`, `ARCHIVE`, `REMAP`, or `NEEDS VERIFICATION`, with rationale. Names/prefixes/wildcards cannot authorize a row.
3. Hash and sign the approved manifest. Any database drift or hash mismatch cancels execution.
4. Rehearse on a fresh backup-restored disposable clone. Produce before/after checksums and a rollback proof.
5. Prefer archive/unpublish after the controlled migration provides lifecycle columns. Do not cascade-delete questions, progress, attempts, accounts, roles, classes, AI history, or question-bank data.
6. If a row with protected dependencies cannot be archived without breaking required history, stop and request an explicit remap/retention decision.
7. Execute on `StudyAIDb` only in a separate approved maintenance change, inside a transaction with row-count assertions and immediate rollback on mismatch.

No new curriculum data, AI filler, placeholder lesson, or replacement video is part of cleanup.

## 5. Plan D — P02 implementation strategy

P02 is one integrated phase with four independently testable workstreams, not a set of new infrastructure phases.

### W1 — Edition-scoped schema and lifecycle backend

**Scope:** Extend existing `ContentChapter`/`ContentLesson` and services. Add nullable transitional `CurriculumEditionId`, durable codes, restrictive relationships, lifecycle, ordering, row versions, and paged contracts. Existing IDs remain stable; legacy rows are not auto-mapped.

**Primary files:** `ContentEntities.cs`, `StudyAIDbContext.cs`, a new additive migration, `IApplicationDbContext.cs`, `ContentChapters*`, `ContentLessons*`, `ContentCatalog*` only where parent lifecycle transitions are required, DTOs, and integration/unit tests.

**API contract:** extend current chapter/lesson endpoints with `editionId`, `status`, `search`, `sort`, `direction`, `page`, and `pageSize`; return `{items,total,page,pageSize}`. Mutations require `rowVersion`. Provide explicit submit-review/approve/publish/request-changes/archive/reactivate transitions; never accept arbitrary status in generic PATCH.

**Database impact:** additive columns/indexes/FKs only; `ON DELETE NO ACTION`; unique active chapter `(CurriculumEditionId, Code)` and lesson `(ChapterId, Code)`/`(ChapterId, Slug)` constraints. New records require a real edition. Legacy null links remain visible only through explicit compatibility reads until an approved mapping exists.

**Acceptance:** see AC-P02-DB/API/RBAC in `P02-ACCEPTANCE-CRITERIA.md`.

**Tests:** migration up/down on disposable SQL, uniqueness/FK/order, stale row version, transaction/audit rollback, lifecycle negative paths, RBAC and four-eyes, empty DB.

**Stop:** migration touches/deletes existing rows, tries to infer edition from names, changes production startup migration, or breaks P01 catalog contracts.

**Commit checkpoint:** `feat(curriculum): add edition-scoped chapter and lesson lifecycle`.

### W2 — Enterprise management workspace

**Scope:** Replace the separate chapter/lesson card workflows with the approved `CurriculumWorkspace`: catalog filters, lazy hierarchy tree, server-driven table, short CRUD dialogs, and dedicated lesson metadata/workflow editor.

**Primary files:** current content routes/pages, `education.service.ts` or a narrowly extracted curriculum client, education types, existing management primitives, page CSS, and focused tests. Reuse `ContentCatalogPage` parent selectors and query conventions.

**API contract:** consume W1 paged endpoints and P01 catalog endpoints; URL owns filters/selection/sort/page. No client `.slice()` pagination and no local fallback rows.

**Database impact:** none directly; all writes go through W1 APIs.

**Acceptance:** tree/table stay synchronized, CRUD persists after refresh, stale conflict is visible, empty edition is honest, mobile uses drawers/compact rows, and false-success is impossible.

**Tests:** component tests for loading/empty/filtered-empty/error/403/409/success; Playwright desktop and 390px create/edit/reorder/submit/publish/archive/refresh/API-500.

**Stop:** a UI field has no approved backend contract, a bulk operation lacks an atomic endpoint, a third table family is introduced, or P03/P04/P05 editor scope is pulled into P02.

**Commit checkpoint:** `feat(content-ui): add curriculum workspace and lesson lifecycle editor`.

### W3 — Learner published-chain projection and compatibility

**Scope:** Extend the existing learner curriculum service so a new catalog-linked lesson is visible exactly once only when its required ancestor chain and lesson are published. Keep legacy compatibility routes until P10, but eliminate affected-route Math fallbacks.

**Primary files:** `StudentCurriculumService.cs`, controller/interface/DTOs, learner API client/pages only where necessary, and tests. AI/adaptive services are verified for compatibility but not redesigned.

**API contract:** add edition-aware learner navigation/read projection while preserving legacy routes. DTOs expose grade, subject, curriculum, edition, chapter, and lesson IDs. Missing/legacy mapping is explicit, never synthesized.

**Database impact:** read-only projection over W1/P01 relations.

**Acceptance:** management-created published lesson appears once; draft lesson or any unpublished ancestor is absent; archived content cannot be newly selected; no `sub_math10` fallback on the edition-aware path.

**Tests:** published-chain matrix, management-to-learner SQL roundtrip, refresh/deep link, empty catalog, unauthorized staff-only routes, multi-subject isolation, and AI/adaptive regression with explicit IDs.

**Stop:** solution creates a new AI service, invents mastery/progress, exposes draft data, or removes a legacy route without consumer proof.

**Commit checkpoint:** `feat(curriculum): expose edition-aware learner projection`.

### W4 — Integrated verification and evidence

**Scope:** Complete the P02 acceptance matrix and docs. No data import and no application refactor outside the affected slice.

**Tests:** frontend lint/test/build; backend restore/build/unit/integration twice on independent disposable databases; targeted Playwright including Admin/Content success, Teacher/Student mutation denial, API failure, refresh persistence, empty state, 390px, and two-session concurrency. Run the repository UI probe only after implementation, not during this planning change.

**Stop:** any test resolves to `StudyAIDb` or `StudyAIDb_E2E`, cleanup cannot prove ownership, CI uses a different application SHA, or an assertion is weakened/disabled.

**Commit checkpoint:** `test(curriculum): prove P02 lifecycle end to end`.

## 6. Required order

1. Owner approves P01 compatibility decision.
2. Execute Plan A and record the final integration SHA.
3. Owner separately approves and executes Plan B for `StudyAIDb`; code readiness alone does not authorize this.
4. Implement P02 W1–W4 on a feature branch using disposable SQL only.
5. Cleanup planning/rehearsal may proceed in parallel after migration, but production cleanup requires its own signed manifest and approval.
6. P03/P04/P05 remain later phases; P02 must not import data or fabricate content to make the UI look populated.
