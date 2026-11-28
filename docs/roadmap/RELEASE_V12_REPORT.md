# RELEASE V12.0 REPORT — AI TUTOR TOÁN 12

> **Date:** 2026-11-28 (Asia/Bangkok)
> **Canonical Workspace:** `D:\TN-math12-content` (`feature/math12-integrated-release`, base `1009bb8c`)
> **Protected Workspace:** `D:\TN` (`feature/p05-question-mapping-assessment-integrity`, `33cca441`, 26 P05 files untouched)

---

## 1. Key Deliverables & Fixes

1. **Workspace & Runtime Diagnosis:**
   - Audited all 9 worktrees + 1 temp worktree ([WORKSPACE_INVENTORY.md](file:///D:/TN-math12-content/docs/roadmap/WORKSPACE_INVENTORY.md)).
   - Identified root cause of live `localhost:5174` / `localhost:8000` errors: processes `StudyAI.Api.exe` (PID `11652`) and `vite.js` (PID `40588`) are running from `D:\TN` (P05 branch, 30 commits behind `math12`) against `StudyAIDb` at P04 migration `20261126125233` ([LIVE_RUNTIME_DIAGNOSIS.md](file:///D:/TN-math12-content/docs/roadmap/LIVE_RUNTIME_DIAGNOSIS.md)).
   - Added unified startup workflow [start_studyai.ps1](file:///D:/TN-math12-content/scripts/start_studyai.ps1) and updated [README.md](file:///D:/TN-math12-content/README.md).
2. **Live 4-Role Browser QA (`StudyAIDb_Clean_{GUID}`):**
   - Verified `D:\TN-math12-content` on `127.0.0.1:8012` + `127.0.0.1:5175` via `scripts/qa_v12_live_browser_audit.ts`: `AI TUTOR TOÁN 12` sidebar verified, **`36/36` routes PASS** across `User`, `Content`, `Teacher`, and `Admin` (`0` HTTP 5xx, `0` pageErrors, `0` desktop/mobile overflow).
3. **Dual-Agent & Engineering Fixes:**
   - **Phase 13:** Full-prompt context accounting + separator-bounded/component-walked `ContextPaths` in `scripts/agents/codex-review.ps1`.
   - **Phase 14:** Replaced fake `computedAnswer = correctAnswer` copy with real non-evaluating AST-whitelisted SymPy validation (`scripts/math12_audit_all_records.py`, `scripts/test_math12_validator.py`).
   - **Phase 22:** Atomic file staging/backup promotion before `tx.CommitAsync` in `Math12DatasetImportService.cs`.
4. **Math 12 Dataset Completion (`backend/data/math12/`):**
   - **190** lesson-specific `LessonContentBlock`s (no generic templates), **1,200** questions (`600` MC, `300` TFG, `300` SA), **34** non-empty assessments (incl. 10 BGD-2025 `12/4/6 = 22` mock exams), **30** Markdown materials, **30** `AiKnowledgeSource`s / **210** chunks.
   - Real SymPy audit: **`681` `MATH_AUTO_VERIFIED`**, **`519` `HUMAN_REVIEW_REQUIRED`**, **`0` `FAILED`**.

---

## 2. Quality Gates (Observed)

| Gate | Result |
| :--- | :--- |
| `Test-DualAgentReadiness.ps1` | **READY** (`gpt-6.1-sol`, `high`, `read-only`) |
| `Test-ReviewOrchestrator.ps1` | **14/14 PASS** |
| `Test-SafeAgentBridge.ps1` | **14/14 PASS** |
| `Test-SafeAgentAdversarial.ps1` | **45/45 PASS** |
| `scripts/test_math12_validator.py` | **8/8 PASS** |
| `dotnet test StudyAI.sln` (`StudyAIDb_Clean_{GUID}`) | **351/351 UnitTests PASS**, **282/282 IntegrationTests PASS** (`Math12DatasetImportTests` re-verified `1/1 PASS` after final edit) |
| Frontend (`bun run lint`, `bun run test`, `bun run build`) | **0 oxlint warnings/errors**, **Vitest ALL PASS**, **Vite build PASS** (`4.04s`) |
| Codex 6.1 High Final Review | **`verdict: PASS`** (`0` P0/P1, 3 non-blocking P2 notes) |

---

## 3. Gates Awaiting Explicit Owner Approval

- Modifying/merging `D:\TN` (26 P05 files preserved intact) or deleting any of the 9 worktrees.
- Applying the 5 pending migrations or importing the 1,694 Math 12 records into persistent `StudyAIDb` (see [DATABASE_DEPLOYMENT_READINESS.md](file:///D:/TN-math12-content/docs/roadmap/DATABASE_DEPLOYMENT_READINESS.md)).
- `ADM-04`, `ADM-05`, `USER-09` design gates, and Draft PR `#38` merge.
