# CODEX FINAL SYSTEM REVIEW & RELEASE ROUND 08 REPORT

> **Cập nhật:** 2026-11-28 (Round 08 — V8.0)
> **Model & Sandbox:** Codex 6.1 High (`gpt-6.1-sol`, `reasoning=high`, `-s read-only`, provider `teamsoclo`).

## 1. Tóm tắt các lượt kiểm định Codex 6.1 High
1. **Initial System Review (`v8-sys-20261128-103808`):**
   - `SYS-03` (`R2`): Phát hiện `scopeQuestions` dùng `AssessmentId OR LessonId` có nguy cơ lẫn câu hỏi bài học vào đề kiểm tra mục tiêu.
   - `SYS-05`: Phát hiện `TW-UPLOAD-ORPHAN` (file upload không được xóa nếu `SaveChangesAsync` lỗi) và `TW-AI-QUOTA-RACE` (kiểm tra quota trước khi gọi LLM không nguyên tử).
2. **Codex Remediation Plan (`SYSTEM-06`):** Sinh kế hoạch chi tiết tại [CODEX_FINAL_REMEDIATION_PLAN.md](file:///D:/TN-math12-content/docs/roadmap/CODEX_FINAL_REMEDIATION_PLAN.md).
3. **Antigravity Implementation (`04cdd9ca`, `e918c3c5`):**
   - `StudentAssessmentService`: Khoanh vùng chặt `q.AssessmentId == attempt.AssessmentId` cho đề mục tiêu; hỗ trợ chấm `true-false`, `true-false-group`, `short-answer` (số thập phân `,`/`.`, phân số `a/b`).
   - `ContentWorkspaceService`: Xóa file rác khi `SaveChangesAsync` lỗi/hủy (và giữ file nếu `WriteStaffAuditAsync` lỗi sau khi commit — sửa finding `R1-CONTENT-AUDIT-ORPHAN` từ Codex re-review round 1); giới hạn `maxStreams=256`, `maxExtractedChars=200_000`, `regexTimeout=250ms` khi trích xuất PDF.
   - `AiUsageService` & `TeacherWorkspaceService`: Thêm `TryReserveQuotaAsync` (per-user `SemaphoreSlim` + `Serializable` transaction qua `ExecutionStrategy` cho cả hạn mức ngày và tháng), `FinalizeUsageReservationAsync`, `ReleaseUsageReservationAsync`, và xóa file upload nếu `SaveChangesAsync` lỗi/hủy.
4. **Codex Re-review Round 2 (`23f35414`):** `findings: []` (`0` lỗi mới; ghi nhận `R1-CONTENT-AUDIT-ORPHAN` đã được khắc phục; `verdict: ERROR` do sandbox `read-only` chặn lệnh shell đọc snapshot ngoài diff).

## 2. Kết luận nghiệm thu Round 08
- **Backend:** `351/351` UnitTests + `282/282` IntegrationTests = **`633/633` PASS**.
- **Frontend:** `oxlint`, `vitest`, `vite build` = **PASS**.
- **Dual-Agent Guardrails:** `13/13` + `14/14` + `45/45` = **`72/72` PASS**.
- **Playwright E2E:** `e2e_phase20_playwright.ts` **PASS (`35s`, `16` screenshots)**.
- **An toàn DB & Nhánh:** `StudyAIDb`, `StudyAIDb_E2E`, `D:\TN`, `ADM-04`, `ADM-05`/`USER-09`, Draft PR `#38` được giữ nguyên vẹn.
