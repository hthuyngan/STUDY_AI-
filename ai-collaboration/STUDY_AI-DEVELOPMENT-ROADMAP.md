# KẾ HOẠCH PHÁT TRIỂN CHI TIẾT (ROADMAP) STUDY_AI
**Tầm nhìn**: Xây dựng nền tảng học tập thông minh chuẩn Khan Academy — Phục vụ học sinh THPT và giáo viên Việt Nam (Chương trình GDPT 2018)  
**Tài nguyên nền tảng sẵn có**: Single Database `StudyAIDb` với **16.693 câu hỏi**, hệ thống 19 bảng CSDL, bộ kiểm thử tự động 614 tests  
**Thời điểm ban hành**: 2026-11-15T15:00:00+07:00  

---

## 1. TỔNG QUAN CHIẾN LƯỢC & 4 TRỤ CỘT THEO ĐỊNH HƯỚNG KHAN ACADEMY

```
                     ┌──────────────────────────────────────────────┐
                     │         STUDY_AI: KHAN ACADEMY VIETNAM       │
                     └──────────────────────┬───────────────────────┘
                                            │
       ┌────────────────────┬───────────────┴───────────────┬────────────────────┐
       ▼                    ▼                               ▼                    ▼
[Trụ cột 1: Curriculum]  [Trụ cột 2: Practice]      [Trụ cột 3: AI Tutor]  [Trụ cột 4: Classroom]
Chương trình GDPT 2018   Luyện tập thích ứng        Phương pháp Socratic   Quản lý lớp học & GV
Lý thuyết + KaTeX thật   16.693 câu VNHSGE          Gợi ý từng bước        Giao bài tập & Chấm
Zero-leak đáp án         Spaced Repetition (SM-2)   Không giải hộ          Theo dõi năng lực
```

---

## 2. LỘ TRÌNH TRIỂN KHAI 4 GIAI ĐOẠN (STAGED ROADMAP)

### GIAI ĐOẠN 1: NỀN TẢNG DỮ LIỆU & KẾT NỐI THỰC TẾ CHƯƠNG TRÌNH HỌC
*Thời gian dự kiến: Sprint 1 – 2 | Trọng tâm: Xóa bỏ dữ liệu Mock ở phía Học sinh, kết nối 100% CSDL thật*

- **Nhiệm vụ 1.1: Chuyển đổi Màn hình Môn học (`SubjectsPage.tsx`) sang API thật**:
  - Bỏ `data/subjects.mock.ts`.
  - Tích hợp `curriculum.service.ts.getSubjects()` gọi `GET /api/v1/curriculum/subjects`.
  - Hiển thị danh mục 9 môn học chính thức và số lượng bài học thật từ `StudyAIDb`.
- **Nhiệm vụ 1.2: Chuyển đổi Màn hình Bài học (`LessonPage.tsx`) sang API thật**:
  - Bỏ `data/lessons.mock.ts`.
  - Tích hợp `curriculum.service.ts.getLessonDetail(lessonId)` gọi `GET /api/v1/curriculum/lessons/{id}`.
  - Hiển thị đầy đủ lý thuyết, định nghĩa, công thức KaTeX và ví dụ từ CSDL.
- **Nhiệm vụ 1.3: Chuyển đổi Bài kiểm tra cuối bài học (`AssessmentModal.tsx`)**:
  - Bỏ `data/assessments.mock.ts`.
  - Nạp câu hỏi từ `GET /api/v1/curriculum/lessons/{id}/questions` (Zero-leak đáp án).
  - Chấm điểm bài làm qua `POST /api/v1/curriculum/lessons/{id}/questions/{qId}/check`.
- **Nhiệm vụ 1.4: Phê duyệt Đợt 1 Kho câu hỏi VNHSGE (Bộ đề thi chính thức `eval`)**:
  - Sử dụng quyền Quản trị / Content Specialist để duyệt và xuất bản (`publish`) **1.727 câu hỏi thi tốt nghiệp THPT Quốc gia 2019–2023** qua các năm của 9 môn học.

---

### GIAI ĐOẠN 2: HỌC SINH, LUYỆN TẬP THÍCH ỨNG & THEO DÕI TIẾN ĐỘ
*Thời gian dự kiến: Sprint 3 – 4 | Trọng tâm: Khai thác kho 16.693 câu hỏi, cá nhân hóa việc luyện thi*

- **Nhiệm vụ 2.1: Xây dựng API Sinh đề Luyện tập từ Kho câu hỏi CSDL**:
  - Tạo endpoint `POST /api/v1/practice/generate-session` nhận bộ lọc: Môn học, Độ khó (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao), Số lượng câu.
  - Trích xuất ngẫu nhiên không trùng lặp từ 16.693 câu trong `StudyAIDb`.
  - Chuyển `PracticePage.tsx` sang nạp câu hỏi từ API thay vì `localStorage`.
- **Nhiệm vụ 2.2: Chế độ Thi Thử Tốt Nghiệp THPT Quốc Gia (Mock Exam Mode)**:
  - Thiết lập giao diện thi thử bấm giờ nghiêm ngặt (40 câu / 50 phút với KHTN/KHXH/Tiếng Anh; 50 câu / 90 phút với Toán).
  - Đề thi lấy chuẩn từ các mã đề chính thức của Bộ GD&ĐT trong kho VNHSGE.
  - Tự động nộp bài khi hết giờ, hiển thị phổ điểm và bảng đáp án chi tiết.
- **Nhiệm vụ 2.3: Bảng CSDL và API Kho Câu Hỏi Sai & Ôn Tập Ngắt Quãng (Spaced Repetition)**:
  - Tạo bảng `user_review_items` trên `StudyAIDb`.
  - Tự động lưu các câu hỏi học sinh làm sai trong quá trình học và luyện tập.
  - Thuật toán SuperMemo SM-2 tính toán thời điểm nhắc lại: sau 1 ngày, 3 ngày, 7 ngày, 14 ngày.
  - Đồng bộ trang `SmartReviewPage.tsx` với CSDL máy chủ.
- **Nhiệm vụ 2.4: Tổng hợp API Dashboard Học Sinh (`GET /api/v1/me/dashboard`)**:
  - Gom toàn bộ thông tin tiến độ: Số bài đã học, Streak chuỗi ngày học, Bài tập lớp cần nộp, Điểm trung bình và 3 bài học tiếp theo cần học.
  - Bỏ hoàn toàn `dashboard.mock.ts`.

---

### GIAI ĐOẠN 3: AI TUTOR VÀ HỌC TẬP CÁ NHÂN HÓA
*Thời gian dự kiến: Sprint 5 – 6 | Trọng tâm: AI Socratic hướng dẫn từng bước, bản đồ kiến thức*

- **Nhiệm vụ 3.1: Nâng cấp AI Tutor với Bậc thang Gợi ý (Socratic Hint Ladder)**:
  - Khi học sinh gặp khó khăn trước một câu hỏi trong bài tập hoặc thi thử: Nút "Hỏi AI gợi ý".
  - AI không giải hộ hay đọc ngay đáp án. Triển khai 3 nấc gợi ý:
    - *Nấc 1*: Nhắc lại định lý, công thức hoặc kiến thức trọng tâm liên quan.
    - *Nấc 2*: Đặt câu hỏi định hướng bước biến đổi đầu tiên.
    - *Nấc 3*: Phân tích hướng giải chi tiết nếu học sinh vẫn chưa làm được.
- **Nhiệm vụ 3.2: Đánh giá Năng lực Học sinh (Mastery Score)**:
  - Bổ sung bảng `student_subject_mastery` lưu trữ mức độ thành thạo theo từng môn học và chương học (0% – 100%).
  - Phân loại học sinh theo chuẩn Khan Academy: *Chưa thử*, *Đang làm quen*, *Thành thạo*, *Nắm vững*.
- **Nhiệm vụ 3.3: Lộ trình Học Tập Cá Nhân Hóa (Adaptive Learning Path)**:
  - Kết nối `knowledgeGapDetectionEngine.ts` với backend: Phát hiện lỗ hổng kiến thức từ các câu làm sai.
  - Tự động đề xuất bài học cơ bản cần ôn lại trước khi cho học sinh làm tiếp bài nâng cao.

---

### GIAI ĐOẠN 4: GIÁO VIÊN, QUẢN TRỊ NHÀ TRƯỜNG & VẬN HÀNH PRODUCTION
*Thời gian dự kiến: Sprint 7 – 8 | Trọng tâm: Triển khai lớp học, mở rộng hạ tầng & báo cáo*

- **Nhiệm vụ 4.1: Tính năng Tạo Đề Bài Tập từ Kho 16.693 câu hỏi cho Giáo Viên**:
  - Cho phép giáo viên chọn câu hỏi từ ngân hàng câu hỏi VNHSGE để tạo bài tập kiểm tra 15 phút, 1 tiết hoặc đề học kỳ cho lớp học.
  - Giao bài tự động đến toàn bộ học sinh trong lớp.
- **Nhiệm vụ 4.2: Bảng Điều Khiển Năng Lực Lớp Học (Class Mastery Heatmap)**:
  - Giáo viên xem ma trận kỹ năng của lớp: Học sinh nào đang yếu phần nào để kịp thời phụ đạo.
- **Nhiệm vụ 4.3: Tối ưu Hạ tầng & Bộ nhớ đệm (Caching & Performance Tuning)**:
  - Thiết lập CDN / Reverse Proxy caching cho 1.217 file ảnh tĩnh trong `/uploads/vnhsge/`.
  - Tối ưu hóa truy vấn SQL với chỉ mục thích hợp trên bảng `content_questions` (SubjectId, Status, Difficulty).
  - Tự động hóa quy trình sao lưu định kỳ hàng ngày (Automated Daily Backup với Checksum).

---

## 3. TOP 10 NHIỆM VỤ ƯU TIÊN CAO NHẤT (TOP 10 ACTIONABLE TASKS)

Đây là 10 nhiệm vụ cần bắt tay vào triển khai ngay theo thứ tự phụ thuộc:

```
[Task 1: Sửa SubjectsPage] ──────► [Task 2: Sửa LessonPage] ──────► [Task 3: Sửa AssessmentModal]
                                                                              │
                                                                              ▼
[Task 4: Publish đợt 1 VNHSGE] ──► [Task 5: API Sinh đề Luyện tập] ──► [Task 6: Thi thử THPT QG]
                                                                              │
                                                                              ▼
[Task 7: Bảng CSDL Câu hỏi sai] ─► [Task 8: API Dashboard] ──────► [Task 9: AI Tutor Socratic]
                                                                              │
                                                                              ▼
                                                                  [Task 10: GV Giao bài từ VNHSGE]
```

### Chi tiết 10 nhiệm vụ ưu tiên:

1. **TASK 1 (P0): Chuyển đổi `SubjectsPage.tsx` sang nạp danh mục môn học thật từ CSDL**:
   - *Hành động*: Sửa `useSubjects.ts` gọi `curriculum.service.ts.getSubjects()`.
   - *Tiêu chí nghiệm thu*: Danh sách môn học hiển thị đúng 9 môn học chính từ CSDL `StudyAIDb`, kèm số lượng chương/bài học thật; không phụ thuộc `subjects.mock.ts`.
2. **TASK 2 (P0): Chuyển đổi `LessonPage.tsx` sang nạp nội dung bài học và công thức KaTeX từ CSDL**:
   - *Hành động*: Sửa `useLesson.ts` gọi `curriculum.service.ts.getLessonDetail()`.
   - *Tiêu chí nghiệm thu*: Hiển thị đầy đủ nội dung lý thuyết, định nghĩa, công thức KaTeX của bài học từ backend; render đúng ký hiệu toán học.
3. **TASK 3 (P0): Chuyển đổi `AssessmentModal.tsx` sang nạp câu hỏi trắc nghiệm bài học thật**:
   - *Hành động*: Gọi `curriculum.service.ts.getLessonQuestions()` và chấm điểm qua `checkQuestionAnswer()`.
   - *Tiêu chí nghiệm thu*: Học sinh làm bài trắc nghiệm với cơ chế Zero-leak đáp án từ server, nhận điểm số và giải thích ngay khi bấm nộp bài.
4. **TASK 4 (P0): Phê duyệt và Xuất bản (Publish) Đợt 1: 1.727 câu hỏi thi tốt nghiệp THPT chính thức**:
   - *Hành động*: Chuyển trạng thái 1.727 câu hỏi thuộc tập `eval` từ `draft` sang `published`.
   - *Tiêu chí nghiệm thu*: Câu hỏi sẵn sàng để học sinh có thể truy xuất và làm bài trong các tính năng luyện tập.
5. **TASK 5 (P0): Xây dựng API Sinh đề Luyện tập ngẫu nhiên (`POST /api/v1/practice/session`)**:
   - *Hành động*: Backend viết endpoint chọn câu hỏi theo môn học, số lượng, độ khó; Frontend `practice.service.ts` gọi API này thay vì `localStorage`.
   - *Tiêu chí nghiệm thu*: Học sinh bấm "Bắt đầu luyện tập" môn Toán/Lý/Hóa... thì nhận được bộ câu hỏi ngẫu nhiên lấy từ kho câu hỏi thực tế trong CSDL.
6. **TASK 6 (P1): Xây dựng Màn hình Thi thử Tốt nghiệp THPT Quốc gia theo cấu trúc chuẩn**:
   - *Hành động*: Tạo trang chọn đề thi thử theo môn và năm thi (2019–2023), bấm giờ 50 phút/90 phút, chấm điểm theo thang điểm 10.
   - *Tiêu chí nghiệm thu*: Học sinh hoàn thành bài thi thử, nhận điểm số, biểu đồ thời gian làm bài và phân tích chi tiết từng câu đúng/sai.
7. **TASK 7 (P1): Thiết kế CSDL và API Kho Câu Hỏi Sai & Ôn Tập Ngắt Quãng (`user_review_items`)**:
   - *Hành động*: Tạo migration thêm bảng `user_review_items` (kèm thuật toán SM-2); Backend tạo API thêm câu hỏi sai và lấy danh sách cần ôn tập hôm nay.
   - *Tiêu chí nghiệm thu*: Các câu làm sai trong bài học/luyện tập được tự động lưu vào CSDL, hiển thị trong trang "Smart Review" theo chu kỳ ngày.
8. **TASK 8 (P1): Phát triển Endpoint Tổng hợp Dashboard Học Sinh (`GET /api/v1/me/dashboard`)**:
   - *Hành động*: Backend gom dữ liệu tiến độ học, chuỗi ngày học (streak), bài tập lớp cần nộp; Frontend `useDashboard.ts` gọi API này.
   - *Tiêu chí nghiệm thu*: Dashboard tải nhanh dưới 200ms, phản ánh chính xác dữ liệu của tài khoản người dùng đăng nhập.
9. **TASK 9 (P1): Nâng cấp AI Tutor với Prompt Socratic Hướng Dẫn Từng Bước (Hint Ladder)**:
   - *Hành động*: Tích hợp nút "Hỏi AI" cạnh mỗi câu hỏi trong phòng luyện tập/thi thử; AI trả lời theo 3 nấc gợi ý định hướng, không giải hộ.
   - *Tiêu chí nghiệm thu*: AI phân tích đúng đề bài và gợi mở từng bước giải giúp học sinh tự tìm ra đáp án.
10. **TASK 10 (P1): Tính năng Giáo viên Giao Bài Tập từ Ngân Hàng Câu Hỏi VNHSGE**:
    - *Hành động*: Kết nối giao diện tạo bài tập của Giáo viên (`AssignmentsPage.tsx`) với API `GET /api/v1/content/questions` để giáo viên chọn câu hỏi giao cho học sinh.
    - *Tiêu chí nghiệm thu*: Giáo viên tạo được bài tập lớp từ kho câu hỏi thật, học sinh trong lớp nhận được bài tập và làm bài trực tiếp.

---
**KẾT LUẬN**: Lộ trình trên định hình rõ ràng từng bước phát triển của STUDY_AI từ nền tảng quản trị nội dung sẵn có tiến thẳng lên nền tảng học tập thông minh hoàn chỉnh, khai thác triệt để giá trị của kho dữ liệu VNHSGE và hạ tầng CSDL hiện đại.
