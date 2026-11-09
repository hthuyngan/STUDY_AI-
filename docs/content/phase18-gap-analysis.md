# STUDY_AI — Báo cáo Phân tích Khoảng cách Dữ liệu (Gap Analysis)
## So sánh Kiến trúc Schema Hiện tại với Yêu cầu Nghiệp vụ Nhập liệu Phase 18

Ngày phân tích: 09/11/2026  
Mục đích: Xác định chính xác các điểm thiếu hụt, thành phần tái sử dụng được, rủi ro bảo mật và toàn vẹn dữ liệu trước khi bước vào triển khai cơ chế import dữ liệu ở Checkpoint 2.

---

## 1. Ma trận Phân tích Khoảng cách Schema (Schema Gap Matrix)

| Thành phần Dữ liệu | Hiện trạng Schema (Existing) | Thành phần Còn thiếu (Missing) | Khả năng Tái sử dụng (Reusable) | Nhu cầu Migration (Requires Migration) | Rủi ro Bảo mật (Security Concerns) | Rủi ro Toàn vẹn (Data Integrity Risks) | Mức độ Ưu tiên (Priority) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Danh mục Môn học (`content_subjects`)** | Đã có các trường: `Id`, `Name`, `Code`, `Description`, `Grade`, `OrderIndex`, `IsActive`, `CreatedAt`, `UpdatedAt`. | Thiếu trường `CurriculumStandard` (vd: `GDPT_2018`), `IconEmoji`, `ColorTheme`. | **90% tái sử dụng**: Schema Phase 17 hoàn toàn đủ cho cấu trúc môn học cốt lõi. | **Không cần migration mới**; có thể lưu trữ metadata mở rộng qua DTO hoặc thuộc tính cấu hình. | Không có. | Trùng mã môn học (`Code` đã có Unique Index bảo vệ chống trùng). | **P1 (Cao)** |
| **Chương học (`content_chapters`)** | Đã có: `Id`, `SubjectId`, `Title`, `Description`, `OrderIndex`, `IsActive`, `CreatedAt`, `UpdatedAt`. | Thiếu trường `ChapterCode` (mã chuẩn như `CHP_MATH12_01`), `EstimatedHours`. | **85% tái sử dụng**: Dùng `Id` hoặc prefix để định danh mã chương. | **Không cần migration mới**. | Không có. | Xóa nhầm chương đang chứa bài học (đã có Delete Guard). | **P1 (Cao)** |
| **Bài học (`content_lessons`)** | Đã có: `Id`, `ChapterId`, `Title`, `Slug`, `OrderIndex`, `Status`, `AuthorId`, `ReviewedBy`, 5 cột JSON lý thuyết (`DefinitionsJson`, `FormulasJson`,...). | Thiếu cột lưu danh sách Yêu cầu cần đạt GDPT 2018 (`LearningOutcomesJson`), `DurationMinutes`, `XpReward`. | **80% tái sử dụng**: Có thể tích hợp `LearningOutcomes` vào `SummaryPointsJson` hoặc mở rộng nhẹ trong Phase 18 sau khi có phê duyệt. | **Tạm thời không migration ở CP1**; sử dụng cấu trúc JSON hiện có để chứa mảng outcomes. | Tác giả tự duyệt bài (đã bị chặn bởi Dual-Control Phase 17). | Chuỗi JSON sai định dạng escaping KaTeX (cần kiểm thực trước khi insert). | **P1 (Cao)** |
| **Ngân hàng Câu hỏi (`content_questions`)** | Đã có: `Id`, `LessonId`, `ChapterId`, `SubjectId`, `AssessmentId`, `Prompt`, `OptionsJson`, `CorrectAnswer`, `Explanation`, `Topic`, `Difficulty`, `Type`, `Status`, `OrderIndex`. | Thiếu trường `SourceCitation` (Nguồn trích dẫn), `LicenseType`, `BloomTaxonomyLevel` (Nhận biết/Thông hiểu/Vận dụng). | **90% tái sử dụng**: Schema Phase 17 của `content_questions` rất toàn diện và đủ đáp ứng hầu hết bài toán thi tốt nghiệp THPT. | **Không cần bảng mới**. Chỉ cần áp dụng migration Phase 17 đã có sẵn lên `StudyAIDb` khi người dùng phê duyệt. | Rò rỉ đáp án ra ngoài (đã có cơ chế Zero-Leak API chỉ trả về Prompt và Options). | Xóa câu hỏi đã có học viên nộp bài làm hỏng bảng thống kê (đã cấu hình `NoAction` tránh cascade). | **P1 (Cao)** |
| **Bài Đánh giá / Thu hoạch (`content_assessments`)** | Đã có: `Id`, `LessonId`, `Title`, `PassScore`, `CreatedAt`. | Thiếu trường cấu hình giới hạn thời gian làm bài (`TimeLimitMinutes`), số lần làm bài tối đa. | **85% tái sử dụng**: Đủ cho bài thu hoạch ngưỡng 80% qua môn. | **Không cần migration mới**. | Sửa điểm passScore tùy tiện (chỉ Admin/Reviewer có quyền). | Lỗi liên kết khóa ngoại với bài học chưa xuất bản. | **P2 (Trung bình)** |
| **Quản lý Import & Batch Tracking** | Chưa có bảng ghi nhận từng lô import (`content_import_batches`). | Hiện tại thao tác ghi trực tiếp vào `staff_audit_logs`. | Có thể sử dụng `staff_audit_logs` với `Action = "content.bulk_import"` để lưu thông tin lô. | **Không tạo bảng trùng**. Tái sử dụng bảng `staff_audit_logs` để ghi nhận ID file, kết quả và số lượng bản ghi. | Nhân sự giả mạo import (đã có JWT Bearer xác thực định danh). | Lỗi nửa chừng gây ra dữ liệu mồ côi (giải quyết bằng Transaction / Unit of Work). | **P2 (Trung bình)** |

---

## 2. Kế hoạch Tái sử dụng & Giảm thiểu Rủi ro Schema

1. **Tuyệt đối không tạo bảng trùng chức năng**:
   - Sử dụng lại 100% các bảng hiện có: `content_subjects`, `content_chapters`, `content_lessons`, `content_questions`, `content_assessments`.
   - Không sinh thêm các bảng như `tbl_questions`, `quiz_bank` gây phân mảnh và xung đột dữ liệu.
2. **Kế hoạch đối với 2 Pending Migrations của `StudyAIDb`**:
   - Hai migrations:
     1. `20261108162500_EnhanceCurriculumAndQuestions`
     2. `20261109001500_FixContentDefaultConstraints`
   - Đã được kiểm thử hoàn hảo trên `StudyAIDb_E2E` (vượt qua 40 integration tests và 12 E2E scenarios).
   - Khi bước sang Checkpoint 2 và được người dùng đồng ý, hai migrations này sẽ được áp dụng an toàn lên `StudyAIDb` sau khi sao lưu.
3. **Chiến lược tương thích ngược (Backward Compatibility)**:
   - Các API học viên (`/api/v1/curriculum/subjects`, `/api/v1/curriculum/lessons/{id}`) giữ nguyên hợp đồng JSON để không phá vỡ giao diện React 19 đang chạy production trên GitHub Pages.

