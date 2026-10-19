import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import AchievementsPage from '@/pages/Achievements/AchievementsPage'
import AITutorPage from '@/pages/AITutor/AITutorPage'
import CourseDetailPage from '@/pages/Courses/CourseDetailPage'
import CoursesPage from '@/pages/Courses/CoursesPage'
import DashboardPage from '@/pages/Dashboard/DashboardPage'
import DesignSystemPage from '@/pages/DesignSystem/DesignSystemPage'
import ExercisesPage from '@/pages/Exercises/ExercisesPage'
import LearningPathPage from '@/pages/LearningPath/LearningPathPage'
import LessonPage from '@/pages/Lesson/LessonPage'
import LibraryPage from '@/pages/Library/LibraryPage'
import ProfilePage from '@/pages/Profile/ProfilePage'
import QuizPage from '@/pages/Quiz/QuizPage'
import QuizResultPage from '@/pages/Quiz/QuizResultPage'
import SettingsPage from '@/pages/Settings/SettingsPage'
import SubjectDetailPage from '@/pages/Subjects/SubjectDetailPage'
import SubjectsPage from '@/pages/Subjects/SubjectsPage'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Main Dashboard */}
        <Route
          path="/dashboard"
          element={
            <AppShell>
              <DashboardPage />
            </AppShell>
          }
        />

        {/* Subjects */}
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

        {/* Courses */}
        <Route
          path="/courses"
          element={
            <AppShell>
              <CoursesPage />
            </AppShell>
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            <AppShell>
              <CourseDetailPage />
            </AppShell>
          }
        />

        {/* Lesson View */}
        <Route
          path="/learn/:courseId/:lessonId"
          element={
            <AppShell>
              <LessonPage />
            </AppShell>
          }
        />

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

        {/* Design System Page (Bảo lưu theo yêu cầu) */}
        <Route path="/design-system" element={<DesignSystemPage />} />

        {/* Root redirect to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
