import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lightbulb,
  List,
  Sparkles,
  Target,
} from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AssessmentModal } from '@/components/assessment/AssessmentModal'
import { LessonAssessmentCard } from '@/components/assessment/LessonAssessmentCard'
import {
  CommonMistakesBlock,
  DefinitionBlock,
  ExampleBlock,
  FormulaBlock,
  ImportantNote,
  LessonHeading,
  LessonParagraph,
  LessonSummaryBlock,
} from '@/components/lesson/LessonBlocks'
import { FunctionGraph } from '@/components/lesson/FunctionGraph'
import { VariationTable } from '@/components/lesson/VariationTable'
import { LessonBottomBar } from '@/components/lesson/LessonBottomBar'
import { LessonNotesPanel } from '@/components/lesson/LessonNotesPanel'
import { LessonProgressBar } from '@/components/lesson/LessonProgressBar'
import { LessonSectionBookmarkBtn } from '@/components/lesson/LessonSectionBookmarkBtn'
import { LessonSectionProgress } from '@/components/lesson/LessonSectionProgress'
import { LessonSidebar } from '@/components/lesson/LessonSidebar'
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
import { learningProgressRepository } from '@/repositories/learningProgress.repository'
import { learningContextService } from '@/services/learningContext.service'
import { lessonProgressService } from '@/services/lessonProgress.service'
import type { AssessmentOption, AssessmentQuestion, LessonAssessment } from '@/types/assessment'
import type { TutorContextSource, TutorLearningContext } from '@/types/aiTutor'
import './LessonPage.css'

export function LessonPage() {
  const { subjectId: paramSubjectId, courseId: paramCourseId, lessonId } = useParams<{
    subjectId?: string
    courseId?: string
    lessonId: string
  }>()
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notesPanelOpen, setNotesPanelOpen] = useState(false)

  // Unified Overview Accordion sections (Overview & Theory open by default, Examples & Practice ready)
  const [accordionState, setAccordionState] = useState<{
    overview: boolean
    theory: boolean
    examples: boolean
    practice: boolean
  }>({
    overview: true,
    theory: true,
    examples: false,
    practice: true,
  })

  const toggleAccordion = useCallback((key: 'overview' | 'theory' | 'examples' | 'practice') => {
    setAccordionState((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const { openChat } = useAiChat()

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

  // Identify all valid learning sections from current lesson content for progress tracking
  const actualSectionIds: string[] = []
  if (lesson?.content?.introduction) actualSectionIds.push('introduction')
  if ((lesson?.content?.definitions?.length ?? 0) > 0) actualSectionIds.push('definitions')
  if ((lesson?.content?.formulas?.length ?? 0) > 0) actualSectionIds.push('formulas')
  if ((lesson?.content?.variationTables?.length ?? 0) > 0) actualSectionIds.push('variation-tables')
  if ((lesson?.content?.examples?.length ?? 0) > 0) actualSectionIds.push('examples')
  if ((lesson?.content?.functionGraphs?.length ?? 0) > 0) actualSectionIds.push('function-graphs')
  if ((lesson?.content?.commonMistakes?.length ?? 0) > 0 || (lesson?.content?.importantNotes?.length ?? 0) > 0) {
    actualSectionIds.push('important-notes')
  }
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
    if ((lesson?.content?.variationTables?.length ?? 0) > 0) {
      list.push({ id: 'variation-tables', title: 'Bảng biến thiên sư phạm' })
    }
    if ((lesson?.content?.examples?.length ?? 0) > 0) {
      list.push({ id: 'examples', title: 'Ví dụ mẫu & Phương pháp giải' })
    }
    if ((lesson?.content?.functionGraphs?.length ?? 0) > 0) {
      list.push({ id: 'function-graphs', title: 'Đồ thị hình học toán học' })
    }
    if ((lesson?.content?.commonMistakes?.length ?? 0) > 0 || (lesson?.content?.importantNotes?.length ?? 0) > 0) {
      list.push({ id: 'important-notes', title: 'Bẫy đề thi & Lưu ý cần nhớ' })
    }
    if ((lesson?.content?.summaryPoints?.length ?? 0) > 0) {
      list.push({ id: 'summary', title: 'Tổng kết kiến thức bài học' })
    }
    return list
  }, [lesson])

  // Contextual AI Tutor Trigger for Video Area
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
      learningContextService.setContext(context)
      openChat(context, 'Giải thích nội dung video này')
    },
    [lesson, resolvedSubjectId, openChat]
  )

  // Contextual AI Tutor Trigger for Unified Overview Sections
  const handleAskAISection = useCallback(
    (
      sectionType: 'overview' | 'theory' | 'examples' | 'practice',
      title: string,
      customPrompt?: string,
      excerpt?: string
    ) => {
      if (!lesson) return
      const mappedSource: TutorContextSource =
        sectionType === 'overview'
          ? 'lesson-overview'
          : sectionType === 'theory'
            ? 'lesson-theory'
            : sectionType === 'examples'
              ? 'lesson-example'
              : 'lesson-practice'

      const mappedType = sectionType === 'examples' ? 'example' : sectionType

      const context: TutorLearningContext = {
        source: mappedSource,
        sectionType: mappedType,
        lessonId: lesson.id,
        subjectId: resolvedSubjectId,
        lessonTitle: lesson.title,
        subjectName: lesson.subjectName || 'Toán học',
        chapterTitle: lesson.chapterTitle,
        sectionId: sectionType,
        sectionTitle: title,
        title: `${title} · ${lesson.title}`,
        excerpt: excerpt ? excerpt.slice(0, 300) : undefined,
        returnUrl: window.location.pathname,
      }

      const defaultPrompt =
        customPrompt ||
        (sectionType === 'overview'
          ? 'Tóm tắt kiến thức trọng tâm của bài'
          : sectionType === 'theory'
            ? 'Giải thích công thức này dễ hiểu hơn'
            : sectionType === 'examples'
              ? 'Hướng dẫn em giải ví dụ này từng bước'
              : 'Gợi ý cho em cách bắt đầu câu hỏi này')

      learningContextService.setContext(context)
      openChat(context, defaultPrompt)
    },
    [lesson, resolvedSubjectId, openChat]
  )

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

  // Fetch real published assessment questions from StudyAIDb via Curriculum API (Zero-Leak)
  const [assessment, setAssessment] = useState<LessonAssessment | null>(null)

  useEffect(() => {
    if (!lesson) return

    let isMounted = true
    curriculumService
      .getLessonQuestions(lesson.id)
      .then((rawQuestions) => {
        if (!isMounted) return
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
      })
      .catch(() => {
        if (!isMounted) return
        setAssessment(null)
      })

    return () => {
      isMounted = false
    }
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

  const hasDefinitions = (lesson.content.definitions?.length ?? 0) > 0
  const hasFormulas = (lesson.content.formulas?.length ?? 0) > 0
  const hasExamples = (lesson.content.examples?.length ?? 0) > 0

  return (
    <div className={`lesson-page-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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

      {/* Main Content Area: Header -> Video -> Tổng quan bài học -> Bottom bar */}
      <main className="lesson-main-content">
        {/* Top Header & Breadcrumb */}
        <div className="lesson-top-bar">
          <Breadcrumb
            items={[
              { label: 'Môn học', to: '/subjects' },
              { label: lesson.subjectName || 'Toán học', to: `/subjects/${resolvedSubjectId}` },
              { label: chapterShortLabel },
              ...(lesson.topicTitle ? [{ label: lesson.topicTitle }] : []),
              { label: lessonShortLabel },
            ]}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="desktop-sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Hiện danh mục giáo trình' : 'Ẩn danh mục (Chế độ đọc tập trung)'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default, #e2e8f0)',
                background: 'var(--surface-card, #fff)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary, #64748b)',
                cursor: 'pointer',
              }}
            >
              {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              <span>{sidebarCollapsed ? 'Hiện mục lục' : 'Thu gọn'}</span>
            </button>

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

        {/* ============================================================ */}
        {/* KHU VỰC 1: VIDEO BÀI GIẢNG (Card đơn giản, 16:9, nút Hỏi AI) */}
        {/* ============================================================ */}
        {((lesson as any).videos?.length > 0 || (lesson.video?.hasVideo && (lesson.video.youtubeId || lesson.video.videoUrl))) ? (
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
              <p>Ưu tiên học lý thuyết và ví dụ bên dưới; video sẽ được bổ sung sau khi xác minh nguồn.</p>
            </div>
            <button
              type="button"
              className="btn-ask-ai-contextual"
              onClick={() => handleAskAIVideo()}
              title="Hỏi AI Tutor về nội dung bài học"
            >
              <Bot size={13} aria-hidden />
              <span>Hỏi AI Tutor về bài học</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* KHU VỰC 2: TỔNG QUAN BÀI HỌC (Card thống nhất với Accordion) */}
        {/* ============================================================ */}
        <section className="lesson-unified-card" aria-label="Tổng quan bài học">
          {/* ---------------------------------------------------------- */}
          {/* MỤC A: GIỚI THIỆU VÀ KIẾN THỨC TRỌNG TÂM */}
          {/* ---------------------------------------------------------- */}
          <div className="accordion-section">
            <div
              className="accordion-header"
              onClick={() => toggleAccordion('overview')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleAccordion('overview')
                }
              }}
              aria-expanded={accordionState.overview}
            >
              <div className="accordion-header-left">
                <div className="accordion-icon-wrap">
                  <Target size={16} aria-hidden />
                </div>
                <h2 className="accordion-title">
                  A. Giới thiệu & Kiến thức trọng tâm
                  <span className="accordion-badge">Chuẩn GDPT 2018</span>
                </h2>
              </div>
              <div className="accordion-header-right">
                <button
                  type="button"
                  className="btn-ask-ai-contextual"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAskAISection('overview', 'Giới thiệu & Kiến thức trọng tâm', 'Tóm tắt kiến thức trọng tâm của bài')
                  }}
                  title="Hỏi AI Tutor tóm tắt trọng tâm bài học"
                >
                  <Bot size={13} aria-hidden />
                  <span>Hỏi AI Tutor</span>
                </button>
                <ChevronDown
                  size={18}
                  className={`accordion-chevron ${accordionState.overview ? 'is-open' : ''}`}
                  aria-hidden
                />
              </div>
            </div>

            {accordionState.overview && (
              <div className="accordion-body">
                {/* Pedagogical Objectives & Competency Skills (GDPT 2018) */}
                {((lesson.learningObjectives && lesson.learningObjectives.length > 0) ||
                  (lesson.skills && lesson.skills.length > 0)) && (
                  <div className="lesson-objectives-card" style={{ marginBottom: '20px' }}>
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
                        <h3 className="lesson-objectives-title">Mục tiêu bài học cần đạt</h3>
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
                        <h4 className="lesson-skills-title">Kỹ năng năng lực cốt lõi</h4>
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

                {/* Summary Points */}
                {lesson.content.summaryPoints.length > 0 && (
                  <div
                    ref={(el) => registerSection('summary', el)}
                    data-section-id="summary"
                    className="lesson-section-block"
                  >
                    <LessonHeading
                      extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      Tổng kết kiến thức trọng tâm
                    </LessonHeading>
                    <LessonSummaryBlock
                      points={lesson.content.summaryPoints}
                      onAskAI={() =>
                        handleAskAISection(
                          'overview',
                          'Tổng kết bài học',
                          'Tóm tắt kiến thức trọng tâm của bài',
                          lesson.content.summaryPoints.join('; ')
                        )
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------- */}
          {/* MỤC B: LÝ THUYẾT VÀ CÔNG THỨC */}
          {/* ---------------------------------------------------------- */}
          <div className="accordion-section">
            <div
              className="accordion-header"
              onClick={() => toggleAccordion('theory')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleAccordion('theory')
                }
              }}
              aria-expanded={accordionState.theory}
            >
              <div className="accordion-header-left">
                <div className="accordion-icon-wrap">
                  <BookOpen size={16} aria-hidden />
                </div>
                <h2 className="accordion-title">
                  B. Lý thuyết & Công thức
                  {hasFormulas && (
                    <span className="accordion-badge">
                      {lesson.content.formulas.length} công thức
                    </span>
                  )}
                </h2>
              </div>
              <div className="accordion-header-right">
                <button
                  type="button"
                  className="btn-ask-ai-contextual"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAskAISection('theory', 'Lý thuyết & Công thức', 'Giải thích công thức này dễ hiểu hơn')
                  }}
                  title="Hỏi AI Tutor giải thích lý thuyết và công thức"
                >
                  <Bot size={13} aria-hidden />
                  <span>Hỏi AI Tutor</span>
                </button>
                <ChevronDown
                  size={18}
                  className={`accordion-chevron ${accordionState.theory ? 'is-open' : ''}`}
                  aria-hidden
                />
              </div>
            </div>

            {accordionState.theory && (
              <div className="accordion-body">
                {/* 1. Definitions */}
                {hasDefinitions && (
                  <div
                    ref={(el) => registerSection('definitions', el)}
                    data-section-id="definitions"
                    className="lesson-section-block"
                  >
                    <LessonHeading
                      extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      <DefinitionBlock
                        key={idx}
                        term={def.term}
                        content={def.content}
                        onAskAI={(term, content) =>
                          handleAskAISection(
                            'theory',
                            `Khái niệm: ${term}`,
                            'Giải thích công thức này dễ hiểu hơn',
                            content
                          )
                        }
                      />
                    ))}
                  </div>
                )}

                {/* 2. Formulas */}
                {hasFormulas && (
                  <div
                    ref={(el) => registerSection('formulas', el)}
                    data-section-id="formulas"
                    className="lesson-section-block"
                  >
                    <LessonHeading
                      extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      <FormulaBlock
                        key={form.id}
                        formula={form}
                        onAskAI={(label, formStr) =>
                          handleAskAISection(
                            'theory',
                            `Công thức: ${label}`,
                            'Giải thích công thức này dễ hiểu hơn',
                            formStr
                          )
                        }
                      />
                    ))}
                  </div>
                )}

                {/* 3. Variation Tables */}
                {lesson.content.variationTables && lesson.content.variationTables.length > 0 && (
                  <div
                    ref={(el) => registerSection('variation-tables', el)}
                    data-section-id="variation-tables"
                    className="lesson-section-block"
                  >
                    <LessonHeading
                      extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <LessonSectionBookmarkBtn
                            lessonId={lesson.id}
                            subjectId={resolvedSubjectId}
                            lessonTitle={lesson.title}
                            subjectName={lesson.subjectName || 'Môn học'}
                            sectionId="variation-tables"
                            sectionTitle="Bảng biến thiên sư phạm"
                          />
                          <LessonSectionProgress
                            progressPercent={getSectionProgress('variation-tables')}
                            isCompleted={isSectionCompleted('variation-tables')}
                          />
                        </div>
                      }
                    >
                      3. Bảng biến thiên sư phạm
                    </LessonHeading>
                    {lesson.content.variationTables.map((vt, idx) => (
                      <VariationTable
                        key={vt.id || `vt-${idx}`}
                        {...vt}
                        onAskAI={(title, summary) =>
                          handleAskAISection(
                            'theory',
                            title,
                            'Giải thích công thức này dễ hiểu hơn',
                            summary
                          )
                        }
                      />
                    ))}
                  </div>
                )}

                {/* 4. Function Graphs */}
                {lesson.content.functionGraphs && lesson.content.functionGraphs.length > 0 && (
                  <div
                    ref={(el) => registerSection('function-graphs', el)}
                    data-section-id="function-graphs"
                    className="lesson-section-block"
                  >
                    <LessonHeading
                      extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <LessonSectionBookmarkBtn
                            lessonId={lesson.id}
                            subjectId={resolvedSubjectId}
                            lessonTitle={lesson.title}
                            subjectName={lesson.subjectName || 'Môn học'}
                            sectionId="function-graphs"
                            sectionTitle="Đồ thị hình học toán học"
                          />
                          <LessonSectionProgress
                            progressPercent={getSectionProgress('function-graphs')}
                            isCompleted={isSectionCompleted('function-graphs')}
                          />
                        </div>
                      }
                    >
                      4. Đồ thị hình học toán học
                    </LessonHeading>
                    {lesson.content.functionGraphs.map((fg, idx) => (
                      <FunctionGraph
                        key={fg.id || `fg-${idx}`}
                        {...fg}
                        onAskAI={(title, summary) =>
                          handleAskAISection(
                            'theory',
                            title,
                            'Giải thích công thức này dễ hiểu hơn',
                            summary
                          )
                        }
                      />
                    ))}
                  </div>
                )}

                {/* 5. Important Notes & Common Mistakes */}
                {(lesson.content.importantNotes.length > 0 ||
                  (lesson.content.commonMistakes && lesson.content.commonMistakes.length > 0)) && (
                  <div
                    ref={(el) => registerSection('important-notes', el)}
                    data-section-id="important-notes"
                    className="lesson-section-block"
                  >
                    <LessonHeading
                      extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      5. Bẫy đề thi & Lưu ý cần nhớ
                    </LessonHeading>

                    {lesson.content.commonMistakes && lesson.content.commonMistakes.length > 0 && (
                      <CommonMistakesBlock
                        mistakes={lesson.content.commonMistakes}
                        onAskAI={(title, detail) =>
                          handleAskAISection('theory', title, 'Giải thích công thức này dễ hiểu hơn', detail)
                        }
                      />
                    )}

                    {lesson.content.importantNotes.length > 0 && (
                      <ImportantNote notes={lesson.content.importantNotes} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------- */}
          {/* MỤC C: VÍ DỤ VÀ BÀI TẬP MẪU */}
          {/* ---------------------------------------------------------- */}
          <div className="accordion-section">
            <div
              className="accordion-header"
              onClick={() => toggleAccordion('examples')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleAccordion('examples')
                }
              }}
              aria-expanded={accordionState.examples}
            >
              <div className="accordion-header-left">
                <div className="accordion-icon-wrap">
                  <Lightbulb size={16} aria-hidden />
                </div>
                <h2 className="accordion-title">
                  C. Ví dụ & Bài tập mẫu
                  <span className="accordion-badge">
                    {lesson.content.examples?.length || 0} ví dụ
                  </span>
                </h2>
              </div>
              <div className="accordion-header-right">
                <button
                  type="button"
                  className="btn-ask-ai-contextual"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAskAISection('examples', 'Ví dụ & Bài tập mẫu', 'Hướng dẫn em giải ví dụ này từng bước')
                  }}
                  title="Hỏi AI Tutor hướng dẫn giải ví dụ mẫu"
                >
                  <Bot size={13} aria-hidden />
                  <span>Hỏi AI Tutor</span>
                </button>
                <ChevronDown
                  size={18}
                  className={`accordion-chevron ${accordionState.examples ? 'is-open' : ''}`}
                  aria-hidden
                />
              </div>
            </div>

            {accordionState.examples && (
              <div className="accordion-body">
                {hasExamples ? (
                  <div
                    ref={(el) => registerSection('examples', el)}
                    data-section-id="examples"
                    className="lesson-section-block"
                  >
                    <LessonHeading
                      extra={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      Ví dụ mẫu & Phương pháp giải từng bước
                    </LessonHeading>
                    {lesson.content.examples.map((ex) => (
                      <ExampleBlock
                        key={ex.id}
                        example={ex}
                        onAskAI={(title, problem) =>
                          handleAskAISection(
                            'examples',
                            `Ví dụ: ${title}`,
                            'Hướng dẫn em giải ví dụ này từng bước',
                            problem
                          )
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="tab-empty-notice">
                    Chưa có ví dụ mẫu cho bài học này. Bạn có thể nhấn Hỏi AI Tutor để yêu cầu AI tạo ví dụ minh họa tự động!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------- */}
          {/* MỤC D: LUYỆN TẬP THU HOẠCH */}
          {/* ---------------------------------------------------------- */}
          <div className="accordion-section">
            <div
              className="accordion-header"
              onClick={() => toggleAccordion('practice')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleAccordion('practice')
                }
              }}
              aria-expanded={accordionState.practice}
            >
              <div className="accordion-header-left">
                <div className="accordion-icon-wrap">
                  <Target size={16} aria-hidden />
                </div>
                <h2 className="accordion-title">
                  D. Luyện tập thu hoạch
                  {isAssessmentCompleted ? (
                    <span className="accordion-badge is-success">Đã hoàn thành</span>
                  ) : (
                    <span className="accordion-badge">Đánh giá hiểu bài</span>
                  )}
                </h2>
              </div>
              <div className="accordion-header-right">
                <button
                  type="button"
                  className="btn-ask-ai-contextual"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAskAISection('practice', 'Luyện tập thu hoạch', 'Gợi ý cho em cách bắt đầu câu hỏi này')
                  }}
                  title="Hỏi AI Tutor gợi ý cách làm bài tập thu hoạch"
                >
                  <Bot size={13} aria-hidden />
                  <span>Hỏi AI Tutor</span>
                </button>
                <ChevronDown
                  size={18}
                  className={`accordion-chevron ${accordionState.practice ? 'is-open' : ''}`}
                  aria-hidden
                />
              </div>
            </div>

            {accordionState.practice && (
              <div className="accordion-body">
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
              </div>
            )}
          </div>
        </section>

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
