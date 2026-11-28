# DATABASE MIGRATION STATUS (ROUND 08)

> **Cập nhật:** 2026-11-28 (Asia/Bangkok)
> **Nguyên tắc ENV-01/ENV-02:** `StudyAIDb` là CSDL persistent duy nhất cho Development/Production và **tuyệt đối không bị ghi/migrate/seed tự động**. Mọi test/E2E/import test chỉ chạy trên `StudyAIDb_Clean_{GUID}`.

## 1. Trạng thái Migration
- **`StudyAIDb` (Read-Only Inventory):** Đang ở migration `20261126125233_AddGeneralizedLessonResources` (P04). Các migration P05 (`AddQuestionMappingAndAssessmentIntegrity`), `AddMath12ContentWorkspace`, `AddMath12TeacherWorkspace`, `AddRound06IntegrityAndStorage` **chưa được áp dụng** lên `StudyAIDb` và đang chờ cửa sổ bảo trì có phê duyệt của chủ dự án.
- **`StudyAIDb_Clean_{GUID}` (Isolated Testing/E2E):** Áp dụng đầy đủ toàn bộ migration mới nhất, vượt qua `351/351` UnitTests, `282/282` IntegrationTests (bao gồm `Math12DatasetImportTests`), và `Phase 20 Playwright E2E`.
- **`D:\TN` (P05 Worktree):** Không chỉnh sửa (`25/25` file trong `p05_sha256_baseline.json` khớp SHA-256, `0` sai lệch).
