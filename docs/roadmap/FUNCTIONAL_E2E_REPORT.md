# FUNCTIONAL E2E & DEMO DATA REPORT (ROUND 08)

> **Cập nhật:** 2026-11-28 (Round 08 — V8.0)

## 1. Kết quả kiểm thử End-to-End (Playwright & Integration)
- **Phase 20 Playwright E2E (`scripts/e2e_phase20_playwright.ts`):** **PASS (`35s`, `16` ảnh chụp QA)** trên CSDL cô lập:
  - Teacher/Admin đăng nhập, tạo lớp học Toán 12, thêm học viên (`learner@studyai.internal`), tạo bài tập.
  - Learner đăng nhập, nộp bài tập, kiểm tra RBAC chặn truy cập `/teacher/classes` (`403 FORBIDDEN`).
  - Teacher chấm điểm (`9.5`) + nhận xét; Learner xem điểm và nhận xét sau khi tải lại.
- **Playwright scripts dùng Bun cache (`e2e_p02_curriculum_workspace_playwright.ts`, `e2e_responsive_light_mode_playwright.ts`):** **NOT RUN** — Blocker: `playwright-core@1.65.1` trong Bun cache thiếu `chrome-headless-shell.exe` (`chromium_headless_shell-1255`).
- **Backend Full Integration Suite (`StudyAI.IntegrationTests`):** **282/282 PASS** (bao gồm `Math12UserWorkspaceTests`, `Math12TeacherWorkspaceTests`, `Math12ContentWorkspaceTests`, `Math12DatasetImportTests`).
- **Backend Unit Suite (`StudyAI.UnitTests`):** **351/351 PASS**.
- **Frontend Gates (`cd frontend`):** `oxlint --deny-warnings` (`0` warnings/errors), `vitest run` (PASS), `vite build` (PASS).

## 2. Báo cáo Demo Data (`MATH12_DEMO_DATA_REPORT`)
- Toàn bộ bộ học liệu Toán 12 (`backend/data/math12/`) và pipeline `Math12DatasetImportService` sẵn sàng nạp vào môi trường demo cô lập (`StudyAIDb_Clean_{GUID}`) phục vụ bảo vệ đồ án mà không làm ảnh hưởng `StudyAIDb`.
