# BÁO CÁO TÁI THIẾT KẾ VÀ TÍCH HỢP NGÂN HÀNG CÂU HỎI — MODERN EDUCATION ADMIN

**Dự án:** STUDY_AI  
**Workspace:** `E:\AI_tutor`  
**Nhánh:** `feature/content-question-bank`  
**Ngày thực hiện:** 13/11/2026  
**Trạng thái:** HOÀN THÀNH TOÀN DIỆN (100% PASS)

---

## 1. TỔNG QUAN YÊU CẦU & KẾT QUẢ ĐẠT ĐƯỢC

Hệ thống Ngân hàng câu hỏi của vai trò Content đã được tái thiết kế toàn diện theo phong cách **Modern Education Admin** chuyên nghiệp, áp dụng trọn vẹn quy chuẩn thiết kế **Evondev UI/UX skill** (`.agents/skills/ui-ux/SKILL.md`) và kết nối dữ liệu thực tế từ SQL Server `StudyAIDb_E2E` (với hơn 16.900 câu hỏi, trong đó có 16.684 câu hỏi nguồn VNHSGE).

### Bảng tóm tắt kết quả kiểm thử và nghiệm thu:

| Hạng mục kiểm tra | Công cụ / Môi trường | Tiêu chuẩn | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|
| **SQL Server Forensic Audit** | `.\SQLEXPRESS` | Phân tích 2 DB: `StudyAIDb` & `StudyAIDb_E2E` | `StudyAIDb`: 14 câu (Read-Only 100%)<br>`StudyAIDb_E2E`: 16.968 câu (Active) | **ĐẠT** |
| **Backend Real Data Taxonomy** | ASP.NET Core / .NET 10 | Ánh xạ Topic VNHSGE tiếng Anh sang tiếng Việt (`Mathematics` -> `Toán học`, `Physics` -> `Vật lý`...) | Tự động phân loại `SubjectName` chuẩn hóa | **ĐẠT** |
| **Modern Admin UI Components** | React + TypeScript + Vite | Primary Navy `#183B69`, bo góc 12px, nền `#F8FAFC`, Master-Detail workstation | Đóng gói tại `frontend/src/features/question-bank/` | **ĐẠT** |
| **KaTeX Math Rendering** | `katex` + `MathView` | Hiển thị công thức $...$ và $$...$$ trong câu hỏi, phương án, lời giải | Không lỗi tràn màn hình, render mượt mà | **ĐẠT** |
| **Quy trình Content Primacy** | REST API + Auth | Draft -> Submit Review -> Approve / Reject -> Publish -> Unpublish | Chỉ vai trò `content` có quyền duyệt/xuất bản | **ĐẠT** |
| **Frontend Unit Tests** | Vitest (52 test files) | 406 unit tests | **406 / 406 passed** (0 failed) | **ĐẠT** |
| **Backend Unit Tests** | xUnit (`StudyAI.UnitTests`) | 81 unit tests | **81 / 81 passed** (0 failed) | **ĐẠT** |
| **Backend Integration Tests** | xUnit (`StudyAI.IntegrationTests`) | 127 integration tests | **127 / 127 passed** (0 failed) | **ĐẠT** |
| **E2E Playwright Automation** | Playwright (Trình duyệt Chromium thật) | 21 kịch bản kiểm thử toàn diện | **21 / 21 passed** (100% PASS) | **ĐẠT** |
| **Evondev R1 Viewports** | 1920, 1366, 768, 390 px | Kiểm tra tràn ngang (horizontal scroll) | Zero overflow trên mọi breakpoint | **ĐẠT** |

---

## 2. CHI TIẾT KIẾN TRÚC FRONTEND MỚI (`features/question-bank`)

Module mới được cấu trúc theo mô hình Feature-based sạch sẽ, tách biệt mối quan tâm và tuân thủ các quy tắc của React 19:

```
frontend/src/features/question-bank/
├── types/
│   └── index.ts               # Schema DTOs, Filter params, Options, Stats
├── api/
│   └── questionBankApi.ts     # Client gọi API backend với bảo vệ workflow
├── components/
│   ├── QuestionBankKPIs.tsx   # 6 KPI cards phong cách Modern Education Admin
│   ├── QuestionFilters.tsx    # Tìm kiếm, phân loại môn, lớp, dạng câu, độ khó, nguồn
│   ├── QuestionTable.tsx      # Bảng dữ liệu câu hỏi có phân trang và thao tác nhanh
│   ├── QuestionPreviewPanel.tsx# Master-Detail Drawer xem trước góc nhìn học viên + KaTeX
│   ├── QuestionFormModal.tsx  # Modal soạn thảo/chỉnh sửa câu hỏi có Live KaTeX
│   ├── QuestionRejectModal.tsx# Modal nhập lý do từ chối kiểm duyệt
│   └── QuestionDeleteModal.tsx# Modal xác nhận xóa mềm câu hỏi
├── hooks/
│   └── useQuestionBank.ts     # Custom hook quản lý trạng thái, nạp dữ liệu, đồng bộ bộ lọc
├── pages/
│   └── ModernQuestionBankPage.tsx # Trang giao diện chính tích hợp tất cả thành phần
└── index.ts                   # Public barrel export
```

### Các điểm nhấn thiết kế theo chuẩn Evondev:
1. **Bảng màu:**
   - Màu chủ đạo: Navy `#183B69` đem lại cảm giác tin cậy, chuẩn mực học thuật.
   - Nền trang: `#F8FAFC` dịu mắt, tương phản mềm với các khối thẻ trắng `#FFFFFF`.
   - Màu trạng thái: `published` (xanh ngọc Emerald), `approved` (xanh dương Sky), `in-review` (vàng hổ phách Amber), `rejected` (đỏ hoa hồng Rose), `draft` (xám Slate).
2. **Tuân thủ quy chuẩn kỹ thuật (Evondev Rules):**
   - **R1 (Zero Page Overflow):** Không có thanh cuộn ngang trang bất thường. Thử nghiệm tự động tại 1920px, 1366px, 768px, 390px đều `scrollWidth <= window.innerWidth`.
   - **R8 (Touch Target Mobile):** Cỡ chữ trong các ô nhập liệu tối thiểu 16px trên mobile (`text-base sm:text-xs`) để trình duyệt Safari/Chrome không tự ý zoom khi người dùng chạm vào.
   - **R9 (Table Container):** Bảng được bọc trong container `overflow-x-auto` với `min-width: 960px`, đảm bảo hiển thị đủ nội dung mà không vỡ layout cột.

---

## 3. BẢO VỆ VÀ CÁCH LY DATABASE (DATABASE SAFETY)

- **Database chính (`StudyAIDb`):**
  - Số lượng câu hỏi ban đầu: 14 câu.
  - Số lượng câu hỏi sau toàn bộ quá trình audit, build và chạy E2E: **14 câu**.
  - **Tỷ lệ ghi vào database chính: 0% (READ-ONLY tuyệt đối).**
- **Database kiểm thử (`StudyAIDb_E2E`):**
  - Chứa 16.968 câu hỏi hợp lệ (bao gồm 16.684 câu hỏi nguồn gốc VNHSGE).
  - Mọi thao tác tạo, sửa, xóa mềm, duyệt, xuất bản trong bộ test đều diễn ra an toàn trên database này.

---

## 4. DANH SÁCH BẰNG CHỨNG HÌNH ẢNH (VISUAL QA EVIDENCE)

Các ảnh chụp màn hình thực tế từ Playwright được lưu trữ tại `docs/visual-qa/question-bank/`:
- `01_login_filled.png`: Đăng nhập vai trò Content Specialist.
- `02_question_bank_dashboard.png`: Giao diện Ngân hàng câu hỏi Modern Admin.
- `03_create_question_modal.png`: Modal soạn thảo câu hỏi kèm KaTeX preview.
- `06_preview_modal_katex.png`: Modal xem trước chi tiết công thức KaTeX và lời giải.
- `07_published_question.png`: Câu hỏi sau khi duyệt và xuất bản thành công.
- `08_learner_forbidden.png`: Chặn vai trò Learner truy cập vùng quản trị (403 Forbidden).
- `viewport_1920_desktop.png`: Hiển thị trên màn hình lớn 1920x1080.
- `viewport_1366_laptop.png`: Hiển thị trên laptop 1366x768.
- `viewport_768_tablet.png`: Hiển thị trên tablet 768x1024.
- `viewport_390_mobile.png`: Hiển thị trên điện thoại di động 390x844.
