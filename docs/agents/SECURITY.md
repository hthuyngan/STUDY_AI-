# Security & Database Safety Architecture

## 1. Sandbox & Privilege Controls

- **Codex Read-Only Isolation**: `codex-plan.ps1` and `codex-review.ps1` always pass `--ignore-user-config --disable plugins -s read-only --ephemeral`. Personal `~/.codex/config.toml` settings (such as `windows.sandbox = "elevated"` or desktop/browser plugins) are never loaded.
- **Immutable Snapshot**: Before invoking Codex, `codex-plan.ps1` / `codex-review.ps1` creates a detached `git worktree` in `$env:TEMP` at the exact committed `HeadSha`, runs Codex against that snapshot, and removes it in `finally`.
- **Dirty Worktree Protection**: `Assert-CleanWorktree` blocks automated review when uncommitted changes exist, preventing stale or unattributed reviews.
- **Process Locking**: `Acquire-AgentLock` uses atomic `FileMode.CreateNew` lockfiles in `$env:TEMP\studyai-agent-locks` to enforce at most 1 concurrent implementation/review call.

## 2. Secret Isolation, Process Tree & Path Hardening

- **Allowlist Environment Scrubbing**: `Invoke-CodexSandboxed` clears `$psi.EnvironmentVariables` and passes **only** the minimal allowlist (`PATH`, `SYSTEMROOT`, `COMSPEC`, `TEMP`, `TMP`, `USERPROFILE`, `LOCALAPPDATA`, `APPDATA`, `HOMEDRIVE`, `HOMEPATH`, `CODEX_HOME`, `PATHEXT`, `WINDIR`, `OS`, `NUMBER_OF_PROCESSORS`, `PROCESSOR_ARCHITECTURE`). Arbitrary secrets, cloud keys, SQL connection strings, and proxy credentials are never inherited.
- **Job Object Process-Tree Cleanup**: Codex processes are assigned to a Windows `JobObjectHost` (`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` + `TerminateJobObject`) and verified via `Win32_Process` before releasing locks or removing snapshots.
- **Path Canonicalization**: `Resolve-ApprovedArtifactPath` rejects `..` traversal, symlinks/junctions (`ReparsePoint`), and any path outside `%TEMP%` or `docs/agents/.artifacts/`, preventing artifact writes from overwriting source or config files.
- **Native Subagent Lock Limitation**: Antigravity's `invoke_subagent` runtime does not enforce OS-level file locks natively; single-writer enforcement relies on `Enter-WorkerLock` / `Exit-WorkerLock` in PowerShell orchestration and Orchestrator discipline (at most 1 active `implementation-worker`).

## 3. Database Safety (ENV-01 / ENV-02)

- `Parse-SqlConnectionStringStrict` parses quoted values, rejects malformed syntax and conflicting duplicate `Database` / `Initial Catalog` keys, validates via `SqlConnectionStringBuilder`, and allows **only** `StudyAIDb_Clean_{Guid:N|Guid:D}` (plus ownership manifest verification via `Assert-DatabaseOwnershipManifest` when `-RequireOwnership` is active).
- `StudyAIDb`, `StudyAIDb_E2E`, `OtherProduction`, and unknown databases fail closed.

## 4. Rollback Instructions

1. **Antigravity MCP Config**: Restore `~/.gemini/config/mcp_config.json` from `~/.gemini/config/mcp_config.json.bak`.
2. **Codex Config**: Personal `~/.codex/config.toml` was never modified; backup exists at `~/.codex/config.toml.bak`.
3. **Repository**: Close Draft PR and delete branch `feature/safe-agent-orchestration` (and remove worktree `D:/TN-safe-agents`).
