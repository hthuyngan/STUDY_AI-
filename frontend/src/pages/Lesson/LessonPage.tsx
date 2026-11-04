import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bookmark, BookmarkCheck, CheckCircle2, FileText, List, Sparkles, Target } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AssessmentModal } from '@/components/assessment/AssessmentModal'
import { LessonAssessmentCard } from '@/components/assessment/LessonAssessmentCard'
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
import { LessonNotesPanel } from '@/components/lesson/LessonNotesPanel'
import { LessonProgressBar } from '@/components/lesson/LessonProgressBar'
import { LessonSectionBookmarkBtn } from '@/components/lesson/LessonSectionBookmarkBtn'
import { LessonAskAIBtn } from '@/components/lesson/LessonAskAIBtn'
import { LessonSectionProgress } from '@/components/lesson/LessonSectionProgress'
import { LessonSidebar } from '@/components/lesson/LessonSidebar'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { getMockAssessmentByLessonId } from '@/data/assessments.mock'
import { useLesson } from '@/hooks/useLesson'
import { useLessonAssessment } from '@/hooks/useLessonAssessment'
import { useLessonProgress } from '@/hooks/useLessonProgress'
import { useStudyNotes } from '@/hooks/useStudyNotes'
import { learningProgressRepository } from '@/repositories/learningProgress.repository'
import { lessonProgressService } from '@/services/lessonProgress.service'
import './LessonPage.css'

export function LessonPage() {
  const { subjectId: paramSubjectId, courseId: paramCourseId, lessonId } = useParams<{
    subjectId?: string
    courseId?: string
    lessonId: string
  }>()
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false)
  const [notesPanelOpen, setNotesPanelOpen] = useState(false)

  const resolvedSubjectId =
    paramSubjectId ||
    (paramCourseId?.startsWith('phy')
      ? 'physics'
      : paramCourseId?.startsWith('chem')
        ? 'chemistry'
        : paramCourseId?.startsWith('eng')
          ? 'english'
          : 'math')

  const {
    lesson,
    outline,
    isLoading,
    error,
    isBookmarked,
    toggleBookmark,
    reload,
  } = useLesson(resolvedSubjectId, lessonId)

  // Identify all valid learning sections from current lesson content
  const actualSectionIds: string[] = []
  if (lesson?.content?.introduction) actualSectionIds.push('introduction')
  if ((lesson?.content?.definitions?.length ?? 0) > 0) actualSectionIds.push('definitions')
  if ((lesson?.content?.formulas?.length ?? 0) > 0) actualSectionIds.push('formulas')
  if ((lesson?.content?.examples?.length ?? 0) > 0) actualSectionIds.push('examples')
  if ((lesson?.content?.importantNotes?.length ?? 0) > 0) actualSectionIds.push('important-notes')
  if ((lesson?.content?.summaryPoints?.length ?? 0) > 0) actualSectionIds.push('summary')

  const sectionsList = useMemo(() => {
    const list: Array<{ id: string; title: string }> = []
    if (lesson?.content?.introduction) {
      list.push({ id: 'introduction', title: 'Mở đầu bài học' })
    }
    if ((lesson?.content?.definitions?.length ?? 0) > 0) {
      list.push({ id: 'definitions', title: 'Khái niệm & Định nghĩa cơ bản' })
    }
    if ((lesson?.content?.formulas?.length ?? 0) > 0) {
      list.push({ id: 'formulas', title: 'Công thức trọng tâm' })
    }
    if ((lesson?.content?.examples?.length ?? 0) > 0) {
      list.push({ id: 'examples', title: 'Ví dụ mẫu & Phương pháp giải' })
    }
    if ((lesson?.content?.importantNotes?.length ?? 0) > 0) {
      list.push({ id: 'important-notes', title: 'Bẫy đề thi & Lưu ý cần nhớ' })
    }
    if ((lesson?.content?.summaryPoints?.length ?? 0) > 0) {
      list.push({ id: 'summary', title: 'Tổng kết kiến thức bài học' })
    }
    return list
  }, [lesson])

  const { notes } = useStudyNotes(lesson?.id)

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.querySelector(`[data-section-id="${sectionId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add('section-highlight-active')
      setTimeout(() => {
        el.classList.remove('section-highlight-active')
      }, 2600)
      window.history.replaceState(null, '', `#${sectionId}`)
    }
  }, [])

  // Auto restore section anchor on initial load if provided via hash or stored lastActiveSectionId
  useEffect(() => {
    if (!lesson) return
    const hash = window.location.hash.replace('#', '')
    const targetId = hash || learningProgressRepository.getByLessonId(lesson.id)?.lastActiveSectionId
    if (targetId) {
      const timer = setTimeout(() => {
        scrollToSection(targetId)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [lesson, scrollToSection])

  // Track active section as it enters viewport without altering content progress
  useEffect(() => {
    if (!lesson) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const sectionId = entry.target.getAttribute('data-section-id')
            if (sectionId) {
              const secObj = sectionsList.find((s) => s.id === sectionId)
              const title = secObj?.title || sectionId
              lessonProgressService.setLastActiveSection(
                lesson.id,
                resolvedSubjectId,
                sectionId,
                title
              )
            }
          }
        })
      },
      { threshold: [0.3] }
    )

    const sectionEls = document.querySelectorAll('[data-section-id]')
    sectionEls.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [lesson, resolvedSubjectId, sectionsList])

  // Track progress with 60% intersection & 2s dwell time
  const {
    overallProgress,
    isAssessmentCompleted,
    registerSection,
    getSectionProgress,
    isSectionCompleted,
    reloadProgress,
  } = useLessonProgress({
    lessonId: lesson?.id || '',
    subjectId: resolvedSubjectId,
    actualSectionIds,
  })

  // Harvest assessment model
  const assessment = useMemo(() => {
    if (!lesson) return null
    return getMockAssessmentByLessonId(lesson.id, resolvedSubjectId, lesson.title)
  }, [lesson, resolvedSubjectId])

  // Assessment hook
  const {
    isModalOpen,
    activeAttempt,
    latestCompletedAttempt,
    currentQuestionIndex,
    currentQuestion,
    questions,
    answeredCount,
    isAllAnswered,
    hasUnfinishedAttempt,
    showPauseConfirm,
    showSubmitConfirm,
    showResultView,
    setShowPauseConfirm,
    setShowSubmitConfirm,
    handleStartAttempt,
    handleRestartAttempt,
    handleViewLatestResult,
    goToQuestion,
    nextQuestion,
    previousQuestion,
    selectOption,
    confirmPause,
    confirmSubmit,
    closeModal,
  } = useLessonAssessment({
    assessment:
      assessment || {
        id: 'assessment-fallback',
        lessonId: lesson?.id || '',
        subjectId: resolvedSubjectId,
        title: 'Bài tập thu hoạch',
        description: '',
        estimatedMinutes: 5,
        passingScorePercent: 60,
        questions: [],
      },
    totalActualSections: actualSectionIds.length,
    onAssessmentCompleted: () => {
      reloadProgress()
    },
  })

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
        <Breadcrumb items={[{ label: 'Môn học', to: '/subjects' }, { label: 'Bài học' }]} />
        <PageErrorState description={error || 'Không tìm thấy bài học'} onRetry={reload} />
      </div>
    )
  }

  const chapterShortLabel = lesson.chapterTitle
    ? lesson.chapterTitle.split(/[:·]/)[0].trim()
    : 'Chương 1'
  const lessonShortLabel = lesson.lessonNumber
    ? `Bài ${String(lesson.lessonNumber).padStart(2, '0')}`
    : lesson.title

  return (
    <div className="lesson-page-container">
      {/* Sidebar with outline and current lesson progress */}
      <LessonSidebar
        subjectId={resolvedSubjectId}
        subjectTitle={`Giáo trình ${lesson.subjectName || 'Môn học'}`}
        currentLessonId={lesson.id}
        chapters={outline}
        currentLessonProgress={overallProgress}
        isOpenOnMobile={mobileOutlineOpen}
        onCloseMobile={() => setMobileOutlineOpen(false)}
      />

      {/* Main Content Area */}
      <main className="lesson-main-content">
        {/* Top Header & Breadcrumb */}
        <div className="lesson-top-bar">
          <Breadcrumb
            items={[
              { label: 'Môn học', to: '/subjects' },
              { label: lesson.subjectName || 'Toán học', to: `/subjects/${resolvedSubjectId}` },
              { label: chapterShortLabel },
              { label: lessonShortLabel },
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

        {/* Lesson Header Banner with Global Lesson Progress */}
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

            <div className="lesson-header-right-actions">
              <Button
                variant="outline"
                size="sm"
                icon={FileText}
                onClick={() => setNotesPanelOpen((prev) => !prev)}
                aria-label="Mở ghi chú và đoạn lưu"
              >
                Ghi chú {notes.length > 0 ? `(${notes.length})` : ''}
              </Button>

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
          </div>

          {/* Compact Lesson Progress Row in Header */}
          <div className="lesson-header-progress-wrap">
            <LessonProgressBar progressPercent={overallProgress} />
          </div>
        </header>

        {/* Lesson Content Article */}
        <article className="lesson-article-body">
          {/* Pedagogical Objectives & Competency Skills Card (GDPT 2018) */}
          {((lesson.learningObjectives && lesson.learningObjectives.length > 0) ||
            (lesson.skills && lesson.skills.length > 0)) && (
            <div className="lesson-objectives-card">
              <div className="lesson-objectives-header">
                <div className="lesson-objectives-badge">
                  <Target size={14} aria-hidden />
                  <span>CHUẨN GDPT 2018</span>
                </div>
                {lesson.curriculumVersion && (
                  <span className="lesson-curriculum-version-tag">
                    {lesson.textbookAlignment === 'general_standard'
                      ? 'Bộ GD&ĐT · Chuẩn phát triển năng lực'
                      : lesson.textbookAlignment || 'Chương trình GDPT 2018'}
                  </span>
                )}
              </div>

              {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
                <div className="lesson-objectives-block">
                  <h2 className="lesson-objectives-title">Mục tiêu bài học cần đạt</h2>
                  <ul className="lesson-objectives-list">
                    {lesson.learningObjectives.map((obj, i) => (
                      <li key={i} className="lesson-objective-item">
                        <CheckCircle2 size={16} className="objective-check-icon" aria-hidden />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {lesson.skills && lesson.skills.length > 0 && (
                <div className="lesson-skills-block">
                  <h3 className="lesson-skills-title">Kỹ năng năng lực cốt lõi</h3>
                  <div className="lesson-skills-pills">
                    {lesson.skills.map((sk) => (
                      <span
                        key={sk.skillCode}
                        className={`lesson-skill-pill skill-level-${sk.level}`}
                        title={`Kỹ năng: ${sk.skillName} (${sk.level})`}
                      >
                        <code className="skill-code">{sk.skillCode}</code>
                        <span className="skill-name">{sk.skillName}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Introduction Section */}
          {lesson.content.introduction && (
            <div
              ref={(el) => registerSection('introduction', el)}
              data-section-id="introduction"
              className="lesson-section-block lesson-intro-section"
            >
              <div className="lesson-heading-row">
                <span className="lesson-intro-tag">Mở đầu bài học</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LessonAskAIBtn
                    lessonId={lesson.id}
                    subjectId={resolvedSubjectId}
                    lessonTitle={lesson.title}
                    subjectName={lesson.subjectName || 'Môn học'}
                    sectionId="introduction"
                    sectionTitle="Mở đầu bài học"
                    excerpt={typeof lesson.content.introduction === 'string' ? lesson.content.introduction : undefined}
                  />
                  <LessonSectionBookmarkBtn
                    lessonId={lesson.id}
                    subjectId={resolvedSubjectId}
                    lessonTitle={lesson.title}
                    subjectName={lesson.subjectName || 'Môn học'}
                    sectionId="introduction"
                    sectionTitle="Mở đầu bài học"
                  />
                  <LessonSectionProgress
                    progressPercent={getSectionProgress('introduction')}
                    isCompleted={isSectionCompleted('introduction')}
                  />
                </div>
              </div>
              <LessonParagraph>{lesson.content.introduction}</LessonParagraph>
            </div>
          )}

          {/* Definitions */}
          {lesson.content.definitions.length > 0 && (
            <div
              ref={(el) => registerSection('definitions', el)}
              data-section-id="definitions"
              className="lesson-section-block"
            >
              <LessonHeading
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LessonAskAIBtn
                      lessonId={lesson.id}
                      subjectId={resolvedSubjectId}
                      lessonTitle={lesson.title}
                      subjectName={lesson.subjectName || 'Môn học'}
                      sectionId="definitions"
                      sectionTitle="Khái niệm và Định nghĩa cơ bản"
                    />
                    <LessonSectionBookmarkBtn
                      lessonId={lesson.id}
                      subjectId={resolvedSubjectId}
                      lessonTitle={lesson.title}
                      subjectName={lesson.subjectName || 'Môn học'}
                      sectionId="definitions"
                      sectionTitle="Khái niệm và Định nghĩa cơ bản"
                    />
                    <LessonSectionProgress
                      progressPercent={getSectionProgress('definitions')}
                      isCompleted={isSectionCompleted('definitions')}
                    />
                  </div>
                }
              >
                1. Khái niệm và Định nghĩa cơ bản
              </LessonHeading>
              {lesson.content.definitions.map((def, idx) => (
                <DefinitionBlock key={idx} term={def.term} content={def.content} />
              ))}
            </div>
          )}

          {/* Formulas */}
          {lesson.content.formulas.length > 0 && (
            <div
              ref={(el) => registerSection('formulas', el)}
              data-section-id="formulas"
              className="lesson-section-block"
            >
              <LessonHeading
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LessonAskAIBtn
                      lessonId={lesson.id}
                      subjectId={resolvedSubjectId}
                      lessonTitle={lesson.title}
                      subjectName={lesson.subjectName || 'Môn học'}
                      sectionId="formulas"
                      sectionTitle="Công thức trọng tâm"
                    />
                    <LessonSectionBookmarkBtn
                      lessonId={lesson.id}
                      subjectId={resolvedSubjectId}
                      lessonTitle={lesson.title}
                      subjectName={lesson.subjectName || 'Môn học'}
                      sectionId="formulas"
                      sectionTitle="Công thức trọng tâm"
                    />
                    <LessonSectionProgress
                      progressPercent={getSectionProgress('formulas')}
                      isCompleted={isSectionCompleted('formulas')}
                    />
                  </div>
                }
              >
                2. Công thức trọng tâm
              </LessonHeading>
              {lesson.content.formulas.map((form) => (
                <FormulaBlock key={form.id} formula={form} />
              ))}
            </div>
          )}

          {/* Examples */}
          {lesson.content.examples.length > 0 && (
            <div
              ref={(el) => registerSection('examples', el)}
              data-section-id="examples"
              className="lesson-section-block"
            >
              <LessonHeading
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LessonAskAIBtn
                      lessonId={lesson.id}
                      subjectId={resolvedSubjectId}
                      lessonTitle={lesson.title}
                      subjectName={lesson.subjectName || 'Môn học'}
                      sectionId="examples"
                      sectionTitle="Ví dụ mẫu & Phương pháp giải"
                    />
                    <LessonSectionBookmarkBtn
                      lessonId={lesson.id}
                      subjectId={resolvedSubjectId}
                      lessonTitle={lesson.title}
                      subjectName={lesson.subjectName || 'Môn học'}
                      sectionId="examples"
                      sectionTitle="Ví dụ mẫu & Phương pháp giải"
                    />
                    <LessonSectionProgress
                      progressPercent={getSectionProgress('examples')}
                      isCompleted={isSectionCompleted('examples')}
                    />
                  </div>
                }
              >
                3. Ví dụ mẫu & Phương pháp giải
              </LessonHeading>
              {lesson.content.examples.map((ex) => (
                <ExampleBlock key={ex.id} example={ex} />
              ))}
            </div>
          )}

          {/* Important Notes */}
          {lesson.content.importantNotes.length > 0 && (
            <div
              ref={(el) => registerSection('important-notes', el)}
              data-section-id="important-notes"
              className="lesson-section-block"
            >
              <LessonHeading
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LessonAskAIBtn
                      lessonId={lesson.id}
                      subjectId={resolvedSubjectId}
                      lessonTitle={lesson.title}
                      subjectName={lesson.subjectName || 'Môn học'}
                      sectionId="important-notes"
                      sectionTitle="Bẫy đề thi & Lưu ý cần nhớ"
                    />
                    <LessonSectionBookmarkBtn
                      lessonId={lesson.id}
                      subjectId={resolvedSubjectId}
                      lessonTitle={lesson.title}
                      subjectName={lesson.subjectName || 'Môn học'}
                      sectionId="important-notes"
                      sectionTitle="Bẫy đề thi & Lưu ý cần nhớ"
                    />
                    <LessonSectionProgress
                      progressPercent={getSectionProgress('important-notes')}
                      isCompleted={isSectionCompleted('important-notes')}
                    />
                  </div>
                }
              >
                4. Bẫy đề thi & Lưu ý cần nhớ
              </LessonHeading>
              <ImportantNote notes={lesson.content.importantNotes} />
            </div>
          )}

          {/* Summary */}
          {lesson.content.summaryPoints.length > 0 && (
            <div
              ref={(el) => registerSection('summary', el)}
              data-section-id="summary"
              className="lesson-section-block"
            >
              <LessonHeading
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LessonAskAIBtn
                      lessonId={lesson.id}
                      subjectId={resolvedSubjectId}
                      lessonTitle={lesson.title}
                      subjectName={lesson.subjectName || 'Môn học'}
                      sectionId="summary"
                      sectionTitle="Tổng kết kiến thức bài học"
                    />
                    <LessonSectionBookmarkBtn
                      lessonId={lesson.id}
                      subjectId={resolvedSubjectId}
                      lessonTitle={lesson.title}
                      subjectName={lesson.subjectName || 'Môn học'}
                      sectionId="summary"
                      sectionTitle="Tổng kết kiến thức bài học"
                    />
                    <LessonSectionProgress
                      progressPercent={getSectionProgress('summary')}
                      isCompleted={isSectionCompleted('summary')}
                    />
                  </div>
                }
              >
                5. Tổng kết kiến thức bài học
              </LessonHeading>
              <LessonSummaryBlock points={lesson.content.summaryPoints} />
            </div>
          )}

          {/* Embedded Lesson Harvest Assessment Card */}
          <LessonAssessmentCard
            assessment={assessment}
            isCompleted={isAssessmentCompleted}
            hasUnfinishedAttempt={hasUnfinishedAttempt}
            activeAttempt={activeAttempt}
            latestAttempt={latestCompletedAttempt}
            onStartAttempt={handleStartAttempt}
            onViewResult={handleViewLatestResult}
            onRetryAttempt={handleRestartAttempt}
          />
        </article>

        {/* Bottom Action Bar */}
        <LessonBottomBar
          subjectId={resolvedSubjectId}
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          previousLessonId={lesson.previousLessonId}
          nextLessonId={lesson.nextLessonId}
          isCompleted={overallProgress === 100}
          isAssessmentCompleted={isAssessmentCompleted}
          onOpenAssessment={isAssessmentCompleted ? handleViewLatestResult : handleStartAttempt}
          onOpenNotes={() => setNotesPanelOpen(true)}
          notesCount={notes.length}
        />
      </main>

      {/* Lesson Notes & Bookmarks Right Panel */}
      <LessonNotesPanel
        isOpen={notesPanelOpen}
        onClose={() => setNotesPanelOpen(false)}
        lessonId={lesson.id}
        subjectId={resolvedSubjectId}
        lessonTitle={lesson.title}
        subjectName={lesson.subjectName || 'Môn học'}
        sections={sectionsList}
        onScrollToSection={scrollToSection}
      />

      {/* Full-screen Assessment Modal */}
      {assessment && (
        <AssessmentModal
          isOpen={isModalOpen}
          assessment={assessment}
          lessonTitle={lesson.title}
          activeAttempt={activeAttempt}
          currentQuestionIndex={currentQuestionIndex}
          currentQuestion={currentQuestion}
          questions={questions}
          answeredCount={answeredCount}
          isAllAnswered={isAllAnswered}
          showPauseConfirm={showPauseConfirm}
          showSubmitConfirm={showSubmitConfirm}
          showResultView={showResultView}
          setShowPauseConfirm={setShowPauseConfirm}
          setShowSubmitConfirm={setShowSubmitConfirm}
          onSelectOption={selectOption}
          onGoToQuestion={goToQuestion}
          onNextQuestion={nextQuestion}
          onPreviousQuestion={previousQuestion}
          onConfirmPause={confirmPause}
          onConfirmSubmit={confirmSubmit}
          onCloseModal={closeModal}
          onRetry={handleRestartAttempt}
        />
      )}
    </div>
  )
}

export default LessonPage
