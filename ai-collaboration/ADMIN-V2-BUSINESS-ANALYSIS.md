# STUDY_AI — PHÂN TÍCH NGHIỆP VỤ HỆ THỐNG QUẢN TRỊ V2
## Practical Management System — No AI

**Workspace:** `D:\TN`  
**Tài liệu:** Phân tích luồng nghiệp vụ & tối ưu hóa thao tác quản lý  
**Mục tiêu:** Xây dựng phần mềm quản trị giáo dục thực tế, tối giản, dữ liệu tập trung, không hiệu ứng rườm rà, không AI Dashboard, không KPI giả.

---

## 1. TỔNG QUAN VÀ NGUYÊN TẮC THIẾT KẾ V2

Hệ thống quản trị STUDY_AI V2 loại bỏ hoàn toàn các yếu tố trang trí "AI Dashboard" (chatbot, insight ảo, sparkline giả, card lồng card, biểu đồ vô nghĩa). Thay vào đó, toàn bộ kiến trúc hướng tới **Hiệu quả công việc thực tế hàng ngày (Operational Efficiency)**:
1. **Dữ liệu chiếm trọng tâm (Data-First):** Tối đa hóa diện tích cho bảng dữ liệu, cấu trúc cây nội dung và form tác vụ.
2. **Loại bỏ nhấp chuột thừa (Fewer Clicks):** Xem chi tiết ngay tại chỗ bằng Drawer/Panel bên phải thay vì chuyển trang liên tục.
3. **Thao tác tức thì (Immediate Actions):** Bộ lọc debounce, phím tắt tìm kiếm, thay đổi trạng thái tại dòng (inline status change), thao tác hàng loạt (bulk actions).
4. **Trung thực về dữ liệu (Real Metrics):** Chỉ hiển thị số liệu thực tế được tính toán từ backend/database SQL Server, loại bỏ các con số giả lập.

---

## 2. MA TRẬN PHÂN TÍCH ROUTE QUẢN TRỊ HIỆN CÓ

### KHÔNG GIAN 1: QUẢN TRỊ HỆ THỐNG — ADMIN WORKSPACE (`/admin`)

#### 1.1. Admin Dashboard (`/admin`)
- **Người sử dụng:** Quản trị viên hệ thống (Super Admin / System Administrator).
- **Mục đích quản lý:** Nắm bắt ngay các việc cần can thiệp trong ngày (tài khoản chờ duyệt, sự cố, khiếu nại quá hạn) và kiểm tra tình trạng kết nối dịch vụ.
- **Thông tin quan trọng nhất:**
  1. Hàng đợi việc cần xử lý ngay (`attentionItems` với mức độ nghiêm trọng).
  2. Bốn chỉ số vận hành thực: Tổng người dùng, Học viên hoạt động tuần, Bài học đã hoàn thành, Sự cố chờ xử lý.
  3. Hoạt động gần đây của cán bộ/giáo viên.
- **Thao tác thường xuyên nhất:** Bấm vào việc cần xử lý để nhảy trực tiếp tới bản ghi cần duyệt/giải quyết; xuất nhanh báo cáo điều hành.
- **Những thành phần không cần thiết (Loại bỏ):**
  - Biểu đồ đường/vùng trang trí không thể hiện rõ giá trị hành động.
  - Các khối AI insight hay gợi ý tự động không có thật.
- **Cách giảm số lần nhấp chuột:** Gom 4 KPI thành một khối dải duy nhất (`border-separated strip`), danh sách việc cần xử lý có link nhảy thẳng tới mục cần giải quyết (1-click navigation).

#### 1.2. Quản lý người dùng (`/admin/users`) & Chi tiết (`/admin/users/:id`)
- **Người sử dụng:** Quản trị viên tài khoản.
- **Mục đích quản lý:** Tìm kiếm, tạo mới, phân quyền, khóa/mở tài khoản, thu hồi phiên đăng nhập khi có sự cố bảo mật.
- **Thông tin quan trọng nhất:** Họ tên, Email, Vai trò (`admin`, `teacher`, `content`, `support`, `learner`), Trạng thái (`active`, `suspended`, `pending`), Khối/Lớp, Ngày đăng nhập cuối.
- **Thao tác thường xuyên nhất:**
  1. Tìm kiếm theo email hoặc họ tên.
  2. Lọc nhanh theo vai trò hoặc trạng thái.
  3. Đổi trạng thái (Khóa / Mở khóa) hoặc đặt lại mật khẩu.
  4. Phân vai trò hàng loạt (Bulk role assignment).
- **Những thành phần không cần thiết (Loại bỏ):**
  - Các biểu đồ phân bố người dùng chiếm chỗ bảng.
  - Việc bắt buộc chuyển sang trang `/admin/users/:id` chỉ để xem thông tin cơ bản hoặc khóa tài khoản.
- **Cách giảm số lần nhấp chuột:** Tích hợp Quick Actions trực tiếp trên dòng bảng và dùng Drawer trượt từ bên phải để xem nhanh hồ sơ/lịch sử học tập của user mà không phải rời khỏi trang danh sách.

#### 1.3. Phân quyền & Vai trò (`/admin/roles`)
- **Người sử dụng:** Quản trị viên an ninh.
- **Mục đích quản lý:** Xem ma trận quyền (RBAC) tương ứng với 5 vai trò hệ thống; kiểm soát phạm vi truy cập module.
- **Thông tin quan trọng nhất:** Danh sách quyền hạn (Curriculum, Assessment, Users, System, Support) theo từng vai trò.
- **Thao tác thường xuyên nhất:** Kiểm tra đối soát quyền cán bộ trước khi phân vai trò.
- **Cách giảm số lần nhấp chuột:** Trình bày dạng ma trận kiểm tra (Matrix Check Table) rõ ràng, trực quan, có giải thích ngữ cảnh quyền.

#### 1.4. Quản lý giáo viên (`/admin/teachers`)
- **Người sử dụng:** Quản trị viên học vụ.
- **Mục đích quản lý:** Quản lý đội ngũ giáo viên, phân công bộ môn, trạng thái giảng dạy, tạo tài khoản giáo viên mới.
- **Thông tin quan trọng nhất:** Tên giáo viên, Email, Bộ môn phụ trách, Số lớp đang dạy, Trạng thái hoạt động.
- **Thao tác thường xuyên nhất:** Tìm kiếm giáo viên, mở Drawer chi tiết để gán lớp hoặc đổi trạng thái giảng dạy.
- **Cách giảm số lần nhấp chuột:** Mở Drawer chỉnh sửa ngay trên màn hình, không chuyển trang.

#### 1.5. Giám sát liên không gian (`/admin/content-monitor`, `/admin/support-monitor`)
- **Người sử dụng:** Quản trị viên cấp cao.
- **Mục đích quản lý:** Giám sát tiến độ biên tập của Content team và hiệu suất xử lý yêu cầu của Support team mà không can thiệp sâu vào thao tác chi tiết.
- **Thông tin quan trọng nhất:** Tỉ lệ bài học chờ duyệt, thời gian phản hồi trung bình của support, số lượng ticket tồn đọng.
- **Cách giảm số lần nhấp chuột:** Cung cấp liên kết trực tiếp sang Content Review Queue và Support Ticket Queue.

---

### KHÔNG GIAN 2: BIÊN TẬP NỘI DUNG — CONTENT WORKSPACE (`/content`)

#### 2.1. Content Dashboard (`/content`)
- **Người sử dụng:** Biên tập viên (Content Specialist) & Trưởng ban nội dung.
- **Mục đích quản lý:** Theo dõi tiến độ biên tập bài học, xuất bản giáo trình và hàng đợi kiểm duyệt chất lượng.
- **Thông tin quan trọng nhất:**
  1. Số bài học bản nháp (`draftCount`).
  2. Số nội dung chờ duyệt chất lượng (`needsReviewCount`).
  3. Hàng đợi kiểm duyệt (`reviewQueue`).
  4. Danh sách bài học vừa cập nhật.
- **Thao tác thường xuyên nhất:** Bấm vào bài học chờ duyệt để xem nội dung và phê duyệt/yêu cầu chỉnh sửa; tạo bài học mới.
- **Cách giảm số lần nhấp chuột:** Nút "Duyệt" ngay tại dòng trong hàng đợi kiểm duyệt dẫn thẳng vào màn hình thẩm định.

#### 2.2. Ngân hàng câu hỏi (`/content/questions`)
- **Người sử dụng:** Giáo viên biên soạn đề, Chuyên viên khảo thí & kiểm duyệt nội dung.
- **Mục đích quản lý:** Quản lý kho câu hỏi trắc nghiệm/tự luận, ngân hàng đề VNHSGE, thẩm định công thức KaTeX, duyệt xuất bản hoặc chuyển thùng rác.
- **Thông tin quan trọng nhất:**
  - Nội dung câu hỏi (prompt) hiển thị công thức toán học/khoa học KaTeX chính xác.
  - Môn học, Khối lớp, Mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao).
  - Trạng thái kiểm duyệt (Nháp, Chờ duyệt, Đã duyệt, Đã xuất bản).
- **Thao tác thường xuyên nhất:**
  1. Lọc câu hỏi theo môn học + khối lớp + trạng thái.
  2. Bấm vào câu hỏi để xem trước (Preview) toàn bộ phương án A, B, C, D, lời giải chi tiết và công thức Toán/Lý/Hóa.
  3. Thao tác duyệt (Approve) hoặc yêu cầu sửa (Reject) có ghi chú phản hồi.
  4. Tạo câu hỏi mới hoặc chỉnh sửa câu hỏi hiện có.
- **Những thành phần không cần thiết (Loại bỏ):**
  - Mở sang trang riêng biệt chỉ để đọc câu hỏi (gây mất dấu bộ lọc đang chọn).
- **Cách giảm số lần nhấp chuột:** Bố cục **Master-Detail Workstation**: Bảng câu hỏi bên trái (65% chiều rộng), Panel xem trước bên phải (35% chiều rộng). Khi click vào dòng bất kỳ, panel bên phải cập nhật ngay lập tức mà không tải lại trang.

#### 2.3. Cấu trúc nội dung: Môn học → Chương → Bài học (`/content/subjects`, `/content/chapters`, `/content/lessons`)
- **Người sử dụng:** Chuyên viên quản lý chương trình đào tạo.
- **Mục đích quản lý:** Xây dựng khung kiến trúc chương trình học theo chuẩn Bộ GD&ĐT: Môn học (Subject) chứa các Chương (Chapter), mỗi Chương chứa các Bài học (Lesson).
- **Thông tin quan trọng nhất:** Mã môn/chương/bài, tên bài học, thứ tự hiển thị (`displayOrder`), trạng thái xuất bản, số bài tập thu hoạch gắn kèm.
- **Thao tác thường xuyên nhất:** Thêm chương mới vào môn học; thêm bài học vào chương; sắp xếp thứ tự học tập; chỉnh sửa nội dung bài viết.
- **Cách giảm số lần nhấp chuột:** Cung cấp bộ chọn Môn học / Chương học ngay đầu trang để lọc nhanh cấu trúc cây; modal tạo nhanh với các trường điền tối giản.

#### 2.4. Nhập giáo trình hàng loạt (`/content/import`)
- **Người sử dụng:** Cán bộ phụ trách dữ liệu khảo thí.
- **Mục đích quản lý:** Tải lên tệp JSON/CSV/XLSX chứa hàng trăm câu hỏi hoặc bài học, kiểm tra hợp lệ trước (Preview API) và xác nhận ghi cơ sở dữ liệu (Confirm API).
- **Thông tin quan trọng nhất:** File upload dropzone, trạng thái validation (số lượng hợp lệ, lỗi dòng cụ thể, cảnh báo conflict), audit note.
- **Thao tác thường xuyên nhất:** Kéo thả tệp, kiểm tra bảng lỗi/cảnh báo, nhập ghi chú kiểm toán và bấm Xác nhận.

---

### KHÔNG GIAN 3: GIẢNG DẠY & LỚP HỌC — TEACHER WORKSPACE (`/teacher`)

#### 3.1. Teacher Dashboard (`/teacher`)
- **Người sử dụng:** Giáo viên bộ môn, Giáo viên chủ nhiệm.
- **Mục đích quản lý:** Nắm bắt lịch dạy, danh sách lớp phụ trách, bài tập học sinh nộp chờ chấm và các cảnh báo học tập nguy cơ.
- **Thông tin quan trọng nhất:** Tổng số lớp đang dạy, tổng học sinh, bài tập chờ chấm, cảnh báo học sinh thụt lùi (`alerts`).
- **Thao tác thường xuyên nhất:** Truy cập vào lớp học cụ thể hoặc chấm điểm bài tập mới nộp.

#### 3.2. Quản lý lớp học (`/teacher/classes`) & Học viên (`/teacher/classes/:id`, `/teacher/students`)
- **Người sử dụng:** Giáo viên.
- **Mục đích quản lý:** Quản lý sĩ số, thêm học viên vào lớp, chuyển lớp, theo dõi tỉ lệ hoàn thành bài tập của từng học viên.
- **Thông tin quan trọng nhất:** Mã lớp, Tên lớp, Khối, Sĩ số, Điểm trung bình môn.
- **Thao tác thường xuyên nhất:** Tìm kiếm học sinh, xem lịch sử làm bài, ghi chú đánh giá học sinh.

#### 3.3. Bài tập & Chấm điểm (`/teacher/assignments`, `/teacher/grades`)
- **Người sử dụng:** Giáo viên.
- **Mục đích quản lý:** Giao bài tập về nhà / bài kiểm tra định kỳ cho lớp; chấm điểm và gửi nhận xét cho từng bài nộp.
- **Thông tin quan trọng nhất:** Tiêu đề bài tập, Hạn nộp, Tỉ lệ đã nộp / chưa nộp, Điểm số từng học sinh.
- **Thao tác thường xuyên nhất:** Tạo bài tập mới; lọc danh sách bài đã nộp để chấm điểm.

---

### KHÔNG GIAN 4: HỖ TRỢ NGƯỜI DÙNG — SUPPORT WORKSPACE (`/support`)

#### 4.1. Support Dashboard (`/support`) & Tickets (`/support/tickets`, `/support/tickets/:id`)
- **Người sử dụng:** Chuyên viên hỗ trợ kỹ thuật và chăm sóc học viên.
- **Mục đích quản lý:** Tiếp nhận yêu cầu trợ giúp (vấn đề tài khoản, bài tập, sự cố thanh toán, kỹ thuật), phân loại ưu tiên, phản hồi học viên và đóng ticket khi hoàn tất.
- **Thông tin quan trọng nhất:** Mã ticket, Tiêu đề, Người gửi, Mức độ ưu tiên (`urgent`, `high`, `normal`, `low`), Trạng thái (`open`, `in_progress`, `resolved`, `closed`), Cán bộ thụ lý.
- **Thao tác thường xuyên nhất:** Lọc ticket chưa có người nhận (`unassigned`) hoặc ưu tiên khẩn; mở hội thoại gửi tin nhắn giải đáp; ghi chú nội bộ giữa các cán bộ hỗ trợ.
- **Cách giảm số lần nhấp chuột:** Bộ lọc trạng thái dạng pill một chạm (Tất cả, Mở, Đang xử lý, Đã giải quyết), khung trả lời nhanh với mẫu câu thường dùng.

---

## 3. THIẾT KẾ BỐ CỤC V2 MỚI: SIDEBAR + COMPACT HEADER + WORKSPACE

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO] STUDY_AI — QUẢN TRỊ    │ Tiêu đề trang (Module)      [User Profile & Thoát]│ <- Compact Header (48px)
├───────────────────────────────┼──────────────────────────────────────────────────┤
│ 📁 QUẢN TRỊ CHUNG             │ [Toolbar: Tìm kiếm | Lọc trạng thái | Nút chính] │
│   • Tổng quan hệ thống        ├──────────────────────────────────────────────────┤
│   • Quản lý người dùng        │ [Data Workstation: Bảng dữ liệu chiếm trọn diện  │
│   • Phân quyền vai trò        │  tích, đường kẻ mảnh #E2E8F0, padding vừa vặn,   │
│ 📚 NỘI DUNG & ĐỀ THI          │  số liệu tabular-nums, hover nhẹ nhàng,          │
│   • Ngân hàng câu hỏi         │  hỗ trợ drawer xem trước bên phải nếu cần]       │
│   • Chương trình đào tạo      │                                                  │
│   • Kiểm duyệt nội dung       │                                                  │
│   • Nhập dữ liệu              │                                                  │
│ 👨‍🏫 GIẢNG DẠY & HỌC VỤ        │                                                  │
│   • Lớp học & Học viên        │                                                  │
│   • Bài tập & Chấm điểm       │                                                  │
│ 🎧 HỖ TRỢ & HỆ THỐNG          │                                                  │
│   • Yêu cầu trợ giúp          │                                                  │
│   • Nhật ký kiểm toán         ├──────────────────────────────────────────────────┤
│                               │ [Pagination Bar: Phân trang tinh gọn, chọn size] │
└───────────────────────────────┴──────────────────────────────────────────────────┘
```

### Các nguyên tắc giao diện then chốt:
1. **Sidebar cố định, phân nhóm theo nghiệp vụ:**
   - Chiều rộng 240px (mở) hoặc 64px (thu gọn), nền trắng hoặc xám trung tính sáng `#FAFAFA`, viền phải `#E2E8F0`.
   - Mục đang chọn có nền xanh nhạt `rgba(29, 78, 216, 0.08)`, chữ xanh đậm `#1D4ED8`, thanh chỉ báo 3px bên trái.
2. **Compact Header (48px):**
   - Chỉ chứa: Tiêu đề trang hiện tại, breadcrumb ngữ cảnh ngắn, thông tin tài khoản và nút đăng xuất.
   - Không chứa banner trang trí, không hiệu ứng chuyển màu rườm rà.
3. **Bảng dữ liệu tối ưu diện tích:**
   - Chiều cao hàng chuẩn 44px–48px, chữ 13px–13.5px dễ đọc.
   - Tiêu đề cột `text-xs font-semibold uppercase text-slate-500`.
   - Các cột số dùng font số đều (`tabular-nums`) để thẳng hàng.
   - Cột thao tác (`Actions`) luôn nằm cố định bên phải với các nút biểu tượng rõ nghĩa và tooltip hướng dẫn.

---

## 4. KẾ HOẠCH TRIỂN KHAI BƯỚC TIẾP THEO

- **Bước 2 & 4:** Xây dựng thư viện component V2 riêng tại `frontend/src/components/management/` gồm `ManagementLayout`, `ManagementSidebar`, `ManagementHeader`, `ManagementTable`, `ManagementFilter`, `ManagementDrawer`, `ManagementDialog`, `ManagementPagination`, v.v.
- **Bước 3:** Áp dụng vào Admin Dashboard, Users, Question Bank, Content, Teacher, Support.
- **Bước 5 & 7:** Kiểm thử toàn diện không lỗi TypeScript, Vitest 100% xanh, Visual QA bằng Playwright.
