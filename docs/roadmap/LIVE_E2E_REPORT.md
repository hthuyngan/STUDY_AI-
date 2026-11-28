# LIVE BROWSER 4-ROLE E2E REPORT — ROUND 05

> Executed: 2026-11-28 (Asia/Bangkok)  
> Stack: Real Vite Dev Server (`http://127.0.0.1:5179` with same-origin `/api` proxy) + Real ASP.NET Core .NET 10 API (`http://127.0.0.1:5199`, `--no-launch-profile`, `ASPNETCORE_ENVIRONMENT=Testing`) + Isolated SQL Server `StudyAIDb_Clean_34c8f4f41f814f5aac09b120cd382722` on `.\SQLEXPRESS`.

---

## 1. Execution Summary

- **Command**: `run_r05_live_e2e.ps1` -> `e2e_r05_4role.ts` (Playwright `1.64.0`, headless Chromium)
- **Result**: `PASS` (`LIVE_E2E_4ROLE_PASS: All 4 roles verified with 0 console/page/5xx errors and 0 horizontal overflow.`)
- **Database Guard**: `StudyAIDb` and `StudyAIDb_E2E` untouched; isolated `StudyAIDb_Clean_{GUID}` created and dropped in `finally`.

## 2. Verified Scenarios

1. **Negative RBAC**: Learner JWT calling `/api/v1/content/workspace/dashboard` and `/api/v1/teacher/workspace/exams` returned `403 Forbidden`.
2. **Real UI Login & Navigation across 4 Roles**:
   - **Content**: `/content/dashboard`, `/content/materials`, `/content/knowledge-base`, `/content/error-reports`
   - **Teacher**: `/teacher/exams`, `/teacher/ai-assistant`, `/teacher/materials`, `/teacher/announcements`, `/teacher/schedule` (`03-teacher-exams.png` verified `"Kiểm tra & Đề thi Toán 12"`)
   - **Learner**: `/dashboard`, `/subjects`, `/assignments`, `/my-notes` (`05-learner-dashboard.png` verified Math 12 sidebar without `Lộ trình học tập`, `Kết quả học tập`, or `Gói Free` bottom card)
   - **Admin**: `/admin`, `/admin/support` (`08-admin-dashboard.png` verified real SQL Server KPIs `8` users, `ADM-05` honest `"Chưa có dữ liệu"`, and live `Testing` environment health card)
3. **Responsive & Visual Checks**:
   - Desktop `1440x900` and Mobile `390x844` (`07-learner-mobile-390.png`) checked with `0` horizontal overflow.
   - `0` non-401 console errors (after fixing `<p>`/`<div>` hydration warning in `Card.tsx`), `0` page errors, `0` HTTP `5xx` responses.
4. **Live E2E Visual Catch Fixed**:
   - Fixed React 19 `<div> cannot be a descendant of <p>` in `frontend/src/components/ui/Card.tsx`.
   - Fixed legacy `"Toán 10, 11 và 12"` guest hero copy in `frontend/src/pages/Dashboard/DashboardPage.tsx` -> `"Toán lớp 12"`.
