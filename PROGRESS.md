# STUDY_AI persistent progress checkpoint

> Last reconciled: 2026-11-26 (Asia/Bangkok). Re-check Git/GitHub before acting; this file can become stale.

## Status contract

- `IMPLEMENTED`: code/docs exist, but required independent verification or acceptance is incomplete.
- `VERIFIED`: named evidence passed for the stated SHA/scope; this is not owner acceptance.
- `BLOCKED`: a required gate, fix, decision, environment or acceptance is still open.
- `COMPLETED`: required verification and explicit acceptance/merge gate are both recorded. Never infer this from implementation or green CI alone.

## Current checkpoint

| Field | Observed state |
|---|---|
| Active delivery phase | **P03 — Validated lesson blocks, objectives, knowledge units, and skills**, **VERIFIED** & ready for owner merge approval |
| Implementation branch | `feature/p03-lesson-composition-graph` (PR [#29 — Draft, OPEN](https://github.com/hthuyngan/STUDY_AI-/pull/29), base `feature/backend-redesign-modular-monolith`) |
| P03 Plan | [`docs/curriculum-refactor/PLAN-P03.json`](docs/curriculum-refactor/PLAN-P03.json) (`P03-W0..P03-W5`) |
| Dual-Agent Workflow | Active (`Trusted Local Developer Workflow`: Antigravity Medium + Codex Local CLI) |
| Protected database | `StudyAIDb` has P02 migration applied & P02 auth read-only smoke test PASS; P03 migration NOT applied to `StudyAIDb` |
| Overall verdict | **P03 VERIFIED** (all CI gates, 2x disposable SQL runs, P02+P03 Playwright E2E, & Codex reviews PASS; awaiting owner merge approval) |

## Phase ledger

| Scope | State | Evidence / qualification |
|---|---|---|
| P00 curriculum refactor | **COMPLETED** | PR #24 merged |
| P01 stable catalog | **VERIFIED** | PR #25 merged |
| ENV-01 DB separation | **VERIFIED** | PR #26 merged |
| P02 lifecycle | **COMPLETED** | PR #27 merged (`ea2e121e`); `StudyAIDb` P02 migration + `DBCC CHECKDB` + auth read-only smoke test (`200` on editions/chapters/lessons) PASS |
| P03 lesson blocks/graph | **VERIFIED** | PR #29 CI [45819713775](https://github.com/hthuyngan/STUDY_AI-/actions/runs/45819713775) ALL PASS at `52a5dcdc`; Codex reviews PASS (`0` findings); awaiting owner merge approval |

## P03 verification evidence (reconciled, no double-counting)

- **GitHub CI [run 45819713775](https://github.com/hthuyngan/STUDY_AI-/actions/runs/45819713775) at `52a5dcdc`**:
  - `Frontend Lint, Test & Build`: **PASS** (1m11s)
  - `.NET 10 Backend Build & Tests (Isolated Run 1)` & `(Isolated Run 2)`: **PASS** on 2 independent `StudyAIDb_Clean_{GUID}` databases
  - `Run P02 & P03 Playwright E2E` (`Real SQL Server Disposable DB`): **PASS** (2m25s)
- **Local unique test breakdown (`1373d272`, 1,177 unique tests + 2 Playwright E2E suites)**:
  - `StudyAI.UnitTests`: **321/321 PASS**; `StudyAI.IntegrationTests`: **269/269 PASS**; `frontend` `vitest`: **587/587 PASS** (`88` files; note `TEST-SUMMARY-P03-R3.json` summed `88` file-count lines + `1,177` tests = `1,265`).
  - P03 migration `Up`/`Down`/`Up` rehearsal on disposable `StudyAIDb_Clean_{GUID}`: **PASS** (empty DB stays empty).
- **Codex Local CLI Reviews**: `1373d272` (`rereview`, `low`) **PASS** (`0` findings); `52a5dcdc` (`rereview`, `low`) **PASS** (`0` findings).

## Next action

Owner: review [PR #29](https://github.com/hthuyngan/STUDY_AI-/pull/29), mark Ready for Review / approve merge, and approve controlled P03 migration on `StudyAIDb` when ready. Do not auto-merge or modify `StudyAIDb`.
