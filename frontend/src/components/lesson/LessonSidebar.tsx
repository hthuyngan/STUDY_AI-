import { CheckCircle2, ChevronLeft, Lock, Play, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CourseOutlineChapter } from '@/types/lesson'
import './LessonSidebar.css'

export interface LessonSidebarProps {
  subjectId: string
  subjectTitle: string
  currentLessonId: string
  chapters: CourseOutlineChapter[]
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
  isOpenOnMobile = false,
  onCloseMobile,
  courseId,
  courseTitle,
}: LessonSidebarProps) {
  const activeSubjectId = subjectId || courseId || 'math'
  const activeSubjectTitle = subjectTitle || courseTitle || 'Giáo trình môn học'

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
          {chapters.map((chapter) => (
            <div key={chapter.id} className="sidebar-chapter-group">
              <div className="sidebar-chapter-header">
                <span className="sidebar-chapter-name">{chapter.title}</span>
              </div>

              <div className="sidebar-lessons-nav">
                {chapter.lessons.map((l) => {
                  const isCurrent = l.id === currentLessonId
                  const isCompleted = l.status === 'completed'
                  const isLocked = l.status === 'locked'

                  return (
                    <Link
                      key={l.id}
                      to={isLocked ? '#' : `/subjects/${activeSubjectId}/lessons/${l.id}`}
                      className={`sidebar-lesson-item ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`}
                      onClick={() => {
                        if (!isLocked && onCloseMobile) onCloseMobile()
                      }}
                      tabIndex={isLocked ? -1 : 0}
                    >
                      <div className="item-icon-col" aria-hidden>
                        {isCompleted && <CheckCircle2 size={15} className="status-completed" />}
                        {isCurrent && <Play size={13} className="status-current" />}
                        {!isCompleted && !isCurrent && !isLocked && <div className="status-dot" />}
                        {isLocked && <Lock size={13} className="status-locked" />}
                      </div>

                      <div className="item-text-col">
                        <span className="item-lesson-num">Bài {l.lessonNumber}</span>
                        <span className="item-lesson-title">{l.title}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
