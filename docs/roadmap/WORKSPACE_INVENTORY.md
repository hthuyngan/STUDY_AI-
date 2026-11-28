# WORKSPACE INVENTORY & CONSOLIDATION PLAN (STUDY_AI-)

> **Updated:** 2026-11-28 (Asia/Bangkok)
> **Canonical Integration Workspace:** `D:\TN-math12-content` (`feature/math12-integrated-release`, HEAD `1009bb8c`)
> **Codex 6.1 High Review:** Executed via `codex-plan.ps1` (`gpt-6.1-sol`, `reasoning=high`, `-s read-only`, `risk_level=HIGH`, `requires_human_approval=true`)

---

## 1. Nine-Workspace Git & Process Inventory

| Workspace | Type | Branch | HEAD SHA | Ahead / Behind `math12` | Dirty / Untracked | Env Files | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `D:\TN` | Primary repo (`.git`) | `feature/p05-question-mapping-assessment-integrity` | `33cca441` | +4 / -30 | **26 dirty/untracked P05 files** | `backend/.env`, `frontend/.env` | **PROTECTED** (Do not modify/checkout/delete; currently serving `localhost:8000` & `localhost:5174`) |
| `D:\TN-math12-content` | Worktree | `feature/math12-integrated-release` | `1009bb8c` | 0 / 0 | Clean (`0`) | `.env.example` only | **KEEP_ACTIVE** (Canonical integration workspace for V12.0) |
| `D:\TN-admin-first` | Worktree | `feature/admin-first-fullstack` | `58e72de0` | +1 / -28 | Clean (`0`) | `.env.example` only | **MERGE_REQUIRED** (1 doc commit `ADMIN_ROUND04_REPORT.md` not yet in `math12`) |
| `D:\TN-docs` | Worktree | `codex/docs-p02-integration-plan` | `2aad562b` | +4 / -67 | Clean (`0`) | `.env.example` only | **MERGE_REQUIRED** (Verify 4 historical P02 doc commits before archiving) |
| `D:\TN-progress-tracking` | Worktree | `codex/docs-agent-progress-tracking` | `74fd49f9` | +2 / -60 | Clean (`0`) | `.env.example` only | **MERGE_REQUIRED** (Reconcile 2 progress commits against `PROGRESS.md`) |
| `D:\TN-pr28-preadmin-review` | Worktree | `codex/pr28-pre-admin-security-review` | `8fe1e434` | +17 / -64 | Clean (`0`) | `.env.example` only | **PROTECTED** (Preserve PR #28 security review audit evidence before archive) |
| `D:\TN-rereview-pr28` | Worktree | `codex/pr28-independent-rereview` | `e6423161` | +8 / -64 | Clean (`0`) | `.env.example` only | **PROTECTED** (Preserve PR #28 independent re-review evidence before archive) |
| `D:\TN-review-pr28` | Worktree | Detached `HEAD` | `8385b10a` | +4 / -64 | Clean (`0`) | `.env.example` only | **PROTECTED** (Detached review snapshot; preserve provenance before archive) |
| `D:\TN-safe-agents` | Worktree | `feature/safe-agent-orchestration` | `d5374e7d` | +17 / -64 | Clean (`0`) | `.env.example` only | **MERGE_REQUIRED** (Compare `scripts/agents/` vs newer `math12` `review-orchestrator.ps1` +30% budget) |

- **Locked Temp Worktree Detected:** `C:/Users/nguyen/AppData/Local/Temp/studyai-codex-review-afb8882c-9728` (detached `afb8882c`, `locked initializing` — leftover from an interrupted review run; do not force-remove without verification).
- **Approval Gate:** No workspace or worktree is deleted automatically. Destructive cleanup requires explicit owner approval after verifying zero data loss.

---

## 2. Database & Storage Inventory (Read-Only)

| Database | Server | Size (MB) | Migration / State | Classification | Cleanup Eligibility |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `StudyAIDb` | `.\SQLEXPRESS` | 272.00 | `20261126125233_AddGeneralizedLessonResources` (P04, 20 migrations) | **Persistent** | **NEVER** (Production/Dev persistent DB) |
| `StudyAIDb_E2E` | `.\SQLEXPRESS` | 400.00 | Protected E2E baseline | **Protected** | **NEVER** |
| `StudyAIDb_Clean_f1842579f7224ba1ad14598ea2751d2b` | `.\SQLEXPRESS` | 16.00 | Created `2026-11-25 08:11:37` (orphaned test DB) | **Temporary (Orphaned)** | Verify ownership manifest before cleanup |

- **Storage (`App_Data`):**
  - `D:\TN-math12-content\backend\src\StudyAI.Api\bin\Debug\net10.0\App_Data`: 4 files
  - `D:\TN-math12-content\backend\tests\StudyAI.IntegrationTests\bin\Debug\net10.0\App_Data`: 77 files

---

## 3. Consolidation Plan (Phased, Approval-Gated)

1. **Immediate (Active V12.0 Work):** Use `D:\TN-math12-content` (`feature/math12-integrated-release`) as the single active development/QA workspace. Keep `D:\TN` untouched (preserving all 26 P05 files and `.env` files).
2. **Reconciliation:** Review and selectively port `ADMIN_ROUND04_REPORT.md` (`58e72de0`) and any missing doc/agent improvements from `TN-docs`, `TN-progress-tracking`, `TN-safe-agents` without overwriting newer `math12` code.
3. **Final Cutover (Requires Explicit Owner Approval):** Once P05 is merged/reconciled and `feature/math12-integrated-release` is approved, bring `D:\TN` cleanly to the integrated branch and archive/remove redundant worktrees safely.
