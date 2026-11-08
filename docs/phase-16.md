# Phase 16: Real Admin User Management & CRUD (ASP.NET Core 10 + SQL Server + React 19)

## 1. Tổng quan & Mục tiêu

Phase 16 triển khai toàn diện hệ thống Quản trị Người dùng Thực tế (Real Admin User Management & CRUD) kết nối trực tiếp giữa **ASP.NET Core 10 Web API**, cơ sở dữ liệu **Microsoft SQL Server** (`StudyAIDb`) và giao diện **React 19**:
- **Backend**: ASP.NET Core 10 (.NET 10.0.403), Entity Framework Core 10, Microsoft SQL Server LocalDB/Express (`StudyAIDb`).
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Bun runtime.
- **Security & Integrity**: RBAC Policy-based authorization (`AdminOnly`), Argon2id password hashing, Session revocation, Bảo vệ Admin duy nhất (Last Active Admin Protection), Xóa mềm an toàn (Soft Delete) bảo toàn tuyệt đối lịch sử học tập (`LessonProgress`, `AssessmentAttempt`, `LearningEvent`), Ghi nhật ký kiểm toán hệ thống (`StaffAuditLogs`).
- **Zero Mock Policy**: 100% dữ liệu quản trị trên production kết nối trực tiếp SQL Server, phân trang thực tế phía server (Server-side Pagination), không tải toàn bộ danh sách về client để phân trang giả.

---

## 2. Hoàn thiện điều kiện tồn đọng từ Phase 15

Trước khi triển khai Phase 16, các yêu cầu đồng bộ từ Phase 15 đã được hoàn thiện triệt để:
1. **Đồng bộ mã trạng thái trùng lặp email**:
   - `AuthController.Register` và `AdminController.CreateUser` trả về chuẩn mã **`409 Conflict`** khi email đã tồn tại trong database (thay vì 400).
   - Kiểm thử `AuthIntegrationTests` và `AdminUserManagementIntegrationTests` đã được cập nhật và vượt qua kiểm tra 409 Conflict.
2. **CORS Allowlist & Origin Validation**:
   - Môi trường Development hỗ trợ `SetIsOriginAllowed` cho localhost / 127.0.0.1 trên mọi port phục vụ kiểm thử Playwright và preview dev servers.
   - Môi trường Production bắt buộc nạp cấu hình `Cors:AllowedOrigins` từ `appsettings.Production.json` hoặc Environment Variable `CORS__ALLOWEDORIGINS`, chặn mọi origin lạ.
3. **CSRF Mitigation & Credentials**:
   - Cookie `study_ai_refresh_token` sử dụng `HttpOnly = true`, `SameSite = SameSiteMode.Lax` (hoặc `None` khi cross-domain HTTPS).
   - Mọi API nhạy cảm đều yêu cầu `Authorization: Bearer <token>` lấy từ in-memory state của React client, miễn nhiễm hoàn toàn với CSRF attack thông thường.
4. **Giới hạn Rate Limiting**:
   - Rate limiting in-memory (`LoginRateLimiter`) được ghi nhận chi tiết về kiến trúc: phù hợp cho single-instance deployment; khi mở rộng multi-instance / horizontal scaling, kiến trúc đã sẵn sàng tích hợp Redis Distributed Cache.

---

## 3. Kiến trúc Cơ sở Dữ liệu & EF Core Migration

### 3.1. Mô hình Xóa mềm (Soft Delete Schema)
Để đảm bảo người dùng bị xóa không làm đứt gãy tính toàn vẹn tham chiếu (foreign key constraints) với lịch sử học tập, thực thể `User` được bổ sung hai trường dữ liệu:
```csharp
public bool IsDeleted { get; set; } = false;
public DateTimeOffset? DeletedAt { get; set; }
```

### 3.2. Migration `20261108144723_AddUserSoftDelete`
- Thêm cột `IsDeleted` (kiểu `bit`, non-null, default `0`).
- Thêm cột `DeletedAt` (kiểu `datetimeoffset`, nullable).
- Tạo chỉ mục lọc (Filtered Index): `CREATE INDEX [IX_users_IsDeleted] ON [users] ([IsDeleted]);` để tối ưu hóa hiệu năng truy vấn danh sách người dùng active.
- Áp dụng thành công vào cơ sở dữ liệu `StudyAIDb` qua EF Core CLI:
  `dotnet ef database update --project backend/src/StudyAI.Infrastructure --startup-project backend/src/StudyAI.Api`

---

## 4. Đặc tả API Backend (Admin Endpoints)

Tất cả các endpoint dưới đây được bảo vệ nghiêm ngặt bằng Policy `AdminOnly` (`[Authorize(Policy = "AdminOnly")]`), yêu cầu Bearer JWT hợp lệ và vai trò `admin`:

| Phương thức | Endpoint | Chức năng | Hành vi bảo mật & nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/dashboard` | Thống kê Dashboard | Đếm số liệu thực từ SQL Server: Tổng người dùng, Learner, Teacher, Admin, Tổng số bài học. Lấy 5 nhật ký hoạt động nhân sự gần nhất. |
| `GET` | `/api/v1/admin/users` | Danh sách người dùng | Phân trang phía Server (`page`, `pageSize`), tìm kiếm (`search` theo email, tên), lọc (`role`, `status`), sắp xếp (`sortBy`, `sortOrder`). Ẩn mặc định tài khoản `IsDeleted = true`. |
| `POST` | `/api/v1/admin/users` | Tạo tài khoản | Hỗ trợ tạo `learner`, `teacher`, `content`, `support`, `admin`. Kiểm tra trùng email (409 Conflict). Mã hóa Argon2id. Tự sinh mật khẩu tạm thời an toàn (16 ký tự cryptographically secure) nếu không truyền vào. Ghi `StaffAuditLogs`. |
| `GET` | `/api/v1/admin/users/{id}` | Chi tiết người dùng | Lấy đầy đủ thông tin định danh và trạng thái tài khoản. |
| `PATCH` | `/api/v1/admin/users/{id}` | Cập nhật hồ sơ | Sửa `displayName`, `grade`, `role`, `status`. Bảo vệ không cho hạ quyền hoặc khóa Admin duy nhất. Ghi `StaffAuditLogs`. |
| `PATCH` | `/api/v1/admin/users/{id}/role` | Phân quyền vai trò | Đổi role sang `learner`, `teacher`, `content`, `support`, `admin`. Ngăn chặn hạ quyền của Admin hoạt động cuối cùng (400 Bad Request). Ghi `StaffAuditLogs`. |
| `PATCH` | `/api/v1/admin/users/{id}/status` | Đổi trạng thái | Chuyển trạng thái `active`, `suspended`, `disabled`. Ngăn chặn khóa Admin duy nhất. Tự động thu hồi toàn bộ Refresh Session khi tài khoản bị khóa. Ghi `StaffAuditLogs`. |
| `POST` | `/api/v1/admin/users/{id}/reset-password` | Đặt lại mật khẩu | Sinh mật khẩu tạm an toàn, băm Argon2id, cập nhật database, thu hồi toàn bộ phiên hoạt động của người dùng mục tiêu. Trả về mật khẩu tạm cho Admin gửi người dùng. Ghi `StaffAuditLogs`. |
| `POST` | `/api/v1/admin/users/{id}/revoke-sessions` | Thu hồi toàn bộ phiên | Thu hồi tức thời tất cả refresh token của người dùng trong SQL Server (`IsRevoked = true`). Buộc người dùng phải đăng nhập lại. Ghi `StaffAuditLogs`. |
| `DELETE` | `/api/v1/admin/users/{id}` | Xóa mềm tài khoản | Đánh dấu `IsDeleted = true`, `DeletedAt = UtcNow`, `Status = "disabled"`. Thu hồi mọi phiên hoạt động. Ngăn xóa Admin duy nhất. Tuyệt đối **không** xóa dữ liệu bài học (`LessonProgress`), bài thi (`AssessmentAttempt`), sự kiện (`LearningEvent`). Ghi `StaffAuditLogs`. |
| `GET` | `/api/v1/admin/audit-logs` | Lịch sử kiểm toán | Truy vấn danh sách nhật ký hành động nhân sự từ bảng `StaffAuditLogs` có phân trang. |

---

## 5. Quy tắc Nghiệp vụ & Bảo mật (RBAC & Invariants)

1. **Bảo vệ Admin duy nhất (Last Active Admin Protection)**:
   - Hệ thống đếm số lượng Admin hợp lệ (`Role == "admin" && Status == "active" && !IsDeleted`).
   - Nếu số lượng `<= 1`, hệ thống chặn đứng mọi hành động:
     - Hạ vai trò của Admin đó thành vai trò khác.
     - Đổi trạng thái của Admin đó thành `suspended` hoặc `disabled`.
     - Xóa mềm (Soft Delete) Admin đó.
   - Trả về mã lỗi `400 Bad Request` kèm thông điệp rõ ràng: `"Không thể thay đổi trạng thái hoặc xóa quản trị viên đang hoạt động duy nhất."`
2. **Bảo toàn lịch sử học tập (Learning History Invariance)**:
   - Khi xóa mềm người dùng, database **không** thực hiện `CASCADE DELETE` trên các bảng con:
     - `LessonProgresses`: Dữ liệu tiến độ học vẫn nguyên vẹn.
     - `AssessmentAttempts`: Kết quả điểm số bài kiểm tra được bảo tồn.
     - `LearningEvents`: Dấu vết phân tích hành vi học tập được lưu trữ phục vụ báo cáo.
3. **Thu hồi phiên làm việc tức thì (Session Revocation Invariant)**:
   - Mọi hành động nhạy cảm thực hiện trên người dùng (`status` chuyển `suspended`/`disabled`, `reset-password`, `revoke-sessions`, `DELETE`) ngay lập tức đánh dấu `IsRevoked = true` và `RevokedAt = UtcNow` cho toàn bộ bản ghi `RefreshSessions` liên quan trong SQL Server.
   - Token refresh không thể tiếp tục gia hạn phiên.
4. **Ngăn chặn truy cập của người dùng bị xóa**:
   - `AuthController.Login` chặn đăng nhập người dùng có `IsDeleted == true` (trả về `403 Forbidden`).
   - `AuthController.Refresh` từ chối cấp token mới nếu người dùng bị xóa (trả về `401 Unauthorized`).
   - `AuthController.Me` từ chối người dùng bị xóa (trả về `404 Not Found`).

---

## 6. Giao diện Quản trị Frontend (React 19)

Tuân thủ chặt chẽ phong cách thiết kế **Navy Notebook**:
- **Bảng màu chủ đạo**: Deep Navy (`#102A43`), Saffron Yellow (`#F4B942`), Light Cream (`#FFF9EA`), Trắng thẻ (`#FFFFFF`), Border xám thanh lịch (`#E2E8F0`).
- **Phân trang & Bộ lọc Phía Server**:
  - Tích hợp ô tìm kiếm email / họ tên với Debounce.
  - Dropdown lọc vai trò: Tất cả, Quản trị viên, Giáo viên, Học sinh, Nội dung, Hỗ trợ.
  - Dropdown lọc trạng thái: Tất cả, Đang hoạt động, Tạm khóa, Vô hiệu hóa.
  - Phân trang chuẩn: Điều hướng trang trước / trang sau, hiển thị tổng số kết quả thực từ SQL Server.
- **Hộp thoại Tương tác**:
  - `AdminUserFormDialog`: Tạo người dùng mới, tự sinh mật khẩu hoặc nhập mật khẩu ban đầu.
  - `AdminUserEditDialog`: Chỉnh sửa họ tên, khối lớp, vai trò, trạng thái.
  - `AdminResetPasswordDialog`: Tạo mật khẩu tạm ngẫu nhiên, nút sao chép 1-click tiện lợi.
  - Hộp thoại xác nhận an toàn (Confirmation Dialog) trước khi thực hiện xóa mềm hoặc khóa tài khoản.
- **Responsive & Mobile View**:
  - Hỗ trợ hoàn hảo trên màn hình Desktop rộng (1440px) dạng bảng dữ liệu chuyên nghiệp.
  - Chuyển đổi mượt mà sang dạng thẻ (Cards) trên màn hình thiết bị di động (390px iPhone 12/14) với đầy đủ action buttons.

---

## 7. Kết quả Kiểm thử & Đảm bảo Chất lượng

### 7.1. Backend .NET Tests
- **Số lượng**: 47/47 tests passed (100% pass rate).
  - 11 Unit Tests (`StudyAI.UnitTests`).
  - 36 Integration Tests (`StudyAI.IntegrationTests`) chạy trực tiếp trên SQL Server `StudyAIDb`.
  - Bộ kiểm thử mới `AdminUserManagementIntegrationTests` bao gồm 15 bài test chuyên sâu:
    - `GetUsers_AsAdmin_ReturnsPaginatedUsers`
    - `GetUsers_WithRoleFilter_ReturnsFilteredUsers`
    - `GetUsers_WithSearch_ReturnsMatchingUsers`
    - `GetUsers_AsLearner_Returns403Forbidden`
    - `CreateUser_ValidInput_CreatesUserAndHashesPassword`
    - `CreateUser_DuplicateEmail_Returns409Conflict`
    - `UpdateUser_ValidData_UpdatesUser`
    - `UpdateRole_SoleAdminDemote_Returns400BadRequest`
    - `UpdateStatus_ToSuspended_RevokesActiveSessions`
    - `UpdateStatus_SoleAdminDisable_Returns400BadRequest`
    - `ResetPassword_ValidUser_GeneratesTemporaryPasswordAndRevokesSessions`
    - `RevokeSessions_ValidUser_RevokesAllSessions`
    - `SoftDeleteUser_ValidUser_MarksDeletedAndPreservesLearningHistory`
    - `SoftDeleteUser_SoleAdmin_Returns400BadRequest`
    - `GetDashboard_ReturnsRealMetricsAndRecentActivity`

### 7.2. Frontend Tests & Code Quality
- **Linter**: `bun run oxlint` kiểm tra 388 files đạt **0 errors, 0 warnings**.
- **Vitest**: 45/45 test files passed (**356/356 tests passed**).
- **TypeScript & Bundle**: `bun run build` biên dịch thành công 0 lỗi trong ~800ms.

### 7.3. Playwright E2E Visual QA Suite
Toàn bộ kịch bản E2E Full-stack chạy trên Chrome với Backend ASP.NET Core và Vite Preview, lưu trữ 15 ảnh chụp màn hình tại `docs/visual-qa/phase-16/`:
1. `01_admin_login_page_desktop.png` - Màn hình đăng nhập quản trị viên.
2. `02_admin_dashboard_sql_metrics_desktop.png` - Dashboard với số liệu thực tế từ SQL Server.
3. `03_admin_users_list_sql_desktop.png` - Bảng người dùng với phân trang máy chủ và bộ lọc.
4. `04_add_user_dialog_desktop.png` - Mở hộp thoại thêm người dùng.
5. `05_add_user_form_filled_desktop.png` - Điền thông tin người dùng mới.
6. `06_user_created_success_toast_desktop.png` - Toast thông báo tạo tài khoản thành công.
7. `07_search_filtered_user_desktop.png` - Tìm kiếm và lọc người dùng vừa tạo trên SQL Server.
8. `08_edit_user_dialog_desktop.png` - Hộp thoại cập nhật thông tin người dùng.
9. `09_user_edited_success_desktop.png` - Cập nhật thông tin thành công.
10. `10_reset_password_dialog_desktop.png` - Hộp thoại xác nhận đặt lại mật khẩu.
11. `11_reset_password_temporary_result_desktop.png` - Hiển thị mật khẩu tạm thời kèm nút copy.
12. `12_soft_delete_confirmation_dialog_desktop.png` - Hộp thoại cảnh báo trước khi xóa mềm.
13. `13_soft_delete_success_toast_desktop.png` - Thông báo xóa mềm thành công và làm mới bảng.
14. `14_mobile_390px_admin_users_cards.png` - Giao diện danh sách dạng thẻ trên màn hình mobile 390px.
15. `15_mobile_390px_admin_dashboard.png` - Giao diện Dashboard tối ưu trên mobile 390px.

---

## 8. Sẵn sàng cho Phase 17 (Phase 17 Readiness)

Hệ thống Quản trị Người dùng & Phân quyền hoàn thiện đặt nền móng vững chắc cho **Phase 17 — Learning Content Management (Quản lý Khóa học, Bài học, Học phần và Ngân hàng Câu hỏi)**:
- Tài khoản với vai trò `teacher` và `content` đã được định danh và phân quyền chính xác qua hệ thống RBAC.
- Cơ chế bảo vệ toàn vẹn lịch sử học tập đã được chứng minh qua kiểm thử tự động, sẵn sàng liên kết với các module quản trị nội dung bài học mới.
