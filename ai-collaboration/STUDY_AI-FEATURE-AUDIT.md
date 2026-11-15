# BÁO CÁO TOÀN DIỆN: AUDIT HỆ THỐNG VÀ KIỂM KÊ CHỨC NĂNG STUDY_AI
**Định hướng phát triển**: Nền tảng học tập thông minh chuẩn Khan Academy — Tối ưu cho Chương trình Giáo dục Phổ thông Việt Nam (GDPT 2018)  
**Nhánh kiểm tra**: `feature/frontend-css-architecture`  
**Database**: `StudyAIDb` trên Microsoft SQL Server Express (`localhost\SQLEXPRESS`)  
**Thời điểm thực hiện**: 2026-11-15T15:00:00+07:00  

---

## 1. TỔNG QUAN HIỆN TRẠNG HẠ TẦNG VÀ KIẾN TRÚC

STUDY_AI hiện đang sở hữu nền tảng công nghệ hiện đại và chất lượng mã nguồn rất cao, đã trải qua nhiều đợt chuẩn hóa nghiêm ngặt:

- **Backend**: ASP.NET Core .NET 10 Web API, Entity Framework Core 10, kiến trúc phân tầng (Api, Application, Domain, Infrastructure).
- **Database**: Single Production Database `StudyAIDb` gồm 19 bảng, lưu trữ đầy đủ **16.693 câu hỏi** (14 câu gốc + 16.679 câu VNHSGE bao phủ 9 môn THPT lớp 12), 121 tài khoản người dùng, 1.217 file ảnh minh họa.
- **Frontend**: React 19 + TypeScript + Vite, kiến trúc Component phân lớp, UI/UX chuẩn hóa không CSS xung đột.
- **Hệ thống kiểm thử (100% Passed)**:
  - Backend Unit Tests: **81 / 81 passed**.
  - Backend Integration Tests: **127 / 127 passed**.
  - Frontend Vitest: **406 / 406 passed** (52 suites).
  - Oxlint: **0 lỗi / 0 cảnh báo** trên 441 tệp tin.

---

## 2. NHIỆM VỤ 1: BẢNG KIỂM KÊ TOÀN DIỆN THEO 5 PHÂN LOẠI TRẠNG THÁI

Dựa trên việc kiểm tra trực tiếp mã nguồn, API route, controller, entity và frontend service (không suy đoán theo tên file):

### Nhóm 1: Hoàn chỉnh, đã tích hợp và kiểm thử (Production Ready)
1. **Xác thực & Quản lý phiên (Authentication & Sessions)**:
   - Login, Register, Refresh Token Rotation (`refresh_sessions`), Đổi mật khẩu, Logout.
   - JWT xác thực, phân quyền 4 vai trò: `admin`, `content`, `teacher`, `learner`.
2. **Quản trị nội dung chuyên sâu (Content Management Workspace)**:
   - Quản lý cây môn học, chương học, bài học (`ContentSubjects`, `ContentChapters`, `ContentLessons`).
   - Quy trình phê duyệt bài học: Soạn thảo $\rightarrow$ Gửi duyệt $\rightarrow$ Phê duyệt $\rightarrow$ Xuất bản $\rightarrow$ Thu hồi.
3. **Ngân hàng câu hỏi quản trị (Content Question Bank)**:
   - CRUD câu hỏi, quản lý trạng thái (`draft`, `approved`, `published`, `rejected`), gán mã code tự động, lọc theo 9 môn học, thống kê chi tiết.
   - Kết nối trực tiếp backend API `/api/v1/content/questions`.
4. **Hệ thống nhập kho VNHSGE (VNHSGE Import Pipeline & Engine)**:
   - Nhập theo batch tối đa 250 câu, ACID transaction, đối soát trùng lặp tự động (Idempotent), phục vụ 1.217 ảnh tĩnh `/uploads/vnhsge/...`.
   - Lưu trữ 16.679 câu hỏi an toàn trên `StudyAIDb`.
5. **Quản lý lớp học và giao bài tập (Classrooms & Assignments Engine)**:
   - Backend `ClassroomsController` & `AssignmentsController` (19 endpoints).
   - Tạo lớp, thêm học sinh, giao bài tập, học sinh nộp bài, giáo viên chấm điểm và nhận xét.

### Nhóm 2: Có Backend hoàn chỉnh nhưng Frontend chưa tích hợp (Đang gọi Mock Data)
1. **Trải nghiệm Học bài học của Học sinh (Learner Lesson Experience)**:
   - *Backend*: `CurriculumController` (`GET /api/v1/curriculum/lessons/{id}`) trả về lý thuyết, định nghĩa, công thức KaTeX, ví dụ mẫu; bảo mật Zero-leak không lộ đáp án trắc nghiệm; endpoint chấm điểm server-side `POST /.../check`.
   - *Frontend*: `LessonPage.tsx` và `useLesson.ts` vẫn đang import `mockLessonsDetail` từ `data/lessons.mock.ts`!
2. **Khám phá môn học (Learner Subjects Catalog)**:
   - *Backend*: `CurriculumController` (`GET /api/v1/curriculum/subjects`, `GET /.../chapters`) đã sẵn sàng.
   - *Frontend*: `SubjectsPage.tsx` và `useSubjects.ts` vẫn gọi `subjects.service.ts` đọc dữ liệu từ `data/subjects.mock.ts`!
3. **Bài kiểm tra cuối bài học (Lesson Assessment Modal)**:
   - *Backend*: `CurriculumController` (`GET /api/v1/curriculum/lessons/{id}/questions`) và `AssessmentAttemptsController` đã hoàn chỉnh.
   - *Frontend*: `AssessmentModal.tsx` vẫn gọi hàm `getMockAssessmentByLessonId` từ `data/assessments.mock.ts`!

### Nhóm 3: Có Frontend nhưng Backend chưa hoàn chỉnh / Thiếu API
1. **Luyện tập tự do & Thi thử THPT (Practice & Mock Exam Engine)**:
   - *Frontend*: `PracticePage.tsx` có cấu hình thời gian, số câu, môn học, bộ đếm giờ, chấm điểm (`scoringEngine.ts`), xử lý biểu thức Toán (`mathAnswerNormalizer.ts`).
   - *Backend*: Chưa có endpoint sinh đề thi ngẫu nhiên theo ma trận đề từ 16.693 câu hỏi trong CSDL (`POST /api/v1/practice/generate-session`). Hiện tại frontend đang lấy câu hỏi từ `questionBank.repository.ts` đọc mock data trong `localStorage`.
2. **Dashboard Tổng quan của Học sinh (Learner Dashboard)**:
   - *Frontend*: `DashboardPage.tsx` có UI cực kỳ chuyên nghiệp (Mục tiêu ngày, Streak, Biểu đồ học tập, Bài học tiếp theo).
   - *Backend*: Chưa có endpoint tổng hợp `GET /api/v1/me/dashboard` để gom tiến độ, chuỗi ngày học, bài tập cần làm trong một lượt gọi.
3. **Đánh giá Năng lực theo Kỹ năng (Skill Mastery & Performance Engine)**:
   - *Frontend*: Có `skillPerformanceEngine.ts` tính toán 4 cấp độ (Attempted, Familiar, Proficient, Mastered) trong bộ nhớ client.
   - *Backend*: Chưa có bảng lưu trữ `student_skill_mastery` trong SQL Server; kết quả làm bài chỉ lưu thô trong `learning_events` và `assessment_attempts`.

### Nhóm 4: Chức năng giả lập hoặc phụ thuộc hoàn toàn LocalStorage
1. **Ôn tập ngắt quãng (Smart Review & Spaced Repetition)**:
   - `SmartReviewPage.tsx` và `smartReview.service.ts` mô phỏng thuật toán SuperMemo SM-2 hoàn toàn trên `localStorage`. Không có bảng CSDL trên backend, người học đổi trình duyệt sẽ mất toàn bộ lịch sử ôn tập.
2. **Sổ tay ghi chú bài học (Study Notes)**:
   - `LessonNotesPanel.tsx` và `studyNotes.service.ts` lưu ghi chú người dùng vào `localStorage` (`study_ai_study_notes_v1`), chưa có API lưu về tài khoản người dùng trên server.
3. **Trung tâm trợ giúp & Ticket hỗ trợ (Support Center)**:
   - `SupportPage.tsx` và `support.service.ts` sử dụng mock tickets và localStorage.
4. **Huy hiệu và thư viện tài liệu mở rộng (Achievements & Library)**:
   - `AchievementsPage.tsx` và `LibraryPage.tsx` dùng `supporting.mock.ts`.

### Nhóm 5: Chưa phát triển (Thiếu cả Backend lẫn Frontend thực tế)
1. **Ma trận Đề thi THPT Quốc gia chuẩn cấu trúc Bộ GD&ĐT**:
   - Chưa có tính năng chọn đề thi theo cấu trúc chính thức (40 câu / 50 phút hoặc 50 câu / 90 phút) lấy từ tập 1.730 câu `eval` split đã nạp vào CSDL.
2. **Cơ chế gợi ý Socratic nâng cao cho AI Tutor (Hint Ladder)**:
   - AI Tutor hiện tại chỉ trả lời chung (`explain` / `hint` / `quiz`), chưa có cơ chế chia nhỏ câu hỏi thành các bậc thang gợi ý (Hint 1 $\rightarrow$ Hint 2 $\rightarrow$ Solution) khi học sinh bí bài tập trong kho câu hỏi.
3. **Bản đồ đồ thị kiến thức tiên quyết (Prerequisite Knowledge Graph)**:
   - Chưa có bảng dữ liệu định nghĩa bài học nào là điều kiện tiên quyết của bài học nào (ví dụ: cần thành thạo Đạo hàm trước khi học Khảo sát hàm số).

---

## 3. NHIỆM VỤ 2: ĐÁNH GIÁ CHI TIẾT 12 CHỨC NĂNG CỐT LÕI

| STT | Chức năng cốt lõi | Hiện trạng chi tiết | Đánh giá kiến trúc & Rủi ro |
| :---: | :--- | :--- | :--- |
| **1** | **Chương trình học môn/chương/bài** | Backend đã có `CurriculumController` bảo mật; CSDL có 21 môn, 13 chương, 17 bài. Frontend học sinh lại đang dùng mock data. | **Nghịch lý lớn**: Backend đã hoàn chỉnh nhưng học sinh chưa được xem dữ liệu thật từ SQL Server. Cần chuyển đổi frontend sang gọi API ngay. |
| **2** | **Ngân hàng câu hỏi & VNHSGE** | Đã nạp thành công **16.693 câu hỏi** vào `StudyAIDb`. Có CMS quản trị đầy đủ, đã test kiểm duyệt và phân quyền. | Rất mạnh. Cần kích hoạt bộ lọc xuất bản (`publish`) để chuyển các câu hỏi chất lượng cao từ `draft` sang trạng thái người học có thể luyện tập. |
| **3** | **Luyện tập và thi thử** | Frontend có UI đếm giờ, chấm điểm, giải thích. Nhưng câu hỏi lấy từ `localStorage` (khoảng 30 câu mock). | Cần xây dựng API `/api/v1/practice/generate` để kéo 16.693 câu hỏi thật từ CSDL ra cho học sinh làm. |
| **4** | **AI Tutor hướng dẫn từng bước** | Đã có `AiChatController`, hỗ trợ lưu cuộc trò chuyện vào CSDL, có ngữ cảnh bài học và tích hợp OpenAI + Fake provider. | Đã có nền tảng vững chắc. Cần bổ sung System Prompt Socratic theo chuẩn giáo dục Việt Nam và liên kết với mã câu hỏi VNHSGE. |
| **5** | **Đánh giá năng lực học sinh** | Frontend có thuật toán tính mastery (Khan Academy style). Backend chỉ lưu log thô `learning_events`. | Cần bảng CSDL lưu Mastery Score để lưu vết tiến độ học tập lâu dài và đồng bộ xuyên suốt các thiết bị. |
| **6** | **Bản đồ kiến thức & kỹ năng** | Mới dừng ở mức phân cấp Subject $\rightarrow$ Chapter $\rightarrow$ Lesson. Chưa có khái niệm Skill tag hoặc Đồ thị tiên quyết (Prerequisite). | Cần bổ sung bảng quan hệ kỹ năng nhẹ (Skill tags) mà không làm phức tạp hóa CSDL hiện tại. |
| **7** | **Lộ trình học cá nhân hóa** | Frontend có `adaptiveLearningPathService.ts` tính toán bài học tiếp theo trên client. | Cần chuyển logic này thành API backend để học sinh mở app trên điện thoại hay web đều nhận cùng lộ trình học tối ưu. |
| **8** | **Ôn tập ngắt quãng & Luyện câu sai** | Thuật toán SM-2 chạy trên client. Có trang luyện câu sai nhưng lưu `localStorage`. | Nếu người học dọn dẹp trình duyệt, toàn bộ "Kho câu sai" bị mất. Cần bảng `user_mistake_bookmarks` trên SQL Server. |
| **9** | **Dashboard học sinh** | Giao diện hiện đại, trực quan, có Daily Goals, Streak, AI gợi ý. Hiện đang đọc mock + client storage. | Cần gom về 1 API duy nhất `GET /api/v1/me/dashboard` để tăng tốc độ tải trang và dữ liệu thật 100%. |
| **10** | **Quản lý lớp học & Giáo viên** | Đã có 19 endpoints backend, CSDL có đủ 4 bảng lớp học/bài tập, UI giáo viên và admin đã tích hợp và kiểm thử. | Hoàn chỉnh, sẵn sàng sử dụng cho môi trường giáo dục nhà trường. |
| **11** | **Quản trị nội dung & Phân quyền** | Có RBAC 4 vai trò, kiểm duyệt bài học và câu hỏi, audit log ghi nhận mọi thao tác biên tập viên. | Rất chuẩn mực và bảo mật. |
| **12** | **Bảo mật, Hiệu năng & QA** | JWT, Refresh rotation, Zero-leak đáp án, Rate-limiting cache, 614 automated tests (100% green). | Xuất sắc, nền tảng backend đạt độ tin cậy cấp doanh nghiệp. |

---

## 4. NHIỆM VỤ 3: ĐỀ XUẤT THÊM, SỬA, BỎ (ACTIONABLE MATRIX)

Ưu tiên tận dụng 100% hệ thống hiện có, không tạo bảng trùng lặp:

### 4.1. Đề xuất SỬA (Refactor & Rewiring) — Ưu tiên cao nhất
1. **Sửa `SubjectsPage.tsx` và `LessonPage.tsx` (P0)**:
   - *Hiện trạng*: Đang gọi `subjects.service.ts` và `lesson.service.ts` (đọc mock data).
   - *Sửa đổi*: Chuyển sang gọi `curriculum.service.ts` (kết nối trực tiếp `/api/v1/curriculum/subjects` và `/api/v1/curriculum/lessons/{id}`).
   - *Hiệu quả*: Học sinh xem được bài học thật, công thức KaTeX thật từ CSDL `StudyAIDb`.
2. **Sửa `practice.service.ts` (P0)**:
   - *Hiện trạng*: Lấy câu hỏi từ `questionBank.repository.ts` trong `localStorage`.
   - *Sửa đổi*: Bổ sung API `POST /api/v1/practice/session` để lấy câu hỏi đã được phê duyệt từ kho 16.693 câu trong `StudyAIDb`.
3. **Sửa `AssessmentModal.tsx` (P0)**:
   - *Hiện trạng*: Đang nạp mock quiz khi làm bài kiểm tra cuối bài học.
   - *Sửa đổi*: Chuyển sang gọi `curriculum.service.ts.getLessonQuestions()` và nạp bài qua `checkQuestionAnswer()`.

### 4.2. Đề xuất THÊM (New Enhancements)
1. **Thêm API `GET /api/v1/me/dashboard` (P1)**:
   - *Backend*: Tạo `DashboardController.cs` tổng hợp tiến độ học tập, điểm trung bình, bài tập chưa nộp, và 3 bài học tiếp theo.
   - *Frontend*: Chuyển `useDashboard.ts` sang gọi API này, loại bỏ hoàn toàn `dashboard.mock.ts`.
2. **Thêm Bảng CSDL `user_review_items` (Kho câu hỏi sai & Ôn tập ngắt quãng) (P1)**:
   - *Mục tiêu*: Lưu các câu hỏi học sinh làm sai kèm thời điểm cần ôn lại (NextReviewAt, RepetitionInterval, EaseFactor theo SM-2).
   - *Schema*:
     ```sql
     CREATE TABLE user_review_items (
         Id NVARCHAR(64) PRIMARY KEY,
         UserId NVARCHAR(64) NOT NULL,
         QuestionId NVARCHAR(64) NOT NULL,
         NextReviewAt DATETIMEOFFSET NOT NULL,
         IntervalDays INT NOT NULL DEFAULT 1,
         EaseFactor FLOAT NOT NULL DEFAULT 2.5,
         LapseCount INT NOT NULL DEFAULT 0,
         LastAnsweredAt DATETIMEOFFSET NOT NULL,
         CONSTRAINT FK_Review_User FOREIGN KEY (UserId) REFERENCES users(Id),
         CONSTRAINT FK_Review_Question FOREIGN KEY (QuestionId) REFERENCES content_questions(Id)
     );
     ```
3. **Thêm Tính năng Thi Thử Tốt Nghiệp THPT (Mock Exam Mode) (P1)**:
   - Tạo bộ đề thi thử 40 câu / 50 phút (Toán, Lý, Hóa, Sinh, Sử, Địa, GDCD, Tiếng Anh) trích xuất trực tiếp từ 1.730 câu thi chính thức (`eval` split) của VNHSGE.
4. **Nâng cấp AI Tutor với Prompt Socratic theo Bộ GD&ĐT (P1)**:
   - Thêm nút "Gợi ý bước tiếp theo" (Hint Ladder: Bậc 1 $\rightarrow$ Bậc 2 $\rightarrow$ Bậc 3), hướng dẫn phương pháp giải thay vì giải hộ ngay lập tức.

### 4.3. Đề xuất BỎ (Deprecation & Cleanup)
1. **Bỏ các file mock data tĩnh của học sinh (P2)**:
   - Khi hoàn tất kết nối API thật: Xóa bỏ dần `src/data/lessons.mock.ts`, `src/data/subjects.mock.ts`, `src/data/assessments.mock.ts`, `src/data/questionBank.data.ts`.
   - Giữ lại mock data chỉ trong thư mục test (`*.mock.ts` cho Vitest unit test).
2. **Bỏ lưu trữ cục bộ độc lập (P2)**:
   - Dọn dẹp việc lưu ghi chú và tiến độ độc quyền trên `localStorage` mà không có bản sao trên máy chủ.

