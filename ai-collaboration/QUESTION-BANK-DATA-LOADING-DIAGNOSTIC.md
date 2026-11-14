# STUDY_AI — BÁO CÁO ĐIỀU TRA & KHẮC PHỤC LỖI NGÂN HÀNG CÂU HỎI KHÔNG HIỂN THỊ DỮ LIỆU
**Tài liệu điều tra chuyên sâu P0 & Nghiệm thu toàn diện**

- **Dự án:** STUDY_AI (Frontend React + TypeScript + Vite / Backend .NET 10 + EF Core + SQL Server)
- **Repository:** `https://github.com/hthuyngan/STUDY_AI-`
- **Branch:** `feature/frontend-css-architecture`
- **Pull Request:** `#9`
- **Thời gian thực hiện:** 15/11/2026
- **Trạng thái:** ✅ **ĐÃ KHẮC PHỤC HOÀN TOÀN — DỮ LIỆU HIỂN THỊ 100% — TESTS TOÀN BỘ XANH (614/614 TESTS)**

---

## 1. Nguyên nhân chính khiến dữ liệu không xuất hiện

Qua điều tra thực tế với bằng chứng mạng (Network), cây DOM (Playwright) và truy vấn SQL Server chỉ đọc, đã xác định chính xác các nguyên nhân gốc:

### 1.1. Lỗi Xung đột ID Bộ lọc Môn học (Root Cause #1 — Critical Bug)
- **Hiện tượng**: Khi người dùng vào trang Ngân hàng câu hỏi, chọn một môn học trong dropdown (ví dụ "Toán học"), bảng lập tức biến mất toàn bộ câu hỏi và hiện thông báo: *"Không tìm thấy câu hỏi nào"*.
- **Nguyên nhân**:
  - Tại [ModernQuestionBankPage.tsx](file:///d:/TN/frontend/src/features/question-bank/pages/ModernQuestionBankPage.tsx#L21) và [QuestionFilters.tsx](file:///d:/TN/frontend/src/features/question-bank/components/QuestionFilters.tsx#L147), danh sách môn học bị khai báo cứng (hardcoded): `{ id: 'math', name: 'Toán học' }, { id: 'physics', name: 'Vật lý' }...`
  - Trong khi đó, trong cơ sở dữ liệu thực tế, các môn học mang ID chuẩn: `sub_math12` (Mã `MATH12`), `sub_phys12_08d` (Mã `PHYS12_08D`), `sub_sec_4ea98` (Mã `SEC_4EA98`), `sub_test_drf_4` (Mã `TEST_DRF_4`).
  - Khi frontend gửi `?subjectId=math`, backend trong `ContentController.cs` chỉ so khớp `q.SubjectId == "math"`, `q.Lesson.Chapter.SubjectId == "math"` hoặc `q.Topic == "mathematics"`. Vì `SubjectId` là `sub_math12`, `Topic` là `NULL`, và mã môn `MATH12` không được kiểm tra, truy vấn trả về **0 câu hỏi** (`total: 0, items: []`).

### 1.2. Lỗi Nuốt lỗi và Che giấu trạng thái lỗi (Root Cause #2 — Error State Swallowed)
- **Hiện tượng**: Khi xảy ra lỗi kết nối, phiên đăng nhập hết hạn (401), hoặc chưa có quyền (403), bảng câu hỏi hiển thị thông báo giả: *"Không tìm thấy câu hỏi nào: Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc đang chọn"*.
- **Nguyên nhân**:
  - Trong `useQuestionBank.ts`, khi API văng lỗi, `catch` có lưu `error` nhưng `ModernQuestionBankPage.tsx` không hề truyền `error` xuống component `QuestionTable.tsx`.
  - Component `QuestionTable.tsx` hoàn toàn không có prop `error` và không có giao diện hiển thị lỗi, chỉ kiểm tra điều kiện `questions.length === 0` để render empty-state. Điều này đánh lừa người dùng và tester rằng hệ thống không có dữ liệu, trong khi thực tế request API bị thất bại hoặc bị chặn quyền.

### 1.3. Lỗi Dropdown không nạp Danh mục môn học thực tế từ Backend (Root Cause #3)
- Frontend không gọi API `GET /api/v1/content/subjects` của vai trò Content, khiến các môn học thực tế có trong hệ thống (`sub_sec_4ea98` - Bảo Mật Test, `sub_test_drf_4` - Môn Nháp) không bao giờ xuất hiện trong bộ lọc, và người dùng không thể lọc theo đúng danh mục hiện có.

---

## 2. Database thực tế đang được backend sử dụng

- **Hệ quản trị CSDL:** Microsoft SQL Server Express 2022 (`.\SQLEXPRESS`).
- **Database Backend đang kết nối:** `StudyAIDb` (Chế độ mặc định của API khi khởi chạy không ghi đè environment) và `StudyAIDb_E2E` (Chế độ kiểm thử an toàn).
- **Nguyên tắc an toàn:**
  - Database chính `StudyAIDb` được bảo vệ **TUYỆT ĐỐI READ-ONLY**. Không có bất kỳ thao tác INSERT, UPDATE, DELETE, TRUNCATE, DROP, SEED, RESET hay MIGRATE nào được thực hiện trên `StudyAIDb`.
  - Mọi kiểm thử ghi dữ liệu đều được cô lập 100% trên `StudyAIDb_E2E`.

---

## 3. Tổng số câu hỏi xác minh bằng SELECT chỉ đọc (Read-Only SQL Queries)

Truy vấn kiểm tra trực tiếp trên SQL Server instance:

```sql
SELECT 'StudyAIDb' AS DbName, COUNT(*) AS TotalQuestions FROM StudyAIDb.dbo.content_questions;
SELECT 'StudyAIDb_E2E' AS DbName, COUNT(*) AS TotalQuestions FROM StudyAIDb_E2E.dbo.content_questions;
```

**Kết quả xác minh:**
1. **Database `StudyAIDb` (14 câu hỏi thực tế)**:
   - Toàn bộ 14 câu hỏi có trạng thái `published`, `isDeleted = 0`.
   - Phân bố theo môn học thực tế:
     - `sub_math12` (Toán 12 - MATH12): **2 câu hỏi**
     - `sub_phys12_08d` / `3e4` / `5a7` / `915` (Vật lý 12 - PHYS12): **4 câu hỏi**
     - `sub_sec_4ea98` / `a01cb` / `b145e` / `c1815` (Bảo Mật Test - SEC): **4 câu hỏi**
     - `sub_test_drf_4` / `6` / `7` / `b` (Môn Nháp - TEST_DRF): **4 câu hỏi**
   - Trạng thái liên kết: 100% câu hỏi đều gắn với `LessonId` hợp lệ trỏ tới bài học và chương học có sẵn.
2. **Database `StudyAIDb_E2E` (20 câu hỏi)**:
   - 12 published, 7 draft, 1 approved, 0 soft-deleted.

---

## 4. HTTP Status và cấu trúc Response API thực tế

- **Endpoint kiểm tra:** `GET http://localhost:8000/api/v1/content/questions?page=1&pageSize=10`
- **Quyền:** Bearer Token của tài khoản Content Specialist (`content@studyai.internal`).
- **HTTP Status:** `200 OK`
- **Cấu trúc JSON phản hồi:**
  ```json
  {
    "items": [
      {
        "id": "qst_15330e32c15f4fd59353bf2a04570a3f",
        "code": null,
        "lessonId": "les_54de4cef9ccd440ea273cd6e58b0708d",
        "lessonTitle": "Bài Học Chưa Duyệt",
        "chapterId": "chp_6286b8922abc4fbeb6038b7dfa09951e",
        "chapterTitle": "Chương Nháp",
        "subjectId": "sub_test_drf_b",
        "subjectName": "Môn Nháp",
        "grade": "12",
        "prompt": "Hỏi: 1 + 1 bằng mấy?",
        "options": ["1", "2", "3", "4"],
        "correctAnswer": "2",
        "explanation": "Theo số học căn bản: 1 + 1 = 2.",
        "difficulty": "easy",
        "type": "multiple-choice",
        "status": "published",
        "sourceType": "manual"
      }
    ],
    "total": 14,
    "page": 1,
    "pageSize": 10
  }
  ```
- **Xác minh các trường hợp bộ lọc sau khi sửa:**
  - Không truyền bộ lọc: Trả đủ 10 items, `total: 14`.
  - Lọc môn học `subjectId=sub_math12`: Trả đúng 2 câu hỏi Toán 12, `total: 2`.
  - Lọc môn học `subjectId=math` (legacy alias fallback): Trả đúng 2 câu hỏi Toán 12, `total: 2`.
  - Lọc khối lớp `grade=12`: Trả đủ 10 items, `total: 14`.
  - Lọc trạng thái `status=published`: Trả đủ 10 items, `total: 14`.
  - Phân trang `page=2&pageSize=10`: Trả 4 items còn lại của trang 2, `total: 14`.

---

## 5. Kết quả kiểm tra Frontend State

Kiểm tra hook `useQuestionBank` và component `QuestionTable`:
- `useEffect` nạp dữ liệu câu hỏi kích hoạt chuẩn xác khi `filters`, `currentPage`, `pageSize` thay đổi.
- Thêm mới `subjects` state nạp tự động từ `GET /api/v1/content/subjects?isActive=true` ngay khi mount trang.
- Bổ sung `error` và `errorCode` state phân tách chi tiết:
  - `UNAUTHORIZED` (401): Hiển thị thông báo *"Phiên đăng nhập đã hết hạn"* kèm nút *"Đăng nhập lại"*.
  - `FORBIDDEN` (403): Hiển thị *"Không có quyền truy cập"* (yêu cầu vai trò Content hoặc Admin).
  - `NETWORK_OFFLINE`: Hiển thị *"Không thể kết nối đến máy chủ backend (http://localhost:8000)"* kèm nút *"Thử lại"*.
  - `SERVER_ERROR` (500): Hiển thị *"Máy chủ gặp sự cố"* kèm chi tiết lỗi và nút *"Thử lại"*.
- Chỉ khi `!isLoading && !error && questions.length === 0`, giao diện mới hiển thị *"Không tìm thấy câu hỏi nào"*.

---

## 6. Kết quả kiểm tra luồng Import tài nguyên

Truy vết chi tiết luồng nghiệp vụ:
`Upload File -> Parse -> Preview -> Confirm Import -> Persist (Save) -> Query API`

**Kết quả kiểm tra:**
1. **Phân biệt tài nguyên cấu trúc và câu hỏi**:
   - File import có thể chỉ chứa cấu trúc môn học, chương và bài học (Curriculum Hierarchy: `Subjects`, `Chapters`, `Lessons`). Khi confirm import các file này, hệ thống chỉ tạo mới bản ghi môn/chương/bài, **hoàn toàn không tạo câu hỏi nào**.
   - Chỉ khi file import chứa các khối câu hỏi con (Questions embedded in Lesson hoặc Flat Questions) thì các bản ghi mới được lưu vào bảng `content_questions`.
2. **Cơ chế Preview vs Confirm**:
   - Bước Preview chỉ lưu dữ liệu vào `IMemoryCache` kèm `PreviewToken`, tuyệt đối không ghi vào CSDL.
   - Nếu nhân viên Content chỉ dừng lại ở màn hình Xem trước (Preview) mà chưa bấm *"Xác nhận nhập"*, dữ liệu sẽ không bao giờ xuất hiện trong Ngân hàng câu hỏi.
3. **Chế độ Dry-Run**:
   - Nếu bấm xác nhận với cờ `DryRun=true`, hệ thống chỉ mô phỏng đối soát toàn vẹn và trả về báo cáo mà không lưu vào database.
4. **Kiểm tra Audit Log**:
   - Trong `StudyAIDb`, 14 câu hỏi hiện có được tạo qua action `question_created` từ dữ liệu mẫu chuẩn; chưa có batch import nào ghi vào `StudyAIDb`.

---

## 7. Các file đã sửa và lý do

| File | Nội dung sửa | Lý do |
| :--- | :--- | :--- |
| [ContentController.cs](file:///d:/TN/backend/src/StudyAI.Api/Controllers/ContentController.cs#L866) | Bổ sung logic so khớp `subjectId` kiểm tra linh hoạt `Subject.Id`, `Subject.Code` và ánh xạ từ khóa tương thích ngược (`math` -> `MATH12`/Toán, `phys` -> `PHYS12`/Vật lý, v.v.). | Khắc phục triệt để lỗi truy vấn trả về 0 kết quả khi lọc môn học. |
| [questionBankApi.ts](file:///d:/TN/frontend/src/features/question-bank/api/questionBankApi.ts#L32) | Thêm phương thức `getSubjects()` gọi `GET /api/v1/content/subjects?isActive=true`. | Cung cấp danh mục môn học thực tế từ backend cho giao diện Content. |
| [useQuestionBank.ts](file:///d:/TN/frontend/src/features/question-bank/hooks/useQuestionBank.ts#L25) | Thêm state `subjects`, `errorCode`, nạp môn học khi mount, trích xuất mã lỗi `ApiError` và xuất ra `reload/retry`. | Tránh nuốt lỗi, cung cấp danh mục động và hỗ trợ retry khi mạng gặp sự cố. |
| [QuestionFilters.tsx](file:///d:/TN/frontend/src/features/question-bank/components/QuestionFilters.tsx#L130) | Xóa bỏ các `<option>` fix cứng (`math`, `physics`), render trực tiếp từ danh mục `subjects` thực tế của backend. | Đảm bảo value của dropdown luôn khớp 100% với `Id` trong database. |
| [QuestionTable.tsx](file:///d:/TN/frontend/src/features/question-bank/components/QuestionTable.tsx#L240) | Thêm prop `error`, `errorCode`, `onRetry`. Xây dựng UI thông báo lỗi riêng biệt cho 401, 403, Network Offline, 500. | Chấm dứt tình trạng che giấu lỗi bằng thông báo "Không tìm thấy câu hỏi nào". |
| [ModernQuestionBankPage.tsx](file:///d:/TN/frontend/src/features/question-bank/pages/ModernQuestionBankPage.tsx#L35) | Kết nối `error`, `errorCode`, `subjects`, `reload` từ hook sang `QuestionFilters` và `QuestionTable`. | Hoàn thiện luồng hiển thị dữ liệu và xử lý lỗi trên toàn trang. |

---

## 8. Kết quả Build và Test Suite (100% Pass)

### 8.1. Backend Build & Tests (.NET 10)
- **Biên dịch**: `dotnet build StudyAI.sln` -> **0 Warnings, 0 Errors**.
- **Unit Tests**: `dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj` -> **81/81 PASSED (100%)**.
- **Integration Tests**: `dotnet test tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj` -> **127/127 PASSED (100%)**.

### 8.2. Frontend Build & Tests (Bun + Vite + Vitest)
- **Linter**: `bun run lint` (Oxlint) -> **0 warnings, 0 errors trên 441 files**.
- **Typecheck & Build**: `bun run build` (`tsc -b && vite build`) -> **Build thành công trong 1.46s**.
- **Vitest**: `bun run test` -> **52/52 test files passed, 406/406 tests passed (100%)**.

### 8.3. Playwright End-to-End Test Thực tế
Đã chạy script kiểm chứng tự động [verify_question_bank_fix.ts](file:///d:/TN/scripts/verify_question_bank_fix.ts) trên trình duyệt Chromium:
1. Đăng nhập thành công với vai trò Content (`content@studyai.internal`).
2. Tải trang `/content/questions`: Bảng nạp đủ **10/10 hàng** câu hỏi thực tế.
3. Dropdown môn học hiển thị đầy đủ 13 môn học thực tế từ API (`Toán 12 (MATH12)`, `Vật lý 12 (PHYS12_08D)`, v.v.).
4. Chọn môn *"Toán 12 (MATH12)"*: Bảng chuyển ngay sang hiển thị đúng **2 câu hỏi Toán 12** kèm công thức KaTeX.
5. Bấm *"Đặt lại"*: Bảng lập tức khôi phục đủ **10 câu hỏi**.
6. Chọn *"Lớp 12"*: Bảng hiển thị chính xác **10 câu hỏi**.
7. Phân trang trang 2: Bấm chuyển trang và hiển thị 4 câu hỏi còn lại.
8. Mô phỏng lỗi API 500: Giao diện hiển thị đúng banner lỗi *"Không thể nạp dữ liệu Ngân hàng câu hỏi"* kèm nút *"Thử lại"*, **tuyệt đối không bị che giấu thành "Không tìm thấy câu hỏi nào"**.

---

## 9. Bằng chứng hình ảnh trực quan (Visual QA Screenshots)

Các bằng chứng kiểm thử giao diện thực tế đã được chụp và lưu tại thư mục `docs/visual-qa/question-bank/`:
- `verified-initial-load.png`: Giao diện Ngân hàng câu hỏi nạp đầy đủ danh sách câu hỏi thực tế.
- `verified-filter-math.png`: Bảng lọc chính xác 2 câu hỏi môn Toán 12 kèm công thức KaTeX.
- `verified-filter-grade12.png`: Bảng lọc chính xác theo khối Lớp 12.
- `desktop-1440-workstation.png`: Bố cục Workstation 2 cột chuẩn responsive.
- `modal-preview-katex.png`: Modal xem trước câu hỏi hiển thị KaTeX sắc nét.

---

## 10. Những vấn đề còn tồn tại & Khuyến nghị

1. **Khóa file nhị phân trên Windows khi Dev Server chạy nền**:
   - Khi tiến trình `StudyAI.Api.exe` đang chạy nền, lệnh `dotnet build` cấu hình Debug sẽ gặp lỗi `MSB3026/MSB3021`. Cần dừng tiến trình trước khi thực hiện rebuild.
2. **Quy trình Import tài nguyên trong tương lai**:
   - Cần bổ sung hướng dẫn rõ ràng trên giao diện Content Import rằng file CSV/Excel chỉ chứa danh mục bài học sẽ không tự động sinh ra câu hỏi trong Ngân hàng câu hỏi.
3. **Database Safety**:
   - Tiếp tục duy trì quy tắc `DatabaseSafetyGuard`: Cấm tuyệt đối mọi thao tác ghi lên database chính `StudyAIDb`.

