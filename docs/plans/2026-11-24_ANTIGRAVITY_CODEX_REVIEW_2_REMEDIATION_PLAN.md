# STUDY_AI — Antigravity remediation plan after Codex review 2

> Repository duy nhất: `https://github.com/hthuyngan/STUDY_AI-`  
> Branch thực thi: `feature/backend-redesign-modular-monolith`  
> Baseline đã review: `5c96f2997bf88f221e3c55c77c3a1175e5ff6fbb`  
> Trạng thái review: **CHANGES REQUESTED — không merge**  
> Quyết định của chủ dự án: **bỏ hoàn toàn chức năng tự sinh mật khẩu** và chấp thuận các finding còn lại của Codex.

## 1. Mục tiêu và giới hạn

Antigravity phải tự thực hiện đúng các workstream trong tài liệu này, sửa đúng root cause, kiểm thử đầy đủ và đẩy code cùng báo cáo lên chính branch nêu trên để Codex review lại. Không refactor lan man, không đổi route/contract ngoài phạm vi, không làm suy yếu bảo mật để ép test xanh và không tuyên bố PASS khi chưa có log hoặc CI artifact.

Tuyệt đối không ghi, migrate, seed, reset, restore hoặc chạy write-test vào database được bảo vệ `StudyAIDb`. Migration và integration/E2E chỉ được chạy trên `StudyAIDb_E2E` hoặc database disposable đã qua `DatabaseSafetyGuard`.

## 2. Preflight bắt buộc

```bash
git fetch origin
git checkout feature/backend-redesign-modular-monolith
git pull --ff-only origin feature/backend-redesign-modular-monolith
git status --short --branch
git rev-parse HEAD
git remote -v
```

Dừng và báo blocker nếu repository không phải `hthuyngan/STUDY_AI-`, branch sai, HEAD không chứa baseline ở trên, worktree có thay đổi không thuộc nhiệm vụ hoặc database test không resolve chính xác tới `StudyAIDb_E2E`/disposable database.

Đọc đầy đủ trước khi sửa:

- `AGENTS.md`
- `docs/plans/ANTIGRAVITY_TARGETED_REMEDIATION_EXECUTION_PLAN.md`
- `docs/audit/ANTIGRAVITY_TARGETED_REMEDIATION_REPORT.md`
- `docs/audit/ANTIGRAVITY_CURRENT_SYSTEM_STATUS_REPORT.md`
- tài liệu này.

Chạy `git diff --check b7206009307a0cb13069c7a6cff0261c316489c0..HEAD` và ghi nhận lỗi whitespace hiện có trước khi bắt đầu.

## 3. Workstream 1 — Bỏ toàn bộ mật khẩu tự sinh và không trả mật khẩu thô

### Phạm vi phải kiểm tra

- `backend/src/StudyAI.Api/Features/Admin/AdminDTOs.cs`
- `backend/src/StudyAI.Api/Features/Admin/AdminUsersService.cs`
- `backend/src/StudyAI.Api/Features/Admin/AdminTeachersService.cs`
- `backend/src/StudyAI.Api/Features/Admin/IAdminUsersService.cs`
- controllers Admin tương ứng
- `frontend/src/components/admin/AdminUserFormDialog.tsx`
- `frontend/src/components/admin/AdminResetPasswordDialog.tsx`
- `frontend/src/pages/Admin/AdminUsersPage.tsx`
- `frontend/src/pages/Admin/AdminTeachersPage.tsx`
- `frontend/src/services/admin.service.ts`
- `frontend/src/types/admin.ts`
- unit, component và integration tests liên quan.

### Contract bắt buộc

1. Tạo tài khoản Admin/User/Teacher bắt buộc client gửi `Password`; chuỗi null, rỗng hoặc chỉ whitespace trả `400` với field error ổn định. Không còn nhánh gọi `GenerateSecurePassword()`.
2. Đặt lại mật khẩu bắt buộc gửi `NewPassword`; request body null, thiếu field, rỗng hoặc chỉ whitespace trả `400`. Không còn chế độ “để trống để tự tạo”.
3. Áp dụng cùng một password policy server-side cho create, reset và registration: tối thiểu 8, tối đa 128 ký tự. Nếu hệ thống có policy dùng chung thì tái sử dụng; nếu chưa có, trích một validator nhỏ dùng chung thay vì sao chép điều kiện ở nhiều service.
4. Không trả mật khẩu thô trong bất kỳ response nào. Xóa `TemporaryPassword` khỏi `CreateUserResponseDto`, `ResetPasswordResponseDto`, DTO tạo giáo viên và type FE tương ứng. Response chỉ gồm user/result metadata và message không chứa secret.
5. Không ghi mật khẩu vào audit, log, exception, toast hoặc test artifact. Chỉ lưu hash qua `IPasswordHasher`.
6. FE bắt buộc nhập mật khẩu và xác nhận mật khẩu ở form tạo tài khoản và form reset. Chặn submit khi thiếu, không khớp hoặc sai độ dài; server vẫn là authority. Xóa placeholder, ghi chú, dialog copy và clipboard logic liên quan tới mật khẩu tự sinh.
7. Sau reset thành công, thu hồi các phiên đang hoạt động theo Workstream 3 nhưng không xóa lịch sử session.
8. Tìm toàn repo bằng `rg` và xóa đúng các dấu vết runtime `GenerateSecurePassword`, `TemporaryPassword`, `temporaryPassword`, “để trống để tự động tạo”. Fixture test có thể dùng mật khẩu xác định trực tiếp, nhưng không được phục hồi tính năng sinh mật khẩu.

### Regression tests

- Create user/teacher: thiếu password, whitespace, dưới 8, trên 128, hợp lệ, duplicate email.
- Reset: body null, thiếu `NewPassword`, whitespace, dưới 8, trên 128, hợp lệ.
- FE: required + confirm mismatch + API 400 + success; không có UI hiển thị/copy password.
- Response JSON của create/reset/teacher không có `temporaryPassword` và không chứa plaintext đã gửi.
- Đăng nhập bằng password Admin đã nhập thành công; password cũ sau reset thất bại; session cũ bị revoke.

Không sửa test bằng cách giữ field `TemporaryPassword` chỉ để các test cũ tiếp tục pass. Viết lại test theo contract đã được chủ dự án phê duyệt.

## 4. Workstream 2 — Settings concurrency phải đúng khi chạy nhiều API instance

### Root cause đã xác nhận

`AdminSettingsService.cs` dùng `static SemaphoreSlim`. Cơ chế này chỉ tuần tự hóa trong một process, không bảo vệ hai API instance/host và không phải optimistic concurrency ở database.

### Logic sửa

1. Bỏ việc coi `static SemaphoreSlim` là chốt correctness. Thiết kế một bản ghi cấu hình hiện hành có concurrency token do SQL Server kiểm soát (`rowversion`/`timestamp`) hoặc atomic compare-and-swap tương đương.
2. Không dùng “đọc latest audit log rồi ghi audit log mới” như nguồn trạng thái duy nhất. Audit log là lịch sử; current settings phải có authoritative row với version rõ ràng.
3. Request update phải mang version/ETag hiện tại. Một câu lệnh cập nhật atomic chỉ thành công khi version khớp; stale writer trả `409`, không ghi đè và không tạo audit success giả.
4. Ghi current state và audit entry trong cùng transaction. Retry chỉ cho transient DB error, không retry một concurrency conflict thành success.
5. Nếu cần entity/migration mới, cập nhật `StudyAIDbContext`, model snapshot và migration nhỏ nhất. Chỉ apply/test trên `StudyAIDb_E2E` hoặc disposable DB; không apply `StudyAIDb`.
6. Thêm test chạy hai service scopes/DbContexts độc lập đồng thời, không dùng chung in-process lock. Chứng minh đúng một write thắng, write còn lại nhận `409`, sau đó retry bằng version mới thành công.

Files trọng tâm: `AdminSettingsService.cs`, DTO/controller/settings tests, `StudyAIDbContext.cs`, entity/migration nếu cần.

## 5. Workstream 3 — Revoke session phải bảo toàn lịch sử bảo mật

### Root cause đã xác nhận

`AdminUsersService.RevokeUserSessionsAsync` đang `RemoveRange` toàn bộ `RefreshSession`. Việc xóa vật lý làm mất audit/history và làm yếu cơ chế phát hiện reuse token vốn dựa vào `RevokedAt`.

### Logic sửa

1. Chỉ lấy các session còn hoạt động (`RevokedAt == null`, và áp dụng điều kiện active hiện có nếu contract quy định).
2. Gán `RevokedAt = _clock.UtcNow` cho các session đó; không xóa record.
3. `revokedCount` là số session vừa chuyển từ active sang revoked. Gọi lại phải idempotent và trả 0.
4. Password reset và nút revoke session tái sử dụng cùng logic; không tạo hai chuẩn khác nhau.
5. Sửa integration test đang assert tổng record bằng 0: assert active count bằng 0, revoked rows vẫn tồn tại, timestamp có giá trị, refresh bằng token cũ thất bại và reuse detection vẫn hoạt động.
6. Kiểm thử hai user để đảm bảo revoke user A không tác động user B.

## 6. Workstream 4 — Siết state machine request-changes của bài học

### Root cause đã xác nhận

`ContentLessonsService.cs` cho phép request-changes từ `in-review`, `published` và `draft`. Cho phép `draft -> request changes` là transition không có ý nghĩa và tạo audit/no-op sai nghiệp vụ.

### Logic sửa

1. Viết transition matrix rõ ràng cho lesson workflow và đặt validation tại service/domain boundary.
2. `request changes` chỉ hợp lệ từ `in-review` và `published` theo behavior đã được kiểm chứng; `draft` và trạng thái khác trả `400`/domain validation, không mutate, không tạo revision/audit success.
3. Không mở rộng transition chỉ để test pass. Approve/publish vẫn giữ copyright/provenance/four-eyes guard.
4. Test mọi cạnh của matrix, gồm invalid state giữ nguyên record sau reload và không phát sinh audit/revision thừa.

## 7. Workstream 5 — Khôi phục JSON encoder an toàn mặc định

### Root cause đã xác nhận

`GlobalExceptionHandlingMiddleware.cs` dùng `JavaScriptEncoder.UnsafeRelaxedJsonEscaping` chỉ để raw tiếng Việt khớp string assertion. JSON escape Unicode mặc định vẫn là JSON hợp lệ; không được làm yếu encoder toàn cục để đáp ứng test văn bản.

### Logic sửa

1. Bỏ `UnsafeRelaxedJsonEscaping`, dùng ASP.NET/System.Text.Json options an toàn mặc định hoặc option chung đã được cấu hình an toàn của ứng dụng.
2. Tests phải deserialize body và assert trường `status`, `title`, `detail`, `errors` thay vì tìm raw byte/string encoding.
3. Thêm regression payload chứa tiếng Việt, dấu nháy, `<script>`, ký tự control; xác nhận response parse được và không phát sinh raw unsafe embedding.
4. Không đổi message nghiệp vụ hoặc HTTP status không liên quan.

## 8. Workstream 6 — Notes và bookmarks của người dùng đăng nhập phải dùng BE thật

### Hiện trạng

`frontend/src/services/studyNotes.service.ts` và `sectionBookmarks.service.ts` còn là client/local persistence trong khi đây là dữ liệu cá nhân cần ownership và đồng bộ đa thiết bị. Workstream B9 của kế hoạch trước chưa được thực hiện.

### Lát cắt bắt buộc

1. Tạo entity/migration tối thiểu cho note và section bookmark, có owner user ID, lesson/section IDs, timestamps và constraints/index cần thiết. Bookmark có unique constraint theo `(UserId, LessonId, SectionId)`.
2. API dưới `/api/v1/me/notes` và `/api/v1/me/bookmarks` (hoặc naming nhất quán hiện có). User ID chỉ lấy từ authenticated claims, không tin user ID từ client.
3. CRUD note, list/filter theo lesson; toggle/remove bookmark idempotent. Validate lesson/section tồn tại hoặc contract phù hợp với mô hình content hiện tại.
4. Hai user không thể đọc/sửa/xóa dữ liệu của nhau; ID enumeration phải trả semantics an toàn.
5. FE authenticated chuyển hoàn toàn sang API, có loading/empty/error/retry và không nuốt API error thành dữ liệu rỗng. Guest chỉ được local-only nếu UI gắn nhãn rõ; không đồng bộ giả.
6. Nếu hỗ trợ merge guest sau login, phải idempotent, có xác nhận/chiến lược conflict rõ và không ghi đè âm thầm dữ liệu server. Nếu chưa đủ scope thì không tự merge, ghi rõ limitation.
7. Integration tests persistence sau refresh/restart context, two-user isolation, duplicate bookmark, network/API failure; FE tests cập nhật theo API contract.

Mọi migration/test ghi chỉ chạy trên `StudyAIDb_E2E`/disposable DB.

## 9. Workstream 7 — E2E và bằng chứng kiểm thử phải là bằng chứng thật

1. Chạy thật script Playwright responsive/auth đã sửa; không chỉ review source. Test phải exit non-zero khi assertion sai.
2. Desktop và mobile đều phải assert staff route không session redirect login/401/403; không được silently skip khi đã redirect. Bao phủ ít nhất 390px và desktop chính, cùng các viewport đã khai báo trong script nếu môi trường hỗ trợ.
3. Lưu log console đã loại secret và Playwright report/trace/screenshot lỗi hoặc CI artifact. Không commit ảnh hàng loạt.
4. Backend tests xuất `.trx`. Nếu `.trx` nhỏ và không chứa secret có thể commit dưới `docs/audit/evidence/`; nếu không, upload CI artifact và commit URL, SHA-256, command, timestamp, environment/database name đã redacted.
5. Markdown summary không được coi là artifact duy nhất. Mỗi claim phải truy được tới raw log/TRX/CI run.
6. `ANTIGRAVITY_CURRENT_SYSTEM_STATUS_REPORT.md` phải cập nhật/reclassify endpoint và feature theo bằng chứng mới; không để báo cáo cũ mâu thuẫn với code.
7. `ANTIGRAVITY_TARGETED_REMEDIATION_REPORT.md` phải sửa các claim “hoàn thành 100%/tiêu chuẩn cao nhất” không còn đúng, đường dẫn sai của `DatabaseSafetyGuard`, và ghi rõ notes/bookmarks chỉ DONE sau khi workstream tương ứng pass.

## 10. Workstream 8 — Dọn chất lượng diff và báo cáo bàn giao

1. Sửa mọi lỗi từ `git diff --check`, gồm trailing whitespace trong remediation report và blank-line-at-EOF ở fixture đã được Codex phát hiện.
2. Không format toàn repo. Chỉ sửa whitespace/file thuộc phạm vi và lỗi đã xác nhận.
3. Chạy `rg` cuối để chứng minh không còn runtime auto-password contract/implementation và không còn response field plaintext.
4. Báo cáo cuối phải liệt kê từng workstream: root cause, file đổi, test ID, command, kết quả thật, artifact URL/path, known limitation, migration và rollback.

## 11. Thứ tự commit đề xuất

Mỗi commit một concern, có thể điều chỉnh tên nhưng không gộp tất cả thành một commit lớn:

1. `fix(admin): require explicit passwords and remove plaintext responses`
2. `fix(admin): enforce database-backed settings concurrency`
3. `fix(auth): revoke sessions without deleting security history`
4. `fix(content): enforce lesson workflow transitions`
5. `fix(api): restore safe exception json encoding`
6. `feat(learner): persist owned notes and bookmarks`
7. `test(e2e): publish executable verification evidence`
8. `docs(audit): publish codex review 2 remediation report`

Không force-push, không merge và không sửa lịch sử các commit đã có.

## 12. Quality gates bắt buộc

Chạy targeted test sau từng workstream, sau đó full gates:

```bash
git diff --check

cd frontend
bun install --frozen-lockfile
bun run lint
bun x tsc -b
bun run test
bun run build

cd ../backend
dotnet restore StudyAI.sln
dotnet build StudyAI.sln -c Release --no-restore
dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj -c Release --no-build --logger "trx;LogFileName=unit-review2.trx"
# Chỉ chạy sau khi evidence xác nhận database là StudyAIDb_E2E/disposable:
dotnet test tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj -c Release --no-build --logger "trx;LogFileName=integration-review2.trx"
```

Chạy Playwright E2E liên quan bằng command thực tế trong repo sau khi frontend và backend test environment khởi động an toàn. Bao phủ success, validation 400, unauthenticated 401, forbidden 403, conflict 409, API failure, refresh persistence, two-user isolation và mobile cho những feature bị tác động.

Không được đánh dấu PASS nếu command không chạy, tool thiếu, environment blocked hoặc không có artifact. Ghi đúng `NOT RUN`/`BLOCKED` cùng nguyên nhân.

## 13. Điều kiện hoàn thành và GitHub handoff

Chỉ được báo DONE khi:

- cả tám workstream đã có code và regression tests tương ứng;
- không còn tự sinh hoặc trả/hiển thị/copy mật khẩu thô trong các luồng Admin/User/Teacher;
- settings concurrency đúng giữa các DbContext/API instance độc lập;
- revoke session giữ record và `RevokedAt` hoạt động;
- lesson transition, JSON encoder và notes/bookmarks đáp ứng acceptance ở trên;
- FE lint/typecheck/test/build, BE build/unit/integration và affected Playwright E2E có bằng chứng thật;
- `git diff --check` sạch;
- báo cáo audit được cập nhật trung thực;
- code và report đã commit/push lên `origin/feature/backend-redesign-modular-monolith`.

Cuối lượt, Antigravity phải in ngắn gọn repository, branch, baseline, final HEAD SHA, danh sách commits, kết quả từng gate kèm artifact, files báo cáo, migration/rollback, known risks và trạng thái clean của worktree. Sau đó **dừng để Codex review; không tự merge**.
