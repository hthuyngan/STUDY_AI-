# ANTIGRAVITY — Kế hoạch kiểm toán trạng thái hệ thống trước khi sửa code

> **Chế độ bắt buộc: AUDIT ONLY — KHÔNG SỬA CHỨC NĂNG, KHÔNG REFACTOR, KHÔNG MIGRATE/SEED DATABASE.**
>
> Báo cáo của Antigravity phải được commit/push lên GitHub để Codex review. Chỉ lập kế hoạch triển khai và sửa code sau khi Codex phản hồi/duyệt báo cáo.

## 1. Điểm xuất phát cố định

- Repository: `https://github.com/hthuyngan/STUDY_AI-`
- Branch: `feature/backend-redesign-modular-monolith`
- Baseline được Codex đọc: `16593c0dca1778bbf6d4645b4ee4b68f5dc774ad`
- Ngày lập yêu cầu: `2026-11-24`
- Phạm vi: toàn bộ FE, BE, hợp đồng API FE–BE, CSS/responsive, auth/RBAC, dữ liệu mock/fallback, chức năng có UI nhưng chưa có xử lý thật.
- Không đổi sang repository khác. Đây là dự án **STUDY_AI**, không phải ZhongWenHub.

Trước khi kiểm tra, Antigravity phải chạy và ghi vào báo cáo:

```bash
git fetch origin
git checkout feature/backend-redesign-modular-monolith
git pull --ff-only origin feature/backend-redesign-modular-monolith
git status --short --branch
git rev-parse HEAD
```

Nếu HEAD đã khác baseline trên, lấy HEAD mới nhất làm baseline thực tế và ghi rõ cả hai SHA. Không force-push, không sửa/xóa thay đổi của người dùng.

## 2. Mục tiêu báo cáo

Tạo một báo cáo bằng chứng, không phỏng đoán, phân loại từng luồng vào đúng một trạng thái:

1. `VERIFIED_WORKING`: đã chạy test/API/browser thật và có bằng chứng.
2. `VERIFIED_DEFECT`: tái hiện được lỗi, ghi rõ expected/actual.
3. `IMPLEMENTED_NOT_E2E_VERIFIED`: có code FE và BE nhưng chưa chứng minh được luồng thật.
4. `UI_ONLY_OR_PLACEHOLDER`: có route/trang/nút nhưng service trả rỗng, hard-code hoặc chưa có BE.
5. `TEST_ONLY_MOCK`: mock/fixture chỉ được import trong test và không lọt runtime.
6. `RUNTIME_MOCK_OR_FALSE_SUCCESS`: dữ liệu giả, fallback local, nuốt lỗi, hoặc UI báo thành công khi server chưa xác nhận.
7. `OUT_OF_SCOPE_BY_PRODUCT_DECISION`: chức năng cố ý ẩn/xóa, phải dẫn tài liệu quyết định.

Không được kết luận “toàn bộ hoạt động” chỉ từ build/unit test hoặc screenshot. Mỗi kết luận phải có file:dòng, command/test case, HTTP status và ảnh/log tương ứng.

## 3. Ảnh chụp cấu trúc hiện tại cần xác nhận

### Backend

Baseline hiện là modular monolith theo feature trong một Web project `backend/src/StudyAI.Api/StudyAI.Api.csproj` (`net10.0`), với các vùng:

- `Features/Auth`
- `Features/Student`
- `Features/Teacher`
- `Features/Content`
- `Features/Admin`
- `Features/AI`
- `Features/Public`
- `Common`, persistence/migrations và test projects bên dưới `backend/tests`

Antigravity phải đánh giá dependency direction và trách nhiệm từng lớp; không tự tách project/layer trong vòng audit. Chỉ ghi nhận các vi phạm cụ thể như controller chứa business logic, service truy cập dữ liệu chéo feature, DTO/entity lẫn nhau, DI registration thiếu, file quá lớn hoặc logic trùng.

### Frontend

Baseline là React/TypeScript, tổ chức theo `pages`, `components`, `services`, `hooks`, `auth`, `repositories`, `types`, `styles`. Phải lập ma trận:

`route/page -> hook -> FE service + method -> HTTP method/path -> BE controller/action -> service -> persistence -> auth/role -> test evidence`.

Không đánh dấu một trang “hoạt động” nếu chỉ render empty-state.

## 4. Các phát hiện Codex đã xác định — bắt buộc tái kiểm tra

Các mục dưới đây là danh sách điều tra ưu tiên, không được bỏ qua và không được âm thầm sửa trong vòng audit.

### P0 — Bằng chứng kiểm thử hiện chưa đủ tin cậy

1. `scripts/e2e_responsive_light_mode_playwright.ts` chỉ `console.log` kết quả của horizontal overflow, hamburger, drawer, collapse button; nhiều điều kiện sai không `throw`/`expect`, nên script vẫn có thể thoát thành công khi UI lỗi.
2. Script mở `/admin`, `/teacher`, `/content` nhưng phải chứng minh nó đang dùng auth/RBAC thật hay prototype bypass. Báo cáo cần ghi chính xác env `VITE_UI_PROTOTYPE_MODE` và trạng thái đăng nhập, không đưa token/secret vào log.
3. Ảnh screenshot chỉ là bằng chứng render, không chứng minh CRUD, ownership, persistence hoặc xử lý lỗi API.

Logic sửa dự kiến sau khi Codex duyệt: chuyển mọi invariant quan trọng thành assertion làm test fail; chạy riêng standard mode với API thật và prototype mode; lưu trace/screenshot chỉ khi cần; thêm happy/401/403/500/empty/refresh/two-user cases.

### P0 — Mock/hard-code runtime trong WorkspaceShell

Kiểm tra `frontend/src/components/layout/WorkspaceShell.tsx`:

- Badge thông báo `3`, `3 mới`, nội dung “2 học liệu”, “5 bài tập”, “14 mục vận hành”, thời gian và trạng thái hạ tầng đều hard-code.
- Tên/email fallback `Nhân viên`, `staff@study-ai.edu.vn` có nguy cơ hiển thị như dữ liệu người dùng thật.
- Workspace switcher phải được kiểm tra server-side authorization; ẩn menu không thay thế được 403 từ BE.

Logic sửa dự kiến: tạo notification API/hook thật hoặc hiển thị empty/unavailable trung thực; không bịa count/timestamp; user identity chỉ lấy từ session `/auth/me`; mọi workspace/action vẫn phải bị BE authorize.

### P0 — Chức năng có UI nhưng chưa được triển khai thật

1. `frontend/src/services/supporting.service.ts::getExercises()` luôn `return []`, trong khi `frontend/src/pages/Exercises/ExercisesPage.tsx` vẫn trình bày “Ngân hàng bài tập”. Phân loại `UI_ONLY_OR_PLACEHOLDER` cho tới khi chứng minh API thật.
2. `getAchievements()` luôn trả `[]` và comment xác nhận BE chưa persist achievement. Trang `AchievementsPage` chỉ có empty-state, chưa phải chức năng thành tích hoạt động.
3. `studyNotes.service.ts` và trang `MyNotesPage` CRUD hoàn toàn bằng `localStorage`. Phải quyết định rõ đây là guest-local feature hợp lệ hay dữ liệu tài khoản cần đồng bộ BE. Nếu là dữ liệu người dùng sau đăng nhập, hiện chưa có persistence đa thiết bị/ownership phía server.
4. Kiểm tra tương tự bookmarks/settings/profile và tất cả service có `localStorage` để phân biệt guest draft hợp lệ với runtime fallback sai.

Logic sửa dự kiến: định nghĩa contract và ownership; thêm endpoint/entity/migration chỉ khi product requirement cần persistence; FE dùng API khi authenticated, local-only chỉ cho guest với nhãn rõ và migration có kiểm soát; API failure phải là error/retry, không giả thành danh sách rỗng.

### P0 — Nuốt lỗi làm người dùng hiểu nhầm “không có dữ liệu”

`frontend/src/services/supporting.service.ts::getLibraryItems()` bắt mọi lỗi và trả `[]`; `getUserProfile()` bỏ qua lỗi dashboard stats rồi điền số 0. Rà soát toàn bộ `catch { return [] }`, `catch {}`, default object và fallback local trong runtime.

Logic sửa dự kiến: chỉ map 404/204 thành empty khi contract quy định; 401/403/5xx/network phải giữ status có cấu trúc cho UI; không hiển thị số 0 như dữ liệu thật khi request thất bại.

### P1 — Mock data còn nằm trong production bundle path

1. `frontend/src/services/education.service.ts` import trực tiếp `@/data/mock/education.mock` và chứa nhánh local CRUD. Dù hiện được giới hạn bởi `NODE_ENV === 'test'`, cần chứng minh bundler không đưa dữ liệu này vào production hoặc tách fixture sang test-only module.
2. `frontend/src/services/operations.service.ts` chứa `DEFAULT_APPROVALS`, `DEFAULT_PUBLICATIONS`, `DEFAULT_ANNOUNCEMENTS`, `DEFAULT_AUDIT_LOGS` với tên người, nội dung và ngày giả; đồng thời có localStorage helpers và `_resetMockState`.
3. `frontend/src/services/content.service.ts` vẫn public `_resetMockState`; `AdminSettingsPage.tsx` vẫn gọi reset mock trong test branch.
4. Dùng dependency graph/build output để phân biệt test-only mock với runtime-imported mock. Không xóa fixture test cần thiết; di chuyển nó ra khỏi runtime graph.

Logic sửa dự kiến: production services chỉ chứa API contract/mapping; fixture đặt trong `test/fixtures` hoặc test factories; demo/prototype adapter tách module và không thể bật ở production; standard mode fail closed.

### P1 — Cấu hình/prototype và dữ liệu quản trị

Kiểm tra `frontend/src/config/prototype.ts`, `RoleGuard.tsx`, `PermissionGuard.tsx` và toàn bộ env:

- `FRONTEND_PROTOTYPE_MODE` mặc định false là hướng đúng, nhưng `window.__STUDY_AI_PROTOTYPE_MODE__` và env có thể bật bypass.
- Chứng minh production build không cho runtime override vượt auth/RBAC.
- Mọi CRUD admin/content/teacher phải gọi API thật; khi mất token phải redirect/login hoặc 401, không ghi localStorage rồi báo thành công.

### P1 — CSS/responsive/light-mode

1. `frontend/src/main.tsx` cưỡng chế `data-theme='light'`, nhưng codebase vẫn còn nhiều `[data-theme='dark']` selector và type/prop dark. Phân loại dead CSS hay yêu cầu tương lai; không xóa hàng loạt nếu chưa đo ảnh hưởng.
2. Rà các breakpoint `1023/1024`, fixed overlay, z-index, focus trap, keyboard Escape, body scroll lock và horizontal overflow ở 375, 390, 768, 1024, 1366, 1920.
3. Các bảng/filter có `min-width`/`overflow-x` không tự động là lỗi; chỉ báo lỗi khi đo được overflow ngoài container, che nút hoặc không thao tác được.
4. Kiểm tra contrast, focus-visible, aria-expanded/dialog, reduced-motion và zoom 200%.

Logic sửa dự kiến: dùng token và component hiện có; sửa đúng selector/component gây lỗi; không đổi thiết kế toàn hệ thống trong một patch; assertion responsive phải fail thật khi vi phạm.

### P1 — Backend business logic hard-code

Rà `backend/src/StudyAI.Api/Features/Student/LearningRecommendationService.cs`, đặc biệt danh sách prerequisite tiếng Việt hard-code theo chủ đề và fallback “Khái niệm...” để xác định đây là rule chính thức hay dữ liệu giả. Rà `FakeLlmProvider` và cấu hình `llmProvider=fake`: chỉ được dùng test/dev được kiểm soát, không tạo câu trả lời giả trong standard production.

Logic sửa dự kiến: dữ liệu học thuật thuộc curriculum/persistence/config có provenance; provider fake chỉ đăng ký trong test/dev rõ ràng; trạng thái AI chưa cấu hình phải hiển thị unavailable, không giả thành success.

### P1 — Database safety

- Tuyệt đối không chạy migration/seed/write test lên `StudyAIDb`.
- Test có ghi chỉ dùng `StudyAIDb_E2E` hoặc DB disposable được `DatabaseSafetyGuard` cho phép.
- Trước bất kỳ integration test nào phải log **chỉ tên database đã resolve**, không log connection string/password.
- Xác minh startup Development trỏ E2E; không “sửa” guard để cho phép production DB.

## 5. Ma trận chức năng bắt buộc

Antigravity phải báo cáo tối thiểu các nhóm sau:

| Nhóm | Luồng cần kiểm tra |
|---|---|
| Auth | register, login, refresh, logout, `/me`, token memory-only, session refresh |
| Guest | trang công khai, không lộ tiến độ/user data, prompt đăng nhập đúng |
| Learner | dashboard, curriculum/lesson/video, progress, quiz/assessment, practice, AI tutor, notes/bookmarks, library, profile/settings |
| Teacher | classrooms, students, assignments, submissions, grading, analytics, recommendations |
| Content | subjects, chapters/topics, lessons/videos, questions, assessments, review/publish workflow, import dry-run/apply |
| Admin | dashboard, users/RBAC, teachers, approvals/publications, announcements, audit log, settings, system health/AI |
| Security | 401, 403, ownership chéo hai user, role escalation, direct URL/API access |
| Resilience | 400/404/409/500/network timeout, empty, refresh, duplicate submit/idempotency |
| UI | loading/error/empty/success, mobile/tablet/desktop, keyboard, focus, overflow, light mode |

Mỗi hàng kết quả phải có: ID, severity, classification, route, file:dòng FE, endpoint, file:dòng BE, steps, expected, actual, evidence, root cause, phạm vi sửa tối thiểu, test hồi quy cần thêm.

## 6. Cổng kiểm tra kỹ thuật

Chạy từ checkout sạch. Nếu thiếu Bun/.NET/SQL/Playwright, ghi `BLOCKED_BY_ENVIRONMENT`; không được biến báo cáo cũ thành kết quả vừa xác minh.

```bash
# FE
cd frontend
bun install --frozen-lockfile
bun run lint
bun x tsc -b
bun run test
bun run build

# BE: build/unit trước; integration chỉ sau khi xác nhận DB an toàn
cd ../backend
dotnet restore StudyAI.sln
dotnet build StudyAI.sln -c Release --no-restore
dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj -c Release --no-build
# Chỉ chạy IntegrationTests khi database resolved chính xác là StudyAIDb_E2E/disposable.
```

Codex tại baseline này **không thể tái chạy** các lệnh trên vì môi trường review không có `bun` và `dotnet`. Do đó các tuyên bố trước như lint/545 tests/build pass chỉ là báo cáo từ tác nhân trước, trạng thái `CLAIMED_NOT_INDEPENDENTLY_VERIFIED` cho đến khi Antigravity đính kèm log mới từ đúng SHA.

## 7. Deliverable vòng 1 — chỉ báo cáo

Tạo file mới:

`docs/audit/ANTIGRAVITY_CURRENT_SYSTEM_STATUS_REPORT.md`

Cấu trúc bắt buộc:

1. Baseline SHA, máy/env, DB name an toàn.
2. Executive summary theo số lượng từng classification/severity.
3. Sơ đồ cấu trúc FE/BE hiện tại và dependency vi phạm có bằng chứng.
4. Ma trận route–API–controller đầy đủ.
5. Danh sách chức năng verified working.
6. Danh sách defect tái hiện được.
7. Danh sách UI-only/placeholder/chưa triển khai.
8. Runtime mock/false success và test-only fixture tách riêng.
9. CSS/accessibility/responsive findings.
10. Auth/RBAC/ownership/security findings.
11. Test commands + exit code + log/ảnh/trace path.
12. Kế hoạch sửa đề xuất theo P0/P1/P2: mỗi task giới hạn file, logic, acceptance criteria và regression tests.
13. Mục `QUESTIONS_FOR_CODEX` cho những điểm chưa đủ yêu cầu sản phẩm.

Không thay đổi file runtime, migration, snapshot hoặc dữ liệu. Commit chỉ được chứa báo cáo/evidence text cần thiết; không commit secret, build artifact, `node_modules`, token, connection string, hoặc hàng nghìn ảnh mới.

## 8. Push và cổng Codex review

Sau khi hoàn tất vòng audit:

```bash
git status --short
git diff --check
git add docs/audit/ANTIGRAVITY_CURRENT_SYSTEM_STATUS_REPORT.md
git commit -m "docs(audit): report current FE BE system status for Codex review"
git fetch origin
git rebase origin/feature/backend-redesign-modular-monolith
git push origin HEAD:feature/backend-redesign-modular-monolith
git status --short --branch
git rev-parse HEAD
```

Phản hồi cho người dùng đúng 5 mục: repository, branch, commit SHA, link file báo cáo, trạng thái working tree. Sau đó **DỪNG** và yêu cầu Codex review. Không bắt đầu sửa code, không mở rộng kiến trúc, không merge PR trước review.

## 9. Definition of Done cho vòng audit

- Không có thay đổi runtime/DB.
- Không có kết luận hoạt động nếu thiếu bằng chứng.
- Mock test và mock runtime được tách đúng.
- Mọi chức năng hiện diện trong UI đều có trạng thái rõ ràng.
- Mọi defect có vị trí file và logic sửa tối thiểu, không yêu cầu “refactor toàn bộ”.
- Report đã push đúng branch và có SHA để Codex review.
- Antigravity dừng sau push, chờ Codex phản hồi rồi mới lập/triển khai plan sửa.
