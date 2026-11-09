# STUDY_AI — Báo cáo Kiểm kê Dữ liệu Chương trình học (Data Inventory)
## Phase 18 / Checkpoint 1: Technical Content & Schema Audit

Ngày kiểm kê: 09/11/2026  
Môi trường thực hiện: Microsoft SQL Server (`.\SQLEXPRESS`), Clean Architecture (.NET 10, EF Core 10), React 19 Frontend.  
Baseline Git: `7956cbfb8b309bd28ab10b247fbd782a7e32aa0c`  
Tác giả: Senior Full-stack Architect & Education Content Specialist.

---

## 1. Tổng quan Mục đích & Phương pháp Kiểm kê

Tài liệu này kiểm kê toàn diện cấu trúc cơ sở dữ liệu, mô hình thực thể Entity Framework Core, các endpoint API và hiện trạng dữ liệu chương trình giáo dục (Curriculum) trong hệ thống STUDY_AI nhằm chuẩn bị cho việc nhập liệu chuẩn hóa theo Chương trình GDPT 2018 (Thông tư 32/2018/TT-BGDĐT).

### Phân định rõ ràng các tầng dữ liệu trong hệ thống:
1. **Dữ liệu thật (Production/Live Data)**: Các tài khoản người dùng thực tế (`users`, 58 tài khoản), lịch sử thao tác nhân sự (`staff_audit_logs`, 58 bản ghi), phiên làm việc (`refresh_sessions`, 98 phiên) trong cơ sở dữ liệu chính `StudyAIDb`. Dữ liệu này được **bảo toàn tuyệt đối**, không được phép xóa, truncate hay thay đổi trong quá trình kiểm kê.
2. **Dữ liệu mầm (Seed/Baseline Data)**: Các bản ghi môn học và bài học mẫu ban đầu được khởi tạo bởi `DbInitializer.cs` (`sub_math12`, `chp_math12_c1`, `les_math12_c1_b1`).
3. **Dữ liệu kiểm thử (Test/E2E Data)**: Dữ liệu cô lập sinh ra bởi các bộ kiểm thử tự động Playwright (Phase 16 và Phase 17) trên database riêng biệt `StudyAIDb_E2E` (các mã ID sinh ngẫu nhiên như `sub_m12_mw9atb3q`, `qst_2c361...`).
4. **Dữ liệu mẫu giao diện (Frontend In-Memory/Demo Data)**: Dữ liệu được cấu trúc tại `frontend/src/data/curriculum.data.ts` (1,147 dòng mã) đại diện cho 9 môn học GDPT 2018 và mẫu bài học Toán 12 hoàn chỉnh.

---

## 2. Bảng Kiểm kê Chi tiết Schema & Dữ liệu SQL Server

### 2.1. Hiện trạng áp dụng Migration trên Cơ sở Dữ liệu

| Cơ sở Dữ liệu | Trạng thái | Lịch sử Migration đã áp dụng | Tình trạng Pending Migrations |
| :--- | :---: | :--- | :--- |
| **`StudyAIDb`** *(Chính)* | **ONLINE** | • `20261107094945_InitialSqlServerCreate`<br>• `20261108144723_AddUserSoftDelete` | **2 pending migrations**:<br>1. `20261108162500_EnhanceCurriculumAndQuestions`<br>2. `20261109001500_FixContentDefaultConstraints`<br>*(Tuân thủ nguyên tắc an toàn: Chưa áp dụng)* |
| **`StudyAIDb_E2E`** *(Test cô lập)* | **ONLINE** | Toàn bộ 4 migrations đã áp dụng đầy đủ. | Không có (Up-to-date). |

---

### 2.2. Ma trận Kiểm kê Bảng Dữ liệu (Table-by-Table Inventory)

| Tên Bảng | Mục đích nghiệp vụ | Khóa chính (PK) | Khóa ngoại (FK) | Unique Constraints / Indexes | Số bản ghi `StudyAIDb` | Số bản ghi `StudyAIDb_E2E` | Phân loại dữ liệu |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **`content_subjects`** | Danh mục môn học thuộc các khối lớp (Toán, Lý, Hóa,...) | `Id` (`nvarchar(64)`) | Không | • `IX_content_subjects_Code` (Unique) | **1** | **8** | Seed (`StudyAIDb`) / Test (`E2E`) |
| **`content_chapters`** | Phân cấp chương học theo từng môn | `Id` (`nvarchar(64)`) | `SubjectId` $\to$ `content_subjects(Id)` | • `IX_content_chapters_SubjectId` | **1** | **8** | Seed (`StudyAIDb`) / Test (`E2E`) |
| **`content_lessons`** | Nội dung bài học lý thuyết, công thức KaTeX, trạng thái kiểm duyệt | `Id` (`nvarchar(64)`) | `ChapterId` $\to$ `content_chapters(Id)`<br>`AuthorId` $\to$ `users(Id)` | • `IX_content_lessons_ChapterId`<br>• `IX_content_lessons_Status`<br>• `IX_content_lessons_Slug` | **1** | **11** | Seed (`StudyAIDb`) / Test (`E2E`) |
| **`content_assessments`** | Đợt bài tập/thu hoạch đánh giá sau bài học (PassScore 80%) | `Id` (`nvarchar(64)`) | `LessonId` $\to$ `content_lessons(Id)` | • `IX_content_assessments_LessonId` | **0** | **0** | Chưa nhập liệu |
| **`content_questions`** | Ngân hàng câu hỏi trắc nghiệm, các lựa chọn A/B/C/D, đáp án đúng | `Id` (`nvarchar(64)`) | `LessonId` $\to$ `content_lessons(Id)`<br>`AssessmentId` $\to$ `content_assessments(Id)` | • `IX_content_questions_LessonId`<br>• `IX_content_questions_Status`<br>• `IX_content_questions_SubjectId`<br>• `IX_content_questions_ChapterId` | **0** *(chưa migrate schema mở rộng)* | **9** | Test (`E2E`) |
| **`staff_audit_logs`** | Ghi nhận toàn bộ thao tác phê duyệt, từ chối, xuất bản nội dung | `Id` (`nvarchar(64)`) | `StaffUserId` $\to$ `users(Id)` | • `IX_staff_audit_logs_Timestamp` | **58** | **131** | Thật (`StudyAIDb`) / Test (`E2E`) |
| **`lesson_progress`** | Tiến độ học bài của từng học viên theo từng bài học (0 - 100%) | `Id` (`int IDENTITY`) | `UserId` $\to$ `users(Id)` | • `IX_lesson_progress_UserId_LessonId` | **3** | **3** | Seed / Demo |
| **`assessment_attempts`** | Lịch sử nộp bài thu hoạch, điểm số, thời gian làm bài của học viên | `Id` (`nvarchar(64)`) | `UserId` $\to$ `users(Id)` | • `IX_assessment_attempts_UserId` | **7** | **4** | Seed / Demo |
| **`assessment_responses`** | Từng câu trả lời trắc nghiệm của học viên trong một lần làm bài | `Id` (`nvarchar(64)`) | `AttemptId` $\to$ `assessment_attempts(Id)` | • `IX_assessment_responses_AttemptId` | **5** | **2** | Seed / Demo |
| **`learning_events`** | Nhật ký sự kiện tương tác học tập chi tiết (Telemetry logs) | `Id` (`nvarchar(64)`) | `UserId` $\to$ `users(Id)` | • `IX_learning_events_Timestamp` | **0** | **0** | Sẵn sàng tiếp nhận |
| **`users`** | Danh mục tài khoản người dùng (Admin, Content, Teacher, Learner) | `Id` (`nvarchar(64)`) | Không | • `IX_users_EmailNormalized` (Unique)<br>• `IX_users_IsDeleted` (Filtered) | **58** | **35** | **Dữ liệu thật bảo toàn** |

---

## 3. Phân tích Dữ liệu Hiện có (Data Characteristics)

### 3.1. Dữ liệu trong `StudyAIDb` (Cơ sở Dữ liệu Chính)
- **Môn học**: Duy nhất bản ghi `sub_math12` (Tên: `Toán 12`, Mã: `MATH12`, Khối: `12`, Trạng thái: `IsActive = 1`).
- **Chương học**: Duy nhất bản ghi `chp_math12_c1` (Tên: `Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số`).
- **Bài học**: Duy nhất bản ghi `les_math12_c1_b1` (Tiêu đề: `Bài 1: Tính đơn điệu và cực trị của hàm số`, Trạng thái: `published`).
- **Câu hỏi**: `0` bản ghi (Chưa có câu hỏi chính thức trên `StudyAIDb`).

### 3.2. Dữ liệu trong `frontend/src/data/curriculum.data.ts` (Mẫu giao diện GDPT 2018)
- Đầy đủ 9 môn học chuẩn GDPT 2018:
  1. `math` (Toán học)
  2. `physics` (Vật lý)
  3. `chemistry` (Hóa học)
  4. `biology` (Sinh học)
  5. `literature` (Ngữ văn)
  6. `history` (Lịch sử)
  7. `geography` (Địa lý)
  8. `informatics` (Tin học)
  9. `english` (Tiếng Anh)
- Khối 12 Toán học được biên soạn chi tiết:
  - 13 Cụm năng lực / Kỹ năng chuẩn hóa (`MASTER_SKILLS`), ví dụ: `SKILL-MATH-12-DERIV-SIGN`, `SKILL-MATH-12-MONOTONICITY`, `SKILL-MATH-12-EXTREMUM`, `SKILL-MATH-12-VARIATION-TABLE`, `SKILL-MATH-12-GRAPH-SKETCHING`.
  - 3 Bài học đầy đủ lý thuyết KaTeX:
    - `lesson-math-12-01`: Tính đơn điệu và cực trị của hàm số (4 mục lý thuyết, 3 ví dụ giải mẫu).
    - `lesson-math-12-02`: Giá trị lớn nhất và giá trị nhỏ nhất của hàm số.
    - `lesson-math-12-03`: Khảo sát sự biến thiên và vẽ đồ thị của hàm số.
  - Ngân hàng câu hỏi trắc nghiệm đi kèm mỗi bài thu hoạch.

---

## 4. Rà soát Vấn đề Dữ liệu (Data Issues & Quality Gaps)

1. **Dữ liệu Trùng lặp (Duplicate Risk)**:
   - Hiện chưa có dữ liệu trùng lặp trên `StudyAIDb`.
   - Tuy nhiên, mã định danh giữa Frontend (`math`, `lesson-math-12-01`) và Backend Seed (`sub_math12`, `les_math12_c1_b1`) đang dùng quy ước tiền tố khác nhau (`sub_` vs chuỗi thuần). Cần cơ chế mapping mã môn đồng nhất (`MATH12`).
2. **Thiếu Metadata Học thuật (Missing Academic Metadata)**:
   - Các bảng SQL Server hiện tại thiếu trường biểu diễn:
     - Chuẩn đầu ra năng lực cụ thể (`LearningOutcomes` / `CompetencyPillars`).
     - Tác quyền và nguồn tham chiếu (`SourceCitation`, `LicenseType`).
     - Phiên bản nội dung sư phạm (`ContentVersion`, ví dụ: `GDPT2018.v1`).
3. **Cấu trúc trường JSON cho nội dung bài học**:
   - `content_lessons` sử dụng các cột chuỗi JSON: `DefinitionsJson`, `FormulasJson`, `ExamplesJson`, `ImportantNotesJson`, `SummaryPointsJson`.
   - Khi import dữ liệu hàng loạt từ CSV/Excel, nếu không qua tầng chuẩn hóa schema (Data Transfer Object), định dạng JSON dễ gặp lỗi cú pháp (escaping quote, ký tự backslash của LaTeX như `\frac`, `\sqrt`).

---

## 5. Kết luận Kiểm kê

Hệ thống STUDY_AI đã có nền tảng phân cấp phân vùng chương trình học rõ ràng từ Subject $\to$ Chapter $\to$ Lesson $\to$ Question. Dữ liệu thật được phân lập an toàn. Bước tiếp theo (Curriculum Mapping & Import Design) cần chuẩn hóa bộ từ điển dữ liệu (Data Dictionary) và cơ chế chuyển đổi dữ liệu từ các định dạng nhập liệu (CSV, JSON, XLSX) sang cấu trúc quan hệ SQL Server một cách chặt chẽ và có khả năng chống trùng lặp (Idempotent Upsert).

