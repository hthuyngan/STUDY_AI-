import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RouteLoadingFallback } from '@/components/layout/RouteLoadingFallback'

const DashboardPage = lazy(() => import('@/pages/Dashboard/DashboardPage'))
const SubjectsPage = lazy(() => import('@/pages/Subjects/SubjectsPage'))
const SubjectDetailPage = lazy(() => import('@/pages/Subjects/SubjectDetailPage'))
const CoursesPage = lazy(() => import('@/pages/Courses/CoursesPage'))
const CourseDetailPage = lazy(() => import('@/pages/Courses/CourseDetailPage'))
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

        {/* Subjects */}
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

        {/* Courses */}
        <Route
          path="/courses"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <CoursesPage />
              </Suspense>
            </AppShell>
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <CourseDetailPage />
              </Suspense>
            </AppShell>
          }
        />

        {/* Lesson View */}
        <Route
          path="/learn/:courseId/:lessonId"
          element={
            <AppShell>
              <Suspense fallback={<RouteLoadingFallback />}>
                <LessonPage />
              </Suspense>
            </AppShell>
          }
        />

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
