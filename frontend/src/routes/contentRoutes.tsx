import { Route } from 'react-router-dom'
import { RoleGuard } from '@/auth/RoleGuard'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import { ContentDashboardPage } from '@/pages/Content/ContentDashboardPage'
import { ContentSubjectsPage } from '@/pages/Content/ContentSubjectsPage'
import { ContentCurriculumPage } from '@/pages/Content/ContentCurriculumPage'
import { ContentLessonsPage } from '@/pages/Content/ContentLessonsPage'
import { ContentLessonEditorPage } from '@/pages/Content/ContentLessonEditorPage'
import { ContentAssessmentsPage } from '@/pages/Content/ContentAssessmentsPage'
import { ContentReviewPage } from '@/pages/Content/ContentReviewPage'

export function ContentRoutes() {
  return (
    <Route
      path="/content"
      element={
        <RoleGuard allowedRoles={['content', 'admin']}>
          <WorkspaceShell role="content" />
        </RoleGuard>
      }
    >
      <Route index element={<ContentDashboardPage />} />
      <Route path="subjects" element={<ContentSubjectsPage />} />
      <Route path="subjects/:id" element={<ContentCurriculumPage />} />
      <Route path="lessons" element={<ContentLessonsPage />} />
      <Route path="lessons/:id" element={<ContentLessonEditorPage />} />
      <Route path="assessments" element={<ContentAssessmentsPage />} />
      <Route path="review" element={<ContentReviewPage />} />
    </Route>
  )
}
