# StudyAI Backend Service (.NET 10 + Microsoft SQL Server)

Hệ thống Backend chính thức cho nền tảng học tập thông minh **STUDY_AI**, xây dựng trên nền tảng **ASP.NET Core (.NET 10)**, **Entity Framework Core**, và **Microsoft SQL Server**, theo chuẩn kiến trúc **Clean Architecture**.

---

## 1. Tính năng cốt lõi

- **Authentication & Identity**:
  - Đăng ký / Đăng nhập với mật khẩu mã hóa Argon2id bảo mật cao.
  - Cấp phát Access Token (JWT Bearer) thời hạn ngắn với claims kiểm tra chặt chẽ (`sub`, `role`, `type=access`).
  - Refresh Token Rotation với lưu trữ hash SHA-256 trong SQL Server, trả về qua cookie `HttpOnly` an toàn.
  - Cơ chế phát hiện tái sử dụng refresh token theo chuẩn RFC 6819 (thu hồi toàn bộ phiên khi phát hiện xâm phạm).
  - Tự động kiểm tra trạng thái người dùng (active / suspended / disabled) trên từng request có xác thực.
- **Learning Data Persistence**:
  - Quản lý tiến độ bài học (`LessonProgress`): xác thực dải tiến độ (0–80–100), idempotent upsert, cơ chế xung đột giữ tiến độ cao hơn.
  - Quản lý bài kiểm tra (`AssessmentAttempts` & `Responses`): định chuẩn SCORM, tính điểm tự động, lưu trữ chi tiết từng phương án đã chọn.
  - Thu thập sự kiện học tập (`LearningEvents`): hỗ trợ đẩy theo lô (batch ingestion), chống trùng lặp dữ liệu.
  - Đồng bộ dữ liệu Offline-First (`BootstrapSync`): đồng bộ 1 chiều từ localStorage của trình duyệt lên máy chủ.
- **Admin & Content Moderation**:
  - Bảng điều khiển quản trị viên (`AdminDashboard`), quản lý người dùng, thay đổi phân quyền (Role-Based Access Control).
  - Quy trình kiểm duyệt bài học (`ContentModeration`): draft $\to$ review $\to$ published.
  - Ghi nhật ký kiểm toán nhân sự (`StaffAuditLogs`).
- **Bootstrap CLI an toàn**:
  - Không tồn tại tài khoản hoặc mật khẩu mặc định hardcoded trong mã nguồn.
  - Hỗ trợ lệnh bootstrap Admin ban đầu: `dotnet run --project src/StudyAI.Api -- --bootstrap-admin` (chỉ nhận mật khẩu qua biến môi trường hoặc nhập ẩn ký tự qua console, tuyệt đối không nhận qua tham số dòng lệnh).

---

## 2. Cấu trúc Solution (`StudyAI.sln`)

```
backend/
├── src/
│   ├── StudyAI.Domain/          # Entities & Domain Models độc lập
│   ├── StudyAI.Application/     # DTOs, Business Interfaces
│   ├── StudyAI.Infrastructure/  # EF Core DbContext, Migrations, Argon2, JWT Service
│   └── StudyAI.Api/             # ASP.NET Core Web API, Controllers, Middlewares
└── tests/
    ├── StudyAI.UnitTests/       # Kiểm thử đơn vị (JWT, Argon2, Validation)
    └── StudyAI.IntegrationTests/# Kiểm thử tích hợp WebApplicationFactory + SQL Server
```

---

## 3. Hướng dẫn thiết lập & Chạy Local

### Yêu cầu tiên quyết:
- .NET 10 SDK (`dotnet --version`)
- Microsoft SQL Server (LocalDB, SQLEXPRESS, hoặc Docker MSSQL Server)

### Các bước khởi chạy:

```powershell
cd backend

# 1. Restore và Build solution
dotnet restore StudyAI.sln
dotnet build StudyAI.sln

# 2. Áp dụng Database Migrations
dotnet ef database update --project src/StudyAI.Infrastructure --startup-project src/StudyAI.Api

# 3. (Tùy chọn) Khởi tạo tài khoản Admin đầu tiên an toàn
$env:ADMIN_BOOTSTRAP_EMAIL="admin@studyai.internal"
$env:ADMIN_BOOTSTRAP_PASSWORD="YourStrongAdminPassword!2026"
dotnet run --project src/StudyAI.Api -- --bootstrap-admin
Remove-Item Env:\ADMIN_BOOTSTRAP_PASSWORD

# 4. Khởi chạy Web API server
dotnet run --project src/StudyAI.Api
```

- API Endpoint mặc định: `http://localhost:5000` (hoặc cổng được cấu hình trong `launchSettings.json`).
- OpenAPI Spec: `http://localhost:5000/openapi/v1.json`
- Health check: `http://localhost:5000/api/v1/health`
- Health DB: `http://localhost:5000/api/v1/health/db`

---

## 4. Chạy Kiểm Thử (Automated Tests)

```powershell
cd backend
dotnet test StudyAI.sln
```
Toàn bộ test suite bao gồm 22 bài kiểm thử (11 unit tests và 11 integration tests) chạy trực tiếp trên cơ sở dữ liệu SQL Server.
