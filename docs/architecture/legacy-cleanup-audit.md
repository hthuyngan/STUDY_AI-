# STUDY_AI — BÁO CÁO KIỂM TOÁN VÀ DỌN DẸP MÃ NGUỒN LEGACY (PHASE 14B FINAL HARDENING)

**Dự án**: STUDY_AI  
**Mục tiêu**: Kiểm toán chi tiết toàn bộ các thành phần backend Python/FastAPI cũ trước và sau khi dọn dẹp, đảm bảo chuyển dịch an toàn sang ASP.NET Core (.NET 10) + Microsoft SQL Server.  
**Ngày cập nhật**: 07/11/2026  
**Commit tham chiếu**: `d022cc6` (kèm hardening)  
**Trạng thái**: PHÊ DUYỆT THỰC HIỆN DỌN DẸP & THẮT CHẶT BẢO MẬT (APPROVED & HARDENED)

---

## 1. NGUYÊN TẮC AN TOÀN BẮT BUỘC

Toàn bộ các quy tắc an toàn sau đã được kiểm tra và tuân thủ tuyệt đối:

| Quy tắc an toàn | Trạng thái | Ghi chú kiểm tra |
|---|---|---|
| Không xóa file có thay đổi chưa commit | **ĐẠT** | Working tree sạch trên nhánh `main`. |
| Không xóa hoặc làm hỏng dữ liệu SQL Server | **ĐẠT** | Giữ nguyên instance `MSSQL$SQLEXPRESS`, database `StudyAIDb`. Không drop database/table. |
| Không xóa EF Core Migrations | **ĐẠT** | Giữ nguyên migration `20261107094945_InitialSqlServerCreate.cs` và snapshot. |
| Không xóa hoặc thay đổi logic Frontend đang chạy | **ĐẠT** | Toàn bộ thư mục `frontend/` được bảo tồn 100%, 356 tests pass, 0 lint warnings. |
| Không xóa tài liệu lịch sử các Phase trước | **ĐẠT** | Giữ nguyên toàn bộ `docs/phase-*.md`, `docs/visual-qa/`, `docs/reports/`. |
| Không force push | **ĐẠT** | Toàn bộ commits tuân thủ fast-forward hoặc rebase tiêu chuẩn. |

---

## 2. DANH MỤC KIỂM TOÁN TỪNG FILE & THƯ MỤC BACKEND LEGACY

Toàn bộ 59 file Python legacy đã được xóa thành công qua lệnh `git rm` có kiểm soát trong commit `d022cc6`:

| Đường dẫn file / thư mục | Loại thành phần | Quyết định | Thành phần thay thế trong .NET | Lý do |
|---|---|---|---|---|
| `backend/app/main.py` | FastAPI Entrypoint | **DELETED** | `backend/src/StudyAI.Api/Program.cs` | Đã chuyển toàn bộ pipeline sang ASP.NET Core Web API. |
| `backend/app/config.py` | Pydantic Settings | **DELETED** | `backend/src/StudyAI.Api/appsettings.json` | Cấu hình chuyển sang ASP.NET Core Options/Configuration. |
| `backend/app/database.py` | SQLAlchemy Session | **DELETED** | `backend/src/StudyAI.Infrastructure/Persistence/StudyAIDbContext.cs` | EF Core DbContext thay thế toàn bộ SQLAlchemy. |
| `backend/app/api/auth.py` | FastAPI Auth Routes | **DELETED** | `backend/src/StudyAI.Api/Controllers/AuthController.cs` | Đầy đủ register, login, refresh, logout, me. |
| `backend/app/api/me.py` | FastAPI Me Routes | **DELETED** | `backend/src/StudyAI.Api/Controllers/MeController.cs` | Đầy đủ progress, attempts, events, bootstrap sync. |
| `backend/app/api/health.py` | Health Check Routes | **DELETED** | `backend/src/StudyAI.Api/Controllers/HealthController.cs` | Đầy đủ `/health`, `/api/v1/health`, `/health/db`. |
| `backend/app/api/admin.py` | Admin Management | **DELETED** | `backend/src/StudyAI.Api/Controllers/AdminController.cs` | Quản lý user status, role, audit logs, system stats. |
| `backend/app/api/content.py` | Content Routes | **DELETED** | `backend/src/StudyAI.Api/Controllers/ContentController.cs` | Subjects, chapters, lessons CRUD & moderation workflow. |
| `backend/app/api/learning_progress.py` | Progress Routes | **DELETED** | `backend/src/StudyAI.Api/Controllers/LearningDataControllers.cs` | User progress persistence & bulk retrieval. |
| `backend/app/api/assessment_attempts.py` | Assessment Routes | **DELETED** | `backend/src/StudyAI.Api/Controllers/LearningDataControllers.cs` | Attempts & responses submission with grading. |
| `backend/app/api/learning_events.py` | Events Routes | **DELETED** | `backend/src/StudyAI.Api/Controllers/LearningDataControllers.cs` | Learning event telemetry ingestion. |
| `backend/app/api/sync.py` | Sync Routes | **DELETED** | `backend/src/StudyAI.Api/Controllers/MeController.cs` | Hỗ trợ sync bootstrap và synchronization endpoint. |
| `backend/app/api/deps.py` | FastAPI Depends | **DELETED** | ASP.NET Core `[Authorize]`, Policies & DI | Tích hợp sẵn trong ASP.NET Core Authentication/Authorization. |
| `backend/app/core/security.py` | Password & JWT | **DELETED** | `Argon2PasswordHasher.cs`, `JwtTokenService.cs` | Triển khai chuẩn C# với Argon2id và `System.IdentityModel.Tokens.Jwt`. |
| `backend/app/models/*.py` (10 files) | SQLAlchemy Models | **DELETED** | `backend/src/StudyAI.Domain/Entities/*.cs` | Entity classes độc lập tầng Domain với kiểu dữ liệu mạnh. |
| `backend/app/schemas/*.py` (7 files) | Pydantic Schemas | **DELETED** | `backend/src/StudyAI.Application/DTOs/*.cs` | C# DTOs có validation và serialisation tối ưu. |
| `backend/app/services/*.py` (6 files) | Business Services | **DELETED** | `StudyAI.Application` & Controllers | Toàn bộ business logic được tích hợp vào Clean Architecture .NET. |
| `backend/app/scripts/seed_staff.py` | Python Seeder | **DELETED** | `backend/src/StudyAI.Infrastructure/Persistence/DbInitializer.cs` | `DbInitializer.cs` hỗ trợ `SeedReferenceDataAsync` & `BootstrapAdminAsync`. |
| `backend/alembic/` (toàn bộ 6 files) | Alembic Migrations | **DELETED** | `backend/src/StudyAI.Infrastructure/Migrations/` | EF Core Migrations (`InitialSqlServerCreate`) thay thế Alembic. |
| `backend/alembic.ini` | Alembic Config | **DELETED** | Không cần | EF Core không dùng file ini. |
| `backend/pyproject.toml` | Python Tooling | **DELETED** | `backend/StudyAI.sln` | Dự án chuyển hoàn toàn sang .NET Solution. |
| `backend/scripts/bootstrap_admin.py` | Legacy CLI Script | **DELETED** | CLI `dotnet run --project src/StudyAI.Api -- --bootstrap-admin` | Tích hợp trực tiếp vào executable API. |
| `backend/tests/conftest.py` & `test_*.py` (10 files) | Pytest Suite | **DELETED** | `StudyAI.UnitTests` & `StudyAI.IntegrationTests` | 22 test xUnit C# chạy tự động trên .NET 10. |
| `backend/.env.example` | Mẫu cấu hình Env | **KEEP** | `backend/.env.example` | Giữ lại làm mẫu cấu hình môi trường chuẩn. |
| `backend/README.md` | Tài liệu Backend | **KEEP** | Cập nhật sang .NET hướng dẫn | Cập nhật hướng dẫn chạy .NET Web API và SQL Server. |
| `backend/StudyAI.sln` & `src/`, `tests/` | Mã nguồn .NET | **KEEP** | Bộ mã nguồn chính thức | Core stack duy nhất cho backend StudyAI. |

---

## 3. BÁO CÁO CHI TIẾT TỶ LỆ ĐỐI ỨNG API (API PARITY REPORT)

Đánh giá minh bạch và chính xác giữa các endpoint Python cũ và ASP.NET Core hiện tại:

### 3.1. Các phân hệ đạt 100% API Parity (Core & Critical Endpoints)
Toàn bộ các phân hệ mà Frontend STUDY_AI đang kết nối trực tiếp đã đạt **100% tỷ lệ đối ứng**:
1. **Health Check (3/3 endpoints - 100%)**:
   - `GET /health`, `GET /api/v1/health`, `GET /health/db`.
2. **Authentication & Session (5/5 endpoints - 100%)**:
   - `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
3. **Tiến độ học tập & Luyện tập (6/6 endpoints - 100%)**:
   - `GET /api/v1/me/lesson-progress`, `GET /api/v1/me/lesson-progress/{id}`, `PUT /api/v1/me/lesson-progress/{id}`.
   - `GET /api/v1/me/assessment-attempts`, `GET /api/v1/me/assessment-attempts/{id}`, `POST /api/v1/me/assessment-attempts`.
4. **Sự kiện & Đồng bộ (3/3 endpoints - 100%)**:
   - `POST /api/v1/me/learning-events/batch`, `GET /api/v1/me/learning-events`, `POST /api/v1/me/sync/bootstrap`.
5. **Quản lý nội dung (9/9 endpoints - 100%)**:
   - `GET /api/v1/content/subjects`, `GET /api/v1/content/subjects/{id}`, `GET /api/v1/content/lessons`, `GET /api/v1/content/lessons/{id}`.
   - `POST /api/v1/content/lessons`, `PATCH /api/v1/content/lessons/{id}`, `POST /api/v1/content/lessons/{id}/submit-review`, `POST /api/v1/content/lessons/{id}/approve`, `POST /api/v1/content/lessons/{id}/request-changes`.
6. **Quản trị hệ thống Admin (7/7 endpoints - 100%)**:
   - `GET /api/v1/admin/dashboard`, `GET /api/v1/admin/users`, `GET /api/v1/admin/users/{id}`, `PATCH /api/v1/admin/users/{id}/role`, `PATCH /api/v1/admin/users/{id}/status`, `POST /api/v1/admin/users/{id}/revoke-sessions`, `GET /api/v1/admin/system/health`.

*Tổng số Core Endpoints hoàn thành*: **33 / 33 endpoints (100% Core API)**.

### 3.2. Các phân hệ chưa triển khai trong Backend .NET (Deferred Staff Routes)
Trong backend FastAPI trước đây có một số endpoint thử nghiệm cho Teacher và Support:
- `Teacher`: `/api/v1/teacher/assignments`, `/api/v1/teacher/classes`, `/api/v1/teacher/alerts` (4 endpoints).
- `Support`: `/api/v1/support/tickets`, `/api/v1/support/tickets/{id}/messages` (3 endpoints).

**Lý do chưa chuyển đổi**:
- Frontend của STUDY_AI hiện tại (Phase 7–8) sử dụng client-side mock services (`teacher.service.ts`, `support.service.ts`, `classroomService`) lưu trữ trong localStorage/IndexedDB.
- Frontend hoàn toàn không gọi các route `/api/v1/teacher` hoặc `/api/v1/support`.
- Bảng cơ sở dữ liệu cho các phân hệ này chưa nằm trong schema chính thức (sẽ được xây dựng đầy đủ trong Phase 16 — Staff Operations CRUD).

**Tổng kết API Parity toàn dự án**:
- Core API Parity: **100% (33/33 endpoints)**.
- Tổng số endpoint tính cả các route thử nghiệm chưa tích hợp: **82.5% (33/40 endpoints)**.

---

## 4. BẢO MẬT & XỬ LÝ TÀI KHOẢN MẶC ĐỊNH

### 4.1. Không còn Hardcoded Credentials
- Mã nguồn .NET không còn bất kỳ dòng code nào khởi tạo tài khoản mặc định kèm mật khẩu (`Admin@123456`, `Learner@123456`).
- Loại bỏ toàn bộ logic tự động tạo Admin khi ứng dụng khởi động.

### 4.2. Khởi tạo Admin an toàn
- Lệnh `--bootstrap-admin` chỉ được chạy có chủ đích qua CLI.
- Nghiêm cấm nhận mật khẩu qua tham số dòng lệnh (`--admin-password`) để không bị lộ trong bảng tiến trình (`ps`, Task Manager).
- Chỉ nhận mật khẩu qua biến môi trường bí mật `ADMIN_BOOTSTRAP_PASSWORD` hoặc nhập che ký tự qua console tương tác.

### 4.3. Biện pháp xử lý tài khoản mẫu cũ trên Database Production
Đối với các cơ sở dữ liệu đã tồn tại tài khoản seed cũ từ giai đoạn thử nghiệm:
- **Khuyến nghị bắt buộc trên Production**:
  ```sql
  -- Vô hiệu hóa tài khoản mẫu cũ
  UPDATE users SET Status = 'disabled' WHERE Email IN ('admin@studyai.internal', 'learner@studyai.internal');
  ```
- Quản trị viên thật được khởi tạo qua lệnh CLI với email và mật khẩu độ dài cao, độc lập và bí mật.
