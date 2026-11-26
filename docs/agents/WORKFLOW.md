# Safe Dual-Agent Workflow (STUDY_AI-)

## 1. Supported Model (Dual-Agent Only)

- **Agent 1 — Antigravity Hydrogen Medium**: Main Agent, Orchestrator, Implementation Developer, Debugger, Test Executor, and Progress Manager. Directly edits code, runs tests, and manages `PROGRESS.md`.
- **Agent 2 — Codex Local CLI**: Independent Architecture Planner (`medium`), Initial Reviewer (`medium`), Simple Re-reviewer (`low`), and Security Auditor (`medium`). Always `read-only`, never edits application code.

### Disabled 3-Agent Features (Executable Enforcement)

`ADVANCED` three-agent mode, `invoke_subagent`, `multi_worker`, `parallel_workers`, and separate High Orchestrator paths are **disabled executably** in `agent-config.json`, `task-schema.json`, `agent-guard.ps1`, and `route-task.ps1` (`UNSUPPORTED_MODE_ERROR`).

## 2. Adaptive Execution Modes (`invoke-dual-agent.ps1` / `route-task.ps1`)

- **ECO**: Antigravity Hydrogen Medium only. Restricted to docs/formatting/low-risk non-code edits. Cannot downgrade security, auth, RBAC, migration, database, or architecture tasks.
- **STANDARD (Default)**: Antigravity Hydrogen Medium + Codex Local CLI. Used for CRUD, API, frontend, backend, AI Tutor, DB-related code, security, and refactoring.

## 3. Daily 10-Step Workflow & Manual Fallback

1. **Receive Task** -> **Preflight**: Read `AGENTS.md`, `PROGRESS.md`, verify Git `HEAD`/worktree and PR state.
2. **Classify**: Validate `TASK.json` via `invoke-dual-agent.ps1` / `route-task.ps1` (`ECO` or `STANDARD`).
3. **Plan**: Reuse approved PLAN or run `codex-plan.ps1` for complex tasks.
4. **Implement**: Antigravity directly edits scoped files (single writer under `Enter-WorkerLock`).
5. **Test**: Run targeted tests (full gates for high-risk), filter output via `summarize-logs.ps1` -> `TEST-SUMMARY.json`.
6. **Review**: Run `codex-review.ps1` (if `-AllowLocalUserBoundary` opted in) **or** use **Manual Fallback** (user runs independent Codex review in a separate Codex session) since `automatedCodexEnabled` is `false` by default on single-user Windows.
7. **Remediation & Re-review**: Antigravity fixes findings; Codex re-reviews remediation diff (max 3 attempts).
8. **Checkpoint**: Update `PROGRESS.md`, evaluate completion via `invoke-dual-agent.ps1 -EvaluateCompletion`, commit/push when permitted (never auto-merge or auto-advance phase).
