# ADMIN UI DESIGN SPECIFICATION (Modern Enterprise Admin Dashboard)

## 1. Visual & Structural Principles

- **Style**: Flat, clean, high-density enterprise SaaS admin interface. No purple/blue gradients, no glow effects, no AI robot illustrations, no emoji icons.
- **Iconography**: `lucide-react` code icons only; icon-only buttons must have `title` / tooltip and `aria-label`.
- **Color Palette**: Neutral slate canvas (`#F8FAFC`), crisp white surfaces (`#FFFFFF`), 1px `#E2E8F0` borders, single primary accent (`#1D4ED8` / `#1E40AF`), semantic status colors (`#16A34A` success, `#D97706` warning, `#DC2626` danger, `#0284C7` info).
- **Typography**: `Inter` for UI/prose, `JetBrains Mono` / `tabular-nums` for metrics, IDs, tokens, and timestamps.
- **Language**: Consistent Vietnamese across labels, statuses, empty/error/loading states, and confirmations.

## 2. Navigation Architecture (5 Groups)

1. **Tổng quan**: `Dashboard` (`/admin`)
2. **Người dùng**: `Quản lý người dùng` (`/admin/users`), `Vai trò và phân quyền` (`/admin/roles`)
3. **Học tập**: `Chương trình học` (`/content/subjects`), `Ngân hàng câu hỏi` (`/content/question-bank`), `Kiểm duyệt nội dung` (`/admin/content-monitor`)
4. **Dịch vụ**: `Quản lý API` (`/admin/api-management` — Bản mẫu chờ duyệt), `Gói đăng ký` (`/admin/subscriptions` — Bản mẫu chờ duyệt), `Giao dịch` (Chưa hỗ trợ), `Hỗ trợ` (`/admin/tickets`)
5. **Hệ thống**: `Nhật ký hoạt động` (`/admin/audit-logs`), `Giám sát` (`/admin/system`), `Cài đặt` (`/admin/settings`)

## 3. Standardized Component Inventory (`frontend/src/components/admin/ui/`)

- `AdminPageHeader` (with Breadcrumb support)
- `AdminButton` & `AdminIconButton` (with tooltip)
- `AdminDataTable` (compact rows, server-side sort headers, keyboard accessible)
- `AdminSearchInput` & `AdminFilterBar`
- `AdminPagination`
- `AdminBadge` / `StatusBadge`
- `AdminFormField` (label, required, error, helper)
- `AdminConfirmDialog`
- `AdminDetailDrawer` (slide-over detail panel)
- `AdminEmptyState`, `AdminErrorState`, `AdminLoadingState` (`AdminSkeleton`)
