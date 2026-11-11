# REPORT — Antigravity → ChatGPT

- Task ID: **P20-000**
- Title: **Authentication/API Recovery & Header Navigation Cleanup**
- Status: **COMPLETED**
- Baseline SHA: `aa52be2c10b77c598bc6f82729352e466b039485`
- Implementation commit: `f3e9ae1` (P20-000)
- Local workspace: `E:\AI_tutor`
- Branch: `main`

## 1. Root Cause Diagnosis
1. **Header Navigation Anomaly**:
   - `frontend/src/config/prototype.ts` had `FRONTEND_PROTOTYPE_MODE = true` hardcoded.
   - `isPrototypeMode()` evaluated to `true` unconditionally, causing `Topbar.tsx` to render the standalone "Trang quản trị" button and `<select>` workspace mini-switcher even when unauthenticated (`isAuthenticated = false`), producing the screenshot showing "Trang quản trị", "Quản trị", "Đăng nhập", and "Đăng ký" at the same time.
2. **API & Login Failures**:
   - In `frontend/src/config/learner.ts`, when `VITE_API_BASE_URL` was unset in local environments, `getApiBaseUrl()` returned an empty string and `isRemoteApiConfigured()` returned `false`.
   - `requestAuthApi` in `auth.service.ts` threw `ApiError(0, 'Remote API base URL is not configured')` immediately upon clicking login.
   - `apiClient.ts` rejected empty `baseUrl` even if a proxy was available.
   - `AuthProvider.tsx` immediately defaulted to offline guest mode on app startup without querying backend session refresh.
   - `frontend/vite.config.ts` had no proxy configuration for `/api` and `/health`, preventing same-origin cookie delivery on local HTTP development.
3. **Double Path Bug Risk**:
   - Some legacy examples configured `VITE_API_BASE_URL=http://localhost:5000/api/v1`. Because endpoints are prefixed with `/api/v1`, this caused doubled URLs (`.../api/v1/api/v1/auth/login`).

## 2. Implemented Fixes
1. **Prototype Mode Containment**:
   - Updated `frontend/src/config/prototype.ts` so `FRONTEND_PROTOTYPE_MODE = false`. Prototype mode now strictly requires explicit opt-in (`VITE_UI_PROTOTYPE_MODE === 'true'`).
2. **Vite Reverse Proxy**:
   - Configured `/api` and `/health` proxies in `frontend/vite.config.ts` for both `server` and `preview` modes, routing to `VITE_BACKEND_URL`, `VITE_API_BASE_URL`, or `http://localhost:5000`.
3. **URL Sanitization & Local Detection**:
   - Added `sanitizeApiUrl()` in `frontend/src/config/learner.ts` to automatically strip redundant `/api/v1` or `/api` suffixes and trailing slashes.
   - Updated `isRemoteApiConfigured()` to recognize `localhost` and `127.0.0.1` environments.
   - Updated `apiClient.ts` to support relative proxy paths (`!baseUrl && !isRemoteApiConfigured()`).
4. **Header & Navigation Overhaul**:
   - **Unauthenticated (Guest)**: Displays only "Đăng nhập" and "Đăng ký". Removed standalone "Trang quản trị" shortcut and workspace mini-select. No user account dropdown rendered.
   - **Initializing Auth State**: Neutral loading placeholder to prevent flicker or contradictory button flashes during startup session check.
   - **Authenticated**: Standalone "Đăng nhập" and "Đăng ký" buttons are hidden. Topbar displays **ONE** unified account dropdown trigger (`topbar-user-wrap`).
   - **Role-Aware Dropdown**: Inside the dropdown menu:
     - User header with display name, email/grade, and role badge (`Quản trị viên`, `Giáo viên`, `Biên tập nội dung`, `Hỗ trợ viên`, `Học viên`).
     - Role-specific destinations: Admin -> "Trang quản trị" (`/admin`); Teacher -> "Không gian giáo viên" (`/teacher`); Content -> "Quản lý nội dung" (`/content`); Support -> "Hỗ trợ khách hàng" (`/support`); Learner -> "Bảng điều khiển học tập" (`/dashboard`).
     - Profile ("Hồ sơ cá nhân") and Settings ("Cài đặt").
     - "Đăng xuất" button calling `authService.logout()`.
5. **Workspace Shell Cleanup**:
   - In `WorkspaceShell.tsx`, restricted the quick workspace switcher select to prototype mode or admin role.

## 3. Evidence & Quality Gates
- **Backend Build**: `dotnet build backend/StudyAI.sln --no-restore` -> **PASS** (0 Errors, 1 Warning).
- **Backend Tests**: `dotnet test backend/StudyAI.sln` -> **165/165 PASSED** (100% pass):
  - `StudyAI.UnitTests`: 57/57 PASSED (2s)
  - `StudyAI.IntegrationTests`: 108/108 PASSED (24s)
- **Frontend Lint**: `bun run lint` -> **PASS** (0 errors, 0 warnings on 395 files).
- **Frontend Vitest**: `bun run test:run` -> **391/391 PASSED** across 49 test files (including 12 new/updated Topbar navigation tests).
- **Frontend Production Build**: `bun run build` -> **PASS** (17.25s).
- **Playwright E2E Test** (`scripts/e2e_p20_000_playwright.ts`):
  - Executed against real ASP.NET Core API + real Vite frontend + SQL Server `StudyAIDb_E2E`.
  - **Results**: **5/5 Scenarios PASSED** in 11.53s.
    - Scenario 1: Unauthenticated Guest state & clean header (PASS).
    - Scenario 2: Learner login & single account dropdown (PASS).
    - Scenario 3: Real authenticated API request & AI Tutor status (PASS).
    - Scenario 4: Page reload & session restore via rotating cookie (PASS).
    - Scenario 5: Logout & Admin login, workspace navigation (PASS).
  - Screenshots recorded in `docs/visual-qa/p20-000/`:
    - `p20_000_01_guest_navigation.png`
    - `p20_000_02_learner_authenticated_dropdown.png`
    - `p20_000_03_authenticated_api_aitutor.png`
    - `p20_000_04_session_restored_after_reload.png`
    - `p20_000_05_admin_authenticated_workspace.png`
    - `p20_000_06_admin_dropdown_in_appshell.png`
  - Manifest: `docs/visual-qa/p20-000/manifest.json`.

## 4. Strict Database Safety Evidence
- Primary database `StudyAIDb` checked via `sqlcmd`:
  - `SELECT COUNT(*) FROM Users` = **119** (Exact match with initial baseline).
  - **ZERO writes, ZERO migrations, ZERO account modifications on `StudyAIDb`**.
- All E2E and integration tests ran strictly against isolated `StudyAIDb_E2E`.
- `DatabaseSafetyGuard` fail-closed protection verified.

## 5. Next Steps
- Await ChatGPT review of `P20-000` in `REVIEW.md`.
- No Phase 20 feature entities or endpoints have been created yet.
- Ready for official task `P20-001` once `P20-000` is approved.
