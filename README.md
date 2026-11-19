# STUDY_AI-

[![CI](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/ci.yml/badge.svg)](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/deploy.yml/badge.svg)](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/deploy.yml)

🌐 **Production Website (Frontend Demo)**: [https://hthuyngan.github.io/STUDY_AI-/](https://hthuyngan.github.io/STUDY_AI-/)

STUDY_AI- là nền tảng gia sư & trợ lý học tập thông minh sử dụng AI, cung cấp hệ thống chương trình học chuẩn hóa (Curriculum), ngân hàng câu hỏi THPT Quốc gia (VNHSGE dataset), lộ trình học tập thích ứng (Adaptive Learning), cùng hệ thống quản trị chuyên môn (Content Governance & Staff Workflows).

---

## 🏗 Kiến trúc Hệ thống (System Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (Client Layer)                         │
│  React 19 + TypeScript + Vite + Bun                                    │
│  • Workspaces: Learner, Teacher, Content, Admin, Operations            │
│  • Auth: JWT Bearer (in-memory access token + session persistence)     │
│  • Storage: Hybrid (SQL Server API client + Offline Demo Fallback)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (/api/v1/*)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Backend API (Application Layer)                    │
│  ASP.NET Core (.NET 10) Web API                                        │
│  • Clean Architecture: Api ➔ Application ➔ Infrastructure ➔ Domain     │
│  • Auth: JWT Bearer (Argon2 Password Hashing, RBAC, Claims)           │
│  • AI Engine: Router (OpenAI / Gemini / Deterministic Fake Provider)   │
│  • Security: Fail-closed production guards, DatabaseSafetyGuard        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Entity Framework Core 10
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Database (Data Layer)                         │
│  Microsoft SQL Server (LocalSQLEXPRESS / StudyAIDb / StudyAIDb_E2E)    │
│  • Tables: Users, ContentSubjects, ContentChapters, ContentLessons,    │
│    ContentLessonVideos, Questions, ExamBlueprints, StaffAuditLogs,...  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/)
- **Package Manager**: [Bun](https://bun.sh/)
- **Giao diện & Token**: CSS Tokens (Design System Navy Notebook, hỗ trợ dark mode)
- **Math & Markdown**: KaTeX / MathJax rendering qua `MathView`
- **Chất lượng mã nguồn**: Oxlint, ESLint, TypeScript Strict Mode
- **Kiểm thử**: Vitest + React Testing Library

### Backend
- **Framework**: [ASP.NET Core (.NET 10)](https://dotnet.microsoft.com/)
- **Kiến trúc**: Clean Architecture (Domain, Application, Infrastructure, Api)
- **ORM**: Entity Framework Core 10
- **Cơ sở dữ liệu**: Microsoft SQL Server (LocalSQLEXPRESS)
- **Bảo mật & Xác thực**: JWT Bearer, Argon2id (`Isopoh.Cryptography.Argon2`), Fail-closed production config
- **Tài liệu API**: OpenAPI 3.0 / Swagger UI (`/swagger`)
- **Kiểm thử**: xUnit, Microsoft.AspNetCore.Mvc.Testing (`WebApplicationFactory`), Entity Framework InMemory/SQL Server E2E fixtures

---

## 🚀 Hướng dẫn Cài đặt & Chạy cục bộ trên Windows

### Yêu cầu hệ thống
- Windows 10/11
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Microsoft SQL Server](https://www.microsoft.com/sql-server/) (SQL Server Express hoặc Developer Edition)
- [Bun](https://bun.sh/) (hoặc Node.js 20+)

### 1. Khởi động Backend (.NET 10)

```powershell
# Di chuyển vào thư mục backend
cd backend

# Build solution
dotnet build StudyAI.sln

# Khởi chạy API server (mặc định lắng nghe tại http://localhost:8000 hoặc https://localhost:7000)
dotnet run --project src/StudyAI.Api/StudyAI.Api.csproj
```

- **Swagger UI**: Truy cập `http://localhost:8000/swagger` (hoặc `http://localhost:5000/swagger`) để xem danh sách API và thử nghiệm tương tác.
- **Health Check**: `GET http://localhost:8000/health` trả về trạng thái hoạt động của cơ sở dữ liệu và hệ thống.

### 2. Xác thực trên Swagger / API

Hệ thống sử dụng xác thực JWT Bearer:
1. Gửi request `POST /api/v1/auth/login` với tài khoản quản trị hoặc chuyên viên:
   ```json
   {
     "email": "admin@gmail.com",
     "password": "<admin_password>"
   }
   ```
2. Nhận `accessToken` từ phản hồi JSON.
3. Trên giao diện Swagger UI, nhấn nút **Authorize** ở góc phải trên, nhập:
   ```
   Bearer <accessToken>
   ```
4. Toàn bộ các request tiếp theo sẽ được tự động đính kèm token xác thực.

### 3. Khởi động Frontend (React + Vite)

```powershell
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt dependencies bằng Bun
bun install --frozen-lockfile

# Khởi chạy môi trường dev (tự động proxy /api, /health, /uploads sang backend)
bun run dev
```

- Ứng dụng web mở tại: `http://localhost:5174/` (hoặc cổng được Vite phân bổ).

---

## 🧪 Hướng dẫn Chạy Kiểm thử (Testing)

### 1. Kiểm thử Frontend

```powershell
cd frontend

# Chạy linter
bun run lint

# Chạy unit & integration tests
bun run test

# Kiểm tra build production
bun run build
```

### 2. Kiểm thử Backend

```powershell
cd backend

# Chạy Unit Tests
dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj

# Chạy Integration Tests (yêu cầu SQL Server cục bộ hoạt động cho StudyAIDb_E2E)
dotnet test tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj
```

---

## 🌐 Hiện trạng Triển khai (Deployment Status)

1. **Frontend (GitHub Pages)**:
   - Tự động đóng gói và triển khai qua workflow GitHub Actions `.github/workflows/deploy.yml` mỗi khi có commit trên `main`.
   - **Giới hạn môi trường tĩnh**: GitHub Pages là máy chủ tĩnh (static hosting), không chạy máy chủ .NET backend trực tiếp. Khi người dùng truy cập trực tiếp trên GitHub Pages chưa kết nối backend, ứng dụng tự động kích hoạt **Offline / Demo Mode** (lưu dữ liệu cục bộ an toàn, không làm gián đoạn trải nghiệm người dùng).

2. **Backend**:
   - Hiện được cấu hình để chạy trong môi trường phát triển cục bộ (Local Development) và môi trường kiểm thử tự động (CI/CD GitHub Actions).
   - Chưa triển khai chính thức lên môi trường production đám mây (Cloud Production: NOT CONFIGURED).
   - Cấu hình sản xuất tuân thủ nguyên tắc **Fail-closed**: từ chối khởi động nếu thiếu `Jwt:SecretKey` mạnh hoặc sử dụng cấu hình khóa mặc định.
