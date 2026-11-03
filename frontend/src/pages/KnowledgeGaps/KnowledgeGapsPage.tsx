import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useKnowledgeGaps } from '@/hooks/useKnowledgeGaps'
import type { KnowledgeGap, KnowledgeGapStatus } from '@/types/knowledgeGaps'
import './KnowledgeGapsPage.css'

const SUBJECT_FILTER_OPTIONS = [
  { id: 'all', label: 'Tất cả môn' },
  { id: 'math', label: 'Toán học' },
  { id: 'physics', label: 'Vật lý' },
  { id: 'chemistry', label: 'Hóa học' },
  { id: 'english', label: 'Tiếng Anh' },
]

export function KnowledgeGapsPage() {
  const navigate = useNavigate()
  const { gaps, summary, removeGap } = useKnowledgeGaps()

  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [deletingGapId, setDeletingGapId] = useState<string | null>(null)

  // Filter gaps
  const filteredGaps = useMemo(() => {
    return gaps.filter((g) => {
      if (selectedSubject !== 'all' && g.subjectId !== selectedSubject) {
        return false
      }
      if (selectedStatus !== 'all' && g.status !== selectedStatus) {
        return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        g.title.toLowerCase().includes(q) ||
        g.lessonTitle.toLowerCase().includes(q) ||
        g.subjectName.toLowerCase().includes(q) ||
        (g.sectionTitle && g.sectionTitle.toLowerCase().includes(q))
      )
    })
  }, [gaps, selectedSubject, selectedStatus, searchQuery])

  const handleOpenLesson = (gap: KnowledgeGap) => {
    const hash = gap.sectionId ? `#${gap.sectionId}` : ''
    navigate(`/subjects/${gap.subjectId}/lessons/${gap.lessonId}${hash}`)
  }

  const handleStartReview = (gapId: string) => {
    navigate(`/review?gapId=${encodeURIComponent(gapId)}`)
  }

  const handleConfirmDelete = () => {
    if (deletingGapId) {
      removeGap(deletingGapId)
      setDeletingGapId(null)
    }
  }

  const getStatusBadge = (status: KnowledgeGapStatus) => {
    switch (status) {
      case 'needs-review':
        return <span className="gap-status-badge needs-review">Cần ôn</span>
      case 'reinforcing':
        return <span className="gap-status-badge reinforcing">Đang củng cố</span>
      case 'progressing':
        return <span className="gap-status-badge progressing">Có tiến bộ</span>
      case 'mastered':
        return <span className="gap-status-badge mastered">Đã nắm vững</span>
      default:
        return null
    }
  }

  return (
    <div className="knowledge-gaps-root">
      {/* 1. Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Học tập', to: '/dashboard' },
          { label: 'Kiến thức cần củng cố' },
        ]}
      />

      {/* 2. Page Header & Summary Strip */}
      <header className="gaps-page-header">
        <div className="gaps-header-info">
          <div className="gaps-header-tag">
            <Sparkles size={14} aria-hidden /> PHÂN TÍCH LỖ HỔNG KIẾN THỨC
          </div>
          <h1 className="gaps-page-title">Sổ tay kiến thức cần củng cố</h1>
          <p className="gaps-page-desc">
            Tự động tổng hợp từ các câu hỏi làm sai trong bài tập thu hoạch, kèm giải thích và lịch ôn tập ngắt quãng thông minh.
          </p>
        </div>

        {/* 4 Summary KPIs */}
        <div className="gaps-summary-grid">
          <div className="gap-metric-card">
            <span className="gap-metric-num">{summary.totalGaps}</span>
            <span className="gap-metric-label">Tổng kiến thức yếu</span>
          </div>
          <div className="gap-metric-card highlight-danger">
            <span className="gap-metric-num">{summary.needsReviewCount}</span>
            <span className="gap-metric-label">Cần ôn ưu tiên</span>
          </div>
          <div className="gap-metric-card highlight-warning">
            <span className="gap-metric-num">{summary.reinforcingCount}</span>
            <span className="gap-metric-label">Đang củng cố</span>
          </div>
          <div className="gap-metric-card highlight-success">
            <span className="gap-metric-num">{summary.masteredCount}</span>
            <span className="gap-metric-label">Đã nắm vững</span>
          </div>
        </div>
      </header>

      {/* 3. Toolbar: Subject Filter + Status Tabs + Search */}
      <div className="gaps-filter-toolbar">
        {/* Status segmented pills */}
        <div className="gaps-status-tabs" role="tablist" aria-label="Bộ lọc trạng thái">
          <button
            type="button"
            role="tab"
            aria-selected={selectedStatus === 'all'}
            className={`status-tab-btn ${selectedStatus === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('all')}
          >
            Tất cả ({gaps.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedStatus === 'needs-review'}
            className={`status-tab-btn ${selectedStatus === 'needs-review' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('needs-review')}
          >
            Cần ôn ({summary.needsReviewCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedStatus === 'reinforcing'}
            className={`status-tab-btn ${selectedStatus === 'reinforcing' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('reinforcing')}
          >
            Đang củng cố ({summary.reinforcingCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedStatus === 'mastered'}
            className={`status-tab-btn ${selectedStatus === 'mastered' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('mastered')}
          >
            Đã nắm vững ({summary.masteredCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="gaps-search-wrap">
          <Search size={15} className="gaps-search-icon" aria-hidden />
          <input
            type="text"
            className="gaps-search-input"
            placeholder="Tìm theo tên kiến thức, bài học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiến thức cần củng cố"
          />
        </div>
      </div>

      {/* Subject Filter Chips */}
      <div className="gaps-subject-chips-row">
        <span className="chips-label">
          <Filter size={13} aria-hidden /> Lọc môn:
        </span>
        {SUBJECT_FILTER_OPTIONS.map((subj) => (
          <button
            key={subj.id}
            type="button"
            className={`subject-chip-btn ${selectedSubject === subj.id ? 'active' : ''}`}
            onClick={() => setSelectedSubject(subj.id)}
          >
            {subj.label}
          </button>
        ))}
      </div>

      {/* 4. Knowledge Gaps List / Grid */}
      <main className="gaps-content-area">
        {filteredGaps.length === 0 ? (
          <div className="gaps-empty-state">
            <CheckCircle2 size={44} className="empty-icon text-success" aria-hidden />
            <h3 className="empty-title">
              {searchQuery || selectedSubject !== 'all' || selectedStatus !== 'all'
                ? 'Không tìm thấy kiến thức phù hợp với bộ lọc'
                : 'Chưa phát hiện kiến thức cần củng cố!'}
            </h3>
            <p className="empty-desc">
              {searchQuery || selectedSubject !== 'all' || selectedStatus !== 'all'
                ? 'Thử xóa bộ lọc để xem lại toàn bộ danh mục kiến thức.'
                : 'Hệ thống sẽ tự động ghi nhận các điểm kiến thức cần ôn luyện sau khi bạn làm bài tập thu hoạch ở mỗi bài học.'}
            </p>
            <Button variant="primary" onClick={() => navigate('/subjects/math')}>
              Học bài giảng và làm bài thu hoạch
            </Button>
          </div>
        ) : (
          <div className="gaps-cards-grid">
            {filteredGaps.map((gap) => (
              <div key={gap.id} className="gap-card">
                {/* Top Row: Subject & Status */}
                <div className="gap-card-top">
                  <div className="gap-subject-tag-row">
                    <span className="gap-subject-badge">{gap.subjectName}</span>
                    <span className="gap-lesson-tag">{gap.lessonTitle}</span>
                  </div>
                  <div className="gap-status-group">
                    {gap.severity === 'high' && (
                      <span className="severity-badge high" title="Đã sai nhiều lần, cần ưu tiên ôn">
                        <AlertTriangle size={12} aria-hidden /> Ưu tiên cao
                      </span>
                    )}
                    {getStatusBadge(gap.status)}
                  </div>
                </div>

                {/* Gap Main Title */}
                <h3 className="gap-title">{gap.title}</h3>

                {/* Section Tag */}
                {gap.sectionTitle && (
                  <div className="gap-section-anchor-tag">
                    <BookOpen size={13} aria-hidden />
                    <span>Mục bài giảng: {gap.sectionTitle}</span>
                  </div>
                )}

                {/* Question Context if available */}
                {gap.questionPrompt && (
                  <div className="gap-prompt-box">
                    <span className="prompt-label">Câu hỏi từng làm sai:</span>
                    <p className="prompt-text">"{gap.questionPrompt}"</p>
                  </div>
                )}

                {/* Explanation Hint */}
                {gap.explanation && (
                  <div className="gap-explanation-box">
                    <span className="explanation-label">Ghi nhớ trọng tâm:</span>
                    <p className="explanation-text">{gap.explanation}</p>
                  </div>
                )}

                {/* Card Meta Stats */}
                <div className="gap-meta-stats">
                  <span className="meta-item">
                    <RotateCw size={12} aria-hidden /> Làm sai: <strong>{gap.wrongAttemptsCount} lần</strong>
                  </span>
                  <span className="meta-item">
                    <Clock size={12} aria-hidden /> Ghi nhận: {new Date(gap.lastDetectedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="gap-card-actions">
                  <Button
                    variant="primary"
                    icon={Sparkles}
                    onClick={() => handleStartReview(gap.id)}
                  >
                    Ôn tập ngay
                  </Button>

                  <Button
                    variant="outline"
                    icon={ExternalLink}
                    onClick={() => handleOpenLesson(gap)}
                  >
                    Xem lại bài giảng
                  </Button>

                  <button
                    type="button"
                    className="gap-delete-btn"
                    onClick={() => setDeletingGapId(gap.id)}
                    aria-label={`Xóa kiến thức ${gap.title}`}
                    title="Bỏ theo dõi kiến thức này"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingGapId)}
        title="Bỏ theo dõi kiến thức cần củng cố"
        description="Bạn có chắc chắn muốn xóa mục kiến thức này khỏi danh sách cần củng cố? Lịch ôn tập liên quan cũng sẽ được gỡ bỏ."
        confirmText="Xóa mục này"
        cancelText="Hủy"
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingGapId(null)}
      />
    </div>
  )
}

export default KnowledgeGapsPage
