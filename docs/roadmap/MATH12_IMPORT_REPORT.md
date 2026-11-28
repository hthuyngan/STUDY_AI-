# MATH12 IMPORT REPORT (DATA-20..22)

> **Cập nhật:** 2026-11-28 (Round 08 — V8.0)
> **Cơ sở dữ liệu kiểm thử:** `StudyAIDb_Clean_{GUID}` (tuyệt đối không chạm `StudyAIDb` hay `StudyAIDb_E2E`).
> **Pipeline:** [Math12DatasetImportService.cs](file:///D:/TN-math12-content/backend/src/StudyAI.Api/Features/Content/Math12DatasetImportService.cs) & [Math12DatasetImportTests.cs](file:///D:/TN-math12-content/backend/tests/StudyAI.IntegrationTests/Math12DatasetImportTests.cs)

## 1. Kết quả kiểm thử Import trên `StudyAIDb_Clean_{GUID}`

| Bước kiểm thử | Kết quả | Chi tiết xác minh |
| :--- | :--- | :--- |
| `DryRun = true` | **PASS** | Báo cáo `76` lesson blocks, `68` questions, `8` assessments, `6` materials, `6` knowledge sources, `19` chunks; `0` thay đổi trong DB |
| Import lần 1 (`DryRun = false`) | **PASS** | Upsert transactional qua `ExecutionStrategy`: `76` `LessonContentBlock`, `8` `ContentAssessment`, `68` `ContentQuestion`, `6` `ContentMaterial`, `6` `AiKnowledgeSource`, `19` `AiKnowledgeChunk` |
| Import lần 2 (Idempotency) | **PASS** | Số lượng bản ghi `q_m12_*` giữ nguyên `68`, `blk_les_math12_*` giữ nguyên `76` — **0 bản sao trùng lặp** |
| Chấm điểm thực tế (`asm_m12_c1`) | **PASS** | Học viên nộp bài gồm `multiple-choice`, `true-false-group` (`"Đúng,Sai,Đúng,Đúng"`), `short-answer` (`"3.0"`) -> đạt `7/7`, `passed` |

## 2. Xác nhận an toàn dữ liệu
- `StudyAIDb` không bị ghi/migrate/seed trong suốt quá trình kiểm thử.
- Không có dữ liệu `vnhsge` nào bị đổi trạng thái từ `draft` sang `published`.
