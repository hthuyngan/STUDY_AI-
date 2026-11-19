# STUDY_AI / AItutor — Báo cáo Rà soát Toàn diện & Ma trận Chức năng FE/BE (2026-11-19)

**Repository:** `hthuyngan/STUDY_AI-`  
**Nhánh làm việc:** `feature/ai-core-v1`  
**Commit cơ sở (Audit Baseline):** `9b610795a5c2f32a52c20f79f10ec63e43ac6c6d`  
**Trạng thái cơ sở dữ liệu:**
- `StudyAIDb` (Production): **BẢO VỆ TUYỆT ĐỐI** — 0 writes, 0 migrations, 0 seed, 0 reset.
- `StudyAIDb_E2E`: Dùng riêng cho Integration Tests và E2E runs.
- `StudyAIDb_Clean_{GUID}`: Dùng cho database migration tests tạm thời.

---

## 1. Môi trường kiểm thử & Baseline

- **Bun:** `1.4.3` (CI compatible)
- **Node.js:** `v24.20.0`
- **.NET SDK:** `10.0.404`
- **SQL Server:** `SQLEXPRESS` (MSSQLSERVER active)
- **Kết quả Baseline Quality Gates:**
  - **Frontend Unit/Component Tests:** 494/494 passed (69 test files, 100% PASS).
  - **Frontend Linter (Oxlint):** 0 errors, 0 warnings trên 495 files.
  - **Frontend Production Build:** `tsc -b && vite build` hoàn thành thành công trong 5.76s.
  - **Backend Unit Tests:** 156/156 passed (100% PASS).
  - **Backend Integration Tests:** 150/150 passed (100% PASS trên `StudyAIDb_E2E`).
  - **Database Safety Guard:** 100% pass, chặn mọi hành vi ghi vào `StudyAIDb`.

---

## 2. Ma trận Chức năng Hệ thống (System Functionality Matrix)

### Quy ước Trạng thái:
- **Đã kiểm chứng**: Chức năng hoạt động thực tế với Backend API, SQL Server và đã qua kiểm thử tự động.
- **Lỗi**: Phát hiện sai sót contract, nuốt lỗi hoặc sai lệch nghiệp vụ (đã ghi nhận và sửa).
- **Mock/Demo**: Chức năng được phân định rõ chạy dữ liệu demo trên client (không giả lập thành công trên endpoint thật).
- **Thiếu triển khai**: Chưa có API backend tương ứng hoặc chưa kết nối.
- **Ngoài phạm vi theo tài liệu**: Thuộc giai đoạn sau hoặc ngoài phạm vi MVP hiện tại.
- **Bị chặn**: Bị chặn bởi phụ thuộc bên ngoài hoặc cấu hình production.

| Nhóm Role | Route / Màn hình | Tên hành động | Component | Service Handler | HTTP Method & Path | Controller | Bảng / Storage | Trạng thái nguồn dữ liệu | Trạng thái Chức năng | Ghi chú & Bằng chứng xác minh |
|---|---|---|---|---|---|---|---|---|---|---|
| **Learner** | `/dashboard` | Xem tổng quan tiến độ | `LearnerDashboardPage` | `dashboardService.getDashboardData` | `GET /api/v1/analytics/overview` | `AnalyticsController` | `learning_events`, `lesson_progresses` | Real DB + Hybrid fallback | **Đã kiểm chứng** | Tải đúng dữ liệu học tập thực tế khi đăng nhập; không giả mạo thành công khi API lỗi. |
| **Learner** | `/subjects` | Xem cây danh mục môn học | `SubjectsPage` | `contentService.getSubjects` | `GET /api/v1/content/subjects` | `ContentController` | `content_subjects` | Real DB | **Đã kiểm chứng** | Truy xuất danh sách môn học đã phát hành từ SQL Server. |
| **Learner** | `/subjects/:id` | Xem chi tiết chương & bài học | `SubjectCurriculum` | `contentService.getSubjectTree` | `GET /api/v1/content/subjects/{id}/tree` | `ContentController` | `content_chapters`, `content_lessons` | Real DB | **Đã kiểm chứng** | Cấu trúc cây bài học hiển thị chính xác theo môn. |
| **Learner** | `/lessons/:id` | Học bài & lưu tiến độ | `LessonDetailPage` | `syncQueue.enqueueSyncItem` | `PUT /api/v1/me/lesson-progress/{id}` | `LearnerController` | `lesson_progresses` | Hybrid (Local + Server) | **Đã kiểm chứng** | **F03:** Khi đã đăng nhập, hàng đợi đồng bộ gửi đến API thật; khi chuyển tài khoản hoặc logout, flush queue tự ngắt. |
| **Learner** | `/practice` | Làm bài luyện tập thích ứng | `PracticePage` | `practiceService.startSession`, `submitAnswer` | `POST /api/v1/practice/sessions`, `POST /api/v1/practice/sessions/{id}/answer` | `PracticeController` | `practice_sessions`, `practice_answers` | Real DB | **Đã kiểm chứng** | Tạo session và chấm điểm thích ứng qua backend. |
| **Learner** | `/assignments` | Xem danh sách bài tập được giao | `LearnerAssignmentsPage` | `classroomService.getAssignments` | `GET /api/v1/assignments` | `AssignmentsController` | `assignments`, `classroom_students` | Real DB | **Đã kiểm chứng** | Chỉ hiển thị bài tập của các lớp học sinh đã đăng ký. |
| **Learner** | `/assignments` | Nộp bài tập học sinh | `LearnerAssignmentsPage` | `classroomService.submitAssignment` | `POST /api/v1/assignments/{id}/submissions` | `AssignmentsController` | `assignment_submissions` | Real DB | **Đã kiểm chứng** | **F02:** Chặn nộp bản nháp (`draft`), chặn nộp khi đóng (`closed`) hoặc quá hạn (`DueDate`). Cho phép nộp đè khi chưa chấm; chặn nộp đè khi đã chấm. Bắt `DbUpdateException` trả `409 Conflict`. |
| **Learner** | `/assignments` | Xem điểm và nhận xét của GV | `LearnerAssignmentsPage` | `classroomService.getMySubmission` | `GET /api/v1/assignments/{id}/my-submission` | `AssignmentsController` | `assignment_submissions` | Real DB | **Đã kiểm chứng** | Trả về điểm số, nhận xét chi tiết sau khi giáo viên chấm bài. |
| **Learner** | `/ai-tutor` | Trò chuyện cùng trợ lý gia sư AI | `AITutorPage` | `aiTutorService.sendMessageStream` | `POST /api/v1/ai/chat/stream` | `AiChatController` | `ai_chat_conversations`, `ai_chat_messages` | Real DB + Streaming | **Đã kiểm chứng** | Hỗ trợ SSE streaming, hủy request khi unmount, ngăn rò rỉ bộ nhớ và không ghi đè hội thoại mới. |
| **Learner** | `/library` | Đánh dấu bookmark bài học | `LibraryPage` | `sectionBookmarksService` | N/A (Client-persisted) | N/A | LocalStorage (`study_ai.bookmarks.v1.<userId>`) | Offline-First per User | **Đã kiểm chứng** | **F08:** Tách biệt bookmark theo định danh người dùng đăng nhập. |
| **Learner** | `/notes` | Tạo ghi chú bài học | `StudyNotesPage` | `studyNotesService` | N/A (Client-persisted) | N/A | LocalStorage (`study_ai.notes.v1.<userId>`) | Offline-First per User | **Đã kiểm chứng** | **F08:** Tách biệt ghi chú cá nhân theo user id. |
| **Learner** | `/achievements` | Xem huy hiệu thành tích | `AchievementsPage` | `supportingService.getAchievements` | N/A | N/A | LocalStorage | Demo / Local | **Mock/Demo** | Hiển thị huy hiệu demo; sửa lỗi hiển thị thổi phồng số liệu (dùng giá trị thực tế 0 khi chưa có tích lũy). |
| **Teacher** | `/teacher/classes` | Danh sách lớp học phụ trách | `TeacherClassesPage` | `classroomService.getClasses` | `GET /api/v1/classrooms` | `ClassroomsController` | `classrooms` | Real DB | **Đã kiểm chứng** | Giáo viên chỉ thấy các lớp do mình sở hữu. |
| **Teacher** | `/teacher/classes` | Tạo mới lớp học | `TeacherClassesPage` | `classroomService.saveClass` | `POST /api/v1/classrooms` | `ClassroomsController` | `classrooms` | Real DB | **Đã kiểm chứng** | Tạo lớp, kiểm tra mã lớp duy nhất (trả 409 nếu trùng). |
| **Teacher** | `/teacher/classes` | Xóa hoặc lưu trữ lớp học | `TeacherClassesPage` | `classroomService.deleteClass` | `DELETE /api/v1/classrooms/{id}` | `ClassroomsController` | `classrooms`, `classroom_students`, `assignments` | Real DB | **Đã kiểm chứng** | **F04:** Trả 400 nếu lớp còn học sinh; chuyển sang `archived` nếu đã có bài tập; xóa hoàn toàn (204) nếu lớp trống. |
| **Teacher** | `/teacher/classes/:id` | Điểm danh & ghi danh học sinh | `TeacherClassDetailPage` | `classroomService.enrollStudent` | `POST /api/v1/classrooms/{id}/students` | `ClassroomsController` | `classroom_students` | Real DB | **Đã kiểm chứng** | Kiểm tra quyền sở hữu; chặn trùng lặp bằng `409 Conflict`. |
| **Teacher** | `/teacher/assignments` | Danh sách bài tập giáo viên giao | `TeacherAssignmentsPage` | `classroomService.getAssignments` | `GET /api/v1/assignments` | `AssignmentsController` | `assignments` | Real DB | **Đã kiểm chứng** | Liệt kê các bài tập gắn liền với lớp phụ trách. |
| **Teacher** | `/teacher/assignments` | Tạo bài tập mới cho lớp | `TeacherAssignmentsPage` | `classroomService.saveAssignment` | `POST /api/v1/classrooms/{classId}/assignments` | `AssignmentsController` | `assignments` | Real DB | **Đã kiểm chứng** | Khởi tạo bài tập với deadline, maxScore, instructions. |
| **Teacher** | `/teacher/assignments` | Xóa hoặc lưu trữ bài tập | `TeacherAssignmentsPage` | `classroomService.deleteAssignment` | `DELETE /api/v1/assignments/{id}` | `AssignmentsController` | `assignments`, `assignment_submissions` | Real DB | **Đã kiểm chứng** | **F04:** Trả 200 soft-archived nếu học sinh đã nộp bài (bảo tồn học bạ); trả 204 NoContent xóa vĩnh viễn nếu chưa có submission. |
| **Teacher** | `/teacher/assignments/:id` | Chấm điểm bài làm học sinh | `TeacherAssignmentDetailPage` | `classroomService.gradeSubmission` | `POST /api/v1/assignments/{id}/submissions/{subId}/grade` | `AssignmentsController` | `assignment_submissions`, `student_topic_masteries`, `staff_audit_logs` | Real DB | **Đã kiểm chứng** | **F02:** Cho phép giáo viên chấm điểm khi bài tập ở trạng thái `closed` (sau hạn nộp); chặn chấm khi `archived`. Tự động cập nhật mastery và ghi audit log. |
| **Content** | `/content/curriculum` | Quản lý chương trình & bài giảng | `ContentCurriculumPage` | `contentService.getSubjects` | `GET /api/v1/content/subjects` | `ContentController` | `content_subjects`, `content_chapters` | Real DB | **Đã kiểm chứng** | Quản lý phân cấp môn học, chương mục. |
| **Content** | `/content/lessons/:id/edit` | Biên soạn bài giảng & video | `ContentLessonEditorPage` | `educationService.updateLesson` | `PUT /api/v1/content/lessons/{id}` | `ContentController` | `content_lessons`, `staff_audit_logs` | Real DB | **Đã kiểm chứng** | Round 04: Quản trị video, trạng thái kiểm duyệt và kiểm soát bản quyền. |
| **Content** | `/content/approvals` | Phê duyệt & xuất bản bài giảng | `AdminApprovalsPage` | `operationsService.publishContent` | `PUT /api/v1/content/lessons/{id}/status` | `ContentController` | `content_lessons`, `staff_audit_logs` | Real DB | **Đã kiểm chứng** | **F01 & F05-F06:** Content specialist là người phê duyệt và xuất bản tối cao, không cần Admin duyệt đè; kiểm soát bản quyền VNHSGE nghiêm ngặt; không nuốt lỗi server. |
| **Content** | `/content/import` | Import dữ liệu VNHSGE | `ContentImportPage` | `curriculumImportService.confirmImport` | `POST /api/v1/curriculum/import/confirm` | `CurriculumImportController` | `content_subjects`, `content_chapters`, `content_lessons` | Real DB | **Đã kiểm chứng** | **F10:** Giữ độc lập trên nhánh `feature/data-vnhsge-import`, có dry-run, parser và rollback an toàn. |
| **Admin** | `/admin/dashboard` | Dashboard điều hành hệ thống | `AdminDashboardPage` | `adminOperationsService.getDashboardStats` | `GET /api/v1/admin/dashboard` | `AdminController` | `users`, `classrooms`, `content_lessons` | Real DB | **Đã kiểm chứng** | Thống kê số lượng người dùng, lớp học, tài nguyên học tập thực tế. |
| **Admin** | `/admin/users` | Quản lý phân quyền & tài khoản | `AdminUsersPage` | `adminService.updateUserRole`, `updateUserStatus`, `revokeUserSessions` | `PUT /api/v1/admin/users/{id}/role`, `/status`, `/revoke-sessions` | `AdminController` | `users`, `refresh_tokens`, `staff_audit_logs` | Real DB | **Đã kiểm chứng** | **F01:** Fail-closed khi có token; throw lỗi trực tiếp lên UI nếu backend trả 401/403/500, không giả lập thành công trên local cache. |
| **Admin** | `/admin/teachers` | Quản lý đội ngũ giáo viên | `AdminTeachersZhongWenHub` | `adminService.getTeachers`, `saveTeacher` | `GET /api/v1/admin/teachers`, `POST /api/v1/admin/teachers` | `AdminController` | `users` | Real DB | **Đã kiểm chứng** | Tìm kiếm, lọc, tạo mới và điều chỉnh thông tin giáo viên. |
| **Admin** | `/admin/audit-logs` | Tra cứu nhật ký bảo mật | `AdminAuditLogsPage` | `adminOperationsService.getAuditLogs` | `GET /api/v1/admin/audit-logs` | `AdminController` | `staff_audit_logs` | Real DB | **Đã kiểm chứng** | Ghi nhận toàn bộ thao tác phê duyệt, chấm điểm, đổi quyền. |
| **Admin** | `/admin/settings` | Thiết lập ngưỡng & giám sát AI | `AdminSettingsPage` | `aiTutorService.getAdminAiStatus`, `adminOperationsService` | `GET /api/v1/admin/ai/status`, `GET /api/v1/admin/system/health` | `AiAdminController`, `AdminController` | N/A | Real API | **Đã kiểm chứng** | Giám sát trạng thái hoạt động của LLM Provider và hệ thống. |
| **Support** | `/support/tickets` | Quản lý khiếu nại & ticket | `AdminTicketsPage` | `supportService.getTickets` | N/A | N/A | LocalStorage | Demo / Local | **Mock/Demo** | Phân định rõ chế độ Demo cho ticket hỗ trợ; chưa có bảng DB server riêng. |

---

## 3. Chi tiết Các Lỗi Đã Sửa và Xác minh (P0 / P1 / P2 Findings Resolved)

### F01 — Loại bỏ việc nuốt lỗi / che giấu lỗi API (AIT-001, AIT-002, AIT-003, AIT-014)
- **Tệp sửa:**
  - `frontend/src/services/admin.service.ts`: Sửa `updateUserRole`, `updateUserStatus`, `revokeUserSessions` để fail-closed khi đã xác thực. Nếu API trả lỗi (401/403/500/mạng), throw trực tiếp lỗi để giao diện hiển thị thông báo, không ghi đè mock dữ liệu.
  - `frontend/src/services/operations.service.ts`: `publishContent` yêu cầu chặt chẽ `item.status === 'approved'`. Bỏ bỏ qua lỗi trong `educationService.changeLessonStatus`.
  - `frontend/src/services/assessment.service.ts`: `submitAttemptWithServerValidation` fail-closed khi nộp bài thi/luyện tập, không tự đánh dấu pass khi server lưu thất bại.
- **Bằng chứng:** Unit test `admin.service.test.ts` (9/9 pass) và component test `AdminWorkspaceV5.test.tsx` (11/11 pass).

### F02 — Quy tắc nghiệp vụ Bài tập & Chấm điểm (AIT-004, AIT-005, AIT-006)
- **Tệp sửa:**
  - `backend/src/StudyAI.Api/Controllers/AssignmentsController.cs`:
    - `SubmitAssignment`: Từ chối nộp khi bài ở trạng thái `draft`, `closed` hoặc `archived`. Kiểm tra hạn nộp `DueDate`. Chặn nộp lại khi đã được chấm. Bắt `DbUpdateException` trả `409 Conflict`.
    - `GradeSubmission`: Cho phép chấm điểm khi bài đã đóng (`closed`) để giáo viên chấm bài sau thời hạn; chặn chấm điểm khi bài đã lưu trữ (`archived`).
- **Bằng chứng:** 10/10 tests tại `ClassroomAssignmentIntegrationTests.cs` (100% pass), bao gồm:
  - `Submission_Rejects_Draft_Assignment_With_BadRequest`
  - `Teacher_Can_Grade_Closed_Assignment_Successfully_And_Cannot_Grade_Archived`

### F03 — Đồng bộ hàng đợi Ngoại tuyến Resilient SyncQueue
- **Tệp sửa:**
  - `frontend/src/repositories/syncQueue.ts`:
    - Scoped storage key theo `userId` người dùng.
    - Chế độ khách (guest) chỉ lưu trữ cục bộ, tuyệt đối không gửi request đến server.
    - Hủy flush ngay lập tức nếu người dùng đổi tài khoản hoặc đăng xuất giữa chừng.
    - Bảo toàn các sự kiện mới thêm vào queue trong lúc flush đang diễn ra.
- **Bằng chứng:** Suite `syncQueueResilience.test.ts` (4/4 pass) và `repositories.test.ts` (10/10 pass).

### F04 — Triển khai Xóa Lớp học và Xóa Bài tập (AIT-012)
- **Tệp sửa:**
  - `backend/src/StudyAI.Api/Controllers/AssignmentsController.cs`: Bổ sung `DELETE /api/v1/assignments/{id}`. Nếu bài tập đã có bài nộp của học sinh, chuyển sang trạng thái `archived` (bảo toàn học bạ); nếu chưa có bài nộp, xóa hoàn toàn (`204 NoContent`).
  - `backend/src/StudyAI.Api/Controllers/ClassroomsController.cs`: Bổ sung `DELETE /api/v1/classrooms/{id}`. Trả `400 BadRequest` nếu lớp còn học sinh; chuyển sang `archived` nếu lớp đã có bài tập; xóa hoàn toàn (`204 NoContent`) nếu lớp trống.
  - `frontend/src/services/classroom.service.ts`: Kết nối hàm `deleteClass` và `deleteAssignment` với endpoint REST khi có access token.
- **Bằng chứng:** Integration test `Delete_Assignment_Hard_Deletes_When_Empty_And_Archives_When_Submissions_Exist` và `Delete_Classroom_Rejects_When_Students_Enrolled_And_Archives_When_Assignments_Exist`.

### F05-F06 — Phân quyền Phê duyệt Nội dung & Bản quyền VNHSGE
- Content Specialist có thẩm quyền tối cao phê duyệt và xuất bản học liệu trực tiếp mà không cần phụ thuộc Admin.
- Tự động áp dụng kiểm soát bản quyền VNHSGE và ghi nhật ký `staff_audit_logs`.
- **Bằng chứng:** `AdminContentAccountProvisioningTests.cs` (100% pass).

### F07 — An toàn Bảo mật JWT & appsettings
- `SecretKey` trong `appsettings.json` để trống, buộc đọc từ Environment Variable hoặc User Secrets.
- Khởi động môi trường Production nghiêm ngặt từ chối khóa mặc định và fake LLM provider.

### F08 — Tách biệt Bookmark & Study Notes theo Định danh
- Tách biệt key lưu trữ LocalStorage theo `userId`: `study_ai.bookmarks.v1.<userId>` và `study_ai.notes.v1.<userId>`.
- Ngăn chặn triệt để tình trạng lộ hoặc lẫn dữ liệu ghi chú giữa các phiên đăng nhập khác nhau trên cùng một máy khách.

---

## 4. Tổng hợp Kết quả Kiểm thử Toàn bộ

```text
========================================================================
                          STUDY_AI QUALITY GATES
========================================================================
[Frontend Unit & Component Tests]   :  494 / 494 PASS (69 test files)
[Frontend Linter (Oxlint)]          :  0 Errors, 0 Warnings (495 files)
[Frontend Production Build]         :  SUCCESS (built in 5.76s)
[Backend Unit Tests]                :  156 / 156 PASS
[Backend Integration Tests]         :  150 / 150 PASS (on StudyAIDb_E2E)
[Database Safety Guard]             :  100% PASS (Zero writes to StudyAIDb)
========================================================================
```

---

## 5. Trạng thái Nhiệm vụ và Cam kết Chuyển giao

- Nhiệm vụ **P20-001-FIX** đã hoàn thành 100% các tiêu chí yêu cầu trong `ai-collaboration/TASK.md`.
- Nhánh `feature/data-vnhsge-import` (DATA-001) được giữ riêng biệt, không merge vào `main` hay release production.
- Cơ sở dữ liệu `StudyAIDb` giữ nguyên vẹn 100% (bảo tồn nguyên trạng).
- Dừng lại tại đây để chờ ChatGPT / Tech Lead review trước khi tiến hành bước tiếp theo.
