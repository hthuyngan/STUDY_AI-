import { useState } from 'react'
import { Bookmark, BookmarkCheck, List, Sparkles } from 'lucide-react'
import { useParams } from 'react-router-dom'
import {
  DefinitionBlock,
  ExampleBlock,
  FormulaBlock,
  ImportantNote,
  LessonHeading,
  LessonParagraph,
  LessonSummaryBlock,
} from '@/components/lesson/LessonBlocks'
import { LessonBottomBar } from '@/components/lesson/LessonBottomBar'
import { LessonSidebar } from '@/components/lesson/LessonSidebar'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLesson } from '@/hooks/useLesson'
import './LessonPage.css'

export function LessonPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false)

  const {
    lesson,
    outline,
    isLoading,
    error,
    isCompleted,
    isBookmarked,
    toggleBookmark,
    completeLesson,
    reload,
  } = useLesson(courseId, lessonId)

  if (isLoading) {
    return (
      <div className="lesson-page-root">
        <div className="lesson-skeleton-wrap">
          <Skeleton variant="text" width={260} height={16} />
          <Skeleton variant="rect" width="100%" height={80} />
          <Skeleton variant="rect" width="100%" height={320} />
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="lesson-page-root">
        <Breadcrumb items={[{ label: 'Khóa học', to: '/courses' }, { label: 'Bài học' }]} />
        <PageErrorState description={error || 'Không tìm thấy bài học'} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="lesson-page-container">
      {/* Sidebar with outline */}
      <LessonSidebar
        courseId={lesson.courseId}
        courseTitle={lesson.courseTitle}
        currentLessonId={lesson.id}
        chapters={outline}
        isOpenOnMobile={mobileOutlineOpen}
        onCloseMobile={() => setMobileOutlineOpen(false)}
      />

      {/* Main Content Area */}
      <main className="lesson-main-content">
        {/* Top Header & Breadcrumb */}
        <div className="lesson-top-bar">
          <Breadcrumb
            items={[
              { label: 'Khóa học', to: '/courses' },
              { label: lesson.courseTitle, to: `/courses/${lesson.courseId}` },
              { label: lesson.title },
            ]}
          />

          <button
            type="button"
            className="mobile-outline-toggle mobile-only"
            onClick={() => setMobileOutlineOpen(true)}
            aria-label="Mở danh sách bài học"
          >
            <List size={16} aria-hidden />
            <span>Mục lục</span>
          </button>
        </div>

        {/* Lesson Header Banner */}
        <header className="lesson-header-card">
          <div className="lesson-header-meta">
            <span className="lesson-chapter-tag">{lesson.chapterTitle}</span>
            <span className="lesson-xp-badge">
              <Sparkles size={12} aria-hidden /> +{lesson.xp} XP
            </span>
          </div>

          <h1 className="lesson-main-title">{lesson.title}</h1>

          <div className="lesson-header-actions-row">
            <span className="lesson-duration-text">{lesson.durationMinutes} phút đọc hiểu</span>

            <Button
              variant="ghost"
              size="sm"
              icon={isBookmarked ? BookmarkCheck : Bookmark}
              onClick={toggleBookmark}
              aria-label={isBookmarked ? 'Bỏ lưu bài học' : 'Lưu bài học'}
            >
              {isBookmarked ? 'Đã lưu' : 'Lưu bài'}
            </Button>
          </div>
        </header>

        {/* Lesson Content Article */}
        <article className="lesson-article-body">
          {/* Introduction */}
          <LessonParagraph>{lesson.content.introduction}</LessonParagraph>

          {/* Definitions */}
          {lesson.content.definitions.length > 0 && (
            <div className="lesson-section-block">
              <LessonHeading>1. Khái niệm và Định nghĩa cơ bản</LessonHeading>
              {lesson.content.definitions.map((def, idx) => (
                <DefinitionBlock key={idx} term={def.term} content={def.content} />
              ))}
            </div>
          )}

          {/* Formulas */}
          {lesson.content.formulas.length > 0 && (
            <div className="lesson-section-block">
              <LessonHeading>2. Công thức trọng tâm</LessonHeading>
              {lesson.content.formulas.map((form) => (
                <FormulaBlock key={form.id} formula={form} />
              ))}
            </div>
          )}

          {/* Examples */}
          {lesson.content.examples.length > 0 && (
            <div className="lesson-section-block">
              <LessonHeading>3. Ví dụ mẫu & Phương pháp giải</LessonHeading>
              {lesson.content.examples.map((ex) => (
                <ExampleBlock key={ex.id} example={ex} />
              ))}
            </div>
          )}

          {/* Important Notes */}
          {lesson.content.importantNotes.length > 0 && (
            <div className="lesson-section-block">
              <LessonHeading>4. Bẫy đề thi & Lưu ý cần nhớ</LessonHeading>
              <ImportantNote notes={lesson.content.importantNotes} />
            </div>
          )}

          {/* Summary */}
          {lesson.content.summaryPoints.length > 0 && (
            <div className="lesson-section-block">
              <LessonHeading>5. Tổng kết kiến thức bài học</LessonHeading>
              <LessonSummaryBlock points={lesson.content.summaryPoints} />
            </div>
          )}
        </article>

        {/* Bottom Action Bar */}
        <LessonBottomBar
          courseId={lesson.courseId}
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          quizId={lesson.quizId}
          previousLessonId={lesson.previousLessonId}
          nextLessonId={lesson.nextLessonId}
          isCompleted={isCompleted}
          onComplete={completeLesson}
        />
      </main>
    </div>
  )
}

export default LessonPage
