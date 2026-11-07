# STUDY_AI — FASTAPI TO ASP.NET CORE MIGRATION REPORT
## Comprehensive Transition Guide, API Parity Matrix & Security Verification

---

### 1. Bối cảnh & Lý do chuyển đổi công nghệ

Hệ thống STUDY_AI ban đầu triển khai nguyên mẫu backend bằng Python 3.12 và FastAPI. Để đáp ứng yêu cầu vận hành doanh nghiệp, tính nhất quán kiểu dữ liệu cao độ từ cơ sở dữ liệu đến API DTOs, hiệu năng xử lý I/O luồng đồng thời cực cao và khả năng tích hợp hạ tầng máy chủ Windows Server với Microsoft SQL Server, STUDY_AI đã thực hiện cuộc di chuyển toàn diện sang **ASP.NET Core Web API (C#) trên nền tảng .NET LTS/10.0**.

---

### 2. Bảng đối chiếu kiến trúc (Technology Mapping Matrix)

| Thành phần kỹ thuật | Nền tảng cũ (FastAPI) | Nền tảng mới (ASP.NET Core) | Ghi chú & Lợi ích |
| :--- | :--- | :--- | :--- |
| **Ngôn ngữ & Runtime** | Python 3.12 (uvicorn) | C# 14 / .NET 10.0 (Kestrel) | Tốc độ biên dịch JIT, Type Safety tuyệt đối |
| **Cấu trúc mã nguồn** | Thư mục phẳng `app/` | Clean Architecture (Domain, Application, Infrastructure, Api) | Phân tách trách nhiệm hoàn hảo theo DDD |
| **Cơ sở dữ liệu** | SQLite (development) | Microsoft SQL Server 2025 Express | Tính toàn vẹn ACID, quản trị doanh nghiệp chuẩn hóa |
| **ORM & Migrations** | SQLAlchemy 2.0 + Alembic | Entity Framework Core 10.0 Migrations | Fluent API mạnh mẽ, LINQ truy vấn an toàn |
| **Băm mật khẩu** | `argon2-cffi` | `Konscious.Security.Cryptography.Argon2` | Chuẩn RFC 9106, tương thích hash 100% |
| **Xác thực phiên** | PyJWT + Rotating Cookie | Microsoft.AspNetCore.Authentication.JwtBearer + HttpOnly Cookie | Bảo mật Bearer token và cookie phân tách |
| **Kiểm soát truy cập** | FastAPI Depends (`require_role`) | ASP.NET Core Authorization Policies + RBAC Attributes | Phân quyền declarative trực quan, an toàn |
| **Tài liệu API** | FastAPI Swagger/Redoc | .NET OpenAPI (`AddOpenApi` / `MapOpenApi`) | Chuẩn OpenAPI v3 tự động |
| **Kiểm thử tự động** | pytest (Unit & Integration) | xUnit 2.9 + `WebApplicationFactory` | Kiểm thử tích hợp chạy trực tiếp với SQL Server |

---

### 3. Ma trận tương thích API (API Parity Matrix)

Toàn bộ các điểm cuối API đều được duy trì chính xác 100% về đường dẫn, phương thức HTTP, cấu trúc JSON Request/Response (định dạng camelCase) và mã trạng thái HTTP:

| STT | Phương thức | Đường dẫn API | Fast API Status | ASP.NET Core Status | Mô tả nghiệp vụ |
| :---: | :---: | :--- | :---: | :---: | :--- |
| 1 | `GET` | `/health` & `/api/v1/health` | 200 OK | 200 OK | Liveness check ứng dụng |
| 2 | `GET` | `/health/db` & `/api/v1/health/db` | 200 / 503 | 200 / 503 | Database readiness probe |
| 3 | `POST` | `/api/v1/auth/register` | 201 Created | 201 Created | Đăng ký tài khoản học sinh |
| 4 | `POST` | `/api/v1/auth/login` | 200 OK | 200 OK | Đăng nhập hệ thống & cấp refresh cookie |
| 5 | `POST` | `/api/v1/auth/refresh` | 200 OK | 200 OK | Xoay vòng Refresh Token Rotation |
| 6 | `POST` | `/api/v1/auth/logout` | 200 OK | 200 OK | Hủy phiên và xóa cookie |
| 7 | `GET` | `/api/v1/auth/me` | 200 OK | 200 OK | Lấy thông tin tài khoản hiện tại |
| 8 | `GET` | `/api/v1/me/lesson-progress` | 200 OK | 200 OK | Danh sách tiến độ học bài cá nhân |
| 9 | `PUT` | `/api/v1/me/lesson-progress/{id}` | 200 OK | 200 OK | Cập nhật tiến độ bài học |
| 10 | `GET` | `/api/v1/me/assessment-attempts` | 200 OK | 200 OK | Danh sách lượt làm bài kiểm tra |
| 11 | `POST` | `/api/v1/me/assessment-attempts` | 201 Created | 201 Created | Lưu lượt làm bài mới |
| 12 | `POST` | `/api/v1/me/learning-events/batch` | 201 Created | 201 Created | Lưu chuỗi telemetry theo batch |
| 13 | `POST` | `/api/v1/me/sync/bootstrap` | 200 OK | 200 OK | Đồng bộ toàn diện dữ liệu offline-first |
| 14 | `GET` | `/api/v1/admin/dashboard` | 200 OK | 200 OK | Bảng điều khiển quản trị viên |
| 15 | `GET` | `/api/v1/admin/users` | 200 OK | 200 OK | Danh sách tài khoản kèm phân trang |
| 16 | `PATCH`| `/api/v1/admin/users/{id}/role` | 200 / 400 | 200 / 400 | Đổi vai trò (bảo vệ admin cuối cùng) |
| 17 | `PATCH`| `/api/v1/admin/users/{id}/status` | 200 / 400 | 200 / 400 | Đổi trạng thái (khóa tài khoản) |
| 18 | `POST` | `/api/v1/admin/users/{id}/revoke-sessions` | 200 OK | 200 OK | Thu hồi phiên đăng nhập cưỡng bức |
| 19 | `GET` | `/api/v1/content/subjects` | 200 OK | 200 OK | Danh mục môn học GDPT 2018 |
| 20 | `GET` | `/api/v1/content/lessons` | 200 OK | 200 OK | Danh mục bài học và trạng thái duyệt |

---

### 4. Đảm bảo an toàn chuyển tiếp (Safe Transition Protocol)

1. Mã nguồn Python/FastAPI cũ vẫn được bảo lưu tại `backend/app/` và cấu hình độc lập, không bị xóa bỏ cho đến khi toàn bộ quy trình nghiệm thu ASP.NET Core hoàn tất.
2. Dữ liệu hạt giống chuẩn hóa được tự động chuyển nạp vào Microsoft SQL Server thông qua `DbInitializer.cs`.
3. Toàn bộ frontend React 19 tiếp tục hoạt động liền mạch mà không cần sửa đổi logic nghiệp vụ, chỉ cần cấu hình điểm đến `VITE_API_BASE_URL`.
