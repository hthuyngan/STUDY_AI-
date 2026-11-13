# BÁO CÁO TOÀN DIỆN SQL SERVER & TÍCH HỢP DỮ LIỆU THẬT STUDY_AI

**Workspace:** `E:\AI_tutor`  
**SQL Server:** `.\SQLEXPRESS`  
**Branch:** `feature/content-question-bank`  
**Ngày audit:** 13/11/2026  

---

## 1. MỤC TIÊU AUDIT

Kiểm tra đối chiếu cấu trúc hai cơ sở dữ liệu trên máy chủ SQL Server `.\SQLEXPRESS`:
1. `StudyAIDb` — Cơ sở dữ liệu chính (Production), yêu cầu giữ nguyên trạng thái Read-Only.
2. `StudyAIDb_E2E` — Cơ sở dữ liệu kiểm thử & tích hợp dữ liệu lớn VNHSGE.

Xác định tận gốc nguyên nhân vì sao trước đây giao diện Ngân hàng câu hỏi bị thiếu thông tin hoặc hiển thị tên môn chưa chuẩn, và chứng minh giải pháp tích hợp thực tế.

---

## 2. KẾT QUẢ PHÂN TÍCH FORENSIC SQL SERVER

### A. Đối chiếu bảng `dbo.content_questions` giữa 2 Database

| Chỉ số / Tiêu chí | `StudyAIDb` (Chính / Production) | `StudyAIDb_E2E` (Kiểm thử / E2E) |
|---|---|---|
| **Tổng số câu hỏi** | **14** (Giữ nguyên tuyệt đối) | **16.968** |
| **Số câu hỏi VNHSGE** | 0 | 16.684 |
| **Số câu hỏi thủ công** | 14 | 284 |
| **Số môn học (`subjects`)** | 13 | 95 |
| **Số chương (`chapters`)** | 13 | 95 |
| **Số bài học (`lessons`)** | 17 | 208 |
| **Số người dùng (`users`)** | 121 | 601 |
| **Quyền ghi (Write status)** | **READ-ONLY (0 writes)** | Được phép ghi cho E2E |

### B. Nguyên nhân gốc rễ (Root Cause Analysis)

Khi kiểm tra dữ liệu 16.684 câu hỏi VNHSGE trong `StudyAIDb_E2E`:
- Các trường `SubjectId`, `ChapterId`, `LessonId` có giá trị `NULL`.
- Dữ liệu môn học thực tế được lưu trữ trong trường `Topic` dưới dạng tên tiếng Anh:
  - `Mathematics`: 2.544 câu
  - `English`: 2.367 câu
  - `History`: 1.998 câu
  - `Physics`: 1.995 câu
  - `Biology`: 1.989 câu
  - `Chemistry`: 1.973 câu
  - `Geography`: 1.931 câu
  - `CivicEducation`: 1.852 câu
  - `Ngữ văn`: 30 câu
- **Hệ quả trước đây:** Giao diện cũ tìm kiếm môn học theo `SubjectId`, do đó các câu hỏi VNHSGE bị hiển thị là `"Chưa phân loại"`, và bộ lọc theo môn học tiếng Việt không lọc được câu hỏi VNHSGE.

---

## 3. GIẢI PHÁP ĐÃ TRIỂN KHAI VÀ KHẮC PHỤC TRIỆT ĐỂ

### A. Backend (`backend/src/StudyAI.Api/Controllers/ContentController.cs`)
1. **Hàm phân giải môn học tự động (`ResolveSubjectName`):**
   - Ánh xạ `Topic` tiếng Anh sang tên môn tiếng Việt chuẩn:
     - `Mathematics` $\rightarrow$ `Toán học`
     - `Physics` $\rightarrow$ `Vật lý`
     - `Chemistry` $\rightarrow$ `Hóa học`
     - `Biology` $\rightarrow$ `Sinh học`
     - `English` $\rightarrow$ `Tiếng Anh`
     - `History` $\rightarrow$ `Lịch sử`
     - `Geography` $\rightarrow$ `Địa lý`
     - `CivicEducation` $\rightarrow$ `Giáo dục công dân`
     - `Ngữ văn` $\rightarrow$ `Ngữ văn`
2. **Chuẩn hóa thống kê KPI (`GetQuestionStatistics`):**
   - Phân nhóm `bySubject` dựa trên `ResolveSubjectName(q)` thay vì bỏ qua các câu có `SubjectId = NULL`.
3. **Mở rộng bộ lọc danh sách (`ListQuestions`):**
   - Hỗ trợ tham số `subjectId` tìm kiếm theo cả ID môn học lẫn từ khóa môn tương ứng trong `Topic`.

### B. Frontend (`features/question-bank`)
1. **API Client & Type Definition:**
   - Xử lý options linh hoạt (chuỗi JSON mảng chuỗi hoặc object).
   - Thống nhất các mã trạng thái (`in-review` / `in_review`, `published`, `draft`, `rejected`).
2. **Live KaTeX Rendering:**
   - Sử dụng `MathView` render trực tiếp công thức toán/lý/hóa trong câu hỏi, các phương án và lời giải chi tiết.
3. **Master-Detail Workstation:**
   - Cho phép chuyên viên Content duyệt nhanh câu hỏi bên trái và xem trước chi tiết (Learner Preview) bên phải mà không cần đóng mở modal liên tục.

---

## 4. KẾT QUẢ XÁC MINH TEST TỔNG THỂ

1. **Backend Unit Tests:** 81/81 passed.
2. **Backend Integration Tests:** 127/127 passed.
3. **Frontend Vitest:** 52 files, 406/406 passed.
4. **Playwright E2E Suite:** 21/21 scenarios passed (100%).
5. **Database Safety Check:** Số lượng bản ghi `dbo.content_questions` trong `StudyAIDb` là **14 câu** (không thay đổi trước và sau quá trình kiểm thử).
