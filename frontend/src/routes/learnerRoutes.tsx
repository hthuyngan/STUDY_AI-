import { Route, Navigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import SubjectsPage from '@/pages/Subjects/SubjectsPage'
import SubjectDetailPage from '@/pages/Subjects/SubjectDetailPage'
import LessonPage from '@/pages/Lesson/LessonPage'
import QuizPage from '@/pages/Quiz/QuizPage'
import QuizResultPage from '@/pages/Quiz/QuizResultPage'
import AITutorPage from '@/pages/AITutor/AITutorPage'
import LearningPathPage from '@/pages/LearningPath/LearningPathPage'
import MyNotesPage from '@/pages/MyNotes/MyNotesPage'
import KnowledgeGapsPage from '@/pages/KnowledgeGaps/KnowledgeGapsPage'
import SmartReviewPage from '@/pages/SmartReview/SmartReviewPage'
import LearningAnalyticsPage from '@/pages/LearningAnalytics/LearningAnalyticsPage'
import ExercisesPage from '@/pages/Exercises/ExercisesPage'
import LibraryPage from '@/pages/Library/LibraryPage'
import QuestionBankPage from '@/pages/QuestionBank/QuestionBankPage'
import AchievementsPage from '@/pages/Achievements/AchievementsPage'
import ProfilePage from '@/pages/Profile/ProfilePage'
import SettingsPage from '@/pages/Settings/SettingsPage'
import DesignSystemPage from '@/pages/DesignSystem/DesignSystemPage'

export function LegacyCoursesRedirect() {
  const { courseId } = useParams<{ courseId?: string }>()
  if (!courseId) {
    return <Navigate to="/subjects" replace />
  }
  const subjectId = courseId.startsWith('math')
    ? 'math'
    : courseId.startsWith('phy')
      ? 'physics'
      : courseId.startsWith('chem')
        ? 'chemistry'
        : courseId.startsWith('eng')
          ? 'english'
          : 'math'
  return <Navigate to={`/subjects/${subjectId}`} replace />
}

export function LegacyLearnRedirect() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const subjectId = (courseId || '').startsWith('math')
    ? 'math'
    : (courseId || '').startsWith('phy')
      ? 'physics'
      : (courseId || '').startsWith('chem')
        ? 'chemistry'
        : (courseId || '').startsWith('eng')
          ? 'english'
          : 'math'
  return <Navigate to={`/subjects/${subjectId}/lessons/${lessonId}`} replace />
}

export function LearnerRoutes() {
  return (
    <>
      {/* Main Dashboard */}
      <Route
        path="/dashboard"
        element={
          <AppShell>
            <DashboardPage />
          </AppShell>
        }
      />

      {/* Subjects Curriculum */}
      <Route
        path="/subjects"
        element={
          <AppShell>
            <SubjectsPage />
          </AppShell>
        }
      />
      <Route
        path="/subjects/:subjectId"
        element={
          <AppShell>
            <SubjectDetailPage />
          </AppShell>
        }
      />

      {/* Canonical Lesson Route */}
      <Route
        path="/subjects/:subjectId/lessons/:lessonId"
        element={
          <AppShell>
            <LessonPage />
          </AppShell>
        }
      />

      {/* Legacy Course redirects */}
      <Route path="/courses" element={<Navigate to="/subjects" replace />} />
      <Route path="/courses/:courseId" element={<LegacyCoursesRedirect />} />

      {/* Legacy /learn redirect */}
      <Route path="/learn/:courseId/:lessonId" element={<LegacyLearnRedirect />} />

      {/* Quiz Flow */}
      <Route
        path="/quiz/:quizId"
        element={
          <AppShell>
            <QuizPage />
          </AppShell>
        }
      />
      <Route
        path="/quiz/:quizId/result"
        element={
          <AppShell>
            <QuizResultPage />
          </AppShell>
        }
      />

      {/* AI Tutor */}
      <Route
        path="/ai-tutor"
        element={
          <AppShell>
            <AITutorPage />
          </AppShell>
        }
      />
      <Route
        path="/ai-tutor/:conversationId"
        element={
          <AppShell>
            <AITutorPage />
          </AppShell>
        }
      />

      {/* Learning Path */}
      <Route
        path="/learning-path"
        element={
          <AppShell>
            <LearningPathPage />
          </AppShell>
        }
      />

      {/* My Study Notes & Bookmarks */}
      <Route
        path="/my-notes"
        element={
          <AppShell>
            <MyNotesPage />
          </AppShell>
        }
      />

      {/* Phase 6: Knowledge Gaps (Sổ tay kiến thức yếu) */}
      <Route
        path="/knowledge-gaps"
        element={
          <AppShell>
            <KnowledgeGapsPage />
          </AppShell>
        }
      />

      {/* Phase 7: Learning Analytics & Student Competency Profile */}
      <Route
        path="/learning-analytics"
        element={
          <AppShell>
            <LearningAnalyticsPage />
          </AppShell>
        }
      />
      <Route path="/analytics" element={<Navigate to="/learning-analytics" replace />} />

      {/* Phase 6: Smart Review (Ôn tập thông minh ngắt quãng) */}
      <Route
        path="/review"
        element={
          <AppShell>
            <SmartReviewPage />
          </AppShell>
        }
      />

      {/* Exercises */}
      <Route
        path="/exercises"
        element={
          <AppShell>
            <ExercisesPage />
          </AppShell>
        }
      />
      <Route
        path="/exercises/:exerciseId"
        element={
          <AppShell>
            <ExercisesPage />
          </AppShell>
        }
      />

      {/* Library */}
      <Route
        path="/library"
        element={
          <AppShell>
            <LibraryPage />
          </AppShell>
        }
      />

      {/* Phase 11: Question Bank Foundation (Kho câu hỏi GDPT 2018) */}
      <Route
        path="/question-bank"
        element={
          <AppShell>
            <QuestionBankPage />
          </AppShell>
        }
      />

      {/* Achievements */}
      <Route
        path="/achievements"
        element={
          <AppShell>
            <AchievementsPage />
          </AppShell>
        }
      />

      {/* Profile */}
      <Route
        path="/profile"
        element={
          <AppShell>
            <ProfilePage />
          </AppShell>
        }
      />

      {/* Settings */}
      <Route
        path="/settings"
        element={
          <AppShell>
            <SettingsPage />
          </AppShell>
        }
      />

      {/* Design System Page */}
      <Route path="/design-system" element={<DesignSystemPage />} />
    </>
  )
}
