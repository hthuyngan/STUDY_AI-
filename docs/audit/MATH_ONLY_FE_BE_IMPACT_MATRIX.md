# STUDY_AI — MATH 10–12 ONLY: MA TRẬN TÁC ĐỘNG CHI TIẾT (FULL-STACK IMPACT MATRIX REVISED)

**Tài liệu:** Bảng Đối chiếu Kỹ thuật Chi tiết Từng Thay đổi Đề xuất  
**Ngày kiểm toán:** 2026-11-23  
**Chế độ thực hiện:** AUDIT & PLAN ONLY (Chưa sửa mã nguồn hoặc database)  
**Nhánh nguồn:** `feature/backend-redesign-modular-monolith`  
**Nhánh kế hoạch:** `audit/math-only-cleanup-plan-20261123` (Draft PR #23)  

---

## 1. TIÊU CHUẨN MA TRẬN TÁC ĐỘNG

Mỗi thay đổi dự kiến trong kế hoạch dọn dẹp và chuẩn hóa Math 10–12 được mô tả tường minh qua **08 trường thông tin bắt buộc**:
1. **File:** Đường dẫn file trong dự án.
2. **Hàm / Vị trí:** Hàm, phương thức hoặc khối giao diện bị tác động.
3. **Logic Hiện tại:** Đoạn code và cơ chế đang vận hành.
4. **Logic Đề xuất:** Đoạn code và giải pháp kỹ thuật mới.
5. **Lý do Điều chỉnh:** Nguyên nhân gốc rễ và mục tiêu giải quyết.
6. **Rủi ro & Biện pháp Kiểm soát:** Các nguy cơ phát sinh và phương án phòng ngừa.
7. **Bài Kiểm thử (Automated / Manual Test):** Test case xác minh thay đổi.
8. **Tiêu chí Nghiệm thu (DoD):** Điều kiện công nhận hoàn thành.

---

## 2. BẢNG ĐỐI CHIẾU 16 PHÂN HỆ THAY ĐỔI CHI TIẾT

---

### [ITEM 01] Chặn File Import Ngoài Toán trong Validator
- **File:** `backend/src/StudyAI.Api/Features/Content/CurriculumImportValidator.cs`
- **Hàm / Vị trí:** `ValidateSubject(CurriculumSubjectImportDto sub, ...)` (dòng 190-245).
- **Logic Hiện tại:** Chỉ kiểm tra `!string.IsNullOrWhiteSpace(sub.Code)` và trùng mã trong file. Chấp nhận mọi mã môn học bất kỳ (ví dụ `PHYS12`, `CHEM12`, `ABC`).
- **Logic Đề xuất:** Thêm kiểm tra whitelist `AllowedSubjectCodes = { "MATH10", "MATH11", "MATH12" }`. Nếu mã môn không thuộc danh sách, thêm lỗi `UNSUPPORTED_SUBJECT_SCOPE` và từ chối nhập file.
- **Lý do Điều chỉnh:** Ngăn chặn ngay từ khâu validation tải file lên, không để môn ngoài Toán lọt vào bước confirm.
- **Rủi ro & Biện pháp:** File giáo trình cũ có thể bị từ chối; Biện pháp: Đảm bảo toàn bộ giáo trình chuẩn sử dụng `MATH10`, `MATH11`, `MATH12`.
- **Bài Kiểm thử:** `REG-03: CurriculumImport_Rejects_NonMath_Subject_Codes`.
- **Tiêu chí Nghiệm thu:** File import chứa mã ngoài Toán trả về lỗi 400/422 với thông báo rõ ràng; không có môn mới nào được tạo trong DB.

---

### [ITEM 02] Ánh xạ ID Chuẩn & Chặn Sinh GUID khi Import Confirm
- **File:** `backend/src/StudyAI.Api/Features/Content/CurriculumImportConfirmService.cs`
- **Hàm / Vị trí:** Vòng lặp `foreach (var sub in session.Batch.Subjects)` (dòng 143-178).
- **Logic Hiện tại:** Nếu `existingSub == null`, tự sinh `Id = Guid.NewGuid().ToString("N")` và thêm vào `ContentSubjects`.
- **Logic Đề xuất:**
  - Kiểm tra `sub.Code` qua từ điển ánh xạ: `MATH10 -> sub_math10`, `MATH11 -> sub_math11`, `MATH12 -> sub_math12`.
  - Nếu môn đã có trong DB với Canonical ID thì tái sử dụng. Nếu chưa có, tạo mới với đúng Canonical ID (tuyệt đối không dùng GUID).
- **Lý do Điều chỉnh:** Tránh sinh ra các môn học trùng lặp có ID dạng GUID ngẫu nhiên làm rác cơ sở dữ liệu.
- **Rủi ro & Biện pháp:** Xung đột khóa chính nếu `sub_math10` đã có trong DB; Biện pháp: Đã kiểm tra `existingSub != null` trước khi thêm.
- **Bài Kiểm thử:** `REG-04: CurriculumImport_Maps_To_Canonical_Ids_Without_Creating_Guid_Subjects`.
- **Tiêu chí Nghiệm thu:** Môn Toán import mới luôn mang ID chuẩn `sub_math10/11/12`; không phát sinh ID GUID.

---

### [ITEM 03] Tách Lưu Điểm & Xóa Tự Tạo Môn Học khi Giáo viên Chấm Bài
- **File:** `backend/src/StudyAI.Api/Features/Teacher/TeacherSubmissionsService.cs`
- **Hàm / Vị trí:** `GradeSubmissionAsync` (dòng 280-365).
- **Logic Hiện tại:** Suy đoán môn học từ tiêu đề ("vật", "lí", "hóa",...); mặc định `sub_math10`; tự động `_db.ContentSubjects.Add(...)` khi `subjectExists == false`.
- **Logic Đề xuất:**
  - Điểm bài tập (`submission.Score`, `submission.Feedback`, `Status = "graded"`) luôn được lưu thành công.
  - Xóa bỏ hoàn toàn logic đoán môn học và đoạn `_db.ContentSubjects.Add(...)`.
  - Chỉ cập nhật `StudentTopicMastery` khi lớp học/bài tập thuộc môn Toán chuẩn và topic có trong DB; nếu không thì bỏ qua cập nhật mastery và log warning an toàn.
- **Lý do Điều chỉnh:** Ngăn giáo viên vô tình tạo môn rác mới khi chấm bài; đảm bảo điểm bài tập luôn được bảo toàn độc lập với mastery.
- **Rủi ro & Biện pháp:** Học sinh không được tăng mastery nếu bài tập không gắn đúng topic; Biện pháp: Log cảnh báo rõ ràng để giáo viên chuẩn hóa bài tập.
- **Bài Kiểm thử:** `REG-05: TeacherGrading_Does_Not_Auto_Create_ContentSubject` & `REG-06: TeacherGrading_Saves_Score_Even_When_Topic_Mastery_Unresolvable`.
- **Tiêu chí Nghiệm thu:** Chấm bài thành công 100%, không thêm bất kỳ bản ghi nào vào `content_subjects`.

---

### [ITEM 04] Loại Bỏ Seed 8 Môn Chuẩn Ngoài Toán trong DbInitializer
- **File:** `backend/src/StudyAI.Api/Data/DbInitializer.cs`
- **Hàm / Vị trí:** `InitializeAsync` (dòng 320-350).
- **Logic Hiện tại:** Vòng lặp chèn 8 môn `sub_phys12`..`sub_civic12` vào `ContentSubjects` mỗi khi DB khởi tạo.
- **Logic Đề xuất:** Xóa bỏ hoàn toàn mảng `standardSubjects` và logic chèn 8 môn này. Chỉ giữ lại code khởi tạo `sub_math10`, `sub_math11`, `sub_math12`.
- **Lý do Điều chỉnh:** Triệt tiêu nguồn gốc sinh ra 8 môn học không thuộc phạm vi Toán học trong DB.
- **Rủi ro & Biện pháp:** Test cũ cần dữ liệu môn Vật lý có thể fail; Biện pháp: Chuyển toàn bộ test suites sang dùng `sub_math10` làm mẫu thử.
- **Bài Kiểm thử:** `BackendIntegrationTests: DbInitializer_Seeds_Only_Math10_12`.
- **Tiêu chí Nghiệm thu:** Khởi tạo DB trắng chỉ có duy nhất 3 môn học Toán 10, 11, 12.

---

### [ITEM 05] Whitelist Cặp đôi Bắt buộc trong Danh mục Học sinh
- **File:** `backend/src/StudyAI.Api/Features/Student/StudentCurriculumService.cs`
- **Hàm / Vị trí:** `GetSubjectsAsync` (dòng 50-55).
- **Logic Hiện tại:** Dùng negative blacklist loại trừ 7 tiền tố test (`!s.Code.StartsWith("TEST_") && !s.Code.StartsWith("PHYS12_") ...`).
- **Logic Đề xuất:** Áp dụng Strict Canonical Pair Whitelist:
  `Where(s => s.IsActive && ((s.Id == "sub_math10" && s.Code == "MATH10") || (s.Id == "sub_math11" && s.Code == "MATH11") || (s.Id == "sub_math12" && s.Code == "MATH12")))`.
- **Lý do Điều chỉnh:** Ngăn chặn triệt để tình trạng lọt môn rác có Code đúng nhưng ID sai hoặc ngược lại; thay thế blacklist mong manh bằng whitelist tường minh.
- **Rủi ro & Biện pháp:** Bỏ sót môn nếu DB bị sai ID; Biện pháp: Đã có kế hoạch Remap ID trong SQL Rehearsal.
- **Bài Kiểm thử:** `REG-01: GetSubjects_Returns_Exactly_Three_Canonical_Math_Subjects` & `REG-02: GetSubjects_Rejects_Duplicate_Code_Or_Mismatched_Id_Subjects`.
- **Tiêu chí Nghiệm thu:** API `GET /api/v1/curriculum/subjects` trả về đúng 3 môn Toán, không lọt môn khác.

---

### [ITEM 06] Whitelist Khối Tiến độ Dashboard Học sinh
- **File:** `backend/src/StudyAI.Api/Features/Student/StudentPracticeService.cs`
- **Hàm / Vị trí:** `GetDashboardStatsAsync` (dòng 1005-1008).
- **Logic Hiện tại:** `Where(s => s.IsActive && !s.Name.StartsWith("TEST_"))`. Mọi môn không có tên bắt đầu bằng "TEST_" đều bị đưa vào tính toán tiến độ.
- **Logic Đề xuất:** Áp dụng Strict Canonical Pair Whitelist tương tự như `StudentCurriculumService`.
- **Lý do Điều chỉnh:** Đảm bảo khối "Tiến độ theo môn học" trên Dashboard học sinh chỉ hiển thị đúng 3 môn Toán 10, 11, 12.
- **Rủi ro & Biện pháp:** Không có rủi ro; tiến độ tổng của học sinh vẫn được tính toàn vẹn.
- **Bài Kiểm thử:** `StudentPracticeIntegrationTests: GetDashboardStats_Returns_Only_Math_Progress`.
- **Tiêu chí Nghiệm thu:** `subjectProgressList` trong response API có độ dài tối đa là 3, không chứa môn rác.

---

### [ITEM 07] Lọc Môn Quản trị Nội dung Phía Backend
- **File:** `backend/src/StudyAI.Api/Features/Content/ContentSubjectsService.cs`
- **Hàm / Vị trí:** `ListSubjectsAsync` (dòng 28-31).
- **Logic Hiện tại:** `_db.ContentSubjects.AsQueryable()` không có filter mặc định theo phạm vi môn học của hệ thống.
- **Logic Đề xuất:** Mặc định lọc các môn có `Code` bắt đầu bằng `MATH` hoặc `Id` trong danh sách canonical; cho phép admin lọc nâng cao khi cần.
- **Lý do Điều chỉnh:** Giữ không gian quản trị nội dung gọn gàng, tập trung chuyên sâu cho môn Toán THPT.
- **Rủi ro & Biện pháp:** Admin không thấy môn rác để dọn; Biện pháp: Đã có script SQL audit chuyên dụng.
- **Bài Kiểm thử:** `ContentSubjectsUnitTests: ListSubjects_Filters_To_Math_Domain`.
- **Tiêu chí Nghiệm thu:** Màn hình Content Management hiển thị danh mục môn Toán chuẩn.

---

### [ITEM 08] Khóa Resolver Chỉ Phân giải Môn Toán theo Khối lớp
- **File:** `backend/src/StudyAI.Api/Common/Utilities/SubjectGradeResolver.cs`
- **Hàm / Vị trí:** `ResolveSubjectAsync` (dòng 217-226).
- **Logic Hiện tại:** `Where(s => s.IsActive && (s.Grade == normalized || s.Id == $"sub_math{normalized}" || s.Code == $"MATH{normalized}"))`.
- **Logic Đề xuất:** Siết chặt điều kiện: Môn được resolve theo `userGrade` phải thuộc tập 3 cặp canonical Toán (`sub_math10`, `sub_math11`, `sub_math12`).
- **Lý do Điều chỉnh:** Ngăn tình trạng resolver trả về môn không phải Toán nếu môn đó có cùng khối lớp và đứng trước trong OrderIndex.
- **Rủi ro & Biện pháp:** Resolver không trả về môn nếu userGrade null; Biện pháp: Resolver đã có fallback an toàn, không tự ý gán bừa.
- **Bài Kiểm thử:** `SubjectGradeResolverTests: ResolveSubject_Returns_Strict_Canonical_Math`.
- **Tiêu chí Nghiệm thu:** Học sinh lớp 10, 11, 12 luôn được resolve chính xác về `sub_math10`, `sub_math11`, `sub_math12`.

---

### [ITEM 09] Lọc Môn học Thống kê Toàn hệ thống Admin
- **File:** `backend/src/StudyAI.Api/Features/Admin/AdminDashboardService.cs`
- **Hàm / Vị trí:** `GetSystemAnalyticsAsync` (dòng 296).
- **Logic Hiện tại:** `_db.ContentSubjects.Where(s => s.IsActive).ToListAsync(ct)`.
- **Logic Đề xuất:** Thêm điều kiện lọc môn canonical Toán để báo cáo tỷ lệ hoàn thành bài học phản ánh đúng chương trình đang hoạt động.
- **Lý do Điều chỉnh:** Loại bỏ các môn rỗng (0 bài học) làm sai lệch chỉ số KPI tổng thể.
- **Rủi ro & Biện pháp:** Không ảnh hưởng dữ liệu; chỉ tác động cách tính chỉ số hiển thị.
- **Bài Kiểm thử:** `AdminDashboardIntegrationTests: Analytics_Reflects_Math_Only`.
- **Tiêu chí Nghiệm thu:** Chỉ số hoàn thành bài học trên Admin Dashboard chính xác, không bị kéo tụt bởi môn rỗng.

---

### [ITEM 10] Giữ Nguyên Logic Authenticated của getClasses() Phía Frontend
- **File:** `frontend/src/services/classroom.service.ts`
- **Hàm / Vị trí:** `getClasses()` (dòng 570-595).
- **Logic Hiện tại:** Khi `getAccessToken()` có giá trị, gọi `apiClient.get<ClassroomDto[]>('/api/v1/classrooms')` và trả về `[]` nếu rỗng. Fallback mock chỉ chạy khi `!getAccessToken()`.
- **Logic Đề xuất:** **GIỮ NGUYÊN** logic authenticated của hàm này. Không viết lại vì code hiện tại đã xử lý danh sách rỗng từ Backend hoàn toàn chính xác.
- **Lý do Điều chỉnh:** Tránh over-engineering và tránh gây lỗi hồi quy đối với luồng gọi API thật của giáo viên.
- **Rủi ro & Biện pháp:** Không có rủi ro vì không sửa đổi luồng hoạt động ổn định.
- **Bài Kiểm thử:** `classroom.service.test.ts: Authenticated_GetClasses_Returns_Api_Data`.
- **Tiêu chí Nghiệm thu:** Giáo viên thật nhận đúng danh sách lớp từ API; nếu chưa có lớp trả về `[]`.

---

### [ITEM 11] Bỏ Hardcode "Nguyễn Văn Hải" trong Form Tạo Lớp của Giáo viên
- **File:** `frontend/src/pages/Teacher/TeacherClassesPage.tsx`
- **Hàm / Vị trí:** Khởi tạo `formData` (dòng 41) và `handleOpenCreate` (dòng 128).
- **Logic Hiện tại:** Hardcode `homeroomTeacherName: teacherFilter !== 'all' ? teacherFilter : 'ThS. Nguyễn Văn Hải'`.
- **Logic Đề xuất:** Gán `homeroomTeacherName: user?.displayName || user?.email || 'Giáo viên'`. Bỏ demo teacher filter không cần thiết đối với role teacher.
- **Lý do Điều chỉnh:** Đảm bảo khi giáo viên thật tạo lớp học mới, tên giáo viên chủ nhiệm luôn là tên của chính họ.
- **Rủi ro & Biện pháp:** Người dùng chưa có display name; Biện pháp: Đã có fallback sang `user.email` hoặc "Giáo viên".
- **Bài Kiểm thử:** `TeacherClassesPage.test.tsx: Form_Initializes_With_Logged_In_Teacher_Name`.
- **Tiêu chí Nghiệm thu:** Mở modal tạo lớp thấy tên giáo viên đăng nhập, không còn chữ "ThS. Nguyễn Văn Hải".

---

### [ITEM 12] Bỏ Hardcode "Nguyễn Văn Hải" trong Form Tạo Lớp Admin
- **File:** `frontend/src/pages/Admin/AdminClassesPage.tsx`
- **Hàm / Vị trí:** `formData` (dòng 37) và `handleOpenCreate` (dòng 110).
- **Logic Hiện tại:** Hardcode `homeroomTeacherName: 'ThS. Nguyễn Văn Hải'`.
- **Logic Đề xuất:** Cho phép Admin chọn giáo viên chủ nhiệm từ danh sách giáo viên thật đã nạp qua API `/api/v1/admin/users?role=teacher`.
- **Lý do Điều chỉnh:** Tránh mặc định mọi lớp do admin tạo đều mang tên "Nguyễn Văn Hải".
- **Rủi ro & Biện pháp:** Hệ thống chưa có giáo viên nào; Biện pháp: Hiển thị placeholder "Chưa phân công giáo viên".
- **Bài Kiểm thử:** `AdminClassesPage.test.tsx: Admin_Can_Select_Teacher`.
- **Tiêu chí Nghiệm thu:** Form tạo lớp trong trang Admin không còn giá trị cứng "ThS. Nguyễn Văn Hải".

---

### [ITEM 13] Làm Sạch Visual Map & Whitelist Frontend Subjects Service
- **File:** `frontend/src/services/subjects.service.ts`
- **Hàm / Vị trí:** `SUBJECT_VISUAL_MAP` (dòng 13-91) và `getSubjects()` (dòng 154-161).
- **Logic Hiện tại:** Chứa metadata của 8 môn ngoài Toán (`PHYS12`..`CIVIC12`); `getSubjects()` cho phép môn có tên chứa chữ "toán" hoặc `id === 'math'`.
- **Logic Đề xuất:** Xóa 8 môn ngoài Toán khỏi map; `getSubjects()` chỉ chấp nhận `s.id === 'sub_math10' || s.id === 'sub_math11' || s.id === 'sub_math12'`.
- **Lý do Điều chỉnh:** Đồng bộ giao diện người dùng chỉ phục vụ duy nhất 3 môn Toán THPT.
- **Rủi ro & Biện pháp:** Component cũ truy vấn icon của `PHYS12`; Biện pháp: `resolveVisualMeta` đã có default icon an toàn.
- **Bài Kiểm thử:** `subjects.service.test.ts: GetSubjects_Returns_Only_Math10_12`.
- **Tiêu chí Nghiệm thu:** Giao diện học sinh không còn bất kỳ dấu vết nào của các môn ngoài Toán.

---

### [ITEM 14] Xóa File Dead Code teacher.mock.ts
- **File:** `frontend/src/data/staff/teacher.mock.ts`
- **Hàm / Vị trí:** Toàn bộ file.
- **Logic Hiện tại:** Chứa `INITIAL_MOCK_CLASSES`, `TeacherRecentSubmission`, `TeacherAttentionStudent`.
- **Logic Đề xuất:** Xóa file (hoặc đánh dấu `@deprecated` và gỡ bỏ hoàn toàn).
- **Lý do Điều chỉnh:** File dead code không được import bởi bất kỳ component hay test nào (đã kiểm chứng bằng `git grep`).
- **Rủi ro & Biện pháp:** Gãy build nếu có import ẩn; Biện pháp: Đã kiểm tra không có file nào import.
- **Bài Kiểm thử:** `FrontendBuildTest: bun run build` vượt qua không lỗi.
- **Tiêu chí Nghiệm thu:** File được dọn dẹp sạch sẽ, dự án build thành công 100%.

---

### [ITEM 15] Kịch bản SQL Rehearsal An toàn: Snapshot Table & Explicit ID Cleanup
- **File:** Kịch bản SQL Rehearsal (`docs/plans/MATH_ONLY_CURRICULUM_CLEANUP_PLAN.md`).
- **Hàm / Vị trí:** Script 1, 2, 3, 4 trên database `StudyAIDb_E2E`.
- **Logic Hiện tại (bản cũ bị phê bình):** Dùng `DELETE WHERE Id LIKE 'cls-test%'` hoặc `TeacherId LIKE '%test%'`.
- **Logic Đề xuất:**
  - Chụp snapshot toàn bộ trạng thái vào bảng tạm `#PreCleanupSubjectAudit`.
  - Nghiêm cấm wildcard delete; chỉ xóa theo danh sách ID cụ thể đã kiểm chứng (`@VerifiedTestClassIds`).
  - Rollback động từ bảng snapshot `#PreCleanupSubjectAudit`, không dùng danh sách ID hardcode.
- **Lý do Điều chỉnh:** Ngăn chặn tuyệt đối việc xóa nhầm lớp học thật của giáo viên; bảo toàn tính phục hồi dữ liệu.
- **Rủi ro & Biện pháp:** Chạy nhầm trên DB thật; Biện pháp: Fail-closed check `IF DB_NAME() = 'StudyAIDb' RAISERROR...`.
- **Bài Kiểm thử:** `REG-11: Stateful_Sql_Rollback_Restores_Exact_Pre_Cleanup_State`.
- **Tiêu chí Nghiệm thu:** Diễn tập dọn dẹp trên `StudyAIDb_E2E` thành công, assert kiểm tra an toàn vượt qua 100%.

---

### [ITEM 16] Thiết lập Chốt Chặn Bảo vệ Cơ sở Dữ liệu Sản xuất StudyAIDb
- **File:** Toàn bộ script dọn dẹp và test harness.
- **Hàm / Vị trí:** Kết nối cơ sở dữ liệu và Script header.
- **Logic Hiện tại:** Cảnh báo bằng lời nhắc trong tài liệu.
- **Logic Đề xuất:** Chốt chặn mức mã (Code-level Fail-Closed Guard): Kiểm tra chuỗi kết nối và tên DB runtime. Nếu tên DB là `StudyAIDb`, tự động ném exception và hủy ngay lập tức mọi thao tác ghi/xóa/migration.
- **Lý do Điều chỉnh:** Tuân thủ điều khoản tối cao bảo vệ dữ liệu sản xuất trong `AGENTS.md`.
- **Rủi ro & Biện pháp:** Nhầm lẫn biến môi trường; Biện pháp: Hardcode chặn trong script kiểm thử.
- **Bài Kiểm thử:** `DatabaseSafetyGuardTests: Write_To_StudyAIDb_Throws_Fatal_Exception`.
- **Tiêu chí Nghiệm thu:** Không có bất kỳ truy vấn thay đổi dữ liệu nào lọt vào `StudyAIDb`.
