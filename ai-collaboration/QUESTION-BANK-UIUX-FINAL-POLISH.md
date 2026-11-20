# BÁO CÁO HOÀN THIỆN TOÀN DIỆN UI/UX NGÂN HÀNG CÂU HỎI STUDY_AI
## Final UI/UX Polish, MathView Fix, Streamlined Table & Production Verification

**Dự án:** STUDY_AI  
**Workspace:** `E:\AI_tutor`  
**Repository:** `hthuyngan/STUDY_AI-`  
**Nhánh làm việc:** `feature/content-question-bank`  
**Phong cách thiết kế:** Modern Education Admin (Evondev UI/UX Guidelines)  
**Thời gian hoàn thành:** 14/11/2026  

---

## 1. TỔNG QUAN VÀ MỤC TIÊU

Báo cáo này tài liệu hóa quá trình sửa triệt để 7 lỗi giao diện và trải nghiệm người dùng (UI/UX) đã được phát hiện trong module **Ngân hàng câu hỏi (Question Bank)** của STUDY_AI dành cho vai trò **Content Specialist**.

Mọi thay đổi được thực hiện bằng mã nguồn thực tế, đã được build thành công, kiểm thử tự động toàn diện (Vitest, xUnit, Playwright E2E trên trình duyệt Chromium thật) và đối soát an toàn tuyệt đối với SQL Server.

---

## 2. NGUYÊN NHÂN GỐC RỄ VÀ GIẢI PHÁP SỬA CHỮA CHO 7 LỖI UI/UX

### Lỗi 1 — Thanh thao tác CRUD khó sử dụng & Menu ba chấm
- **Hiện trạng cũ:** Các nút thao tác (Sửa, Gửi duyệt, Duyệt, Từ chối, Xuất bản, Gỡ xuất bản, Xóa mềm, Khôi phục) nằm dàn trải trên từng dòng bảng làm bảng bị phình to theo chiều ngang, gây rối mắt và dễ bấm nhầm trên màn hình nhỏ.
- **Giải pháp hoàn thiện:**
  1. Giữ nút **Xem trước (Eye icon)** hiển thị độc lập, rõ ràng ngay trên dòng với tooltip `title="Xem trước"` phục vụ xem nhanh 1-click.
  2. Gom toàn bộ các thao tác nghiệp vụ còn lại vào **Menu ba chấm (3-dots kebab menu - `MoreVertical`)** với nhãn tiếng Việt rõ ràng, icon trực quan và màu sắc phân cấp chuẩn:
     - `Chỉnh sửa` (Edit2, xanh dương)
     - `Gửi kiểm duyệt` (Send, hổ phách) - hiển thị khi ở trạng thái draft/rejected
     - `Phê duyệt` (CheckCircle2, xanh lá) & `Từ chối` (XCircle, đỏ hồng) - hiển thị khi in_review
     - `Xuất bản` (Globe, xanh lá) - hiển thị khi approved
     - `Gỡ xuất bản` (Undo2, hổ phách) - hiển thị khi published
     - `Xóa mềm` (Trash2, đỏ hồng) - hiển thị cho câu hỏi đang hoạt động
     - `Khôi phục` (RotateCcw, xanh lá) - hiển thị khi đang xem thùng rác
  3. **Chống tràn và cắt menu (Zero-Clipping):** Kebab dropdown được render thông qua **React Portal (`createPortal`)** cắm trực tiếp vào `document.body` với vị trí tọa độ cố định (`fixed`), `z-index: 50`. Do đó, menu không bao giờ bị cắt cụt bởi container có `overflow-x-auto` của bảng.
  4. **Accessibility:** Hỗ trợ đóng tự động khi click ra ngoài (`click outside`), phím `Escape`, sự kiện cuộn/resize trang và vùng chạm đạt chuẩn tối thiểu 44x44px.

### Lỗi 2 — Nội dung câu hỏi và công thức toán học hiển thị sai (`MathView.tsx`)
- **Nguyên nhân gốc rễ (Root Cause):**
  Trong phiên bản cũ của `MathView.tsx`, khi chuỗi đầu vào KHÔNG có ký hiệu bao quanh (`$`, `\(` hoặc `\[`), component rơi vào nhánh fallback:
  ```ts
  pureHtml = katex.renderToString(cleanText.trim(), { displayMode: isDisplay, throwOnError: false })
  ```
  Vì `throwOnError: false`, KaTeX coi toàn bộ văn bản tiếng Việt thường là công thức toán học, biến từng chữ cái tiếng Việt thành các ký hiệu biến số in nghiêng (math italics), đồng thời nuốt toàn bộ dấu cách thông thường giữa các từ! Kết quả là câu văn như *"Hỏi: 1 + 1 bằng mấy?"* bị KaTeX kết xuất thành *"Hỏi : 1 + 1bằngmấy?"*.
  Ngoài ra, các thẻ inline math KaTeX thiếu lề ngang (`margin`) khiến công thức bị dính liền với từ tiếng Việt đứng trước hoặc sau nó.
- **Giải pháp hoàn thiện:**
  1. **Bộ lọc plain text thông minh:** Chỉ gọi `katex.renderToString` khi văn bản thực sự có chứa các lệnh TeX chuẩn (như `\frac`, `\sqrt`, `\alpha`,...) hoặc khi được bật cờ `displayMode` có chủ đích. Văn bản tiếng Việt thông thường được giữ nguyên thuần túy, bảo toàn 100% dấu cách và dấu câu.
  2. **Bộ tiền xử lý chuẩn hóa ký tự (`normalizeMathText`):**
     - Tự động tách các từ tiếng Việt bị dính (ví dụ `bằngmấy` -> `bằng mấy`).
     - Tự động chèn khoảng cách an toàn trước và sau dấu `$` nếu đứng sát ký tự chữ/số.
     - Xử lý các dấu `$` đơn lẻ không đóng (dangling `$`) mà không làm hỏng cú pháp KaTeX.
  3. **CSS spacing:** Bổ sung `.katex-inline-wrapper { display: inline-block; margin: 0 0.25rem; vertical-align: -0.05em; }` trong `MathView.css`, đảm bảo mọi công thức hiển thị thoáng mắt và không đè chữ.

### Lỗi 3 — Bảng dữ liệu quá nhiều cột (Tối ưu từ 9 cột xuống 5 cột)
- **Hiện trạng cũ:** Bảng có 9 cột riêng biệt (STT, Mã câu, Môn & Lớp, Nội dung, Dạng câu, Độ khó, Nguồn, Trạng thái, Thao tác), khiến cột nội dung câu hỏi bị bóp hẹp, phải cuộn ngang liên tục.
- **Cấu trúc 5 cột tinh gọn mới:**
  1. **[Mã câu]** (font-mono, badge gọn gàng, độ rộng ~110px).
  2. **[Môn / Lớp]** (Hiển thị tên môn tiếng Việt lấy từ backend và lớp tương ứng. **Tuyệt đối không hardcode** mặc định là "Toán học" hay "Lớp 12", nếu không có sẽ hiển thị "Chưa phân môn" / "Chưa xếp lớp").
  3. **[Nội dung câu hỏi]** (Chiếm phần lớn chiều rộng bảng, min-w 320px). Hiển thị đề bài bằng `MathView`, `line-clamp-2`. Ngay bên dưới đề bài là hàng **Chip siêu dữ liệu (Metadata Chips)** gồm:
     - Dạng câu hỏi (Trắc nghiệm, Nhiều lựa chọn, Đúng/Sai, Điền từ, Tự luận)
     - Độ khó (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao)
     - Nguồn gốc (Huy hiệu VNHSGE kèm biểu tượng Sparkles hoặc Thủ công)
     - Thông tin đáp án: số lượng phương án và đáp án đúng.
  4. **[Trạng thái]** (Huy hiệu chuẩn hóa ở giữa).
  5. **[Thao tác]** (Nút Xem trước 1-click + Menu ba chấm).

### Lỗi 4 — Nút tạo câu hỏi bị lặp & Bỏ huy hiệu thừa
- **Hiện trạng cũ:** Nút "+ Soạn câu hỏi mới" xuất hiện 2 lần: 1 lần ở Page Header trên cùng và 1 lần ở thanh công cụ Filter. Đồng thời ở header có huy hiệu trang trí `"Modern Admin UI"` không cần thiết.
- **Giải pháp hoàn thiện:**
  - Bỏ hoàn toàn nút tạo trùng lặp trên Page Header.
  - Bỏ huy hiệu trang trí `Modern Admin UI`.
  - Giữ lại duy nhất một nút Call-To-Action chính: `+ Soạn câu hỏi mới` (màu Navy `#183B69`) đặt cạnh thanh tìm kiếm và bộ lọc của bảng, chuẩn luồng thao tác người dùng.

### Lỗi 5 — Trạng thái câu hỏi chưa trực quan
- **Chuẩn hóa hệ thống huy hiệu trạng thái (Status Badges) đồng nhất:**
  - `draft` (Bản nháp): Nền slate nhạt `bg-slate-100`, chữ `text-slate-700`, chấm xám.
  - `in_review` / `in-review` (Chờ duyệt): Nền hổ phách `bg-amber-50`, chữ `text-amber-800`, icon `AlertCircle`.
  - `approved` (Đã duyệt): Nền xanh dương `bg-blue-50`, chữ `text-blue-800`, icon `CheckCircle2`.
  - `published` (Đã xuất bản): Nền ngọc bích `bg-emerald-50`, chữ `text-emerald-800`, chấm xanh sáng.
  - `rejected` (Bị từ chối): Nền đỏ hồng `bg-rose-50`, chữ `text-rose-800`, icon `XCircle`.
  - `isDeleted` / Thùng rác: Nền đỏ `bg-red-50`, chữ `text-red-700`, icon `Trash2`.

### Lỗi 6 — Phân cấp thị giác chưa tốt (Visual Hierarchy)
- **Cấu trúc thị giác 5 tầng rõ ràng theo chuẩn Evondev:**
  1. **Tầng 1 — Page Header:** Tối giản, chỉ gồm biểu tượng Cơ sở dữ liệu, tiêu đề "Ngân hàng câu hỏi" và dòng mô tả ngắn gọn.
  2. **Tầng 2 — KPI Dashboard Cards:** 6 thẻ chỉ số phản ánh thời gian thực với icon, nền màu và chú thích rõ ràng.
  3. **Tầng 3 — Toolbar & Filters:** Thanh tìm kiếm tức thời + Bộ lọc môn học, khối lớp, độ khó, dạng câu, nguồn gốc + Nút Thùng rác, Đặt lại và Nút CTA chính.
  4. **Tầng 4 — Question Table:** Bảng 5 cột thoáng đãng, dễ đọc, khoảng cách padding 12/16px.
  5. **Tầng 5 — Master-Detail Panel:** Ngăn xem chi tiết cố định cạnh phải (`sticky`) hoặc Modal độc lập khi xem sâu, hiển thị đầy đủ công thức KaTeX, phương án lựa chọn, hình ảnh minh họa và lời giải chi tiết.

### Lỗi 7 — Đối soát chênh lệch thống kê SQL và UI (16.968 vs 16.966)
- **Kết quả điều tra pháp chứng dữ liệu SQL Server (`StudyAIDb_E2E`):**
  - Câu lệnh kiểm tra:
    ```sql
    SELECT 
        COUNT(*) AS TotalPhysical,
        SUM(CASE WHEN IsDeleted = 0 THEN 1 ELSE 0 END) AS ActiveCount,
        SUM(CASE WHEN IsDeleted = 1 THEN 1 ELSE 0 END) AS DeletedCount
    FROM dbo.content_questions;
    ```
  - Kết quả trước lượt chạy test:
    - `TotalPhysical`: **16.968** bản ghi vật lý.
    - `ActiveCount` (IsDeleted = 0): **16.966** câu hỏi đang hoạt động.
    - `DeletedCount` (IsDeleted = 1): **2** câu hỏi đã bị xóa mềm và nằm trong Thùng rác.
  - Công thức: `16.966 (Hoạt động) + 2 (Thùng rác) = 16.968 (Tổng vật lý SQL)`.
- **Cải tiến UI:** Thẻ KPI "Tổng câu hỏi" được bổ sung dòng phụ đề rõ ràng:
  `16.968 bản ghi SQL (16.966 hoạt động)` kèm tooltip giải thích chi tiết, giúp người dùng hiểu ngay rằng hệ thống không bị mất dữ liệu mà phân tách rõ giữa câu hỏi hoạt động và câu hỏi trong thùng rác.

---

## 3. KẾT QUẢ KIỂM THỬ TOÀN BỘ HỆ THỐNG

| Hạng mục kiểm thử | Công cụ | Phạm vi / Số lượng | Kết quả | Ghi chú |
| :--- | :--- | :--- | :---: | :--- |
| **Frontend Lint** | `oxlint --deny-warnings` | 413 files, 116 rules | **PASS** | 0 warnings, 0 errors (490ms) |
| **Frontend TypeCheck & Build** | `tsc -b && vite build` | Toàn bộ src/frontend | **PASS** | Hoàn thành trong 32.93s, 0 lỗi TypeScript |
| **Frontend Vitest** | `vitest run` | 52 test files, 406 unit/integration tests | **PASS** | 406/406 tests passed (54.66s) |
| **Backend Unit Tests** | `dotnet test` (net10.0) | `StudyAI.UnitTests` | **PASS** | 81/81 tests passed (3.0s) |
| **Backend Integration Tests** | `dotnet test` (net10.0) | `StudyAI.IntegrationTests` | **PASS** | 127/127 tests passed (1m 30s) |
| **Question Bank Playwright E2E** | Chromium (Real Browser) | 21 kịch bản nghiệp vụ & 4 viewports | **PASS** | 21/21 passed (toàn bộ CRUD, Math, RBAC, Viewports) |

### Chi tiết 21 kịch bản Playwright E2E đã nghiệm thu:
1. `[PASS] Scenario 1: Content Specialist Login` (4214ms)
2. `[PASS] Scenario 2: Question Bank Navigation & UI Render` (7689ms)
3. `[PASS] Scenario 3: View VNHSGE Questions in UI` (876ms)
4. `[PASS] Scenario 4: Filter by Type & Subject` (638ms)
5. `[PASS] Scenario 5: Search Question in Bank` (867ms)
6. `[PASS] Scenario 6: Preview Answer & Explanation with KaTeX` (2596ms)
7. `[PASS] Scenario 7: Create Question with KaTeX Formula` (793ms)
8. `[PASS] Scenario 8: Edit Question via 3-dots Menu` (5733ms)
9. `[PASS] Scenario 9: Submit Review via 3-dots Menu` (5981ms)
10. `[PASS] Scenario 10: Content Primacy Approval via 3-dots Menu` (3181ms)
11. `[PASS] Scenario 11: Publish Question via 3-dots Menu` (3322ms)
12. `[PASS] Scenario 12: Unpublish Question via 3-dots Menu` (3184ms)
13. `[PASS] Scenario 13: Soft Delete Question via 3-dots Menu` (963ms)
14. `[PASS] Scenario 14: Restore Question from Trash via 3-dots Menu` (10189ms)
15. `[PASS] Scenario 15: Learner Zero-Leak & Content Guard (403)` (2345ms)
16. `[PASS] Scenario 16: Admin Blocked from Content Approval (403)` (191ms)
17. `[PASS] Scenario 17: Unpublished Hidden from Learner API (403)` (185ms)
18. `[PASS] Scenario 18: Zero Leak of Unsubmitted Answers` (309ms)
19. `[PASS] Scenario 19: VNHSGE Content Curation & Unblocked Publishing` (867ms)
20. `[PASS] Scenario 20: Database Safety & Production Isolation` (0ms)
21. `[PASS] Scenario 21: Evondev 4 Viewports & Zero Overflow (1920, 1366, 768, 390px)` (3017ms)

---

## 4. XÁC NHẬN AN TOÀN DATABASE & PRODUCTION ISOLATION

- **Production Database (`StudyAIDb`):**
  - Truy vấn kiểm tra: `SELECT COUNT(*) FROM dbo.content_questions`
  - Kết quả: **14 câu hỏi** (giữ nguyên 100%, không phát sinh bất kỳ thao tác ghi, cập nhật, xóa hoặc chạy migration nào).
- **Test Database (`StudyAIDb_E2E`):**
  - Dữ liệu câu hỏi VNHSGE và các thao tác kiểm thử E2E được thực hiện độc lập an toàn trên `StudyAIDb_E2E`.

---

## 5. DANH SÁCH ẢNH CHỤP NGHIỆM THU THỰC TẾ

Toàn bộ ảnh chụp nghiệm thu tự động được lưu tại `docs/visual-qa/question-bank/`:
- `01_login_filled.png` - Màn hình đăng nhập Content Specialist
- `01_content_dashboard.png` - Dashboard vai trò Content
- `02_question_bank_dashboard.png` - Giao diện Ngân hàng câu hỏi Modern Admin với bảng 5 cột tinh gọn
- `03_create_question_modal.png` - Modal soạn thảo câu hỏi mới với công thức KaTeX
- `06_preview_modal_katex.png` - Xem trước chi tiết câu hỏi và lời giải KaTeX
- `07_published_question.png` - Câu hỏi sau khi xuất bản với huy hiệu chuẩn
- `08_learner_forbidden.png` - Vai trò Học viên bị chặn 403 khi cố truy cập
- `viewport_1920_desktop.png` - Giao diện responsive trên màn hình Desktop 1920x1080 (Zero overflow)
- `viewport_1366_laptop.png` - Giao diện responsive trên Laptop 1366x768 (Zero overflow)
- `viewport_768_tablet.png` - Giao diện responsive trên Tablet 768x1024 (Zero overflow)
- `viewport_390_mobile.png` - Giao diện responsive trên Mobile 390x844 (Zero overflow)

