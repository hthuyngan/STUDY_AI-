# STUDY_AI — Báo cáo Kết quả Triển khai Phase 17 & Phase 17 Hotfix: Real Curriculum & Content Management

## 1. Tổng quan Dự án & Mục tiêu Phase 17 Hotfix
- **Repository**: `https://github.com/hthuyngan/STUDY_AI-`
- **Branch**: `main`
- **Baseline Commit**: `ba84f76b54d040b6f948d4fe9646495c5afa3a48`
- **Hotfix Target**: Sửa dứt điểm lỗi CI Clean Database (`SqlException Error 515: Cannot insert NULL into content_subjects.IsActive`), củng cố bảo mật kiểm duyệt độc lập (Independent Moderation Dual-Control) và bảo mật Question API chống scraping.
- **Môi trường Công nghệ**:
  - Backend: ASP.NET Core Web API, Clean Architecture, .NET 10 (`10.0.14`), Entity Framework Core 10.
  - Cơ sở Dữ liệu: Microsoft SQL Server (`StudyAIDb` bảo toàn dữ liệu thật, `StudyAIDb_E2E` cô lập cho kiểm thử).
  - Frontend: React 19, TypeScript, Vite, Bun `1.4.3`.
  - UI Design System: **Navy Notebook** (Deep Navy `#102A43`, Warm Amber `#F4B942`, Cream Paper `#FFF9EA`).

---

## 2. Kết quả Thực hiện Phase 17 Hotfix qua 4 Checkpoints

### Checkpoint 1 — Sửa lỗi Database Migration & Clean DB CI (Hoàn thành & CI Green)
- **Nguyên nhân gốc rễ**: Tại migration ban đầu, cột `content_subjects.IsActive` được định nghĩa là `bit NOT NULL` nhưng thiếu ràng buộc giá trị mặc định (`DEFAULT 1`) trên schema SQL Server. Đồng thời EF Core 10 cấu hình `.HasDefaultValue(true)`. Khi thêm bản ghi với `IsActive == true`, EF Core bỏ qua cột trong câu lệnh `INSERT`, dẫn tới SQL Server báo lỗi 515.
- **Giải pháp triệt để**:
  - Bổ sung Migration `20261109001500_FixContentDefaultConstraints.cs` thiết lập ràng buộc mặc định (`DEFAULT 1` cho `IsActive`, `DEFAULT 0` cho `OrderIndex`).
  - Thêm integration test `CleanDatabaseMigrationIntegrationTests.cs` tự động tạo database mới hoàn toàn từ `master`, migrate toàn bộ từ đầu đến cuối và kiểm tra insert dữ liệu với giá trị mặc định.
  - Commit `9670054817e76550bf2295094380eb0607da1b17` đã kích hoạt GitHub Actions run `42503571961` và đạt **SUCCESS (All Green)**.

### Checkpoint 2 — Cơ chế Kiểm duyệt Độc lập & Phân quyền Duyệt (Dual-Control)
- **Quy tắc bảo mật kiểm duyệt**:
  - Tác giả bài học (`les.AuthorId == CurrentUserId`) **không được phép tự phê duyệt bài học của mình** (áp dụng nguyên tắc 4 mắt - Dual Control). Vi phạm lập tức trả về `HTTP 403 Forbidden`.
  - Chỉ tài khoản có vai trò `admin`, `reviewer`, hoặc claim `reviewer = true` / `permission = content.approve` mới có thẩm quyền gọi `/approve` và `/request-changes`.
  - Mọi thao tác phê duyệt hoặc yêu cầu chỉnh sửa đều lưu trữ định danh `ReviewedBy` và ghi nhận chi tiết vào `StaffAuditLog` (chứa cả `authorId` và `reviewerId`).
  - Tài khoản học viên (`learner`) cố tình gọi các endpoint kiểm duyệt sẽ bị chặn với `HTTP 403 Forbidden`.

### Checkpoint 3 — Bảo mật Question API & Chống Scraping / Brute-Force
- **Strict Zero-Leak Security**:
  - Endpoint học viên `GET /api/v1/curriculum/lessons/{id}/questions` chỉ trả về: `id`, `lessonId`, `prompt`, `options`, `difficulty`, `type`, `topic`, `orderIndex`.
  - Tuyệt đối không chứa `correctAnswer`, `explanation` hay bất kỳ trường nào gợi ý đáp án trước khi nộp bài.
- **Anti-Scraping / Rate Limiting**:
  - Sử dụng `IMemoryCache` đếm số lần nộp sai liên tiếp theo từng client/user trên từng câu hỏi.
  - Sau 3 lần nộp sai liên tiếp, lần thử thứ 4 trở đi sẽ bị khóa tạm thời với `HTTP 429 Too Many Requests` (kèm thông báo yêu cầu ôn lại lý thuyết và đợi 2 phút).
  - Khi học viên nộp đáp án đúng, bộ đếm thất bại được giải phóng ngay lập tức.
  - Toàn bộ câu hỏi chỉ thuộc bài học đã `published` và chương học/môn học đang `active` mới được phép truy vấn.

### Checkpoint 4 — Kiểm thử Hồi quy Toàn diện & Xác thực E2E
- **Frontend Code Quality**:
  - `oxlint`: **0 errors, 0 warnings** trên 389 files.
  - `vitest`: **356 / 356 tests PASS** (100% trên 45 suites).
  - `vite build`: **Thành công trong 927ms**, bundle sạch.
- **Backend Build & Unit Tests**:
  - `dotnet build StudyAI.sln`: Succeeded (Release & Debug).
  - `StudyAI.UnitTests`: **11 / 11 PASS**.
- **Playwright E2E Regression**:
  - `scripts/e2e_phase16_playwright.ts`: **9 / 9 PASS (29.14s)**.
  - `scripts/e2e_phase17_playwright.ts`: **12 / 12 PASS (26.53s)**.

---

## 3. Bảng Kết quả Playwright E2E Verification (Phase 17)

| Scenario ID | Tên Kịch bản | Thời gian | Kết quả | Ghi chú & Bằng chứng Screenshot |
|---|---|---|---|---|
| **SC-01** | Admin Login & Content Navigation | 6256ms | **PASS** | Đăng nhập thành công, điều hướng CMS (`01_login_page_initial.png`, `01_login_form_filled.png`, `01_admin_content_subjects_page.png`) |
| **SC-02** | Create Subject (CMS & SQL Server) | 1096ms | **PASS** | Tạo môn học mới, mã môn duy nhất lưu vào SQL Server (`02_subject_created_in_cms.png`) |
| **SC-03** | Create Chapter (CMS & SQL Server) | 1083ms | **PASS** | Tạo chương gắn với môn học thành công (`03_chapter_created_in_cms.png`) |
| **SC-04** | Create Lesson (Draft Status) | 994ms | **PASS** | Content Staff tạo bài học ở trạng thái Draft kèm lý thuyết KaTeX (`04_lesson_created_as_draft.png`) |
| **SC-05** | KaTeX Formula Preview | 1083ms | **PASS** | Render công thức KaTeX xem trước trong trình soạn thảo (`05_lesson_editor_katex_preview.png`) |
| **SC-06** | Create Question Bank Item | 1028ms | **PASS** | Tạo câu hỏi trắc nghiệm kèm công thức LaTeX (`06_question_bank_item_created.png`) |
| **SC-07** | Submit Lesson Moderation (In-Review) | 1044ms | **PASS** | Chuyển trạng thái `draft` $\to$ `in-review` vào hàng đợi kiểm duyệt (`07_lesson_submitted_for_review.png`) |
| **SC-08** | Approve and Publish Lesson | 927ms | **PASS** | Admin phê duyệt độc lập xuất bản thành công (`08_lesson_approved_and_published.png`) |
| **SC-09** | Learner Views Published Content | 1371ms | **PASS** | Học viên truy cập môn và bài học đã xuất bản (`09_learner_curriculum_catalog.png`) |
| **SC-10** | Learner Draft Content Blocked (404) | 808ms | **PASS** | Bài học Draft trả về HTTP 404 cho học viên (`10_learner_draft_blocked_404.png`) |
| **SC-11** | Zero-Leak Security & Server Grading | 1052ms | **PASS** | Không rò rỉ đáp án, chấm điểm server-side chính xác (`11_server_side_grading_verified.png`) |
| **SC-12** | Mobile Responsive (390px Viewport) | 1931ms | **PASS** | Giao diện Mobile 390px chuẩn Navy Notebook (`12_mobile_390px_content_subjects.png`, `12_mobile_390px_learner_subjects.png`) |

**TỔNG KẾT E2E**: **12 / 12 SCENARIOS PASS (100%)** — Thời gian chạy: 26.53s.
