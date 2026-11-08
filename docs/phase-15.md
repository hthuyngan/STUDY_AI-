# Phase 15: Hoàn thiện Authentication, Quản lý Phiên & RBAC (ASP.NET Core 10 + SQL Server + React 19)

## 1. Tổng quan & Mục tiêu

Phase 15 hoàn thiện toàn diện hệ thống Authentication, Session Management và Role-Based Access Control (RBAC) trên nền tảng:
- **Backend**: ASP.NET Core 10 (.NET 10.0.403), Entity Framework Core 10, Microsoft SQL Server LocalDB/Express (`StudyAIDb`).
- **Frontend**: React 19, TypeScript, Vite, Bun runtime.
- **Security Standard**: Dual-token architecture (Access Token trong bộ nhớ + HttpOnly SameSite Cookie Refresh Token), Argon2id password hashing, Brute-force rate limiting (HTTP 429 sau 5 lần thử thất bại), Audit logging cho nhân sự, RFC 6819 Refresh Token Rotation & Reuse Detection.

---

## 2. Bảng kiểm toán thành phần Auth (Audit Matrix)

| Thành phần | Loại | Trạng thái | Ghi chú hoàn thiện Phase 15 |
| :--- | :--- | :--- | :--- |
| `AuthController.Register` | Backend API | **WORKING** | Khóa cứng role `learner`, kiểm tra độ dài mật khẩu (8-128 ký tự), bắt buộc tên hiển thị, mã hóa Argon2id. |
| `AuthController.Login` | Backend API | **WORKING** | Xác thực Argon2id, kiểm tra tài khoản `disabled/suspended`, rate limiter chống brute-force (5 lần sai -> khóa 5 phút, trả HTTP 429), ghi audit log cho staff/admin. |
| `AuthController.Refresh` | Backend API | **WORKING** | Đọc token từ cookie HttpOnly `study_ai_refresh_token`, quay vòng (rotation) token, phát hiện reuse và thu hồi toàn bộ phiên nếu phát hiện tấn công. |
| `AuthController.Logout` | Backend API | **WORKING** | Thu hồi refresh token trong SQL Server, xóa cookie HttpOnly, ghi audit log cho staff. |
| `AuthController.Me` | Backend API | **WORKING** | Lấy danh tính người dùng hiện tại từ JWT Claims và Database, trả về `id`, `email`, `displayName`, `role`, `status`, `grade`. Không trả password hash. |
| `Argon2PasswordHasher` | Backend Service | **WORKING** | Thuật toán Argon2id với salt ngẫu nhiên 16 bytes, memory 64MB, iterations 3, parallelism 1. |
| `JwtTokenService` | Backend Service | **WORKING** | Ký access token HMAC-SHA256, thời hạn 30 phút, claims định danh chuẩn (`sub`, `email`, `role`, `jti`). |
| `Authorization Policies` | Backend Policy | **WORKING** | Chính sách `AdminOnly`, `StaffOnly`, `ContentStaff`. Learner tự cô lập dữ liệu cá nhân (`CurrentUserId == targetUserId`). |
| `AdminController` | Backend API | **WORKING** | Bảo vệ nghiêm ngặt, chặn Learner truy cập (HTTP 403 Forbidden). Bảo vệ không cho tự khóa hoặc hạ quyền Admin cuối cùng. |
| `AuthProvider` / `AuthContext` | Frontend State | **WORKING** | Lưu access token trong memory (closure state), không bao giờ ghi vào `localStorage` hay `sessionStorage`. |
| `auth.service.ts` | Frontend Service | **WORKING** | Gọi API với credentials mang cookie, tự động khôi phục phiên bằng `/refresh` khi tải trang / F5. |
| `RoleGuard` & `ProtectedRoute` | Frontend UX Guard | **WORKING** | Định tuyến an toàn theo Role, chuyển hướng về `/login` hoặc hiển thị thông báo không có quyền nếu truy cập trái phép. |
| `Login` & `Register` Pages | Frontend UI | **WORKING** | Đầy đủ thông báo tiếng Việt, validation thời gian thực, loading state, xử lý responsive hoàn hảo từ Mobile 390px đến Desktop 1440px. |

---

## 3. Kiến trúc Bảo mật & Quản lý Phiên

### 3.1. Dual-Token Architecture
```
[Client (React 19)]
   │
   ├── In-Memory: accessToken (30m) ──► Authorization: Bearer <token> ──► [ASP.NET Core Web API]
   │                                                                         │
   └── Browser Cookie Jar:          ──► Cookie: study_ai_refresh_token ──►   │
       (HttpOnly, Secure, SameSite)                                          ▼
                                                                     [SQL Server RefreshSessions]
```
- **Access Token**: Lưu trữ độc quyền trong biến JavaScript in-memory bên trong `AuthProvider`. Tuyệt đối không lưu vào Web Storage (`localStorage`/`sessionStorage`), loại bỏ hoàn toàn nguy cơ rò rỉ token qua tấn công XSS.
- **Refresh Token**: Lưu trữ trong cookie `study_ai_refresh_token` với cờ `HttpOnly`, `Secure` (khi chạy HTTPS) và `SameSite=Lax`. Client JavaScript không thể đọc được cookie này.

### 3.2. Chống Brute-force & Khóa tài khoản (HTTP 429)
- Tại `AuthController`, cơ chế in-memory concurrent tracking theo dõi số lần đăng nhập thất bại liên tiếp theo email.
- Sau 5 lần nhập sai mật khẩu, tài khoản bị tạm khóa 5 phút. Mọi request tiếp theo bị từ chối ngay lập tức với mã `HTTP 429 Too Many Requests` và header kèm thời gian mở khóa.
- Đăng nhập thành công sẽ xóa bộ đếm thất bại.

### 3.3. Thu hồi phiên & Phát hiện Reuse (RFC 6819)
- Khi gọi `/refresh`, token cũ được đánh dấu `IsRevoked = true` và `ReplacedByTokenId` được cập nhật liên kết sang token mới.
- Nếu một refresh token đã bị thu hồi được sử dụng lại, hệ thống nhận diện đây là hành vi chiếm đoạt phiên (token theft / replay attack) và lập tức thu hồi toàn bộ các phiên hoạt động còn lại của người dùng đó.

---

## 4. RBAC & Chính sách Phân quyền

1. **Learner (Học sinh)**:
   - Tự do đăng ký, làm bài kiểm tra, xem kết quả và lộ trình học cá nhân.
   - Bị backend cô lập dữ liệu: chỉ được xem/sửa dữ liệu khi `CurrentUserId == routeUserId`. Mọi nỗ lực truy cập dữ liệu học sinh khác hoặc gọi endpoint `/api/v1/admin/*` đều nhận `HTTP 403 Forbidden`.
2. **Staff (Admin, Teacher, Content, Support)**:
   - Các vai trò nhân sự được quản lý tập trung và phân định rõ ràng.
   - Endpoint nhân sự được bảo vệ bởi policy `StaffOnly` (`admin`, `teacher`, `content`, `support`).
3. **Admin**:
   - Truy cập dashboard quản trị, quản lý người dùng.
   - Backend chặn đứng hành vi tự hạ quyền hoặc vô hiệu hóa tài khoản Admin hoạt động cuối cùng của hệ thống.
4. **Teacher / Support (Các tính năng nâng cao)**:
   - Được bảo lưu và đánh dấu `DEFERRED` chuyển giao cho Phase 16 mở rộng giao diện quản trị và phân quyền chi tiết.

---

## 5. Kết quả Kiểm thử Toàn diện

### 5.1. .NET Unit & Integration Tests (100% Passed)
Tổng cộng **32 bài test** thành công trên cơ sở dữ liệu SQL Server:
- `11 Unit Tests`: Kiểm tra xác thực mật khẩu Argon2id, ký và giải mã JWT token, policy context.
- `21 Integration Tests`: Bao gồm 11 tests chức năng cơ bản và 10 tests bảo mật tiêu cực (Security Negative Tests):
  - `Login_WithWrongPassword_ReturnsUnauthorized` (401)
  - `Login_WithNonExistentEmail_ReturnsUnauthorized` (401)
  - `Register_WithDuplicateEmail_ReturnsConflict` (409)
  - `Register_WithMissingDisplayName_ReturnsBadRequest` (400)
  - `Learner_AccessingAdminDashboard_ReturnsForbidden` (403)
  - `Learner_AccessingAnotherLearnerProgress_ReturnsForbidden` (403)
  - `ProtectedEndpoint_WithForgedToken_ReturnsUnauthorized` (401)
  - `RefreshToken_WithoutCookie_ReturnsUnauthorized` (401)
  - `Login_WithDisabledAccount_ReturnsForbidden` (403)
  - `Login_BruteForceProtection_LocksAccountAfterConsecutiveFailures` (429)

### 5.2. Frontend Tests & Code Quality
- **Vitest**: `356 passed` (45 test files, 100% passed).
- **Oxlint**: `0 errors, 0 warnings` trên toàn bộ 386 tệp nguồn.
- **Vite Build**: Production bundle hoàn thành trong 929ms, không có lỗi TypeScript hay cú pháp.

### 5.3. Playwright E2E Suite & Bằng chứng Visual QA
Hệ thống kiểm thử Playwright tự động chạy trên môi trường thực tế (ASP.NET Core Web API .NET 10 + React 19 Preview Server):
- Kịch bản 1: Đăng ký tài khoản thực (`01_real_registration_form_desktop.png`, `02_registration_success_dashboard_desktop.png`).
- Kịch bản 2: Đăng nhập thực tế (`03_login_form_real_desktop.png`, `04_login_success_desktop.png`).
- Kịch bản 3: Duy trì phiên qua tải lại trang bằng HttpOnly Cookie (`05_session_reload_persisted_desktop.png`).
- Kịch bản 4: Điều hướng khu vực học tập có bảo vệ (`06_protected_route_practice_desktop.png`).
- Kịch bản 5: Chặn học sinh vào trang admin và xác nhận HTTP 403 Forbidden (`07_admin_forbidden_unauthorized_desktop.png`).
- Kịch bản 6: Từ chối đăng nhập tài khoản bị khóa/vô hiệu hóa (`08_account_disabled_error_desktop.png`).
- Kịch bản 7: Đăng xuất và thu hồi phiên (`09_logout_session_revoked_desktop.png`).
- Kịch bản 8: Xử lý ngoại lệ mượt mà khi Backend mất kết nối (`10_backend_offline_graceful_desktop.png`).
- Kịch bản 9-10: Giao diện di động responsive trên viewport 390px (`11_mobile_390px_login_form.png`, `12_mobile_390px_registration_form.png`, `13_mobile_390px_dashboard.png`).

Toàn bộ ảnh chụp màn hình được lưu trữ tại `docs/visual-qa/phase-15/`.

---

## 6. Tài liệu Kỹ thuật Đi kèm
1. `docs/security/authentication-flow.md`: Đặc tả chi tiết luồng đăng ký, đăng nhập, cấp phát token và phục hồi phiên.
2. `docs/security/session-management.md`: Cơ chế quản lý phiên HttpOnly cookie, rotation token và phát hiện tấn công giả mạo token.
3. `docs/security/rbac-matrix.md`: Ma trận phân quyền chi tiết giữa các vai trò Learner, Admin, Teacher, Content, Support.
4. `docs/architecture/auth-api-contract.md`: Hợp đồng API chuẩn hóa của toàn bộ các endpoints thuộc nhóm Authentication & Authorization.
