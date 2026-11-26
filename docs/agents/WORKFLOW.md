# Safe Multi-Agent Orchestration Workflow (STUDY_AI-)

## 1. Capability Discovery Reality (Antigravity 44.9.1 + Codex CLI 0.163.0)

| Capability | Status | Details & Constraints |
|---|---|---|
| Native subagents | **Supported** | `define_subagent`, `invoke_subagent`, `manage_subagents`, `send_message` |
| Isolated subagent workspace | **Supported** | `Workspace: "share"` (git worktree-like) or `"branch"` (isolated clone) |
| Subagent `Model` parameter | **Partial** | Enum is `inherit`, `flash_lite`, `flash`, `pro` |
| Per-subagent reasoning effort | **Not supported** | `invoke_subagent` has no `reasoning_effort` parameter; `inherit` uses the parent session's model and reasoning setting |
| Codex non-interactive CLI | **Supported** | `codex exec --ignore-user-config --disable plugins -s read-only --ephemeral --output-schema ...` |
| Codex reasoning per call | **Supported** | `-c 'model_reasoning_effort="medium"'` (plan/initial) or `"low"` (simple re-review) |

### Session Topology (Single-Session Hydrogen Medium)

- **Recommended (1 Antigravity session)**: Open a single Antigravity session on **Gemini 4 Hydrogen (Medium)**.
  - **Agent 1 (Orchestrator)**: Runs in the parent session (`Gemini 4 Hydrogen (Medium)`), never edits application code directly, and only consumes `TASK.json`, `TEST-SUMMARY.json`, `REVIEW.json`, and blockers.
  - **Agent 2 (Implementation Worker)**: Invoked via `invoke_subagent(TypeName="implementation-worker", Model="inherit", Workspace="share")`, inheriting **Gemini 4 Hydrogen (Medium)** from the parent session. Only 1 worker runs at a time.
  - **Agent 3 (Independent Reviewer)**: Invoked via `scripts/agents/codex-plan.ps1` (`medium`) and `scripts/agents/codex-review.ps1` (`medium` initial / `low` re-review) in `-s read-only`.

## 2. Agent Roles

1. **Agent 01 — Orchestrator (Antigravity)**
   - Reads `AGENTS.md` and `PROGRESS.md`, verifies Git/GitHub state.
   - Calls `scripts/agents/codex-plan.ps1` to generate a structured plan.
   - Stops for human approval if `requires_human_approval` is `true` or `risk_level` is `HIGH`.
   - Assigns scoped workstreams to Agent 02 (only 1 active Implementation Worker at a time).
   - Calls `scripts/agents/codex-review.ps1` after tests pass and working tree is clean.
   - Manages max 3 automatic review rounds; stops on `ERROR`, quota, auth, timeout, or round > 3.
2. **Agent 02 — Implementation Worker (Antigravity)**
   - Implements frontend, backend, and guarded test database layer changes on a dedicated feature branch.
   - Runs targeted tests and full required gates before requesting review.
   - Fixes valid Codex findings; never changes phase or merges PRs.
3. **Agent 03 — Independent Reviewer (Codex Local CLI)**
   - Runs strictly in `-s read-only --ephemeral --ignore-user-config --disable plugins` on an immutable detached git snapshot.
   - Never edits application code, never accesses `StudyAIDb`, and never executes GitHub writes.

## 3. End-to-End Execution Loop

```text
User Request
  -> Step 1: Orchestrator reads AGENTS.md, PROGRESS.md, Git state
  -> Step 2: codex-plan.ps1 (reasoning=medium) -> PLAN + Acceptance Criteria
  -> Step 3: Implementation Worker edits code + runs targeted tests + commits to feature branch
  -> Step 4: codex-review.ps1 -ReviewMode initial (reasoning=medium) -> JSON Verdict
  -> Step 5: If BLOCKED -> Worker fixes findings + runs regression tests -> codex-review.ps1 -ReviewMode rereview (reasoning=low) [max 3 rounds]
  -> Step 6: If PASS -> Run full gates -> Verify HEAD SHA matches review -> Update PROGRESS.md -> Push Draft PR
  -> Step 7: Report to user and wait for human acceptance
```
