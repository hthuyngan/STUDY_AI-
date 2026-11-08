# Chính sách Bảo mật & Kiểm duyệt Nội dung (Content Moderation & Security)

## 1. Nguyên tắc Zero-Leak Security

Trong môi trường học tập trực tuyến ứng dụng AI, việc đảm bảo tính chính trực của học sinh khi làm bài luyện tập và đánh giá năng lực là tối quan trọng.

1. **Tuyệt đối không rò rỉ Đáp án trước giờ làm bài (No Early Leak)**:
   - DTO `LearnerQuestionDto` được tách biệt hoàn toàn với thực thể `ContentQuestion`.
   - Thuộc tính `CorrectAnswer` và `Explanation` bị loại bỏ hoàn toàn khỏi Serialization của API `GET /api/v1/curriculum/lessons/{lessonId}/questions`.
   - Ngay cả khi học sinh kiểm tra Source Code hay mở DevTools Network Tab, họ không thể đọc được đáp án.
2. **Server-Side Grading & Verification**:
   - Việc chấm điểm diễn ra hoàn toàn tại Backend ASP.NET Core API (`CheckQuestionAnswer`).
   - Kết quả trả về gồm điểm số (`scoreEarned`), trạng thái đúng/sai (`isCorrect`), đáp án chuẩn và lời giải chi tiết bằng KaTeX.

---

## 2. Ranh giới Nội dung Chưa Xuất bản (Unpublished Content Boundary)

1. **Cổng Học viên (Learner Portal)**:
   - Chỉ có quyền xem các bài học có `Status == "published"`.
   - Nếu một học viên hoặc bot cố tình gọi API đến một bài học có trạng thái `draft` hoặc `in-review`, hệ thống sẽ trả về mã lỗi `HTTP 404 Not Found` (thay vì 403) nhằm che giấu sự tồn tại của học liệu đang biên soạn.
2. **Bảo vệ Nội dung Môn học/Chương học bị Khóa (`IsActive == false`)**:
   - Khi một Môn học hoặc Chương học bị Admin tắt (`IsActive = false`), tất cả bài học bên dưới ngay lập tức biến mất khỏi Cổng Học Viên và mọi API lấy chi tiết đều trả về 404.

---

## 3. Nhật ký Kiểm toán Chuyên môn (Staff Audit Logs)

Mọi hoạt động tác động tới chương trình học đều được ghi nhận tự động vào bảng `staff_audit_logs`:
- `ActorUserId`: Định danh người dùng thực hiện hành động.
- `Action`: Loại hành động (`subject_created`, `chapter_created`, `lesson_created`, `lesson_submitted_for_review`, `lesson_approved`, `lesson_changes_requested`, `question_created`).
- `TargetType`: `content_subject`, `content_chapter`, `content_lesson`, `content_question`.
- `TargetId`: ID của tài nguyên bị tác động.
- `Payload`: Dữ liệu tóm tắt dạng JSON (ví dụ: tên môn, mã môn, tiêu đề bài học).
- `CreatedAt`: Thời điểm ghi nhận bằng giờ chuẩn quốc tế UTC (`DateTimeOffset.UtcNow`).
