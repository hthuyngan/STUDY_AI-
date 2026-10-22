import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, Lock, Play, Search, SlidersHorizontal } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSubjectDetail } from '@/hooks/useSubjects'
import type { LessonFilter, SubjectLessonItem } from '@/types/subject'
import './SubjectDetailPage.css'

export function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { subject, isLoading, error, reload } = useSubjectDetail(subjectId)

  // Filter state synced with URL search params
  const activeTab = (searchParams.get('view') === 'in-progress' ? 'in-progress' : 'all') as LessonFilter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all')

  const handleTabChange = (tab: LessonFilter) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (tab === 'all') {
        next.delete('view')
      } else {
        next.set('view', tab)
      }
      return next
    })
  }

  // All lessons flat list
  const allLessons = useMemo(() => {
    if (!subject) return []
    return subject.chapters.flatMap((ch) =>
      ch.lessons.map((l) => ({
        ...l,
        chapterId: ch.id,
        chapterTitle: ch.title,
      }))
    )
  }, [subject])

  // Count in-progress
  const inProgressCount = useMemo(() => {
    return allLessons.filter((l) => l.status === 'in-progress').length
  }, [allLessons])

  // Find primary continue lesson
  const continueLesson = useMemo(() => {
    const inProg = allLessons.find((l) => l.status === 'in-progress')
    if (inProg) return inProg
    const avail = allLessons.find((l) => l.status === 'available')
    return avail || allLessons[0]
  }, [allLessons])

  // Filtered chapters for "all" tab
  const filteredChapters = useMemo(() => {
    if (!subject) return []
    const query = searchQuery.trim().toLowerCase()

    return subject.chapters
      .filter((chap) => {
        if (selectedChapterId !== 'all' && chap.id !== selectedChapterId) {
          return false
        }
        return true
      })
      .map((chap) => {
        const chapMatches = chap.title.toLowerCase().includes(query)
        const lessons = chap.lessons.filter((l) => {
          if (query && !chapMatches && !l.title.toLowerCase().includes(query)) {
            return false
          }
          return true
        })

        return {
          ...chap,
          lessons,
        }
      })
      .filter((chap) => chap.lessons.length > 0)
  }, [subject, selectedChapterId, searchQuery])

  // Filtered in-progress lessons for "in-progress" tab
  const filteredInProgressLessons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return allLessons.filter((l) => {
      if (l.status !== 'in-progress') return false
      if (selectedChapterId !== 'all' && l.chapterId !== selectedChapterId) return false
      if (
        query &&
        !l.title.toLowerCase().includes(query) &&
        !(l.chapterTitle && l.chapterTitle.toLowerCase().includes(query))
      ) {
        return false
      }
      return true
    })
  }, [allLessons, selectedChapterId, searchQuery])

  if (isLoading) {
    return (
      <div className="subject-detail-root">
        <Skeleton variant="text" width={220} height={16} />
        <div className="subject-detail-header-skeleton">
          <Skeleton variant="rect" width="100%" height={160} />
        </div>
        <div className="subject-toolbar-skeleton">
          <Skeleton variant="rect" width="100%" height={48} />
        </div>
        <div className="chapter-skeleton">
          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="rect" width="100%" height={200} />
        </div>
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="subject-detail-root">
        <Breadcrumb items={[{ label: 'Môn học', to: '/subjects' }, { label: 'Chi tiết' }]} />
        <PageErrorState description={error || 'Không tìm thấy môn học'} onRetry={reload} />
      </div>
    )
  }

  const curriculumTag = subject.curriculumLabel || 'Giáo trình SGK'

  return (
    <div className="subject-detail-root">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Môn học', to: '/subjects' },
          { label: subject.name },
        ]}
      />

      {/* Header / Hero */}
      <header className="subject-header-card">
        <div className="subject-header-main">
          <div
            className="subject-large-icon"
            style={{ backgroundColor: subject.bgColor, color: subject.color }}
            aria-hidden
          >
            {subject.icon}
          </div>

          <div className="subject-header-text">
            <div className="subject-grade-tag">
              {subject.grade} · {curriculumTag}
            </div>
            <h1 className="subject-title">{subject.name}</h1>
            <p className="subject-subtitle">
              {subject.description || 'Theo dõi tiến độ học tập theo từng chương và bài.'}
            </p>
          </div>
        </div>

        <div className="subject-header-stats">
          <div className="progress-stat-row">
            <div className="stat-item">
              <span className="stat-label">Tiến độ giáo trình</span>
              <span className="stat-val">{subject.progress}%</span>
            </div>
            <div className="stat-item text-right">
              <span className="stat-label">Số bài học</span>
              <span className="stat-val">
                {subject.completedLessons} / {subject.totalLessons} bài
              </span>
            </div>
          </div>

          <Progress value={subject.progress} height={8} />

          {continueLesson && (
            <div className="subject-cta-wrap">
              <Button
                variant="primary"
                icon={Play}
                fullWidth
                onClick={() =>
                  navigate(`/subjects/${subject.id}/lessons/${continueLesson.id}`)
                }
              >
                Tiếp tục bài đang học
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Filter Toolbar — No nested cards, clean flat bar */}
      <div className="subject-filter-toolbar">
        {/* Segmented Tabs */}
        <div className="filter-segmented-tabs" role="tablist" aria-label="Bộ lọc bài học">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`segmented-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            <span>Tất cả bài học</span>
            <span className="tab-count-badge">{allLessons.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'in-progress'}
            className={`segmented-tab-btn ${activeTab === 'in-progress' ? 'active' : ''}`}
            onClick={() => handleTabChange('in-progress')}
          >
            <span>Đang học dở</span>
            <span className="tab-count-badge">{inProgressCount}</span>
          </button>
        </div>

        {/* Controls: Search + Chapter select */}
        <div className="filter-controls-group">
          {/* Search Input */}
          <div className="lesson-search-box">
            <Search size={16} className="search-icon" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bài học trong giáo trình..."
              className="lesson-search-input"
              aria-label="Tìm bài học trong giáo trình..."
            />
          </div>

          {/* Chapter Select */}
          <div className="chapter-select-box">
            <SlidersHorizontal size={14} className="select-icon" aria-hidden />
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="chapter-select"
              aria-label="Lọc theo chương"
            >
              <option value="all">Tất cả chương</option>
              {subject.chapters.map((chap, idx) => (
                <option key={chap.id} value={chap.id}>
                  {chap.title.split(/[:·]/)[0].trim() || `Chương ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'in-progress' ? (
        /* TAB 2: Đang học dở */
        <div className="in-progress-view-wrap">
          {filteredInProgressLessons.length === 0 ? (
            <EmptyState
              icon={Play}
              title="Bạn chưa có bài học nào đang học dở."
              description="Bắt đầu một bài học mới trong giáo trình nhé."
              actionLabel="Xem tất cả bài học"
              onAction={() => {
                handleTabChange('all')
                setSearchQuery('')
                setSelectedChapterId('all')
              }}
            />
          ) : (
            <div className="in-progress-list">
              {filteredInProgressLessons.map((lesson: SubjectLessonItem) => (
                <div key={lesson.id} className="in-progress-card-item">
                  <div className="in-progress-meta-row">
                    <span className="in-progress-chapter-badge">
                      {lesson.chapterTitle || 'Chương 1'}
                    </span>
                    <span className="in-progress-duration">{lesson.durationMinutes} phút</span>
                  </div>

                  <h3 className="in-progress-title">
                    <Link
                      to={`/subjects/${subject.id}/lessons/${lesson.id}`}
                      className="in-progress-title-link"
                    >
                      {lesson.title}
                    </Link>
                  </h3>

                  <div className="in-progress-progress-row">
                    <div className="in-progress-bar-wrap">
                      <Progress value={lesson.progress || 0} height={7} />
                    </div>
                    <span className="in-progress-percent">{lesson.progress || 0}%</span>
                  </div>

                  <div className="in-progress-action-row">
                    <Button
                      variant="primary"
                      icon={Play}
                      onClick={() =>
                        navigate(`/subjects/${subject.id}/lessons/${lesson.id}`)
                      }
                    >
                      Học tiếp
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAB 1: Tất cả bài học (theo cấu trúc SGK) */
        <div className="chapters-container">
          {filteredChapters.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Không tìm thấy bài học phù hợp"
              description={`Không có bài học nào khớp với điều kiện tìm kiếm "${searchQuery}".`}
              actionLabel="Xóa bộ lọc tìm kiếm"
              onAction={() => {
                setSearchQuery('')
                setSelectedChapterId('all')
              }}
            />
          ) : (
            filteredChapters.map((chapter) => (
              <section key={chapter.id} className="chapter-section">
                <div className="chapter-header">
                  <div className="chapter-header-main">
                    <h2 className="chapter-title">{chapter.title}</h2>
                    {chapter.description && (
                      <p className="chapter-desc">{chapter.description}</p>
                    )}
                  </div>
                  <span className="chapter-lesson-count">
                    {chapter.lessons.length} bài
                  </span>
                </div>

                {/* Lesson rows with divider */}
                <div className="lesson-list-container">
                  {chapter.lessons.map((lesson) => {
                    const isLocked = lesson.status === 'locked'
                    const isCompleted = lesson.status === 'completed'
                    const isInProgress = lesson.status === 'in-progress'
                    const lessonUrl = `/subjects/${subject.id}/lessons/${lesson.id}`

                    return (
                      <div
                        key={lesson.id}
                        className={`lesson-list-row ${isLocked ? 'is-locked' : ''} ${isInProgress ? 'is-active' : ''}`}
                      >
                        {/* Status Icon */}
                        <div className="lesson-status-col" aria-hidden>
                          {isCompleted && (
                            <CheckCircle2 size={18} className="status-icon completed" />
                          )}
                          {isInProgress && (
                            <Play size={15} className="status-icon in-progress" />
                          )}
                          {lesson.status === 'available' && (
                            <div className="status-dot available" />
                          )}
                          {isLocked && (
                            <Lock size={15} className="status-icon locked" />
                          )}
                        </div>

                        {/* Title, duration, progress info */}
                        <div className="lesson-info-col">
                          <Link
                            to={isLocked ? '#' : lessonUrl}
                            className={`lesson-title-link ${isLocked ? 'disabled' : ''}`}
                            tabIndex={isLocked ? -1 : 0}
                          >
                            {lesson.title}
                          </Link>
                          <div className="lesson-meta-sub">
                            <span className="lesson-duration">{lesson.durationMinutes} phút</span>
                            {isInProgress && typeof lesson.progress === 'number' && (
                              <span className="lesson-progress-badge">
                                Đã học {lesson.progress}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Column */}
                        <div className="lesson-action-col">
                          {isLocked ? (
                            <span className="locked-label">Khóa</span>
                          ) : (
                            <Link
                              to={lessonUrl}
                              className={`lesson-action-btn ${isInProgress ? 'is-in-progress-cta' : ''}`}
                              aria-label={`Mở bài học: ${lesson.title}`}
                            >
                              <span className="action-text">
                                {isCompleted ? 'Ôn lại' : isInProgress ? 'Học tiếp' : 'Bắt đầu'}
                              </span>
                              <ChevronRight size={15} aria-hidden />
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default SubjectDetailPage
