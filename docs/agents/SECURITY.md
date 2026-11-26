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

## 5. Automation activation: BLOCKED until a different Windows logon identity is proven

**Do not enable unattended Codex by changing `automatedCodexEnabled` alone.** The current `JobObjectHost.RunSuspendedInJob` invokes Win32 `CreateProcessW` using the **calling user's token**, even if a local account named `StudyAICodexReviewer` exists. Job Objects contain a process tree but do not change its logon SID or prevent the child from reading accessible user-profile files. Clearing environment variables and disabling Git credential helpers also do not establish a filesystem boundary.

Code now enforces `REVIEWER_OS_IDENTITY_NOT_ENFORCED` when the setting is changed to true without a separate-identity launcher. `-AllowLocalUserBoundary` is limited to named temporary fixture repositories; it is **not** an isolation mechanism or a supported option for the real StudyAI worktree.

### One-time local prerequisites (not sufficient for activation)

1. A Windows administrator may **explicitly approve** creating a non-admin reviewer account. Do not execute admin actions, change system ACLs, or handle a plaintext password without that approval. Store credentials using an OS-supported secret mechanism, never repository JSON or scripts. Do not copy Codex authentication tokens between Windows profiles.
2. The separate reviewer identity must be able to authenticate to Codex through a supported sign-in process, receive read-only repository snapshots, and write results into a **dedicated, ACL-protected response directory**. It must be denied access to the main user's private profile, SSH/cloud/Git credentials, application runtime secrets, and persistent databases.
3. **An actual separate-identity launcher must be implemented.** `CreateProcessW` alone is not sufficient: verify the launched process SID differs from the Antigravity SID and that secret-file reads fail. Use a supported Windows launch/service/task mechanism with a bounded IPC interface, no arbitrary commands, and independent review of its ACL and credential boundary.
4. Only after end-to-end execution, tamper-resistant review provenance, exact-SHA verification, reviewer quota availability, PS 5.1/7 tests, and independent acceptance may `automatedCodexEnabled` be enabled through a reviewed implementation. This revision **does not** implement a separate-identity launcher.

Read-only local readiness report:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\agents\\Test-DualAgentReadiness.ps1
```

The script does not create Windows accounts, change local configuration, validate Codex quota through a paid call, or enable automation. Its BLOCKED result is expected until the launcher and auth boundary are completed. Keep manual independent review as the fail-closed fallback; do not represent this as full one-prompt automation.
