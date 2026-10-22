import { useMemo, useState } from 'react'
import { BookOpen, Play, Search, SlidersHorizontal } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CurriculumChapterNav, type ChapterWithStats } from '@/components/subjects/CurriculumChapterNav'
import { CurriculumLessonsPanel } from '@/components/subjects/CurriculumLessonsPanel'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSubjectDetail } from '@/hooks/useSubjects'
import type { LessonFilter } from '@/types/subject'
import './SubjectDetailPage.css'

export function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { subject, isLoading, error, reload } = useSubjectDetail(subjectId)

  // Filter state synced with URL search params
  const activeTab = (searchParams.get('view') === 'in-progress' ? 'in-progress' : 'all') as LessonFilter
  const [searchQuery, setSearchQuery] = useState('')
  const [userSelectedChapterId, setUserSelectedChapterId] = useState<string>('')

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

  // Chapters with computed statistics
  const chaptersWithStats: ChapterWithStats[] = useMemo(() => {
    if (!subject) return []
    return subject.chapters.map((chap) => {
      const total = chap.lessons.length
      const completed = chap.lessons.filter((l) => l.status === 'completed').length
      const inProgress = chap.lessons.filter((l) => l.status === 'in-progress').length
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0

      return {
        ...chap,
        totalLessons: total,
        completedLessons: completed,
        inProgressLessons: inProgress,
        progressPercent: percent,
      }
    })
  }, [subject])

  // All lessons flat count for stats
  const totalAllLessonsCount = useMemo(() => {
    return chaptersWithStats.reduce((acc, ch) => acc + ch.totalLessons, 0)
  }, [chaptersWithStats])

  const totalInProgressCount = useMemo(() => {
    return chaptersWithStats.reduce((acc, ch) => acc + ch.inProgressLessons, 0)
  }, [chaptersWithStats])

  // Chapters available for current active tab
  const availableChapters = useMemo(() => {
    if (activeTab === 'in-progress') {
      return chaptersWithStats.filter((c) => c.inProgressLessons > 0)
    }
    return chaptersWithStats
  }, [chaptersWithStats, activeTab])

  // Find the primary continue lesson for the Hero button
  const primaryContinueLesson = useMemo(() => {
    if (!subject) return null
    for (const chap of subject.chapters) {
      const inProg = chap.lessons.find((l) => l.status === 'in-progress')
      if (inProg) return inProg
    }
    for (const chap of subject.chapters) {
      const avail = chap.lessons.find((l) => l.status === 'available')
      if (avail) return avail
    }
    return subject.chapters[0]?.lessons[0] || null
  }, [subject])

  // Resolve active chapter ID based on selection and search
  const activeChapterId = useMemo(() => {
    if (availableChapters.length === 0) return ''

    const query = searchQuery.trim().toLowerCase()

    // If searching, check if currently selected chapter matches.
    // If not, find the first available chapter that contains matches.
    if (query) {
      const currentCandidate = userSelectedChapterId
        ? availableChapters.find((c) => c.id === userSelectedChapterId)
        : null

      const candidateHasMatch = currentCandidate?.lessons.some((l) => {
        if (activeTab === 'in-progress' && l.status !== 'in-progress') return false
        return (
          l.title.toLowerCase().includes(query) ||
          currentCandidate.title.toLowerCase().includes(query)
        )
      })

      if (candidateHasMatch && currentCandidate) {
        return currentCandidate.id
      }

      // Find first chapter that has a matching lesson
      const match = availableChapters.find((c) =>
        c.lessons.some((l) => {
          if (activeTab === 'in-progress' && l.status !== 'in-progress') return false
          return l.title.toLowerCase().includes(query) || c.title.toLowerCase().includes(query)
        })
      )
      if (match) return match.id
    }

    // Normal selection without search or if search doesn't override
    if (userSelectedChapterId && availableChapters.some((c) => c.id === userSelectedChapterId)) {
      return userSelectedChapterId
    }

    // Default: find chapter containing first in-progress lesson
    const inProgChap = availableChapters.find((c) => c.inProgressLessons > 0)
    if (inProgChap) return inProgChap.id

    // Fallback to first available chapter
    return availableChapters[0].id
  }, [availableChapters, userSelectedChapterId, searchQuery, activeTab])

  // Current active chapter object
  const activeChapter = useMemo(() => {
    return availableChapters.find((c) => c.id === activeChapterId) || null
  }, [availableChapters, activeChapterId])

  // Visible lessons inside the active chapter
  const visibleLessons = useMemo(() => {
    if (!activeChapter) return []
    const query = searchQuery.trim().toLowerCase()

    let list = activeChapter.lessons
    if (activeTab === 'in-progress') {
      list = list.filter((l) => l.status === 'in-progress')
    }

    if (query) {
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(query) ||
          activeChapter.title.toLowerCase().includes(query)
      )
    }

    return list
  }, [activeChapter, activeTab, searchQuery])

  if (isLoading) {
    return (
      <div className="subject-detail-root">
        <Skeleton variant="text" width={220} height={16} />
        <div className="subject-detail-header-skeleton">
          <Skeleton variant="rect" width="100%" height={170} />
        </div>
        <div className="subject-toolbar-skeleton">
          <Skeleton variant="rect" width="100%" height={44} />
        </div>
        <div className="curriculum-main-grid">
          <Skeleton variant="rect" width="100%" height={380} />
          <Skeleton variant="rect" width="100%" height={380} />
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
      {/* 1. Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Môn học', to: '/subjects' },
          { label: subject.name },
        ]}
      />

      {/* 2. Hero Header — Restrained height, generous spacing, Navy Notebook theme */}
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
              {subject.description || 'Chương trình học được sắp xếp theo từng chương và bài.'}
            </p>
          </div>
        </div>

        <div className="subject-header-stats">
          <div className="progress-stat-row">
            <span className="stat-label">TIẾN ĐỘ GIÁO TRÌNH</span>
            <span className="stat-val">{subject.progress}%</span>
          </div>

          <Progress value={subject.progress} height={7} />

          <div className="progress-stat-sub-row">
            <span className="stat-sub-text">
              {subject.completedLessons} / {subject.totalLessons} bài hoàn thành
            </span>
          </div>

          {primaryContinueLesson && (
            <div className="subject-cta-wrap">
              <Button
                variant="primary"
                icon={Play}
                fullWidth
                onClick={() =>
                  navigate(`/subjects/${subject.id}/lessons/${primaryContinueLesson.id}`)
                }
              >
                Tiếp tục bài đang học
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* 3. Toolbar below Hero: Tabs (Left) + Search (Right) */}
      <div className="subject-filter-toolbar">
        {/* Segmented Pill Tabs */}
        <div className="filter-segmented-tabs" role="tablist" aria-label="Bộ lọc bài học">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`segmented-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            <span>Tất cả bài học</span>
            <span className="tab-count-badge">{totalAllLessonsCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'in-progress'}
            className={`segmented-tab-btn ${activeTab === 'in-progress' ? 'active' : ''}`}
            onClick={() => handleTabChange('in-progress')}
          >
            <span>Đang học dở</span>
            <span className="tab-count-badge">{totalInProgressCount}</span>
          </button>
        </div>

        {/* Search Input (Right) */}
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
      </div>

      {/* 4. Mobile Chapter Selector (Shown ONLY on mobile <= 768px to avoid duplicate controls) */}
      <div className="mobile-chapter-select-wrap">
        <label htmlFor="mobile-chapter-select" className="mobile-chapter-label">
          <SlidersHorizontal size={14} aria-hidden />
          <span>Chọn chương:</span>
        </label>
        <select
          id="mobile-chapter-select"
          value={activeChapterId}
          onChange={(e) => setUserSelectedChapterId(e.target.value)}
          className="mobile-chapter-select"
        >
          {availableChapters.map((chap, idx) => (
            <option key={chap.id} value={chap.id}>
              Chương {chap.chapterNumber || idx + 1}: {chap.title.replace(/^Chương\s*\d+[:·\s-]*/i, '')} ({chap.completedLessons}/{chap.totalLessons})
            </option>
          ))}
        </select>
      </div>

      {/* 5. Main Content: 2 Columns on Desktop */}
      {activeTab === 'in-progress' && availableChapters.length === 0 ? (
        <div className="curriculum-empty-full">
          <EmptyState
            icon={BookOpen}
            title="Bạn chưa có bài học nào đang học dở."
            description="Bắt đầu một bài học mới trong giáo trình nhé."
            actionLabel="Xem tất cả bài học"
            onAction={() => {
              handleTabChange('all')
              setSearchQuery('')
            }}
          />
        </div>
      ) : (
        <div className="curriculum-main-grid">
          {/* Cột trái (300px): Danh sách chương */}
          <aside className="curriculum-col-left">
            <CurriculumChapterNav
              chapters={availableChapters}
              selectedChapterId={activeChapterId}
              onSelectChapter={(id) => setUserSelectedChapterId(id)}
              activeTab={activeTab}
            />
          </aside>

          {/* Cột phải (fluid): Danh sách bài học */}
          <main className="curriculum-col-right">
            <CurriculumLessonsPanel
              chapter={activeChapter}
              lessons={visibleLessons}
              subjectId={subject.id}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
              activeTab={activeTab}
            />
          </main>
        </div>
      )}
    </div>
  )
}

export default SubjectDetailPage
