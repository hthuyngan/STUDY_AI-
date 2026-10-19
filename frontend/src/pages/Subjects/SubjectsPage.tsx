import { useState } from 'react'
import { ArrowRight, BookOpen, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSubjects } from '@/hooks/useSubjects'
import './SubjectsPage.css'

export function SubjectsPage() {
  const { subjects, isLoading, error, reload } = useSubjects()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="subjects-page-root">
        <div className="page-header-simple">
          <Skeleton variant="text" width={200} height={28} />
          <Skeleton variant="text" width={320} height={16} />
        </div>
        <div className="subjects-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="subject-card-skeleton">
              <Skeleton variant="circle" width={48} height={48} />
              <div className="skeleton-lines">
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="40%" height={14} />
                <Skeleton variant="rect" width="100%" height={8} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="subjects-page-root">
        <PageErrorState description={error} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="subjects-page-root">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Môn học của bạn</h1>
          <p className="page-subtitle">Theo dõi tiến độ và lựa chọn chương trình học tập mục tiêu</p>
        </div>

        {/* Search */}
        <div className="subject-search-box">
          <Search size={16} className="search-icon" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm môn học..."
            className="subject-search-input"
            aria-label="Tìm kiếm môn học"
          />
        </div>
      </div>

      {filteredSubjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Không tìm thấy môn học"
          description={`Không có môn học nào khớp với từ khóa "${searchQuery}".`}
          actionLabel="Xóa bộ lọc tìm kiếm"
          onAction={() => setSearchQuery('')}
        />
      ) : (
        <div className="subjects-grid">
          {filteredSubjects.map((sub) => (
            <Card key={sub.id} className="subject-item-card">
              <div className="subject-card-top">
                <div
                  className="subject-brand-icon"
                  style={{ backgroundColor: sub.bgColor, color: sub.color }}
                  aria-hidden
                >
                  {sub.icon}
                </div>
                <div className="subject-card-meta">
                  <div className="subject-badge-grade">{sub.grade}</div>
                  <h2 className="subject-name">{sub.name}</h2>
                </div>
              </div>

              <p className="subject-desc">{sub.description}</p>

              {sub.currentChapter && (
                <div className="subject-current-chap">
                  <span className="current-chap-label">Đang học:</span>
                  <span className="current-chap-text">{sub.currentChapter}</span>
                </div>
              )}

              <div className="subject-card-progress">
                <div className="progress-labels">
                  <span className="lesson-count-label">
                    {sub.completedLessons} / {sub.totalLessons} bài
                  </span>
                  <span className="percentage-label">{sub.progress}%</span>
                </div>
                <Progress value={sub.progress} height={6} />
              </div>

              <div className="subject-card-footer">
                <Link to={`/subjects/${sub.id}`} className="w-full">
                  <Button variant="outline" icon={ArrowRight} fullWidth>
                    Vào môn học
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default SubjectsPage
