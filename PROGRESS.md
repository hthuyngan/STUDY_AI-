# STUDY_AI persistent progress checkpoint (Dual-Agent Workflow)

> Last updated: 2026-11-26 (Asia/Bangkok). Re-check Git/GitHub before acting; writer checkpoints are handoff aids, not independent acceptance.

- **Current phase**: Safe Dual-Agent Bridge & PR #28 Remediation
- **Current task**: Dual-Agent simplification (`ECO`/`STANDARD` only), security boundary hardening, and exact-HEAD bridge CI
- **Branch**: `feature/safe-agent-orchestration`
- **HEAD SHA**: `2cc3b395f3c80e1eb899d499ead2ebdcd0b11048` (pending new remediation commit)
- **PR**: [#28 — Draft, OPEN](https://github.com/hthuyngan/STUDY_AI-/pull/28) (base `feature/backend-redesign-modular-monolith`)
- **Last verified CI**: Application CI passed on `2cc3b395` (`45745248247`); `safe-agent-bridge.yml` failed at `0s` due to `shell:` syntax (fixed in this update)
- **Completed work**:
  - Disabled `ADVANCED`, `invoke_subagent`, multi-worker, and parallel modes executably (`route-task.ps1`, `agent-guard.ps1`, `agent-config.json`).
  - Added single mandatory entrypoint `invoke-dual-agent.ps1` with `Enter-WorkerLock` + pre/post route & schema enforcement.
  - Replaced process start with race-free Win32 `CREATE_SUSPENDED` + `JobObjectHost` + strict `ArgumentList` (no `cmd.exe`).
  - Disabled writer-writable review cache and Bridge SQL execution by default; fixed PS 7 ISO timestamp parsing.
- **Pending work**:
  - Push remediation commit, confirm exact-HEAD `Safe Agent Bridge CI` (`powershell` + `pwsh`) passes on GitHub Actions, and await independent Codex re-review.
- **Open findings**: OS-level single-user filesystem credential boundary on Windows keeps `automatedCodexEnabled: false` by default (manual fallback active).
- **Blockers**: Awaiting independent Codex re-review and owner acceptance on PR #28.
- **Next action**: Run hermetic PS 5.1 suites + live fixture tests, commit/push to PR #28, and verify GitHub Actions bridge CI URL.
