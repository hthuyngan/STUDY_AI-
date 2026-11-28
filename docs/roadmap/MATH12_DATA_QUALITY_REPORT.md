# MATH12 DATA QUALITY REPORT (DATA-02)

> **Cập nhật:** 2026-11-28 (Round 08 — V8.0)
> **Căn cứ:** Kiểm kê read-only `StudyAIDb` ([MATH12_DATA_INVENTORY.md](file:///D:/TN-math12-content/docs/roadmap/MATH12_DATA_INVENTORY.md)) và kiểm tra mã nguồn hiện tại.

## 1. Hiện trạng dữ liệu Toán 12 trước Round 08

| Thực thể | Số lượng hiện có | Trạng thái | Đánh giá chất lượng |
| :--- | :---: | :--- | :--- |
| `content_subjects` (`sub_math12`) | 1 | `IsActive = true` | Đạt chuẩn — giữ nguyên ID `sub_math12` |
| `content_chapters` (`chp_math12_c1..c6`) | 6 | `IsActive = true` | Đúng 6 chương GDPT 2018 KNTT, nhưng thiếu mô tả chuẩn hóa |
| `content_lessons` (Bài 1..19) | 19 | `published` | Có đủ 19 bài theo cấu trúc KNTT 2018, nhưng **0 `lesson_content_blocks`** (nội dung chi tiết rỗng) |
| `lesson_content_blocks` | **0** | Trống | **Lỗ hổng nghiêm trọng (GAP-01):** Học viên mở bài học không có khối lý thuyết, công thức, ví dụ mẫu |
| `content_assessments` | **0** | Trống | **Lỗ hổng nghiêm trọng (GAP-02):** Chưa có đề kiểm tra chương / đề ôn tập THPT chính thức |
| `content_questions` (legacy `vnhsge`) | 2.544 | `draft` / `pending_verification` | `LICENSE_BLOCKED` — giữ nguyên `draft`, không sửa/publish |
| `content_questions` (published `manual`) | 2 | `published` | Thiếu nghiêm trọng so với nhu cầu luyện tập & kiểm tra 19 bài |
| `content_materials` & `ai_knowledge_sources` | 0 (seed) | Trống | **Lỗ hổng (GAP-03):** RAG AI Tutor chưa có kho tri thức Toán 12 chuẩn hóa |

## 2. Phân tích lỗi & khoảng trống kỹ thuật liên quan dữ liệu
1. **Định dạng câu hỏi mới (BGD 2025):** Backend `StudentAssessmentService` trước Round 08 chỉ chấm tốt trắc nghiệm 1 lựa chọn/nhiều lựa chọn; đã được nâng cấp trong `SYS-03` để hỗ trợ `true-false`, `true-false-group` (4 ý Đúng/Sai) và `short-answer` (số thập phân dấu `,` hoặc `.`, phân số `a/b`, sai số `1e-6`).
2. **Chống rò rỉ dữ liệu nháp (Draft isolation):** `AiTutorService.RetrievePublishedKnowledgeContextAsync` và `StudentAssessmentService` chỉ truy xuất bản ghi `published` + `indexed`. Dữ liệu `vnhsge` ở trạng thái `draft` được cách ly hoàn toàn.
3. **Tính idempotent khi import:** `StudyAIDb` đã có `sub_math12`, `chp_math12_c1..c6`, và 19 `content_lessons`. Pipeline import mới phải **upsert an toàn theo ID/Slug/Fingerprint ổn định**, không tạo bản sao trùng lặp.
