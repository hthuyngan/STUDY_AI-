# ROLE USER (LEARNER) TASKS — MATH 12

> Branch: `feature/math12-user` | Sidebar: Học tập (Tổng quan, AI Gia sư, Kiến thức Toán 12, Luyện tập, Kiểm tra & thi thử, Sổ tay học tập) + Tiện ích (Lớp học của tôi, Kế hoạch học tập, Gói đăng ký, Hỗ trợ) | Loại bỏ: phụ huynh, lộ trình bắt buộc, trang kết quả riêng, tài khoản ở sidebar, banner/gói Free cuối sidebar, chọn môn/khối lớp

| Task ID | Mục tiêu | Phạm vi | Dependency | Status |
|---|---|---|---|---|
| **USER-01** | Dashboard học sinh hợp nhất tổng quan & kết quả học tập thực (thời gian, bài tập, đúng/sai, điểm TB, biểu đồ cột, mức nắm vững 6 chương, hạn mức AI, bộ lọc thời gian) | FE + BE (`LearningAnalytics`, `StudentProgress`) | `BASE-01` | `TODO` |
| **USER-02** | AI Gia sư Toán 12 (chat lịch sử/tìm kiếm/đổi tên/xóa, giải từng bước, gợi ý, kiểm tra bài giải, phân tích lỗi, sinh bài tương tự, LaTeX/đồ thị, streaming, kiểm soát prompt injection) | FE + BE (`AiChat`, `AiTutorService`) | `BASE-01`, `CONTENT-08` | `TODO` |
| **USER-03** | Kiến thức Toán 12 (6 chương đã xuất bản, lý thuyết/công thức/ví dụ/vận dụng/đồ thị/tài liệu, hỏi AI theo ngữ cảnh, đánh dấu hoàn thành, tự do chọn bài) | FE + BE (`StudentCurriculum`, `StudentProgress`) | `CONTENT-07` | `TODO` |
| **USER-04** | Luyện tập (theo chương/chuyên đề/độ khó/tổng hợp/kiến thức yếu/làm lại câu sai/AI tạo có kiểm tra; 3 dạng câu hỏi; không tự đưa câu AI vào ngân hàng chính thức) | FE + BE (`StudentPractice`) | `CONTENT-04` | `TODO` |
| **USER-05** | Kiểm tra & thi thử (theo chương/thi thử/lịch sử; timer & chấm điểm tại BE, autosave, đánh dấu xem lại, khôi phục phiên, không rò rỉ đáp án, không AI trong thi) | FE + BE (`StudentAssessment`, `ExamBlueprint`) | `CONTENT-05` | `TODO` |
| **USER-06** | Sổ tay học tập 3 tab (1. Bài tập sai tự động lưu + làm lại + đánh dấu khắc phục; 2. Nội dung đã lưu; 3. Ghi chú cá nhân) | FE + BE (`StudentNotes`, `SpacedRepetition`) | `USER-03`, `USER-04` | `TODO` |
| **USER-07** | Lớp học của tôi (tham gia bằng mã lớp, theo dõi yêu cầu, thông báo, bài tập, kiểm tra, tài liệu, điểm & nhận xét; strict ownership) | FE + BE (`LearnerClassrooms` / `Assignments`) | `TEACHER-02..05` | `TODO` |
| **USER-08** | Kế hoạch học tập (chỉ quản lý thời gian: lịch học, lịch kiểm tra, hạn nộp, công việc cá nhân CRUD/nhắc nhở/hoàn thành; không ép lộ trình AI) | FE + BE (`RevisionPlanner` / Schedule) | `USER-07` | `TODO` |
| **USER-09** | Gói đăng ký (hiển thị 3 gói từ cấu hình Admin, so sánh, gói hiện tại, hạn mức, lịch sử; không hardcode/fake thanh toán; ghi nhận blocker nếu chưa có payment gateway) | FE + BE (`Subscriptions` / `ADM-05` gate) | `ADM-05` (Gated) | `TODO` |
| **USER-10** | Hỗ trợ & Tài khoản header (Support Center gửi ticket/báo lỗi/báo sai nội dung-AI/trao đổi; Account Dropdown trên header: profile, avatar, đổi mật khẩu, cài đặt, đăng xuất) | FE + BE (`SupportTickets`, `StudentProfile`, `Auth`) | `ADM-06` | `TODO` |
