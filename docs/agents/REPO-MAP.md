# STUDY_AI- Compact Repository Map

Use this map before scanning directories. Never read `node_modules/`, `bin/`, `obj/`, `dist/`, or lockfiles unless directly relevant.

| Area | Path | Purpose |
|---|---|---|
| Frontend | `frontend/src/` | React 19 + TypeScript + Vite + Bun (`bun run lint`, `bun run test`, `bun run build`) |
| Backend | `backend/` | .NET 10 Modular Monolith (`StudyAI.sln`, Clean Architecture, EF Core, SQL Server) |
| DB Safety & E2E | `scripts/utils/databaseSafetyGuard.ts`, `scripts/utils/disposableDb.ts` | ENV-01/ENV-02 `StudyAIDb_Clean_{GUID}` lifecycle |
| E2E & Scripts | `scripts/` | Playwright E2E scripts, audits, and utilities |
| Safe Agent Bridge | `scripts/agents/` | `agent-guard.ps1`, `codex-plan.ps1`, `codex-review.ps1`, `summarize-logs.ps1`, schemas |
| Agent Docs | `docs/agents/` | `WORKFLOW.md`, `SECURITY.md`, `TOKEN-OPTIMIZATION.md`, `SETUP-REPORT.md`, `VERIFICATION-REPORT.md`, `USAGE-REPORT.md` |
| Persistent Context | `AGENTS.md`, `PROGRESS.md` (on `codex/docs-agent-progress-tracking`) | Rules, DB guard, and active phase/PR/SHA checkpoint |
