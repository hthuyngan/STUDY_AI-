import { Route } from 'react-router-dom'
import { RoleGuard } from '@/auth/RoleGuard'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import { AdminDashboardPage } from '@/pages/Admin/AdminDashboardPage'
import { AdminUsersPage } from '@/pages/Admin/AdminUsersPage'
import { AdminUserDetailPage } from '@/pages/Admin/AdminUserDetailPage'
import { AdminRolesPage } from '@/pages/Admin/AdminRolesPage'
import { AdminSystemPage } from '@/pages/Admin/AdminSystemPage'

export function AdminRoutes() {
  return (
    <Route
      path="/admin"
      element={
        <RoleGuard allowedRoles={['admin']}>
          <WorkspaceShell role="admin" />
        </RoleGuard>
      }
    >
      <Route index element={<AdminDashboardPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="users/:id" element={<AdminUserDetailPage />} />
      <Route path="roles" element={<AdminRolesPage />} />
      <Route path="system" element={<AdminSystemPage />} />
    </Route>
  )
}
