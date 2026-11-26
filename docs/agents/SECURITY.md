# Security & Database Safety Architecture

## 1. Sandbox & Privilege Controls

- **Codex Read-Only Isolation**: `codex-plan.ps1` and `codex-review.ps1` always pass `--ignore-user-config --disable plugins -s read-only --ephemeral`. Personal `~/.codex/config.toml` settings (such as `windows.sandbox = "elevated"` or desktop/browser plugins) are never loaded.
- **Immutable Snapshot**: Before invoking Codex, `codex-plan.ps1` / `codex-review.ps1` creates a detached `git worktree` in `$env:TEMP` at the exact committed `HeadSha`, runs Codex against that snapshot, and removes it in `finally`.
- **Dirty Worktree Protection**: `Assert-CleanWorktree` blocks automated review when uncommitted changes exist, preventing stale or unattributed reviews.
- **Process Locking**: `Acquire-AgentLock` uses atomic `FileMode.CreateNew` lockfiles in `$env:TEMP\studyai-agent-locks` to enforce at most 1 concurrent implementation/review call.

## 2. Secret Isolation & Prompt Injection Defense

- **Environment Scrubbing**: `Invoke-CodexSandboxed` removes `GITHUB_TOKEN`, `GH_TOKEN`, `OPENAI_API_KEY`, `ANTIGRAVITY_CSRF_TOKEN`, `ConnectionStrings__DefaultConnection`, `STUDYAI_CONNECTION_STRING`, `DATABASE_URL`, `SQL_CONNECTION_STRING`, and `AZURE_CLIENT_SECRET` from the child process environment. Codex uses only its existing ChatGPT login (`~/.codex/auth.json`).
- **Audit Log Redaction**: `Redact-SensitiveText` strips SQL connection strings/passwords, `Bearer` tokens, `gho_*`, and `sk-*` keys before writing to `$env:TEMP\studyai-agent-audit`.
- **Untrusted Data Delimiters**: Diffs, source code, and task descriptions are wrapped in `<UNTRUSTED_*>` tags. Scripts never `Invoke-Expression` or execute shell commands extracted from Codex output.
- **Strict Output Validation**: `Test-ReviewOutputValid` rejects non-JSON output, missing schema fields, `PASS` verdicts containing `P0`/`P1` findings, and any review whose `head_sha` does not match the expected snapshot SHA.

## 3. Database Safety (ENV-01 / ENV-02)

- `StudyAIDb` (persistent dev/prod database) and `StudyAIDb_E2E` (forbidden) are blocked by `Assert-DatabaseSafety` whenever detected in connection-string environment variables.
- Only `StudyAIDb_Clean_{GUID}` managed by `DatabaseSafetyGuard` may be used for automated tests.
- Codex Reviewer has zero SQL MCP tools and zero database credentials.

## 4. Rollback Instructions

1. **Antigravity MCP Config**: Restore `~/.gemini/config/mcp_config.json` from `~/.gemini/config/mcp_config.json.bak`.
2. **Codex Config**: Personal `~/.codex/config.toml` was never modified; backup exists at `~/.codex/config.toml.bak`.
3. **Repository**: Close Draft PR and delete branch `feature/safe-agent-orchestration` (and remove worktree `D:/TN-safe-agents`).
