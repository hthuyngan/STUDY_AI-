import { useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, Clock, Search } from 'lucide-react'
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
  const [selectedGrade, setSelectedGrade] = useState<'all' | '10' | '11' | '12'>('all')

  const mathSubjects = subjects.filter((s) => {
    return /toán|math/i.test(s.name) || /math/i.test(s.id)
  })

  const filteredSubjects = mathSubjects.filter((s) => {
    const matchesGrade =
      selectedGrade === 'all' ||
      s.grade === selectedGrade ||
      (selectedGrade === '10' && /10/.test(s.name || s.id)) ||
      (selectedGrade === '11' && /11/.test(s.name || s.id)) ||
      (selectedGrade === '12' && /12/.test(s.name || s.id))

    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchesGrade && matchesSearch
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
          <h1 className="page-title">Giáo trình Toán THPT</h1>
          <p className="page-subtitle">Chương trình chuẩn GDPT 2018 (Lớp 10, 11, 12) với video bài giảng kiểm chứng và hệ thống luyện tập tương tác.</p>
        </div>

        {/* Search */}
        <div className="subject-search-box">
          <Search size={16} className="search-icon" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm môn học, chủ đề..."
            className="subject-search-input"
            aria-label="Tìm môn học..."
          />
        </div>
      </div>

      {/* Grade Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Tất cả các khối' },
          { key: '10', label: 'Toán 10' },
          { key: '11', label: 'Toán 11' },
          { key: '12', label: 'Toán 12' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedGrade(tab.key as any)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: selectedGrade === tab.key ? 'var(--color-primary, #2563eb)' : 'var(--color-border, #e2e8f0)',
              backgroundColor: selectedGrade === tab.key ? 'var(--color-primary, #2563eb)' : 'var(--color-surface, #ffffff)',
              color: selectedGrade === tab.key ? '#ffffff' : 'var(--color-text, #1e293b)',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredSubjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Chưa tìm thấy giáo trình phù hợp"
          description={`Không có môn học nào khớp với bộ lọc đã chọn.`}
          actionLabel="Xóa bộ lọc"
          onAction={() => {
            setSearchQuery('')
            setSelectedGrade('all')
          }}
        />
      ) : (
        <div className="subjects-grid">
          {filteredSubjects.map((sub) => {
            const isAvailable = sub.availability === 'available' || (!sub.availability && (sub.totalLessons ?? 0) > 0)
            return (
              <Card key={sub.id} className={`subject-item-card ${isAvailable ? 'is-available' : 'is-coming-soon'}`}>
                <div className="subject-card-top">
                  <div
                    className="subject-brand-icon"
                    style={{ backgroundColor: sub.bgColor, color: sub.color }}
                    aria-hidden
                  >
                    {sub.icon}
                  </div>
                  <div className="subject-card-meta">
                    <div className="subject-badge-row">
                      <span className="subject-badge-grade">
                        {sub.grade} · {sub.curriculumLabel || 'GDPT 2018'}
                      </span>
                      {isAvailable ? (
                        <span className="subject-status-badge available">
                          <CheckCircle2 size={11} aria-hidden /> Có bài học
                        </span>
                      ) : (
                        <span className="subject-status-badge coming-soon">
                          <Clock size={11} aria-hidden /> Đang phát triển
                        </span>
                      )}
                    </div>
                    <h2 className="subject-name">{sub.name}</h2>
                  </div>
                </div>

                <p className="subject-desc">{sub.description}</p>

                {isAvailable ? (
                  <>
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
                  </>
                ) : (
                  <div className="subject-planned-preview">
                    <div className="planned-preview-header">
                      <BookOpen size={12} aria-hidden />
                      <span>Định hướng GDPT 2018:</span>
                    </div>
                    {sub.plannedTopics && sub.plannedTopics.length > 0 ? (
                      <ul className="planned-topics-list">
                        {sub.plannedTopics.slice(0, 3).map((topic, i) => (
                          <li key={i} className="planned-topic-item">
                            <span className="bullet">•</span>
                            <span className="topic-text">{topic}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="planned-preview-fallback">
                        Đang biên soạn bài giảng tương tác và ngân hàng câu hỏi chuẩn hóa.
                      </p>
                    )}
                  </div>
                )}

                <div className="subject-card-footer">
                  <Link to={`/subjects/${sub.id}`} style={{ textDecoration: 'none', width: '100%' }}>
                    <Button
                      variant={isAvailable ? 'primary' : 'secondary'}
                      icon={ArrowRight}
                      fullWidth
                    >
                      {isAvailable ? 'Xem chương và bài học' : 'Xem định hướng'}
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SubjectsPage
