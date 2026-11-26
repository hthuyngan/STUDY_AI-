import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { AssessmentModal } from '@/components/assessment/AssessmentModal'
import { LessonAssessmentCard } from '@/components/assessment/LessonAssessmentCard'
import { LessonProgressBar } from '@/components/lesson/LessonProgressBar'
import { LessonVideoPlayer } from '@/components/lesson/LessonVideoPlayer'
import { LessonResourcesList } from '@/components/lesson/LessonResourcesList'
import { LessonContentBlockRenderer } from '@/components/lesson/LessonContentBlockRenderer'
import {
  LessonHeading,
  LessonParagraph,
  DefinitionBlock,
  FormulaBlock,
  ExampleBlock,
  ImportantNote,
  LessonSummaryBlock,
} from '@/components/lesson/LessonBlocks'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAiChat } from '@/context/useAiChat'
import { curriculumService } from '@/services/curriculum.service'
import { useLesson } from '@/hooks/useLesson'
import { useLessonAssessment } from '@/hooks/useLessonAssessment'
import { useLessonProgress } from '@/hooks/useLessonProgress'
import { learningContextService } from '@/services/learningContext.service'
import type { AssessmentOption, AssessmentQuestion, LessonAssessment } from '@/types/assessment'
import type { TutorLearningContext } from '@/types/aiTutor'
import './LessonPage.css'

export function LessonPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { subjectId: paramSubjectId, courseId: paramCourseId, lessonId } = useParams<{
    subjectId?: string
    courseId?: string
    lessonId: string
  }>()

  // Accordion Bài tập thu hoạch: mặc định thu gọn
  const [isHarvestOpen, setIsHarvestOpen] = useState(false)

  const { setLearningContext } = useAiChat()

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
    isLoading,
    error,
    reload,
  } = useLesson(resolvedSubjectId, lessonId)

  // Identify all real learning sections present in the lesson
  const actualSectionIds: string[] = useMemo(() => {
    const ids: string[] = []
    if (lesson?.videos && lesson.videos.length > 0) {
      ids.push('video-lecture')
    }
    if (lesson?.content?.introduction) {
      ids.push('theory-intro')
    }
    if (lesson?.content?.definitions && lesson.content.definitions.length > 0) {
      ids.push('theory-definitions')
    }
    if (lesson?.content?.formulas && lesson.content.formulas.length > 0) {
      ids.push('theory-formulas')
    }
    if (lesson?.content?.examples && lesson.content.examples.length > 0) {
      ids.push('theory-examples')
    }
    if (lesson?.content?.importantNotes && lesson.content.importantNotes.length > 0) {
      ids.push('theory-notes')
    }
    if (lesson?.content?.summaryPoints && lesson.content.summaryPoints.length > 0) {
      ids.push('theory-summary')
    }
    return ids
  }, [lesson])

  // Sync active lesson context on mount/lesson change
  useEffect(() => {
    if (!lesson) return
    const context: TutorLearningContext = {
      source: 'lesson',
      sectionType: 'video',
      lessonId: lesson.id,
      subjectId: resolvedSubjectId,
      lessonTitle: lesson.title,
      subjectName: lesson.subjectName || 'Toán học',
      chapterTitle: lesson.chapterTitle,
      title: lesson.title,
      excerpt: lesson.learningObjectives?.join(', ') || `Bài học: ${lesson.title}`,
      returnUrl: location.pathname,
    }
    setLearningContext(context)
    learningContextService.setContext(context)
  }, [lesson, resolvedSubjectId, location.pathname, setLearningContext])

  // Resolve active lesson identifier immediately from props or URL
  const currentLessonId = lesson?.id || lessonId || ''

  // Track progress (70% content sections + 30% assessment)
  const {
    overallProgress,
    isAssessmentCompleted,
    markVideoCompleted,
    registerSection,
    reloadProgress,
  } = useLessonProgress({
    lessonId: currentLessonId,
    subjectId: resolvedSubjectId,
    actualSectionIds,
    hasAssessment: true,
  })

  // Fetch real published assessment questions from StudyAIDb via Curriculum API (Zero-Leak)
  const [assessment, setAssessment] = useState<LessonAssessment | null>(null)
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(true)
  const [assessmentError, setAssessmentError] = useState<string | null>(null)

  const loadAssessmentQuestions = useCallback(async () => {
    if (!lesson) return
    setIsAssessmentLoading(true)
    setAssessmentError(null)

    try {
      const rawQuestions = await curriculumService.getLessonQuestions(lesson.id)
      if (!rawQuestions || rawQuestions.length === 0) {
        setAssessment(null)
        return
      }

      const questions: AssessmentQuestion[] = rawQuestions.map((q) => {
        const options: AssessmentOption[] = (q.options || []).map((optStr, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx)
          const match = optStr.match(/^[A-D][.:]\s*(.+)$/i)
          const text = match ? match[1].trim() : optStr.trim()
          const label = match ? optStr.substring(0, 1).toUpperCase() : letter
          return {
            id: `opt_${optIdx}_${label}`,
            label,
            text,
          }
        })

        return {
          id: q.id,
          type: 'single-choice',
          prompt: q.prompt,
          options,
          correctOptionId: '', // Strict zero-leak
          explanation: '', // Strict zero-leak
          topic: q.topic || 'Kiểm tra kiến thức bài học',
        }
      })

      setAssessment({
        id: (lesson as { assessmentId?: string }).assessmentId || lesson.id,
        lessonId: lesson.id,
        subjectId: resolvedSubjectId,
        title: `Bài tập thu hoạch: ${lesson.title}`,
        description: 'Làm bài trắc nghiệm để đánh giá mức độ hiểu bài và đạt 100% tiến độ học tập.',
        estimatedMinutes: Math.max(3, questions.length * 2),
        passingScorePercent: 60,
        questions,
      })
    } catch {
      setAssessment(null)
      setAssessmentError('Không thể tải bài tập thu hoạch do lỗi kết nối máy chủ.')
    } finally {
      setIsAssessmentLoading(false)
    }
  }, [lesson, resolvedSubjectId])

  useEffect(() => {
    loadAssessmentQuestions()
  }, [loadAssessmentQuestions])

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
        lessonId: currentLessonId,
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

  // Select strictly one primary lecture video
  const primaryVideo = useMemo(() => {
    if (!lesson) return null
    if (lesson.videos && lesson.videos.length > 0) {
      const v = lesson.videos.find((item) => item.isPrimary) || lesson.videos[0]
      return {
        id: v.id,
        title: v.title,
        description: v.description,
        provider: v.provider || 'youtube',
        sourceUrl: v.sourceUrl,
        embedUrl: v.embedUrl || undefined,
        youTubeVideoId: v.youTubeVideoId || undefined,
        channelName: v.channelName || undefined,
        isPrimary: v.isPrimary,
        attributionText: v.attributionText || undefined,
        embedAllowed: v.embedAllowed,
        durationSeconds: v.durationSeconds || undefined,
        thumbnailUrl: v.thumbnailUrl || undefined,
      }
    }
    if (lesson.video?.hasVideo && (lesson.video.youtubeId || lesson.video.videoUrl)) {
      return {
        id: 'vid_main',
        title: lesson.title,
        provider: lesson.video.provider || 'youtube',
        sourceUrl: lesson.video.sourceReferenceUrl || lesson.video.videoUrl || '',
        embedUrl: lesson.video.videoUrl || undefined,
        youTubeVideoId: lesson.video.youtubeId || undefined,
        durationSeconds: lesson.video.durationSeconds,
      }
    }
    return null
  }, [lesson])

  if (isLoading) {
    return (
      <div className="lesson-page-root">
        <div className="lesson-skeleton-wrap">
          <Skeleton variant="text" width={260} height={16} />
          <Skeleton variant="rect" width="100%" height={80} />
          <Skeleton variant="rect" width="100%" height={360} />
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="lesson-page-root">
        <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Môn học', to: '/subjects' }, { label: 'Bài học' }]} />
        <PageErrorState description={error || 'Không tìm thấy bài học'} onRetry={reload} />
      </div>
    )
  }

  const chapterShortLabel = lesson.chapterTitle
    ? lesson.chapterTitle.split(/[:·]/)[0].trim()
    : 'Chương 1'

  return (
    <div className="lesson-page-root">
      <div className="lesson-page-container">
        {/* ============================================================ */}
        {/* 1. BREADCRUMB NHỎ */}
        {/* ============================================================ */}
        <nav className="lesson-breadcrumb-nav" aria-label="Đường dẫn điều hướng">
          <Breadcrumb
            items={[
              { label: 'Trang chủ', to: '/' },
              { label: 'Môn học', to: '/subjects' },
              { label: lesson.subjectName || 'Toán học', to: `/subjects/${resolvedSubjectId}` },
              { label: chapterShortLabel },
              { label: lesson.title },
            ]}
          />
        </nav>

        {/* ============================================================ */}
        {/* 2. TÊN BÀI HỌC */}
        {/* ============================================================ */}
        <header className="lesson-header-section">
          <div className="lesson-header-meta">
            <span className="lesson-chapter-tag">{lesson.chapterTitle}</span>
            {lesson.durationMinutes && (
              <span className="lesson-duration-tag">{lesson.durationMinutes} phút</span>
            )}
          </div>
          <h1 className="lesson-main-title">{lesson.title}</h1>
        </header>

        {/* ============================================================ */}
        {/* 3. TIẾN ĐỘ HỌC TẬP (% TIẾN ĐỘ, XP) */}
        {/* ============================================================ */}
        <div className="lesson-progress-card" aria-label="Tiến độ học tập">
          <div className="lesson-progress-info">
            <div className="lesson-progress-text">
              <span className="lesson-progress-label">Tiến độ bài học:</span>
              <strong className="lesson-progress-value">{overallProgress}%</strong>
            </div>
            {lesson.xp != null && (
              <span className="lesson-xp-badge">
                <Sparkles size={13} aria-hidden /> +{lesson.xp} XP
              </span>
            )}
          </div>
          <div className="lesson-progress-bar-wrap">
            <LessonProgressBar progressPercent={overallProgress} />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. VIDEO BÀI GIẢNG DUY NHẤT (16:9, responsive, fullscreen, no-autoplay) */}
        {/* ============================================================ */}
        <section
          className="lesson-video-section"
          aria-label="Video bài giảng"
          data-section-id="video-lecture"
          id="video-lecture"
        >
          {primaryVideo ? (
            <LessonVideoPlayer
              video={primaryVideo}
              videos={lesson.videos}
              lessonTitle={lesson.title}
              sourceReferenceUrl={lesson.sourceReferenceUrl}
              onVideoCompleted={markVideoCompleted}
            />
          ) : (
            <div className="lesson-video-unavailable" role="status">
              <div>
                <strong>Bài học chưa có video phát trực tiếp</strong>
                <p>Video bài giảng sẽ được cập nhật sớm. Bạn có thể sử dụng AI Tutor ở góc màn hình để được hỗ trợ kiến thức.</p>
              </div>
            </div>
          )}
        </section>

        {/* P04 Generalized Learner Resources (images, documents, attachments, external links) */}
        <LessonResourcesList resources={lesson.resources} />

        {/* ============================================================ */}
        {/* 4.5 NỘI DUNG LÝ THUYẾT & CÔNG THỨC TOÁN (KaTeX & Pedagogical Blocks) */}
        {/* ============================================================ */}
        {lesson.contentBlocks && lesson.contentBlocks.length > 0 ? (
          <section className="lesson-theory-section" aria-label="Nội dung bài học" style={{ marginTop: '24px' }}>
            <LessonContentBlockRenderer blocks={lesson.contentBlocks} />
          </section>
        ) : lesson.content ? (
          <section className="lesson-theory-section" aria-label="Nội dung lý thuyết và công thức" style={{ marginTop: '24px' }}>
            {lesson.content.introduction && (
              <div
                ref={(el) => registerSection('theory-intro', el)}
                data-section-id="theory-intro"
                className="theory-block-intro"
                style={{ marginBottom: '20px' }}
              >
                <LessonHeading>Đặt vấn đề & Mở đầu</LessonHeading>
                <LessonParagraph>{lesson.content.introduction}</LessonParagraph>
              </div>
            )}

            {lesson.content.definitions && lesson.content.definitions.length > 0 && (
              <div
                ref={(el) => registerSection('theory-definitions', el)}
                data-section-id="theory-definitions"
                className="theory-block-definitions"
                style={{ marginBottom: '20px' }}
              >
                <LessonHeading>Khái niệm & Định lý cốt lõi</LessonHeading>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {lesson.content.definitions.map((def, idx) => (
                    <DefinitionBlock key={idx} term={def.term} content={def.content} />
                  ))}
                </div>
              </div>
            )}

            {lesson.content.formulas && lesson.content.formulas.length > 0 && (
              <div
                ref={(el) => registerSection('theory-formulas', el)}
                data-section-id="theory-formulas"
                className="theory-block-formulas"
                style={{ marginBottom: '20px' }}
              >
                <LessonHeading>Công thức toán học & Quy tắc</LessonHeading>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {lesson.content.formulas.map((form) => (
                    <FormulaBlock key={form.id} formula={form} />
                  ))}
                </div>
              </div>
            )}

            {lesson.content.examples && lesson.content.examples.length > 0 && (
              <div
                ref={(el) => registerSection('theory-examples', el)}
                data-section-id="theory-examples"
                className="theory-block-examples"
                style={{ marginBottom: '20px' }}
              >
                <LessonHeading>Ví dụ minh họa chi tiết</LessonHeading>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {lesson.content.examples.map((ex) => (
                    <ExampleBlock key={ex.id} example={ex} />
                  ))}
                </div>
              </div>
            )}

            {lesson.content.importantNotes && lesson.content.importantNotes.length > 0 && (
              <div
                ref={(el) => registerSection('theory-notes', el)}
                data-section-id="theory-notes"
                className="theory-block-notes"
                style={{ marginBottom: '20px' }}
              >
                <ImportantNote notes={lesson.content.importantNotes} />
              </div>
            )}

            {lesson.content.summaryPoints && lesson.content.summaryPoints.length > 0 && (
              <div
                ref={(el) => registerSection('theory-summary', el)}
                data-section-id="theory-summary"
                className="theory-block-summary"
                style={{ marginBottom: '20px' }}
              >
                <LessonSummaryBlock points={lesson.content.summaryPoints} />
              </div>
            )}
          </section>
        ) : null}

        {/* ============================================================ */}
        {/* 5. BÀI TẬP THU HOẠCH (Collapsible Accordion, Mặc định thu gọn) */}
        {/* ============================================================ */}
        <section
          className="lesson-harvest-accordion"
          aria-label="Bài tập thu hoạch"
          data-section-id="harvest-accordion"
          id="harvest-accordion"
        >
          <div
            className="harvest-accordion-header"
            onClick={() => setIsHarvestOpen((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setIsHarvestOpen((prev) => !prev)
              }
            }}
            aria-expanded={isHarvestOpen}
          >
            <div className="harvest-header-left">
              <div className="harvest-icon-wrap">
                <Award size={18} aria-hidden />
              </div>
              <div className="harvest-title-meta">
                <h2 className="harvest-title">Bài tập thu hoạch</h2>
                {isAssessmentCompleted ? (
                  <span className="harvest-badge is-completed">
                    <CheckCircle2 size={12} aria-hidden /> Đã hoàn thành
                  </span>
                ) : (
                  <span className="harvest-badge">Đánh giá hiểu bài</span>
                )}
              </div>
            </div>

            <div className="harvest-header-right">
              <ChevronDown
                size={18}
                className={`harvest-chevron ${isHarvestOpen ? 'is-open' : ''}`}
                aria-hidden
              />
            </div>
          </div>

          {isHarvestOpen && (
            <div className="harvest-accordion-body">
              <LessonAssessmentCard
                assessment={assessment}
                isLoading={isAssessmentLoading}
                error={assessmentError}
                onRetryLoad={loadAssessmentQuestions}
                isCompleted={isAssessmentCompleted}
                hasUnfinishedAttempt={hasUnfinishedAttempt}
                activeAttempt={activeAttempt}
                latestAttempt={latestCompletedAttempt}
                onStartAttempt={handleStartAttempt}
                onViewResult={handleViewLatestResult}
                onRetryAttempt={handleRestartAttempt}
              />
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/* 6. ĐIỀU HƯỚNG BÀI TRƯỚC / BÀI TIẾP THEO (Navigation ở cuối trang) */}
        {/* ============================================================ */}
        <nav className="lesson-navigation-footer" aria-label="Điều hướng bài trước và bài tiếp theo">
          <div className="nav-footer-prev">
            {lesson.previousLessonId ? (
              <Button
                variant="outline"
                icon={ChevronLeft}
                onClick={() => navigate(`/subjects/${resolvedSubjectId}/lessons/${lesson.previousLessonId}`)}
              >
                Bài trước
              </Button>
            ) : (
              <span className="nav-disabled-hint">Đây là bài đầu tiên</span>
            )}
          </div>

          <div className="nav-footer-next">
            {lesson.nextLessonId ? (
              <Button
                variant="primary"
                icon={ChevronRight}
                onClick={() => navigate(`/subjects/${resolvedSubjectId}/lessons/${lesson.nextLessonId}`)}
              >
                Bài tiếp theo
              </Button>
            ) : (
              <span className="nav-disabled-hint">Đã hoàn thành toàn bộ bài học</span>
            )}
          </div>
        </nav>
      </div>

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
