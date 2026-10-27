import { Route } from 'react-router-dom'
import { RoleGuard } from '@/auth/RoleGuard'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import { TeacherDashboardPage } from '@/pages/Teacher/TeacherDashboardPage'
import { TeacherClassesPage } from '@/pages/Teacher/TeacherClassesPage'
import { TeacherClassDetailPage } from '@/pages/Teacher/TeacherClassDetailPage'
import { TeacherStudentDetailPage } from '@/pages/Teacher/TeacherStudentDetailPage'
import { TeacherAssignmentsPage } from '@/pages/Teacher/TeacherAssignmentsPage'
import { TeacherCreateAssignmentPage } from '@/pages/Teacher/TeacherCreateAssignmentPage'

export function TeacherRoutes() {
  return (
    <Route
      path="/teacher"
      element={
        <RoleGuard allowedRoles={['teacher', 'admin']}>
          <WorkspaceShell role="teacher" />
        </RoleGuard>
      }
    >
      <Route index element={<TeacherDashboardPage />} />
      <Route path="classes" element={<TeacherClassesPage />} />
      <Route path="classes/:id" element={<TeacherClassDetailPage />} />
      <Route path="students/:id" element={<TeacherStudentDetailPage />} />
      <Route path="assignments" element={<TeacherAssignmentsPage />} />
      <Route path="assignments/new" element={<TeacherCreateAssignmentPage />} />
    </Route>
  )
}
