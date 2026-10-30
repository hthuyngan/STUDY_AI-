import { useState } from 'react'
import { ArrowRight, BookOpen, Bot, Search, Sparkles } from 'lucide-react'
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
  const [selectedGrade, setSelectedGrade] = useState('all')

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesGrade = selectedGrade === 'all' || s.grade === selectedGrade
    return matchesSearch && matchesGrade
  })

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
          <h1 className="page-title">Môn học</h1>
          <p className="page-subtitle">Học theo giáo trình chuẩn và theo dõi tiến độ của từng môn.</p>
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
            aria-label="Tìm môn học..."
          />
        </div>
      </div>

      {/* Grade filter tabs & AI Tutor Banner */}
      <div className="subject-toolbar-row">
        <div className="subject-grade-tabs" role="tablist" aria-label="Lọc theo khối lớp">
          {[
            { id: 'all', label: 'Tất cả khối' },
            { id: 'Lớp 12', label: 'Lớp 12' },
            { id: 'Lớp 11', label: 'Lớp 11' },
            { id: 'Lớp 10', label: 'Lớp 10' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selectedGrade === item.id}
              onClick={() => setSelectedGrade(item.id)}
              className={`subject-grade-pill ${selectedGrade === item.id ? 'active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Learning Assistant Callout */}
      <div className="subject-ai-banner">
        <div className="subject-ai-banner-text">
          <div className="subject-ai-tag">
            <Bot size={14} aria-hidden />
            <span>AI TUTOR HỌC TẬP</span>
          </div>
          <h2 className="subject-ai-title">Gặp câu hỏi khó hoặc chưa hiểu bài?</h2>
          <p className="subject-ai-subtitle">
            Hỏi gia sư AI để nhận hướng dẫn giải từng bước, giải thích trực quan và tóm tắt công thức trọng tâm.
          </p>
        </div>
        <Link to="/ai-tutor" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <Button variant="primary" icon={Sparkles}>
            Hỏi AI ngay
          </Button>
        </Link>
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
                  <div className="subject-badge-grade">
                    {sub.grade} · {sub.curriculumLabel || 'Giáo trình SGK'}
                  </div>
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
                <div className="subject-card-actions-grid">
                  <Link to={`/subjects/${sub.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" icon={ArrowRight} fullWidth>
                      Mở giáo trình
                    </Button>
                  </Link>
                  <Link to={`/ai-tutor?topic=${encodeURIComponent(sub.name)}`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" icon={Bot} fullWidth>
                      Hỏi AI
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default SubjectsPage
