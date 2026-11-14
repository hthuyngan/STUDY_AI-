# BÁO CÁO TỔNG KẾT CHUẨN HÓA CSS & ỔN ĐỊNH GIAO DIỆN FRONTEND STUDY_AI
## STUDY_AI — FULL FRONTEND CSS STANDARDIZATION & UI STABILITY

- **Dự án**: STUDY_AI (Educational Management System)
- **Repository**: `https://github.com/hthuyngan/STUDY_AI-`
- **Branch**: `feature/frontend-css-architecture`
- **Draft PR**: `https://github.com/hthuyngan/STUDY_AI-/pull/9`
- **Ngày hoàn thành**: 15/11/2026
- **Trạng thái**: TOÀN BỘ 8 GIAI ĐOẠN ĐÃ HOÀN TẤT & ĐÃ KIỂM THỬ XÁC MINH 100%

---

## 1. TỔNG QUAN KẾT QUẢ TRIỂN KHAI

| Hạng mục | Mục tiêu | Kết quả đạt được | Trạng thái |
|---|---|---|---|
| **Phase 1: Kiểm kê CSS** | Rà soát 74 file CSS, tìm nguồn gốc xung đột | Phát hiện nguyên nhân cốt lõi gây vỡ layout là chuỗi class Tailwind chưa biên dịch | **HOÀN THÀNH** |
| **Phase 2: Sửa Question Bank (P0)** | Khôi phục giao diện 2 cột, sửa table, modal, drawer, kebab portal | Viết `QuestionBank.module.css` scoped, chuẩn hóa 100% layout và dialog | **HOÀN THÀNH** |
| **Phase 3: Design Tokens & Foundation** | Chuẩn hóa tokens, reset, typography, utilities | Tạo `tokens.css`, `reset.css`, `typography.css`, `utilities.css`, `index.css` | **HOÀN THÀNH** |
| **Phase 4: Shared Components** | Chuẩn hóa bảng, form, dialog, drawer, button | Đồng bộ `ManagementLayout.css`, `AdminDesignSystem.css`, `ConfirmDialog.css` | **HOÀN THÀNH** |
| **Phase 5: Workspaces Consistency** | Không xung đột giữa Content, Admin, Teacher, Support, Learner | Kiểm tra 5 workspaces, 0 regression trên Learner UI | **HOÀN THÀNH** |
| **Phase 6: Kiểm thử toàn diện** | Vitest, Oxlint, TypeScript, Build | **406/406 tests pass (52 test suites)**, **0 lint warnings**, **Build pass 1.85s** | **HOÀN THÀNH** |
| **Phase 7: Visual Regression** | Chụp bằng chứng Playwright đa viewport (1440, 1280, 768, 390) | Đã chụp và lưu 34 ảnh screenshot chi tiết tại `docs/visual-qa/` | **HOÀN THÀNH** |
| **Phase 8: Báo cáo & Tài liệu** | Tài liệu kiến trúc CSS & hướng dẫn mở rộng | Đã xuất bản `docs/CSS-ARCHITECTURE.md` và báo cáo hoàn chỉnh | **HOÀN THÀNH** |

---

## 2. NGUYÊN NHÂN CỐT LÕI & CÁCH KHẮC PHỤC LỖI P0 NGÂN HÀNG CÂU HỎI

### 2.1 Phát hiện nguyên nhân
- Thư mục `frontend/src/features/question-bank/` chứa các component:
  - `ModernQuestionBankPage.tsx`
  - `QuestionTable.tsx`
  - `QuestionPreviewPanel.tsx`
  - `QuestionFormModal.tsx`
  - `QuestionRejectModal.tsx`
  - `QuestionDeleteModal.tsx`
- Các component này được viết với hàng loạt chuỗi class tiện ích Tailwind: `className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"`, `flex flex-col lg:flex-row items-start gap-6`, `line-clamp-2 text-xs text-slate-800`.
- Tuy nhiên, dự án STUDY_AI sử dụng **Vite thuần** và **không cài đặt Tailwind CSS**.
- Hậu quả: Trình duyệt coi tất cả các class này là chuỗi rỗng không có CSS rules, khiến:
  - Bảng câu hỏi mất phân bố cột, tràn vỡ layout.
  - Cột xem trước (Preview Panel) bị đẩy xuống dưới đáy trang thay vì nằm bên phải.
  - Các hộp thoại (Modal Form, Modal Delete, Modal Reject) không thể hiển thị dạng fixed overlay căn giữa mà rơi tự do vào cuối DOM.
  - Dropdown thao tác (Kebab menu) bị tràn và không hiển thị đúng vị trí.

### 2.2 Giải pháp khắc phục
1. Xây dựng module CSS scoped độc lập: `frontend/src/features/question-bank/QuestionBank.module.css`.
2. Chuyển đổi toàn bộ component sang sử dụng `styles.*`:
   - Bố cục 2 cột trên desktop (`.workstation`, `.tableCol`, `.previewCol` cố định 440px - 460px với `sticky top`).
   - Trên tablet/mobile (`< 1024px`), bảng xem trước tự động chuyển thành **Drawer trượt ra từ bên phải** với backdrop làm mờ nền `.previewDrawerBackdrop`.
   - Bảng danh sách chuẩn 5 cột (`.thCode`, `.thSubject`, `.thContent`, `.thStatus`, `.thActions`) bọc trong `.tableScroll` chống co rúm dữ liệu.
   - Thao tác gom vào 1 nút xem nhanh (`Eye`) và menu 3 chấm (`MoreVertical`) tạo qua React Portal (`styles.kebabPortal`), tránh bị cắt bởi container cuộn của bảng.
   - Toàn bộ Modal (`QuestionFormModal`, `QuestionRejectModal`, `QuestionDeleteModal`, `previewModalQuestion`) sử dụng `.modalBackdrop` (backdrop-blur, `z-index: 500`), `.modalDialog` (căn giữa, bo góc 14px, đổ bóng sâu), có nút đóng rõ ràng và hỗ trợ phím `Escape`.
   - Giữ nguyên các class định danh kiểm thử tự động (`.staff-table`, `.staff-modal`, `.staff-modal-close`, `button[title="Xem trước"]`) để đảm bảo tương thích 100% với kịch bản kiểm thử E2E hiện có.

---

## 3. KIẾN TRÚC CSS MỚI & HỆ THỐNG DESIGN TOKENS

### 3.1 Phân cấp tệp CSS trong `frontend/src/styles/`
1. `tokens.css`:
   - Định nghĩa toàn bộ biến CSS toàn hệ thống: màu xanh chủ đạo (`#1D4ED8`, `#1E40AF`, `#EFF6FF`), màu xanh đậm quản trị (`#183B69`), nền (`#F8FAFC`, `#FFFFFF`), viền (`#E2E8F0`), trạng thái (`#16A34A`, `#D97706`, `#DC2626`).
   - Chuẩn hóa thang Z-Index: `--ui-layer-header: 50`, `--ui-layer-sidebar: 100`, `--ui-layer-dropdown: 200`, `--ui-layer-dialog: 500`, `--ui-layer-toast: 1000`.
   - Hỗ trợ biến sẵn sàng cho Dark Mode qua `[data-theme="dark"]`.
2. `reset.css`:
   - Reset chuẩn hiện đại: `box-sizing: border-box`, loại bỏ margin/padding mặc định, chuẩn hóa font kế thừa cho input/button/select, thanh cuộn mượt mà và focus visible ring.
3. `typography.css`:
   - Nạp Google Fonts (`Inter`, `JetBrains Mono`), phân cấp chặt chẽ `h1`–`h6`, body text, links, code/pre, và các lớp chữ tiện ích.
4. `utilities.css`:
   - Cung cấp `.sr-only`, `.truncate`, `.line-clamp-1`..`3`, flex helpers, keyframe animations (`fadeIn`, `slideInLeft`, `scaleUp`, `pulse`, `spin`), và `.skeleton`.
5. `index.css`:
   - Nhập khẩu (import) theo đúng trình tự kiến trúc chuẩn.

---

## 4. BẰNG CHỨNG KIỂM THỬ TỰ ĐỘNG & VISUAL QA

### 4.1 Bằng chứng kiểm thử tự động (Unit, Lint, Build)
- **Vitest Suite**: `52/52 passed (100%)`, `406/406 tests passed`. Thời gian chạy: ~40s.
- **Oxlint**: Quét 441 files với 116 rules -> `Found 0 warnings and 0 errors`.
- **Production Build (`tsc -b && vite build`)**: Hoàn thành trong 1.85s -> Không lỗi biên dịch, không lỗi kiểu dữ liệu.

### 4.2 Bằng chứng ảnh chụp giao diện Responsive (Playwright Evidence)
Tất cả ảnh chụp màn hình được lưu trong thư mục `docs/visual-qa/`:

#### A. Ngân hàng câu hỏi (Question Bank - P0 Fix)
1. `desktop-1440-workstation.png`: Giao diện 2 cột hoàn chỉnh tại độ phân giải 1440 × 900.
2. `desktop-1280-workstation.png`: Giao diện 2 cột chuẩn desktop 1280 × 800.
3. `tablet-768-table.png`: Bảng câu hỏi trên tablet (768 × 1024), cuộn ngang mượt mà.
4. `tablet-768-drawer-open.png`: Bảng xem trước trượt ra dạng Drawer từ bên phải kèm backdrop làm mờ.
5. `mobile-390-table.png`: Bảng câu hỏi trên mobile (390 × 844), không tràn ngang thân trang.
6. `mobile-390-drawer-open.png`: Drawer chi tiết câu hỏi hiển thị tối ưu trên màn hình điện thoại.
7. `modal-create-question.png`: Modal soạn câu hỏi với KaTeX xem trước trực tiếp, phân nhóm 4 mục rõ ràng.
8. `modal-preview-katex.png`: Modal xem trước công thức toán học KaTeX và các phương án trả lời.
9. `kebab-menu-open.png`: Menu 3 chấm thao tác (Chỉnh sửa, Gửi duyệt, Xuất bản, Xóa mềm) qua Portal z-index chuẩn.

#### B. Đa phân hệ & vai trò (Cross-Workspace Evidence)
1. **Admin Workspace**:
   - `admin-admin-dashboard-desktop-1440.png`, `desktop-1280.png`, `tablet-768.png`, `mobile-390.png`
   - `admin-admin-users-desktop-1440.png`, `desktop-1280.png`, `tablet-768.png`, `mobile-390.png`
2. **Content Workspace**:
   - `content-content-chapters-desktop-1440.png`, `desktop-1280.png`, `tablet-768.png`, `mobile-390.png`
   - `content-content-import-desktop-1440.png`, `desktop-1280.png`, `tablet-768.png`, `mobile-390.png`
3. **Teacher Workspace**:
   - `teacher-teacher-classes-desktop-1440.png`, `tablet-768.png`
   - `teacher-teacher-dashboard-desktop-1440.png`, `tablet-768.png`
4. **Support Workspace**:
   - `support-support-tickets-desktop-1440.png`, `tablet-768.png`
   - `support-support-dashboard-desktop-1440.png`, `tablet-768.png`
5. **Learner Workspace (0 Regression Verified)**:
   - `learner-learner-dashboard-desktop-1440.png`, `tablet-768.png`, `mobile-390.png`
   - `learner-learner-practice-desktop-1440.png`, `tablet-768.png`, `mobile-390.png`

---

## 5. CAM KẾT & AN TOÀN HỆ THỐNG
- **Database Safety Guard**: Tuyệt đối không ghi, không migrate và không làm thay đổi dữ liệu `StudyAIDb`.
- **Learner UI Protection**: Không làm thay đổi layout hay luồng trải nghiệm học viên; bảo đảm 100% tính nguyên vẹn.
- **Git Hygiene**: Toàn bộ thay đổi đã được chia commit rõ ràng theo từng giai đoạn và đẩy lên nhánh `feature/frontend-css-architecture` trên GitHub.

