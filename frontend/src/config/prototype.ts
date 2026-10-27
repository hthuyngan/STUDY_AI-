/**
 * Frontend Prototype Mode Configuration
 *
 * In Prototype Mode:
 * - No backend server is required.
 * - All workspaces (Admin, Teacher, Content, Support, Learner) are immediately accessible.
 * - Authentication, RBAC, RoleGuard, and PermissionGuard are bypassed.
 * - Staff services load rich mock/demo data with in-memory mutations.
 * - "Trang quản trị" button is always visible on the Topbar.
 */
export const FRONTEND_PROTOTYPE_MODE = true

export function isPrototypeMode(): boolean {
  return FRONTEND_PROTOTYPE_MODE || import.meta.env.VITE_UI_PROTOTYPE_MODE === 'true'
}

// Backward compatibility alias for preview helper
export function isStaffUiPreviewEnabled(): boolean {
  return isPrototypeMode()
}
