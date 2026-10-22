import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteLoadingFallback } from '@/components/layout/RouteLoadingFallback'

const DashboardPage = lazy(() => import('@/pages/Dashboard/DashboardPage'))
const SubjectsPage = lazy(() => import('@/pages/Subjects/SubjectsPage'))
const SubjectDetailPage = lazy(() => import('@/pages/Subjects/SubjectDetailPage'))
const LessonPage = lazy(() => import('@/pages/Lesson/LessonPage'))
const QuizPage = lazy(() => import('@/pages/Quiz/QuizPage'))
const QuizResultPage = lazy(() => import('@/pages/Quiz/QuizResultPage'))
const AITutorPage = lazy(() => import('@/pages/AITutor/AITutorPage'))
const LearningPathPage = lazy(() => import('@/pages/LearningPath/LearningPathPage'))
const ExercisesPage = lazy(() => import('@/pages/Exercises/ExercisesPage'))
const LibraryPage = lazy(() => import('@/pages/Library/LibraryPage'))
const AchievementsPage = lazy(() => import('@/pages/Achievements/AchievementsPage'))
const ProfilePage = lazy(() => import('@/pages/Profile/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/Settings/SettingsPage'))
const DesignSystemPage = lazy(() => import('@/pages/DesignSystem/DesignSystemPage'))

function LegacyCoursesRedirect() {
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

function LegacyLearnRedirect() {
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

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Main Dashboard */}
        <Route
          path="/dashboard"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <DashboardPage />
              </Suspense>
            </AppShell>
          }
        />

        {/* Subjects Curriculum */}
        <Route
          path="/subjects"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <SubjectsPage />
              </Suspense>
            </AppShell>
          }
        />
        <Route
          path="/subjects/:subjectId"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <SubjectDetailPage />
              </Suspense>
            </AppShell>
          }
        />

        {/* Canonical Lesson Route */}
        <Route
          path="/subjects/:subjectId/lessons/:lessonId"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <LessonPage />
              </Suspense>
            </AppShell>
          }
        />

        {/* Legacy Course redirects */}
        <Route path="/courses" element={<Navigate to="/subjects" replace />} />
        <Route path="/courses/:courseId" element={<LegacyCoursesRedirect />} />

        {/* Legacy /learn redirect to canonical /subjects/:subjectId/lessons/:lessonId */}
        <Route path="/learn/:courseId/:lessonId" element={<LegacyLearnRedirect />} />

        {/* Quiz Flow */}
        <Route
          path="/quiz/:quizId"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <QuizPage />
              </Suspense>
            </AppShell>
          }
        />
        <Route
          path="/quiz/:quizId/result"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <QuizResultPage />
              </Suspense>
            </AppShell>
          }
        />

        {/* AI Tutor */}
        <Route
          path="/ai-tutor"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <AITutorPage />
              </Suspense>
            </AppShell>
          }
        />
        <Route
          path="/ai-tutor/:conversationId"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <AITutorPage />
              </Suspense>
            </AppShell>
          }
        />

        {/* Learning Path */}
        <Route
          path="/learning-path"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <LearningPathPage />
              </Suspense>
            </AppShell>
          }
        />

        {/* Exercises */}
        <Route
          path="/exercises"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <ExercisesPage />
              </Suspense>
            </AppShell>
          }
        />
        <Route
          path="/exercises/:exerciseId"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <ExercisesPage />
              </Suspense>
            </AppShell>
          }
        />

        {/* Library */}
        <Route
          path="/library"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <LibraryPage />
              </Suspense>
            </AppShell>
          }
        />

        {/* Achievements */}
        <Route
          path="/achievements"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <AchievementsPage />
              </Suspense>
            </AppShell>
          }
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <ProfilePage />
              </Suspense>
            </AppShell>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <SettingsPage />
              </Suspense>
            </AppShell>
          }
        />

        {/* Design System Page (Bảo lưu theo yêu cầu) */}
        <Route
          path="/design-system"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <DesignSystemPage />
            </Suspense>
          }
        />

        {/* Root redirect to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
