# Security & Database Safety Architecture

## 1. Sandbox & Privilege Controls

- **Codex Read-Only Isolation**: `codex-plan.ps1` and `codex-review.ps1` always pass `--ignore-user-config --disable plugins -s read-only --ephemeral`. Personal `~/.codex/config.toml` settings (such as `windows.sandbox = "elevated"` or desktop/browser plugins) are never loaded.
- **Immutable Snapshot**: Before invoking Codex, `codex-plan.ps1` / `codex-review.ps1` creates a detached `git worktree` in `$env:TEMP` at the exact committed `HeadSha`, runs Codex against that snapshot, and removes it in `finally`.
- **Dirty Worktree Protection**: `Assert-CleanWorktree` blocks automated review when uncommitted changes exist, preventing stale or unattributed reviews.
- **Process Locking**: `Acquire-AgentLock` uses atomic `FileMode.CreateNew` lockfiles in `$env:TEMP\studyai-agent-locks` to enforce at most 1 concurrent implementation/review call.

## 2. Secret Isolation, Process Tree & Path Hardening

- **Fail-Closed Automated Codex Default**: `policies.automatedCodexEnabled` is `false` by default because on single-user Windows, child processes share OS filesystem ACLs to `%USERPROFILE%` credential stores. Local fixture runs require explicit `-AllowLocalUserBoundary`; production/untrusted workflows use the manual independent Codex review fallback.
- **Allowlist Environment & Git Credential Isolation**: `Invoke-CodexSandboxed` clears the child environment and passes only a minimal allowlist plus `GIT_CONFIG_NOSYSTEM=1`, `GIT_CONFIG_GLOBAL=NUL`, `GIT_TERMINAL_PROMPT=0`, `GCM_PROVIDER=none`, `GCM_INTERACTIVE=never`, `GIT_ASKPASS=""`, `SSH_ASKPASS=""`.
- **Race-Free `CREATE_SUSPENDED` + Job Object**: `JobObjectHost.RunSuspendedInJob` creates the child via Win32 `CreateProcessW` with `CREATE_SUSPENDED`, assigns it to `JobObjectHost` (`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`), and only then calls `ResumeThread`. Invokes `codex.exe` or `node.exe + codex.js` directly with Win32-quoted `ArgumentList` (no `cmd.exe`), validating `Model` and `ReasoningEffort`.
- **Path Canonicalization**: `Resolve-ApprovedArtifactPath` rejects `..` traversal, symlinks/junctions (`ReparsePoint`), and any path outside `%TEMP%` or `docs/agents/.artifacts/`.
- **Single-Writer Enforcement**: `invoke-dual-agent.ps1` acquires `Enter-WorkerLock` (culture-invariant ISO-8601 + PID-reuse guard) before workflow execution and releases in `finally`. Native `invoke_subagent` is disabled.

## 3. Database Safety (ENV-01 / ENV-02)

- `Parse-SqlConnectionStringStrict` parses quoted values, rejects malformed syntax and conflicting duplicate `Database` / `Initial Catalog` keys, validates via `SqlConnectionStringBuilder`, and allows **only** `StudyAIDb_Clean_{Guid:N|Guid:D}`.
- **Bridge DB Operations Disabled**: `Assert-DatabaseSafety` rejects any DB connection string in Agent Bridge (`DB_BRIDGE_DISABLED`) unless `-AllowCleanGuidEnv` is explicitly passed by an authoritative disposable DB runner (`disposableDb.ts`). Writer-minted manifests are never trusted.

## 4. Rollback Instructions

1. **Antigravity MCP Config**: Restore `~/.gemini/config/mcp_config.json` from `~/.gemini/config/mcp_config.json.bak`.
2. **Codex Config**: Personal `~/.codex/config.toml` was never modified; backup exists at `~/.codex/config.toml.bak`.
3. **Repository**: Close Draft PR and delete branch `feature/safe-agent-orchestration` (and remove worktree `D:/TN-safe-agents`).

## 5. One-Time OS Execution Identity Setup (Required Before Enabling `automatedCodexEnabled: true`)

Because single-user Windows processes share OS filesystem ACLs to `%USERPROFILE%` credential stores (`.ssh`, `.aws`, `.git-credentials`), `automatedCodexEnabled` remains **`false`** by default. To enable unattended automated Codex execution on real repository code:

1. **Create a dedicated low-privilege Windows user** (requires Administrator approval):
   ```powershell
   # Run once in elevated PowerShell
   net user StudyAICodexReviewer "<strong-random-password>" /add /passwordchg:no
   ```
2. **Isolate `CODEX_HOME`**: Create `C:\ProgramData\StudyAICodexReviewer\.codex`, grant `StudyAICodexReviewer` read/write ONLY on that directory (and read-only on `D:\TN-safe-agents` / snapshot temp dir), and sign in once as `StudyAICodexReviewer` (`codex login`).
3. **Verify**: Confirm `StudyAICodexReviewer` receives `Access Denied` on `C:\Users\nguyen\.ssh`, `.aws`, and `.git-credentials`.
4. **Enable**: Update `policies.automatedCodexEnabled: true` in `agent-config.json` after independent security acceptance.
