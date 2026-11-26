# Dual-Agent Token Optimization Guide (STUDY_AI-)

## 1. Agent Specialization & Context Boundaries

| Agent | Role | Context Scope |
|---|---|---|
| **Agent 1 — Antigravity Hydrogen Medium** | Main Agent, Orchestrator, Implementation Developer, Debugger, Test Executor, Progress Manager | Reads `AGENTS.md`, `PROGRESS.md`, `REPO-MAP.md`, `TASK.json`, `REVIEW.json`, `TEST-SUMMARY.json` and only scoped source files via `rg`, `git diff`, Serena symbols, and Context7. |
| **Agent 2 — Codex Local CLI** | Read-only Planner (`medium`) & Independent Reviewer (`medium` initial / `low` simple re-review) | Receives bounded `git diff` (excluding `node_modules`, `bin`, `obj`, `dist`, lockfiles) on an immutable detached snapshot. |

## 2. Adaptive Task Routing (`ECO` / `STANDARD` only)

- **ECO**: Docs, formatting, and truly low-risk non-code edits only. Cannot downgrade security, auth, RBAC, migration, DB, or architecture.
- **STANDARD (Default)**: CRUD, API, frontend, backend, AI Tutor, DB-related code, security, and refactoring. Antigravity implements + targeted tests + Codex independent review (`medium` initial, `low` delta re-review).
- **ADVANCED / Multi-worker**: **Disabled executably** (`UNSUPPORTED_MODE_ERROR`).

## 3. Structured Communication & Log Filtering

- **Task Packet** (`scripts/agents/task-schema.json`): Pass only `task_id`, `route`, `objective`, `base_sha`, `scope_files`, `constraints`, `acceptance_criteria`.
- **Deterministic Log Filter** (`scripts/agents/summarize-logs.ps1`): Stores raw build/test output outside model context and emits compact `TEST-SUMMARY.json` (`test-summary-schema.json`).
- **Review Cache**: **Disabled** (`reviewCache.enabled: false`) because local `%TEMP%` cache files lack independent cryptographic provenance.
