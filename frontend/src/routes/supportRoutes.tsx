import { Route } from 'react-router-dom'
import { RoleGuard } from '@/auth/RoleGuard'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import { SupportDashboardPage } from '@/pages/Support/SupportDashboardPage'
import { SupportTicketsPage } from '@/pages/Support/SupportTicketsPage'
import { SupportTicketDetailPage } from '@/pages/Support/SupportTicketDetailPage'
import { SupportUsersPage } from '@/pages/Support/SupportUsersPage'
import { SupportUserDetailPage } from '@/pages/Support/SupportUserDetailPage'

export function SupportRoutes() {
  return (
    <Route
      path="/support"
      element={
        <RoleGuard allowedRoles={['support', 'admin']}>
          <WorkspaceShell role="support" />
        </RoleGuard>
      }
    >
      <Route index element={<SupportDashboardPage />} />
      <Route path="tickets" element={<SupportTicketsPage />} />
      <Route path="tickets/:id" element={<SupportTicketDetailPage />} />
      <Route path="users" element={<SupportUsersPage />} />
      <Route path="users/:id" element={<SupportUserDetailPage />} />
    </Route>
  )
}
