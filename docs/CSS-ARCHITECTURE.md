# STUDY_AI — CSS Architecture & Design System Guide

## 1. Tổng quan Kiến trúc CSS (Architecture Overview)

STUDY_AI áp dụng kiến trúc CSS phân lớp hiện đại (Layered Modular CSS Architecture) kết hợp **Design Tokens**, **Modern CSS Reset**, **Typography Hierarchy**, **Utilities**, và **Scoped CSS Modules**.

```
frontend/src/
├── styles/
│   ├── tokens.css           # Semantic Design Tokens (Màu sắc, z-index, spacing, radius, shadow)
│   ├── reset.css            # Modern CSS Reset (box-sizing, normalizations, scrollbars, focus)
│   ├── typography.css       # Typography Hierarchy (Inter, JetBrains Mono, headings, body, code)
│   ├── utilities.css        # Micro-utilities (sr-only, truncate, flex helpers, animations)
│   ├── layout.css           # Global shell & layout primitives
│   └── components.css       # Shared button, badge, input, card styles
├── index.css                # File tổng, import đúng thứ tự phân lớp
└── features/
    └── question-bank/
        └── QuestionBank.module.css  # Scoped CSS Module cho trạm làm việc phức tạp
```

### Thứ tự nạp (Import Order) bắt buộc trong `index.css`:
```css
@import './styles/tokens.css';
@import './styles/reset.css';
@import './styles/typography.css';
@import './styles/utilities.css';
```

---

## 2. Hệ thống Design Tokens (`tokens.css`)

### 2.1 Bảng màu thương hiệu (Brand Palette)
- **Primary Blue**: `var(--ui-color-primary, #1D4ED8)`
- **Primary Hover**: `var(--ui-color-primary-hover, #1E40AF)`
- **Primary Subtle / Active**: `var(--ui-color-primary-subtle, #EFF6FF)`
- **Navy Accent**: `var(--ui-color-navy, #183B69)`
- **Canvas / Background**: `var(--ui-color-canvas, #F8FAFC)`
- **Surface**: `var(--ui-color-surface, #FFFFFF)`
- **Text Main**: `var(--ui-color-text, #0F172A)`
- **Text Muted**: `var(--ui-color-text-muted, #64748B)`
- **Border Default**: `var(--ui-color-border, #E2E8F0)`

### 2.2 Trạng thái ngữ nghĩa (Semantic Feedback)
- **Success (Thành công / Đã xuất bản)**: `#16A34A` / nền `#F0FDF4`
- **Warning (Cảnh báo / Chờ duyệt)**: `#D97706` / nền `#FEF3C7`
- **Danger (Lỗi / Bị từ chối / Đã xóa)**: `#DC2626` / nền `#FEF2F2`
- **Info (Thông tin / Đã duyệt)**: `#0284C7` / nền `#EFF6FF`

### 2.3 Phân lớp Z-Index (Layer Stacking System)
Tuyệt đối không sử dụng các giá trị `z-index` ngẫu nhiên (như `z-index: 999`). Sử dụng các biến sau:
- `--ui-layer-base`: `0`
- `--ui-layer-header`: `50`
- `--ui-layer-sidebar`: `100`
- `--ui-layer-dropdown`: `200` (Dropdown menus, Kebab portals, Popovers)
- `--ui-layer-sticky`: `250`
- `--ui-layer-dialog`: `500` (Modals, Dialogs, Drawer Overlays)
- `--ui-layer-toast`: `1000` (Toast notifications)

---

## 3. Quy tắc viết CSS cho Component mới (Authoring Rules)

### Quy tắc 1: Scoped CSS qua CSS Modules
Đối với các trang và tính năng quản trị phức tạp (như Question Bank, Curriculum Editor, Class Detail), **bắt buộc dùng CSS Modules** (`[Name].module.css`):
```tsx
import styles from './MyComponent.module.css';

export const MyComponent = () => (
  <div className={styles.container}>
    <table className={styles.table}>...</table>
  </div>
);
```

### Quy tắc 2: KHÔNG dùng uncompiled Tailwind utility classes
Dự án STUDY_AI sử dụng Vite thuần không cài đặt Tailwind CLI hay PostCSS tailwind compiler. Việc ghi `className="flex flex-col lg:flex-row inset-0 bg-[#F8FAFC]"` sẽ **không sinh ra CSS ở runtime** và gây vỡ layout nghiêm trọng.

### Quy tắc 3: Bảng dữ liệu luôn bọc trong Responsive Scroll Container
```html
<div className={styles.tableScroll}>
  <table className={`staff-table ${styles.table}`}>
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>
```
CSS tương ứng:
```css
.tableScroll {
  overflow-x: auto;
  min-width: 100%;
  -webkit-overflow-scrolling: touch;
}
.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px; /* Bảo vệ table không bị co bóp text trên mobile */
}
```

### Quy tắc 4: Dialog & Drawer Layout Chuẩn
- **Backdrop**: `position: fixed; inset: 0; z-index: var(--ui-layer-dialog); background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(4px);`
- **Dialog Box**: `max-height: calc(100vh - 40px); display: flex; flex-direction: column; overflow: hidden;`
- **Body**: `overflow-y: auto; flex: 1; padding: 16px 20px;`
- **Footer**: `flex-shrink: 0; padding: 12px 20px; border-top: 1px solid var(--ui-color-border);`
- **Keyboard & Click outside**: Bắt buộc hỗ trợ phím `Escape` và khóa cuộn `body` (`overflow: hidden`).

### Quy tắc 5: Workstation Responsive 2 Cột
- Desktop (`>= 1024px`): 2 cột ngang (`flex-direction: row; align-items: flex-start;`). Cột phải cố định độ rộng 420px - 460px (`position: sticky; top: 1.25rem;`).
- Tablet / Mobile (`< 1024px`): Cột xem trước chuyển thành **Drawer trượt từ bên phải** với backdrop mờ, đóng mở linh hoạt khi người dùng chạm vào hàng dữ liệu hoặc nút đóng.

---

## 4. Hướng dẫn Mẫu: Tạo Component Form Modal Chuẩn

```tsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './CustomModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export const CustomModal: React.FC<Props> = ({ isOpen, onClose, title }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKey);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <h3>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Đóng"><X size={16} /></button>
        </div>
        <div className={styles.body}>
          {/* Form fields */}
        </div>
        <div className={styles.footer}>
          <button type="button" onClick={onClose} className="btn btn-secondary">Hủy</button>
          <button type="submit" className="btn btn-primary">Xác nhận</button>
        </div>
      </div>
    </div>
  );
};
```
