# MATH12 KNOWLEDGE BASE & REAL MATERIALS REPORT (R09-03)

> **Cập nhật:** 2026-11-28 (Round 09 — V9.0)

## 1. Tài liệu vật lý thực tế (`ContentMaterial` + Disk Storage)
- `Math12DatasetImportService` ghi `6` tệp Markdown thực tế (`mat_orig_m12-c1.md` .. `mat_orig_m12-c6.md`) vào `App_Data/uploads/content-materials/{id}{safeExt}` (khớp `ContentWorkspaceService.FindMaterialStoredPath`).
- Tính `FileSizeBytes` và `FileHashSha256` từ byte thực tế; nếu cập nhật nội dung sẽ ghi đè an toàn và dọn file mới tạo nếu transaction SQL lỗi.
- **Kiểm chứng download thực tế:** `GET /api/v1/content/workspace/materials/mat_orig_m12-c1/download` trả `200 OK` trong `Math12DatasetImportTests`.

## 2. Kho tri thức AI (`AiKnowledgeSource` & `AiKnowledgeChunk`)
- `6` `AiKnowledgeSource` (`ksrc_orig_m12-c1..c6`) gắn với `6` tài liệu chương Toán 12.
- `19` `AiKnowledgeChunk` phủ đủ `19` bài học (`les_math12_c1_b1..c6_b2`).
- **Quy tắc an toàn xuất bản:** Khi import thông thường, trạng thái mặc định là `draft`/`pending`; chỉ cho phép `published`/`indexed` tự động trên CSDL cô lập `StudyAIDb_Clean_{GUID}` với cờ `allowPublishInIsolatedTest: true`.
- **Chống rò rỉ RAG (`AiTutorService.RetrievePublishedKnowledgeContextAsync`):** Lọc chặt `m.Status == "published" && m.ChapterCode.StartsWith("M12-")`, `l.Status == "published" && l.Chapter.Subject.Grade == "12"`, `c.Source.Status == "indexed"`.
