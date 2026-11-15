# STUDY_AI — PHASE 1 IMPLEMENTATION REPORT
## CURRICULUM & REAL DATA INTEGRATION

---

### 1. TỔNG QUAN PHẠM VI & MỤC TIÊU PHASE 1
- **Mục tiêu**: Chuyển đổi toàn diện giao diện học sinh từ dữ liệu mock/tĩnh sang kết nối 100% dữ liệu thật từ cơ sở dữ liệu production duy nhất **`StudyAIDb`** (`.\SQLEXPRESS`), đáp ứng các tiêu chuẩn kiến trúc GDPT 2018 và bảo mật Zero-Leak.
- **Branch**: `feature/frontend-css-architecture`
- **Trạng thái nghiệm thu**: **PASS (ĐẠT CHUẨN)**

---

### 2. CHI TIẾT TÍNH NĂNG ĐÃ HOÀN THÀNH

#### 1.1. Kết nối môn học thật (`SubjectsPage.tsx`, `SubjectDetailPage.tsx`)
- Đã ngắt bỏ hoàn toàn phụ thuộc vào `subjects.mock.ts` trong luồng production.
- API `GET /api/v1/curriculum/subjects` trả về đúng danh sách môn học hoạt động công khai từ `content_subjects`.
- Bộ lọc tự động loại trừ các fixture kiểm thử nội bộ (`TEST_*`, `SEC_*`, `PHYS12_*`).
- Bổ sung `GET /api/v1/curriculum/subjects/{subjectId}` hỗ trợ tra cứu theo ID (`sub_math12`) và Mã môn (`MATH12`, `math12`).
- Tạo bộ điều hướng khối lớp động (`gradeTabs`) sinh tự động từ dữ liệu CSDL thay vì hardcode.
- Xử lý đầy đủ trạng thái: Loading (Skeleton), Empty (`EmptyState`), Error (`PageErrorState` kèm nút thử lại - cơ chế fail-closed).

#### 1.2. Kết nối bài học thật (`LessonPage.tsx`, `useLesson.ts`, `lesson.service.ts`)
- Đã loại bỏ hoàn toàn việc import `mockLessonsDetail`.
- API `GET /api/v1/curriculum/lessons/{id}` hỗ trợ cả ID bài học (`les_math12_c1_b1`) và Slug bài học (`tinh-don-dieu-va-cuc-tri`).
- Phân giải đa cấu trúc linh hoạt:
  - Định nghĩa lý thuyết: Bóc tách cả object `{ term, content }` lẫn chuỗi `"Thuật ngữ: Định nghĩa"`.
  - Công thức KaTeX/LaTeX: Hiển thị chuẩn xác công thức toán học (`f'(x) \ge 0`).
  - Ví dụ mẫu & Lưu ý bẫy đề thi: Bóc tách các bước giải và chú ý sư phạm.
- Sidebar mục lục bài học thời gian thực qua `GET /api/v1/curriculum/subjects/{id}/chapters`.
- Kiểm tra phân quyền và trạng thái: Trả về HTTP 404 cho bài học `draft` hoặc chưa duyệt.

#### 1.3. Kiểm tra cuối bài & Chấm điểm Server-Side Zero-Leak (`AssessmentModal.tsx`)
- Kiến trúc **Zero-Leak**: `GET /api/v1/curriculum/lessons/{id}/questions` chỉ gửi `id`, `prompt`, `options`, `difficulty`, `type`. Tuyệt đối không gửi đáp án đúng và lời giải chi tiết về client trước khi nộp.
- Chấm điểm máy chủ qua `POST /api/v1/curriculum/lessons/{id}/questions/{qId}/check`:
  - Máy chủ kiểm tra đáp án, áp dụng rate-limiting (tối đa 3 lần thử sai), ghi nhật ký kiểm toán vào `staff_audit_logs`.
  - Hỗ trợ đối soát theo nội dung đáp án, ký tự phương án ("A", "B", "C", "D") và client option ID ("opt_1_B").
- Hiển thị đáp án đúng và lời giải chi tiết chỉ sau khi máy chủ xác nhận chấm điểm.
- Lưu trữ kết quả kiểm tra vào bảng `assessment_attempts` qua `POST /api/v1/me/assessment-attempts`.

#### 1.4. Chuẩn hóa dữ liệu câu hỏi & Khắc phục lỗi LaTeX
- Khắc phục lỗi System.Text.Json parser trong `CurriculumController.cs`: Bổ sung hàm `SafeDeserializeStringList` tự động chuẩn hóa các ký tự escape backslash trong công thức LaTeX (`\infty`, `\ge`, `\alpha`, `\int`...), đảm bảo 100% các phương án trắc nghiệm trong `OptionsJson` được hiển thị đầy đủ, không bị rỗng.
- Toàn bộ 16.679 câu hỏi VNHSGE ở trạng thái `draft` được bảo toàn nguyên vẹn, không bị tự động xuất bản hay làm biến dạng dữ liệu.

---

### 3. ĐỐI SOÁT DỮ LIỆU CÂU HỎI VÀ QUAN HỆ CSDL (`StudyAIDb`)

- **Tổng số câu hỏi**: **16.693** câu.
- **Câu hỏi chuẩn bị tay (`manual`)**: **14** câu xuất bản, liên kết đầy đủ Môn, Chương, Bài học.
- **Câu hỏi VNHSGE (`vnhsge`)**: **16.679** câu nháp (`draft`):
  - 100% (16.679 câu) đã liên kết đúng Môn học (`SubjectId`):
    - Toán 12: 2.544 câu | Tiếng Anh 12: 2.367 câu | Lịch sử 12: 1.998 câu
    - Vật lý 12: 1.995 câu | Sinh học 12: 1.989 câu | Hóa học 12: 1.973 câu
    - Địa lý 12: 1.931 câu | GDKT & PL 12: 1.852 câu | Ngữ văn 12: 30 câu
  - `ChapterId` và `LessonId`: Hiện tại là `NULL` (chờ Content Workspace biên tập phân loại chuyên đề hoặc sử dụng cho chế độ Thi thử THPT / Luyện tập tổng hợp trong Phase 2 & 3).

---

### 4. KẾT QUẢ KIỂM THỬ VÀ CHẤT LƯỢNG MÃ NGUỒN

| Bài kiểm tra | Quy mô | Kết quả | Ghi chú |
| :--- | :---: | :---: | :--- |
| **Frontend Code Quality (Oxlint)** | 441 files | **0 errors, 0 warnings** | Tuân thủ nghiêm ngặt quy tắc React 19 |
| **Frontend Production Build (Vite)** | TypeScript & Rollup | **BUILD SUCCEEDED** (2.46s) | 0 lỗi biên dịch |
| **Frontend Unit & Flow Tests (Vitest)**| 52 test files | **406/406 PASSED** (100%) | Toàn bộ suite curriculum, lesson, assessment |
| **Backend Unit Tests (.NET 10)** | 81 tests | **81/81 PASSED** (100%) | `StudyAI.UnitTests.dll` |
| **Backend Integration Tests** | 127 tests | **127/127 PASSED** (100%) | `StudyAI.IntegrationTests.dll` |

---

### 5. KẾT LUẬN NGHIỆM THU PHASE 1
- **Trạng thái**: **PASS**
- **Đạt đầy đủ 5 tiêu chí nghiệm thu Phase 1**:
  1. Mở danh sách môn học thật qua API.
  2. Chọn chương và bài học thật từ CSDL.
  3. Đọc lý thuyết, ví dụ, công thức KaTeX không lỗi.
  4. Làm bài kiểm tra cuối bài với câu hỏi xuất bản thật, Zero-Leak.
  5. Chấm điểm server-side và lưu kết quả vào CSDL.
- **Sẵn sàng chuyển giao**: Tự động chuyển tiếp sang **PHASE 2 — PRACTICE, EXAM & LEARNING PROGRESS**.

