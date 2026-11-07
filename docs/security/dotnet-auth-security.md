# STUDY_AI — BẢO MẬT XÁC THỰC VÀ PHÂN QUYỀN TRÊN NỀN TẢNG ASP.NET CORE (.NET 10)

**Tài liệu**: Kiến trúc bảo mật định danh, phiên làm việc và phân quyền (Phase 14B Final Hardening)  
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
- Hàm `SeedReferenceDataAsync` chỉ nạp các danh mục môn học và bài học mẫu phục vụ chương trình GDPT 2018 (Toán 12), không tạo người dùng.
- Đã xóa hoàn toàn logic tự động tạo Admin khi ứng dụng khởi động.

### 4.2. CLI Bootstrap Quản Trị Viên An Toàn (`--bootstrap-admin`)
- Lệnh `--bootstrap-admin` chỉ được chạy thủ công có chủ đích từ CLI.
- **Quy tắc bảo mật mật khẩu CLI**:
  - **Nghiêm cấm** nhận mật khẩu qua tham số dòng lệnh (`--admin-password`) vì tham số dòng lệnh sẽ lưu lại trong bảng tiến trình hệ điều hành (`ps`, `Get-Process`, Task Manager, `/proc`), gây lộ mật khẩu cho các tiến trình khác.
  - Ứng dụng sẽ chặn đứng và thoát với exit code 1 ngay lập tức nếu phát hiện tham số `--admin-password`.
  - Mật khẩu chỉ được nhận qua biến môi trường bảo mật `ADMIN_BOOTSTRAP_PASSWORD` hoặc nhập ẩn ký tự (masked input) qua console tương tác.
- **Xác thực độ mạnh mật khẩu**:
  - Chiều dài tối thiểu 10 ký tự.
  - Chứa ít nhất một chữ in hoa, một chữ in thường, và một chữ số.
- **Tính lũy đẳng (Idempotent)**:
  - Nếu đã tồn tại admin với email đó, lệnh báo thông tin an toàn (exit code 0) và không tạo trùng lặp hoặc thay đổi mật khẩu.
- **Bảo mật nhật ký**:
  - Không bao giờ in hoặc log mật khẩu ra stdout, stderr hay file log.

---

## 5. DỪNG KHỞI ĐỘNG KHI CƠ SỞ DỮ LIỆU LỖI (FAIL-FAST DATABASE POLICY)

Trong `Program.cs`, khối khởi tạo và migration cơ sở dữ liệu tuân thủ nguyên tắc Fail-Fast:
- Nếu quá trình `Database.MigrateAsync()` hoặc `SeedReferenceDataAsync()` gặp lỗi (không kết nối được SQL Server, lỗi migration, timeout):
  - Ứng dụng ghi nhật ký nghiêm trọng: `logger.LogCritical(...)`.
  - In thông báo lỗi ra `Console.Error`.
  - Lập tức dừng tiến trình với mã lỗi `Environment.Exit(1)`.
  - Đảm bảo ứng dụng không bao giờ chạy ở trạng thái nửa vời (unhealthy state) trong môi trường Production.

---

## 6. BẢO MẬT CI/CD (EPHEMERAL SECRETS TRONG GITHUB ACTIONS)

Trong file `.github/workflows/ci.yml`:
- **Loại bỏ hoàn toàn mật khẩu tĩnh**: Không lưu bất kỳ mật khẩu SQL Server hardcoded nào trong tệp cấu hình YAML.
- **Tạo mật khẩu tạm thời ngẫu nhiên**: Mỗi lần CI workflow chạy, một mật khẩu SA và JWT secret ngẫu nhiên bảo mật cao (cryptographically random) được sinh động bằng `openssl`.
- **Cơ chế ẩn danh (Masking)**: Các giá trị này được đăng ký thông qua `echo "::add-mask::$SECRET"` đảm bảo GitHub Actions tự động ẩn hoàn toàn giá trị này khỏi toàn bộ nhật ký thực thi (log output).
- **Kiểm tra sức khỏe SQL Server**: Sử dụng vòng lặp kiểm tra sức khỏe chính thức thông qua `sqlcmd` trước khi cho phép tiến trình kiểm thử bắt đầu.

---

## 7. BIỆN PHÁP XỬ LÝ CÁC TÀI KHOẢN MẪU CŨ TRÊN CƠ SỞ DỮ LIỆU

Đối với các database đã được khởi tạo trong các giai đoạn phát triển trước, nếu còn tồn tại tài khoản `admin@studyai.internal` hoặc `learner@studyai.internal`:
1. **Trên môi trường Production / Staging**:
   - Bắt buộc chạy câu lệnh SQL để vô hiệu hóa tài khoản mẫu cũ:
     ```sql
     UPDATE users 
     SET Status = 'disabled', UpdatedAt = SYSDATETIMEOFFSET() 
     WHERE Email IN ('admin@studyai.internal', 'learner@studyai.internal');
     ```
   - Khởi tạo tài khoản quản trị viên thật bằng lệnh CLI an toàn:
     ```powershell
     $env:ADMIN_BOOTSTRAP_EMAIL = "real.admin@school.edu.vn"
     $env:ADMIN_BOOTSTRAP_PASSWORD = "<Secret-Unique-Admin-Password>"
     dotnet run --project src/StudyAI.Api -- --bootstrap-admin
     Remove-Item Env:\ADMIN_BOOTSTRAP_PASSWORD
     ```
2. **Trên môi trường Kiểm thử Tự động (Integration Tests)**:
   - Các tài khoản thử nghiệm được khởi tạo riêng biệt trong fixture `StudyAIApiFixture` phục vụ kiểm thử khép kín.

---

## 8. MA TRẬN BẰNG CHỨNG KIỂM THỬ TỰ ĐỘNG (22 TESTS PASSED)

| Tên bài test | Phân loại | Mục đích kiểm tra | Kết quả |
|---|---|---|---|
| `GenerateAccessToken_ShouldReturnNonEmptyTokenAndCorrectExpiration` | Unit Test | Kiểm tra cấu trúc JWT và thời hạn | **PASS** |
| `GenerateRefreshToken_ShouldReturnUniqueOpaqueTokens` | Unit Test | Kiểm tra tính ngẫu nhiên của 48 bytes token | **PASS** |
| `HashRefreshToken_ShouldBeDeterministicSha256` | Unit Test | Kiểm tra SHA-256 hash chuẩn hóa | **PASS** |
| `JwtTokenService_WithMissingOrShortSecret_ThrowsInvalidOperationException` | Unit Test | Kiểm tra Fail Fast khi secret yếu/thiếu (4 cases) | **PASS** |
| `HashPassword_ShouldReturnValidArgon2String` | Unit Test | Kiểm tra mã hóa Argon2id | **PASS** |
| `VerifyPassword_WithCorrectPassword_ShouldReturnTrue` | Unit Test | Kiểm tra đối soát mật khẩu đúng | **PASS** |
| `VerifyPassword_WithWrongPassword_ShouldReturnFalse` | Unit Test | Chặn mật khẩu sai | **PASS** |
| `VerifyPassword_WithEmptyOrNull_ShouldReturnFalse` | Unit Test | Chặn mật khẩu rỗng | **PASS** |
| `Register_Login_GetMe_Lifecycle_Succeeds` | Integration Test | Vòng đời xác thực đầy đủ | **PASS** |
| `AdminProtection_CannotDemoteLastActiveAdmin` | Integration Test | Bảo vệ admin hoạt động duy nhất | **PASS** |
| `RefreshToken_ReuseDetection_RevokesAllSessions` | Integration Test | Phát hiện tái sử dụng token theo RFC 6819 | **PASS** |
| `BootstrapAdmin_WithInvalidPassword_FailsValidation` | Integration Test | Kiểm tra chính sách mật khẩu Admin Bootstrap | **PASS** |
| `BootstrapAdmin_WhenAlreadyExists_IsIdempotent` | Integration Test | Kiểm tra tính lũy đẳng không tạo trùng admin | **PASS** |
| `SuspendedUser_CannotAccessProtectedEndpoints` | Integration Test | Chặn người dùng suspended đăng nhập và gọi API | **PASS** |
| `PutAndGetLessonProgress_Succeeds` | Integration Test | Kiểm tra lưu và lấy tiến độ học tập trên SQL Server | **PASS** |
| `PostAssessmentAttempt_Succeeds` | Integration Test | Kiểm tra nộp bài thi và lưu điểm trên SQL Server | **PASS** |
| `GetHealth_ReturnsHealthyStatus` | Integration Test | Kiểm tra endpoint `/health` | **PASS** |
| `GetHealthDb_ReturnsHealthyDatabase` | Integration Test | Kiểm tra kết nối SQL Server qua `/health/db` | **PASS** |
| `ApiHealth_V1_ReturnsHealthy` | Integration Test | Kiểm tra endpoint `/api/v1/health` | **PASS** |
