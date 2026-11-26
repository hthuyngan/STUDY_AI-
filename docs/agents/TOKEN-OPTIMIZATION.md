# Multi-Agent Token Optimization Guide (STUDY_AI-)

## 1. Agent Specialization & Context Boundaries

| Agent | Role | Context Scope |
|---|---|---|
| **Agent 01 — Orchestrator** (Antigravity) | Scope, task routing, decision checkpoints, final summary | Reads `AGENTS.md`, `PROGRESS.md`, `REPO-MAP.md`, `TASK.json`, `REVIEW.json`, `TEST-SUMMARY.json` only. Never reads full source files or raw terminal logs. |
| **Agent 02 — Implementation Worker** (Antigravity) | Single active writer, code/debug/test/fix | Reads only `scope_files` and direct dependencies via `rg`, `git diff`, Serena symbols, and Context7. |
| **Agent 03 — Independent Reviewer** (Codex Local CLI) | Read-only planner & reviewer | Receives bounded `git diff` (excluding `node_modules`, `bin`, `obj`, `dist`, lockfiles) on an immutable detached snapshot. |

## 2. Task Routing (`scripts/agents/agent-config.json`)

- **FAST**: Low-risk, localized edits. Skip `codex-plan.ps1`; run targeted tests and combine review at workstream end. **Never** bypasses security, DB safety (`ENV-01`/`ENV-02`), or schema validation.
- **STANDARD**: Normal CRUD/API/UI tasks. Worker implementation -> targeted tests -> `codex-review.ps1 -ReviewMode initial` (`medium` reasoning).
- **STRICT**: Security, RBAC, database/migrations, concurrency, architecture. Requires `codex-plan.ps1` (`medium` reasoning) + user approval if `requires_human_approval=true` -> Worker -> full required gates -> `codex-review.ps1 -ReviewMode security` (`medium` reasoning).

## 3. Structured Communication & Log Filtering

- **Task Packet** (`scripts/agents/task-schema.json`): Pass only `task_id`, `route`, `objective`, `base_sha`, `scope_files`, `constraints`, `acceptance_criteria` — never full conversation history.
- **Deterministic Log Filter** (`scripts/agents/summarize-logs.ps1`): Stores raw build/test output outside model context and returns compact `TEST-SUMMARY.json` (`test-summary-schema.json`) with `passed`, `failed`, `skipped`, `duration_ms`, and up to 25 error/stack lines.
- **Re-review Delta**: `codex-review.ps1 -ReviewMode rereview -PreviousFindingsFile <path>` uses `low` reasoning and sends only prior findings + remediation diff.

## 4. Review Caching & Invalidation

- `codex-review.ps1` caches valid review JSON in `%TEMP%\studyai-agent-cache\` keyed by `SHA256(base_sha | head_sha | review_mode | changed_files | policy_hash)` with a 24h TTL.
- Any change to source (`head_sha`), `base_sha`, `review_mode`, scope, or `agent-config.json` policies automatically invalidates the cache.

## 5. Honest Platform Capability Matrix

| Feature | Supported? | Actual Behavior |
|---|---|---|
| Codex per-call reasoning (`medium` / `low`) | **Yes** | Via `-c model_reasoning_effort=...` |
| Codex exact token usage metrics | **Yes** | Via `codex exec --json` (`input_tokens`, `cached_input_tokens`, `output_tokens`, `reasoning_output_tokens`) logged to `%TEMP%\studyai-agent-usage\usage.jsonl` |
| Antigravity per-subagent reasoning override | **No** | `invoke_subagent` `Model` enum is `inherit | flash_lite | flash | pro`; no `reasoning_effort` parameter |
| Antigravity exact token usage API | **No** | Not exposed to scripts/tools; only Codex CLI token usage is directly measured |
| Automatic context compaction API | **No** | Compaction is UI/runtime-managed (`/compact`), not scriptable |
