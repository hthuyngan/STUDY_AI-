# BÁO CÁO CẢI TỔ GIAO DIỆN FRONTEND: CHỈ SỬ DỤNG LIGHT MODE & DỌN DẸP SIDEBAR

- **Dự án:** STUDY_AI- (Hệ thống học tập thông minh & Trợ lý AI)
- **Repository:** `https://github.com/hthuyngan/STUDY_AI-`
- **Nhánh thực hiện:** `feature/backend-redesign-modular-monolith`
- **Ngày hoàn thành:** 22/11/2026
- **Công nghệ:** React 19, TypeScript, Vite, Bun, Vanilla CSS Design System

---

## 1. TỔNG QUAN YÊU CẦU & KẾT QUẢ ĐẠT ĐƯỢC

Nhằm chuẩn hóa giao diện người dùng cho đồ án tốt nghiệp đại học, giảm bớt sự rườm rà, đảm bảo sự đồng nhất và chuyên nghiệp trên toàn bộ các phân hệ (Học viên, Giáo viên, Quản trị viên, Quản lý nội dung), toàn bộ hệ thống đã được tái cấu trúc UI theo 7 tiêu chí cốt lõi:

1. **Khóa cứng Light Mode duy nhất:** Loại bỏ hoàn toàn Dark Mode, nút chuyển theme mặt trăng/mặt trời, `localStorage` key `study_ai_theme`, và toàn bộ token override dark mode.
2. **Loại bỏ nút thu gọn Sidebar trên Desktop:** Sidebar luôn mở rộng cố định (~240px đối với Main Shell, ~256px đối với Workspace Shell), hiển thị rõ ràng logo, tên ứng dụng `STUDY AI` và nhãn phân hệ. Không còn nút thu gọn cạnh logo, không còn phím tắt Ctrl+B thu gọn màn hình trên desktop.
3. **Loại bỏ khối thông tin người dùng cuối Sidebar:** Xóa toàn bộ card thông tin khách/học viên nằm cuối Sidebar để tránh khoảng trống thừa và trùng lặp thông tin; toàn bộ điều hướng tài khoản, đăng nhập/đăng ký đã được tích hợp tập trung, tinh gọn trên Topbar.
4. **Đồng bộ hóa các Workspace Quản trị:** Áp dụng thiết kế thống nhất cho `WorkspaceShell` và `WorkspaceSidebar` của các vai trò Admin, Teacher, Content; giữ nguyên tính năng Quick Workspace Switcher và nút "Quay lại học viên" tại footer.
5. **Bảo toàn Mobile Drawer:** Trên màn hình di động ($\le 768\text{px}$), menu điều hướng tự động chuyển thành drawer dạng trượt (off-canvas) kèm backdrop mờ và nút đóng trực quan.
6. **Không gây phá vỡ luồng nghiệp vụ & bảo vệ an toàn CSDL:** 100% route, API contract, các chức năng authenticated và cơ sở dữ liệu `StudyAIDb` được giữ nguyên vẹn an toàn.
7. **Vượt qua toàn bộ Test Gates:** 0 lỗi linting, 79/79 test files (545/545 tests) PASS, biên dịch production `tsc -b && vite build` thành công.

---

## 2. CHI TIẾT CÁC BƯỚC TRIỂN KHAI

### Phase 1 — Xóa hoàn toàn Dark Mode (Light Mode Only)

- **`frontend/index.html`:** Thêm thuộc tính `data-theme="light"` trực tiếp vào thẻ `<html>` gốc để tránh giật lag màu sắc (FOUC) trước khi JS load.
- **`frontend/src/main.tsx`:** Thiết lập `document.documentElement.setAttribute('data-theme', 'light')` ngay khi khởi tạo ứng dụng; dọn dẹp các key `localStorage` cũ (`study_ai_theme`, `study_ai_sidebar_collapsed`, `study_ai_workspace_sidebar_collapsed`).
- **`frontend/src/services/supporting.service.ts`:** Khóa cứng `data-theme="light"` trong `initSupportingServices()` và xóa key theme cũ khỏi bộ nhớ.
- **`frontend/src/components/layout/Topbar.tsx`:** Loại bỏ icon `Moon`, `Sun`, bỏ `theme` state, bỏ hàm `toggleTheme()` và nút `IconButton` đổi theme.
- **`frontend/src/pages/Settings/SettingsPage.tsx`:** Xóa section chuyển đổi giao diện (Sáng / Tối / Tự động).
- **CSS Tokens & Stylesheets:**
  - `frontend/src/styles/tokens.css`: Xóa bỏ toàn bộ khối `[data-theme="dark"]` overrides (hơn 40 dòng token màu tối).
  - `frontend/src/styles/components.css`: Xóa các selector `[data-theme="dark"]` cho button, card, input, progress bar.
  - `frontend/src/styles/reset.css`: Xóa thanh cuộn dark scrollbar.
  - `frontend/src/styles/layout.css`: Xóa toàn bộ quy tắc CSS dark mode của topbar, search, admin button, active links.

### Phase 2 — Xóa nút thu gọn Sidebar trên Desktop

- **`frontend/src/components/layout/Sidebar.tsx`:**
  - Xóa nút thu gọn (`ChevronLeft`, `ChevronRight`).
  - Phần header luôn cố định hiển thị: Logo `GraduationCap` (Navy Seal `#102a43`), Tiêu đề `STUDY AI` và huy hiệu `PRO`.
  - Danh mục nhóm điều hướng luôn hiển thị nhãn nhóm đầy đủ (`MENU CHÍNH`, `LUYỆN TẬP`).
- **`frontend/src/components/layout/AppShell.tsx`:**
  - Xóa `collapsed` state, xóa hàm `toggleCollapse`.
  - Xóa sự kiện lắng nghe phím tắt `Ctrl+B` / `Cmd+B`.
  - Xóa class `.sidebar-collapsed` khỏi thẻ `<main className="app-main">`.
- **`frontend/src/components/layout/SidebarItem.tsx`:**
  - Xóa thuộc tính `collapsed`, nhãn menu `sidebar-nav-label` luôn luôn hiển thị trực quan.
  - Gắn `aria-hidden="true"` vào huy hiệu số đếm để bảo đảm tính trợ năng và khớp chính xác truy vấn test.

### Phase 3 — Xóa khối thông tin người dùng cuối Sidebar

- **`frontend/src/components/layout/Sidebar.tsx`:**
  - Xóa bỏ hoàn toàn khối `<div className="sidebar-footer">`.
  - Không còn hiển thị card tài khoản người dùng "Khách" hoặc thông tin đăng nhập lặp lại ở chân sidebar.
  - Menu điều hướng trải dài tự nhiên với `flex: 1` mà không có khoảng trống vô nghĩa bên dưới.
- **`frontend/src/styles/layout.css`:**
  - Xóa bỏ các class CSS liên quan: `.sidebar-footer`, `.sidebar-user-card`, `.sidebar-user-avatar-guest`, `.sidebar-user-info`, `.sidebar-user-name`, `.sidebar-user-grade`.
  - Giữ lại đầy đủ menu tài khoản và nút đăng nhập/đăng ký chuyên nghiệp trên `Topbar.tsx`.

### Phase 4 — Đồng bộ Workspace (Admin, Teacher, Content)

- **`frontend/src/components/layout/WorkspaceShell.tsx`:**
  - Xóa nút thu gọn `workspace-desktop-collapse-btn` cạnh breadcrumb.
  - Xóa `collapsed` state, phím tắt `Ctrl+B`, và class `.sidebar-collapsed` trên `.workspace-main`.
- **`frontend/src/components/layout/WorkspaceSidebar.tsx`:**
  - Sidebar luôn ở trạng thái `expanded` cố định trên desktop.
  - Xóa nút thu gọn ở chân trang sidebar.
  - Giữ nguyên thành phần quan trọng: Thanh tìm kiếm nhanh menu (`sidebar-search-box`), bộ chuyển đổi nhanh workspace (`sidebar-workspace-switcher`) và nút "Quay lại học viên" (`workspace-sidebar-back-link`).
- **`frontend/src/components/layout/WorkspaceShell.css`:**
  - Dọn dẹp hơn 110 dòng CSS thừa liên quan đến tooltip khi thu gọn (`.sidebar-collapsed-tooltip`), margin collapsed và các rule `.workspace-sidebar.collapsed`.

### Phase 5 — Tối ưu giao diện & Responsive Breakpoints

| Màn hình | Chiều rộng | Hành vi Sidebar Main / Workspace | Trạng thái Topbar |
| :--- | :--- | :--- | :--- |
| **Mobile** | $375\text{px} - 640\text{px}$ | Drawer ẩn ngoài màn hình (Off-canvas), mở khi bấm hamburger | Rút gọn search, avatar menu đầy đủ |
| **Tablet** | $768\text{px} - 1023\text{px}$ | Drawer ẩn ngoài màn hình, mở mượt mà kèm backdrop tối | Rút gọn breadcrumb, hiển thị các nút thao tác chính |
| **Laptop / Desktop** | $1024\text{px} - 1920\text{px}$ | Cố định mở rộng (~240px / 256px), không thể thu gọn | Đầy đủ logo, breadcrumb, 9-dot launcher, user menu |

---

## 3. KẾT QUẢ KIỂM THỬ (TEST GATES)

Tất cả các cổng kiểm định mã nguồn frontend đã được thực thi và xác minh nghiêm ngặt:

### 1. Linting & Static Analysis
```bash
$ cd frontend && bun run lint
$ oxlint --deny-warnings
Found 0 warnings and 0 errors.
Finished in 361ms on 487 files with 115 rules using 8 threads.
```
$\rightarrow$ **PASS** (0 warnings, 0 errors).

### 2. Frontend Test Suite (Vitest)
```bash
$ cd frontend && bun run test
 RUN  v5.0.5 D:/TN/frontend

 Test Files  79 passed (79)
      Tests  545 passed (545)
   Duration  56.67s
```
$\rightarrow$ **PASS** (100% - 79/79 test files, 545/545 unit & integration tests).

Các bài test kiểm thử đặc thù đã được bổ sung & cập nhật:
- `Topbar.test.tsx`: Bổ sung kiểm thử khẳng định nút chuyển theme sáng/tối không còn tồn tại trên giao diện.
- `WorkspaceShell.test.tsx`: Cập nhật kiểm thử đảm bảo sidebar luôn giữ class `expanded`, không có nút thu gọn và không bị thu gọn khi nhấn `Ctrl+B`.
- `moodleWorkspaceRedesign.test.tsx`: Xác nhận `Sidebar` học viên luôn mở rộng cố định trên desktop và hỗ trợ drawer dạng trượt trên thiết bị di động.

### 3. Production Build Compilation
```bash
$ cd frontend && bun run build
$ tsc -b && vite build
vite v8.3.2 building client environment for production...
✓ 2861 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 2.48s
```
$\rightarrow$ **PASS** (Không có lỗi TypeScript hay xung đột bundling).

---

## 4. BẢNG THỐNG KÊ TẬP TIN THAY ĐỔI

| Tập tin | Loại thay đổi | Mô tả |
| :--- | :---: | :--- |
| `frontend/index.html` | Cập nhật | Thiết lập `data-theme="light"` cố định cho thẻ `<html>` |
| `frontend/src/main.tsx` | Cập nhật | Enforce `data-theme="light"`, dọn dẹp localStorage key cũ |
| `frontend/src/services/supporting.service.ts` | Cập nhật | Đồng bộ khởi tạo light theme và xóa bỏ key theme cũ |
| `frontend/src/styles/tokens.css` | Tinh gọn | Xóa bỏ toàn bộ token override `[data-theme="dark"]` |
| `frontend/src/styles/components.css` | Tinh gọn | Xóa bỏ style dark mode của buttons, cards, inputs |
| `frontend/src/styles/reset.css` | Tinh gọn | Xóa thanh cuộn dark scrollbar |
| `frontend/src/styles/layout.css` | Tinh gọn | Xóa CSS `.sidebar.collapsed`, nút thu gọn và `.sidebar-footer` |
| `frontend/src/components/layout/Topbar.tsx` | Cập nhật | Xóa nút chuyển theme, Moon/Sun icons, theme state |
| `frontend/src/components/layout/Topbar.test.tsx` | Cập nhật | Thêm test case xác nhận không có nút đổi giao diện tối |
| `frontend/src/pages/Settings/SettingsPage.tsx` | Cập nhật | Loại bỏ cài đặt theme (Sáng / Tối) trong trang Cài đặt |
| `frontend/src/components/layout/Sidebar.tsx` | Cập nhật | Xóa nút thu gọn, xóa card user ở footer, chuẩn hóa logo |
| `frontend/src/components/layout/SidebarItem.tsx` | Cập nhật | Xóa prop `collapsed`, luôn hiển thị nhãn menu và icon |
| `frontend/src/components/layout/AppShell.tsx` | Cập nhật | Xóa `collapsed` state và phím tắt `Ctrl+B` |
| `frontend/src/components/layout/WorkspaceShell.tsx` | Cập nhật | Xóa nút thu gọn desktop và phím tắt `Ctrl+B` |
| `frontend/src/components/layout/WorkspaceSidebar.tsx` | Cập nhật | Luôn mở rộng cố định, xóa nút thu gọn, giữ switcher & back |
| `frontend/src/components/layout/WorkspaceShell.css` | Tinh gọn | Xóa bỏ các style cho trạng thái thu gọn và tooltip |
| `frontend/src/components/layout/WorkspaceShell.test.tsx` | Cập nhật | Cập nhật assertions cho desktop sidebar luôn expanded |
| `frontend/src/test/moodleWorkspaceRedesign.test.tsx` | Cập nhật | Cập nhật test sidebar cố định và drawer di động |

**Tổng dung lượng code tối ưu:** Giảm hơn 730 dòng mã lệnh trùng lặp và không còn sử dụng.
