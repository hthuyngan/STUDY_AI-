# STUDY_AI — HƯỚNG DẪN THIẾT LẬP MÔI TRƯỜNG PHÁT TRIỂN TRÊN MÁY TÍNH MỚI
## Migration & Developer Onboarding Runbook (ASP.NET Core + SQL Server + React 19 + Bun)

---

Tài liệu này cung cấp quy trình chi tiết từng bước (A-Z) để chuyển đổi và thiết lập toàn bộ môi trường phát triển dự án **STUDY_AI** từ máy tính cũ sang máy tính mới thông qua GitHub.

- **Repository**: `https://github.com/hthuyngan/STUDY_AI-`
- **Nhánh chính thức**: `main`
- **Frontend Stack**: React 19, TypeScript, Vite, Bun, Tailwind CSS, KaTeX (Navy Notebook Theme).
- **Backend Stack**: ASP.NET Core Web API, C#, .NET 10 LTS, Entity Framework Core 10, JWT Authentication.
- **Database**: Microsoft SQL Server (2022/2025 Express hoặc Developer Edition).
- **Hạ tầng CI/CD**: GitHub Actions (.NET 10 + MSSQL container + Frontend build) & GitHub Pages.

---

## 1. Yêu cầu công cụ và phần mềm cần cài đặt trước (Prerequisites)

Trước khi bắt đầu, hãy cài đặt các công cụ sau trên máy tính mới (khuyến nghị Windows 11/10 64-bit hoặc Linux/macOS tương thích):

1. **Git for Windows**:
   - Tải từ: [git-scm.com](https://git-scm.com/)
   - Cấu hình sau khi cài:
     ```powershell
     git config --global user.name "Your Name"
     git config --global user.email "your.email@example.com"
     ```

2. **.NET 10 SDK**:
   - Tải bản SDK chính thức từ Microsoft: [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/10.0)
   - Kiểm tra sau khi cài đặt trong PowerShell:
     ```powershell
     dotnet --version
     # Kết quả hiển thị: 10.0.xxx
     ```

3. **Bun Runtime & Package Manager**:
   - Cài đặt trên Windows qua PowerShell:
     ```powershell
     powershell -c "irm bun.sh/install.ps1 | iex"
     ```
   - Kiểm tra:
     ```powershell
     bun --version
     # Kết quả: 1.2+ (hoặc mới nhất)
     ```

4. **Microsoft SQL Server (2022 hoặc 2025)**:
   - Tải bản **SQL Server Express** (miễn phí) hoặc **Developer Edition**: [microsoft.com/sql-server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
   - Trong quá trình cài đặt:
     - Chọn loại cài đặt: **Basic** hoặc **Custom**.
     - Đặt Instance Name là `SQLEXPRESS` (mặc định) hoặc Instance mặc định `MSSQLSERVER`.
     - Phương thức xác thực (Authentication Mode): Khuyến nghị chọn **Mixed Mode** (SQL Server and Windows Authentication) và đặt mật khẩu tài khoản `sa` mạnh để linh hoạt kết nối.

5. **Công cụ quản trị CSDL (SSMS hoặc Azure Data Studio)**:
   - **SQL Server Management Studio (SSMS)**: [Tải SSMS](https://learn.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms)
   - Hoặc Extension **MSSQL** trong Visual Studio Code.

6. **IDE / Code Editor**:
   - **Visual Studio Code** kèm extensions: *C# Dev Kit*, *Tailwind CSS IntelliSense*, *ESLint*, *Prettier*.
   - Hoặc **Visual Studio 2022** (v17.12 trở lên có hỗ trợ .NET 10).

---

## 2. Clone mã nguồn từ GitHub

Mở PowerShell tại thư mục làm việc mong muốn (ví dụ `D:\` hoặc `C:\Projects`):

```powershell
# 1. Clone repository
git clone https://github.com/hthuyngan/STUDY_AI-.git

# 2. Di chuyển vào thư mục dự án
cd STUDY_AI-

# 3. Kiểm tra trạng thái git và nhánh
git branch --show-current
# Đảm bảo đang ở nhánh: main

# 4. Kiểm tra commit gần nhất
git log -1 --oneline
```

---

## 3. Khởi tạo và cấu hình Microsoft SQL Server

### Bước 3.1: Kiểm tra Service SQL Server đang chạy
```powershell
Get-Service -Name "MSSQL$SQLEXPRESS", "MSSQLSERVER" -ErrorAction SilentlyContinue | Format-Table Status, Name, DisplayName
```
Nếu dịch vụ đang `Stopped`, khởi động dịch vụ:
```powershell
Start-Service -Name "MSSQL$SQLEXPRESS"
```

### Bước 3.2: Tạo Database `StudyAIDb`
Sử dụng công cụ `sqlcmd` hoặc mở SSMS chạy query:
```powershell
# Sử dụng Windows Authentication kết nối SQLEXPRESS
sqlcmd -S ".\SQLEXPRESS" -E -C -Q "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'StudyAIDb') CREATE DATABASE StudyAIDb COLLATE Latin1_General_100_CI_AI_SC_UTF8;"
```
*(Nếu dùng instance mặc định không có `\SQLEXPRESS`, thay `-S ".\SQLEXPRESS"` bằng `-S "."` hoặc `-S "localhost"`).*

---

## 4. Cấu hình Backend ASP.NET Core Web API

### Bước 4.1: Kiểm tra tệp cấu hình `appsettings.json`
Tệp mặc định nằm tại `backend/src/StudyAI.Api/appsettings.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Server=.\\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
  },
  "Jwt": {
    "SecretKey": "study_ai_development_secret_key_minimum_32_characters!",
    "Issuer": "StudyAI.Api",
    "Audience": "StudyAI.Client",
    "AccessTokenExpireMinutes": 30,
    "RefreshTokenExpireDays": 7
  },
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ]
  }
}
```

> [!NOTE]
> Nếu SQL Server trên máy tính mới sử dụng tài khoản `sa` thay cho Windows Authentication, bạn có thể tạo tệp `backend/src/StudyAI.Api/appsettings.Development.json` (tệp này đã được `.gitignore` bảo vệ, không lo lộ lọt mật khẩu lên GitHub):
> ```json
> {
>   "ConnectionStrings": {
>     "DefaultConnection": "Server=.\\SQLEXPRESS;Database=StudyAIDb;User Id=sa;Password=YourPassword123!;MultipleActiveResultSets=true;TrustServerCertificate=True"
>   }
> }
> ```

---

## 5. Cài đặt EF Core CLI và Khôi phục Backend

### Bước 5.1: Cài đặt công cụ `dotnet-ef` toàn cục
```powershell
dotnet tool install --global dotnet-ef
# Hoặc cập nhật nếu đã có:
dotnet tool update --global dotnet-ef
```

### Bước 5.2: Khôi phục dependencies và biên dịch dự án Backend
Tại thư mục gốc dự án:
```powershell
# Restore NuGet packages
dotnet restore backend/StudyAI.sln

# Build Solution
dotnet build backend/StudyAI.sln
```

### Bước 5.3: Áp dụng Migrations lên CSDL `StudyAIDb`
Chạy lệnh migration để tự động tạo toàn bộ bảng dữ liệu:
```powershell
dotnet ef database update --project backend/src/StudyAI.Infrastructure --startup-project backend/src/StudyAI.Api
```
Kết quả thành công sẽ in ra: `Applying migration '20261107094945_InitialSqlServerCreate'` và `Done.`

---

## 6. Khởi tạo tài khoản Quản trị viên (Admin Bootstrap)

Để đảm bảo an toàn tuyệt đối, hệ thống STUDY_AI không cho phép nhận mật khẩu qua tham số dòng lệnh CLI và không tự động tạo tài khoản khi khởi động thông thường.

Khởi tạo tài khoản Admin ban đầu (`admin@studyai.internal`) bằng một trong hai cách:

### Cách 1: Thiết lập mật khẩu qua biến môi trường an toàn (Khuyến nghị)
```powershell
# Đặt mật khẩu tạm thời cho phiên làm việc hiện tại
$env:ADMIN_BOOTSTRAP_PASSWORD="YourAdminSecurePassword2026!"

# Chạy lệnh bootstrap
dotnet run --project backend/src/StudyAI.Api -- --bootstrap-admin

# Xóa biến môi trường sau khi tạo xong
Remove-Item Env:\ADMIN_BOOTSTRAP_PASSWORD
```

### Cách 2: Nhập trực tiếp qua Console prompt
Nếu không đặt biến môi trường, hệ thống sẽ dừng lại và yêu cầu nhập mật khẩu ẩn:
```powershell
dotnet run --project backend/src/StudyAI.Api -- --bootstrap-admin
# Nhập mật khẩu khi màn hình yêu cầu:
# Enter Admin Bootstrap Password: [Mật khẩu sẽ không hiển thị trên màn hình]
```

---

## 7. Khởi chạy và kiểm tra Backend Web API

Khởi chạy Web API trên cổng `5000`:
```powershell
dotnet run --project backend/src/StudyAI.Api --urls "http://localhost:5000"
```

Mở trình duyệt hoặc dùng `curl` kiểm tra các endpoints:
1. **Liveness Probe**: `http://localhost:5000/health` -> Trả về `{"status":"Healthy"}`
2. **Database Probe**: `http://localhost:5000/health/db` -> Trả về trạng thái kết nối SQL Server thành công
3. **OpenAPI Specification**: `http://localhost:5000/openapi/v1.json` -> Trả về JSON API schema

---

## 8. Cài đặt và Khởi chạy Frontend React 19

Mở một cửa sổ PowerShell mới tại thư mục dự án:

### Bước 8.1: Cấu hình biến môi trường Frontend
Tạo hoặc kiểm tra tệp `frontend/.env`:
```powershell
cd frontend
```
Tạo tệp `.env` với nội dung kết nối Backend API:
```env
VITE_BASE_URL=/
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### Bước 8.2: Cài đặt dependencies với Bun
```powershell
bun install --frozen-lockfile
```

### Bước 8.3: Khởi chạy máy chủ phát triển Frontend
```powershell
bun run dev
```
Trình duyệt sẽ mở tại `http://localhost:5173`. Bạn có thể đăng nhập bằng tài khoản Quản trị vừa tạo hoặc đăng ký tài khoản học sinh mới.

---

## 9. Kiểm thử xác minh hệ thống (Quality Assurance Suite)

Để kiểm chứng toàn bộ hệ thống hoạt động chính xác 100% trên máy mới:

### Kiểm tra Frontend (Lint, Test, Build):
```powershell
cd frontend

# 1. Kiểm tra cú pháp và quy chuẩn mã nguồn
bun run lint
# Kết quả mong đợi: Found 0 warnings and 0 errors.

# 2. Chạy toàn bộ 356 kiểm thử giao diện & nghiệp vụ
bun run test
# Kết quả mong đợi: 45 passed (45), 356 passed (356)

# 3. Biên dịch bản sản xuất
bun run build
# Kết quả mong đợi: Built successfully in ~1s.
```

### Kiểm tra Backend (.NET Unit & Integration Tests):
```powershell
cd ..
dotnet test backend/StudyAI.sln
# Kết quả mong đợi:
# Passed! - Failed: 0, Passed: 11, Skipped: 0, Total: 11 (UnitTests)
# Passed! - Failed: 0, Passed: 11, Skipped: 0, Total: 11 (IntegrationTests)
```

---

## 10. Đánh giá và Hướng dẫn di chuyển dữ liệu CSDL (Database Migration Audit)

### 10.1. Đánh giá hiện trạng dữ liệu trên máy tính cũ
- **Dữ liệu chương trình học (Curriculum Reference Data)**: Toàn bộ danh mục 9 môn học, 6 chương Toán 12, các bài học mẫu, ngân hàng câu hỏi chuẩn GDPT 2018 và kỹ năng học tập đã được đóng gói trực tiếp trong mã nguồn Backend (`DbInitializer.cs`) và Frontend repositories. Khi chạy `dotnet ef database update` và khởi động Backend, dữ liệu này sẽ **tự động seed** vào CSDL mới mà không cần copy bất kỳ file nào.
- **Dữ liệu người dùng (User & Attempts Data)**: Dữ liệu hiện tại trên môi trường phát triển chỉ bao gồm các tài khoản kiểm thử (`admin@studyai.internal`, `learner@studyai.internal`) và các bản ghi do integration tests tự động sinh ra. Dự án chưa có dữ liệu học viên thực tế hay thông tin định danh cá nhân (PII).
- **Khuyến nghị**: Phương án chuẩn, tối ưu và sạch sẽ nhất trên máy tính mới là **sử dụng CSDL mới tinh** (Clean DB) thông qua EF Core Migrations và CLI Admin Bootstrap như đã hướng dẫn ở Mục 5 và Mục 6.

### 10.2. Quy trình sao lưu và phục hồi thủ công (Nếu muốn chuyển dữ liệu thử nghiệm cá nhân)
Nếu bạn đã tạo nhiều ghi chú cá nhân hoặc đề thi tùy chỉnh trên máy cũ và muốn giữ lại:

#### Trên máy cũ:
Tạo bản sao lưu `.bak` qua lệnh SQL:
```powershell
sqlcmd -S ".\SQLEXPRESS" -E -C -Q "BACKUP DATABASE StudyAIDb TO DISK = 'C:\Temp\StudyAIDb_Migration.bak' WITH FORMAT, MEDIANAME = 'StudyAIDb_Backup', NAME = 'Full Backup of StudyAIDb';"
```
*Copy tệp `StudyAIDb_Migration.bak` sang máy mới qua USB hoặc mạng nội bộ bảo mật.*

#### Trên máy mới:
Đặt tệp tại `C:\Temp\StudyAIDb_Migration.bak` và thực hiện khôi phục:
```powershell
sqlcmd -S ".\SQLEXPRESS" -E -C -Q "ALTER DATABASE StudyAIDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE StudyAIDb FROM DISK = 'C:\Temp\StudyAIDb_Migration.bak' WITH REPLACE; ALTER DATABASE StudyAIDb SET MULTI_USER;"
```

> [!CAUTION]
> **QUY TẮC BẢO MẬT BẮT BUỘC**:
> - Tuyệt đối **KHÔNG ĐƯỢC** đưa tệp sao lưu CSDL (`.bak`), tệp dữ liệu (`.mdf`, `.ldf`), tệp cấu hình chứa mật khẩu thực tế hoặc JWT Secret cá nhân vào Git repository.
> - `.gitignore` của dự án đã được cấu hình chặt chẽ để chặn tự động các phần mở rộng này.

---

## 11. Xử lý các sự cố thường gặp (Troubleshooting Runbook)

| Hiện tượng lỗi | Nguyên nhân khả dĩ | Giải pháp xử lý |
|---|---|---|
| `Cannot open database "StudyAIDb"` | CSDL chưa được tạo trước trên máy mới | Chạy lệnh `CREATE DATABASE StudyAIDb` trong SQL Server trước khi chạy EF migration. |
| `A network-related or instance-specific error occurred` | Dịch vụ SQL Server chưa bật hoặc sai Instance name | Kiểm tra `Get-Service MSSQL*`. Nếu dùng bản Developer, chuỗi kết nối là `Server=localhost;` thay vì `Server=.\SQLEXPRESS;`. |
| `The certificate chain was issued by an authority that is not trusted` | SQL Server dùng self-signed SSL certificate mặc định | Đảm bảo chuỗi kết nối luôn có cờ `TrustServerCertificate=True`. |
| `Failed to fetch` / Lỗi CORS trên Frontend | Backend chưa chạy hoặc port không khớp với cấu hình CORS | Đảm bảo Backend đang chạy tại `http://localhost:5000` và địa chỉ `http://localhost:5173` nằm trong danh sách `Cors:AllowedOrigins` của `appsettings.json`. |
| PowerShell báo `File cannot be loaded because running scripts is disabled` | Chính sách thực thi PowerShell trên Windows chặn script Bun/dotnet | Chạy lệnh trong PowerShell: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`. |
| Port `5000` hoặc `5173` bị chiếm dụng | Ứng dụng khác đang dùng port | Chạy `netstat -ano \| findstr :5000` để tìm PID và tắt process xung đột, hoặc đổi port khởi chạy. |

---

## 12. Danh mục nghiệm thu (Sign-off Checklist)

Sau khi hoàn tất các bước trên, hãy đánh dấu kiểm tra các tiêu chí sau trên máy mới:

- [ ] Git branch đang ở `main`, đồng bộ với `origin/main`.
- [ ] SQL Server service đang chạy và CSDL `StudyAIDb` có đủ 11 bảng nghiệp vụ.
- [ ] Backend restore, build và vượt qua 22 bài kiểm thử tự động (`dotnet test`).
- [ ] Backend API khởi chạy thành công, `/health` và `/health/db` trả về mã HTTP `200 OK`.
- [ ] Tài khoản Admin được khởi tạo thành công qua lệnh `--bootstrap-admin`.
- [ ] Frontend restore và vượt qua 356 bài kiểm thử tự động (`bun run test`).
- [ ] Frontend `bun run build` biên dịch thành công không lỗi TypeScript.
- [ ] Đăng nhập thành công trên giao diện web tại `http://localhost:5173` bằng tài khoản Admin.
