# WORKSPACE CONSOLIDATION PLAN (WORKSPACE-01)

> **Updated:** 2026-11-28 (Asia/Bangkok)
> **Reviewed By:** Codex 6.1 High (`gpt-6.1-sol`, `reasoning=high`, `-s read-only`, `risk_level=HIGH`, `requires_human_approval=true`)
> **Target Canonical Workspace (After Approval):** `D:\TN`
> **Current Active Integration Workspace:** `D:\TN-math12-content` (`feature/math12-integrated-release`)

---

## 1. Zero-Data-Loss Cutover Procedure (Requires Owner Approval)

1. **Preserve `D:\TN` Protected P05 Work & Secrets:**
   - Snapshot all 26 dirty/untracked P05 files on `D:\TN` (`feature/p05-question-mapping-assessment-integrity`, `33cca441`) into a preservation commit/branch.
   - Securely back up `D:\TN\backend\.env` and `D:\TN\frontend\.env` locally (never commit or log secrets).
2. **Stop Legacy `D:\TN` Processes (Owner-Approved):**
   - Stop only verified `D:\TN` processes (`StudyAI.Api.exe` PID `11652` on port `8000`, `vite.js` PID `40588` on port `5174`, and `vite.js` PID `36688` on port `5175` if unused).
3. **Reconcile & Cut Over `D:\TN`:**
   - Merge/cherry-pick P05 changes into `feature/math12-integrated-release` (resolving any conflicts and running full quality gates).
   - Switch `D:\TN` cleanly to the verified integrated branch and restore local `.env` files.
4. **Archive & Cleanup Candidates (8 Redundant Worktrees — Do Not Auto-Delete):**
   - `D:\TN-admin-first` (`feature/admin-first-fullstack`, `58e72de0` — port `ADMIN_ROUND04_REPORT.md` first)
   - `D:\TN-docs` (`codex/docs-p02-integration-plan`, `2aad562b`)
   - `D:\TN-progress-tracking` (`codex/docs-agent-progress-tracking`, `74fd49f9`)
   - `D:\TN-pr28-preadmin-review` (`codex/pr28-pre-admin-security-review`, `8fe1e434` — archive security audit evidence)
   - `D:\TN-rereview-pr28` (`codex/pr28-independent-rereview`, `e6423161` — archive re-review evidence)
   - `D:\TN-review-pr28` (detached `8385b10a` — archive review evidence)
   - `D:\TN-safe-agents` (`feature/safe-agent-orchestration`, `d5374e7d`)
   - `D:\TN-math12-content` (`feature/math12-integrated-release` — remove only after `D:\TN` cutover is verified).
