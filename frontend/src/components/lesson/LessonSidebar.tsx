import React, { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Lock,
  Play,
  Target,
  Video,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CourseOutlineChapter, LessonOutlineItem } from '@/types/lesson'
import './LessonSidebar.css'

export interface LessonSidebarProps {
  subjectId: string
  subjectTitle: string
  currentLessonId: string
  chapters: CourseOutlineChapter[]
  currentLessonProgress?: number
  isOpenOnMobile?: boolean
  onCloseMobile?: () => void
  // Legacy alias
  courseId?: string
  courseTitle?: string
}

export function LessonSidebar({
  subjectId,
  subjectTitle,
  currentLessonId,
  chapters,
  currentLessonProgress,
  isOpenOnMobile = false,
  onCloseMobile,
  courseId,
  courseTitle,
}: LessonSidebarProps) {
  const activeSubjectId = subjectId || courseId || 'math'
  const activeSubjectTitle = subjectTitle || courseTitle || 'Giáo trình môn học'
  const activeLessonRef = useRef<HTMLAnchorElement | null>(null)

  // Accordion state: map chapter.id -> boolean (open/close)
  // By default, open the chapter containing currentLessonId and the first chapter
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {}
    chapters.forEach((chap, idx) => {
      const containsActive = chap.lessons.some((l) => l.id === currentLessonId)
      initialState[chap.id] = containsActive || idx === 0
    })
    return initialState
  })

  // Whenever currentLessonId or chapters change, ensure active chapter is expanded
  useEffect(() => {
    chapters.forEach((chap) => {
      if (chap.lessons.some((l) => l.id === currentLessonId)) {
        setOpenChapters((prev) => ({ ...prev, [chap.id]: true }))
      }
    })
  }, [currentLessonId, chapters])

  // Auto-scroll to active lesson on mount/update
  useEffect(() => {
    if (activeLessonRef.current) {
      activeLessonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [currentLessonId, openChapters])

  const toggleChapter = (chapterId: string) => {
    setOpenChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }))
  }

  // Render content type icon
  const renderItemIcon = (l: LessonOutlineItem, isCurrent: boolean, isCompleted: boolean, isLocked: boolean) => {
    if (isCompleted) {
      return <CheckCircle2 size={15} className="status-completed" />
    }
    if (isCurrent) {
      return <Play size={13} className="status-current" />
    }
    if (isLocked) {
      return <Lock size={13} className="status-locked" />
    }
    if (l.contentType === 'video' || l.hasVideo) {
      return <Video size={14} className="type-icon-video" />
    }
    if (l.contentType === 'exercise') {
      return <Target size={14} className="type-icon-exercise" />
    }
    if (l.contentType === 'test') {
      return <CheckSquare size={14} className="type-icon-test" />
    }
    return <FileText size={14} className="type-icon-article" />
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenOnMobile && (
        <div className="lesson-sidebar-backdrop mobile-only" onClick={onCloseMobile} />
      )}

      <aside
        className={`lesson-outline-sidebar ${isOpenOnMobile ? 'mobile-open' : ''}`}
        aria-label="Mục lục bài học trong giáo trình"
      >
        <div className="outline-sidebar-header">
          <div className="header-top-line">
            <Link
              to={`/subjects/${activeSubjectId}`}
              className="back-course-link"
              title="Quay lại giáo trình môn học"
            >
              <ChevronLeft size={16} aria-hidden />
              <span>Giáo trình môn</span>
            </Link>

            {onCloseMobile && (
              <button
                type="button"
                className="close-mobile-btn mobile-only"
                onClick={onCloseMobile}
                aria-label="Đóng danh sách"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <h2 className="sidebar-course-title">{activeSubjectTitle}</h2>
        </div>

        <nav className="outline-sidebar-content scrollbar-clean">
          {chapters.map((chapter) => {
            const isOpen = !!openChapters[chapter.id]
            const total = chapter.lessons.length
            const completedCount = chapter.lessons.filter((l) => l.status === 'completed').length
            const chapterPercent =
              chapter.progressPercent ?? (total > 0 ? Math.round((completedCount / total) * 100) : 0)

            return (
              <div key={chapter.id} className="sidebar-chapter-group">
                {/* Accordion Chapter Header */}
                <button
                  type="button"
                  className={`sidebar-chapter-header-btn ${isOpen ? 'is-open' : ''}`}
                  onClick={() => toggleChapter(chapter.id)}
                  aria-expanded={isOpen}
                >
                  <div className="chapter-header-text">
                    <span className="sidebar-chapter-name">{chapter.title}</span>
                    <span className="sidebar-chapter-counter">
                      {completedCount}/{total} bài ({chapterPercent}%)
                    </span>
                  </div>
                  <div className="chapter-header-arrow">
                    {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </div>
                </button>

                {/* Chapter Progress Bar */}
                <div className="sidebar-chapter-progress-track" aria-hidden="true">
                  <div
                    className="sidebar-chapter-progress-fill"
                    style={{ width: `${chapterPercent}%` }}
                  />
                </div>

                {/* Accordion Chapter Body */}
                {isOpen && (
                  <div className="sidebar-lessons-nav">
                    {chapter.lessons.map((l) => {
                      const isCurrent = l.id === currentLessonId
                      const isCompleted = l.status === 'completed'
                      const isLocked = l.status === 'locked'

                      return (
                        <Link
                          key={l.id}
                          ref={isCurrent ? activeLessonRef : null}
                          to={isLocked ? '#' : `/subjects/${activeSubjectId}/lessons/${l.id}`}
                          className={`sidebar-lesson-item ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`}
                          onClick={() => {
                            if (!isLocked && onCloseMobile) onCloseMobile()
                          }}
                          tabIndex={isLocked ? -1 : 0}
                        >
                          <div className="item-icon-col" aria-hidden>
                            {renderItemIcon(l, isCurrent, isCompleted, isLocked)}
                          </div>

                          <div className="item-text-col">
                            <div className="item-title-row">
                              <span className="item-lesson-num">Bài {l.lessonNumber}</span>
                              {l.contentType === 'video' && (
                                <span className="item-badge-video">Video</span>
                              )}
                              {isCurrent && typeof currentLessonProgress === 'number' && (
                                <span className="sidebar-lesson-progress-badge">
                                  {currentLessonProgress}%
                                </span>
                              )}
                            </div>
                            <span className="item-lesson-title">{l.title}</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
export default LessonSidebar
