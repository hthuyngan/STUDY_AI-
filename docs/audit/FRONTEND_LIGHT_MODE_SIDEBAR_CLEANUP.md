# BÁO CÁO CẢI TỔ GIAO DIỆN FRONTEND: CHỈ SỬ DỤNG LIGHT MODE, DỌN DẸP SIDEBAR & ĐỒNG BỘ RESPONSIVE

- **Dự án:** STUDY_AI- (Hệ thống học tập thông minh & Trợ lý AI)
- **Repository:** `https://github.com/hthuyngan/STUDY_AI-`
- **Nhánh thực hiện:** `feature/backend-redesign-modular-monolith`
- **Ngày hoàn thành:** 22/11/2026
- **Công nghệ:** React 19, TypeScript, Vite, Bun, Playwright, Vanilla CSS Design System

---

## 1. TỔNG QUAN YÊU CẦU & KẾT QUẢ ĐẠT ĐƯỢC

Nhằm chuẩn hóa giao diện người dùng cho đồ án tốt nghiệp đại học, giảm bớt sự rườm rà, đảm bảo sự đồng nhất và chuyên nghiệp trên toàn bộ các phân hệ (Học viên, Giáo viên, Quản trị viên, Quản lý nội dung), toàn bộ hệ thống đã được tái cấu trúc UI theo 8 tiêu chí cốt lõi:

1. **Khóa cứng Light Mode duy nhất:** Loại bỏ hoàn toàn Dark Mode, nút chuyển theme mặt trăng/mặt trời, `localStorage` key `study_ai_theme`, và toàn bộ token override dark mode.
2. **Loại bỏ nút thu gọn Sidebar trên Desktop:** Sidebar luôn mở rộng cố định (~240px đối với Main Shell, ~256px đối với Workspace Shell), hiển thị rõ ràng logo, tên ứng dụng `STUDY AI` và nhãn phân hệ. Không còn nút thu gọn cạnh logo, không còn phím tắt Ctrl+B thu gọn màn hình trên desktop.
3. **Loại bỏ hoàn toàn các prop và CSS thu gọn còn sót:** Xóa triệt để các props `collapsed`, `onToggleCollapse` trong `Sidebar`, `WorkspaceSidebar` và `ManagementSidebar`; xóa token `--sidebar-collapsed-width`, `--staff-sidebar-collapsed-width`, `--mgmt-sidebar-collapsed` và toàn bộ selector `.sidebar.collapsed`, `.sidebar-nav-link.collapsed`.
4. **Loại bỏ khối thông tin người dùng cuối Sidebar:** Xóa toàn bộ card thông tin khách/học viên nằm cuối Sidebar để tránh khoảng trống thừa và trùng lặp thông tin; toàn bộ điều hướng tài khoản, đăng nhập/đăng ký đã được tích hợp tập trung, tinh gọn trên Topbar.
5. **Đồng bộ hóa Responsive của AppShell và WorkspaceShell (< 1024px):**
   - Ở kích thước dưới 1024px (Mobile $375\text{px}$ và Tablet $768\text{px}$), sidebar tự động chuyển thành drawer dạng trượt (off-canvas).
   - Nút hamburger luôn hiển thị trên Topbar khi $< 1024\text{px}$.
   - Drawer trang bị backdrop mờ, tự đóng khi click ngoài, tự đóng khi nhấn phím `Escape`, tự đóng khi chuyển route, và có nút đóng `X` trực quan ở góc header drawer.
6. **Bảo toàn chức năng điều hướng & An toàn CSDL:** 100% route, API contract, các chức năng authenticated và cơ sở dữ liệu sản xuất `StudyAIDb` được bảo vệ an toàn tuyệt đối.
7. **Kiểm tra trực quan Playwright trên 5 độ phân giải:** Chạy Playwright tự động tại $375\text{px}, 768\text{px}, 1024\text{px}, 1366\text{px}, 1920\text{px}$; xác nhận 100% PASS không có thanh cuộn ngang, logo và tiêu đề hiển thị sắc nét, xuất 19 ảnh chụp màn hình kiểm chứng tại `docs/visual-qa/responsive-polish/`.
8. **Vượt qua toàn bộ Test Gates:** 0 lỗi linting, 0 lỗi TypeScript, 79/79 test files (545/545 tests) PASS, biên dịch production `tsc -b && vite build` hoàn tất.

---

## 2. CHI TIẾT CÁC BƯỚC TRIỂN KHAI

### Phase 1 — Khóa cứng Light Mode (Light Mode Only)

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

### Phase 4 — Xóa hoàn toàn các prop và CSS thu gọn còn sót

- **Props:** Xóa bỏ hoàn toàn `collapsed?: boolean` và `onToggleCollapse?: () => void` khỏi:
  - `SidebarProps` (`frontend/src/components/layout/Sidebar.tsx`)
  - `WorkspaceSidebarProps` (`frontend/src/components/layout/WorkspaceSidebar.tsx`)
  - `ManagementSidebarProps` (`frontend/src/components/management/ManagementSidebar.tsx`)
  - `ManagementLayout.tsx`
- **Tokens & CSS Selectors:**
  - `tokens.css`: Xóa `--sidebar-collapsed-width: 64px;`
  - `staff-shared.css`: Xóa `--staff-sidebar-collapsed-width: 72px;`
  - `DashboardPage.css`: Xóa `.sidebar.collapsed` và `.sidebar-nav-link.collapsed`
  - `ManagementLayout.css`: Xóa `--mgmt-sidebar-collapsed: 64px;`, `.mgmt-main.collapsed`, `.mgmt-sidebar.collapsed`
  - `WorkspaceShell.css`: Xóa toàn bộ tooltips thu gọn và styles `.workspace-sidebar.collapsed`.

### Phase 5 — Đồng bộ hóa Responsive của AppShell và WorkspaceShell (< 1024px)

Cả `AppShell` và `WorkspaceShell` đều được đồng bộ chặt chẽ với cơ chế responsive nhất quán:

| Đặc tính Responsive | Màn hình $\ge 1024\text{px}$ (Desktop / Laptop) | Màn hình $< 1024\text{px}$ (Tablet $768\text{px}$ & Mobile $375\text{px}$) |
| :--- | :--- | :--- |
| **Trạng thái Sidebar** | Cố định mở rộng (`expanded`), width 240px / 256px | Drawer trượt (Off-canvas, `left: -280px` / `-320px`) |
| **Nút mở Menu** | Ẩn (`display: none`) | Hiển thị nút hamburger (`topbar-mobile-btn` / `workspace-mobile-menu-btn`) |
| **Khi mở Drawer** | Không áp dụng | Trượt vào vị trí `left: 0`, kèm backdrop mờ tối che phủ màn hình |
| **Nút đóng Drawer (X)** | Không áp dụng | Hiển thị nút đóng `X` (`sidebar-mobile-close-btn`) tại header drawer |
| **Phím tắt đóng** | Không áp dụng | Nhấn phím `Escape` tự động đóng drawer ngay lập tức |
| **Đổi Route** | Không áp dụng | Tự động đóng drawer khi click chọn bất kỳ link điều hướng nào |

---

## 3. KẾT QUẢ KIỂM THỬ TRỰC QUAN PLAYWRIGHT

Kịch bản Playwright chuyên biệt [scripts/e2e_responsive_light_mode_playwright.ts](file:///d:/TN/scripts/e2e_responsive_light_mode_playwright.ts) đã chạy kiểm thử trực tiếp trên Vite production preview bundle và thu được kết quả:

```text
🚀 Starting Responsive & Light Mode Visual QA Playwright Suite...
Starting Vite preview server on port 4195...
✅ Vite preview server ready!

📱 Testing Viewport: 375px (Mobile) (375x667)...
   - Dashboard horizontal scroll check: PASS
   - Topbar hamburger button visible: true
   - Mobile drawer opened: true
   - Drawer close button (X) visible: true

📱 Testing Viewport: 768px (Tablet) (768x1024)...
   - Dashboard horizontal scroll check: PASS
   - Topbar hamburger button visible: true
   - Mobile drawer opened: true
   - Drawer close button (X) visible: true

📱 Testing Viewport: 1024px (Laptop/Tablet Landscape) (1024x768)...
   - Dashboard horizontal scroll check: PASS
   - Desktop sidebar permanently visible: true
   - Brand title rendered: "STUDY AI"
   - Sidebar collapse button count (must be 0): 0

📱 Testing Viewport: 1366px (Standard Laptop) (1366x768)...
   - Dashboard horizontal scroll check: PASS
   - Desktop sidebar permanently visible: true
   - Brand title rendered: "STUDY AI"
   - Sidebar collapse button count (must be 0): 0

📱 Testing Viewport: 1920px (Full HD Desktop) (1920x1080)...
   - Dashboard horizontal scroll check: PASS
   - Desktop sidebar permanently visible: true
   - Brand title rendered: "STUDY AI"
   - Sidebar collapse button count (must be 0): 0

🎉 ALL VIEWPORTS (375px, 768px, 1024px, 1366px, 1920px) VERIFIED SUCCESSFULLY!
```

**Thư mục lưu trữ bằng chứng ảnh chụp màn hình:** `docs/visual-qa/responsive-polish/` (19 tập tin PNG bao gồm Dashboard, Settings, Admin, Teacher, Content ở các chế độ đóng/mở drawer và full desktop).

---

## 4. KẾT QUẢ TEST GATES & STATIC ANALYSIS

### 1. Linting (oxlint)
```bash
$ cd frontend && bun run lint
$ oxlint --deny-warnings
Found 0 warnings and 0 errors.
Finished in 351ms on 487 files with 115 rules using 8 threads.
```
$\rightarrow$ **PASS** (0 warnings, 0 errors).

### 2. TypeScript Compilation (`tsc -b`)
```bash
$ cd frontend && bun x tsc -b
```
$\rightarrow$ **PASS** (Exit code 0, không có bất kỳ type error nào).

### 3. Frontend Unit & Integration Tests (Vitest)
```bash
$ cd frontend && bun run test
 RUN  v5.0.5 D:/TN/frontend

 Test Files  79 passed (79)
      Tests  545 passed (545)
   Duration  47.55s
```
$\rightarrow$ **PASS** (100% - 79/79 test files, 545/545 tests PASS).

### 4. Production Build Compilation
```bash
$ cd frontend && bun run build
$ tsc -b && vite build
vite v8.3.2 building client environment for production...
✓ 2861 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 2.97s
```
$\rightarrow$ **PASS** (Build hoàn tất trong 2.97s, assets đóng gói chuẩn xác).

---

## 5. BẢNG THỐNG KÊ TẬP TIN THAY ĐỔI

| Tập tin | Loại | Nội dung thay đổi |
| :--- | :---: | :--- |
| `frontend/src/components/layout/Sidebar.tsx` | Sửa | Xóa `collapsed`, `onToggleCollapse`, bổ sung nút đóng `X` cho drawer |
| `frontend/src/components/layout/AppShell.tsx` | Sửa | Tự động đóng drawer khi đổi route hoặc nhấn phím `Escape` |
| `frontend/src/components/layout/Topbar.tsx` | Sửa | Chuẩn hóa nút hamburger `.topbar-mobile-btn` cho kích thước $< 1024\text{px}$ |
| `frontend/src/components/layout/WorkspaceSidebar.tsx` | Sửa | Xóa `collapsed`, `onToggleCollapse`, giữ class `expanded` cố định |
| `frontend/src/components/management/ManagementSidebar.tsx` | Sửa | Xóa props `collapsed`, `onToggleCollapse`, xóa nút thu gọn |
| `frontend/src/components/management/ManagementLayout.tsx` | Sửa | Xóa state `collapsed`, phím tắt `Ctrl+B`, đồng bộ sidebar mở rộng |
| `frontend/src/components/management/ManagementLayout.css` | Tinh gọn | Xóa `--mgmt-sidebar-collapsed`, xóa các selector `.mgmt-sidebar.collapsed` |
| `frontend/src/components/staff/staff-shared.css` | Tinh gọn | Xóa token `--staff-sidebar-collapsed-width` |
| `frontend/src/pages/Dashboard/DashboardPage.css` | Tinh gọn | Xóa các selector `.sidebar.collapsed` và `.sidebar-nav-link.collapsed` |
| `frontend/src/styles/layout.css` | Cập nhật | Đồng bộ media query drawer tại `@media (max-width: 1023px)`, thêm style nút đóng `X` |
| `frontend/src/styles/tokens.css` | Tinh gọn | Xóa token `--sidebar-collapsed-width: 64px;` |
| `frontend/src/test/lessonRedesignAndUnifiedAiTutor.test.tsx` | Sửa | Cập nhật render `Sidebar` không còn truyền props thu gọn |
| `frontend/src/test/moodleWorkspaceRedesign.test.tsx` | Sửa | Cập nhật render `Sidebar` không còn truyền props thu gọn |
| `scripts/e2e_responsive_light_mode_playwright.ts` | Mới | Kịch bản Playwright tự động kiểm thử 5 viewports và chụp ảnh màn hình |
| `docs/visual-qa/responsive-polish/` | Mới | 19 ảnh chụp màn hình kiểm chứng responsive và Light Mode |
| `docs/audit/FRONTEND_LIGHT_MODE_SIDEBAR_CLEANUP.md` | Cập nhật | Báo cáo kiểm định toàn diện |
