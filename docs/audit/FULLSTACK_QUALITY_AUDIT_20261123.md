# STUDY_AI — BÁO CÁO KIỂM TOÁN CHẤT LƯỢNG TOÀN DIỆN HỆ THỐNG (FULLSTACK QUALITY AUDIT)

> **Ngày thực hiện:** 2026-11-23  
> **Nhánh kiểm toán:** `audit/fullstack-quality-plan-20261123` (tách từ `feature/backend-redesign-modular-monolith`)  
> **Commit baseline:** `16593c049d5bf1e4b373eaef9ee2c2a0d7830cb3`  
> **Pull Request:** [Draft PR #22](https://github.com/hthuyngan/STUDY_AI-/pull/22)  
> **Trạng thái Codex Review:** `REVIEW_BLOCKED_USAGE_LIMIT` (Yêu cầu review thất bại do tài khoản GitHub chạm giới hạn mức sử dụng / usage limit, không phải do phát hiện lỗi trong PR; chưa có xác nhận phê duyệt chính thức).  
> **Chế độ kiểm toán:** **AUDIT & PLAN ONLY — TUYỆT ĐỐI CHƯA SỬA MÃ NGUỒN (NO SOURCE FIXES)**  
> **Cơ sở dữ liệu bảo vệ:** `StudyAIDb` được bảo vệ nghiêm ngặt (Zero write/seed/migration).

---

## I. TỔNG QUAN VÀ MỤC TIÊU KIỂM TOÁN

Kiểm toán này được thực hiện độc lập và toàn diện trên toàn bộ hệ thống STUDY_AI sau khi hoàn thành tái cấu trúc Backend sang Feature-Based Modular Monolith và chuẩn hóa Frontend sang Light Mode.

Mục tiêu kiểm toán:
1. Phát hiện tất cả lỗ hổng bảo mật, gian lận thi cử (Anti-Cheating / Answer Exposure) và phân quyền (RBAC/Ownership).
2. Phát hiện mock data, fallback runtime, unpersisted state và localStorage còn sót; phân biệt rõ giữa authenticated runtime và demo/test runtime.
3. Rà soát độ lệch contract (API mismatch, HTTP verb mismatch, query params/payload mismatch) giữa FE (React) và BE (ASP.NET Core .NET 10).
4. Kiểm tra các lỗi CSS, token chưa khai báo, xung đột layout và scoping leak trong giao diện Frontend.
5. Kiểm định tính toàn vẹn của dữ liệu học tập (Topic Mastery, Spaced Repetition, Assessment Attempts), phát hiện các side-effect nguy hiểm trong quá trình chấm điểm bài tập.
6. Thực thi các cổng kiểm thử tĩnh và kiểm thử đơn vị an toàn (Lint, Build, Unit Tests).

---

## II. KẾT QUẢ CỔNG KIỂM THỬ AN TOÀN (TEST GATES)

| Cổng kiểm thử | Lệnh thực thi | Kết quả | Chi tiết & Ghi chú |
| :--- | :--- | :---: | :--- |
| **Frontend Lint** | `cd frontend && bun run lint` | **PASS** | 487 files được quét bằng `oxlint`, 0 warnings, 0 errors (460ms). |
| **Frontend Unit Tests** | `cd frontend && bun run test` | **PASS** | **79/79 test files passed**, **545/545 tests passed** (41.52s). |
| **Frontend Build** | `cd frontend && bun run build` | **PASS** | `tsc -b && vite build` hoàn thành trong 2.83s, 0 TypeScript compile errors. |
| **Backend Build** | `cd backend && dotnet build StudyAI.sln` | **PASS** | Hoàn thành trong 18.49s, 0 Warnings, 0 Errors (.NET 10). |
| **Backend Unit Tests** | `dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj` | **PASS** | **263/263 passed**, 0 failed, 0 skipped (5s). |
| **SQL Integration Tests** | `dotnet test tests/StudyAI.IntegrationTests/` | **NOT RUN (Safely Blocked)** | Cần instance SQL Server E2E riêng (`StudyAIDb_E2E`). Nghiêm cấm chạy trên `StudyAIDb`. |
| **Playwright Browser E2E** | `bun run test:e2e` | **NOT RUN** | Dành cho pha triển khai sau khi backend/frontend contracts được đồng bộ. |

---

## III. BẢNG PHÂN LOẠI CÁC PHÁT HIỆN KIỂM TOÁN (FINDINGS MATRIX)

| Mã phát hiện | Mức độ | Phân loại trạng thái | Nhóm | Tệp tin & Vị trí | Mô tả tóm tắt |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **SEC-01** | **P0** | **VERIFIED** | Security / Assessment | `backend/.../StudentAssessmentService.cs:159-196` | Server chấp nhận `ScoreRaw`, `ScoreScaled`, `IsCorrect` trực tiếp từ client payload mà không chấm điểm lại. |
| **SEC-02** | **P1** | **VERIFIED** | Security / Admin RBAC | `backend/.../AdminUsersService.cs:260-269` | `UpdateUserAsync` (`PUT /api/v1/admin/users/{userId}`) thiếu guard chống admin tự khóa/tự hạ quyền và không thu hồi session khi đổi status. |
| **API-01** | **P1** | **VERIFIED** | Contract Mismatch | `frontend/src/services/teacherManagement.service.ts:54,72,81` | Gọi sai 3 endpoint AI Governance: `/quality-audit`, `/lesson-authoring/outline`, `/checkpoint-questions` (Backend là `/ai-audit`, `/ai-authoring/outline`, `/ai-authoring/questions`). |
| **MOCK-01** | **P1** | **VERIFIED** | Mock / LocalStorage Bug | `frontend/src/services/classroom.service.ts:742,1093` | `deleteClass` và `deleteAssignment` gọi `loadFromStorage` sau khi xóa trên server; hàm này quăng Exception giả vì `isTestEnvironment` trả về false khi có token. |
| **MOCK-02** | **P1** | **PARTIALLY VERIFIED** | Mock / LocalStorage Scope | `frontend/src/services/operations.service.ts:497-520,903-920` | Rà soát phân biệt rõ: Đa số hàm tác vụ đã gọi BE thật khi authenticated; chỉ có `getAnnouncements` nuốt lỗi fallback localStorage, và `submitForApproval` ghi đè localStorage nếu không tìm thấy bản ghi. |
| **MOCK-03** | **P1** | **VERIFIED** | Mock / Unpersisted | `frontend/src/services/supporting.service.ts:96-118` | `getUserSettings` và `updateUserSettings` chỉ đọc/ghi `localStorage`, chưa có API backend tương ứng (chưa tự tạo API/migration ngoài kế hoạch). |
| **MOCK-04** | **P2** | **VERIFIED** | False Empty State | `frontend/src/services/supporting.service.ts:33-48,51-60` | `getLibraryItems` nuốt toàn bộ lỗi mạng trả về `[]`; `getAchievements` trả về `[]` vì backend chưa triển khai. |
| **DATA-01** | **P1** | **VERIFIED** | Data Integrity & Side-effect | `backend/.../TeacherSubmissionsService.cs:280-355` | Lỗi suy đoán môn học theo chuỗi, mặc định `sub_math10`, tự tạo `ContentSubject` trái phép khi chấm bài, và ô nhiễm Topic Mastery bằng `assignment.Title`. |
| **CSS-01** | **P2** | **VERIFIED** | CSS Duplication | `frontend/src/pages/Dashboard/DashboardPage.css:8-595` | Trùng lặp quy mô lớn (>580 dòng) toàn bộ layout shell, sidebar, topbar gây xung đột specificity với `layout.css` và `components.css`. |
| **CSS-02** | **P2** | **VERIFIED** | Global Selector Bleed | `frontend/src/pages/Content/ContentPages.css:499-503` | Selector không scope `input[type='text'], select, textarea { font-size: 16px !important; }` đè lên toàn bộ app. |
| **CSS-03** | **P2** | **VERIFIED** | Missing CSS Tokens | Toàn bộ `frontend/src` (49 vị trí) | Sử dụng 49 tham chiếu biến CSS chưa khai báo trong `tokens.css` (`--spacing-4`, `--spacing-6`, `--primary-50`..`700`, `--surface-*`). |
| **CSS-04** | **P3** | **VERIFIED** | Visual Layering | `frontend/src/components/staff/staff-shared.css:1306` | `.action-dropdown-menu` có `z-index: 100` thấp hơn sticky header (`z-index: 200/250`), gây nguy cơ bị che khuất khi cuộn. |

---

## IV. PHÂN TÍCH CHI TIẾT CÁC PHÁT HIỆN

### 1. SEC-01: Lỗ hổng gian lận điểm số tại StudentAssessmentService (Mức độ: P0 - Blocker | Trạng thái: VERIFIED)
- **Tệp tin:** `backend/src/StudyAI.Api/Features/Student/StudentAssessmentService.cs`
- **Hàm bị ảnh hưởng:** `SaveAttemptInternal` (Dòng 159-197)
- **Endpoints bị ảnh hưởng:**
  - `POST /api/v1/users/{userId}/assessment-attempts`
  - `PUT /api/v1/users/{userId}/assessment-attempts/{attemptId}`
  - `PATCH /api/v1/users/{userId}/assessment-attempts/{attemptId}`
  - `POST /api/v1/me/assessment-attempts`
  - `PUT /api/v1/me/assessment-attempts/{attemptId}`
  - `PATCH /api/v1/me/assessment-attempts/{attemptId}`
- **Bằng chứng mã nguồn đã kiểm chứng:**
  ```csharp
  // StudentAssessmentService.cs dòng 159-162 & 185, 196
  attempt.ScoreRaw = dto.ScoreRaw ?? attempt.ScoreRaw;
  attempt.ScoreScaled = dto.ScoreScaled ?? attempt.ScoreScaled;
  ...
  resp.IsCorrect = rDto.IsCorrect ?? resp.IsCorrect;
  ```
- **Nguyên nhân gốc rễ:**
  Endpoint xử lý phiên làm bài của học sinh chấp nhận trực tiếp `ScoreRaw`, `ScoreScaled` và `rDto.IsCorrect` do Client tự tính toán gửi lên mà không hề đối chiếu câu trả lời (`SelectedOptionIds`) với `ContentQuestion.CorrectAnswer` trên database.
- **Kế hoạch khắc phục chi tiết:**
  1. **Chấm điểm theo loại câu hỏi (Question Types):**
     - *multiple-choice* (trắc nghiệm 1 đáp án): So sánh `SelectedOptionIds.FirstOrDefault()` với `ContentQuestion.CorrectAnswer`. Trùng khớp (không phân biệt hoa thường, bỏ khoảng trắng thừa) -> `IsCorrect = true`.
     - *multiple-select* (trắc nghiệm nhiều đáp án): So sánh tập hợp ID đã chọn với tập hợp đáp án đúng được định dạng trong `CorrectAnswer` (JSON array hoặc chuỗi phân tách dấu phẩy). Áp dụng quy tắc chấm toàn bộ đúng mới tính điểm hoặc tính điểm từng phần theo cấu hình bài thi.
     - *true-false* (đúng/sai): Chuẩn hóa chuỗi `"true"`/`"false"` hoặc `"A"`/`"B"` và so khớp trực tiếp.
     - *short-answer* (điền khuyết / trả lời ngắn): Chuẩn hóa chuỗi số học, biểu thức hoặc văn bản trước khi so sánh với `ContentQuestion.CorrectAnswer`.
  2. **Thang điểm & Trọng số (Scoring Scale):**
     - `ScoreRaw`: Tổng điểm các câu trả lời đúng dựa trên điểm số của từng câu hỏi (mặc định 1.0 điểm/câu nếu không có cấu hình trọng số).
     - `ScoreMin`: 0.0; `ScoreMax`: Tổng điểm tối đa của toàn bộ câu hỏi trong bài thi.
     - `ScoreScaled`: Quy đổi về thang điểm 10 chuẩn: `ScoreScaled = TotalMaxPoints > 0 ? Math.Round((double)ScoreRaw / TotalMaxPoints * 10.0, 1) : 0.0`.
  3. **Trạng thái bài làm (Lifecycle & State Machine):**
     - Khi `CompletionStatus` là `"in_progress"` hoặc `"incomplete"`: Chỉ lưu câu trả lời `SelectedOptionIdsJson` và thời gian làm bài `SessionTimeMs`, KHÔNG tính điểm chính thức và KHÔNG tiết lộ `IsCorrect`, `Explanation`, `CorrectAnswer` về client.
     - Khi `CompletionStatus` chuyển sang `"completed"`: Server thực hiện chấm điểm toàn bộ bài thi, ghi nhận `CompletedAt = _clock.UtcNow`, cập nhật `SuccessStatus` (`"passed"` nếu `ScoreScaled >= 5.0`), và khóa phiên làm bài.
     - Nếu attempt đã ở trạng thái `"completed"`, mọi yêu cầu PUT/PATCH tiếp theo đều bị chặn với mã `ConflictException("Phiên làm bài đã hoàn thành không thể chỉnh sửa.")`.
- **Tác động:**
  - **FE:** `assessment.service.ts` và `repositories/assessmentAttempt.repository.ts` không cần tự tính điểm, chỉ gửi danh sách đáp án học sinh chọn.
  - **BE:** `StudentAssessmentService.cs` tự động load câu hỏi và chấm điểm fail-closed.
  - **SQL:** Không đổi schema; dữ liệu `AssessmentAttempt` và `AssessmentResponse` phản ánh kết quả chấm thật từ server.
- **Regression Tests:** Viết unit test giả lập gửi payload `ScoreRaw = 100`, `IsCorrect = true` với câu trả lời sai; kiểm chứng server ghi nhận đúng điểm 0.0 thay vì 100.

---

### 2. SEC-02: Lỗ hổng quản trị viên tự hạ quyền và không thu hồi phiên (Mức độ: P1 | Trạng thái: VERIFIED)
- **Tệp tin:** `backend/src/StudyAI.Api/Features/Admin/AdminUsersService.cs`
- **Hàm bị ảnh hưởng:** `UpdateUserAsync` (Dòng 240-277)
- **Endpoint bị ảnh hưởng:** `PUT /api/v1/admin/users/{userId}`
- **Bằng chứng mã nguồn đã kiểm chứng:**
  Trong `UpdateUserRoleAsync` (dòng 287-290) và `UpdateUserStatusAsync` (dòng 317-320), hệ thống đã có guard:
  ```csharp
  if (user.Id == currentUserId && newRole != "admin")
      throw new ForbiddenException("Không thể tự hạ quyền quản trị viên của chính mình.");
  if (user.Id == currentUserId && newStatus != "active")
      throw new ForbiddenException("Không thể tự khóa tài khoản của chính mình.");
  ```
  Tuy nhiên, trong `UpdateUserAsync` (dòng 260-269), phương thức cập nhật tổng thể thông tin người dùng:
  ```csharp
  if (!string.IsNullOrWhiteSpace(req.Role) && AllowedRoles.Contains(req.Role.Trim().ToLowerInvariant()))
  {
      user.Role = req.Role.Trim().ToLowerInvariant();
  }
  if (!string.IsNullOrWhiteSpace(req.Status) && AllowedStatuses.Contains(req.Status.Trim().ToLowerInvariant()))
  {
      user.Status = req.Status.Trim().ToLowerInvariant();
  }
  ```
  Hoàn toàn không có kiểm tra `user.Id == currentUserId`. Ngoài ra, khi chuyển trạng thái sang `disabled` hoặc `suspended`, `UpdateUserAsync` không gọi `RevokeUserSessionsAsync(userId, currentUserId, ct)`.
- **Kế hoạch khắc phục chi tiết:**
  - Thêm guard `if (user.Id == currentUserId)` chặn đổi `Role` khác `admin` và đổi `Status` khác `active`.
  - Bổ sung `await RevokeUserSessionsAsync(userId, currentUserId, ct)` khi status chuyển sang `suspended` hoặc `disabled`.
- **Tác động:**
  - **FE:** Nhận mã lỗi 403 nếu admin vô tình tự khóa tài khoản của chính mình.
  - **BE:** Đồng bộ quy tắc an toàn giữa `UpdateUserAsync`, `UpdateUserRoleAsync` và `UpdateUserStatusAsync`.
  - **SQL:** Không đổi schema.
- **Regression Tests:** Unit test trong `StudyAI.UnitTests` kiểm chứng admin gọi `UpdateUserAsync` cho chính mình với `role = learner` sẽ ném `ForbiddenException`.

---

### 3. API-01: Sai lệch Route Contract giữa Frontend và Backend AI Governance (Mức độ: P1 | Trạng thái: VERIFIED)
- **Tệp tin:** `frontend/src/services/teacherManagement.service.ts` (Dòng 54, 72, 81)
- **Bằng chứng sai lệch:**
  1. Frontend gọi: `POST /api/v1/content/governance/quality-audit`  
     Backend thực tế: `POST /api/v1/content/governance/ai-audit` (`ContentGovernanceController.cs:40`)  
     => Kết quả runtime: **HTTP 404 Not Found**.
  2. Frontend gọi: `POST /api/v1/content/governance/lesson-authoring/outline`  
     Backend thực tế: `POST /api/v1/content/governance/ai-authoring/outline` (`ContentGovernanceController.cs:64`)  
     => Kết quả runtime: **HTTP 404 Not Found**.
  3. Frontend gọi: `POST /api/v1/content/governance/lesson-authoring/checkpoint-questions`  
     Backend thực tế: `POST /api/v1/content/governance/ai-authoring/questions` (`ContentGovernanceController.cs:88`)  
     => Kết quả runtime: **HTTP 404 Not Found**.
- **Kế hoạch khắc phục chi tiết:**
  - Cập nhật đúng đường dẫn trong `frontend/src/services/teacherManagement.service.ts`.
  - Trên backend `ContentGovernanceController.cs`, thêm route alias tương ứng để đảm bảo tính tương thích ngược tuyệt đối (backward compatibility).
- **Tác động:**
  - **FE:** Các tính năng AI Audit và soạn giáo án tự động trong Workspace giáo viên hoạt động thông suốt.
  - **BE:** Hỗ trợ cả 2 bộ route.
  - **SQL:** Không ảnh hưởng.
- **Regression Tests:** Vitest test kiểm tra `teacherManagement.service.ts` gọi đúng endpoint; unit test backend kiểm tra route routing.

---

### 4. MOCK-01: Lỗi thông báo giả khi xóa Lớp học và Bài tập (Mức độ: P1 | Trạng thái: VERIFIED)
- **Tệp tin:** `frontend/src/services/classroom.service.ts` (Dòng 740-745 và 1092-1095)
- **Bằng chứng mã nguồn đã kiểm chứng:**
  ```typescript
  // classroom.service.ts:740-745
  async deleteClass(classId: string): Promise<void> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/classrooms/${classId}`)
      const classes = loadFromStorage<AdminClassItem[]>(STORAGE_KEYS.CLASSES, [])
      saveToStorage(STORAGE_KEYS.CLASSES, classes.filter((c) => c.id !== classId))
      return
    }
  ```
  Trong khi đó:
  ```typescript
  // classroom.service.ts:541-544
  function loadFromStorage<T>(key: string, fallback: T): T {
    if (!isTestEnvironment()) {
      throw new Error('Bạn cần đăng nhập tài khoản giáo viên hoặc quản trị để truy cập dữ liệu lớp học.')
    }
  ```
  Và `isTestEnvironment()` là `typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' && !getAccessToken()`.
- **Hành vi lỗi:** Khi giáo viên/quản trị viên đăng nhập thật trong trình duyệt (`getAccessToken()` có giá trị), `isTestEnvironment()` trả về `false`. Ngay sau khi server thực thi xóa thành công trên database, dòng `loadFromStorage` ném lỗi: *"Bạn cần đăng nhập tài khoản giáo viên hoặc quản trị để truy cập dữ liệu lớp học."*  
  => Giao diện hiện thông báo lỗi đỏ mặc dù server đã xóa thành công! Lỗi tương tự tại `deleteAssignment`.
- **Kế hoạch khắc phục chi tiết:**
  - Trong nhánh `if (getAccessToken())`, xóa bỏ hoàn toàn việc gọi `loadFromStorage` và `saveToStorage`. Chỉ cần `await apiClient.delete(...)` và return.
- **Tác động:**
  - **FE:** Xóa lớp học và bài tập diễn ra mượt mà, thông báo toast thành công chính xác.
  - **BE & SQL:** Không ảnh hưởng.
- **Regression Tests:** Vitest test mô phỏng `getAccessToken()` có giá trị, gọi `deleteClass` và kiểm chứng không phát sinh ngoại lệ `loadFromStorage`.

---

### 5. MOCK-02: Rà soát phân biệt giữa Authenticated Runtime và Demo/Test (Mức độ: P1 | Trạng thái: PARTIALLY VERIFIED)
- **Tệp tin:** `frontend/src/services/operations.service.ts`
- **Phân tích phạm vi thực tế đã kiểm chứng:**
  1. *Authenticated Runtime:*
     - Các hàm `getApprovals()`, `getPublications()`, `approveContent()`, `rejectContent()`, `requestChanges()`, `publishContent()`, `rollbackPublication()` **đều gọi API backend thật khi có token** và quăng lỗi minh bạch nếu API thất bại (không âm thầm lưu mock).
     - *Ngoại lệ 1 (Lỗi nuốt exception):* `getAnnouncements()` (dòng 903-920) khi có lỗi API lại rơi vào `catch` và fallback về `loadFromStorage(STORAGE_KEYS.ANNOUNCEMENTS, ...)`.
     - *Ngoại lệ 2 (Fallthrough):* `submitForApproval()` (dòng 497-520), sau khi gọi `apiClient.post`, nếu `getApprovals` chưa kịp trả về bản ghi vừa tạo thì rơi xuống dòng 502 và ghi dữ liệu ảo vào `localStorage`.
  2. *Unauthenticated Runtime / Unit Test:*
     - Chỉ khi `!getAccessToken()`, hệ thống mới dùng `loadFromStorage` và dữ liệu mặc định (`DEFAULT_APPROVALS`, `DEFAULT_PUBLICATIONS`, v.v.) phục vụ unit test môi trường cô lập (`isTestEnvironment()`).
- **Kế hoạch khắc phục chi tiết:**
  - Trong `getAnnouncements()`: Loại bỏ khối catch âm thầm; quăng lỗi để UI hiển thị trạng thái lỗi và nút Retry.
  - Trong `submitForApproval()`: Khi authenticated, nếu không tìm thấy bản ghi thì trả về thông báo chờ xử lý thay vì ghi bản ghi giả vào `localStorage`.
- **Tác động:**
  - **FE:** Đảm bảo zero-mock khi đã đăng nhập.
  - **BE & SQL:** Không ảnh hưởng.
- **Regression Tests:** Vitest kiểm tra khi API thông báo lỗi thì hàm ném ngoại lệ rõ ràng thay vì trả về `DEFAULT_ANNOUNCEMENTS`.

---

### 6. MOCK-03: Cấu hình cá nhân học sinh chưa có lưu trữ Backend (Mức độ: P1 | Trạng thái: VERIFIED)
- **Tệp tin:** `frontend/src/services/supporting.service.ts` (Dòng 96-118)
- **Thực trạng kiểm chứng:**
  `getUserSettings` và `updateUserSettings` (lưu số phút học mục tiêu mỗi ngày, thông báo, chế độ gia sư AI) chỉ đọc/ghi `localStorage` qua key `user_settings`. Hiện tại Backend chưa có bảng `UserSettings` trong cơ sở dữ liệu và chưa có endpoint `/api/v1/me/settings`.
- **Nguyên tắc xử lý (Tuân thủ Yêu cầu 8):**
  **Tuyệt đối không tự ý tạo thêm API, migration hoặc thay đổi schema SQL khi chưa xác minh rõ nhu cầu sản phẩm.** Kế hoạch trước mắt:
  - Giữ nguyên hợp đồng hiện tại của Frontend, ghi nhận rõ ràng đây là client-side user preferences.
  - Xóa bỏ việc tự sinh dữ liệu theme giả (vì hệ thống đã chuẩn hóa Light Mode duy nhất).
- **Tác động:**
  - Không gây xáo trộn backend và database schema.
- **Regression Tests:** Kiểm thử `supporting.service.test.ts` đảm bảo đọc ghi preferences client nhất quán.

---

### 7. MOCK-04: False Empty State tại Supporting Service (Mức độ: P2 | Trạng thái: VERIFIED)
- **Tệp tin:** `frontend/src/services/supporting.service.ts` (Dòng 33-48, 51-60)
- **Thực trạng kiểm chứng:**
  - `getLibraryItems`: Khi gọi `/api/v1/curriculum/materials` thất bại, hàm rơi vào khối `catch { return [] }`, khiến giao diện hiển thị thư viện trống rỗng thay vì báo lỗi kết nối.
  - `getAchievements`: Trả về `[]` kèm chú thích *"The backend does not persist achievements yet"*. Đây là trạng thái trung thực (truthful empty state), không phải fabricated data.
- **Kế hoạch khắc phục chi tiết:**
  - `getLibraryItems`: Quăng lỗi thay vì nuốt ngoại lệ để giao diện hiển thị Error Banner và nút Thử lại.
- **Tác động:**
  - **FE:** Người học nhận biết được lỗi mạng thay vì lầm tưởng thư viện không có tài liệu.
- **Regression Tests:** Vitest kiểm tra khi API materials lỗi thì hàm quăng lỗi.

---

### 8. DATA-01: Lỗi suy đoán môn học, tự tạo ContentSubject và ô nhiễm Topic Mastery (Mức độ: P1 | Trạng thái: VERIFIED)
- **Tệp tin:** `backend/src/StudyAI.Api/Features/Teacher/TeacherSubmissionsService.cs`
- **Hàm bị ảnh hưởng:** `GradeSubmissionAsync` (Dòng 280-355)
- **Bằng chứng mã nguồn đã kiểm chứng:**
  1. *Lỗi suy đoán môn học & Mặc định `sub_math10`:*
     ```csharp
     string resolvedSubjectId = "sub_math10"; // Hardcode mặc định
     ...
     string gradeNum = "10";
     if (rawGrade.Contains("10") || rawSubject.Contains("10") || assignment.Title.Contains("10")) gradeNum = "10";
     else if (rawGrade.Contains("11") || rawSubject.Contains("11") || assignment.Title.Contains("11")) gradeNum = "11";
     else if (rawGrade.Contains("12") || rawSubject.Contains("12") || assignment.Title.Contains("12")) gradeNum = "12";
     ...
     if (rawSubject.Contains("toán") || rawSubject.Contains("math") || assignment.Title.ToLowerInvariant().Contains("toán"))
         resolvedSubjectId = $"sub_math{gradeNum}";
     ```
     Hệ thống dùng tìm kiếm chuỗi tự do trong tiêu đề bài tập để đoán môn học và khối lớp!
  2. *Lỗi tự tạo `ContentSubject` trái phép trong giao dịch chấm bài:*
     ```csharp
     var subjectExists = await _db.ContentSubjects.AnyAsync(s => s.Id == resolvedSubjectId, cancellationToken);
     if (!subjectExists && resolvedSubjectId.StartsWith("sub_math"))
     {
         _db.ContentSubjects.Add(new ContentSubject { ... });
         await _db.SaveChangesAsync(cancellationToken); // Side-effect nguy hiểm!
     }
     ```
     Một hành động chấm bài của giáo viên lại tự ý INSERT thêm danh mục môn học vào database nếu không tìm thấy!
  3. *Lỗi ô nhiễm Topic Mastery:*
     ```csharp
     var rawTopic = assignment.Title.Replace("[Can thiệp bổ trợ]", "").Trim();
     ...
     var mastery = await _db.StudentTopicMasteries
         .FirstOrDefaultAsync(m => m.UserId == submission.StudentId &&
                                   m.SubjectId == resolvedSubjectId &&
                                   (m.TopicName.Contains(rawTopic) || rawTopic.Contains(m.TopicName)), cancellationToken);
     ```
     Lấy tiêu đề bài tập tự do (ví dụ: "Kiểm tra 15 phút", "Bài tập tuần 2") để gán vào bảng năng lực kiến thức `StudentTopicMastery`.
- **Kế hoạch khắc phục chi tiết:**
  - Lấy `SubjectId` chuẩn hóa từ quan hệ lớp học: `assignment.Classroom.SubjectId` (hoặc ánh xạ trực tiếp từ khóa ngoại của lớp học). Tuyệt đối không suy đoán qua chuỗi tiêu đề bài tập.
  - Xóa bỏ hoàn toàn khối lệnh tự động `_db.ContentSubjects.Add(...)` trong quá trình chấm điểm. Môn học phải là dữ liệu danh mục được quản lý bởi Content/Admin.
  - Chỉ cập nhật `StudentTopicMastery` khi bài tập có liên kết với `TopicId` hoặc `LessonId` chuẩn hóa trong chương trình giáo dục. Nếu là bài tập tổng hợp tự do, chỉ ghi nhận điểm vào `AssignmentSubmission` mà không làm sai lệch biểu đồ năng lực chủ đề.
- **Tác động:**
  - **BE:** Quy trình chấm điểm bài tập trong sạch, không sinh side-effect làm biến dạng cơ sở dữ liệu.
  - **SQL:** Bảo vệ tính toàn vẹn của bảng `ContentSubjects` và `StudentTopicMasteries`.
- **Regression Tests:** Chạy test chấm bài tập với tiêu đề tự do và kiểm chứng bảng `ContentSubjects` không bị tự ý thêm mới dòng nào.

---

### 9. CSS-01 đến CSS-04: Lỗi kiến trúc CSS, Selector Bleed và Design Tokens (Mức độ: P2 / P3 | Trạng thái: VERIFIED)

#### CSS-01 (VERIFIED): Trùng lặp quy mô lớn trong DashboardPage.css
- **Tệp tin:** `frontend/src/pages/Dashboard/DashboardPage.css` (Dòng 8-595)
- **Thực trạng:** Sao chép nguyên khối các quy tắc `.app-shell`, `.sidebar`, `.topbar`, `.btn-*` từ `layout.css` và `components.css`.
- **Kế hoạch sửa thu hẹp:** Xóa bỏ toàn bộ các khai báo layout trùng lặp, chỉ giữ lại các selector dành riêng cho Dashboard (`.dashboard-content`, `.metric-card`, `.chart-wrapper`).

#### CSS-02 (VERIFIED): Selector toàn cục không scope trong ContentPages.css
- **Tệp tin:** `frontend/src/pages/Content/ContentPages.css` (Dòng 499-503)
- **Thực trạng:**
  ```css
  input[type='text'], select, textarea {
    font-size: 16px !important;
  }
  ```
  Selector này đè `font-size: 16px !important` lên toàn bộ ứng dụng khi module Content được tải.
- **Kế hoạch sửa thu hẹp:** Bọc selector dưới container quản lý nội dung:
  ```css
  .content-management-container input[type='text'],
  .content-management-container select,
  .content-management-container textarea {
    font-size: 16px;
  }
  ```

#### CSS-03 (VERIFIED): 49 tham chiếu biến CSS chưa khai báo trong tokens.css
- **Tệp tin:** Rải rác trong các stylesheet component (`frontend/src`).
- **Thực trạng:** Sử dụng `--spacing-1`..`--spacing-8`, `--primary-50`..`--primary-700`, `--surface-subtle`, `--surface-muted`, `--surface-hover` mà trong `tokens.css` chỉ có `--space-*`, `--brand-*`, `--bg-surface-*`.
- **Kế hoạch sửa thu hẹp:** Bổ sung alias chuẩn hóa trong `:root` của `frontend/src/styles/tokens.css` trỏ biến cũ về token chính thống.

#### CSS-04 (VERIFIED): Layering z-index thấp tại staff-shared.css
- **Tệp tin:** `frontend/src/components/staff/staff-shared.css:1306`
- **Thực trạng:** `.action-dropdown-menu` thiết lập `z-index: 100`, thấp hơn sticky header (`z-index: 200/250`).
- **Kế hoạch sửa thu hẹp:** Đổi thành `z-index: var(--ui-layer-dropdown, 300)`.

---

## V. ĐÁNH GIÁ NGUY CƠ VÀ NGUYÊN TẮC BẤT BIẾN (NON-REGRESSION INVARIANTS)

1. **Bảo vệ tuyệt đối Cơ sở dữ liệu Sản xuất:**
   Mọi kịch bản kiểm thử ghi dữ liệu, rehearsal di chuyển dữ liệu đều phải chạy trên `StudyAIDb_E2E`. Nghiêm cấm chạy test ghi trên `StudyAIDb`.
2. **Quyền lực Chấm điểm thuộc về Server:**
   Client chỉ là giao diện hiển thị câu hỏi và thu thập câu trả lời của người học. Điểm số, trạng thái đậu/rớt và phản hồi bài thi phải do Server tính toán độc lập.
3. **Minh bạch lỗi (Fail-Closed & No Silent Swallowing):**
   Mọi lỗi mạng hoặc lỗi API khi đã xác thực phải được báo cáo trung thực tới người dùng. Tuyệt đối không fallback âm thầm về mock array.
4. **Không tạo kiến trúc hay schema ngoài yêu cầu:**
   Mọi cải tiến phải tập trung vào việc sửa đúng các lỗi đã chứng minh, không tự phát sinh thêm bảng cơ sở dữ liệu hay endpoint khi chưa có yêu cầu nghiệp vụ rõ ràng.
