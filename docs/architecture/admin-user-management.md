# Kiến trúc Quản lý Người dùng Quản trị (Admin User Management Architecture)

## 1. Tổng quan Kiến trúc

Trong Phase 16, STUDY_AI hoàn thiện kiến trúc quản lý người dùng thực tế kết nối trực tiếp giữa **ASP.NET Core 10 Web API**, **Microsoft SQL Server (EF Core 10)** và giao diện **React 19 + TypeScript**:

```
[React 19 Client (Admin Dashboard & Users Page)]
   │
   ├── Bearer JWT Access Token (In-memory, Admin role claim)
   └── SameSite HttpOnly Cookie (study_ai_refresh_token)
   │
   ▼
[ASP.NET Core 10 Web API - AdminController]
   │ [Authorize(Roles = "admin")]
   ├── Input Validation & Sanitization (Display Name, Unique Normalized Email, Role/Status check)
   ├── Argon2id Password Hasher (IPasswordHasher)
   ├── Last Active Admin Protection Logic
   ├── Audit Logging Interceptor (StaffAuditLogs)
   │
   ▼
[Microsoft SQL Server (StudyAIDb)]
   ├── users (Id, Email, EmailNormalized, PasswordHash, DisplayName, Role, Status, IsDeleted, DeletedAt, CreatedAt, UpdatedAt)
   ├── refresh_sessions (UserId, TokenHash, ExpiresAt, RevokedAt)
   ├── staff_audit_logs (ActorUserId, Action, TargetType, TargetId, Payload, CreatedAt)
   └── (Preserved Invariants): lesson_progress, assessment_attempts, learning_events
```

---

## 2. Các Luồng Nghiệp vụ Chính (Core Operations)

### 2.1. Phân trang phía Server (Backend Pagination)
Thay vì tải toàn bộ danh sách tài khoản về client rồi phân trang giả (client-side slicing), API `GET /api/v1/admin/users` thực thi truy vấn trực tiếp trên SQL Server:
- `Skip((page - 1) * pageSize).Take(pageSize)`
- `CountAsync()` để trả về `total` và `totalPages` chính xác.
- Hỗ trợ sắp xếp đa thuộc tính (`sortBy`: `createdAt`, `displayName`, `email`, `role`, `status`; `sortOrder`: `asc`, `desc`).
- Hỗ trợ lọc theo `search` (tìm kiếm không phân biệt hoa thường trên `displayName`, `email`, `grade`, `id`), `role` và `status`.
- Mặc định loại bỏ các tài khoản đã xóa mềm (`IsDeleted == false`), trừ khi có tham số `includeDeleted=true`.

### 2.2. Khởi tạo Người dùng Thực tế (Create User)
- **Role Validation**: Chỉ cho phép các vai trò hợp lệ: `learner`, `teacher`, `content`, `support`, `admin`.
- **Status Validation**: `active`, `suspended`, `disabled`.
- **Email Uniqueness**: Kiểm tra `EmailNormalized`. Nếu trùng với tài khoản đang hoạt động, trả về mã `HTTP 409 Conflict`.
- **Cơ chế Mật khẩu An toàn**:
  - Nếu Admin nhập mật khẩu: Kiểm tra độ dài 8–128 ký tự.
  - Nếu Admin để trống: Hệ thống sinh mật khẩu ngẫu nhiên có độ dài 12 ký tự gồm chữ hoa, chữ thường, số và ký tự đặc biệt thông qua `RandomNumberGenerator`.
  - Mật khẩu được băm trực tiếp bằng **Argon2id** (64MB RAM, 3 iterations, 1 parallelism).
  - Không bao giờ lưu hay trả về mật khẩu gốc qua API hay nhật ký. Mật khẩu tạm được trả về duy nhất một lần trong payload `CreateUserResponseDto` để Admin bàn giao cho người dùng.

### 2.3. Cập nhật Thông tin (Edit User) & Concurrency
- Endpoint `PATCH /api/v1/admin/users/{id}` cho phép cập nhật: `displayName`, `grade`, `role`, `status`.
- Tuyệt đối cấm sửa trực tiếp qua API: `passwordHash`, `refreshTokens`, `auditLogs`, điểm số bài thi (`assessmentScores`).
- Khi cập nhật thành công, `UpdatedAt` được làm mới và một bản ghi `StaffAuditLog` được lưu lại cùng với snapshot dữ liệu trước và sau khi thay đổi.

### 2.4. Đặt lại Mật khẩu (Password Reset) & Thu hồi Phiên
- Khi Admin yêu cầu đặt lại mật khẩu cho một người dùng (`POST /api/v1/admin/users/{id}/reset-password`):
  1. Băm mật khẩu mới bằng Argon2id.
  2. Cập nhật `PasswordHash` và `UpdatedAt` của User.
  3. Lập tức **thu hồi toàn bộ các phiên đăng nhập (Refresh Sessions)** của người dùng đó trong bảng `refresh_sessions`.
  4. Ghi `StaffAuditLog` với action `password_reset_by_admin`.
  5. Trả về kết quả thành công và mật khẩu tạm để Admin cung cấp cho người dùng.

---

## 3. Kiến trúc Xóa Mềm (Soft Delete Architecture)

### 3.1. Thiết kế Schema
Thuộc tính được bổ sung vào entity `User`:
- `IsDeleted` (`bit NOT NULL DEFAULT 0`)
- `DeletedAt` (`datetimeoffset NULL`)
- Index: `IX_users_IsDeleted`

### 3.2. Sự khác biệt giữa Soft Delete và Suspended/Disabled
- **Suspended/Disabled**: Tài khoản bị tạm khóa hoặc ngừng dịch vụ tạm thời bởi quản trị viên. Dữ liệu tài khoản vẫn hiển thị trong danh sách người dùng quản trị để kích hoạt lại khi cần.
- **Soft Delete**: Tài khoản bị chấm dứt vĩnh viễn khỏi danh sách hoạt động.
  - Cờ `IsDeleted = true`, `DeletedAt = DateTimeOffset.UtcNow`, `Status = "disabled"`.
  - Không hiển thị trong danh sách người dùng mặc định.
  - Toàn bộ refresh sessions bị xóa lập tức.
  - Không thể đăng nhập (`AuthController.Login` trả về `HTTP 403`).
  - Không thể làm mới token (`AuthController.Refresh` trả về `HTTP 401`).
  - **Bảo lưu toàn vẹn dữ liệu học tập**: Toàn bộ `LessonProgress`, `AssessmentAttempt`, `AssessmentResponse`, `LearningEvent` và `StaffAuditLog` liên quan đến `userId` đều được giữ nguyên vẹn trong cơ sở dữ liệu.

---

## 4. Bảo vệ Quản trị viên Cuối cùng (Last Active Admin Protection)

Hệ thống cài đặt quy tắc an toàn bất biến (Invariant):
**Không bao giờ cho phép hệ thống rơi vào trạng thái không còn Quản trị viên hoạt động nào.**
Trước khi thực hiện các hành động nguy hiểm trên tài khoản có vai trò `admin`:
1. **Hạ quyền** (`role != "admin"`): Kiểm tra số lượng Admin hoạt động còn lại (`Role == "admin" && Status == "active" && !IsDeleted`). Nếu `<= 1`, lập tức từ chối và trả về `HTTP 400 BadRequest`: *"Không thể hủy quyền quản trị viên hoạt động duy nhất của hệ thống."*
2. **Khóa tài khoản** (`status is "suspended" or "disabled"`): Nếu `<= 1`, từ chối và trả về `HTTP 400 BadRequest`: *"Không thể tạm khóa hoặc vô hiệu hóa quản trị viên hoạt động duy nhất của hệ thống."*
3. **Xóa mềm** (`DELETE /users/{id}`): Nếu `<= 1`, từ chối và trả về `HTTP 400 BadRequest`: *"Không thể xóa quản trị viên hoạt động duy nhất của hệ thống."*
