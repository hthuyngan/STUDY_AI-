import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, Clock, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSubjects } from '@/hooks/useSubjects'
import { curriculumService, type LearnerEditionSummary } from '@/services/curriculum.service'
import './SubjectsPage.css'

export function SubjectsPage() {
  const { subjects, isLoading, error, reload } = useSubjects()
  const [editions, setEditions] = useState<LearnerEditionSummary[]>([])
  const [editionsLoading, setEditionsLoading] = useState(true)
  const [editionsError, setEditionsError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGrade, setSelectedGrade] = useState<'all' | '10' | '11' | '12'>('all')

  const loadEditions = () => {
    setEditionsLoading(true)
    setEditionsError(null)
    curriculumService
      .getPublishedEditions()
      .then((list) => setEditions(Array.isArray(list) ? list : []))
      .catch((err) => setEditionsError(err instanceof Error ? err.message : 'Không thể tải danh sách phiên bản giáo trình.'))
      .finally(() => setEditionsLoading(false))
  }

  useEffect(() => {
    loadEditions()
  }, [])

  const filteredEditions = editions.filter((ed) => {
    const matchesGrade =
      selectedGrade === 'all' ||
      ed.gradeName.includes(selectedGrade) ||
      ed.curriculumName.includes(selectedGrade)
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      ed.editionName.toLowerCase().includes(q) ||
      ed.subjectName.toLowerCase().includes(q) ||
      ed.curriculumName.toLowerCase().includes(q) ||
      ed.code.toLowerCase().includes(q)
    return matchesGrade && matchesSearch
  })

  const filteredSubjects = subjects.filter((s) => {
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
          <h1 className="page-title">Giáo trình học tập THPT</h1>
          <p className="page-subtitle">Chương trình đa môn theo phiên bản GDPT 2018 với bài học và hệ thống luyện tập tương tác.</p>
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
          { key: '10', label: 'Khối 10' },
          { key: '11', label: 'Khối 11' },
          { key: '12', label: 'Khối 12' },
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

      {editionsError && (
        <div role="alert" style={{ marginBottom: '1rem', padding: '12px', borderRadius: '8px', border: '1px solid var(--danger-500, #dc2626)', color: 'var(--danger-600, #dc2626)' }}>
          {editionsError}
        </div>
      )}

      {!editionsLoading && filteredEditions.length > 0 && (
        <section aria-label="Giáo trình theo phiên bản" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Giáo trình theo phiên bản</h2>
          <div className="subjects-grid">
            {filteredEditions.map((ed) => (
              <Card key={ed.id} className="subject-item-card is-available">
                <div className="subject-card-top">
                  <div className="subject-card-meta">
                    <div className="subject-badge-row">
                      <span className="subject-badge-grade">
                        {ed.gradeName} · {ed.framework || ed.curriculumName}
                      </span>
                      <span className="subject-status-badge available">
                        <CheckCircle2 size={11} aria-hidden /> {ed.publishedLessonCount} bài học
                      </span>
                    </div>
                    <h3 className="subject-name">{ed.subjectName} — {ed.editionName}</h3>
                  </div>
                </div>
                <p className="subject-desc">
                  {ed.curriculumName}{ed.textbookSeriesName ? ` · Bộ sách: ${ed.textbookSeriesName}` : ''} · {ed.publishedChapterCount} chương
                </p>
                <div className="subject-card-footer">
                  <Link
                    to={`/subjects/edition/${ed.id}`}
                    state={{ editionMeta: ed }}
                    style={{ textDecoration: 'none', width: '100%' }}
                  >
                    <Button variant="primary" icon={ArrowRight} fullWidth>
                      Mở giáo trình
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {filteredEditions.length === 0 && filteredSubjects.length === 0 ? (
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
