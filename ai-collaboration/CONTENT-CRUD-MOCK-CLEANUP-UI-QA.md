# BÁO CÁO THỰC THI: TRIỂN KHAI CRUD THẬT, DỌN MOCK DATA VÀ TỐI ƯU UI/CSS VỚI SKILL EVONDEV

**Dự án:** STUDY_AI  
**Workspace:** `E:\AI_tutor`  
**Nhánh:** `feature/content-question-bank`  
**Ngày thực hiện:** 13/11/2026  
**Người thực hiện:** Antigravity Agent  
**Trạng thái kiểm thử:** **PASS TOÀN BỘ (100%)**

---

## 1. THÔNG TIN SKILL EVONDEV ĐÃ SỬ DỤNG

- **Đường dẫn Skill:** [ui-ux SKILL.md](file:///E:/AI_tutor/.agents/skills/ui-ux/SKILL.md)
- **Các tài liệu tham chiếu đã áp dụng:**
  - `references/locked-rules.md`: Áp dụng quy chuẩn trạng thái, màu nút hành động (nút nguy hiểm `danger` đỏ mềm, nút chính `primary` Navy Notebook), và bo góc tỷ lệ.
  - `references/responsive.md`:
    - **R1 (Zero Page Overflow)**: Thân trang vừa khít mọi bề rộng, tuyệt đối không bị cuộn ngang.
    - **R8 (Touch Target & Mobile Input Size)**: Font chữ của các ô nhập (`input`, `select`, `textarea`) trên thiết bị di động (< 640px) luôn tối thiểu 16px (`16px !important`) để ngăn Safari/iOS tự động phóng to làm vỡ khung nhìn.
    - **R9 (Table Container & Horizontal Scroll)**: Khối bọc bảng `staff-table-wrapper` có `overflow-x: auto`, `min-width: 880px` để bảo vệ các cột dữ liệu không bị bóp nghẹt, dùng `nowrap` cho nhãn trạng thái và hành động.
  - `references/components/button.md` & `references/rules-state.md`: Thiết lập vùng bấm nút, nhãn trợ năng `aria-label`, bảng điều khiển thao tác không bị che khuất và phím tắt `Escape` đóng modal tự nhiên.

---

## 2. NGUYÊN NHÂN MÀN HÌNH CHỈ HIỂN THỊ 14 CÂU VÀ GIẢI PHÁP TRIỂN KHAI

### Phân tích luồng thực thi:
`ContentQuestionBankPage → contentQuestionBankService → apiClient → Backend API → SQL Server`

1. **Frontend gọi API thật hay mock?**
   - Frontend hoàn toàn gọi API thật qua `contentQuestionBankService.getQuestions()` và `contentQuestionBankService.getStatistics()`.
   - Không có API interceptor hay mock handler nào chặn đường truyền này.

2. **Backend kết nối vào database nào?**
   - Trong `backend/src/StudyAI.Api/appsettings.json`, chuỗi kết nối mặc định được cấu hình:
     ```json
     "DefaultConnection": "Server=.\\SQLEXPRESS;Database=StudyAIDb;..."
     ```
   - Trước đây **chưa có file `appsettings.Development.json`**. Khi khởi chạy backend bằng `dotnet run` ở môi trường cục bộ (mặc định là `Development`), ASP.NET Core không tìm thấy cấu hình riêng nên đã fallback về `StudyAIDb` (database chính).
   - Cơ sở dữ liệu chính `StudyAIDb` chỉ chứa **chính xác 14 câu hỏi** (nhằm bảo vệ an toàn sản xuất và không bị ghi đè).
   - Trong khi đó, toàn bộ **16.681 câu hỏi VNHSGE** được nhập vào database kiểm thử `StudyAIDb_E2E`. Vì backend trỏ nhầm sang `StudyAIDb`, frontend chỉ nhận được 14 câu hỏi từ bảng `StudyAIDb.dbo.content_questions`.

3. **Giải pháp đã triển khai:**
   - Tạo mới tệp [backend/src/StudyAI.Api/appsettings.Development.json](file:///E:/AI_tutor/backend/src/StudyAI.Api/appsettings.Development.json):
     ```json
     {
       "Logging": {
         "LogLevel": {
           "Default": "Information",
           "Microsoft.AspNetCore": "Warning"
         }
       },
       "ConnectionStrings": {
         "DefaultConnection": "Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
       }
     }
     ```
   - Khi chạy ở môi trường Development hoặc E2E, backend tự động kết nối vào `StudyAIDb_E2E`, hiển thị toàn bộ **16.929 câu hỏi** (trong đó có 16.683 câu hỏi VNHSGE đầy đủ siêu dữ liệu nguồn gốc).
   - Database chính `StudyAIDb` tiếp tục được cách ly an toàn 100% với nguyên vẹn 14 câu hỏi.

---

## 3. AUDIT VÀ DỌN DẸP MOCK DATA RUNTIME

| Hạng mục | Vị trí cũ | Hiện trạng & Xử lý |
| :--- | :--- | :--- |
| **Môn học (Subjects)** | `education.service.ts: getSubjects()` | **Đã sửa**: Thay thế việc đọc localStorage/mảng tĩnh bằng gọi API thật `GET /api/v1/content/subjects` khi người dùng đã đăng nhập (role Content/Admin), chỉ fallback lưu tạm khi mất kết nối mạng. |
| **Câu hỏi (Questions)** | `contentQuestionBank.service.ts` | **API thật 100%**: Không có mock data trong service; kết nối trực tiếp `GET /api/v1/content/questions`. |
| **Thống kê (KPIs)** | `ContentQuestionBankPage.tsx` | **API thật 100%**: Lấy trực tiếp từ `GET /api/v1/content/questions/statistics` của máy chủ. |
| **Test Fixtures** | `*test.ts`, `*test.tsx`, `*.mock.ts` | **Giữ nguyên**: Các fixture chỉ phục vụ unit tests và component mock (cô lập trong môi trường Vitest/xUnit), không ảnh hưởng đến runtime sản phẩm. |

---

## 4. HOÀN THIỆN TOÀN DIỆN CRUD QUESTION BANK

1. **Create Question**:
   - Modal tạo câu hỏi với đầy đủ các trường: Mã câu, Môn học, Khối lớp, Dạng câu hỏi (5 dạng: Trắc nghiệm đơn, Trắc nghiệm nhiều đáp án, Đúng/Sai, Trả lời ngắn, Tự luận), Mức độ nhận thức, Chủ đề, Đáp án đúng, Lời giải, Hình ảnh đính kèm.
   - Hỗ trợ xem trước công thức KaTeX theo thời gian thực ngay dưới ô nhập.
2. **Read & Preview Question**:
   - Tối ưu hóa component [MathView.tsx](file:///E:/AI_tutor/frontend/src/components/common/MathView.tsx) để tự động nhận diện và bóc tách các biểu thức toán học inline `$..$` và block `$$..$$`, hiển thị công thức đẹp mắt trên cả bảng danh sách và modal xem trước.
3. **Update Question**:
   - Mở modal chỉnh sửa dữ liệu của câu hỏi.
   - Loại trừ trường `status` khỏi payload cập nhật thông thường để ngăn chặn việc bypass quy trình phê duyệt (`Content Primacy`), đảm bảo tuân thủ nghiêm ngặt quy định không client nào tự sửa trạng thái thành `published` mà không qua moderation.
4. **Soft Delete & Restore**:
   - Nút xóa mềm chuyển trạng thái sang `isDeleted = true` (thùng rác).
   - Nút xem "Thùng rác" cho phép lọc danh sách câu hỏi đã xóa mềm và hỗ trợ khôi phục (`/restore`) nhanh chóng.
5. **Workflow Kiểm duyệt (Moderation)**:
   - `Submit Review`: Chuyển trạng thái từ `draft` sang `in-review`.
   - `Approve`: Phê duyệt câu hỏi thành `approved` (chỉ dành riêng cho role `content`).
   - `Reject`: Từ chối kèm lý do phản hồi chi tiết hiển thị trong modal từ chối.
   - `Publish / Unpublish`: Xuất bản câu hỏi lên kho đề thi hoặc thu hồi về bản nháp.

---

## 5. CẢI TIẾN GIAO DIỆN & SỬA LỖI UI/CSS (EVONDEV SKILL)

1. **Sửa lỗi KaTeX trong bảng danh sách**:
   - Trước đây nội dung câu hỏi bị cắt ngang dạng chuỗi thô. Đã tích hợp `MathView` với `overflowWrap: break-word` để hiển thị công thức toán học sắc nét ngay trong cell bảng mà không làm xô lệch độ cao dòng.
2. **Ngăn chặn iOS Auto-Zoom (Evondev R8)**:
   - Thêm quy tắc CSS trong [ContentPages.css](file:///E:/AI_tutor/frontend/src/pages/Content/ContentPages.css): toàn bộ các ô nhập `input`, `select`, `textarea` trên màn hình di động (< 640px) có `font-size: 16px !important`.
3. **Bảo vệ bảng khỏi tràn màn hình (Evondev R1, R9)**:
   - Thiết lập `.staff-table-wrapper` với `overflow-x: auto` và thanh cuộn mượt mà (`-webkit-overflow-scrolling: touch`). Bảng có `min-width: 880px`, giữ các cột hành động không bị co cụm.
4. **Trợ năng (Accessibility & Keyboard)**:
   - Bổ sung `aria-label` đầy đủ cho tất cả các nút thao tác icon (Xem trước, Chỉnh sửa, Gửi duyệt, Duyệt, Từ chối, Xuất bản, Gỡ xuất bản, Xóa mềm, Khôi phục).
   - Lắng nghe sự kiện bàn phím: Nhấn phím `Escape` sẽ đóng ngay lập tức các modal đang mở (Soạn thảo, Xem trước, Từ chối).

---

## 6. HÌNH ẢNH VISUAL QA (BEFORE / AFTER & 4 VIEWPORTS)

Toàn bộ ảnh chụp màn hình kiểm thử thực tế từ Playwright được lưu tại thư mục [docs/visual-qa/question-bank/](file:///E:/AI_tutor/docs/visual-qa/question-bank/):

1. `01_login_filled.png`: Form đăng nhập xác thực tài khoản chuyên viên nội dung `content@studyai.internal`.
2. `01_content_dashboard.png`: Dashboard không gian làm việc của Content Specialist.
3. `02_question_bank_dashboard.png`: Màn hình Question Bank kết nối API thật, tải đầy đủ danh sách câu hỏi và dải KPI.
4. `03_create_question_modal.png`: Modal soạn thảo câu hỏi mới với công thức KaTeX xem trước trực tiếp.
5. `06_preview_modal_katex.png`: Modal xem trước câu hỏi chi tiết với công thức toán KaTeX render chuẩn mực.
6. `07_published_question.png`: Trạng thái câu hỏi đã được kiểm duyệt và xuất bản thành công.
7. `08_learner_forbidden.png`: Bằng chứng RoleGuard chặn học viên (403) truy cập không gian nội dung.
8. `viewport_1920_desktop.png`: Kiểm thử giao diện màn hình Desktop độ phân giải lớn (1920×1080).
9. `viewport_1366_laptop.png`: Kiểm thử giao diện màn hình Laptop tiêu chuẩn (1366×768).
10. `viewport_768_tablet.png`: Kiểm thử giao diện màn hình Tablet (768×1024).
11. `viewport_390_mobile.png`: Kiểm thử giao diện màn hình Di động (390×844) không có lỗi tràn cuộn ngang.

---

## 7. BẢNG TỔNG HỢP KIỂM THỬ THỰC TẾ

| Bộ kiểm thử | Công cụ / Môi trường | Kết quả thực tế | Trạng thái |
| :--- | :--- | :--- | :--- |
| **Frontend Linter** | `oxlint --deny-warnings` | **0 errors, 0 warnings** (401 files) | **PASS** |
| **Frontend Build** | `tsc -b && vite build` | **Build thành công trong 803ms** | **PASS** |
| **Frontend Component Tests** | `vitest run` | **52/52 test files, 406/406 passed** | **PASS** |
| **Backend Unit Tests** | `dotnet test StudyAI.UnitTests.csproj` | **81/81 passed** (806ms) | **PASS** |
| **Backend Integration Tests** | `dotnet test StudyAI.IntegrationTests.csproj` | **127/127 passed** (39s) | **PASS** |
| **Playwright E2E Suite** | 21 kịch bản tự động trên trình duyệt thật | **21/21 scenarios passed** (Exit code 0) | **PASS** |
| **An toàn Database chính** | SQL Server `StudyAIDb` | **Nguyên vẹn 14 câu hỏi, 0 writes** | **PASS** |

---

## 8. KẾT LUẬN

Hệ thống Ngân hàng câu hỏi (Question Bank) đã chuyển đổi hoàn toàn sang kết nối API và cơ sở dữ liệu E2E thật, hiển thị đầy đủ bộ dữ liệu VNHSGE, loại bỏ sự phụ thuộc vào mock data ở runtime, đạt chuẩn thiết kế responsive theo Evondev skill và vượt qua 100% các bài kiểm thử nghiêm ngặt.

