# ENV-01 Revision Report — Single Persistent Database (`StudyAIDb`) & Disposable Test Databases (`StudyAIDb_Clean_{GUID}`)

- **Date:** 2026-11-25
- **Branch:** `feature/database-environment-isolation`
- **Base Commit:** `1baa9de8b26fab37b203e696204e26b5cd77c8a6` (`feature/multi-subject-catalog-p01`)
- **Architecture:** Single persistent database (`StudyAIDb` on `.\SQLEXPRESS` for website `Development` and `Production`) + ephemeral disposable databases (`StudyAIDb_Clean_{GUID}` for all `Testing`, xUnit Integration Tests, CI, and Playwright E2E runs). No persistent `StudyAIDb_Dev` or `StudyAIDb_E2E`.
- **Scope Guard:** P01 CRUD architecture untouched; P02 not started; `StudyAIDb` data/schema untouched; existing `StudyAIDb_E2E` not deleted (backup & removal plan below awaits owner approval); not committed/pushed yet.

---

## 1. Two-Tier Database Separation Matrix

| Tier / Environment (`ASPNETCORE_ENVIRONMENT`) | Authorized Database Target | Blocked Targets (Fail-Closed) | Startup Migrations | Sample Curriculum Seed | Startup Test Accounts |
|---|---|---|---|---|---|
| `Development` (Website) | `StudyAIDb` (explicit in `appsettings.Development.json`) | `StudyAIDb_E2E`, `StudyAIDb_Dev`, `StudyAIDb_Clean_*`, missing conn string | **`false`** (controlled EF CLI only) | **Forbidden** (`SeedReferenceData=true` aborts) | **`false`** (never writes test users to `StudyAIDb`) |
| `Production` (Website) | `StudyAIDb` (external secret/env config; `appsettings.json` is `""`) | Missing/empty conn string, auto-migrations on startup | **`false`** (aborts if `true`) | **Forbidden** | **Forbidden** |
| `Testing` (xUnit / CI / Playwright) | `StudyAIDb_Clean_{GUID}` ONLY (`Guid:N` or `Guid:D`) | `StudyAIDb`, `StudyAIDb_E2E`, `StudyAIDb_Dev`, spoofed names, missing conn string | **`true`** (auto-applied to disposable DB) | **Forbidden** | `true` on `StudyAIDb_Clean_{GUID}` only (for Playwright/test fixtures) |

---

## 2. Implemented Changes

### 2.1 Fail-Closed Guard, Startup & Configuration
- **[DatabaseSafetyGuard.cs](../../backend/src/StudyAI.Api/Data/DatabaseSafetyGuard.cs):**
  - Restricted `IsAuthorizedTestDatabase` and `EnsureSafeTestDatabase` strictly to `StudyAIDb_Clean_{GUID}` (`Guid:N` or `Guid:D`), rejecting `StudyAIDb`, `StudyAIDb_E2E`, and `StudyAIDb_Dev`.
  - `EnsureSafeDatabaseForEnvironment` enforces: `Testing` allows ONLY `StudyAIDb_Clean_{GUID}`; `Development` allows `StudyAIDb` at runtime (blocking `StudyAIDb_E2E`, `StudyAIDb_Dev`, and disposable DBs); `Migration`/`Seed`/`Import`/`Startup Migration` contexts strictly refuse `StudyAIDb`.
  - Added `GetSafeDatabaseMetadata` (`DatabaseName`, `DataSource`) stripping all credentials/raw connection strings.
- **[Program.cs](../../backend/src/StudyAI.Api/Program.cs):**
  - Removed hardcoded `StudyAIDb_E2E` fallback completely; `AddDbContext` resolves `ConnectionStrings:DefaultConnection` from `IConfiguration` and fails closed when missing/empty or blocked by `DatabaseSafetyGuard`.
  - Disabled automatic startup migrations on `StudyAIDb` and outside `Testing` (`ApplyMigrationsOnStartup` defaults to `false` in `Development`/`Production`, and explicitly throws if `true` against `StudyAIDb`).
  - `Database:BootstrapTestAccounts` defaults to `false` in `Development`/`Production` and is strictly forbidden against `StudyAIDb` or non-`Testing` environments.
  - Enabled `localhost`/`127.0.0.1` CORS and OpenAPI/Swagger for both `Development` and `Testing`.
- **Configuration Files & User Secrets:**
  - [appsettings.json](../../backend/src/StudyAI.Api/appsettings.json): `ConnectionStrings:DefaultConnection = ""`, `ApplyMigrationsOnStartup = false`, `SeedReferenceData = false`, `BootstrapTestAccounts = false`.
  - [appsettings.Development.json](../../backend/src/StudyAI.Api/appsettings.Development.json): `DefaultConnection` targets `StudyAIDb` explicitly with `ApplyMigrationsOnStartup = false`, `SeedReferenceData = false`, `BootstrapTestAccounts = false`.
  - [appsettings.Testing.json](../../backend/src/StudyAI.Api/appsettings.Testing.json): `DefaultConnection = ""` (must be supplied per test run as `StudyAIDb_Clean_{GUID}`), `ApplyMigrationsOnStartup = true`, `BootstrapTestAccounts = true`.
  - [launchSettings.json](../../backend/src/StudyAI.Api/Properties/launchSettings.json): `"http"` (`Development`) and `"Testing"` profiles.
  - [backend/.env.example](../../backend/.env.example): updated to single persistent `StudyAIDb` + disposable `StudyAIDb_Clean_{GUID}` rules.
  - Cleaned local `dotnet user-secrets` overrides (`ConnectionStrings:DefaultConnection`, `Database:ApplyMigrationsOnStartup`) and aligned local gitignored `backend/.env` to `StudyAIDb`.

### 2.2 Non-Secret Diagnostics & Frontend Override Hygiene
- [HealthController.cs](../../backend/src/StudyAI.Api/Features/Public/HealthController.cs), [IAdminSystemService.cs](../../backend/src/StudyAI.Api/Features/Admin/IAdminSystemService.cs), [AdminSystemService.cs](../../backend/src/StudyAI.Api/Features/Admin/AdminSystemService.cs), and [SystemHealthService.cs](../../backend/src/StudyAI.Api/Features/Admin/SystemHealthService.cs) expose `environment`, `databaseName`, and `dataSource` in `Development`/`Testing` only (omitted in `Production`, zero credentials).
- [frontend/src/config/learner.ts](../../frontend/src/config/learner.ts): added `clearStaleApiBaseOverride()` to remove and ignore stale `localStorage.study_ai_api_base_url` entries so `window.__STUDY_AI_API_BASE_URL__`, `VITE_API_BASE_URL`, and Vite's `/api` proxy cannot be hijacked.

### 2.3 Automatic Disposable DB Lifecycle in Test Runners & CI
- **[StudyAIApiFixture.cs](../../backend/tests/StudyAI.IntegrationTests/StudyAIApiFixture.cs):** Removed `StudyAIDb_E2E` fallback. When `ConnectionStrings__DefaultConnection` is unset, automatically provisions a unique `StudyAIDb_Clean_{Guid:N}`, applies migrations & test users, and drops it in `Dispose()`.
- **[scripts/utils/databaseSafetyGuard.ts](../../scripts/utils/databaseSafetyGuard.ts) & [scripts/utils/disposableDb.ts](../../scripts/utils/disposableDb.ts):** Guard rejects `StudyAIDb`, `StudyAIDb_E2E`, and `StudyAIDb_Dev`, accepting ONLY `StudyAIDb_Clean_{GUID}`. `createDisposableTestDatabase()` creates `StudyAIDb_Clean_{Guid:N}` via `sqlcmd` and returns `cleanup()` to drop it in `finally`.
- Updated [scripts/e2e_catalog_p01_playwright.ts](../../scripts/e2e_catalog_p01_playwright.ts), all Playwright `scripts/e2e*.ts` runners (with `ASPNETCORE_ENVIRONMENT=Testing` + `--no-launch-profile`), `.github/workflows/ci.yml`, `.github/workflows/p01-live-browser.yml`, and [AGENTS.md](../../AGENTS.md).

---

## 3. Verification Results (Zero Writes to `StudyAIDb`)

- **Frontend (`frontend/`):**
  - `bun run lint`: **PASS** (`0` warnings, `0` errors across `498` files).
  - `bun run test`: **PASS** (`86` test files, **579/579** tests, including [learner.test.ts](../../frontend/src/config/learner.test.ts) and [databaseSafetyGuard.test.ts](../../frontend/src/test/databaseSafetyGuard.test.ts)).
  - `bun run build`: **PASS** (`tsc -b && vite build`, `3.28s`).
- **Backend Build & Unit Tests (`backend/`):**
  - `dotnet build StudyAI.sln --no-restore`: **PASS** (`0` errors; `2` pre-existing `xUnit2012` warnings in `LearnerNotesAndBookmarksIntegrationTests.cs`).
  - `dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj --no-build`: **PASS (285/285)** (includes [DatabaseEnvironmentIsolationTests.cs](../../backend/tests/StudyAI.UnitTests/DatabaseEnvironmentIsolationTests.cs)).
- **Two Independent Clean Disposable-DB Integration Runs (Proving Zero Fixture Accumulation):**
  - **Run 1** (auto-provisioned `StudyAIDb_Clean_{GUID}` per `StudyAIApiFixture` + auto-drop in `Dispose`): **PASS (248/248)** in `1m25s`.
  - **Run 2** (explicit CI-style `StudyAIDb_Clean_8f6fcec857bf4b55ae0521bc5dd66d4a`, migrated via `dotnet ef database update` and dropped in `finally`): **PASS (248/248)** in `1m03s`.
- **Playwright E2E on Disposable Database:**
  - `bun scripts/e2e_catalog_p01_playwright.ts` targeting `StudyAIDb_Clean_b4305526dce6463586787a8213879c6f`: **PASS (7/7 + Scenario 0 diagnostics + stale `localStorage` removal)**, followed by automatic process shutdown and disposable DB drop in `finally`.

---

## 4. Kế Hoạch Backup & Xóa `StudyAIDb_E2E` (Chờ Owner Phê Duyệt)

`StudyAIDb_E2E` hiện được giữ nguyên trên `.\SQLEXPRESS` và **chưa bị xóa**. Khi owner phê duyệt:
1. Kiểm tra không còn kết nối đang mở tới `StudyAIDb_E2E` và sao lưu (nếu cần lưu trữ đối chiếu):
   ```powershell
   sqlcmd -S ".\SQLEXPRESS" -E -C -Q "BACKUP DATABASE [StudyAIDb_E2E] TO DISK = N'D:\Backups\StudyAIDb_E2E_pre_remove.bak' WITH INIT, COMPRESSION;"
   ```
2. Xác minh file `.bak` (`RESTORE VERIFYONLY FROM DISK = N'D:\Backups\StudyAIDb_E2E_pre_remove.bak';`) — không lưu file `.bak` vào Git.
3. Sau khi xác nhận backup thành công, gỡ bỏ `StudyAIDb_E2E`:
   ```powershell
   sqlcmd -S ".\SQLEXPRESS" -E -C -Q "ALTER DATABASE [StudyAIDb_E2E] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [StudyAIDb_E2E];"
   ```

---

## 5. Hướng Dẫn Chạy Website & Kiểm Thử Đúng Database

### 5.1 Chạy Website (`Development` -> `StudyAIDb`)
- **Kiểm tra/áp dụng migration có kiểm soát (chỉ khi cần nâng schema `StudyAIDb`, sau backup):**
  ```powershell
  cd backend
  dotnet ef database update --project src/StudyAI.Api/StudyAI.Api.csproj --connection "Server=.\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True;"
  ```
- **Khởi chạy Backend:**
  ```powershell
  cd backend
  dotnet run --project src/StudyAI.Api/StudyAI.Api.csproj --launch-profile http
  ```
  Xác nhận qua `GET http://localhost:8000/api/v1/health/db` -> `"environment": "Development"`, `"databaseName": "StudyAIDb"`.
- **Khởi chạy Frontend:**
  ```powershell
  cd frontend
  bun run dev
  ```
  Mọi `localStorage.study_ai_api_base_url` cũ sẽ tự động bị xóa khi tải trang.

### 5.2 Chạy Integration Tests & Playwright (`Testing` -> `StudyAIDb_Clean_{GUID}`)
- **xUnit Integration Tests:** `cd backend && dotnet test tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj` (tự tạo `StudyAIDb_Clean_{GUID}`, migrate, chạy test và drop trong `Dispose`).
- **Playwright E2E:** `bun scripts/e2e_catalog_p01_playwright.ts` (tự tạo `StudyAIDb_Clean_{GUID}`, khởi chạy API với `ASPNETCORE_ENVIRONMENT=Testing --no-launch-profile`, chạy E2E, tắt process và drop DB tạm trong `finally`).
