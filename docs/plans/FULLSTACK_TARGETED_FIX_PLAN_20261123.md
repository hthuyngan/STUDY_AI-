# STUDY_AI — KẾ HOẠCH KHẮC PHỤC CHẤT LƯỢNG TOÀN DIỆN (FULLSTACK TARGETED FIX PLAN)

> **Ngày lập kế hoạch:** 2026-11-23  
> **Nhánh thực hiện:** `audit/fullstack-quality-plan-20261123`  
> **Tài liệu kiểm toán gốc:** `docs/audit/FULLSTACK_QUALITY_AUDIT_20261123.md`  
> **Nguyên tắc:** Kế hoạch thực hiện theo từng giai đoạn độc lập (Phased Execution), kiểm thử nghiêm ngặt sau mỗi giai đoạn, fail-closed và bảo vệ tuyệt đối database `StudyAIDb`.

---

## I. MỤC TIÊU VÀ TRIẾT LÝ THỰC HIỆN

Kế hoạch này vạch ra lộ trình chi tiết để khắc phục triệt để các lỗi đã được xác minh trong đợt kiểm toán ngày 2026-11-23.

### Các nguyên tắc bắt buộc:
1. **Server-Side Grading Authority:** Server là cơ quan duy nhất có quyền chấm điểm và xác nhận kết quả làm bài của học sinh. Loại bỏ hoàn toàn sự tin tưởng vào `ScoreRaw`/`IsCorrect` từ payload client.
2. **Zero-Mock & Zero-Silent-Fallback:** Loại bỏ hoàn toàn các nhánh lưu dữ liệu giả vào `localStorage` khi người dùng đã xác thực. Nếu API lỗi, hiển thị UI lỗi và nút thử lại (retry), không giả vờ thành công.
3. **Strict Contract Alignment:** Đồng bộ 100% route contract giữa Frontend React và Backend ASP.NET Core. Sửa các endpoint sai chính tả và cập nhật DTO tương ứng.
4. **CSS Scoping & Token Normalization:** Loại bỏ mã CSS trùng lặp, xóa bỏ selector toàn cục không scope và bổ sung alias đầy đủ cho 49 token chưa khai báo.
5. **Database Protection:** Tuyệt đối không chạm vào `StudyAIDb`. Toàn bộ kiểm thử SQL integration phải chạy trên `StudyAIDb_E2E`.

---

## II. LỘ TRÌNH KHẮC PHỤC THEO GIAI ĐOẠN (PHASED ROADMAP)

```
┌────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: Bảo mật, Liêm chính thi cử & Phân quyền (SEC-01, SEC-02)     │
│  - Chấm điểm bài thi tại Server trong StudentAssessmentService         │
│  - Guard chống Admin tự khóa / tự hạ quyền trong UpdateUserAsync       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PHASE 2: Đồng bộ Contract & Sửa API Mismatch (API-01, DATA-01)        │
│  - Chuẩn hóa 3 endpoint AI Governance trong teacherManagement.service  │
│  - Chuẩn hóa lưu Topic Mastery từ Assignment theo Topic/Skill chuẩn    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PHASE 3: Xóa bỏ Mock Fallback & Sửa lỗi LocalStorage (MOCK-01..04)    │
│  - Sửa lỗi quăng Exception giả khi xóa lớp/bài tập trong classroom.ts  │
│  - Loại bỏ fallback localStorage trong operations.service.ts           │
│  - Bổ sung API lưu trữ UserSettings trên backend                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PHASE 4: Chuẩn hóa Kiến trúc CSS & Design Tokens (CSS-01..04)         │
│  - Dọn dẹp >580 dòng trùng lặp trong DashboardPage.css                 │
│  - Scope selector input[type='text'] trong ContentPages.css            │
│  - Khai báo token alias trong tokens.css cho 49 biến CSS               │
│  - Tăng z-index dropdown menu trong staff-shared.css                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PHASE 5: Kiểm định Toàn diện & Báo cáo Nghiệm thu (Verification)      │
│  - Chạy full test suite: Oxlint + Vitest + Vite Build + Dotnet Tests  │
│  - Kiểm thử Playwright E2E trên các luồng đã sửa                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## III. CHI TIẾT KỸ THUẬT TỪNG GIAI ĐOẠN

### GIAI ĐOẠN 1: BẢO MẬT, LIÊM CHÍNH THI CỬ & PHÂN QUYỀN
**Mục tiêu:** Khắc phục SEC-01 và SEC-02.

#### 1.1 Chấm điểm Server-side cho StudentAssessmentService (SEC-01)
- **Tệp chỉnh sửa:** `backend/src/StudyAI.Api/Features/Student/StudentAssessmentService.cs`
- **Phương thức:** `SaveAttemptInternal`
- **Logic khắc phục:**
  1. Khi nhận danh sách `dto.Responses`, server truy vấn bảng `ContentQuestions` theo danh sách `questionId`.
  2. Với mỗi câu trả lời của học sinh:
     - So khớp `SelectedOptionIds` với `ContentQuestion.CorrectAnswer`.
     - Tự động gán `resp.IsCorrect = isMatched`.
     - Không bao giờ gán trực tiếp `resp.IsCorrect = rDto.IsCorrect`.
  3. Tính toán tổng số câu đúng:
     - `int totalCorrect = attempt.Responses.Count(r => r.IsCorrect == true);`
     - `attempt.ScoreRaw = totalCorrect;`
     - `attempt.ScoreScaled = totalQuestions > 0 ? Math.Round((double)totalCorrect / totalQuestions * 10.0, 1) : 0.0;`
  4. Nếu `dto.CompletionStatus == "completed"`, cập nhật `CompletedAt = _clock.UtcNow` và khóa phiên vĩnh viễn.

#### 1.2 Bổ sung Guard tự khóa / tự hạ quyền và Revoke Session (SEC-02)
- **Tệp chỉnh sửa:** `backend/src/StudyAI.Api/Features/Admin/AdminUsersService.cs`
- **Phương thức:** `UpdateUserAsync`
- **Logic khắc phục:**
  1. Thêm kiểm tra:
     ```csharp
     if (user.Id == currentUserId)
     {
         if (!string.IsNullOrWhiteSpace(req.Role) && req.Role.Trim().ToLowerInvariant() != "admin")
             throw new ForbiddenException("Không thể tự hạ quyền quản trị viên của chính mình.");
         if (!string.IsNullOrWhiteSpace(req.Status) && req.Status.Trim().ToLowerInvariant() != "active")
             throw new ForbiddenException("Không thể tự khóa tài khoản của chính mình.");
     }
     ```
  2. Khi cập nhật trạng thái sang `disabled` hoặc `suspended`:
     ```csharp
     if (user.Status is "suspended" or "disabled")
     {
         await RevokeUserSessionsAsync(userId, currentUserId, ct);
     }
     ```

---

### GIAI ĐOẠN 2: ĐỒNG BỘ CONTRACT & CHUẨN HÓA DỮ LIỆU
**Mục tiêu:** Khắc phục API-01 và DATA-01.

#### 2.1 Sửa đổi Endpoint AI Governance (API-01)
- **Tệp chỉnh sửa:** `frontend/src/services/teacherManagement.service.ts`
- **Thay đổi cụ thể:**
  1. Đổi `/api/v1/content/governance/quality-audit`  
     -> `/api/v1/content/governance/ai-audit`
  2. Đổi `/api/v1/content/governance/lesson-authoring/outline`  
     -> `/api/v1/content/governance/ai-authoring/outline`
  3. Đổi `/api/v1/content/governance/lesson-authoring/checkpoint-questions`  
     -> `/api/v1/content/governance/ai-authoring/questions`
- **Backend hỗ trợ alias:** Thêm route alias trên `ContentGovernanceController.cs` để hỗ trợ cả 2 chuẩn, đảm bảo backward compatibility.

#### 2.2 Chuẩn hóa Topic Mastery Attribution (DATA-01)
- **Tệp chỉnh sửa:** `backend/src/StudyAI.Api/Features/Teacher/TeacherSubmissionsService.cs`
- **Phương thức:** `GradeSubmissionAsync`
- **Logic khắc phục:**
  - Thay vì lấy `assignment.Title` làm topic name tự do, bổ sung trường tùy chọn `TopicId` hoặc ánh xạ qua bảng `ContentLessons` / `ContentChapters`.
  - Nếu bài tập không gắn với Topic cụ thể, ghi nhận điểm số vào Assignment Submission mà không tạo Topic Mastery rác.

---

### GIAI ĐOẠN 3: XÓA BỎ MOCK FALLBACK & LOCALSTORAGE
**Mục tiêu:** Khắc phục MOCK-01, MOCK-02, MOCK-03, MOCK-04.

#### 3.1 Sửa lỗi quăng ngoại lệ giả khi xóa lớp và bài tập (MOCK-01)
- **Tệp chỉnh sửa:** `frontend/src/services/classroom.service.ts`
- **Phương thức:** `deleteClass`, `deleteAssignment`
- **Logic khắc phục:**
  ```typescript
  async deleteClass(classId: string): Promise<void> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/classrooms/${classId}`)
      // Xóa bỏ hoàn toàn lời gọi loadFromStorage gây quăng ngoại lệ giả
      return
    }
    ...
  }
  ```

#### 3.2 Loại bỏ LocalStorage Fallback trong Operations Service (MOCK-02)
- **Tệp chỉnh sửa:** `frontend/src/services/operations.service.ts`
- **Logic khắc phục:**
  - Trong `approveContent`, `rejectContent`, `requestChanges`, `publishContent`, khi đã xác thực, nếu API trả về lỗi thì quăng lỗi hiển thị trên UI, không âm thầm ghi vào `STORAGE_KEYS.APPROVALS`.

#### 3.3 Backend API lưu trữ Learner Settings (MOCK-03)
- **Tệp chỉnh sửa:**
  - Backend: Thêm `GET/PUT /api/v1/me/settings` vào `StudentProfileController.cs` và `StudentProfileService.cs`.
  - Frontend: `supporting.service.ts` gọi `apiClient.get('/api/v1/me/settings')` và `apiClient.put('/api/v1/me/settings', data)`.

---

### GIAI ĐOẠN 4: CHUẨN HÓA KIẾN TRÚC CSS & DESIGN TOKENS
**Mục tiêu:** Khắc phục CSS-01, CSS-02, CSS-03, CSS-04.

#### 4.1 Xóa bỏ CSS trùng lặp trong DashboardPage.css (CSS-01)
- **Tệp chỉnh sửa:** `frontend/src/pages/Dashboard/DashboardPage.css`
- **Hành động:** Xóa bỏ toàn bộ các selector `.app-shell`, `.sidebar`, `.topbar`, `.btn-*` (dòng 8-595); chỉ giữ lại các style đặc thù của Dashboard (widget cards, metric tiles).

#### 4.2 Scope Selector trong ContentPages.css (CSS-02)
- **Tệp chỉnh sửa:** `frontend/src/pages/Content/ContentPages.css`
- **Hành động:** Bọc selector dòng 499 trong class cha `.content-management-page`:
  ```css
  .content-management-page input[type='text'],
  .content-management-page select,
  .content-management-page textarea {
    font-size: 16px;
  }
  ```

#### 4.3 Khai báo Token Alias trong tokens.css (CSS-03)
- **Tệp chỉnh sửa:** `frontend/src/styles/tokens.css`
- **Hành động:** Bổ sung alias:
  ```css
  :root {
    --spacing-1: var(--space-1);
    --spacing-2: var(--space-2);
    --spacing-3: var(--space-3);
    --spacing-4: var(--space-4);
    --spacing-5: var(--space-5);
    --spacing-6: var(--space-6);
    --spacing-8: var(--space-8);
    
    --primary-50: var(--brand-50);
    --primary-100: var(--brand-100);
    --primary-500: var(--brand-500);
    --primary-600: var(--brand-600);
    --primary-700: var(--brand-700);

    --surface-subtle: var(--bg-surface-subtle);
    --surface-muted: var(--bg-surface-muted);
    --surface-hover: var(--bg-surface-hover);
  }
  ```

#### 4.4 Tăng z-index Action Dropdown Menu (CSS-04)
- **Tệp chỉnh sửa:** `frontend/src/components/staff/staff-shared.css:1306`
- **Hành động:** Đổi `z-index: 100` thành `z-index: var(--ui-layer-dropdown, 300)`.

---

## IV. CỔNG KIỂM THỬ VÀ ĐIỀU KIỆN CHẤP NHẬN (ACCEPTANCE GATES)

Mỗi giai đoạn phải vượt qua các cổng kiểm thử sau trước khi hợp nhất:

1. **Frontend Gate:**
   - `cd frontend && bun run lint` -> PASS (0 warnings, 0 errors).
   - `cd frontend && bun run test` -> PASS (toàn bộ 79 files / >545 tests).
   - `cd frontend && bun run build` -> PASS (0 type errors).
2. **Backend Gate:**
   - `cd backend && dotnet build StudyAI.sln` -> PASS (0 warnings, 0 errors).
   - `cd backend && dotnet test tests/StudyAI.UnitTests` -> PASS (263/263 tests).
3. **Database Safety Gate:**
   - Database connection string không bao giờ trỏ vào `StudyAIDb`.
   - Mọi test ghi phải trỏ vào `StudyAIDb_E2E` với fail-closed check.
4. **Git Policy:**
   - Giữ working tree sạch sẽ.
   - Commit message theo chuẩn Conventional Commits: `fix(sec):`, `fix(contract):`, `fix(mock):`, `refactor(css):`.
