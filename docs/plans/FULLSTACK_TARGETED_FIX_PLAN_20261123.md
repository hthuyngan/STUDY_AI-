# STUDY_AI — KẾ HOẠCH KHẮC PHỤC CHẤT LƯỢNG TOÀN DIỆN (FULLSTACK TARGETED FIX PLAN)

> **Ngày lập kế hoạch:** 2026-11-23  
> **Nhánh thực hiện:** `audit/fullstack-quality-plan-20261123`  
> **Pull Request:** [Draft PR #22](https://github.com/hthuyngan/STUDY_AI-/pull/22)  
> **Trạng thái Codex Review:** `REVIEW_BLOCKED_USAGE_LIMIT` (Yêu cầu review thất bại do chạm giới hạn hạn ngạch tài khoản GitHub; kế hoạch sẽ được nghiệm thu lại khi quota phục hồi).  
> **Tài liệu kiểm toán gốc:** `docs/audit/FULLSTACK_QUALITY_AUDIT_20261123.md`  
> **Chế độ thực hiện:** **AUDIT & PLAN ONLY — TUYỆT ĐỐI CHƯA SỬA MÃ NGUỒN.**

---

## I. NGUYÊN TẮC VÀ ĐIỀU KIỆN TIÊN QUYẾT

Kế hoạch này được xây dựng dựa trên các phát hiện đã kiểm chứng thực tế tại `docs/audit/FULLSTACK_QUALITY_AUDIT_20261123.md`. Quá trình thực hiện phải tuân thủ nghiêm ngặt các nguyên tắc sau:

1. **Server-Side Grading Authority:** Toàn quyền tính toán điểm số và trạng thái câu trả lời thuộc về server. Loại bỏ hoàn toàn sự tin tưởng vào điểm số từ payload client.
2. **Loại bỏ Side-Effect nguy hiểm:** Tách biệt rõ ràng giữa logic chấm bài tập của giáo viên và việc quản lý danh mục môn học / chủ đề. Không cho phép hành động chấm bài tự ý chèn dữ liệu vào bảng danh mục.
3. **Zero-Mock & Zero-Silent-Fallback:** Khi người dùng đã xác thực, nếu API thất bại phải hiển thị lỗi rõ ràng trên giao diện người dùng; không âm thầm nuốt ngoại lệ hay fallback vào localStorage.
4. **Không tự ý mở rộng Schema hoặc tạo API mới:** Giữ nguyên phạm vi xử lý; không tạo thêm bảng hay database migration ngoài kế hoạch khi chưa có yêu cầu nghiệp vụ rõ ràng từ sản phẩm.
5. **Bảo vệ tuyệt đối cơ sở dữ liệu sản xuất:** Nghiêm cấm chạy migration, seed hoặc write test trên `StudyAIDb`. Mọi thử nghiệm ghi dữ liệu phải chạy trên `StudyAIDb_E2E`.

---

## II. LỘ TRÌNH KHẮC PHỤC CHI TIẾT THEO GIAI ĐOẠN (5 PHASES)

```
┌────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: Bảo mật, Liêm chính thi cử & Phân quyền (SEC-01, SEC-02)     │
│  - Chấm điểm server-side theo loại câu hỏi, thang điểm và trạng thái   │
│  - Guard chống Admin tự khóa / tự hạ quyền & Revoke Session            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PHASE 2: Đồng bộ Contract & Xử lý Side-Effect (API-01, DATA-01)       │
│  - Chuẩn hóa 3 endpoint AI Governance & thêm alias tương thích ngược   │
│  - Xóa bỏ suy đoán môn học, mặc định sub_math10 & INSERT ContentSubject│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PHASE 3: Xóa bỏ Mock Fallback & Sửa lỗi LocalStorage (MOCK-01..04)    │
│  - Sửa lỗi ném Exception giả khi xóa lớp học / bài tập trong classroom │
│  - Loại bỏ nuốt ngoại lệ âm thầm trong getAnnouncements & getLibrary   │
│  - Chuẩn hóa client preferences không sinh theme cũ                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PHASE 4: Chuẩn hóa Kiến trúc CSS & Design Tokens (CSS-01..04)         │
│  - Xóa bỏ >580 dòng trùng lặp trong DashboardPage.css                  │
│  - Scope selector input[type='text'] trong ContentPages.css            │
│  - Khai báo token alias trong tokens.css cho 49 biến CSS               │
│  - Nâng z-index action dropdown trong staff-shared.css lên layer 300   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PHASE 5: Kiểm định Toàn diện & Báo cáo Nghiệm thu (Verification)      │
│  - Chạy full test suite: Oxlint + Vitest + Vite Build + Dotnet Tests  │
│  - Chạy SQL Integration Tests trên database StudyAIDb_E2E cô lập       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## III. THIẾT KẾ KỸ THUẬT VÀ PHƯƠNG ÁN TRIỂN KHAI

### GIAI ĐOẠN 1: BẢO MẬT, LIÊM CHÍNH THI CỬ & PHÂN QUYỀN

#### 1.1 Hoàn thiện Chấm điểm Server-side cho StudentAssessmentService (SEC-01)
- **Tệp chỉnh sửa:** `backend/src/StudyAI.Api/Features/Student/StudentAssessmentService.cs`
- **Hàm chỉnh sửa:** `SaveAttemptInternal`
- **Logic dự kiến triển khai:**
  1. *Lấy danh sách câu hỏi:*
     - Lấy danh sách ID câu hỏi từ `dto.Responses.Keys`.
     - Truy vấn `_db.ContentQuestions.AsNoTracking().Where(q => questionIds.Contains(q.Id))` để lấy đáp án chuẩn.
  2. *Chấm điểm theo loại câu hỏi (Question Types):*
     - `multiple-choice`: So khớp `SelectedOptionIds.FirstOrDefault()?.Trim()` với `q.CorrectAnswer.Trim()`. Khớp (không phân biệt hoa thường) -> `IsCorrect = true`.
     - `multiple-select`: Parse `q.CorrectAnswer` thành mảng string. So sánh tập hợp ID đã chọn với tập hợp đáp án đúng. Toàn bộ trùng khớp -> `IsCorrect = true`.
     - `true-false`: Chuẩn hóa `"true"`/`"false"` hoặc `"A"`/`"B"` và so sánh trực tiếp.
     - `short-answer`: Chuẩn hóa chuỗi số hoặc biểu thức văn bản bằng hàm chuẩn hóa trước khi so sánh với `q.CorrectAnswer`.
     - Tuyệt đối KHÔNG gán `resp.IsCorrect = rDto.IsCorrect` từ payload client.
  3. *Thang điểm (Scoring Scale):*
     - Mỗi câu đúng cộng 1.0 điểm (hoặc theo trọng số câu hỏi): `ScoreRaw = correctCount`.
     - `ScoreMin = 0.0`, `ScoreMax = totalQuestions`.
     - `ScoreScaled = totalQuestions > 0 ? Math.Round((double)correctCount / totalQuestions * 10.0, 1) : 0.0`.
  4. *Trạng thái bài thi (Attempt Lifecycle):*
     - Nếu `dto.CompletionStatus == "in_progress"`: Lưu các câu trả lời học sinh đã chọn, tích lũy thời gian làm bài, nhưng KHÔNG trả về `IsCorrect`, `Explanation`, `CorrectAnswer` cho học sinh.
     - Nếu `dto.CompletionStatus == "completed"`: Đánh dấu bài làm hoàn thành, gán `CompletedAt = _clock.UtcNow`, cập nhật `SuccessStatus` (`"passed"` nếu `ScoreScaled >= 5.0`), và khóa phiên làm bài.
     - Kiểm tra: Nếu attempt đã có `CompletionStatus == "completed"`, mọi yêu cầu cập nhật tiếp theo đều ném `ConflictException("Phiên làm bài đã hoàn thành không thể chỉnh sửa.")`.
- **Tác động:**
  - FE: Không cần tự tính điểm, hiển thị điểm chính thức do server trả về.
  - BE: Chấm điểm an toàn, vô hiệu hóa hoàn toàn việc gian lận điểm qua HTTP client.
  - SQL: Không đổi schema, lưu trữ kết quả trung thực.
- **Regression Tests:** Viết unit test gửi payload với `scoreRaw: 100`, `isCorrect: true` nhưng chọn đáp án sai; kiểm chứng server lưu `ScoreRaw = 0.0`.

#### 1.2 Bổ sung Guard tự khóa / tự hạ quyền và Revoke Session (SEC-02)
- **Tệp chỉnh sửa:** `backend/src/StudyAI.Api/Features/Admin/AdminUsersService.cs`
- **Hàm chỉnh sửa:** `UpdateUserAsync`
- **Logic dự kiến triển khai:**
  ```csharp
  if (user.Id == currentUserId)
  {
      if (!string.IsNullOrWhiteSpace(req.Role) && req.Role.Trim().ToLowerInvariant() != "admin")
      {
          throw new ForbiddenException("Không thể tự hạ quyền quản trị viên của chính mình.");
      }
      if (!string.IsNullOrWhiteSpace(req.Status) && req.Status.Trim().ToLowerInvariant() != "active")
      {
          throw new ForbiddenException("Không thể tự khóa tài khoản của chính mình.");
      }
  }
  ```
  Khi cập nhật trạng thái người dùng sang `suspended` hoặc `disabled`:
  ```csharp
  if (user.Status is "suspended" or "disabled")
  {
      await RevokeUserSessionsAsync(userId, currentUserId, ct);
  }
  ```
- **Tác động:**
  - Ngăn ngừa tình trạng toàn bộ hệ thống bị mất quyền quản trị viên do admin vô tình tự đổi role hoặc tự khóa mình.
- **Regression Tests:** Unit test gọi `UpdateUserAsync` với `userId == currentUserId` và `role = learner`, xác nhận trả về HTTP 403 Forbidden.

---

### GIAI ĐOẠN 2: ĐỒNG BỘ CONTRACT & XỬ LÝ SIDE-EFFECT NGUY HIỂM

#### 2.1 Chuẩn hóa Route AI Governance (API-01)
- **Tệp chỉnh sửa:**
  - `frontend/src/services/teacherManagement.service.ts`:
    - Đổi `/api/v1/content/governance/quality-audit` -> `/api/v1/content/governance/ai-audit`.
    - Đổi `/api/v1/content/governance/lesson-authoring/outline` -> `/api/v1/content/governance/ai-authoring/outline`.
    - Đổi `/api/v1/content/governance/lesson-authoring/checkpoint-questions` -> `/api/v1/content/governance/ai-authoring/questions`.
  - `backend/src/StudyAI.Api/Features/Content/ContentGovernanceController.cs`:
    - Bổ sung route alias cho các action tương ứng để hỗ trợ cả 2 chuẩn, đảm bảo backward compatibility.
- **Tác động:**
  - Loại bỏ hoàn toàn lỗi 404 khi giáo viên sử dụng các công cụ AI hỗ trợ soạn giáo án.
- **Regression Tests:** Vitest kiểm chứng các hàm trong `teacherManagement.service.ts` gọi đúng route mới; integration test kiểm chứng cả hai route alias đều trả về HTTP 200/201.

#### 2.2 Xử lý Side-Effect trong Quá trình Chấm Bài (DATA-01)
- **Tệp chỉnh sửa:** `backend/src/StudyAI.Api/Features/Teacher/TeacherSubmissionsService.cs`
- **Hàm chỉnh sửa:** `GradeSubmissionAsync`
- **Logic dự kiến triển khai:**
  1. *Lấy SubjectId chuẩn:*
     - Lấy trực tiếp từ lớp học: `string? subjectId = assignment.Classroom?.Subject;`.
     - Nếu không có, để `subjectId = null`, tuyệt đối không dùng heuristic tìm chuỗi trong tiêu đề bài tập và không mặc định `sub_math10`.
  2. *Loại bỏ Side-effect tự tạo ContentSubject:*
     - Xóa bỏ hoàn toàn khối lệnh:
       ```csharp
       // XÓA BỎ HOÀN TOÀN KHỐI NÀY:
       var subjectExists = await _db.ContentSubjects.AnyAsync(...);
       if (!subjectExists && resolvedSubjectId.StartsWith("sub_math")) {
           _db.ContentSubjects.Add(new ContentSubject { ... });
           await _db.SaveChangesAsync(cancellationToken);
       }
       ```
     - Chấm điểm là nghiệp vụ giao dịch kết quả học tập của học sinh, không được phép can thiệp vào bảng danh mục chương trình học.
  3. *Chuẩn hóa cập nhật Topic Mastery:*
     - Chỉ cập nhật `StudentTopicMastery` nếu bài tập có liên kết với `LessonId` hoặc `TopicId` chuẩn trong hệ thống.
     - Nếu bài tập chỉ có tiêu đề tự do (ví dụ: "Kiểm tra 15 phút"), chỉ cập nhật điểm số và phản hồi vào bảng `AssignmentSubmission`, không tạo hoặc cập nhật `StudentTopicMastery` bằng chuỗi tự do.
- **Tác động:**
  - Bảo vệ tính toàn vẹn của bảng `ContentSubjects` và không làm sai lệch biểu đồ radar năng lực của học sinh.
- **Regression Tests:** Viết test chấm điểm bài tập với tiêu đề "Kiểm tra 15 phút tuần 1", kiểm tra `_db.ContentSubjects` không phát sinh bản ghi mới và `_db.StudentTopicMasteries` không bị chèn chuỗi tự do.

---

### GIAI ĐOẠN 3: XÓA BỎ MOCK FALLBACK & LOCALSTORAGE

#### 3.1 Sửa lỗi ném ngoại lệ giả khi xóa Lớp học và Bài tập (MOCK-01)
- **Tệp chỉnh sửa:** `frontend/src/services/classroom.service.ts`
- **Hàm chỉnh sửa:** `deleteClass`, `deleteAssignment`
- **Logic dự kiến triển khai:**
  ```typescript
  async deleteClass(classId: string): Promise<void> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/classrooms/${classId}`)
      // Xóa bỏ dòng loadFromStorage và saveToStorage gây ném ngoại lệ giả
      return
    }
    ...
  }
  ```
  Áp dụng tương tự cho `deleteAssignment`.
- **Tác động:**
  - Khi xóa lớp học hoặc bài tập thành công trên server, giao diện thông báo toast thành công thay vì thông báo lỗi đỏ giả.
- **Regression Tests:** Vitest mô phỏng có token hợp lệ, gọi `deleteClass` và kiểm chứng hàm hoàn thành mà không ném ngoại lệ.

#### 3.2 Minh bạch hóa xử lý lỗi trong Operations Service (MOCK-02)
- **Tệp chỉnh sửa:** `frontend/src/services/operations.service.ts`
- **Hàm chỉnh sửa:** `getAnnouncements`, `submitForApproval`
- **Logic dự kiến triển khai:**
  - Trong `getAnnouncements`: Khi có token, nếu API gặp lỗi, quăng ngoại lệ ra để component hiển thị Error Alert và nút Retry; không rơi vào `catch` rồi âm thầm trả về `DEFAULT_ANNOUNCEMENTS`.
  - Trong `submitForApproval`: Khi có token, nếu server đã tiếp nhận mà danh sách chưa kịp cập nhật, trả về đối tượng phê duyệt tạm thời dựa trên phản hồi của API thay vì ghi dữ liệu ảo vào `localStorage`.
- **Tác động:**
  - Đảm bảo tính trung thực 100% của dữ liệu khi người dùng đăng nhập.
- **Regression Tests:** Vitest kiểm tra khi API thông báo lỗi, `getAnnouncements` ném lỗi thay vì trả về mảng dữ liệu mẫu.

#### 3.3 Chuẩn hóa Client Preferences (MOCK-03 & MOCK-04)
- **Tệp chỉnh sửa:** `frontend/src/services/supporting.service.ts`
- **Logic dự kiến triển khai:**
  - Tuân thủ nguyên tắc không tạo API hay migration ngoài kế hoạch: Giữ `getUserSettings` là client preferences cục bộ, xóa bỏ việc lưu trữ `study_ai_theme` vì hệ thống đã chuyển sang Light Mode duy nhất.
  - Trong `getLibraryItems`: Quăng lỗi thay vì nuốt ngoại lệ thành `[]` khi API thất bại.
- **Tác động:**
  - Giao diện thư viện hiển thị thông báo lỗi mạng rõ ràng.
- **Regression Tests:** Vitest kiểm tra `getLibraryItems` quăng ngoại lệ khi API thất bại.

---

### GIAI ĐOẠN 4: CHUẨN HÓA KIẾN TRÚC CSS & DESIGN TOKENS

#### 4.1 Xóa bỏ CSS trùng lặp trong DashboardPage.css (CSS-01)
- **Tệp chỉnh sửa:** `frontend/src/pages/Dashboard/DashboardPage.css`
- **Hành động cụ thể:** Xóa bỏ toàn bộ các khai báo layout trùng lặp từ dòng 8 đến dòng 595 (`.app-shell`, `.sidebar`, `.topbar`, `.btn-*`); chỉ giữ lại các class riêng của Dashboard (`.dashboard-container`, `.kpi-card`, `.activity-chart`).
- **Tác động:** Tránh xung đột CSS specificity và loại bỏ hiện tượng giật giao diện (layout shift) khi chuyển trang.

#### 4.2 Scope Selector trong ContentPages.css (CSS-02)
- **Tệp chỉnh sửa:** `frontend/src/pages/Content/ContentPages.css`
- **Hành động cụ thể:**
  Thay thế selector dòng 499:
  ```css
  /* TRƯỚC: Gây bleed toàn cục */
  input[type='text'], select, textarea { font-size: 16px !important; }

  /* SAU: Đã được scope an toàn */
  .content-management-container input[type='text'],
  .content-management-container select,
  .content-management-container textarea {
    font-size: 16px;
  }
  ```

#### 4.3 Khai báo Token Alias trong tokens.css (CSS-03)
- **Tệp chỉnh sửa:** `frontend/src/styles/tokens.css`
- **Hành động cụ thể:** Bổ sung các alias trong `:root`:
  - `--spacing-1` đến `--spacing-8` -> trỏ về `--space-1` đến `--space-8`.
  - `--primary-50` đến `--primary-700` -> trỏ về `--brand-50` đến `--brand-700`.
  - `--surface-subtle`, `--surface-muted`, `--surface-hover` -> trỏ về `--bg-surface-subtle`, `--bg-surface-muted`, `--bg-surface-hover`.
  - `--color-paper` -> `--bg-surface`; `--color-primary-navy` -> `--brand-900`.

#### 4.4 Nâng z-index Dropdown Menu (CSS-04)
- **Tệp chỉnh sửa:** `frontend/src/components/staff/staff-shared.css`
- **Hành động cụ thể:** Đổi `.action-dropdown-menu` từ `z-index: 100` thành `z-index: var(--ui-layer-dropdown, 300)`.

---

## IV. TIÊU CHÍ NGHIỆM THU VÀ CỔNG KIỂM THỬ (ACCEPTANCE GATES)

Mỗi giai đoạn trước khi hoàn tất phải vượt qua 100% các cổng kiểm thử sau:

1. **Frontend Gate:**
   - `cd frontend && bun run lint` -> 0 warnings, 0 errors.
   - `cd frontend && bun run test` -> 79/79 files passed, toàn bộ >545 unit tests passed.
   - `cd frontend && bun run build` -> Hoàn thành không lỗi TypeScript.
2. **Backend Gate:**
   - `cd backend && dotnet build StudyAI.sln` -> 0 Warnings, 0 Errors.
   - `cd backend && dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj` -> 263/263 passed.
3. **Database Guard Gate:**
   - Database connection string không bao giờ trỏ vào `StudyAIDb`.
   - Kiểm thử SQL Integration chỉ chạy trên `StudyAIDb_E2E`.
4. **Git Policy:**
   - Git working tree sạch sẽ, commit message chuẩn Conventional Commits.
