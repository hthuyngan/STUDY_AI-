import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Award,
  Bookmark,
  BookmarkCheck,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Play,
  Sparkles,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { AssessmentModal } from '@/components/assessment/AssessmentModal'
import { LessonAssessmentCard } from '@/components/assessment/LessonAssessmentCard'
import { LessonNotesPanel } from '@/components/lesson/LessonNotesPanel'
import { LessonProgressBar } from '@/components/lesson/LessonProgressBar'
import { LessonVideoPlayer, type VideoItemOption } from '@/components/lesson/LessonVideoPlayer'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAiChat } from '@/context/AiChatContext'
import { curriculumService } from '@/services/curriculum.service'
import { useLesson } from '@/hooks/useLesson'
import { useLessonAssessment } from '@/hooks/useLessonAssessment'
import { useLessonProgress } from '@/hooks/useLessonProgress'
import { useStudyNotes } from '@/hooks/useStudyNotes'
import { learningContextService } from '@/services/learningContext.service'
import type { AssessmentOption, AssessmentQuestion, LessonAssessment } from '@/types/assessment'
import type { TutorLearningContext } from '@/types/aiTutor'
import './LessonPage.css'

export function LessonPage() {
  const navigate = useNavigate()
  const { subjectId: paramSubjectId, courseId: paramCourseId, lessonId } = useParams<{
    subjectId?: string
    courseId?: string
    lessonId: string
  }>()

  // State
  const [notesPanelOpen, setNotesPanelOpen] = useState(false)
  const [isHarvestOpen, setIsHarvestOpen] = useState(false) // Accordion Bài tập thu hoạch: mặc định thu gọn

  const { openChat, setLearningContext } = useAiChat()

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
    isBookmarked,
    toggleBookmark,
    reload,
  } = useLesson(resolvedSubjectId, lessonId)

  // Identify valid learning sections in redesigned layout for progress tracking
  const actualSectionIds: string[] = useMemo(() => ['video-lecture'], [])

  const sectionsList = useMemo(() => {
    return [
      { id: 'video-lecture', title: 'Video bài giảng' },
      { id: 'harvest-accordion', title: 'Bài tập thu hoạch' },
    ]
  }, [])

  // Contextual AI Tutor Trigger for Video
  const handleAskAIVideo = useCallback(
    (videoItem?: VideoItemOption) => {
      if (!lesson) return
      const vTitle = videoItem?.title || lesson.title
      const context: TutorLearningContext = {
        source: 'lesson-video',
        sectionType: 'video',
        lessonId: lesson.id,
        subjectId: resolvedSubjectId,
        lessonTitle: lesson.title,
        subjectName: lesson.subjectName || 'Toán học',
        chapterTitle: lesson.chapterTitle,
        videoId: videoItem?.id,
        videoTitle: vTitle,
        title: `Video: ${vTitle}`,
        excerpt: videoItem?.description || `Video bài giảng của bài học: ${lesson.title}`,
        returnUrl: window.location.pathname,
      }
      setLearningContext(context)
      learningContextService.setContext(context)
      openChat(context, 'Giải thích nội dung video này')
    },
    [lesson, resolvedSubjectId, openChat, setLearningContext]
  )

  // Contextual AI Tutor Trigger for Harvest Assessment
  const handleAskAIPractice = useCallback(() => {
    if (!lesson) return
    const context: TutorLearningContext = {
      source: 'lesson-practice',
      sectionType: 'practice',
      lessonId: lesson.id,
      subjectId: resolvedSubjectId,
      lessonTitle: lesson.title,
      subjectName: lesson.subjectName || 'Toán học',
      chapterTitle: lesson.chapterTitle,
      title: `Bài tập thu hoạch · ${lesson.title}`,
      excerpt: 'Hướng dẫn em cách tư duy làm bài tập thu hoạch của bài học này',
      returnUrl: window.location.pathname,
    }
    setLearningContext(context)
    learningContextService.setContext(context)
    openChat(context, 'Gợi ý cho em phương pháp giải các bài tập của bài này')
  }, [lesson, resolvedSubjectId, openChat, setLearningContext])

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
      returnUrl: window.location.pathname,
    }
    setLearningContext(context)
    learningContextService.setContext(context)
  }, [lesson?.id, lesson?.title, lesson?.chapterTitle, resolvedSubjectId, setLearningContext])

  const { notes } = useStudyNotes(lesson?.id)

  // Track progress
  const {
    overallProgress,
    isAssessmentCompleted,
    registerSection,
    reloadProgress,
  } = useLessonProgress({
    lessonId: lesson?.id || '',
    subjectId: resolvedSubjectId,
    actualSectionIds,
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
        id: `asmt_${lesson.id}`,
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

  // Multi-videos extraction
  const multiVideos: any[] = useMemo(() => {
    if (!lesson) return []
    const vList = (lesson as any).videos
    if (Array.isArray(vList) && vList.length > 0) return vList
    if (lesson.video?.hasVideo && (lesson.video.youtubeId || lesson.video.videoUrl)) {
      return [
        {
          id: 'vid_main',
          title: lesson.title,
          youTubeVideoId: lesson.video.youtubeId,
          videoUrl: lesson.video.videoUrl,
          durationSeconds: lesson.video.durationSeconds,
        },
      ]
    }
    return []
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

  const hasVideoContent =
    multiVideos.length > 0 ||
    (lesson.video?.hasVideo && (lesson.video.youtubeId || lesson.video.videoUrl))

  const handleScrollToSection = useCallback((sectionId: string) => {
    const el = document.querySelector(`[data-section-id="${sectionId}"]`) || document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

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
            <span className="lesson-xp-badge">
              <Sparkles size={13} aria-hidden /> +{lesson.xp} XP
            </span>
          </div>
          <div className="lesson-progress-bar-wrap">
            <LessonProgressBar progressPercent={overallProgress} />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. VIDEO BÀI GIẢNG (16:9, responsive, fullscreen, no-autoplay) */}
        {/* ============================================================ */}
        <section
          className="lesson-video-section"
          aria-label="Video bài giảng"
          data-section-id="video-lecture"
          id="video-lecture"
          ref={(el) => registerSection('video-lecture', el)}
        >
          {hasVideoContent ? (
            <LessonVideoPlayer
              video={lesson.video}
              videos={(lesson as any).videos}
              lessonTitle={lesson.title}
              sourceReferenceUrl={lesson.sourceReferenceUrl}
              onAskAI={(v) => handleAskAIVideo(v)}
            />
          ) : (
            <div className="lesson-video-unavailable" role="status">
              <div>
                <strong>Bài học chưa có video phát trực tiếp</strong>
                <p>Video bài giảng sẽ được cập nhật sớm. Bạn có thể hỏi AI Tutor về kiến thức bài học.</p>
              </div>
              <button
                type="button"
                className="btn-ask-ai-contextual"
                onClick={() => handleAskAIVideo()}
                title="Hỏi AI Tutor về bài học này"
              >
                <Bot size={14} aria-hidden />
                <span>Hỏi AI Tutor về bài học</span>
              </button>
            </div>
          )}
        </section>

        {/* ============================================================ */}
        {/* 5. DANH SÁCH VIDEO NẾU BÀI CÓ NHIỀU VIDEO */}
        {/* ============================================================ */}
        {multiVideos.length > 1 && (
          <section className="lesson-multi-video-list" aria-label="Danh sách video bài giảng">
            <h3 className="multi-video-heading">
              <Play size={15} aria-hidden /> Danh sách video bài giảng ({multiVideos.length} phần)
            </h3>
            <div className="multi-video-grid">
              {multiVideos.map((v: any, idx: number) => (
                <div key={v.id || idx} className="multi-video-item">
                  <span className="video-index-badge">{idx + 1}</span>
                  <div className="video-item-info">
                    <strong className="video-item-title">{v.title || `Video phần ${idx + 1}`}</strong>
                    {v.durationSeconds && (
                      <span className="video-item-duration">
                        {Math.max(1, Math.round(v.durationSeconds / 60))} phút
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-ask-ai-contextual"
                    onClick={() => handleAskAIVideo(v)}
                    title={`Hỏi AI Tutor về ${v.title || 'video'}`}
                  >
                    <Bot size={12} aria-hidden />
                    <span>Hỏi AI</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* 6. CÔNG CỤ GHI CHÚ VÀ LƯU BÀI */}
        {/* ============================================================ */}
        <section className="lesson-tools-toolbar" aria-label="Công cụ ghi chú và lưu bài">
          <div className="lesson-tools-left">
            <Button
              variant="outline"
              size="md"
              icon={FileText}
              onClick={() => setNotesPanelOpen((prev) => !prev)}
              aria-label="Mở ghi chú cá nhân"
            >
              Ghi chú {notes.length > 0 ? `(${notes.length})` : ''}
            </Button>

            <Button
              variant={isBookmarked ? 'outline' : 'ghost'}
              size="md"
              icon={isBookmarked ? BookmarkCheck : Bookmark}
              onClick={toggleBookmark}
              aria-label={isBookmarked ? 'Bỏ lưu bài học' : 'Lưu bài học'}
            >
              {isBookmarked ? 'Đã lưu bài' : 'Lưu bài'}
            </Button>
          </div>

          <div className="lesson-tools-right">
            <Button
              variant="ghost"
              size="md"
              icon={Bot}
              onClick={() => handleAskAIVideo()}
              className="btn-toolbar-ai"
              title="Hỏi AI Tutor về bài học này"
            >
              Hỏi AI Tutor
            </Button>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 7. BÀI TẬP THU HOẠCH (Collapsible Accordion, Mặc định thu gọn) */}
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
              <button
                type="button"
                className="btn-ask-ai-contextual"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAskAIPractice()
                }}
                title="Hỏi AI Tutor gợi ý cách làm bài tập thu hoạch"
              >
                <Bot size={13} aria-hidden />
                <span>Hỏi AI Tutor</span>
              </button>
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
        {/* 8. ĐIỀU HƯỚNG BÀI TRƯỚC / BÀI TIẾP THEO (Navigation ở cuối trang) */}
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

      {/* Lesson Notes & Bookmarks Right Panel Drawer */}
      <LessonNotesPanel
        isOpen={notesPanelOpen}
        onClose={() => setNotesPanelOpen(false)}
        lessonId={lesson.id}
        subjectId={resolvedSubjectId}
        lessonTitle={lesson.title}
        subjectName={lesson.subjectName || 'Môn học'}
        sections={sectionsList}
        onScrollToSection={handleScrollToSection}
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
