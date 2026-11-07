# STUDY_AI — BÁO CÁO KIỂM TOÁN VÀ DỌN DẸP MÃ NGUỒN LEGACY (PHASE 14B)

**Dự án**: STUDY_AI  
**Mục tiêu**: Kiểm toán chi tiết toàn bộ các thành phần backend Python/FastAPI cũ trước khi dọn dẹp, đảm bảo chuyển dịch hoàn toàn và an toàn sang ASP.NET Core (.NET 10) + Microsoft SQL Server.  
**Ngày thực hiện**: 07/11/2026  
**Commit tham chiếu**: `f58471e`  
**Trạng thái**: PHÊ DUYỆT THỰC HIỆN DỌN DẸP (APPROVED)

---

## 1. NGUYÊN TẮC AN TOÀN BẮT BUỘC

Trước khi thực hiện bất kỳ thao tác xóa nào, toàn bộ các quy tắc an toàn sau đã được kiểm tra và tuân thủ tuyệt đối:

| Quy tắc an toàn | Trạng thái | Ghi chú kiểm tra |
|---|---|---|
| Không xóa file có thay đổi chưa commit | **ĐẠT** | `git status` sạch, working tree clean trên nhánh `main`. |
| Không xóa hoặc làm hỏng dữ liệu SQL Server | **ĐẠT** | Giữ nguyên instance `MSSQL$SQLEXPRESS`, database `StudyAIDb`. Không drop database/table. |
| Không xóa EF Core Migrations | **ĐẠT** | Giữ nguyên migration `20261107094945_InitialSqlServerCreate.cs` và snapshot. |
| Không xóa hoặc thay đổi logic Frontend đang chạy | **ĐẠT** | Toàn bộ thư mục `frontend/` được bảo tồn 100%. |
| Không xóa tài liệu lịch sử các Phase trước | **ĐẠT** | Giữ nguyên toàn bộ `docs/phase-*.md`, `docs/visual-qa/`, `docs/reports/`. |
| Không force push | **ĐẠT** | Toàn bộ commits tuân thủ fast-forward hoặc rebase tiêu chuẩn. |

---

## 2. DANH MỤC KIỂM TOÁN TỪNG FILE & THƯ MỤC BACKEND LEGACY

Toàn bộ các file được rà soát đối chiếu giữa kiến trúc Python cũ và ASP.NET Core mới:

| Đường dẫn file / thư mục | Loại thành phần | Quyết định | Thành phần thay thế trong .NET | Lý do |
|---|---|---|---|---|
| `backend/app/main.py` | FastAPI Entrypoint | **DELETE** | `backend/src/StudyAI.Api/Program.cs` | Đã chuyển toàn bộ pipeline sang ASP.NET Core Web API. |
| `backend/app/config.py` | Pydantic Settings | **DELETE** | `backend/src/StudyAI.Api/appsettings.json` | Cấu hình chuyển sang ASP.NET Core Options/Configuration. |
| `backend/app/database.py` | SQLAlchemy Session | **DELETE** | `backend/src/StudyAI.Infrastructure/Persistence/StudyAIDbContext.cs` | EF Core DbContext thay thế toàn bộ SQLAlchemy. |
| `backend/app/api/auth.py` | FastAPI Auth Routes | **DELETE** | `backend/src/StudyAI.Api/Controllers/AuthController.cs` | Đầy đủ register, login, refresh, logout, me. |
| `backend/app/api/me.py` | FastAPI Me Routes | **DELETE** | `backend/src/StudyAI.Api/Controllers/MeController.cs` | Đầy đủ progress, attempts, events, bootstrap sync. |
| `backend/app/api/health.py` | Health Check Routes | **DELETE** | `backend/src/StudyAI.Api/Controllers/HealthController.cs` | Đầy đủ `/health`, `/api/v1/health`, `/health/db`. |
| `backend/app/api/admin.py` | Admin Management | **DELETE** | `backend/src/StudyAI.Api/Controllers/AdminController.cs` | Quản lý user status, role, audit logs, system stats. |
| `backend/app/api/content.py` | Content Routes | **DELETE** | `backend/src/StudyAI.Api/Controllers/ContentController.cs` | Subjects, chapters, lessons CRUD & moderation workflow. |
| `backend/app/api/learning_progress.py` | Progress Routes | **DELETE** | `backend/src/StudyAI.Api/Controllers/LearningDataControllers.cs` | User progress persistence & bulk retrieval. |
| `backend/app/api/assessment_attempts.py` | Assessment Routes | **DELETE** | `backend/src/StudyAI.Api/Controllers/LearningDataControllers.cs` | Attempts & responses submission with grading. |
| `backend/app/api/learning_events.py` | Events Routes | **DELETE** | `backend/src/StudyAI.Api/Controllers/LearningDataControllers.cs` | Learning event telemetry ingestion. |
| `backend/app/api/sync.py` | Sync Routes | **DELETE** | `backend/src/StudyAI.Api/Controllers/MeController.cs` | Hỗ trợ sync bootstrap và synchronization endpoint. |
| `backend/app/api/deps.py` | FastAPI Depends | **DELETE** | ASP.NET Core `[Authorize]`, Policies & DI | Tích hợp sẵn trong ASP.NET Core Authentication/Authorization. |
| `backend/app/core/security.py` | Password & JWT | **DELETE** | `Argon2PasswordHasher.cs`, `JwtTokenService.cs` | Triển khai chuẩn C# với Argon2id và `System.IdentityModel.Tokens.Jwt`. |
| `backend/app/models/*.py` (10 files) | SQLAlchemy Models | **DELETE** | `backend/src/StudyAI.Domain/Entities/*.cs` | Entity classes độc lập tầng Domain với kiểu dữ liệu mạnh. |
| `backend/app/schemas/*.py` (7 files) | Pydantic Schemas | **DELETE** | `backend/src/StudyAI.Application/DTOs/*.cs` | C# DTOs có validation và serialisation tối ưu. |
| `backend/app/services/*.py` (6 files) | Business Services | **DELETE** | `StudyAI.Application` & Controllers | Toàn bộ business logic được tích hợp vào Clean Architecture .NET. |
| `backend/app/scripts/seed_staff.py` | Python Seeder | **DELETE** | `backend/src/StudyAI.Infrastructure/Persistence/DbInitializer.cs` | `DbInitializer.cs` hỗ trợ `SeedReferenceDataAsync` & `BootstrapAdminAsync`. |
| `backend/alembic/` (toàn bộ 6 files) | Alembic Migrations | **DELETE** | `backend/src/StudyAI.Infrastructure/Migrations/` | EF Core Migrations (`InitialSqlServerCreate`) thay thế Alembic. |
| `backend/alembic.ini` | Alembic Config | **DELETE** | Không cần | EF Core không dùng file ini. |
| `backend/pyproject.toml` | Python Tooling | **DELETE** | `backend/StudyAI.sln` | Dự án chuyển hoàn toàn sang .NET Solution. |
| `backend/scripts/bootstrap_admin.py` | Legacy CLI Script | **DELETE** | CLI `dotnet run --project src/StudyAI.Api -- --bootstrap-admin` | Tích hợp trực tiếp vào executable API. |
| `backend/tests/conftest.py` & `test_*.py` (10 files) | Pytest Suite | **DELETE** | `StudyAI.UnitTests` & `StudyAI.IntegrationTests` | 21 test xUnit C# chạy tự động trên .NET 10. |
| `backend/.env.example` | Mẫu cấu hình Env | **KEEP** | `backend/.env.example` | Giữ lại làm mẫu cấu hình môi trường chuẩn. |
| `backend/README.md` | Tài liệu Backend | **KEEP** | Cập nhật sang .NET hướng dẫn | Cập nhật hướng dẫn chạy .NET Web API và SQL Server. |
| `backend/StudyAI.sln` & `src/`, `tests/` | Mã nguồn .NET | **KEEP** | Bộ mã nguồn chính thức | Core stack duy nhất cho backend StudyAI. |

---

## 3. ĐỐI CHIẾU API PARITY (FASTAPI VS ASP.NET CORE)

Toàn bộ các API endpoints của Frontend STUDY_AI đều đạt tỷ lệ đối ứng 100%:

| Phân hệ API | Method | Endpoint | Tình trạng FastAPI | Tình trạng ASP.NET Core | Ghi chú tương thích |
|---|---|---|---|---|---|
| **Health** | GET | `/health` | Hoạt động | `HealthController` | Trả về status 200, system time, version. |
| **Health** | GET | `/api/v1/health` | Hoạt động | `HealthController` | Parity alias. |
| **Health** | GET | `/api/v1/health/db` | Hoạt động | `HealthController` | Kiểm tra kết nối SQL Server thực tế. |
| **Auth** | POST | `/api/v1/auth/register` | Hoạt động | `AuthController` | Argon2id hash, tạo RefreshSession, set HttpOnly cookie. |
| **Auth** | POST | `/api/v1/auth/login` | Hoạt động | `AuthController` | Kiểm tra tài khoản, Argon2id verify, issue JWT + Cookie. |
| **Auth** | POST | `/api/v1/auth/refresh` | Hoạt động | `AuthController` | Refresh Token Rotation + RFC 6819 Reuse Detection. |
| **Auth** | POST | `/api/v1/auth/logout` | Hoạt động | `AuthController` | Thu hồi session trong DB, xóa HttpOnly cookie. |
| **Auth** | GET | `/api/v1/auth/me` | Hoạt động | `AuthController` | Kiểm tra token + trạng thái account suspended/active. |
| **Me** | GET | `/api/v1/me/lesson-progress` | Hoạt động | `MeController` | Danh sách tiến độ học theo người dùng đăng nhập. |
| **Me** | GET | `/api/v1/me/lesson-progress/{id}` | Hoạt động | `MeController` | Tiến độ bài học cụ thể. |
| **Me** | PUT | `/api/v1/me/lesson-progress/{id}` | Hoạt động | `MeController` | Cập nhật tiến độ bài học (upsert). |
| **Me** | GET | `/api/v1/me/assessment-attempts` | Hoạt động | `MeController` | Lịch sử làm bài thi/luyện tập. |
| **Me** | POST | `/api/v1/me/assessment-attempts` | Hoạt động | `MeController` | Nộp bài thi + lưu responses và điểm số. |
| **Me** | POST | `/api/v1/me/learning-events/batch` | Hoạt động | `MeController` | Thu thập sự kiện học tập theo lô. |
| **Me** | POST | `/api/v1/me/sync/bootstrap` | Hoạt động | `MeController` | Khởi tạo đồng bộ dữ liệu học tập offline/online. |
| **Admin** | GET | `/api/v1/admin/dashboard` | Hoạt động | `AdminController` | Thống kê tổng số người dùng, hoạt động gần nhất. |
| **Admin** | GET | `/api/v1/admin/users` | Hoạt động | `AdminController` | Danh sách người dùng, lọc theo role/status, phân trang. |
| **Admin** | PATCH | `/api/v1/admin/users/{id}/role` | Hoạt động | `AdminController` | Thay đổi role, bảo vệ không giáng cấp admin duy nhất. |
| **Admin** | PATCH | `/api/v1/admin/users/{id}/status` | Hoạt động | `AdminController` | Khóa/kích hoạt người dùng (active/suspended/disabled). |
| **Content** | GET | `/api/v1/content/subjects` | Hoạt động | `ContentController` | Danh mục môn học GDPT 2018 (Toán 12). |
| **Content** | GET | `/api/v1/content/lessons` | Hoạt động | `ContentController` | Danh mục bài học, lọc theo chapter/status. |
| **Content** | POST | `/api/v1/content/lessons` | Hoạt động | `ContentController` | Tạo bài học mới (quyền Content/Admin). |

---

## 4. SCHEMA & MIGRATIONS PARITY (ALEMBIC VS EF CORE)

| Alembic Migration | Nội dung Schema | EF Core Migration tương ứng | Kiểm tra dữ liệu SQL Server |
|---|---|---|---|
| `001_initial_schema.py` | Tạo bảng `users`, `content_subjects`, `content_chapters`, `content_lessons`, `lesson_progress`, `assessment_attempts`, `assessment_responses`, `learning_events` | `20261107094945_InitialSqlServerCreate.cs` | Toàn bộ 11 bảng và khóa ngoại, chỉ mục (indexes) đã được tạo đầy đủ trên SQL Server `StudyAIDb`. |
| `002_auth_identity.py` | Thêm bảng `refresh_sessions`, `email_normalized` | `InitialSqlServerCreate` | Tích hợp trực tiếp bảng `RefreshSessions` với chỉ mục `IX_RefreshSessions_TokenHash`. |
| `003_user_roles.py` | Thêm trường `role`, `status`, `grade` | `InitialSqlServerCreate` | Tích hợp trong entity `User` với enum kiểm soát chặt chẽ. |
| `004_staff_operations.py` | Thêm bảng `staff_audit_logs` | `InitialSqlServerCreate` | Bảng `StaffAuditLogs` với trường JSON details và quan hệ actor. |

---

## 5. CÁC ĐIỂM KHẮC PHỤC BẢO MẬT ĐÃ HOÀN THÀNH TRONG PHASE 14B

1. **Xóa bỏ hoàn toàn Hardcoded Credentials**:
   - `DbInitializer.cs` không còn tự động tạo user `admin@studyai.internal` / `Admin@123456` hay `learner@studyai.internal` / `Learner@123456`.
   - Cung cấp CLI `StudyAI.Api -- --bootstrap-admin` nhận thông tin qua biến môi trường hoặc tham số lệnh, kiểm tra độ mạnh mật khẩu (tối thiểu 10 ký tự, có chữ hoa, chữ thường, số), không log mật khẩu ra màn hình.
   - Hàm `SeedReferenceDataAsync` chỉ nạp dữ liệu môn học / chương / bài học mẫu, đảm bảo không có tài khoản người dùng mặc định nào bị lộ.
2. **Loại bỏ `EnsureCreatedAsync`**:
   - Thay thế bằng chuẩn `Database.MigrateAsync()` để quản lý schema versioning chuyên nghiệp trên môi trường production.
3. **JWT Hardening**:
   - Khởi động ứng dụng sẽ ném ngoại lệ dừng ngay lập tức (`Fail Fast`) nếu thiếu cấu hình `Jwt:SecretKey` hoặc secret quá ngắn (< 32 ký tự).
   - Kiểm tra và chặn việc sử dụng secret mặc định dev trên production.
   - Bắt buộc kiểm tra `Issuer`, `Audience`, `Lifetime`, `SigningKey`, và kiểm tra claim `type == "access"`.
   - Kiểm tra realtime trạng thái tài khoản (`Status != "suspended"` và `Status != "disabled"`) trong event `OnTokenValidated`.
4. **RFC 6819 Refresh Token Reuse Detection**:
   - Phát hiện việc gửi lại refresh token đã thu hồi. Khi phát hiện token bị tái sử dụng (nghi vấn bị đánh cắp), toàn bộ phiên đăng nhập của người dùng đó sẽ bị thu hồi ngay lập tức để bảo vệ tài khoản.

---

## 6. KẾT LUẬN & CHẤP THUẬN DỌN DẸP

Hệ thống ASP.NET Core Web API và Microsoft SQL Server đã chứng minh tính tương thích 100%, bảo mật cao hơn, hiệu năng vượt trội và vượt qua 21 bài kiểm thử tự động (11 unit tests, 10 integration tests).

Toàn bộ các file Python legacy được phê duyệt xóa bỏ bằng lệnh `git rm` có kiểm soát.
