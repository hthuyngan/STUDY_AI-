# ROLE TEACHER TASKS — MATH 12

> Branch: `feature/math12-teacher` | Sidebar: Giảng dạy (Tổng quan, Quản lý lớp học, Bài tập, Kiểm tra & đề thi, Sổ điểm, Tài liệu giảng dạy) + Công cụ (AI Trợ giảng, Lịch giảng dạy, Thông báo lớp học, Hỗ trợ)

| Task ID | Mục tiêu | Phạm vi | Dependency | Status |
|---|---|---|---|---|
| **TEACHER-01** | Dashboard giáo viên (số lớp, học sinh, bài tập, bài cần chấm, chưa nộp, điểm TB, tỷ lệ hoàn thành, biểu đồ cột, lịch kiểm tra, kiến thức yếu) | FE + BE (`TeacherAnalytics`) | `BASE-01`, `CONTENT-07` | `TODO` |
| **TEACHER-02** | Quản lý lớp học (CRUD lớp, mã tham gia/làm mới, duyệt/từ chối yêu cầu, tìm kiếm/loại học sinh, chi tiết lớp 5 tab, ownership check) | FE + BE (`TeacherClassrooms`, `TeacherStudents`) | `BASE-01` | `TODO` |
| **TEACHER-03** | Quản lý bài tập (từ ngân hàng Content/thủ công/AI/import, giao lớp, hạn nộp, số lần làm, nộp muộn, chấm tự động/thủ công, nhận xét, làm lại) | FE + BE (`TeacherAssignments`, `TeacherSubmissions`) | `TEACHER-02`, `CONTENT-04` | `TODO` |
| **TEACHER-04** | Kiểm tra & đề thi (đề riêng/mẫu Content/sao chép, ma trận, mở/đóng đề, đảo đề, giao lớp/HS, theo dõi phiên, chấm & công bố, không sửa đề gốc) | FE + BE (`TeacherAssignments` / Exam) | `TEACHER-02`, `CONTENT-05` | `TODO` |
| **TEACHER-05** | Sổ điểm (theo lớp/HS, bài tập/kiểm tra, lọc/tìm/sắp xếp, nhận xét, điều chỉnh điểm có audit log, export Excel, phân biệt chưa có vs 0) | FE + BE (`TeacherGrading`) | `TEACHER-03`, `TEACHER-04` | `TODO` |
| **TEACHER-06** | Tài liệu giảng dạy (dùng tài liệu Content đã duyệt, upload tài liệu riêng, chia sẻ lớp, thu hồi, không tự thành nguồn công khai/RAG chung) | FE + BE (`Teacher` Resources) | `TEACHER-02`, `CONTENT-06` | `TODO` |
| **TEACHER-07** | AI Trợ giảng (soạn giáo án, sinh bài tập/câu hỏi, ma trận đề, kiểm tra lời giải, phân tích kết quả lớp, gợi ý nhận xét; xác nhận trước khi công bố) | FE + BE (`AiLessonAuthoring`, `TeachingRecommendation`) | `TEACHER-02`, `CONTENT-08` | `TODO` |
| **TEACHER-08** | Lịch giảng dạy, thông báo lớp học & hỗ trợ (lịch kiểm tra, hạn nộp, bài cần chấm, thông báo ghim/đính kèm theo lớp, ticket hỗ trợ) | FE + BE (`Teacher` Schedule/Announcements + `Support`) | `TEACHER-02` | `TODO` |
