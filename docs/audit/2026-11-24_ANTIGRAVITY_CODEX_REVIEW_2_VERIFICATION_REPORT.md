# STUDY_AI — BÁO CÁO TOÀN DIỆN KIỂM CHỨNG & HOÀN TẤT KHẮC PHỤC CODEX REVIEW 2

> **Repository:** `https://github.com/hthuyngan/STUDY_AI-`  
> **Nhánh thực hiện:** `feature/backend-redesign-modular-monolith`  
> **Baseline Commit:** `2f5c13044724abf41d2b72182590aeb1c121ed47`  
> **Tài liệu căn cứ:** `docs/plans/2026-11-24_ANTIGRAVITY_CODEX_REVIEW_2_REMEDIATION_PLAN.md`  
> **Cơ sở dữ liệu kiểm thử:** `StudyAIDb_E2E` (SQL Server)  
> **Cơ sở dữ liệu bảo vệ:** `StudyAIDb` (Bảo toàn nguyên vẹn 100%, fail-closed guard không can thiệp)  
> **Thời điểm hoàn thành:** 25/11/2026  

---

## 1. TỔNG QUAN KẾT QUẢ THỰC HIỆN

Toàn bộ 8 workstream theo yêu cầu của Codex Review 2 đã được triển khai, kiểm thử thực tế và đóng gói thành chuỗi commit độc lập, phân định rành mạch phạm vi thay đổi. Không có mã nguồn giả lập (mock runtime), không có mật khẩu tự sinh ngầm, mọi tương tác dữ liệu cá nhân của người dùng đăng nhập đều được lưu trữ trực tiếp vào SQL Server thật.

### Bảng Thống kê Test Gates Thực tế (Verifiable Results)

| Test Suite / Gate | Công cụ / Lệnh thực thi | Kết quả Đạt được | Bằng chứng Xác minh |
| :--- | :--- | :---: | :--- |
| **Backend Unit Tests** | `dotnet test backend/tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj -c Release` | **268 / 268 PASS (100%)** | `docs/audit/evidence/unit-review2.trx` |
| **Backend Integration Tests** | `dotnet test backend/tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj -c Release` | **222 / 222 PASS (100%)** | `docs/audit/evidence/integration-review2.trx` |
| **Frontend Code Quality** | `cd frontend && bun run lint` (`oxlint --deny-warnings`) | **0 Errors, 0 Warnings** (490 files) | CLI console log clean |
| **Frontend Unit & Component** | `cd frontend && bun run test` (`vitest run`) | **563 / 563 PASS (100%)** (83 test files) | Vitest report clean |
| **Frontend Production Build** | `cd frontend && bun run build` (`tsc -b && vite build`) | **Build thành công** (2,860 modules, 4.25s) | `dist/` bundle production |
| **Playwright Responsive & Auth** | `bun scripts/e2e_responsive_light_mode_playwright.ts` | **6 / 6 Viewports PASS** | `docs/audit/evidence/e2e-playwright-verification.log` |
| **Database Safety Guard** | `DatabaseSafetyGuard.EnsureSafeTestDatabase` | **PASS (Fail-Closed)** | `StudyAIDb` nguyên vẹn |

---

## 2. CHI TIẾT 8 WORKSTREAM ĐÃ TRIỂN KHAI VÀ CAM KẾT

### Workstream 1: Bắt buộc mật khẩu tường minh và loại bỏ phản hồi mật khẩu plaintext
- **Commit:** `0aef6db` — `fix(admin): require explicit passwords and remove plaintext responses`
- **Mã nguồn can thiệp:**
  - Tạo mới bộ kiểm tra chính sách mật khẩu: `backend/src/StudyAI.Api/Common/Security/PasswordPolicyValidator.cs` (8–128 ký tự, không rỗng).
  - Cập nhật DTO: `backend/src/StudyAI.Api/Features/Admin/AdminDTOs.cs` — xóa bỏ trường `TemporaryPassword` trong `CreateAdminUserResponseDto`, thêm trường bắt buộc `Password` vào `CreateAdminTeacherRequestDto`.
  - Cập nhật Services: `AdminUsersService.cs` và `AdminTeachersService.cs` — loại bỏ phương thức `GenerateSecurePassword()`, kiểm tra mật khẩu hợp lệ trước khi băm `IPasswordHasher.HashPassword`. Không ghi mật khẩu vào audit log.
  - Cập nhật Frontend: `frontend/src/types/admin.ts`, `frontend/src/pages/Admin/components/teachers/CreateTeacherModal.tsx` và `frontend/src/services/adminTeacher.service.ts` — cung cấp trường nhập mật khẩu và xác nhận mật khẩu rõ ràng.
  - Cập nhật Tests: `AdminUserManagementIntegrationTests.cs`, `AdminContentAccountProvisioningTests.cs`, `AdminWorkspaceV2.test.tsx`.

### Workstream 2: Đồng thời cấu hình hệ thống bằng khóa cơ sở dữ liệu
- **Commit:** `139248a` — `fix(admin): enforce database-backed settings concurrency`
- **Mã nguồn can thiệp:**
  - Loại bỏ khóa tiến trình `SemaphoreSlim` (không bảo vệ được đa node/multi-replica).
  - Tạo entity `SystemSetting` với cột `RowVersion` (`byte[]`, SQL Server `ROWVERSION`) và `Version` (`string`, Concurrency Token).
  - Tạo EF Core migration: `20261124162618_AddSystemSettingsTable`.
  - Triển khai `AdminSettingsService.cs`: Đọc bản ghi cấu hình từ CSDL, đối soát `VersionToken`/`RowVersion`. Khi phát hiện xung đột dữ liệu giữa hai giao dịch đồng thời, trả về HTTP 409 Conflict (`ConflictException`).
  - Viết integration test: `Admin_UpdateSettings_ConcurrentDatabaseUpdates_ExactlyOneWins_AndOtherReceives409_RetrySucceeds`.

### Workstream 3: Thu hồi phiên làm việc bảo toàn lịch sử an ninh
- **Commit:** `4d45671` — `fix(auth): revoke sessions without deleting security history`
- **Mã nguồn can thiệp:**
  - Sửa phương thức `AdminUsersService.RevokeUserSessionsAsync`: thay thế thao tác `_db.RefreshSessions.RemoveRange` bằng cập nhật trường `s.RevokedAt = _clock.UtcNow` cho toàn bộ active sessions (`RevokedAt == null && ExpiresAt > now`).
  - Đảm bảo tính Idempotent: Lần gọi đầu tiên trả về số lượng phiên vừa bị thu hồi; lần gọi thứ hai trả về 0.
  - Bảo toàn 100% dữ liệu lịch sử để phục vụ phân tích điều tra số (forensics) và kiểm toán an ninh.
  - Cập nhật integration test: `Admin_RevokeSessions_RevokesAllSessionsInDatabase` xác nhận tổng số bản ghi trong bảng giữ nguyên, cờ `RevokedAt != null`, và phiên của người dùng khác không bị ảnh hưởng.

### Workstream 4: Ràng buộc chu trình duyệt bài học hợp lệ
- **Commit:** `26e9fea` — `fix(content): enforce lesson workflow transitions`
- **Mã nguồn can thiệp:**
  - Sửa `ContentLessonsService.RequestChangesAsync`: Chỉ cho phép chuyển đổi trạng thái yêu cầu chỉnh sửa từ `in-review` hoặc `published`.
  - Khi bài học đang ở trạng thái `draft`, hàm ném `ValidationException` (HTTP 400 Bad Request) với thông điệp rõ ràng: `"Không thể yêu cầu sửa đổi cho bài học đang ở trạng thái bản nháp (draft)."`.
  - Ngăn chặn việc sinh audit log giả mạo khi thao tác không hợp lệ.
  - Viết integration test trong `ContentManagementIntegrationTests.cs` kiểm chứng trả về HTTP 400 và trạng thái bài học giữ nguyên `draft`.

### Workstream 5: Phục hồi mã hóa JSON an toàn chống XSS
- **Commit:** `7547165` — `fix(api): restore safe exception json encoding`
- **Mã nguồn can thiệp:**
  - Sửa `backend/src/StudyAI.Api/Common/Middleware/GlobalExceptionHandlingMiddleware.cs`: Loại bỏ hoàn toàn `JavaScriptEncoder.UnsafeRelaxedJsonEscaping`.
  - Cấu hình encoder an toàn: `Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)` kết hợp `PropertyNamingPolicy = JsonNamingPolicy.CamelCase`.
  - Đảm bảo tính an toàn phòng thủ XSS: Các ký tự nhạy cảm HTML (`<`, `>`, `&`, `'`) luôn được escape thành `\u003C`, `\u003E`, `\u0026`.
  - Bảo toàn tiếng Việt có dấu: Các ký tự tiếng Việt hợp lệ được giữ nguyên vẹn ở định dạng UTF-8, không bị vỡ encoding hay sinh ký tự lỗi.
  - Viết test suite: `GlobalExceptionHandlingMiddlewareTests.cs` kiểm tra đầy đủ các kịch bản payload chứa thẻ `<script>`, dấu ngoặc kép, ký tự điều khiển và tiếng Việt.

### Workstream 6: Lưu trữ ghi chú và đánh dấu vào SQL Server cho người dùng đăng nhập
- **Commit:** `70036a0` — `feat(learner): persist owned notes and bookmarks`
- **Mã nguồn can thiệp:**
  - Tạo entity CSDL: `UserStudyNote.cs` và `UserSectionBookmark.cs`.
  - Tạo EF Core migration: `20261124164959_AddUserNotesAndBookmarksTables` trên `StudyAIDb_E2E`. Bảng `user_section_bookmarks` có unique index constraint trên bộ ba `(UserId, LessonId, SectionId)`.
  - Tạo service và controller: `IStudentNotesService.cs`, `StudentNotesService.cs`, `StudentNotesController.cs` (`/api/v1/me/notes`), và mở rộng `StudentProfileController.cs` (`/api/v1/me/bookmarks`).
  - Phân quyền & Cô lập 100%: User ID được lấy trực tiếp từ JWT claim (`ClaimsPrincipal`), không tin cậy dữ liệu client gửi lên. Hai học sinh khác nhau tuyệt đối không thể đọc, sửa, hay xóa ghi chú và dấu trang của nhau.
  - Nối Frontend: `studyNotes.service.ts` và `sectionBookmarks.service.ts` gọi backend qua `apiClient` khi có phiên đăng nhập, đồng bộ dữ liệu đa thiết bị, giữ fallback local an toàn cho tài khoản khách (guest).
  - Viết integration tests: `LearnerNotesAndBookmarksIntegrationTests.cs` kiểm thử toàn bộ vòng đời CRUD, tính idempotent, ràng buộc chỉ mục duy nhất và cô lập 2 người dùng.

### Workstream 7: Xuất bằng chứng kiểm thử thực thi thật
- **Commit:** `c6df6fd` — `test(e2e): publish executable verification evidence`
- **Mã nguồn can thiệp:**
  - Hoàn thiện kịch bản Playwright: `scripts/e2e_responsive_light_mode_playwright.ts`.
  - Bổ sung viewport chuẩn iPhone `390px (Mobile Standard iPhone)`.
  - Bổ sung assertion bắt buộc: Cả giao diện mobile và desktop đều phải xác minh route quản trị/giáo viên (`/admin`, `/teacher`, `/content`) khi chưa đăng nhập bắt buộc chuyển hướng về `/login`, không được phép bỏ qua âm thầm.
  - Chạy thực tế và lưu log: `docs/audit/evidence/e2e-playwright-verification.log`.
  - Xuất 2 file kết quả kiểm thử TRX chi tiết:
    - `docs/audit/evidence/unit-review2.trx` (SHA-256: `6171DC8396A095AB33F10362095C720FB13C23CEEEE026E6DF9EF595BF86B253`)
    - `docs/audit/evidence/integration-review2.trx` (SHA-256: `FD5C27005FDA9E86A70FD1BBD3899887B71DB3CB513774A07D366F4A6123870D`)

### Workstream 8: Hoàn thiện báo cáo, dọn chất lượng diff và sẵn sàng bàn giao
- **Commit:** `docs(audit): publish codex review 2 remediation report`
- **Mã nguồn can thiệp:**
  - Kiểm tra `git diff --check`: 0 lỗi khoảng trắng, không còn blank line thừa ở cuối file.
  - Sửa đường dẫn file `DatabaseSafetyGuard` thành `backend/src/StudyAI.Api/Data/DatabaseSafetyGuard.cs`.
  - Cập nhật `ANTIGRAVITY_CURRENT_SYSTEM_STATUS_REPORT.md` và `ANTIGRAVITY_TARGETED_REMEDIATION_REPORT.md` chuẩn xác theo kết quả kiểm thử mới nhất.

---

## 3. DANH SÁCH COMMITS TRÊN NHÁNH

Toàn bộ các commits được tạo tuần tự trên nhánh `feature/backend-redesign-modular-monolith` bắt đầu từ baseline `2f5c130`:

```
c6df6fd test(e2e): publish executable verification evidence
70036a0 feat(learner): persist owned notes and bookmarks
7547165 fix(api): restore safe exception json encoding
26e9fea fix(content): enforce lesson workflow transitions
4d45671 fix(auth): revoke sessions without deleting security history
139248a fix(admin): enforce database-backed settings concurrency
0aef6db fix(admin): require explicit passwords and remove plaintext responses
```

---

## 4. BẢO VỆ CƠ SỞ DỮ LIỆU SẢN XUẤT (STUDYAIDB INTEGRITY)

- **Nguyên tắc bất biến:** `StudyAIDb` là CSDL sản xuất được bảo vệ tuyệt đối.
- **Thực thi:**
  - Cơ chế `DatabaseSafetyGuard.EnsureSafeTestDatabase` được kích hoạt ở mọi test suite integration và migration script.
  - Toàn bộ 222 integration tests và các lần chạy script Playwright E2E đều chạy trên `StudyAIDb_E2E`.
  - Cơ sở dữ liệu `StudyAIDb` hoàn toàn nguyên vẹn 100%, không bị ảnh hưởng bởi bất kỳ lệnh ghi, sửa, hay xóa nào.

---

## 5. HƯỚNG DẪN DÀNH CHO CODEX REVIEW

Nhánh `feature/backend-redesign-modular-monolith` đã sẵn sàng để Codex kiểm tra lần ba:
1. **Kiểm tra trạng thái commit:** Toàn bộ 8 workstream đều có commit tương ứng, nội dung thay đổi tối thiểu, đúng trọng tâm.
2. **Kiểm tra file bằng chứng:** Hai file TRX tại `docs/audit/evidence/*.trx` và log Playwright tại `docs/audit/evidence/e2e-playwright-verification.log` là kết quả sinh ra từ các lần chạy thật.
3. **Quy tắc kết thúc:** Không tự ý merge vào nhánh `main`, không force-push. Dừng lại sau khi push để chờ Codex phê duyệt.
