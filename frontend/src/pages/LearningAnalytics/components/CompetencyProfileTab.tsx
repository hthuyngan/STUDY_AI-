import React from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  HelpCircle,
  Info,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CompetencyLevel, TopicCompetencyItem } from '@/types/analytics'

interface CompetencyProfileTabProps {
  competencies: TopicCompetencyItem[]
  selectedSubject: string
  onSelectSubject: (subj: string) => void
  selectedLevel: string
  onSelectLevel: (lvl: string) => void
}

export const CompetencyProfileTab: React.FC<CompetencyProfileTabProps> = ({
  competencies,
  selectedSubject,
  onSelectSubject,
  selectedLevel,
  onSelectLevel,
}) => {
  const levelCounts: Record<string, number> = {
    all: competencies.length,
    'needs-review': competencies.filter((c) => c.level === 'needs-review').length,
    reinforcing: competencies.filter((c) => c.level === 'reinforcing').length,
    mastered: competencies.filter((c) => c.level === 'mastered').length,
    'insufficient-data': competencies.filter((c) => c.level === 'insufficient-data').length,
  }

  const getBadge = (level: CompetencyLevel) => {
    switch (level) {
      case 'mastered':
        return (
          <span className="competency-badge mastered">
            <CheckCircle2 size={13} aria-hidden /> Đã nắm vững
          </span>
        )
      case 'reinforcing':
        return (
          <span className="competency-badge reinforcing">
            <RotateCcw size={13} aria-hidden /> Đang củng cố
          </span>
        )
      case 'needs-review':
        return (
          <span className="competency-badge needs-review">
            <AlertTriangle size={13} aria-hidden /> Cần ôn luyện
          </span>
        )
      case 'insufficient-data':
      default:
        return (
          <span className="competency-badge insufficient">
            <HelpCircle size={13} aria-hidden /> Chưa đủ dữ liệu
          </span>
        )
    }
  }

  return (
    <div className="analytics-tab-competency">
      {/* 1. Educational Quality Notice Banner */}
      <div className="competency-notice-banner" role="note">
        <Info size={18} className="banner-icon" aria-hidden />
        <div className="banner-text">
          <strong>Nguyên tắc thẩm định năng lực thực chứng:</strong> Hoàn thành đọc bài giảng không đồng nghĩa với đã nắm vững kiến thức. Độ thành thục chỉ được công nhận khi học viên làm bài thu hoạch đạt chuẩn và vượt qua các chu kỳ ôn tập ngắt quãng Spaced Repetition.
        </div>
      </div>

      {/* 2. Filter Bar: Level tabs & Subject chips */}
      <div className="competency-filters-row">
        {/* Level pills */}
        <div className="level-tabs-group" role="tablist" aria-label="Bộ lọc mức độ năng lực">
          <button
            type="button"
            className={`filter-tab-pill ${selectedLevel === 'all' ? 'active' : ''}`}
            onClick={() => onSelectLevel('all')}
          >
            Tất cả ({levelCounts.all})
          </button>
          <button
            type="button"
            className={`filter-tab-pill ${selectedLevel === 'needs-review' ? 'active' : ''}`}
            onClick={() => onSelectLevel('needs-review')}
          >
            Cần ôn ({levelCounts['needs-review']})
          </button>
          <button
            type="button"
            className={`filter-tab-pill ${selectedLevel === 'reinforcing' ? 'active' : ''}`}
            onClick={() => onSelectLevel('reinforcing')}
          >
            Đang củng cố ({levelCounts.reinforcing})
          </button>
          <button
            type="button"
            className={`filter-tab-pill ${selectedLevel === 'mastered' ? 'active' : ''}`}
            onClick={() => onSelectLevel('mastered')}
          >
            Đã nắm vững ({levelCounts.mastered})
          </button>
          <button
            type="button"
            className={`filter-tab-pill ${selectedLevel === 'insufficient-data' ? 'active' : ''}`}
            onClick={() => onSelectLevel('insufficient-data')}
          >
            Chưa đánh giá ({levelCounts['insufficient-data']})
          </button>
        </div>

        {/* Subject filter chips */}
        <div className="subject-chips-group">
          <span className="chips-label">Môn học:</span>
          {['all', 'math', 'physics', 'chemistry', 'english'].map((subj) => {
            const labels: Record<string, string> = {
              all: 'Tất cả môn',
              math: 'Toán học',
              physics: 'Vật lý',
              chemistry: 'Hóa học',
              english: 'Tiếng Anh',
            }
            return (
              <button
                key={subj}
                type="button"
                className={`subject-chip ${selectedSubject === subj ? 'active' : ''}`}
                onClick={() => onSelectSubject(subj)}
              >
                {labels[subj]}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Competency Cards List */}
      {competencies.length === 0 ? (
        <div className="empty-competencies-state">
          <HelpCircle size={40} className="empty-icon text-muted" aria-hidden />
          <h4 className="empty-title">Không tìm thấy chủ đề nào phù hợp bộ lọc</h4>
          <p className="empty-desc">Thử chọn mức độ khác hoặc tất cả môn học để xem toàn bộ hồ sơ.</p>
        </div>
      ) : (
        <div className="competencies-grid">
          {competencies.map((item) => (
            <div key={item.id} className={`competency-card ${item.level}`}>
              <div className="card-top-row">
                <span className="item-subject-tag">{item.subjectName}</span>
                {getBadge(item.level)}
              </div>

              <h4 className="item-title">{item.title}</h4>
              <p className="item-lesson-info">{item.lessonTitle}</p>

              <div className="item-evidence-box">
                <span className="evidence-label">Bằng chứng thẩm định:</span>
                <p className="evidence-text">{item.evidence}</p>
              </div>

              <div className="card-footer-row">
                <span className="eval-date">
                  Đánh giá: {new Date(item.lastEvaluatedAt).toLocaleDateString('vi-VN')}
                </span>
                <div className="card-actions">
                  {item.level === 'needs-review' ? (
                    <Link to="/knowledge-gaps" className="card-action-link warning">
                      Xem giải thích <ExternalLink size={12} aria-hidden />
                    </Link>
                  ) : item.sectionId ? (
                    <Link
                      to={`/subjects/${item.subjectId}/lessons/${item.lessonId}#${item.sectionId}`}
                      className="card-action-link"
                    >
                      Mục bài giảng <ExternalLink size={12} aria-hidden />
                    </Link>
                  ) : (
                    <Link
                      to={`/subjects/${item.subjectId}/lessons/${item.lessonId}`}
                      className="card-action-link"
                    >
                      Bài học <ExternalLink size={12} aria-hidden />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

