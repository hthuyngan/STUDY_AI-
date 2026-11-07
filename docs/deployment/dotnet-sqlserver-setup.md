# STUDY_AI — ASP.NET CORE & SQL SERVER PRODUCTION SETUP GUIDE
## Phase 14A: Local, On-Premise & Cloud Deployment Runbook

---

### 1. Yêu cầu môi trường tối thiểu (Prerequisites)

- **Hệ điều hành**: Windows 10/11 x64, Windows Server 2022 hoặc Linux x64 (hỗ trợ .NET 10.0 runtime).
- **.NET SDK**: Phiên bản `.NET 10.0` (hoặc mới nhất). Kiểm tra bằng lệnh:
  ```powershell
  dotnet --version
  ```
- **Microsoft SQL Server**:
  - SQL Server 2019/2022/2025 Express hoặc Enterprise / Developer.
  - Windows Service `MSSQL$SQLEXPRESS` hoặc `MSSQLSERVER` đang ở trạng thái `Running`.
  - Cơ sở dữ liệu: `StudyAIDb`.
- **Node/Bun**: Bun v1.2+ hoặc Node.js 20+ phục vụ cho việc build Frontend.

---

### 2. Thiết lập cơ sở dữ liệu Microsoft SQL Server

#### Bước 1: Khởi động SQL Server Service
```powershell
Get-Service -Name MSSQL$SQLEXPRESS | Start-Service
```

#### Bước 2: Tạo CSDL `StudyAIDb` (nếu chưa có)
```powershell
sqlcmd -S ".\SQLEXPRESS" -E -C -Q "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'StudyAIDb') CREATE DATABASE StudyAIDb;"
```

#### Bước 3: Cấu hình chuỗi kết nối (Connection String)
Mở tệp `backend/src/StudyAI.Api/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.\\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
  },
  "Jwt": {
    "SecretKey": "YOUR_STRONG_SECRET_KEY_AT_LEAST_32_CHARACTERS_LONG",
    "AccessTokenExpireMinutes": 30,
    "RefreshTokenExpireDays": 7
  }
}
```

---

### 3. Thực thi EF Core Migrations

Để áp dụng các bảng dữ liệu mới nhất lên SQL Server:
```powershell
# Di chuyển vào thư mục gốc dự án
cd D:\TN

# Cập nhật schema cơ sở dữ liệu
dotnet ef database update -p backend/src/StudyAI.Infrastructure -s backend/src/StudyAI.Api
```

---

### 4. Khởi chạy Backend ASP.NET Core Web API

#### Chạy chế độ Development:
```powershell
dotnet run --project backend/src/StudyAI.Api --urls "http://localhost:5000"
```
Sau khi khởi chạy:
- API Liveness: `http://localhost:5000/health`
- SQL Server Probe: `http://localhost:5000/health/db`
- OpenAPI Documentation: `http://localhost:5000/openapi/v1.json`

---

### 5. Kết nối Frontend React 19

Tại thư mục `frontend/`, thiết lập biến môi trường `.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Khởi chạy máy chủ phát triển Frontend:
```powershell
cd frontend
bun run dev
```

Hoặc biên dịch và đóng gói cho sản xuất (GitHub Pages):
```powershell
bun run build
```

---

### 6. Quy trình sao lưu và phục hồi CSDL (Backup & Restore)

#### Sao lưu CSDL (Backup):
```powershell
sqlcmd -S ".\SQLEXPRESS" -E -C -Q "BACKUP DATABASE StudyAIDb TO DISK = 'D:\TN\StudyAIDb_backup.bak' WITH FORMAT, MEDIANAME = 'StudyAIDb_Backup', NAME = 'Full Backup of StudyAIDb';"
```

#### Phục hồi CSDL (Restore):
```powershell
sqlcmd -S ".\SQLEXPRESS" -E -C -Q "RESTORE DATABASE StudyAIDb FROM DISK = 'D:\TN\StudyAIDb_backup.bak' WITH REPLACE;"
```
