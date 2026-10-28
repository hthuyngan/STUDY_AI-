import { Route } from 'react-router-dom'
import { RoleGuard } from '@/auth/RoleGuard'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import { TeacherDashboardPage } from '@/pages/Teacher/TeacherDashboardPage'
import { TeacherClassesPage } from '@/pages/Teacher/TeacherClassesPage'
import { TeacherClassDetailPage } from '@/pages/Teacher/TeacherClassDetailPage'
import { TeacherStudentsPage } from '@/pages/Teacher/TeacherStudentsPage'
import { TeacherStudentProfilePage } from '@/pages/Teacher/TeacherStudentProfilePage'
import { TeacherAssignmentsPage } from '@/pages/Teacher/TeacherAssignmentsPage'
import { TeacherCreateAssignmentPage } from '@/pages/Teacher/TeacherCreateAssignmentPage'
import { TeacherAssignmentDetailPage } from '@/pages/Teacher/TeacherAssignmentDetailPage'
import { TeacherGradesPage } from '@/pages/Teacher/TeacherGradesPage'
import { TeacherAlertsPage } from '@/pages/Teacher/TeacherAlertsPage'

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
      <Route path="alerts" element={<TeacherAlertsPage />} />
      <Route path="classes" element={<TeacherClassesPage />} />
      <Route path="classes/:id" element={<TeacherClassDetailPage />} />
      <Route path="students" element={<TeacherStudentsPage />} />
      <Route path="students/:id" element={<TeacherStudentProfilePage />} />
      <Route path="assignments" element={<TeacherAssignmentsPage />} />
      <Route path="assignments/new" element={<TeacherCreateAssignmentPage />} />
      <Route path="assignments/:id" element={<TeacherAssignmentDetailPage />} />
      <Route path="grades" element={<TeacherGradesPage />} />
    </Route>
  )
}
