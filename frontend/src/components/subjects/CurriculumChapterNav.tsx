import { Progress } from '@/components/ui/Progress'
import type { SubjectChapter } from '@/types/subject'

export interface ChapterWithStats extends SubjectChapter {
  totalLessons: number
  completedLessons: number
  inProgressLessons: number
  progressPercent: number
}

export interface CurriculumChapterNavProps {
  chapters: ChapterWithStats[]
  selectedChapterId: string
  onSelectChapter: (chapterId: string) => void
  activeTab: 'all' | 'in-progress'
}

export function CurriculumChapterNav({
  chapters,
  selectedChapterId,
  onSelectChapter,
  activeTab,
}: CurriculumChapterNavProps) {
  return (
    <nav
      className="curriculum-chapter-panel"
      aria-label="Danh sách chương giáo trình"
    >
      <div className="chapter-panel-header">
        <h2 className="chapter-panel-title">DANH SÁCH CHƯƠNG</h2>
        <span className="chapter-count-badge">
          {chapters.length} chương {activeTab === 'in-progress' ? 'đang học' : ''}
        </span>
      </div>

      <div className="chapter-nav-list" role="list">
        {chapters.map((chap, idx) => {
          const isSelected = chap.id === selectedChapterId
          const chapterNumber = chap.chapterNumber || idx + 1

          return (
            <button
              key={chap.id}
              type="button"
              className={`chapter-nav-item ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectChapter(chap.id)}
              aria-current={isSelected ? 'true' : undefined}
            >
              <div className="chapter-item-top">
                <span className="chapter-item-number">Chương {chapterNumber}</span>
                <span className="chapter-item-stats">
                  {chap.completedLessons} / {chap.totalLessons} bài
                  {chap.progressPercent > 0 && ` · ${chap.progressPercent}%`}
                </span>
              </div>

              <h3 className="chapter-item-title">{chap.title.replace(/^Chương\s*\d+[:·\s-]*/i, '')}</h3>

              <div className="chapter-item-progress">
                <Progress value={chap.progressPercent} height={4} />
              </div>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
