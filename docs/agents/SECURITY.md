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

## 5. Separate-Identity Reviewer Architecture & Implementation

To prevent Codex reviewer from inheriting the Antigravity developer logon token and accessing `%USERPROFILE%` secrets or production databases, a real separate Windows identity launcher is implemented:

1. **Dedicated Local Identity (`StudyAICodexReviewer`)**:
   - Standard non-administrator user account created via `scripts/agents/setup-reviewer-identity.ps1`.
   - Has an isolated SID (`Assert-DifferentProcessSid`).
   - Explicitly denied access to developer profile directory (`C:\Users\<developer>`).
2. **Protected IPC Directories with Asymmetric NTFS ACLs**:
   - `C:\ProgramData\StudyAI\ReviewIPC\requests`:
     - Main user (Antigravity): Modify (Write requests, Read status).
     - Reviewer: ReadAndExecute + Delete (Processes request).
   - `C:\ProgramData\StudyAI\ReviewIPC\reviews`:
     - Reviewer: Modify (Writes review and provenance).
     - Main user (Antigravity): **Read-Only** (Worker CANNOT modify or forge reviews once generated).
3. **Cryptographic Provenance & Tamper-Proofing (`Test-ReviewFileProvenance`)**:
   - Reviewer computes SHA256 of review output and signs with provenance metadata (reviewer SID, execution time, request ID).
   - Antigravity validates that the review output matches the signed SHA256 hash and originated from the distinct reviewer SID. Any post-generation modification throws `TAMPER_DETECTED`.
4. **Triggered Execution (`StudyAICodexWorker`)**:
   - Standard user triggers `schtasks.exe /run /tn "StudyAICodexWorker"` without administrative privileges.
   - Worker runs `Invoke-CodexReviewerWorker.ps1` in the security context of `StudyAICodexReviewer`.

### Administrative Provisioning (Requires Explicit Approval)
Running setup requires Administrator elevation:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\agents\setup-reviewer-identity.ps1
```
Until this provisioning is executed on the local machine and verified via `Test-DualAgentReadiness.ps1`, `automatedCodexEnabled` remains `false` (fail-closed).
