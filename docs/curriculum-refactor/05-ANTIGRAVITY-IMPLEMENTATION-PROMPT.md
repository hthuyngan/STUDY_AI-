# Antigravity Implementation Prompt — Multi-subject Curriculum Engine

You are implementing the verified STUDY_AI multi-subject curriculum refactor. Work phase by phase from `docs/curriculum-refactor/04-IMPLEMENTATION-PHASES.md`; do not attempt the whole program in one unreviewable change.

## Mandatory preflight

1. Read `AGENTS.md` completely, then the mandatory implementation plan and master prompt it names.
2. Read all six files in `docs/curriculum-refactor/`.
3. Record remote, current branch, HEAD, status, and ahead/behind; run `git fetch origin --prune`.
4. If clean, only fast-forward with `git pull --ff-only`. If dirty/diverged, do not stash/reset/overwrite/force pull; report and work only if the approved phase can be isolated safely.
5. Inspect open/overlapping PRs, especially #23, #22, #20 and the work identified in `AGENTS.md`. Reuse verified code; do not blindly merge or duplicate it.
6. Inspect the current diff before editing. Local/user changes are not yours to discard.

## Scope

Implement only the single phase explicitly authorized by the user. Fix only findings and acceptance criteria assigned to that phase. Prefer extending existing entities, services, policies, workflow, import validators, AI gateway, API clients, and UI components. Do not create parallel controllers/services/tables that duplicate current behavior.

Do not:

- import real curriculum or the external RAG dataset;
- download the dataset into the repository;
- generate filler chapters, lessons, blocks, questions, videos, scores, mastery, or progress;
- use mock data, hardcoded business data, fake API, in-memory official data, or localStorage as the database;
- show a fallback as official content or success;
- disable, delete, weaken, or skip tests to make a build pass;
- refactor unrelated modules;
- create subject-specific CRUD;
- replace the existing AI gateway or add a vector database/RAG service without a separately proven need;
- commit, push, open/merge a PR, or change branch unless explicitly authorized for this implementation turn.

## Database safety — non-negotiable

`StudyAIDb` is protected production data. Never run a write-oriented test, migration, seed, reset, restore, truncate, delete, drop, import, or cleanup against it. Use only `StudyAIDb_E2E` or a disposable SQL Server database with a fail-closed connection/database-name guard. Never log credentials or private student data.

No cleanup or real data import is authorized by this prompt. Cleanup phase work means implementing/reviewing dry-run tooling and tests against isolated data only. Dry-run must default to zero writes.

## End-to-end behavior

For each approved vertical slice, prove:

```text
Management UI -> API client -> authorized endpoint -> service -> EF query/transaction -> SQL
SQL -> learner read endpoint -> API client -> learner UI
```

Management-created data must be the exact data shown to the learner after the required publication workflow. Draft/unpublished ancestors and invalid/unverified resources must not leak. API failure must never produce a success toast, fake object, fake score, or fallback curriculum.

Use stable IDs: GradeLevelId, SubjectId, CurriculumId/CurriculumEditionId, ChapterId, LessonId, KnowledgeUnitId, SkillId. Do not map by titles when an ID relationship exists. Absence is modeled explicitly and displayed as loading/empty/error/unavailable—not as Math defaults.

## Security and validation

- Enforce RBAC and resource ownership in backend handlers/services, not only UI.
- Student: published read only and personal learning data only.
- Author: owned draft/edit capability only as defined by the approved matrix.
- Reviewer/publisher/admin: explicit transition policies with audited actions; no accidental self-approval.
- Validate pagination, sort/filter allowlists, uniqueness, parent lifecycle, reorder transactions, block schemas, URLs/providers, and concurrency.
- Preserve assessment integrity: no correct answer before submission and no mutable finalized attempt.

## Implementation sequence for the selected phase

1. Reproduce and cite the verified finding; identify current reusable code.
2. State exact files/modules to change and explicit out-of-scope areas.
3. Add/update tests that fail for the root cause. Test fixtures may use Math, History, and Biology only in isolated test databases and must never become runtime seeds.
4. Implement the smallest full-stack slice.
5. Run migrations only on isolated SQL and prove upgrade/rollback when the phase includes schema.
6. Run affected unit/integration/frontend/Playwright gates. Include 401/403, API failure, empty state, refresh, two-user isolation, and mobile 390px where relevant.
7. Inspect `git diff --check`, `git status`, and the full scoped diff. Confirm no secret, dump, dataset, generated artifact, mock fallback, unrelated refactor, or protected DB target was added.
8. Report exact commands/log outcomes. Mark unavailable tests `NOT RUN` with the blocker; never claim PASS without logs.

## Required handoff

Report:

- phase and findings implemented;
- root cause and resulting FE -> API -> BE -> DB behavior;
- files changed and why;
- schema/data impact and database name used for every write test;
- tests run with pass/fail/not-run totals;
- remaining risks and explicit next gate;
- scoped git diff summary and confirmation that no commit/push/merge occurred unless separately authorized.

Stop immediately and request owner direction if the phase requires a materially different schema, real-data decision, license decision, production database access, destructive action, or overlapping active-branch merge not already approved.

