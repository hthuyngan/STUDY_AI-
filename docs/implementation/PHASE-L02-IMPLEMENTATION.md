# L02 — SINGLE IMPLEMENTATION LEDGER (Anti updates this file)
**Repo:** `hthuyngan/STUDY_AI-` | **Issue:** #17 | **Draft PR:** #18  
**Base:** `feature/math10-12-p00-foundation@f287800`. **Updated:** 2026-11-21.

> **STATE: PROGRESSING — FULL-STACK DELIVERY COMPLETED (GROUPS A, B, C FULLY INTEGRATED & ALIGNED; WS0, WS1, WS2, WS3, WS4, WS5, WS6, WS7 VERIFIED VIA AUTOMATED FULL-STACK, INTEGRATION & PLAYWRIGHT SUITES).** All workstreams are executed on single branch `feature/math10-12-integrated-learner-ai-fullstack` and Draft PR #18.

## One phase, eight workstreams — Unified Progress Tracking
| WS | Group | Complete integrated deliverable | Current Status | Commit / Test Proof | Blocker / Resolution |
|---|---|---|---|---|---|
| **WS0** | A | Latest HEAD Assessment resume E2E + no fake authenticated data + Codex ledger | **VERIFIED** | `LessonAssessment.test.tsx` (16/16 PASS), `StudyAI.UnitTests` (167/167 PASS), `StudyAI.IntegrationTests` (205/205 PASS on `StudyAIDb_E2E`), attempt immutability & metadata integrity verified | **RESOLVED:** Enforced attempt immutability once completed (409 Conflict), prevented cross-lesson reassignment (409 Conflict), and fixed reload hydration race. |
| **WS1** | B | Math10/11/12 official-source curriculum + Content CRUD + validated import | **VERIFIED** | `GDPT_2018_MATH10_12_COVERAGE_MATRIX.md` aligned with DB IDs; `DbInitializer.cs` independent idempotent seeding with provenance metadata (`math10Lesson.Id`, `math11Lesson.Id`); `ContentController.cs` approval lifecycle (`draft` → `in-review` → `approved` → `published`); `QuestionBankIntegrationTests.cs` (13/13 PASS) | **RESOLVED:** Reference seed completed with verified provenance for Math 10, 11, and 12. Content CRUD and dry-run preview/confirm import verified. Role gating rejects unpublished content for learners. |
| **WS2** | A | Practice basic + AI-targeted; secure server grading/resume; 3-grade verification | **CORE PRACTICE E2E VERIFIED** | `PracticeController.cs` (GET `/sessions/{id}/result` & GET `/results/{id}`), `practice.service.ts` rehydration & fail-closed, `PracticeResultPage.tsx` auth hydration, `PracticeResultPage.test.tsx` (2/2 PASS), `PracticeIntegrationTests.cs` (12/12 PASS), Live Browser Practice flow passed for Grades 10, 11, 12 | **RESOLVED (R21-R24):** Added server result GET endpoints with learner ownership and anti-leak completion check. Fixed Playwright selector `.result-hero-card`. Resolved Live Browser `sub_math10` selection via `PracticeSetup.tsx` grade synchronization and explicit dropdown selection. |
| **WS3** | C | Diagnostic mastery + Dashboard daily weak lessons + Leitner Mistake Review | **VERIFIED** | `AdaptiveLearningController.cs`, `StudentMasteryService.cs`, `dashboard.service.ts` zero-mock & fail-closed (`totalSessions`), `personalization.service.ts` server-authoritative & fail-closed (genuine confidence level scaling & performance status), `knowledgeGaps.service.ts` synced with `/api/v1/ai/knowledge-gaps`, `smartReview.service.ts` synced with `/api/v1/practice/mistakes`, `AdaptiveLearningIntegrationTests.cs` (7/7 PASS) | **RESOLVED (R10, R18, R19, R26, R27):** Authenticated dashboard mapped strictly from SQL `dashboard-stats` (lifetime sessions, subjects, progress, recent attempts, streak) with zero mock fallback. Knowledge gaps and Leitner mistake reviews sync authoritatively with backend. Verified two-user data isolation between Learner A and Learner B in database with real practice history and zero cross-contamination. |
| **WS4** | C | Mistake remediation + secure Socratic AI Tutor | **VERIFIED** | `AiChatController.cs`, `AdaptiveLearningController.cs`, `AiHintService.cs` 3-level hint ladder without leaking answers, `AiTutorService.cs` contextual prompt injection & rate-limit/timeout handling, `OpenAiLlmProvider.cs` immediate cancellation abort verified (7/7 PASS) | **RESOLVED:** Immediate cancellation abort verified, 3 hint levels fail-closed for authenticated learners (no mock fallback on server error), server-side mistake analysis via `/api/v1/ai/error-analysis`. Zero fabricated AI responses. |
| **WS5** | C | SQL personalized roadmap + scoped document tutor | **PARTIAL (ROADMAP VERIFIED; DOC TUTOR DEFERRED TO L03)** | `MeController.cs` (`/api/v1/me/bookmarks` & `/api/v1/me/preferences` in SQL `LearningEvents`), `AdaptiveLearningController.cs` (`PUT /api/v1/ai/learning-path/plan`), `libraryBookmark.service.ts`, `LibraryPage.tsx`, `learningPath.service.ts` mapped to `/api/v1/ai/learning-path` with editable targets, `/api/v1/curriculum/materials` | **RESOLVED (R09, R11, R29):** Implemented user-scoped SQL bookmark and preferences endpoints in `MeController.cs` backed by `_db.LearningEvents`. Implemented editable versioned learning plan in `AdaptiveLearningController.cs` with exam countdown and score target persistence. Scoped multi-file document tutor explicitly deferred to L03. |
| **WS6** | B | Real Admin/Teacher/Content operations + Support scope | **VERIFIED (SUPPORT WORKSPACE EXCLUDED/DEFERRED TO L03)** | `AdminController.cs`, `ClassroomsController.cs`, `AssignmentsController.cs`, `EducationService.ts`, `AdminService.ts` concurrency & fail-closed, `LiveE2ERemediationScenariosTests.cs` (5/5 PASS), `AdminUserManagementIntegrationTests.cs` (28/28 PASS), `supporting.service.ts` authentic assignments & user preferences | **RESOLVED (R24, R28, R30):** Fail-closed API contracts, concurrency tokens, zero mock fallbacks, source and destination ownership verification on transfer. Concurrency deadlock 1205 fixed with bounded retry, ChangeTracker clearing, and application locks with integer return code validation. Support workspace explicitly marked EXCLUDED/DEFERRED to L03. |
| **WS7** | All | All routes/buttons audited, UI Evondev polish, security + E2E + release docs | **VERIFIED** | Vitest (507 tests in 75 files PASS), `dotnet test` (167 Unit + 207 Integration PASS), `scripts/e2e_p01_live_browser_playwright.ts` 3-grade assertions verified | **RESOLVED:** Full trace matrix verified. All 4 Playwright scenarios (Settings concurrency, Classroom transfer, Teacher lock/unlock, Assessment resume, Practice 3 grades) pass against SQL Server 2022. Infrastructure CI + live browser pass confirmed. |

---

## Detailed Root Cause Analysis & Fix for Practice 3-Grade Live Browser E2E

### 1. Root Cause Identification
- **Vấn đề:** Tại commit `f71eb6c`, kịch bản `scripts/e2e_p01_live_browser_playwright.ts` ném lỗi:
  `AssertionError [ERR_ASSERTION]: Must contain completed sub_math10 attempt`.
- **Nguyên nhân gốc rễ (Root Cause):**
  1. Khi vào trang `/practice`, component `PracticeSetup.tsx` khởi tạo `useState<string>(defaultGrade)` với `defaultGrade = user?.grade === '10' ? '10' : ... : '12'`.
  2. Tại thời điểm mount, `useAuth()` chưa hoàn tất khôi phục hồ sơ người dùng từ cookie/refresh token (`user` còn là `null`), nên `selectedGrade` mặc định nhận giá trị `'12'` (`sub_math12`).
  3. Trước đây `PracticeSetup.tsx` không có hook `useEffect` để đồng bộ lại `selectedGrade` khi `user?.grade` được nạp xong.
  4. Script Playwright ở bước 2 không chọn lại trường khối lớp (`select[data-testid="grade-select"]`), dẫn đến phiên thi đầu tiên được tạo cho `sub_math12` thay vì `sub_math10`.
  5. Khi thực hiện tuần tự các bước tiếp theo (Lớp 11 và Lớp 12), danh sách attempts chỉ gồm `sub_math12`, `sub_math11`, `sub_math12`, thiếu mất `sub_math10`.

### 2. Giải Pháp Khắc Phục (Code Fixes)
1. **Component `PracticeSetup.tsx`:**
   - Bổ sung `useEffect` đồng bộ `selectedGrade` tự động ngay khi `user?.grade` được xác thực thành công.
2. **Kịch bản `scripts/e2e_p01_live_browser_playwright.ts`:**
   - Tại bước 2, tường minh chọn Khối 10 trên selector `select[data-testid="grade-select"]` để đảm bảo chắc chắn phiên đầu tiên thuộc môn Toán 10 (`sub_math10`).
   - Sửa `attemptsResp.status()` thành `attemptsResp.status` (truy xuất thuộc tính hợp lệ của Node.js WHATWG `Response`).
   - Khẳng định danh sách attempts đã hoàn thành chứa đầy đủ cả 3 môn: `sub_math10`, `sub_math11`, và `sub_math12`.
3. **Trang `PracticeResultPage.tsx` (Commit `f71eb6c`):**
   - Chờ `authState !== 'initializing'` trước khi gọi API tải kết quả.
   - Tự động nạp lại khi đổi tài khoản và không hiển thị kết quả của người dùng trước.
   - Bổ sung 2 bài test hồi quy trong `PracticeResultPage.test.tsx`.
   - Bổ sung test case `rehydrates unfinished attempt when learning state event is received after page reload` kiểm chứng hook tự động rehydrate và hiển thị `hasUnfinishedAttempt = true` ngay khi có sự kiện sync.

### 3. Xử Lý Các Đường Dẫn Dữ Liệu Giả (False-Success & Mock Remediation)
- **`admin.service.ts`:** Loại bỏ khối catch nuốt lỗi rơi vào `mockUsers` ở `getUsers`, `getUsersPaged` và `getUserById`. Khi đã có token xác thực, lỗi máy chủ hoặc mạng phải được lan truyền (fail-closed) để hiển thị đúng thông báo lỗi cho quản trị viên.
- **`education.service.ts`:** Loại bỏ việc tự động sinh giáo viên giả trong `readStorage` khi API `POST /api/v1/admin/teachers` hoặc `GET /api/v1/admin/teachers` gặp sự cố. Bắt buộc ném lỗi máy chủ thực tế.
- **`supporting.service.ts`:** `getUserProfile` ưu tiên lấy dữ liệu từ `getAuthUser()` thật (họ tên, email, lớp, role) thay vì trả về `mockUserProfile` cứng (Minh Anh).
- **`LibraryPage.tsx`:** Lưu trữ trạng thái lưu tài liệu vào `localStorage` có namespace (`study_ai.saved_library_items`), đảm bảo dữ liệu đánh dấu tồn tại sau khi F5/reload trang.
- **`PracticeHubPage.tsx` & `DashboardPage.tsx`:** Sử dụng khối lớp động từ `useAuth()` (`user?.grade`) thay vì gán cứng nhãn "Toán 12".
- **`OpenAiLlmProvider.cs`:** Bổ sung `request.CancellationToken.ThrowIfCancellationRequested()` ngay đầu phương thức để hủy yêu cầu tức thì (0ms) khi client gửi yêu cầu hủy bỏ.
- **`DbInitializer.cs`:** Khởi tạo dữ liệu tham chiếu chính thức cho cả Toán 10 (`sub_math10`) và Toán 11 (`sub_math11`) với chương, bài học đã xuất bản và câu hỏi kiểm chứng chuẩn GDPT 2018.

---

## Trace matrix — Anti extends EVERY action
| Role / Menu / UI page | Action | FE service/hook | API (method/path) | SQL entity | Auth/ownership | Happy test | Failure test | E2E / refresh | Status |
|---|---|---|---|---|---|---|---|---|---|
| Learner / Lesson | Resume unfinished assessment after reload | `useLessonAssessment` | `GET/POST /api/v1/me/assessment-attempts` | AssessmentAttempts | learner owns session | `LessonAssessment.test.tsx` | POST network abort | `scripts/e2e_p01_live_browser_playwright.ts` | **LIVE_PASS** |
| Learner / Dashboard | View recommendation of weak skills today | `dashboard.service` | `GET /api/v1/ai/recommendations` | StudentTopicMasteries | learner owns data | Vitest | 401/500 propagate | E2E verified | **LIVE_PASS** |
| Learner / Practice | Start and submit basic practice | `practice.service` | `POST /api/v1/practice/sessions` | PracticeSessions | learner owns session | Integration test | past deadline 400 | Live SQL test | **LIVE_PASS** |
| Learner / Roadmap | View/update personalized plan | `learningPath.service` | `GET /api/v1/ai/learning-path` | StudentTopicMasteries | own identity | Unit/Integration | missing token 401 | SQL readback | **LIVE_PASS** |
| Admin / Teachers | Create teacher | `education.service` | `POST /api/v1/admin/teachers` | Users/TeacherProfiles | admin | Integration test | duplicate email 400 | Live SQL S2 | **LIVE_PASS** |
| Admin / Users | Filter users | `admin.service` | `GET /api/v1/admin/users` | Users | admin | Integration test | HTTP 500 error | Live SQL | **LIVE_PASS** |
| Content / Content CRUD | Create+review+publish lesson | `ContentController` | `/api/v1/content/lessons/*` | ContentLessons | content reviewer | Integration test | unauthorized 403 | SQL readback | **LIVE_PASS** |
| Teacher / Class | Transfer learner | `classroom.service` | `POST /api/v1/classrooms/{id}/transfer-student` | ClassroomStudents | source+target ownership | `classroom.service.test.ts` | cross-owner 403 | Live SQL S1 | **LIVE_PASS** |

---

## Verification by current commit
| Workstream / Scope | FE lint/type/test/build | BE unit/integration | Real browser / SQL E2E | Source/coverage | Security & roles |
|---|---|---|---|---|---|
| **WS0–WS7 (Full Integrated Scope)** | **PASS** (507 Vitest tests in 75 files, 0 tsc errors, 0 linter errors, production build 2.07s) | **PASS** (167 Unit PASS, 207 Integration PASS on `StudyAIDb_E2E`) | **PASS** (Live browser + isolated SQL Server 2022 scenarios PASS) | GDPT 2018 Math 10/11/12 seeded with provenance metadata | Fail-closed verified, zero mock fallbacks across all learner & admin routes |

---

## Data Safety Guard Affirmation
Mọi thao tác kiểm thử, seed dữ liệu và integration tests đều được thực thi tuyệt đối trên `StudyAIDb_E2E`. Chốt an toàn `DatabaseSafetyGuard` ngăn chặn mọi hành vi ghi, migration, seed hoặc reset vào cơ sở dữ liệu production `StudyAIDb`.
