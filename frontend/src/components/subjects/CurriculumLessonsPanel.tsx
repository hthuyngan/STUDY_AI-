import { BookOpen, Search } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import type { SubjectLessonItem } from '@/types/subject'
import type { ChapterWithStats } from './CurriculumChapterNav'
import { CurriculumLessonRow } from './CurriculumLessonRow'

export interface CurriculumLessonsPanelProps {
  chapter: ChapterWithStats | null
  lessons: SubjectLessonItem[]
  subjectId: string
  searchQuery: string
  onClearSearch: () => void
  activeTab: 'all' | 'in-progress'
}

export function CurriculumLessonsPanel({
  chapter,
  lessons,
  subjectId,
  searchQuery,
  onClearSearch,
  activeTab,
}: CurriculumLessonsPanelProps) {
  if (!chapter) {
    return (
      <section className="curriculum-lessons-panel" aria-label="Nội dung chương">
        <div className="lessons-panel-empty-wrap">
          <EmptyState
            icon={BookOpen}
            title="Chưa chọn chương"
            description="Vui lòng chọn một chương từ danh sách để xem bài học."
          />
        </div>
      </section>
    )
  }

  const completedCount = chapter.lessons.filter((l) => l.status === 'completed').length
  const totalCount = chapter.lessons.length

  return (
    <section className="curriculum-lessons-panel" aria-label="Nội dung chương">
      {/* Chapter Panel Header */}
      <header className="lessons-panel-header">
        <div className="lessons-panel-header-text">
          <div className="lessons-panel-tag">
            <span>Chương {chapter.chapterNumber || 1}</span>
            <span className="dot" aria-hidden>·</span>
            <span>Giáo trình chuẩn</span>
          </div>

          <h2 className="lessons-panel-title">{chapter.title}</h2>

          {chapter.description && (
            <p className="lessons-panel-desc">{chapter.description}</p>
          )}
        </div>

        <div className="lessons-panel-stats-badge">
          <span className="stats-highlight">{lessons.length} bài</span>
          <span className="stats-sub">
            {activeTab === 'in-progress' ? 'đang học' : `${completedCount} / ${totalCount} đã xong`}
          </span>
        </div>
      </header>

      {/* Lesson List Surface */}
      <div className="lessons-panel-list-surface">
        {lessons.length === 0 ? (
          <div className="lessons-panel-search-empty">
            <EmptyState
              icon={Search}
              title="Không tìm thấy bài học phù hợp"
              description={`Không có bài học nào trong ${chapter.title.split(/[:·]/)[0]} khớp với "${searchQuery}".`}
              actionLabel="Xóa bộ lọc tìm kiếm"
              onAction={onClearSearch}
            />
          </div>
        ) : chapter.topics && chapter.topics.length > 0 ? (
          chapter.topics.map((topic, tIdx) => {
            const topicLessons = lessons.filter((l) => l.topicId === topic.id)
            if (topicLessons.length === 0 && searchQuery) return null
            return (
              <div key={topic.id} className="curriculum-topic-group" style={{ marginBottom: '1.25rem' }}>
                <div
                  className="curriculum-topic-header"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--color-bg-secondary, #f8fafc)',
                    borderRadius: '8px',
                    margin: '0.75rem 0 0.5rem 0',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary, #475569)',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary, #2563eb)',
                    }}
                  />
                  <span>Chủ đề {tIdx + 1}: {topic.title}</span>
                </div>
                {topicLessons.map((lesson, idx) => (
                  <CurriculumLessonRow
                    key={lesson.id}
                    lesson={lesson}
                    indexInChapter={idx}
                    subjectId={subjectId}
                  />
                ))}
              </div>
            )
          })
        ) : (
          lessons.map((lesson, idx) => (
            <CurriculumLessonRow
              key={lesson.id}
              lesson={lesson}
              indexInChapter={idx}
              subjectId={subjectId}
            />
          ))
        )}
      </div>
    </section>
  )
}
