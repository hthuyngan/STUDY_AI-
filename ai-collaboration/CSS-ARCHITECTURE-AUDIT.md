# BÁO CÁO KIỂM KÊ KIẾN TRÚC CSS TOÀN HỆ THỐNG (CSS ARCHITECTURE AUDIT)
## STUDY_AI Frontend CSS Standardization & Stability

**Ngày thực hiện:** 15/11/2026  
**Workspace:** `D:\TN`  
**Repository:** `https://github.com/hthuyngan/STUDY_AI-`  
**Branch:** `feature/frontend-css-architecture`  
**Draft PR:** [#9](https://github.com/hthuyngan/STUDY_AI-/pull/9)  

---

## 1. TỔNG QUAN HIỆN TRẠNG PIPELINE & DEPENDENCIES

### 1.1. Build Tooling & Runtime Dependencies (`frontend/package.json`)
```json
"dependencies": {
  "katex": "^0.19.1",
  "lucide-react": "^1.59.0",
  "react": "^19.2.8",
  "react-dom": "^19.2.8",
  "react-router-dom": "^7.18.4",
  "recharts": "^3.10.1"
},
"devDependencies": {
  "@testing-library/jest-dom": "^7.0.1",
  "@testing-library/react": "^16.3.3",
  "@testing-library/user-event": "^14.6.8",
  "@types/katex": "^0.16.8",
  "@types/node": "^24.13.3",
  "@types/react": "^19.2.18",
  "@types/react-dom": "^19.2.7",
  "@vitejs/plugin-react": "^6.1.1",
  "happy-dom": "^21.0.3",
  "jsdom": "^30.1.3",
  "oxlint": "^1.81.0",
  "typescript": "~6.0.2",
  "vite": "^8.3.0",
  "vitest": "^5.0.5"
}
```

> **XÁC MINH CỐT LÕI:**
> Dự án **KHÔNG CÓ** `tailwindcss`, `postcss`, `autoprefixer`, hay bất kỳ CSS preprocessor nào (Sass/Less).
> Vite chỉ kích hoạt `@vitejs/plugin-react` và biên dịch CSS thuần (`.css` và `.module.css`).

---

## 2. DANH MỤC LỖI CSS TOÀN HỆ THỐNG

### Lỗi P0 (Nghiêm trọng nhất — Vỡ giao diện trực tiếp)
| Mã lỗi | Vị trí | Hiện tượng & Nguyên nhân gốc | Mức độ & Tác động | Hướng xử lý |
| :--- | :--- | :--- | :--- | :--- |
| **CSS-P0-01** | `frontend/src/features/question-bank/` (`ModernQuestionBankPage.tsx`, `QuestionTable.tsx`, `QuestionFilters.tsx`, `QuestionPreviewPanel.tsx`, `QuestionFormModal.tsx`, `QuestionRejectModal.tsx`, `QuestionDeleteModal.tsx`) | **Lạm dụng class Tailwind tiện ích không biên dịch được:** Toàn bộ component sử dụng hàng trăm class như `flex`, `flex-col`, `lg:flex-row`, `fixed`, `inset-0`, `z-50`, `bg-[#F8FAFC]`, `w-full`, `min-w-0`, `text-slate-800`. Do không có Tailwind trong pipeline, các class này là chuỗi rỗng không có CSS, dẫn tới bảng dính chữ, preview panel tụt xuống dưới bảng, modal dialog không căn giữa màn hình, mất backdrop và tràn viền ngang. | **P0 (Khẩn cấp)** — Vỡ toàn bộ tính năng Ngân hàng câu hỏi của vai trò Content. | Viết stylesheet scoped / CSS Module chuẩn hóa riêng `QuestionBank.module.css` quản lý toàn bộ bố cục, table, filter, preview drawer, modal dialogs với CSS thuần chuẩn mực. |
| **CSS-P0-02** | `QuestionPreviewPanel.tsx` | Thiếu layout flex/grid cho desktop khiến panel xuất hiện bên dưới bảng thay vì ở cột bên phải. | **P0** | Cấu hình bố cục Workstation 2 cột cố định: Main table (flex: 1) + Preview Panel (width: 440px sticky) trên màn hình >= 1024px. Trên màn hình nhỏ chuyển thành Drawer overlay trượt từ phải sang. |
| **CSS-P0-03** | `QuestionFormModal.tsx`, `QuestionRejectModal.tsx`, `QuestionDeleteModal.tsx` | Sử dụng `fixed inset-0 z-50 flex items-center justify-center` không được biên dịch, khiến modal xuất hiện như phần tử tĩnh ở đáy trang thay vì popup modal overlay. | **P0** | Chuyển toàn bộ modal sang hệ thống dialog có backdrop cố định (`position: fixed; inset: 0; z-index: var(--ui-layer-dialog); background: rgba(15,23,42,0.45)`), khóa cuộn trang và căn giữa hoàn hảo. |

---

### Lỗi P1 (Xung đột kiến trúc & Rủi ro rò rỉ style)
| Mã lỗi | Vị trí | Hiện tượng & Nguyên nhân gốc | Hướng xử lý |
| :--- | :--- | :--- | :--- |
| **CSS-P1-01** | `frontend/src/index.css` & `frontend/src/components/staff/staff-shared.css` | Tồn tại song song nhiều bộ biến màu và layout: `--color-primary`, `--brand-600`, `--staff-navy-primary`, `--mgmt-primary`. Thiếu ánh xạ chuẩn về `tokens.css`. | Ánh xạ tất cả biến legacy về `tokens.css` (`--ui-color-primary`, `--ui-color-surface`, v.v.). |
| **CSS-P1-02** | `AdminComponents.css`, `AdminPages.css`, `TeacherPages.css`, `ContentPages.css` | Lạm dụng selector rộng (như `table`, `th`, `td`, `button`) có nguy cơ làm ảnh hưởng chéo đến giao diện của Learner. | Cô lập bằng namespace wrapper hoặc CSS Modules (`.mgmt-*`, `.content-ws-*`). |
| **CSS-P1-03** | `tokens.css` | `tokens.css` mới chỉ khai báo biến cơ bản, chưa có `reset.css`, `typography.css`, `utilities.css`. | Chuẩn hóa cấu trúc thư mục `frontend/src/styles/` theo chuẩn Phase 3. |

---

### Lỗi P2 (Trải nghiệm người dùng & Responsive)
| Mã lỗi | Vị trí | Hiện tượng & Nguyên nhân gốc | Hướng xử lý |
| :--- | :--- | :--- | :--- |
| **CSS-P2-01** | `QuestionFilters.tsx` | Một số thẻ dùng inline styles kết hợp với các class không có hiệu lực, dẫn đến responsive co cụm tại 390px và 768px. | Chuyển thành CSS Module có media query rõ ràng tại 1440px, 1280px, 768px, 390px. |
| **CSS-P2-02** | `QuestionTable.tsx` Kebab Menu | Menu 3 chấm tính tọa độ `getBoundingClientRect` nhưng thiếu `z-index` và `border` chuẩn dẫn đến bị che mờ hoặc lệch hàng. | Đưa menu vào portal với z-index cao (`--ui-layer-dropdown: 200`), viền và đổ bóng rõ ràng. |

---

## 3. DANH SÁCH 74 FILES CSS ĐÃ KIỂM KÊ

1. `frontend/src/index.css` (Global styles, legacy tokens)
2. `frontend/src/styles/tokens.css` (Shared semantic tokens)
3. `frontend/src/styles/layout.css` (Learner layout)
4. `frontend/src/styles/components.css` (Learner components)
5. `frontend/src/components/admin/AdminComponents.css`
6. `frontend/src/components/admin/ui/AdminDesignSystem.css`
7. `frontend/src/components/layout/WorkspaceShell.css`
8. `frontend/src/components/management/ManagementLayout.css`
9. `frontend/src/components/staff/staff-shared.css`
10. `frontend/src/pages/Admin/AdminPages.css`
11. `frontend/src/pages/Admin/AdminPolish.css`
12. `frontend/src/pages/Content/ContentPages.css`
13. `frontend/src/pages/Content/ContentImportPage.css`
14. `frontend/src/pages/Teacher/TeacherPages.css`
15. `frontend/src/pages/Support/SupportPages.css`
16. *Và 59 CSS files component lẻ trong `components/` và `pages/` (xem chi tiết trong commit).*

---

## 4. LỘ TRÌNH THỰC HIỆN CHI TIẾT

1. **Giai đoạn 1 (Ngay lập tức):** Sửa triệt để P0 Ngân hàng câu hỏi (`frontend/src/features/question-bank/`) bằng `QuestionBank.module.css`. Chụp ảnh Playwright tại 1440px, 1280px, 768px, 390px để nghiệm thu.
2. **Giai đoạn 2:** Chuẩn hóa Design System (`tokens.css`, `reset.css`, `typography.css`, `utilities.css`).
3. **Giai đoạn 3:** Chuẩn hóa Shared Components (`src/components/management/` và `src/components/ui/`).
4. **Giai đoạn 4:** Chuẩn hóa từng Workspace (Content, Admin, Teacher, Support, Learner).
5. **Giai đoạn 5:** Kiểm thử hồi quy toàn diện, Vitest 406/406, Build, Lint và báo cáo cuối.

