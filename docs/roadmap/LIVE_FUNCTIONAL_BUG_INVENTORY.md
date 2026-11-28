# LIVE FUNCTIONAL BUG INVENTORY (V12.0)

> **Updated:** 2026-11-28 (Asia/Bangkok)
> **Scope:** Live runtime diagnosis (`localhost:5174` / `localhost:8000`) + Isolated QA 4-role Playwright audit (`StudyAIDb_Clean_{GUID}`, 36 routes).

---

| Bug ID | Role | Feature / Route | Severity | Root Cause | Remediation / Status |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `LIVE-BUG-01` | User | Sidebar & Dashboard (`localhost:5174` / `localhost:8000`) | **P0** | Running processes (`StudyAI.Api.exe` PID `11652`, `vite.js` PID `40588`) served from `D:\TN` (`feature/p05-...`, 30 commits behind `math12`) against `StudyAIDb` at P04 migration `20261126125233` | **FIXED in QA** (`D:\TN-math12-content` verified on `8012`/`5175` with `AI TUTOR — TOÁN 12` sidebar & 36/36 routes PASS); Unified startup script `scripts/start_studyai.ps1` created |
| `LIVE-BUG-02` | User | `/subjects/math` & `/practice` on unseeded DB | **P2** | `GET /api/v1/curriculum/subjects/math` returns `404` when `sub_math12` is not yet imported into an empty `StudyAIDb_Clean_{GUID}` | **OPEN (Expected on empty DB)** — resolved by running `Math12DatasetImportService` (`1,694` records) |
| `M12-REVIEW-001` | Data | `scripts/math12_audit_all_records.py` | **P1** | SymPy `parse_expr` evaluated `verificationSpec` strings | **FIXED** — replaced with strict non-evaluating `ast.parse` whitelist (`safe_ast_to_sympy`), `8/8` validator tests PASS |
| `M12-REVIEW-002` | Content | `Math12DatasetImportService.cs` | **P1** | Staged file promotion happened after `tx.CommitAsync` | **FIXED** — promoted staged files before `tx.CommitAsync` with backup/restore rollback, `Math12DatasetImportTests` PASS |
| `M12-REVIEW-003` | Agents | `scripts/agents/codex-review.ps1` | **P1** | Lexical `StartsWith` check & leaf-only reparse check | **FIXED** — enforced separator boundary + full component reparse-point walk |
