# STUDY_AI — BÁO CÁO KIỂM TOÁN CHẤT LƯỢNG TOÀN DIỆN HỆ THỐNG (FULLSTACK QUALITY AUDIT)

> **Ngày thực hiện:** 2026-11-23  
> **Nhánh kiểm toán:** `audit/fullstack-quality-plan-20261123` (tách từ `feature/backend-redesign-modular-monolith`)  
> **Commit baseline:** `16593c049d5bf1e4b373eaef9ee2c2a0d7830cb3`  
> **Chế độ kiểm toán:** **AUDIT & PLAN ONLY — TUYỆT ĐỐI KHÔNG SỬA MÃ NGUỒN (NO SOURCE FIXES)**  
> **Cơ sở dữ liệu bảo vệ:** `StudyAIDb` được bảo vệ nghiêm ngặt (Zero write/seed/migration).

---

## I. TỔNG QUAN VÀ MỤC TIÊU

Kiểm toán này được thực hiện độc lập và toàn diện trên toàn bộ hệ thống STUDY_AI sau khi hoàn thành tái cấu trúc Backend sang Feature-Based Modular Monolith và chuẩn hóa Frontend sang Light Mode.

Mục tiêu kiểm toán:
1. Phát hiện tất cả lỗ hổng bảo mật, gian lận thi cử (Anti-Cheating / Answer Exposure) và phân quyền (RBAC/Ownership).
2. Phát hiện mock data, fallback runtime, unpersisted state và localStorage còn sót.
3. Rà soát độ lệch contract (API mismatch, HTTP verb mismatch, query params/payload mismatch) giữa FE (React) và BE (ASP.NET Core .NET 10).
4. Kiểm tra các lỗi CSS, token chưa khai báo, xung đột layout và scoping leak trong giao diện Frontend.
5. Kiểm định tính toàn vẹn của dữ liệu học tập (Topic Mastery, Spaced Repetition, Assessment Attempts).
6. Thực thi các cổng kiểm thử tĩnh và kiểm thử đơn vị an toàn (Lint, Build, Unit Tests).

---

## II. KẾT QUẢ CỔNG KIỂM THỬ AN TOÀN (TEST GATES)

| Cổng kiểm thử | Lệnh thực thi | Kết quả | Chi tiết & Ghi chú |
| :--- | :--- | :--- | :--- |
| **Frontend Lint** | `cd frontend && bun run lint` | **PASS** | 487 files được quét bằng `oxlint`, 0 warnings, 0 errors (460ms). |
| **Frontend Unit Tests** | `cd frontend && bun run test` | **PASS** | **79/79 test files passed**, **545/545 tests passed** (41.52s). |
| **Frontend Build** | `cd frontend && bun run build` | **PASS** | `tsc -b && vite build` hoàn thành trong 2.83s, 0 TypeScript compile errors. |
| **Backend Build** | `cd backend && dotnet build StudyAI.sln` | **PASS** | Hoàn thành trong 18.49s, 0 Warnings, 0 Errors (.NET 10). |
| **Backend Unit Tests** | `dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj` | **PASS** | **263/263 passed**, 0 failed, 0 skipped (5s). |
| **SQL Integration Tests** | `dotnet test tests/StudyAI.IntegrationTests/` | **NOT RUN (Safely Blocked)** | Cần instance SQL Server E2E riêng (`StudyAIDb_E2E`). Nghiêm cấm chạy trên `StudyAIDb`. |
| **Playwright Browser E2E** | `bun run test:e2e` | **NOT RUN** | Dành cho pha triển khai sau khi backend/frontend contracts được đồng bộ. |

---

## III. BẢNG PHÂN LOẠI CÁC PHÁT HIỆN KIỂM TOÁN (FINDINGS MATRIX)

| Mã phát hiện | Mức độ | Nhóm | Tệp tin & Vị trí | Mô tả ngắn |
| :--- | :---: | :--- | :--- | :--- |
| **SEC-01** | **P0** | Security / Assessment | `backend/.../StudentAssessmentService.cs:159-196` | Server chấp nhận `ScoreRaw`, `ScoreScaled`, `IsCorrect` từ payload client mà không chấm điểm lại. |
| **SEC-02** | **P1** | Security / Admin RBAC | `backend/.../AdminUsersService.cs:260-269` | `UpdateUserAsync` (`PUT /api/v1/admin/users/{userId}`) thiếu guard chống admin tự khóa/tự hạ quyền và không thu hồi session khi đổi status. |
| **API-01** | **P1** | Contract Mismatch | `frontend/src/services/teacherManagement.service.ts:54,72,81` | Gọi sai 3 endpoint AI Governance: `/quality-audit`, `/lesson-authoring/outline`, `/checkpoint-questions` (Backend là `/ai-audit`, `/ai-authoring/outline`, `/ai-authoring/questions`). |
| **MOCK-01** | **P1** | Mock / LocalStorage Bug | `frontend/src/services/classroom.service.ts:742,1093` | `deleteClass` và `deleteAssignment` gọi `loadFromStorage` sau khi xóa trên server; hàm này quăng Exception giả vì `isTestEnvironment` trả về false khi có token. |
| **MOCK-02** | **P1** | Mock / Offline Fallback | `frontend/src/services/operations.service.ts:554-578,755-786` | Phê duyệt nội dung (`approveContent`) và xuất bản (`publishContent`) ghi state giả vào `localStorage` khi thiếu token hoặc khi server delay. |
| **MOCK-03** | **P1** | Mock / Unpersisted | `frontend/src/services/supporting.service.ts:96-118` | `getUserSettings` và `updateUserSettings` chỉ đọc/ghi `localStorage`, không có API Backend lưu cấu hình người học. |
| **MOCK-04** | **P2** | False Empty State | `frontend/src/services/supporting.service.ts:33-48,51-60` | `getLibraryItems` nuốt toàn bộ lỗi mạng trả về `[]`; `getAchievements` trả về `[]` vì backend chưa triển khai. |
| **DATA-01** | **P1** | Data Integrity | `backend/.../TeacherSubmissionsService.cs:281-333` | Tự động cập nhật `StudentTopicMastery` bằng chuỗi tự do `assignment.Title` thay vì chuẩn hóa theo Curriculum Topic/Skill ID. |
| **CSS-01** | **P2** | CSS Duplication | `frontend/src/pages/Dashboard/DashboardPage.css:8-595` | Trùng lặp quy mô lớn (>580 dòng) toàn bộ layout shell, sidebar, topbar gây xung đột specificity với `layout.css` và `components.css`. |
| **CSS-02** | **P2** | Global Selector Bleed | `frontend/src/pages/Content/ContentPages.css:499-503` | Selector không scope `input[type='text'], select, textarea { font-size: 16px !important; }` đè lên toàn bộ app. |
| **CSS-03** | **P2** | Missing CSS Tokens | Toàn bộ `frontend/src` (49 vị trí) | Sử dụng 49 biến CSS chưa khai báo trong `tokens.css` (`--spacing-4`, `--spacing-6`, `--primary-50`..`700`, `--surface-*`). |
| **CSS-04** | **P3** | Visual Layering | `frontend/src/components/staff/staff-shared.css:1306` | `.action-dropdown-menu` có `z-index: 100` thấp hơn sticky header (`z-index: 200/250`), có nguy cơ bị che khuất khi cuộn. |

---

## IV. PHÂN TÍCH CHI TIẾT CÁC PHÁT HIỆN

### 1. SEC-01: Lỗ hổng gian lận điểm số tại StudentAssessmentService (Mức độ: P0 - Blocker)
- **Vị trí tệp:** `backend/src/StudyAI.Api/Features/Student/StudentAssessmentService.cs` (Dòng 159-197)
- **Endpoint bị ảnh hưởng:**
  - `POST /api/v1/users/{userId}/assessment-attempts`
  - `PUT /api/v1/users/{userId}/assessment-attempts/{attemptId}`
  - `PATCH /api/v1/users/{userId}/assessment-attempts/{attemptId}`
  - `POST /api/v1/me/assessment-attempts`
  - `PUT /api/v1/me/assessment-attempts/{attemptId}`
  - `PATCH /api/v1/me/assessment-attempts/{attemptId}`
- **Bằng chứng mã nguồn:**
  ```csharp
  // StudentAssessmentService.cs dòng 159-162 & 185, 196
  attempt.ScoreRaw = dto.ScoreRaw ?? attempt.ScoreRaw;
  attempt.ScoreScaled = dto.ScoreScaled ?? attempt.ScoreScaled;
  ...
  resp.IsCorrect = rDto.IsCorrect ?? resp.IsCorrect;
  ```
- **Nguyên nhân gốc rễ:**
  Endpoint ghi nhận bài thi trắc nghiệm chấp nhận trực tiếp `ScoreRaw`, `ScoreScaled` và `rDto.IsCorrect` do Client tự tính toán gửi lên mà không đối chiếu `SelectedOptionIds` với `ContentQuestion.CorrectAnswer` trên cơ sở dữ liệu.
- **Rủi ro:**
  Bất kỳ học sinh nào có token hợp lệ đều có thể dùng công cụ HTTP (Postman/Curl/DevTools) gửi PATCH attempt với `ScoreRaw = 100`, `ScoreScaled = 10.0`, `IsCorrect = true` để đạt điểm tối đa mà không cần trả lời đúng bất kỳ câu hỏi nào.
- **Giải pháp đề xuất:**
  Chuyển sang chấm điểm fail-closed tại server: Khi client gửi câu trả lời, server phải load danh sách câu hỏi từ database, so khớp đáp án bằng `EvaluateAnswer()`, tự tính `ScoreRaw`, `ScoreScaled` và cập nhật `IsCorrect` tại server; loại bỏ hoàn toàn việc gán trực tiếp điểm số từ DTO của client.

---

### 2. SEC-02: Lỗ hổng quản trị viên tự hạ quyền và không thu hồi phiên (Mức độ: P1)
- **Vị trí tệp:** `backend/src/StudyAI.Api/Features/Admin/AdminUsersService.cs` (Dòng 240-277)
- **Endpoint bị ảnh hưởng:** `PUT /api/v1/admin/users/{userId}`
- **Bằng chứng mã nguồn:**
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
- **Rủi ro:** Quản trị viên có thể vô tình hoặc bị tấn công CSRF tự đổi role của mình thành `learner` hoặc `disabled`, dẫn đến mất quyền quản trị toàn hệ thống. Người dùng bị vô hiệu hóa vẫn giữ refresh token hợp lệ để xin access token mới cho đến khi session hết hạn.

---

### 3. API-01: Sai lệch Route Contract giữa Frontend và Backend AI Governance (Mức độ: P1)
- **Vị trí tệp:** `frontend/src/services/teacherManagement.service.ts` (Dòng 54, 72, 81)
- **Chi tiết sai lệch:**
  1. Frontend gọi: `POST /api/v1/content/governance/quality-audit`  
     Backend thực tế: `POST /api/v1/content/governance/ai-audit` (`ContentGovernanceController.cs:40`)  
     => Kết quả: **HTTP 404 Not Found**.
  2. Frontend gọi: `POST /api/v1/content/governance/lesson-authoring/outline`  
     Backend thực tế: `POST /api/v1/content/governance/ai-authoring/outline` (`ContentGovernanceController.cs:64`)  
     => Kết quả: **HTTP 404 Not Found**.
  3. Frontend gọi: `POST /api/v1/content/governance/lesson-authoring/checkpoint-questions`  
     Backend thực tế: `POST /api/v1/content/governance/ai-authoring/questions` (`ContentGovernanceController.cs:88`)  
     => Kết quả: **HTTP 404 Not Found**.
- **Tác động:** Chức năng kiểm định chất lượng nội dung bằng AI và hỗ trợ giáo viên soạn giáo án AI trong Workspace hoàn toàn tê liệt khi gọi backend thật.

---

### 4. MOCK-01: Lỗi thông báo giả khi xóa Lớp học và Bài tập (Mức độ: P1)
- **Vị trí tệp:** `frontend/src/services/classroom.service.ts` (Dòng 740-745 và 1092-1095)
- **Bằng chứng mã nguồn:**
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
  Và:
  ```typescript
  const isTestEnvironment = (): boolean =>
    typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' && !getAccessToken()
  ```
- **Hành vi lỗi:** Khi giáo viên hoặc quản trị viên đã đăng nhập (`getAccessToken()` có giá trị), `isTestEnvironment()` trả về `false`. Ngay sau khi server xóa lớp học thành công, dòng lệnh `loadFromStorage` ném ngoại lệ: *"Bạn cần đăng nhập tài khoản giáo viên hoặc quản trị để truy cập dữ liệu lớp học."*  
  => Người dùng nhận được thông báo lỗi đỏ mặc dù thao tác trên server đã thành công 100%! Lỗi tương tự xảy ra tại `deleteAssignment`.

---

### 5. MOCK-02 & MOCK-03: Rơi rớt Mock Data và LocalStorage trong Phê duyệt & Cấu hình (Mức độ: P1)
- **Vị trí tệp:**
  - `frontend/src/services/operations.service.ts` (Dòng 554-578, 755-786, 1026-1039)
  - `frontend/src/services/supporting.service.ts` (Dòng 96-118)
- **Nguyên nhân:**
  1. `operations.service.ts` vẫn duy trì `STORAGE_KEYS.APPROVALS`, `PUBLICATIONS`, `ANNOUNCEMENTS`, `SETTINGS`. Khi không có token hoặc khi server có độ trễ tìm kiếm, hệ thống tự động ghi bản ghi phê duyệt ảo vào `localStorage`.
  2. `supporting.service.ts`: Toàn bộ `getUserSettings` và `updateUserSettings` của học sinh (chế độ học, số phút mục tiêu mỗi ngày, thông báo) chỉ lưu cục bộ vào `localStorage` qua key `user_settings`, không có bất kỳ API nào trên backend lưu trữ. Khi người học đổi trình duyệt hoặc thiết bị, toàn bộ thiết lập học tập bị biến mất.

---

### 6. DATA-01: Ô nhiễm dữ liệu Master Topic trong TeacherSubmissionsService (Mức độ: P1)
- **Vị trí tệp:** `backend/src/StudyAI.Api/Features/Teacher/TeacherSubmissionsService.cs` (Dòng 280-333)
- **Bằng chứng mã nguồn:**
  ```csharp
  var rawTopic = assignment.Title.Replace("[Can thiệp bổ trợ]", "").Trim();
  ...
  var mastery = await _db.StudentTopicMasteries
      .FirstOrDefaultAsync(m => m.UserId == submission.StudentId &&
                                m.SubjectId == resolvedSubjectId &&
                                (m.TopicName.Contains(rawTopic) || rawTopic.Contains(m.TopicName)), cancellationToken);
  ```
- **Rủi ro:** Khi giáo viên đặt tiêu đề bài tập tự do (ví dụ: "Bài tập về nhà tuần 3", "Kiểm tra 15 phút đầu giờ"), chuỗi ký tự này được lưu trực tiếp vào bảng `StudentTopicMastery` dưới danh nghĩa là một "Chủ đề kiến thức". Điều này làm sai lệch thuật toán gợi ý học tập cá nhân hóa và làm biến dạng biểu đồ năng lực học sinh.

---

### 7. CSS-01 đến CSS-04: Lỗi kiến trúc CSS, Token và Layering (Mức độ: P2 / P3)
- **CSS-01 (Duplication):** `frontend/src/pages/Dashboard/DashboardPage.css` (Dòng 8-595) sao chép toàn bộ khai báo `.app-shell`, `.sidebar`, `.topbar` từ `layout.css` và `components.css`. Khi người dùng chuyển qua lại giữa Dashboard và các trang khác, specificity của class bị tranh chấp gây ra nhảy layout (layout shift).
- **CSS-02 (Bare Element Leak):** `frontend/src/pages/Content/ContentPages.css` (Dòng 499-503):
  ```css
  input[type='text'], select, textarea {
    font-size: 16px !important;
  }
  ```
  Selector này không có class cha scope, áp dụng `!important` lên toàn bộ thẻ input của toàn bộ trang web khi module Content được nạp.
- **CSS-03 (Missing Tokens):** Phát hiện 49 tham chiếu biến CSS không tồn tại trong `tokens.css`:
  - `--spacing-3`, `--spacing-4`, `--spacing-6` (hệ thống chuẩn dùng `--space-3`, `--space-4`, `--space-6`).
  - `--primary-50` đến `--primary-700` (hệ thống chuẩn dùng `--brand-50` đến `--brand-700`).
  - `--surface-subtle`, `--surface-muted`, `--surface-hover` (chưa được alias sang `--bg-surface-*`).
- **CSS-04 (Dropdown Z-Index):** Trong `staff-shared.css:1306`, `.action-dropdown-menu` thiết lập `z-index: 100`, thấp hơn sticky card header (`z-index: 200/250`), khiến menu thao tác bị cắt cụt (clipping) khi người dùng cuộn danh sách.

---

## V. ĐÁNH GIÁ TÁC ĐỘNG VÀ NGUYÊN TẮC BẤT BIẾN (INVARIANTS)

1. **Nguyên tắc bảo vệ dữ liệu sản xuất:**
   - Database `StudyAIDb` là tài nguyên cấm ghi. Mọi thử nghiệm và kiểm thử tích hợp phải thực hiện trên database dùng một lần hoặc mock memory an toàn.
2. **Nguyên tắc Zero-Mock Authenticated:**
   - Khi có token đăng nhập hợp lệ, hệ thống phải thực hiện 100% cuộc gọi lên Backend API và xử lý lỗi minh bạch (Error banner / Retry button). Tuyệt đối không fallback âm thầm về mock array hoặc localStorage.
3. **Nguyên tắc Liêm chính học thuật (Academic Integrity):**
   - Đáp án, gợi ý bậc cao và điểm số phải được tính toán và kiểm soát nghiêm ngặt từ phía Server. Không bao giờ tin tưởng điểm số hoặc trạng thái đúng/sai từ payload Client gửi lên.
