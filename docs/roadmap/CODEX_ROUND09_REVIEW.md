# CODEX ROUND 09 REVIEW SUMMARY (R09-01 .. R09-10)

> **Model & Sandbox:** Codex 6.1 High (`gpt-6.1-sol`, `reasoning=high`, `-s read-only`, provider `teamsoclo`)
> **R09-01 Fix:** Bổ sung `-ContextPaths` vào [codex-review.ps1](file:///D:/TN-math12-content/scripts/agents/codex-review.ps1) (`4e4a1e41`, `a98b3fcf`) để cung cấp `<UNTRUSTED_IMMUTABLE_CONTEXT>` (entities, DbContext, validators, callers, tests) ngay trong gói review bất biến mà không nới lỏng `-s read-only`.

## 1. PACKET A — Import Integrity & DB Safety (`R09-02`)
- **Initial Review (`a98b3fcf`, `R09-PACKET-A`):** `BLOCKED` (`M12-001` P1 thiếu DB safety guard; `M12-002` P1 ghi đè `published`/`approved`; `M12-003` P1 `AuthorId` fallback; `M12-004` P2 business-key subject; `M12-005` P2 dry-run thiếu kiểm tra đầy đủ).
- **Remediation & Re-review (`f7db70cf`, Attempt 2):** **`verdict: PASS`** (`M12-001..003` resolved). Tiếp tục hoàn thiện nốt 4 điểm P2 (`M12-004` tra cứu chặt `Code == "MATH12" && Grade == "12"`, `M12-005` dry-run đầy đủ `345` bản ghi, `M12-006` cập nhật file vật lý khi hash thay đổi, loại bỏ `allowOverwriteProtected`).

## 2. PACKET B — Assessment Grading & Historical Integrity (`R09-10`)
- **Initial Review (`a98b3fcf`, `R09-PACKET-B`):** `BLOCKED`:
  - `A2-001` (`P1`): Heuristic `!AssessmentId.StartsWith("asm_")` có thể làm lệch scope của `asmt_exam` / `asmt_practice`.
  - `A2-002` (`P2`): `true-false` và `short-answer` chưa kiểm tra `selectedOptions.Count == 1`.
- **Remediation (`f7db70cf` & `Math12UserWorkspaceTests.cs`):**
  - Đổi sang `var isTargetedAssessment = assessmentMeta != null;` (chỉ khóa `AssessmentId` khi tồn tại `ContentAssessment` thực trong DB).
  - Bắt buộc `selectedOptions.Count == 1` cho `true-false` và `short-answer`, kèm regression test `asmt_exam` và `["5/2", "999"]` trong `Math12UserWorkspaceTests.cs`.
