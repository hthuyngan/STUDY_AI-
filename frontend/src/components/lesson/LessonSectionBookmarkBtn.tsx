import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useSectionBookmarks } from '@/hooks/useSectionBookmarks'
import './LessonSectionBookmarkBtn.css'

export interface LessonSectionBookmarkBtnProps {
  lessonId: string
  subjectId: string
  lessonTitle: string
  subjectName: string
  sectionId: string
  sectionTitle: string
}

export function LessonSectionBookmarkBtn({
  lessonId,
  subjectId,
  lessonTitle,
  subjectName,
  sectionId,
  sectionTitle,
}: LessonSectionBookmarkBtnProps) {
  const { isBookmarked, toggleBookmark } = useSectionBookmarks(lessonId)
  const bookmarked = isBookmarked(lessonId, sectionId)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleBookmark({
      lessonId,
      subjectId,
      lessonTitle,
      subjectName,
      sectionId,
      sectionTitle,
    })
  }

  return (
    <button
      type="button"
      className={`lesson-section-bookmark-btn ${bookmarked ? 'is-bookmarked' : ''}`}
      onClick={handleToggle}
      aria-label={bookmarked ? `Bỏ lưu đoạn ${sectionTitle}` : `Lưu đoạn ${sectionTitle}`}
      title={bookmarked ? 'Đã lưu đoạn kiến thức này' : 'Lưu đoạn kiến thức này'}
    >
      {bookmarked ? (
        <BookmarkCheck size={16} aria-hidden />
      ) : (
        <Bookmark size={16} aria-hidden />
      )}
      <span className="bookmark-label">{bookmarked ? 'Đã lưu' : 'Lưu đoạn'}</span>
    </button>
  )
}

