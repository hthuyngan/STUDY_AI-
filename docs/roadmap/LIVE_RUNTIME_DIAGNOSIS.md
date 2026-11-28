# LIVE RUNTIME DIAGNOSIS (LIVE-01 .. LIVE-04)

> **Updated:** 2026-11-28 (Asia/Bangkok)
> **Scope:** Read-only diagnosis of currently running local processes, ports, frontend bundle, backend API, and `StudyAIDb` schema.

---

## 1. LIVE-01: Running Processes & Served Workspace

| Process | PID | Listening Port | Executable / CommandLine | Actual Workspace & Branch |
| :--- | :---: | :---: | :--- | :--- |
| `StudyAI.Api.exe` | 11652 | `127.0.0.1:8000`, `[::1]:8000` | `D:\TN\backend\src\StudyAI.Api\bin\Debug\net10.0\StudyAI.Api.exe` | **`D:\TN`** (`feature/p05-question-mapping-assessment-integrity`, `33cca441` + 26 dirty P05 files) |
| `node.exe` (Vite) | 40588 | `[::1]:5174` | `node "D:\TN\frontend\node_modules\vite\bin\vite.js"` | **`D:\TN`** (`feature/p05-question-mapping-assessment-integrity`) |
| `bun.exe` | 40924 | — | `"C:\Users\nguyen\.bun\bin\bun.exe" run dev` | Parent of Vite `40588` |

- **Backend `/health` response (`http://localhost:8000/health`):**
  `{"status":"ok","app":"STUDY_AI","version":"1.0.0","environment":"Development","databaseName":"StudyAIDb","dataSource":".\\SQLEXPRESS"}`

---

## 2. LIVE-02: Why Sidebar Shows Old "STUDY AI PRO"

- **`D:\TN\frontend\src\components\layout\Sidebar.tsx` (lines 43–100):** Renders `STUDY AI` / `PRO` with `MENU CHÍNH` (`Tổng quan`, `Môn học`, `Lớp học`) and `LUYỆN TẬP` (`Luyện thi`, `Bài tập`).
- **`D:\TN-math12-content\frontend\src\components\layout\Sidebar.tsx` (lines 48–100+):** Renders `AI TUTOR` / `TOÁN 12` with `HỌC TẬP` (`Tổng quan`, `AI Gia sư`, `Kiến thức Toán 12`, `Luyện tập`, `Kiểm tra & thi thử`, `Sổ tay học tập`) and `TIỆN ÍCH`.
- **Root Cause (`WRONG_RUNTIME_VERSION`):** The user's browser at `http://localhost:5174` is being served from **`D:\TN`** (which is 30 commits behind `feature/math12-integrated-release`), NOT from `D:\TN-math12-content`.

---

## 3. LIVE-03: Database Compatibility (`StudyAIDb` vs Running Code)

- **`StudyAIDb` Applied Migrations (`__EFMigrationsHistory`):** 20 migrations, latest is `20261126125233_AddGeneralizedLessonResources` (P04).
- **Pending / Unapplied Migrations:**
  - On `D:\TN` (P05): `20261126142439_AddQuestionMappingAndAssessmentIntegrity` is **NOT applied** on `StudyAIDb`.
  - On `D:\TN-math12-content`: 5 newer migrations (`AddSupportCenterTickets`, `AddSupportCenterClientMessageId`, `AddMath12ContentWorkspace`, `AddMath12TeacherWorkspace`, `AddRound06IntegrityAndStorage`) are **NOT applied** on `StudyAIDb`.
- **Safety Rule:** Per ENV-01/ENV-02, `StudyAIDb` must NOT be migrated or modified automatically.

---

## 4. LIVE-04: Dashboard Error (`GET /api/v1/practice/dashboard-stats`)

- **Frontend Call Chain:**
  `DashboardPage.tsx` -> `useDashboard.ts` -> `dashboard.service.ts` (`fetchDashboardData`, lines 104–108):
  ```ts
  try {
    serverStats = await apiClient.get<ServerDashboardStats>('/api/v1/practice/dashboard-stats')
  } catch {
    throw new Error('Không thể tải dữ liệu bảng điều khiển từ máy chủ. Vui lòng thử lại.')
  }
  ```
- **Finding:** `dashboard.service.ts` swallows the underlying HTTP status / response body and displays a generic error banner. On `http://localhost:8000`, `GET /api/v1/practice/dashboard-stats` without a valid token returns `401 Unauthorized`; when authenticated on `D:\TN` against `StudyAIDb` (P04 schema) with P05 entities/queries, any schema mismatch or exception is masked behind the same generic message.
- **Next Step (Phase 05–06):** Launch `D:\TN-math12-content` on isolated QA ports (`8012` / `5175`) against a fresh `StudyAIDb_Clean_{GUID}` with all 25 migrations applied, import `backend/data/math12`, and run live Playwright browser QA across all 4 roles.
