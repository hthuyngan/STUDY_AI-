import { Route } from 'react-router-dom'
import { RoleGuard } from '@/auth/RoleGuard'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import { ContentDashboardPage } from '@/pages/Content/ContentDashboardPage'
import { ContentSubjectsPage } from '@/pages/Content/ContentSubjectsPage'
import { ContentCatalogPage } from '@/pages/Content/ContentCatalogPage'
import { CurriculumWorkspacePage } from '@/pages/Content/CurriculumWorkspacePage'
import { ContentCurriculumPage } from '@/pages/Content/ContentCurriculumPage'
import { ContentChaptersPage } from '@/pages/Content/ContentChaptersPage'
import { ContentLessonsPage } from '@/pages/Content/ContentLessonsPage'
import { ContentLessonEditorPage } from '@/pages/Content/ContentLessonEditorPage'
import { ContentAssessmentsPage } from '@/pages/Content/ContentAssessmentsPage'
import { ContentReviewPage } from '@/pages/Content/ContentReviewPage'
import { ContentApprovalDetailPage } from '@/pages/Content/ContentApprovalDetailPage'
import { ContentPublicationsPage } from '@/pages/Content/ContentPublicationsPage'
import { ContentImportPage } from '@/pages/Content/ContentImportPage'
import { ContentMaterialsPage } from '@/pages/Content/ContentMaterialsPage'
import { ContentKnowledgeBasePage } from '@/pages/Content/ContentKnowledgeBasePage'
import { ContentErrorReportsPage } from '@/pages/Content/ContentErrorReportsPage'
import { ModernQuestionBankPage } from '@/features/question-bank'

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
      <Route path="catalog" element={<ContentCatalogPage />} />
      <Route path="curriculum" element={<CurriculumWorkspacePage />} />
      <Route path="subjects/:id" element={<ContentCurriculumPage />} />
      <Route path="chapters" element={<ContentChaptersPage />} />
      <Route path="lessons" element={<ContentLessonsPage />} />
      <Route path="lessons/:id" element={<ContentLessonEditorPage />} />
      <Route path="questions" element={<ModernQuestionBankPage />} />
      <Route path="assessments" element={<ContentAssessmentsPage />} />
      <Route path="materials" element={<ContentMaterialsPage />} />
      <Route path="import" element={<ContentImportPage />} />
      <Route path="review" element={<ContentReviewPage />} />
      <Route path="review/:approvalId" element={<ContentApprovalDetailPage />} />
      <Route path="knowledge-base" element={<ContentKnowledgeBasePage />} />
      <Route path="error-reports" element={<ContentErrorReportsPage />} />
      <Route path="publications" element={<ContentPublicationsPage />} />
    </Route>
  )
}
