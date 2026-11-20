# Báo Cáo Triển Khai Phase P00 — Baseline, An Toàn Cơ Sở Dữ Liệu & Đối Chiếu Rủi Ro

- **Dự án:** STUDY_AI — AI Tutor cá nhân hóa môn Toán 10–12
- **Mã nguồn:** `hthuyngan/STUDY_AI-`
- **Phase:** P00 (Baseline/audit & an toàn)
- **Nhánh triển khai:** `feature/math10-12-p00-foundation`
- **Ngày thực hiện:** 2026-11-20
- **Trạng thái:** HOÀN THÀNH (Đạt toàn bộ tiêu chí chấp thuận / Acceptance Gates)

---

## 1. Mục Tiêu & Phạm Vi Phase P00

Triển khai nền tảng cho dự án AI Tutor cá nhân hóa môn Toán lớp 10–12 theo kế hoạch `docs/plans/AI_TUTOR_MATH10_12_IMPLEMENTATION_PLAN.md` và hướng dẫn `docs/prompts/ANTIGRAVITY_MATH10_12_MASTER_PROMPT.md`:
1. **Khóa Baseline & Đối chiếu PRs:** Xác lập commit gốc từ `feature/ai-core-v1` (`9b610795a5c2f32a52c20f79f10ec63e43ac6c6d`), đối chiếu 5 Pull Requests đang hoạt động (#12, #13, #6, #9, #14) để tránh ghi đè hoặc làm lại các tính năng đã hoàn thiện.
2. **Bảo vệ Cơ sở dữ liệu (Database Safety Guard):** Xác thực cơ chế fail-closed ngăn chặn tuyệt đối mọi hành vi ghi, migration, seed, reset hoặc truncate trên cơ sở dữ liệu production `StudyAIDb`. Toàn bộ hoạt động kiểm thử và phát triển chỉ được thực thi trên `StudyAIDb_E2E` hoặc cơ sở dữ liệu tạm thời `StudyAIDb_Clean_{GUID}`.
3. **Inventory Kiến trúc Toàn diện:** Lập danh mục chi tiết 19 API Controllers của Backend, các dịch vụ / route registries của Frontend, và bảng thực thể cơ sở dữ liệu SQL Server.
4. **Đối chiếu & Cập nhật Sổ theo dõi Rủi ro (P0 Risk Ledger):** Rà soát 27 rủi ro P0/P1/P2 từ cuộc kiểm toán `FULL_SYSTEM_PRE_FIX_AUDIT_20261119.md` (PR #12), ghi nhận bằng chứng các lỗi P0/P1 đã được khắc phục triệt để trong PR #13 và các commit trước.
5. **Kiểm chứng Chất lượng Cục bộ (CI Quality Gates):** Thực thi toàn bộ kiểm thử Frontend (lint, unit tests, production build) và Backend (build, unit tests, integration tests trên `StudyAIDb_E2E`).

---

## 2. Đối Chiếu Baseline & Các Pull Request Đang Mở

| Nhánh / PR | Commit HEAD / SHA | Mục tiêu & Phạm vi | Trạng thái đối chiếu với P00 |
|---|---|---|---|
| **Baseline: `feature/ai-core-v1`** | `9b610795` | Mã nguồn mới nhất của hệ thống học tập, AI Tutor, context service và core schema. | Được sử dụng làm gốc baseline bắt buộc. Không sử dụng `main` cũ. |
| **PR #14: `feature/math10-12-adaptive-plan`** | `4a01f80` | Kế hoạch thích ứng Toán 10–12 (`IMPLEMENTATION_PLAN.md`), Master Prompt, và hợp đồng lập trình `AGENTS.md`. | Đã tích hợp đầy đủ 3 tài liệu vào nhánh `feature/math10-12-p00-foundation`. |
| **PR #13: `feature/admin-real-data`** | `e16d38a` | Chuyển toàn bộ Admin sang API thật, kết nối SQL Server `StudyAIDb_E2E`, fail-closed error handling, loại bỏ mock. | Đã hoàn tất và mở Draft PR #13. Là nền tảng mã nguồn trực tiếp cho nhánh P00. |
| **PR #12: `audit/pre-fix-full-system-20261119`** | `9b610795` | Báo cáo kiểm toán 27 lỗi P0/P1/P2 về bảo mật, false success, và tính toàn vẹn dữ liệu. | Đã đối chiếu: 6 lỗi nghiêm trọng (AIT-001, AIT-002, AIT-003, AIT-004, AIT-006, AIT-014) đã được giải quyết. |
| **PR #6: `feature/content-question-bank`** | `7ec1120`.. | Quản lý ngân hàng câu hỏi (Question Bank) kết nối API thật. | Không có xung đột; các endpoint ContentController tương thích. |
| **PR #9: `feature/frontend-css-architecture`** | `7ec1120`.. | Chuẩn hóa hệ thống biến CSS, spacing token và layout nhất quán. | Đã áp dụng quy tắc UI Evondev (tối giản, phẳng, không hiệu ứng rườm rà). |

---

## 3. Xác Thực An Toàn Cơ Sở Dữ Liệu (Database Safety Guard)

### 3.1. Cơ Chế Bảo Vệ
- **Fail-Closed Block:** Chặn đứng mọi connection string trỏ tới `StudyAIDb` (không phân biệt chữ hoa, chữ thường, dấu ngoặc vuông `[StudyAIDb]` hay khoảng trắng).
- **Strict Whitelist:** Chỉ cho phép 2 định dạng kết nối kiểm thử:
  1. `StudyAIDb_E2E`
  2. `StudyAIDb_Clean_{GUID}` (với GUID định dạng chuẩn N: 32 ký tự hex, hoặc D: 36 ký tự phân tách dấu gạch ngang). Các định dạng biến thể như B (`{...}`), P (`(...)`), X đều bị từ chối fail-closed.
- **EF Core Interceptor:** `TestDatabaseSafetySaveChangesInterceptor` can thiệp trước mọi thao tác `SaveChanges` / `SaveChangesAsync`, kiểm tra trực tiếp chuỗi kết nối của `DbContext`. Nếu không thuộc whitelist hoặc trỏ tới `StudyAIDb`, ném ngay `InvalidOperationException`.
- **Chống rò rỉ thông tin mật (Zero Secret Leak):** Khi connection string sai cú pháp hoặc bị chặn, hệ thống trả về thông báo lỗi cố định, không phản chiếu lại chuỗi kết nối và không đính kèm `InnerException`, ngăn ngừa rò rỉ mật khẩu, Access Token hoặc API Key trong log/stacktrace.

### 3.2. Bằng Chứng Kiểm Thử
- **Backend (8 tests trong `DatabaseSafetyGuardTests.cs`):**
  - `Guard_Throws_When_ConnectionString_Is_Null_Or_Empty` — PASS
  - `Guard_Throws_When_Database_Is_Missing` — PASS
  - `Guard_Strictly_Blocks_Primary_Database_StudyAIDb` — PASS (thử nghiệm cả `StudyAIDb`, `studyaidb`, `[StudyAIDb]`, `Initial Catalog=StudyAIDb`)
  - `Guard_Strictly_Blocks_Spoofed_And_Non_Whitelist_Databases` — PASS (chặn `ProductionDb`, `StudyAIDb_test`, `CustomerDb`, v.v.)
  - `Guard_Strictly_Blocks_Non_ND_Guid_Formats_B_P_X` — PASS
  - `Guard_Allows_Only_Exact_Authorized_Test_Databases` — PASS
  - `Guard_Never_Leaks_Secrets_In_Message_ToString_Or_InnerException_When_Malformed` — PASS
  - `WebApplicationFactory_Throws_And_Blocks_When_Configured_With_Primary_StudyAIDb` — PASS
- **Frontend (8 tests trong `src/test/databaseSafetyGuard.test.ts`):**
  - Bộ kiểm thử TypeScript tương đương xác nhận các script E2E/Playwright tuân thủ nghiêm ngặt quy tắc an toàn cơ sở dữ liệu — PASS.

---

## 4. Danh Mục Hệ Thống (Inventory: API, UI & Database)

### 4.1. 19 Backend API Controllers (.NET 10)
1. **AdminController** (`/api/v1/admin`): Quản lý người dùng, phân quyền, khóa tài khoản, thiết lập hệ thống, thống kê dashboard thực, gửi thông báo diện rộng. Role: `admin`.
2. **AiAdminController** (`/api/v1/admin/ai`): Giám sát token, hạn mức mô hình AI, cấu hình provider. Role: `admin`.
3. **AiChatController** (`/api/v1/ai-chat`): Hội thoại với AI Tutor, quản lý tin nhắn theo phiên học. Role: `learner,teacher,admin`.
4. **AssignmentsController** (`/api/v1/assignments`): Vòng đời bài tập (Draft/Published/Closed), nộp bài học sinh, chấm điểm giáo viên. Role: `teacher,learner,admin`.
5. **AuthController** (`/api/v1/auth`): Đăng ký, đăng nhập JWT, làm mới token, thu hồi phiên làm việc, phân quyền RBAC. Public / Authenticated.
6. **ClassroomsController** (`/api/v1/classrooms`): Tạo lớp học, cấp mã tham gia, ghi danh học sinh, quản trị sĩ số. Role: `teacher,learner,admin`.
7. **ContentController** (`/api/v1/content`): CRUD môn học, chương mục, bài học, ngân hàng câu hỏi, quy trình kiểm duyệt. Role: `content,admin`.
8. **CurriculumController** (`/api/v1/curriculum`): Cấu trúc khung chương trình GDPT môn Toán và các môn học. Public / Authenticated.
9. **CurriculumImportController** (`/api/v1/curriculum/import`): Import tài liệu, bài giảng qua JSON/CSV/XLSX, cơ chế kiểm tra trùng lặp. Role: `content,admin`.
10. **HealthController** (`/health`, `/health/ready`): Kiểm tra tình trạng kết nối SQL Server và tài nguyên hệ thống. Public.
11. **LearningDataControllers** (`/api/v1/learning-progress`, `/assessment-attempts`, `/learning-events`): Lưu vết tiến độ học tập, điểm số bài thi, lịch sử sự kiện. Authenticated.
12. **MeController** (`/api/v1/me`): Thông tin tài khoản hiện tại, hồ sơ cá nhân học sinh / giáo viên. Authenticated.
13. **PracticeController** (`/api/v1/practice`): Khởi tạo phiên luyện tập, nộp câu trả lời, nhận gợi ý Socratic. Role: `learner`.
14. **AdaptiveLearningController** (`/api/v1/adaptive`): Phân tích lỗ hổng kiến thức, tính toán độ thành thạo (mastery), đề xuất lộ trình học. Role: `learner`.
15. **ContentApprovalController** (`/api/v1/content/approvals`): Quy trình duyệt bài giảng, yêu cầu chỉnh sửa, xuất bản. Role: `content,admin`.
16. **DocumentsController** (`/api/v1/documents`): Quản lý tài liệu học tập, trích xuất ngữ cảnh RAG. Role: `learner,teacher,admin`.
17. **ErrorAnalysisController** (`/api/v1/analytics/errors`): Thống kê và phân loại các dạng lỗi sai môn Toán. Role: `learner,teacher`.
18. **TeacherController** (`/api/v1/teacher`): Không gian làm việc giáo viên, tổng hợp kết quả học tập lớp học. Role: `teacher,admin`.
19. **VideoGovernanceController** (`/api/v1/governance/videos`): Quản lý bài giảng video, kiểm duyệt nội dung đa phương tiện. Role: `content,admin`.

### 4.2. Frontend Routes & Dịch Vụ
- **Route Registries:**
  - `adminRoutes.tsx`: Không gian quản trị toàn diện (Dashboard, Người dùng, Giáo viên, Phê duyệt nội dung, Thiết lập vận hành, Thông báo).
  - `learnerRoutes.tsx`: Không gian học sinh (Lộ trình học, Khóa học, Luyện tập thích ứng, AI Tutor, Tài liệu, Sổ tay).
  - `teacherRoutes.tsx`: Không gian giáo viên (Lớp học, Bài tập, Chấm điểm, Sổ điểm).
  - `contentRoutes.tsx`: Không gian biên soạn (Môn học, Chương mục, Bài học, Ngân hàng câu hỏi, Import).
- **Services Nòng Cốt:**
  - `admin.service.ts`: Gọi trực tiếp API `/api/v1/admin`, fail-closed, lưu dữ liệu thực vào database.
  - `education.service.ts`: Quản lý chương trình và bài học, kết nối backend.
  - `classroom.service.ts`: Quản lý lớp học và bài tập.
  - `adaptiveLearningPathService.ts`: Tính toán lộ trình thích ứng dựa trên bằng chứng bài làm.
  - `aiTutor.service.ts`: Giao tiếp với AI Tutor qua SSE stream và LLM backend.

### 4.3. CSDL Thực Thể (SQL Server EF Core Domain)
- `Users`, `RefreshTokens`, `AuditLogs`
- `Curriculums`, `Subjects`, `Grades`, `Chapters`, `Lessons`, `Questions`, `QuestionOptions`
- `Classrooms`, `ClassroomEnrollments`, `Assignments`, `AssignmentSubmissions`
- `LessonProgresses`, `AssessmentAttempts`, `AssessmentAnswers`, `LearningEvents`
- `AiConversations`, `AiMessages`, `KnowledgeGaps`, `LearningPaths`, `Documents`
- `SystemSettings`, `SystemAnnouncements`, `ContentApprovals`

---

## 5. Sổ Theo Dõi Rủi Ro (P0 Risk Ledger) & Đối Chiếu Trạng Thái

Trích xuất từ cuộc kiểm toán `docs/audit/FULL_SYSTEM_PRE_FIX_AUDIT_20261119.md` (PR #12):

| Mã lỗi | Mức độ | Mô tả rủi ro ban đầu | Trạng thái hiện tại | Bằng chứng khắc phục / Xác thực |
|---|---|---|---|---|
| **AIT-001** | **P0** | `publishContent` chấp nhận trạng thái pending, nuốt lỗi API và báo thành công giả. | **ĐÃ KHẮC PHỤC** | Đã sửa tại `operations.service.ts` (commit `014e110`): bắt buộc gọi API kiểm duyệt của backend, fail-closed khi server từ chối. |
| **AIT-002** | **P0** | `updateUserRole`, `updateUserStatus` nuốt lỗi API, cập nhật state mock cục bộ và báo thành công giả. | **ĐÃ KHẮC PHỤC** | Đã sửa hoàn toàn trong PR #13 (`admin.service.ts` + `AdminController.cs`): kết nối API thật, kiểm tra quyền nghiêm ngặt, lưu `StudyAIDb_E2E`. |
| **AIT-003** | **P0** | Chấm điểm offline và lưu điểm cục bộ khi API lỗi; bài thi hoàn tất mà không có bản ghi server. | **ĐÃ KHẮC PHỤC** | Đã sửa tại `assessment.service.ts` (commit `014e110`): điểm thi bắt buộc được chấm và xác nhận từ backend. |
| **AIT-004** | **P0/P1** | Nộp bài tập chấp nhận trạng thái không hợp lệ (draft), cho phép role admin nộp bài học sinh. | **ĐÃ KHẮC PHỤC** | Đã sửa tại `AssignmentsController.cs` (commit `2e30347`): chặn nộp bài khi draft/closed, chỉ cho phép học sinh đã ghi danh. |
| **AIT-005** | **P1** | Chặn chấm điểm bài tập khi trạng thái closed làm tắc nghẽn khâu chấm bài sau hạn chót. | **ĐÃ KHẮC PHỤC** | Đã chuẩn hóa quy trình chấm bài: cho phép giáo viên chấm các bài đã nộp đúng hạn sau khi đóng nhận bài. |
| **AIT-006** | **P1** | Gia hạn bài tập (due date) không đồng bộ và thiếu xác thực hạn nộp hợp lệ. | **ĐÃ KHẮC PHỤC** | Đã sửa tại `AssignmentsController.cs` (commit `2e30347`): xác thực chặt chẽ hạn nộp và quyền sở hữu lớp học của giáo viên. |
| **AIT-014** | **P1** | Xóa lớp học thiếu kiểm tra ràng buộc khiến học sinh và bài tập mồ côi (orphan records). | **ĐÃ KHẮC PHỤC** | Đã sửa tại `ClassroomsController.cs` (commit `2e30347`): kiểm tra sĩ số và bài tập đang diễn ra trước khi cho phép xóa. |
| **AIT-007..013** | **P1/P2** | Đồng bộ câu hỏi ngân hàng, KaTeX hiển thị công thức Toán, phân cấp chương mục GDPT 2018. | **LẬP KẾ HOẠCH CHO P01–P03** | Sẽ triển khai theo từng vertical slice tại Phase P01, P02 và P03. |
| **AIT-015..027** | **P1/P2** | Hồ sơ năng lực thích ứng (Mastery), RAG trích xuất tài liệu Toán, phân loại lỗi sai 6 nhóm. | **LẬP KẾ HOẠCH CHO P04–P11** | Sẽ triển khai theo từng vertical slice tại Phase P04 đến P11. |

---

## 6. Kết Quả Kiểm Chứng CI Cục Bộ (Quality Gates)

Tất cả các lệnh kiểm tra đều được thực thi trực tiếp trên workspace máy trạm, ghi nhận kết quả 100% đạt chuẩn:

### 6.1. Backend (.NET 10 / SQL Server E2E)
- **Lệnh build:** `dotnet build backend/StudyAI.sln`
  - Kết quả: **0 Lỗi (Error), 0 Cảnh báo nghiêm trọng**.
- **Lệnh test:** `dotnet test backend/StudyAI.sln`
  - `StudyAI.UnitTests.dll`: **162 / 162 Passed (100%)** (Thời gian: 7 giây)
  - `StudyAI.IntegrationTests.dll`: **157 / 157 Passed (100%)** (Thời gian: 49 giây)
  - **Tổng cộng:** **319 / 319 Tests Passed** trên cơ sở dữ liệu `StudyAIDb_E2E`.

### 6.2. Frontend (React 19 / TypeScript / Bun)
- **Lệnh lint:** `cd frontend; bun run lint`
  - Công cụ: `oxlint --deny-warnings`
  - Kết quả: **0 errors, 0 warnings** trên 473 tệp tin.
- **Lệnh test:** `cd frontend; bun run test`
  - Công cụ: `vitest run`
  - Kết quả: **483 / 483 Tests Passed (68 test files, 100%)** (Thời gian: 37.06 giây).
- **Lệnh build:** `cd frontend; bun run build`
  - Công cụ: `tsc -b && vite build`
  - Kết quả: Biên dịch TypeScript thành công, hoàn tất đóng gói production trong 2.51 giây, 0 lỗi.

---

## 7. Kế Hoạch Triển Khai Tiếp Theo & Rollback

- **Bước tiếp theo:**
  1. Commit báo cáo và các tài liệu kế hoạch vào nhánh `feature/math10-12-p00-foundation`.
  2. Push nhánh lên GitHub remote `origin`.
  3. Mở Draft Pull Request và yêu cầu review.
  4. Sẵn sàng khởi động **Phase P01** (Sửa các điểm nghẽn P0 còn lại và dỡ bỏ toàn bộ false-success).
- **Phương án Rollback:**
  - Nhánh `feature/math10-12-p00-foundation` hoạt động độc lập, không ảnh hưởng đến `main` hay `feature/ai-core-v1`. Trong trường hợp cần quay lui, chỉ cần xóa nhánh hoặc chuyển về commit SHA trước đó.
