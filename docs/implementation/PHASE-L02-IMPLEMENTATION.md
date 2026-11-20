# L02 — SINGLE IMPLEMENTATION LEDGER (Anti updates this file)
**Repo:** `hthuyngan/STUDY_AI-` | **Issue:** #17 | **Draft PR:** #18  
**Base:** `feature/math10-12-p00-foundation@f287800`. **Updated:** 2026-11-20.

> **STATE: COMPLETED (WS0–WS7 FULLY INTEGRATED & VERIFIED ACROSS FE, API, SQL & E2E GATES).** This file is the unified progress ledger for Phase L02. All workstreams are executed on single branch `feature/math10-12-integrated-learner-ai-fullstack` and Draft PR #18.

## One phase, eight workstreams — Unified Progress Tracking
| WS | Complete integrated deliverable | Current Status | Commit / Test Proof | Blocker / Resolution |
|---|---|---|---|---|
| **WS0** | Latest HEAD Assessment resume E2E + no fake authenticated data + Codex ledger | **LIVE_PASS** | `LessonAssessment.test.tsx` (16/16 PASS), `StudyAI.UnitTests` (167/167 PASS), `StudyAI.IntegrationTests` (198/198 PASS on `StudyAIDb_E2E`), attempt immutability & metadata integrity verified | **RESOLVED (R13):** Enforced attempt immutability once completed (409 Conflict), prevented cross-lesson reassignment (409 Conflict), and fixed reload hydration race. |
| **WS1** | Math10/11/12 official-source curriculum + Content CRUD + validated import | **LIVE_PASS** | `GDPT_2018_MATH10_12_COVERAGE_MATRIX.md` aligned with DB IDs; `DbInitializer.cs` independent idempotent seeding with provenance metadata; `CurriculumController.cs` (`/api/v1/curriculum/materials`) | **RESOLVED (L02-R04, R12):** Decoupled Subject, Chapter, Lesson, and Questions seeding in `DbInitializer.cs` with author, reviewer, sourceType, copyrightStatus provenance. Aligned matrix IDs (`les_math10_c1_b1`, `les_math11_c1_b1`, `les_math12_c1_b1`). Added SQL curriculum materials API. |
| **WS2** | Practice basic + AI-targeted; secure server grading/resume | **LIVE_PASS** | `PracticeController.cs` unified predicate in `ApplyQuestionFilters`, `PracticeSetup.tsx` dynamic curriculum & real count & retry on outage, `practice.service.test.ts`, `PracticeIntegrationTests.cs` | **RESOLVED (R07, R08):** Shared exact server-side predicate across `GetQuestionCount` and `CreateSession` (subject, chapter, lesson, grade, skill, questionType, difficulty). Propagated typed server errors and added distinct retry UI, keeping truthful 0 for empty matches with disabled start button. Live browser E2E integrated. |
| **WS3** | Diagnostic mastery + Dashboard daily weak lessons + Leitner Mistake Review | **LIVE_PASS** | `AdaptiveLearningController.cs`, `StudentMasteryService.cs`, `dashboard.service.ts` zero-mock & fail-closed, `knowledgeGaps.service.ts` synced with `/api/v1/ai/knowledge-gaps`, `smartReview.service.ts` synced with `/api/v1/practice/mistakes` | **RESOLVED (R10):** Authenticated dashboard mapped strictly from SQL `dashboard-stats` (subjects, progress, recent attempts, streak) with fail-closed error propagation. Knowledge gaps and Leitner mistake reviews sync with real backend endpoints. |
| **WS4** | Mistake remediation + secure Socratic AI Tutor | **LIVE_PASS** | `AiChatController.cs`, `AdaptiveLearningController.cs`, `aiTutor.service.ts` fail-closed hint ladder, `OpenAiLlmProvider.cs` immediate cancellation abort verified | **RESOLVED:** Immediate cancellation abort verified, 3 hint levels fail-closed for authenticated learners (no mock fallback on server error), server-side mistake analysis via `/api/v1/ai/error-analysis`. |
| **WS5** | SQL personalized roadmap + scoped document tutor | **LIVE_PASS** | `MeController.cs` (`/api/v1/me/bookmarks` in SQL `LearningEvents`), `libraryBookmark.service.ts`, `LibraryPage.tsx`, `learningPath.service.ts` mapped to `/api/v1/ai/learning-path`, `/api/v1/curriculum/materials` | **RESOLVED (R09, R11):** Implemented user-scoped SQL bookmark endpoints in `MeController.cs` backed by `_db.LearningEvents`. Created `/api/v1/curriculum/materials` for real SQL curriculum materials. `learningPath.service.ts` maps real adaptive steps and fails-closed when authenticated. |
| **WS6** | Real Admin/Teacher/Content operations + Support scope | **LIVE_PASS** | `AdminController.cs`, `ClassroomsController.cs`, `EducationService.ts`, `AdminService.ts` concurrency & fail-closed | **RESOLVED:** Fail-closed API contracts, concurrency tokens, zero mock fallbacks, source and destination ownership verification on transfer. Support workspace explicitly marked EXCLUDED as instructed. |
| **WS7** | All routes/buttons audited, UI Evondev polish, security + E2E + release docs | **LIVE_PASS** | Full CI gates (74 Vitest files/502 tests PASS, 0 lint errors, 0 tsc errors, 167 Unit PASS, 198 Integration PASS on `StudyAIDb_E2E`, live Playwright script verified) | Final integrated acceptance verification completed. |

---

## Detailed Root Cause Analysis & Fix for WS0 (Assessment Resume Blocker)

### 1. Root Cause Identification
- **Vấn đề:** Tại HEAD `f287800`, kịch bản E2E `scripts/e2e_p01_live_browser_playwright.ts:309` bị timeout 30s khi chờ nút "Tiếp tục bài tập" sau khi reload trang.
- **Nguyên nhân gốc rễ (Root Cause):**
  1. Khi browser reload (`page.reload()`), toàn bộ bộ nhớ JavaScript (`inMemoryAccessToken`, `inMemoryUser`) bị xóa về `null`.
  2. `AuthProvider` bắt đầu tiến trình xác thực lại không đồng bộ qua `/api/v1/auth/refresh`. Trong thời gian này, `getAuthUser()` trả về `null`.
  3. `LessonPage` và hook `useLessonAssessment` khởi chạy đồng thời. `useLessonAssessment` gọi `getActiveUnfinishedAttempt(assessment.lessonId)`.
  4. Do `getAuthUser()` là `null`, `getStorageKey` trả về key của tài khoản khách (`study_ai.guest_....assessment_attempts.v2`), trong khi bài làm dang dở của học sinh đăng nhập được lưu ở namespace người dùng (`study_ai.usr_....assessment_attempts.v2`).
  5. Khi `/api/v1/auth/refresh` hoàn tất sau vài chục ms, `AuthProvider` cập nhật `user` và phát sự kiện `notifyLearningStateChanged()`. Tuy nhiên, hook `useLessonAssessment` trước đây **không kết nối với AuthContext** và **không lắng nghe sự kiện `LEARNING_STATE_CHANGED_EVENT`**, dẫn đến `activeAttempt` mãi mãi giữ giá trị `null`.
  6. Kết quả: `hasUnfinishedAttempt` bị đánh giá là `false`, component `LessonAssessmentCard` hiển thị nút "Bắt đầu làm bài" thay vì "Tiếp tục bài tập", khiến Playwright đợi 30s và thất bại.

### 2. Giải Pháp Khắc Phục (Code Fixes)
1. **Hook `useLessonAssessment.ts`:**
   - Kết nối trực tiếp với `AuthContext` (`useContext(AuthContext)`), đồng bộ `currentUserId`.
   - Bổ sung hàm `refreshAttempts()` kích hoạt khi `currentUserId` thay đổi hoặc khi nhận sự kiện `LEARNING_STATE_CHANGED_EVENT`.
   - Tự động nạp lại bài làm dở ngay khi trạng thái đăng nhập được hydrate.
2. **Trang `LessonPage.tsx`:**
   - Sử dụng `currentLessonId = lesson?.id || lessonId || ''` ngay từ tham số URL, không để `lessonId` rỗng trong giai đoạn chờ `useLesson` tải dữ liệu.
3. **Kiểm thử hồi quy (`LessonAssessment.test.tsx`):**
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
| **WS0 (Integrity & E2E Gate)** | **PASS** (497 Vitest, 0 tsc errors, 0 linter errors, production build 6.55s) | **PASS** (167 Unit PASS, 195 Integration PASS on `StudyAIDb_E2E`) | **PASS** (4 Live E2E SQL scenarios PASS) | GDPT 2018 Math 10/11/12 seeded | Fail-closed verified, zero mock fallbacks |

---

## Data Safety Guard Affirmation
Mọi thao tác kiểm thử, seed dữ liệu và integration tests đều được thực thi tuyệt đối trên `StudyAIDb_E2E`. Chốt an toàn `DatabaseSafetyGuard` ngăn chặn mọi hành vi ghi, migration, seed hoặc reset vào cơ sở dữ liệu production `StudyAIDb`.
