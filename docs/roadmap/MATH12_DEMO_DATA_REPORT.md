# MATH12 DEMO DATA & PLAYWRIGHT E2E REPORT (R09-11 & R09-14)

> **Cập nhật:** 2026-11-28 (Round 09 — V9.0)

## 1. Playwright E2E Verification (`R09-11`)
Đã cài đặt chính thức binary `chromium_headless_shell-1255` (`playwright@1.65.1`) và chạy toàn bộ 3 bộ Playwright E2E trên CSDL cô lập (`StudyAIDb_Clean_{GUID}` / Vite preview):
1. **`e2e_phase20_playwright.ts`:** **PASS (`35s`, `16` screenshots)** — Teacher/Admin tạo lớp, thêm học viên, giao bài tập; Learner nộp bài, kiểm tra `403 FORBIDDEN` khi vào `/teacher/classes`; Teacher chấm `9.5`; Learner xem điểm sau reload.
2. **`e2e_p02_curriculum_workspace_playwright.ts`:** **PASS** — Empty state, CRUD chương/bài, Lesson Editor, reorder trang `> 1`, lifecycle round-trip, Learner UI, `401`/`403`, stale `409`, API `500`, tablet `1024/768` & mobile `390/375px`.
3. **`e2e_responsive_light_mode_playwright.ts`:** **PASS** — Kiểm tra toàn bộ viewport `375px`, `390px`, `768px`, `1024px`, `1366px`, `1920px` (không tràn ngang, mobile drawer hoạt động, redirect `/login` đúng chuẩn).

## 2. Kế hoạch dữ liệu Demo (`R09-14`)
- Dữ liệu demo (30 học sinh demo, 3 giáo viên demo, 2 Content demo, 1 Admin demo, 3 lớp demo, 30 bài tập, kết quả luyện tập/kiểm tra/ticket) **tuyệt đối không được nạp vào `StudyAIDb`**; chỉ nạp vào bản sao `StudyAIDb_Clean_{GUID}` khi chạy phiên trình diễn/bảo vệ đồ án thông qua fixture cô lập.
