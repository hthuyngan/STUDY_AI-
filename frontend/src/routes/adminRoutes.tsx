import { Route } from 'react-router-dom'
import { RoleGuard } from '@/auth/RoleGuard'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import { AdminDashboardPage } from '@/pages/Admin/AdminDashboardPage'
import { AdminUsersPage } from '@/pages/Admin/AdminUsersPage'
import { AdminUserDetailPage } from '@/pages/Admin/AdminUserDetailPage'
import { AdminRolesPage } from '@/pages/Admin/AdminRolesPage'
import { AdminSystemPage } from '@/pages/Admin/AdminSystemPage'
import { AdminSubjectsPage } from '@/pages/Admin/AdminSubjectsPage'
import { AdminChaptersPage } from '@/pages/Admin/AdminChaptersPage'
import { AdminLessonsPage } from '@/pages/Admin/AdminLessonsPage'
import { ContentLessonEditorPage } from '@/pages/Content/ContentLessonEditorPage'
import { AdminAssessmentsPage } from '@/pages/Admin/AdminAssessmentsPage'
import { AdminTeachersPage } from '@/pages/Admin/AdminTeachersPage'
import { AdminReportsPage } from '@/pages/Admin/AdminReportsPage'
import { AdminClassesPage } from '@/pages/Admin/AdminClassesPage'
import { AdminClassDetailPage } from '@/pages/Admin/AdminClassDetailPage'
import { AdminStudentsPage } from '@/pages/Admin/AdminStudentsPage'
import { AdminStudentProfilePage } from '@/pages/Admin/AdminStudentProfilePage'
import { AdminAssignmentsPage } from '@/pages/Admin/AdminAssignmentsPage'
import { AdminAssignmentDetailPage } from '@/pages/Admin/AdminAssignmentDetailPage'
import { AdminGradesPage } from '@/pages/Admin/AdminGradesPage'
import { AdminAlertsPage } from '@/pages/Admin/AdminAlertsPage'

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

      {/* Quản lý học tập (Education Management) */}
      <Route path="subjects" element={<AdminSubjectsPage />} />
      <Route path="chapters" element={<AdminChaptersPage />} />
      <Route path="lessons" element={<AdminLessonsPage />} />
      <Route path="lessons/:id" element={<ContentLessonEditorPage />} />
      <Route path="assessments" element={<AdminAssessmentsPage />} />

      {/* Quản lý giảng dạy (Classroom & Students) */}
      <Route path="classes" element={<AdminClassesPage />} />
      <Route path="classes/:classId" element={<AdminClassDetailPage />} />
      <Route path="students" element={<AdminStudentsPage />} />
      <Route path="students/:studentId" element={<AdminStudentProfilePage />} />
      <Route path="assignments" element={<AdminAssignmentsPage />} />
      <Route path="assignments/:assignmentId" element={<AdminAssignmentDetailPage />} />

      {/* Kết quả học tập (Performance & Alerts) */}
      <Route path="grades" element={<AdminGradesPage />} />
      <Route path="alerts" element={<AdminAlertsPage />} />

      {/* Quản lý nhân sự (Staff Management) */}
      <Route path="teachers" element={<AdminTeachersPage />} />

      {/* Báo cáo (Analytics & Reporting) */}
      <Route path="reports" element={<AdminReportsPage />} />
    </Route>
  )
}
