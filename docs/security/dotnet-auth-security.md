# STUDY_AI — BẢO MẬT XÁC THỰC VÀ PHÂN QUYỀN TRÊN NỀN TẢNG ASP.NET CORE (.NET 10)

**Tài liệu**: Kiến trúc bảo mật định danh, phiên làm việc và phân quyền (Phase 14B)  
**Tác giả**: Senior Security Architect & ASP.NET Core Engineer  
**Hệ thống**: Backend STUDY_AI  

---

## 1. TỔNG QUAN KIẾN TRÚC BẢO MẬT

Hệ thống Backend STUDY_AI áp dụng mô hình bảo mật nhiều tầng (Defense-in-Depth) được xây dựng hoàn toàn trên nền tảng **ASP.NET Core (.NET 10)** kết hợp với **Microsoft SQL Server**:

```
                       ┌─────────────────────────┐
                       │  Frontend (React 19)    │
                       └────────────┬────────────┘
                                    │ HTTPS + HttpOnly Cookies + Bearer Token
                                    ▼
                       ┌─────────────────────────┐
                       │   CORS & HSTS Pipeline  │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  JWT Bearer Middleware  │ ◄── Validate Issuer/Audience/Lifetime/Key
                       └────────────┬────────────┘ ◄── Check Token Type ("access")
                                    │              ◄── Check Realtime Account Status (DB)
                                    ▼
                       ┌─────────────────────────┐
                       │ Policy Authorization    │ ◄── AdminOnly / StaffOnly / ContentStaff
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │ Application Controllers │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │  Argon2id + SHA-256     │
                       │  Data Persistence Layer │
                       └─────────────────────────┘
```

---

## 2. LƯU TRỮ VÀ XÁC MINH MẬT KHẨU (ARGON2ID)

Hệ thống sử dụng thuật toán **Argon2id** (giải nhất Password Hashing Competition - RFC 9106) thông qua thư viện `Konscious.Security.Cryptography.Argon2`, cung cấp khả năng kháng lại các cuộc tấn công GPU/ASIC và Side-Channel:

- **Salt**: 16 bytes tạo ngẫu nhiên bằng `RandomNumberGenerator.GetBytes()`.
- **Độ phức tạp**:
  - `MemorySize`: 65,536 KB (64 MB).
  - `Iterations` (Time cost): 3 vòng lặp.
  - `DegreeOfParallelism`: 4 luồng xử lý.
- **Định dạng lưu trữ**: Chuẩn định dạng chuỗi:  
  `$argon2id$v=19$m=65536,t=3,p=4$<base64_salt>$<base64_hash>`
- **Xác thực**: Phép so sánh Constant-time `CryptographicOperations.FixedTimeEquals()` ngăn chặn hoàn toàn tấn công phân tích thời gian (Timing Attacks).

---

## 3. CƠ CHẾ TOKEN KÉP (JWT ACCESS TOKEN & REFRESH TOKEN ROTATION)

### 3.1. Access Token (JWT Bearer)
- **Thời hạn sống**: 30 phút (`Jwt:AccessTokenExpireMinutes: 30`).
- **Thuật toán ký**: HMAC-SHA256 (`HmacSha256Signature`).
- **Khóa bí mật (`SecretKey`)**:
  - Bắt buộc tối thiểu 256 bits (32 bytes).
  - Khởi động ứng dụng kiểm tra nghiêm ngặt: Ném lỗi `InvalidOperationException` dừng khởi động nếu thiếu hoặc quá ngắn.
  - Chặn sử dụng các khóa mẫu development trên môi trường Production.
- **Claims chuẩn hóa**:
  - `sub`: User ID duy nhất (ví dụ: `usr_...`).
  - `email`: Địa chỉ email người dùng.
  - `role`: Vai trò người dùng (`admin`, `teacher`, `content`, `support`, `learner`).
  - `type`: Bắt buộc giá trị `"access"`.
  - `iss`: `"StudyAI.Api"`.
  - `aud`: `"StudyAI.Client"`.
- **Kiểm soát tức thời (Real-time Token Validation Event)**:
  - Sự kiện `OnTokenValidated` kiểm tra tính hợp lệ của claim `type == "access"`.
  - Truy vấn trực tiếp SQL Server: Nếu người dùng bị đổi trạng thái sang `suspended` hoặc `disabled`, token lập tức bị từ chối truy cập (401/403) ngay cả khi token JWT chưa hết hạn 30 phút.

### 3.2. Refresh Token Rotation & Lưu trữ Hash
- **Độ dài token**: 48 bytes ngẫu nhiên bảo mật cao được tạo bởi `RandomNumberGenerator`.
- **Vận chuyển an toàn**:
  - Token thô được gửi về trình duyệt thông qua **HttpOnly Cookie** (`study_ai_refresh_token`).
  - Cờ `HttpOnly = true` ngăn chặn hoàn toàn rủi ro bị đánh cắp qua tấn công XSS.
  - Cờ `SameSite = SameSiteMode.Lax` và `Secure = Request.IsHttps` bảo vệ khỏi CSRF.
- **Lưu trữ trên Cơ sở Dữ liệu**:
  - Server **tuyệt đối không lưu token thô** trong cơ sở dữ liệu.
  - Token thô được băm bằng SHA-256 (`HashRefreshToken`), và chỉ lưu chuỗi băm hex (`TokenHash`) trong bảng `RefreshSessions`.
- **Xoay vòng phiên (Token Rotation)**:
  - Mỗi khi thực hiện gọi `/api/v1/auth/refresh`, session hiện tại được đánh dấu thu hồi (`RevokedAt = UtcNow`) và một token hoàn toàn mới được sinh ra và cấp phát.

### 3.3. Cơ chế Phát hiện Tái sử dụng Refresh Token (RFC 6819 Reuse Detection)
Theo khuyến nghị bảo mật OAuth 2.0 Threat Model (RFC 6819 mục 5.2.2.3):
- Nếu một client gửi lên một refresh token mà session tương ứng đã bị thu hồi trước đó (`RevokedAt != null`):
  - Đây là dấu hiệu nghi vấn token cũ đã bị kẻ tấn công đánh chặn và gửi lại.
  - Hệ thống tự động kích hoạt chế độ tự vệ: **Thu hồi toàn bộ (Revoke All) các phiên đăng nhập đang hoạt động của người dùng đó**.
  - Xóa cookie trên trình duyệt và trả về mã lỗi 401 Unauthorized kèm cảnh báo an ninh.

---

## 4. QUẢN TRỊ ADMIN VÀ AN TOÀN CREDENTIALS

### 4.1. Không Hardcode Credentials
- Đã loại bỏ hoàn toàn các tài khoản mặc định và mật khẩu hardcoded (`Admin@123456`, `Learner@123456`) trong `DbInitializer.cs`.
- Hàm `SeedReferenceDataAsync` chỉ nạp các danh mục môn học và bài học mẫu phục vụ chương trình GDPT 2018 (Toán 12).

### 4.2. CLI Bootstrap Quản Trị Viên An Toàn
Khởi tạo tài khoản quản trị hệ thống ban đầu thông qua CLI hoặc biến môi trường:
```bash
# Cung cấp biến môi trường hoặc tham số lệnh
export ADMIN_BOOTSTRAP_EMAIL="admin@studyai.internal"
export ADMIN_BOOTSTRAP_PASSWORD="MyStrongSecretPassword!2026"

# Thực thi lệnh bootstrap
dotnet run --project src/StudyAI.Api -- --bootstrap-admin
```
- **Xác thực độ mạnh mật khẩu**:
  - Chiều dài tối thiểu 10 ký tự.
  - Chứa ít nhất một chữ in hoa, một chữ in thường, và một chữ số.
- **Tính lũy đẳng (Idempotent)**:
  - Nếu đã tồn tại admin, lệnh sẽ báo thông tin an toàn và không tạo trùng lặp hoặc ghi đè mật khẩu.
- **Bảo mật nhật ký**:
  - Không bao giờ in hoặc log mật khẩu ra stdout, stderr hay file log.

---

## 5. BẢO VỆ TÀI KHOẢN ADMIN DUY NHẤT (LAST ACTIVE ADMIN PROTECTION)

Trong `AdminController`:
- Khi có yêu cầu thay đổi phân quyền (`PATCH /api/v1/admin/users/{userId}/role`) hoặc khóa tài khoản (`PATCH /api/v1/admin/users/{userId}/status`), hệ thống kiểm tra số lượng admin hoạt động còn lại (`Status == "active"` và `Role == "admin"`).
- Nếu chỉ còn đúng 1 admin duy nhất, thao tác giáng cấp hoặc vô hiệu hóa admin đó sẽ bị từ chối với mã lỗi 400 Bad Request:
  > *"Không thể thay đổi vai trò của quản trị viên duy nhất trong hệ thống."*

---

## 6. MA TRẬN BẰNG CHỨNG KIỂM THỬ TỰ ĐỘNG

| Tên bài test | Phân loại | Mục đích kiểm tra | Kết quả |
|---|---|---|---|
| `GenerateAccessToken_ShouldReturnNonEmptyTokenAndCorrectExpiration` | Unit Test | Kiểm tra cấu trúc JWT và thời hạn | **PASS** |
| `GenerateRefreshToken_ShouldReturnUniqueOpaqueTokens` | Unit Test | Kiểm tra tính ngẫu nhiên của 48 bytes token | **PASS** |
| `HashRefreshToken_ShouldBeDeterministicSha256` | Unit Test | Kiểm tra SHA-256 hash chuẩn hóa | **PASS** |
| `JwtTokenService_WithMissingOrShortSecret_ThrowsInvalidOperationException` | Unit Test | Kiểm tra Fail Fast khi secret yếu/thiếu | **PASS** |
| `HashPassword_ShouldReturnValidArgon2String` | Unit Test | Kiểm tra mã hóa Argon2id | **PASS** |
| `VerifyPassword_WithCorrectPassword_ShouldReturnTrue` | Unit Test | Kiểm tra đối soát mật khẩu đúng | **PASS** |
| `VerifyPassword_WithWrongPassword_ShouldReturnFalse` | Unit Test | Chặn mật khẩu sai | **PASS** |
| `Register_Login_GetMe_Lifecycle_Succeeds` | Integration Test | Vòng đời xác thực đầy đủ | **PASS** |
| `AdminProtection_CannotDemoteLastActiveAdmin` | Integration Test | Bảo vệ admin hoạt động duy nhất | **PASS** |
| `RefreshToken_ReuseDetection_RevokesAllSessions` | Integration Test | Phát hiện tái sử dụng token theo RFC 6819 | **PASS** |
| `BootstrapAdmin_WithInvalidPassword_FailsValidation` | Integration Test | Kiểm tra chính sách mật khẩu Admin Bootstrap | **PASS** |
| `SuspendedUser_CannotAccessProtectedEndpoints` | Integration Test | Chặn người dùng suspended đăng nhập và gọi API | **PASS** |
