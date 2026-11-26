# STUDY_AI persistent progress checkpoint (PR #28 worktree)

> Last reconciled: 2026-11-26 (Asia/Ho_Chi_Minh). Always verify actual Git HEAD and CI; this file applies to the agent tooling branch, not P02.

- **Current phase:** Safe Dual-Agent Bridge, independent acceptance pending.
- **Current task:** Prevent accidental activation without OS identity isolation; provide local preflight and safe pull instructions.
- **Branch:** `feature/safe-agent-orchestration` (Draft [PR #28](https://github.com/hthuyngan/STUDY_AI-/pull/28), unmerged).
- **Last verified remote HEAD before this change:** `7e57322314827e18bbe7d75e3ff2a3e031a31965`.
- **Last reported CI:** Safe Agent Bridge success [run 45749662218](https://github.com/hthuyngan/STUDY_AI-/actions/runs/45749662218) on that HEAD.
- **Verified capabilities:** ECO/STANDARD routing; local fixture adversarial + hermetic tests; Codex read-only plan invocation on fixture; PS5.1/PS7 CI at prior HEAD.
- **Blocked:** Unattended Codex on real project. Existing `CreateProcessW` inherits caller SID; no independent reviewer identity launcher. Latest live review hit `CODEX_QUOTA_EXCEEDED`.
- **Security policy:** `automatedCodexEnabled=false`, review cache disabled, bridge DB operations disabled, no P02 or StudyAIDb writes, no auto merge.
- **Open work:** Design/implement and independently verify separate-identity Windows launcher, protected IPC/results, Codex sign-in, SID/ACL negative tests, end-to-end initial review + remediation + rereview.
- **Next action:** Pull latest PR28 commit into the dedicated clean `D:\\TN-safe-agents` worktree; run `Test-DualAgentReadiness.ps1`, hermetic tests and CI. Do not change the config switch until identity and quota gates pass.
- **Separate P02:** Keep `D:\\TN` and its `PROGRESS.md` untouched; no merge or lifecycle migration authorized.
