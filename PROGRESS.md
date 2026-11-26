# STUDY_AI persistent progress checkpoint (PR #28 worktree)

> Last reconciled: 2026-11-26 (Asia/Ho_Chi_Minh). Always verify actual Git HEAD and CI; this file applies to the agent tooling branch, not P02.

- **Current phase:** Safe Dual-Agent Bridge (Trusted Local Developer Workflow).
- **Current task:** Simplified Dual-Agent workflow active: Antigravity Medium + Codex Local CLI; no secondary Windows accounts or admin provisioning required.
- **Branch:** `feature/safe-agent-orchestration` (Draft [PR #28](https://github.com/hthuyngan/STUDY_AI-/pull/28), unmerged).
- **Last verified remote HEAD before this change:** `cbdba2ba6ea7ae1cf2e09b552bb7a8f5c353d712`.
- **Verified capabilities:** ECO/STANDARD routing; local fixture adversarial (45/45 PASS); hermetic bridge tests (12/12 PASS); official read-only sandbox + JobObject tree containment + minimal env allowlist; diff-based review; PS5.1/PS7 CI.
- **Readiness status:** READY (`Test-DualAgentReadiness.ps1` confirms automated Codex invocation enabled in `agent-config.json`).
- **Security policy:** Trusted local developer model (same Windows user; process read-only sandbox, JobObject containment, stripped env, no DB/secret access, StudyAIDb strictly protected, max 3 review rounds).
- **Next action:** Execute minimal automated E2E test, commit and push to PR #28, verify CI, and return to P02 curriculum development.
- **Separate P02:** Keep `D:\\TN` and its `PROGRESS.md` untouched; no merge or lifecycle migration authorized.
