import { Navigate, Route, useParams } from 'react-router-dom'
import { RoleGuard } from '@/auth/RoleGuard'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import { AdminDashboardPage } from '@/pages/Admin/AdminDashboardPage'
import { AdminUsersPage } from '@/pages/Admin/AdminUsersPage'
import { AdminUserDetailPage } from '@/pages/Admin/AdminUserDetailPage'
import { AdminRolesPage } from '@/pages/Admin/AdminRolesPage'
import { AdminTeachersPage } from '@/pages/Admin/AdminTeachersPage'
import { AdminReportsPage } from '@/pages/Admin/AdminReportsPage'
import { AdminAnnouncementsPage } from '@/pages/Admin/AdminAnnouncementsPage'
import { AdminAuditLogsPage } from '@/pages/Admin/AdminAuditLogsPage'
import { AdminSystemPage } from '@/pages/Admin/AdminSystemPage'
import { AdminSettingsPage } from '@/pages/Admin/AdminSettingsPage'
import { AdminContentMonitorPage } from '@/pages/Admin/AdminContentMonitorPage'
import { AdminSupportMonitorPage } from '@/pages/Admin/AdminSupportMonitorPage'

// Helper component to preserve URL params on legacy redirect
function RedirectWithParam({ basePath, paramName }: { basePath: string; paramName: string }) {
  const params = useParams()
  const paramVal = params[paramName]
  const target = paramVal ? `${basePath}/${paramVal}` : basePath
  return <Navigate to={target} replace />
}

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
      {/* 1. Core Administration & System Monitoring */}
      <Route index element={<AdminDashboardPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="users/:id" element={<AdminUserDetailPage />} />
      <Route path="roles" element={<AdminRolesPage />} />
      <Route path="teachers" element={<AdminTeachersPage />} />
      <Route path="reports" element={<AdminReportsPage />} />
      <Route path="announcements" element={<AdminAnnouncementsPage />} />
      <Route path="audit-logs" element={<AdminAuditLogsPage />} />
      <Route path="system" element={<AdminSystemPage />} />
      <Route path="settings" element={<AdminSettingsPage />} />

      {/* 2. Cross-Workspace Oversight & Performance Monitoring (V6) */}
      <Route path="content-monitor" element={<AdminContentMonitorPage />} />
      <Route path="support-monitor" element={<AdminSupportMonitorPage />} />

      {/* 3. Backward Compatibility Redirects (Seamless Transition from V3/V4/V5) */}
      {/* Curriculum Management -> Content Workspace */}
      <Route path="subjects" element={<Navigate to="/content/subjects" replace />} />
      <Route path="chapters" element={<Navigate to="/content/chapters" replace />} />
      <Route path="lessons" element={<Navigate to="/content/lessons" replace />} />
      <Route path="lessons/:id" element={<RedirectWithParam basePath="/content/lessons" paramName="id" />} />
      <Route path="assessments" element={<Navigate to="/content/assessments" replace />} />
      <Route path="approvals" element={<Navigate to="/content/review" replace />} />
      <Route path="approvals/:approvalId" element={<RedirectWithParam basePath="/content/review" paramName="approvalId" />} />
      <Route path="publications" element={<Navigate to="/content/publications" replace />} />

      {/* Classroom, Teaching & Grades -> Teacher Workspace */}
      <Route path="classes" element={<Navigate to="/teacher/classes" replace />} />
      <Route path="classes/:classId" element={<RedirectWithParam basePath="/teacher/classes" paramName="classId" />} />
      <Route path="students" element={<Navigate to="/teacher/students" replace />} />
      <Route path="students/:studentId" element={<RedirectWithParam basePath="/teacher/students" paramName="studentId" />} />
      <Route path="assignments" element={<Navigate to="/teacher/assignments" replace />} />
      <Route path="assignments/:assignmentId" element={<RedirectWithParam basePath="/teacher/assignments" paramName="assignmentId" />} />
      <Route path="grades" element={<Navigate to="/teacher/grades" replace />} />
      <Route path="alerts" element={<Navigate to="/teacher/alerts" replace />} />

      {/* User Support Tickets -> Support Workspace */}
      <Route path="tickets" element={<Navigate to="/support/tickets" replace />} />
      <Route path="tickets/:ticketId" element={<RedirectWithParam basePath="/support/tickets" paramName="ticketId" />} />
    </Route>
  )
}
