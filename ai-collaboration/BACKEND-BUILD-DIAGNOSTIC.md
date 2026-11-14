# STUDY_AI — BÁO CÁO ĐIỀU TRA & KHẮC PHỤC BACKEND BUILD
**Tài liệu chẩn đoán & nghiệm thu backend .NET 10**

- **Dự án:** STUDY_AI (.NET 10 Web API + EF Core + SQL Server)
- **Repository:** `https://github.com/hthuyngan/STUDY_AI-`
- **Branch:** `feature/frontend-css-architecture`
- **Commit gốc tham chiếu CI:** `6bc88f8d`
- **Thời gian thực hiện:** 15/11/2026
- **Trạng thái:** ✅ **ĐÃ KHẮC PHỤC HOÀN TOÀN — BUILD 0 ERRORS / 0 WARNINGS — 208/208 TESTS GREEN**

---

## 1. Tóm tắt điều hành (Executive Summary)

Quá trình điều tra thực tế đã xác định chính xác nguyên nhân khiến GitHub Actions tại commit `6bc88f8d` build và chạy test thành công trong khi môi trường máy local gặp sự cố khi thực thi lệnh build và kiểm thử backend:

1. **Không có lỗi cú pháp hoặc breaking change trong mã nguồn core**: Mã nguồn backend hoàn toàn tương thích với .NET 10 SDK 10.0.404.
2. **Xác định 3 nguyên nhân môi trường cụ thể tại local**:
   - **Thư mục thực thi lệnh (Working Directory)**: File `StudyAI.sln` nằm tại `D:\TN\backend`, không nằm ở thư mục gốc `D:\TN`. Lệnh `dotnet build` chạy tại gốc `D:\TN` lập tức văng `MSBUILD : error MSB1003: Specify a project or solution file`.
   - **Xung đột khóa file nhị phân trên Windows (Process File Locking)**: Một tiến trình backend daemon (`StudyAI.Api.exe`, PID 17016) đang chạy nền trên port 8000 từ thư mục `bin\Debug\net10.0\`. Khi chạy lệnh build Debug hoặc công cụ EF Core, Windows file locking chặn việc ghi đè các assembly `StudyAI.Infrastructure.dll`, `StudyAI.Application.dll`, `StudyAI.Domain.dll`, gây ra chuỗi lỗi `MSB3026`, `MSB3027`, `MSB3021`.
   - **Cơ sở dữ liệu kiểm thử local (`StudyAIDb_E2E`)**: Database `StudyAIDb_E2E` chưa được khởi tạo schema trên instance SQL Server Express local (khác với CI có bước Docker khởi tạo trước), dẫn đến Integration tests không thể chạy nếu chưa migrate.
3. **Sửa dứt điểm 1 cảnh báo compiler tiềm ẩn**: Đã khắc phục triệt để `warning CS8601: Possible null reference assignment` tại `CurriculumController.cs` (dòng 81) bằng null-coalescing an toàn.
4. **Kết quả kiểm thử & nghiệm thu**:
   - **Build Release & Debug**: 0 Errors, 0 Warnings.
   - **Unit Tests**: **81/81 passed** (100%).
   - **Integration Tests**: **127/127 passed** (100%) trên cơ sở dữ liệu cô lập `StudyAIDb_E2E`.
   - **Tổng cộng**: **208/208 tests passed**.
   - **Question Bank API**: Đã khởi động service, đăng nhập bằng tài khoản Content staff (`content@studyai.internal`), gọi thành công `GET /api/v1/content/questions` với đầy đủ phân trang (page 1, page 2) và dữ liệu chuẩn xác.
   - **Database Safety Guard**: Database chính `StudyAIDb` được bảo vệ nghiêm ngặt ở chế độ READ-ONLY, không bị tác động hay biến đổi.

---

## 2. Thông tin môi trường kiểm tra (Environment Info)

| Thành phần | Thông số môi trường |
| :--- | :--- |
| **Hệ điều hành** | Windows 10.0.26300 (win-x64) |
| **.NET SDK chính** | **10.0.404** (`C:\Program Files\dotnet\sdk\10.0.404\`) |
| **.NET SDK dự phòng** | 10.0.403 |
| **.NET Runtimes** | Microsoft.NETCore.App 10.0.15, Microsoft.AspNetCore.App 10.0.15 |
| **MSBuild Version** | 18.9.15+2ab285486 |
| **Database Server** | Microsoft SQL Server Express 2022 (`.\SQLEXPRESS`) — Service `MSSQL$SQLEXPRESS` Running |
| **Database chính** | `StudyAIDb` — **TUYỆT ĐỐI READ-ONLY** |
| **Database kiểm thử** | `StudyAIDb_E2E` — Độc lập và bảo vệ bởi `DatabaseSafetyGuard` |
| **Solution File** | `D:\TN\backend\StudyAI.sln` |
| **Thư mục log build** | `D:\TN\ai-collaboration\logs\backend-build-check.log` |

---

## 3. Phân tích nguyên nhân gốc (Root Cause Analysis)

### 3.1. Nguyên nhân 1: Sai lệch thư mục làm việc (Working Directory)
- **Hiện tượng**: Khi lập trình viên hoặc script CI/CD chạy `dotnet build` từ thư mục gốc `D:\TN`:
  ```text
  MSBUILD : error MSB1003: Specify a project or solution file. The current working directory does not contain a project or solution file.
  ```
- **Bản chất**: Cấu trúc repo phân tách frontend tại `D:\TN\frontend` và backend tại `D:\TN\backend`. File solution `StudyAI.sln` nằm tại `backend/StudyAI.sln`. Nếu không `cd backend` hoặc không chỉ định rõ path `StudyAI.sln`, MSBuild sẽ báo lỗi MSB1003.

### 3.2. Nguyên nhân 2: Khóa file nhị phân trong môi trường Windows (Process File Locking)
- **Hiện tượng**: Khi tiến trình dev server `StudyAI.Api.exe` (PID 17016) đang chạy trên port 8000 (được kích hoạt từ turn trước để phục vụ QA frontend), bất kỳ lệnh build nào ở cấu hình `Debug` hoặc lệnh `dotnet ef` đều gặp lỗi:
  ```text
  C:\Program Files\dotnet\sdk\10.0.404\Microsoft.Common.CurrentVersion.targets(5096,5): warning MSB3026: Could not copy "D:\TN\backend\src\StudyAI.Application\bin\Debug\net10.0\StudyAI.Application.dll" to "bin\Debug\net10.0\StudyAI.Application.dll". Beginning retry 1 in 1000ms. The process cannot access the file ... because it is being used by another process. The file is locked by: "StudyAI.Api (17016)"
  ...
  error MSB3027: Could not copy ... Exceeded retry count of 10. Failed. The file is locked by: "StudyAI.Api (17016)"
  error MSB3021: Unable to copy file ...
  ```
- **Bản chất**: Trên hệ điều hành Windows, các tiến trình .NET đang chạy sẽ giữ file handle khóa độc quyền (exclusive lock) đối với các file `.dll` và `.pdb` đã nạp. Khi MSBuild thực hiện copy output từ project reference vào thư mục bin của API, quá trình bị từ chối truy cập. Trong khi đó, bản build `Release` xuất ra thư mục `bin\Release\net10.0` (không bị khóa) nên vẫn pass bình thường.

### 3.3. Nguyên nhân 3: Cảnh báo Nullability CS8601
- **Hiện tượng**:
  ```text
  D:\TN\backend\src\StudyAI.Api\Controllers\CurriculumController.cs(81,31): warning CS8601: Possible null reference assignment. [D:\TN\backend\src\StudyAI.Api\StudyAI.Api.csproj]
  ```
- **Bản chất**: Trong `CurriculumController.cs` dòng 81:
  `Description = s.Description` gán thuộc tính `s.Description` (kiểu `string?` nullable từ Entity `ContentSubject`) cho `LearnerSubjectDto.Description` (kiểu `string` non-nullable).

### 3.4. Nguyên nhân 4: Trạng thái Database kiểm thử cục bộ (`StudyAIDb_E2E`)
- **Hiện tượng**: SQL Server local chỉ có database `StudyAIDb`, chưa tồn tại database `StudyAIDb_E2E`. Khi chạy integration tests hoặc fixture `StudyAIApiFixture`, `DatabaseSafetyGuard` phát hiện connection hợp lệ nhưng database chưa có bảng `users`, `content_questions`, v.v.

---

## 4. So sánh Local vs GitHub Actions CI

| Đặc điểm | GitHub Actions CI (`.github/workflows/ci.yml`) | Môi trường Local (Windows) |
| :--- | :--- | :--- |
| **Runner OS** | Ubuntu 22.04 / 24.04 (Linux) | Windows 10 (win-x64) |
| **Working Directory** | Được cấu hình cố định `defaults.run.working-directory: backend` | Phụ thuộc vào terminal session (có thể đang đứng tại `D:\TN` hoặc `D:\TN\backend`) |
| **Tiến trình chạy nền** | Không có tiến trình nào chạy trước khi build; runner luôn sạch sẽ | Có thể có `dotnet run` (StudyAI.Api) hoặc VS Code/IDE đang khóa file nhị phân |
| **File Locking Semantics** | Linux cho phép ghi đè/unlink file đang mở (inode swap) | Windows chặn ghi đè mọi file đang mở (file lock `MSB3021`) |
| **SQL Server** | Chạy container Docker `mcr.microsoft.com/mssql/server:2022-latest` với script tự động `CREATE DATABASE [StudyAIDb_E2E]` | Chạy SQL Server Express (`.\SQLEXPRESS`), cần đảm bảo database `StudyAIDb_E2E` đã được tạo và migrate |
| **Cấu hình Build** | Chạy rõ ràng `dotnet build --no-restore --configuration Release StudyAI.sln` | Lệnh `dotnet build` mặc định biên dịch `Debug` |

---

## 5. Các bước khắc phục đã thực hiện (Remediation Steps)

### Bước 1: Dọn dẹp tiến trình khóa file
- Xác định tiến trình PID 17016 (`StudyAI.Api.exe`) đang giữ handle trên `bin\Debug\net10.0\`.
- Đóng tiến trình an toàn để giải phóng toàn bộ file locks trên các assembly `StudyAI.Domain.dll`, `StudyAI.Application.dll`, `StudyAI.Infrastructure.dll`.

### Bước 2: Sửa cảnh báo compiler CS8601
- File: `backend/src/StudyAI.Api/Controllers/CurriculumController.cs` (Dòng 81)
- Thay đổi:
  ```csharp
  // Trước:
  Description = s.Description,

  // Sau:
  Description = s.Description ?? string.Empty,
  ```
- Kết quả: Loại bỏ hoàn toàn warning CS8601, mã nguồn sạch sẽ tuyệt đối.

### Bước 3: Khởi tạo và đồng bộ Database kiểm thử `StudyAIDb_E2E`
- Tạo database kiểm thử an toàn trên `.\SQLEXPRESS`:
  ```sql
  IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'StudyAIDb_E2E') CREATE DATABASE [StudyAIDb_E2E];
  ```
- Áp dụng đầy đủ EF Core Migrations lên `StudyAIDb_E2E` thông qua `dotnet ef database update`:
  - `20261107094945_InitialSqlServerCreate`
  - `20261108144723_AddUserSoftDelete`
  - `20261108162500_EnhanceCurriculumAndQuestions`
  - `20261109001500_FixContentDefaultConstraints`
  - `20261110001600_AddAiChatConversationsAndMessages`
  - `20261111072919_AddClassroomsAndAssignments`
  - `20261112144701_AddContentQuestionBankEnhancements`
- **Bảo mật tuyệt đối**: Database chính `StudyAIDb` không bị can thiệp, không bị migrate hay ghi dữ liệu.

### Bước 4: Biên dịch lại toàn bộ Solution (Release & Debug)
- Thực hiện:
  ```powershell
  cd D:\TN\backend
  dotnet restore StudyAI.sln
  dotnet build -c Release --no-restore StudyAI.sln
  dotnet build StudyAI.sln
  ```
- Toàn bộ log build Release được lưu vào: `ai-collaboration/logs/backend-build-check.log`.
- **Kết quả build**:
  ```text
  Build succeeded.
      0 Warning(s)
      0 Error(s)
  Time Elapsed 00:00:03.92
  ```

---

## 6. Kết quả kiểm thử (Test Results)

### 6.1. Unit Tests (`StudyAI.UnitTests.csproj`)
- **Lệnh thực thi**:
  ```powershell
  dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj --verbosity normal
  ```
- **Kết quả**:
  - Tổng số test: **81**
  - Đạt: **81 (100%)**
  - Thất bại: **0**
  - Thời gian chạy: **4.58 giây**
  - Bao quát: Password hashing (Argon2), JWT token generation & expiration, AI Tutor service & providers (OpenAi, Fake, Unconfigured), Curriculum import parser (JSON, CSV, XLSX, splits, formulas, delimiters) & validation rules.

### 6.2. Integration Tests (`StudyAI.IntegrationTests.csproj`)
- **Lệnh thực thi**:
  ```powershell
  dotnet test tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj --configuration Release --no-build --verbosity normal
  ```
- **Cơ sở dữ liệu đích**: `StudyAIDb_E2E` (Kiểm duyệt nghiêm ngặt bởi `DatabaseSafetyGuard`)
- **Kết quả**:
  - Tổng số test: **127**
  - Đạt: **127 (100%)**
  - Thất bại: **0**
  - Thời gian chạy: **35.64 giây**
  - Bao quát:
    - `DatabaseSafetyGuardTests`: Chặn tuyệt đối mọi kết nối write tới `StudyAIDb`, chặn chuỗi kết nối bất hợp lệ hoặc cố ý giả mạo.
    - `CleanDatabaseMigrationIntegrationTests`: Kiểm tra migration từ đầu trên database sạch.
    - `AuthIntegrationTests`: Đăng nhập, refresh token, thu hồi token, kiểm tra trạng thái khóa tài khoản.
    - `AdminUserManagementIntegrationTests`: CRUD người dùng, phân quyền admin/content/learner.
    - `AdminContentAccountProvisioningTests`: Cấp tài khoản content an toàn.
    - `ContentManagementIntegrationTests` & `QuestionBankIntegrationTests`: CRUD ngân hàng câu hỏi, kiểm duyệt, lọc theo môn học/lớp/trạng thái.
    - `CurriculumImportPreviewIntegrationTests` & `CurriculumImportConfirmIntegrationTests`: Xem trước và xác nhận import cấu trúc chương trình học.
    - `ClassroomAssignmentIntegrationTests`: Quản lý lớp học và bài tập.
    - `AiChatIntegrationTests`: Tương tác AI Tutor.

---

## 7. Xác minh Question Bank API (Endpoint Verification)

Đã khởi động lại service backend `StudyAI.Api` trên port 8000 và tiến hành xác minh trực tiếp luồng nghiệp vụ với tài khoản Content staff:

### 7.1. Đăng nhập lấy Bearer Token
- **Endpoint**: `POST http://localhost:8000/api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "email": "content@studyai.internal",
    "password": "Content@123456"
  }
  ```
- **Response**: HTTP 200 OK
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "bearer",
    "expiresIn": 1800,
    "user": {
      "id": "usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a",
      "email": "content@studyai.internal",
      "displayName": "Biên tập viên Nội dung",
      "grade": "12",
      "role": "content",
      "status": "active"
    }
  }
  ```

### 7.2. Kiểm tra Question Bank API — Trang 1
- **Endpoint**: `GET http://localhost:8000/api/v1/content/questions?page=1&pageSize=5`
- **Header**: `Authorization: Bearer <accessToken>`
- **Response**: HTTP 200 OK
  ```json
  {
    "items": [
      {
        "id": "qst_15330e32c15f4fd59353bf2a04570a3f",
        "lessonTitle": "Bài Học Chưa Duyệt",
        "chapterTitle": "Chương Nháp",
        "subjectName": "Môn Nháp",
        "grade": "12",
        "prompt": "Hỏi: 1 + 1 bằng mấy?",
        "options": ["1", "2", "3", "4"],
        "correctAnswer": "2",
        "difficulty": "easy",
        "status": "published",
        "sourceType": "manual"
      },
      ...
    ],
    "total": 14,
    "page": 1,
    "pageSize": 5
  }
  ```

### 7.3. Kiểm tra Question Bank API — Phân trang Trang 2
- **Endpoint**: `GET http://localhost:8000/api/v1/content/questions?page=2&pageSize=5`
- **Header**: `Authorization: Bearer <accessToken>`
- **Response**: HTTP 200 OK
  - `total`: 14 câu hỏi
  - `page`: 2
  - `pageSize`: 5
  - `itemCount`: 5 câu hỏi kế tiếp
  - `firstId`: `qst_6dae7d112df54907b41b5761d2a43ca5`
  - Dữ liệu trả về đúng định dạng DTO, không rò rỉ thông tin nhạy cảm, phân trang hoạt động hoàn hảo.

---

## 8. Khuyến nghị & Phòng ngừa (Recommendations & Prevention)

Để ngăn ngừa tái diễn hiện tượng build thất bại trên môi trường local của các nhà phát triển trong tương lai:

1. **Chuẩn hóa script chạy Build & Test cục bộ**:
   - Thêm task trong `package.json` hoặc PowerShell script tại thư mục gốc (`scripts/build-backend.ps1`) để tự động `Set-Location backend` và gọi `dotnet build StudyAI.sln`.
2. **Quản lý tiến trình Dev Server trên Windows**:
   - Khi chạy backend ở chế độ watch hoặc debug, sử dụng `dotnet watch --project src/StudyAI.Api/StudyAI.Api.csproj` hoặc dừng tiến trình trước khi thực hiện `dotnet build -c Release` hay `dotnet ef`.
3. **Cơ chế kiểm tra trước khi chạy Test (Pre-flight DB Check)**:
   - Script chạy test local nên kiểm tra và tự động đảm bảo `StudyAIDb_E2E` tồn tại trên SQL Server instance:
     `sqlcmd -S ".\SQLEXPRESS" -E -C -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'StudyAIDb_E2E') CREATE DATABASE [StudyAIDb_E2E];"`
4. **Duy trì bộ quy tắc DatabaseSafetyGuard**:
   - Giữ nguyên cơ chế fail-closed của `DatabaseSafetyGuard` để đảm bảo ngay cả khi xảy ra nhầm lẫn cấu hình, mã nguồn kiểm thử và migration không bao giờ có thể ghi đè lên database chính `StudyAIDb`.

---

**Kết luận**: Backend STUDY_AI đã được kiểm tra, phân tích, khắc phục và kiểm chứng toàn diện. Toàn bộ 208 bài test (81 Unit + 127 Integration) đều pass 100%, build 0 warning / 0 error, API Question Bank phản hồi nhanh và chính xác.

