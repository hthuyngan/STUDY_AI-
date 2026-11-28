# ROLE CONTENT TASKS — MATH 12

> Branch: `feature/math12-content` | Sidebar: Quản lý nội dung (Tổng quan, Chương trình Toán 12, Bài học, Ngân hàng câu hỏi, Ngân hàng đề thi, Tài liệu học tập) + Kiểm soát chất lượng (Kiểm duyệt nội dung, Kho tri thức AI, Báo cáo sai sót, Lịch sử chỉnh sửa)

| Task ID | Mục tiêu | Phạm vi | Dependency | Status |
|---|---|---|---|---|
| **CONTENT-01** | Dashboard nội dung với dữ liệu SQL thực (bài học, câu hỏi, đề thi, tài liệu, xuất bản/nháp/chờ duyệt, báo cáo sai sót, đồng bộ AI, biểu đồ cột theo chương) | FE + BE (`AdminDashboard`/`Content` metrics) | `BASE-01` | `TODO` |
| **CONTENT-02** | Quản lý Chương trình Toán 12 (6 chương chuẩn, CRUD chương/bài/chuyên đề, sắp xếp, import/preview/validate/export, xuất bản/lưu trữ, xem trước học sinh) | FE + BE (`ContentSubjects/Chapters/Topics/Import`) | `BASE-01` | `TODO` |
| **CONTENT-03** | Trình soạn thảo Bài học (văn bản, tiêu đề, LaTeX, ảnh, bảng, đồ thị, lý thuyết/ví dụ/bài tập, autosave, preview, gửi duyệt, phiên bản, chống XSS) | FE + BE (`ContentLessons`, `LessonComposition`) | `CONTENT-02` | `TODO` |
| **CONTENT-04** | Ngân hàng câu hỏi Toán 12 (3 dạng: trắc nghiệm, đúng/sai, trả lời ngắn; 3 mức độ: nhận biết/thông hiểu/vận dụng; AI sinh câu hỏi có kiểm duyệt, check trùng, import/export) | FE + BE (`ContentQuestions`) | `CONTENT-02` | `TODO` |
| **CONTENT-05** | Ngân hàng đề thi (tạo thủ công/ma trận, đảo câu/phương án, preview, publish, sao chép, versioning; bảo vệ kết quả bài thi đã nộp) | FE + BE (`ContentAssessments`) | `CONTENT-04` | `TODO` |
| **CONTENT-06** | Tài liệu học tập (PDF, bảng công thức, tài liệu chương/chuyên đề, đề tham khảo, ảnh/đồ thị; validate size/MIME/signature/RBAC) | FE + BE (`LessonResources` + Content Library) | `CONTENT-02` | `TODO` |
| **CONTENT-07** | Kiểm duyệt nội dung (Draft → Pending Review → Approved → Published → Archived + Rejected; audit log, phân quyền duyệt, chặn chưa xuất bản) | FE + BE (`ContentReview`, `ContentGovernance`) | `CONTENT-03..06` | `TODO` |
| **CONTENT-08** | Kho tri thức AI (quản lý nguồn đã duyệt, xử lý/đồng bộ/lập chỉ mục/truy xuất/thu hồi, nhật ký lỗi; không fake RAG, không lộ API key) | FE + BE (`Features/AI` + Knowledge Base) | `CONTENT-07` | `TODO` |
| **CONTENT-09** | Báo cáo sai sót nội dung (tiếp nhận lỗi câu hỏi/đáp án/công thức/lời giải/bài học/AI; phân loại nội dung vs kỹ thuật; xử lý & đóng báo cáo) | FE + BE (`Support` / Content Error Reports) | `CONTENT-07` | `TODO` |
