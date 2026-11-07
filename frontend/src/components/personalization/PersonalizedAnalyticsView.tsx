import React from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  Compass,
  FileQuestion,
  Play,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { learningContextService } from '@/services/learningContext.service'
import type { PersonalizationOverview } from '@/services/personalization.service'
import type {
  ConfidenceLevel,
  KnowledgeGapItem,
  PerformanceStatus,
  PerformanceTrend,
} from '@/types/personalization'
import './PersonalizedAnalyticsView.css'

interface Props {
  data: PersonalizationOverview
  onRefresh?: () => void
}

export const PersonalizedAnalyticsView: React.FC<Props> = ({ data, onRefresh }) => {
  const navigate = useNavigate()
  const { summary, performances, gaps, recommendations, learningPath, hasData } = data

  const handleAskAITutor = (gap: KnowledgeGapItem) => {
    learningContextService.setContext({
      source: 'knowledge-gap',
      knowledgeGapId: gap.id,
      subjectId: 'math',
      subjectName: 'Toán học 12',
      lessonId: gap.relatedLessonIds[0] || 'lesson-math-12-01',
      lessonTitle: gap.skillName,
      title: `Hỗ trợ kỹ năng: ${gap.skillName}`,
      excerpt: gap.evidenceSummary,
      returnUrl: '/learning-analytics',
    })
    navigate('/ai-tutor')
  }

  // 1. Empty State when no practice results exist
  if (!hasData || summary.totalSessions === 0) {
    return (
      <div className="p-empty-state-card" data-testid="personalization-empty-state">
        <div className="p-empty-icon-wrap">
          <BookOpen size={28} aria-hidden />
        </div>
        <h2 className="p-empty-title">Chưa có đủ kết quả đánh giá</h2>
        <p className="p-empty-text">
          Bạn chưa có đủ kết quả đánh giá để tạo lộ trình cá nhân hóa. Hãy hoàn thành một bài luyện tập để bắt đầu.
        </p>
        <div className="p-empty-actions">
          <Button variant="primary" onClick={() => navigate('/practice')}>
            <Play size={16} aria-hidden /> Bắt đầu làm bài luyện tập
          </Button>
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh}>
              <RotateCcw size={16} aria-hidden /> Làm mới
            </Button>
          )}
        </div>
      </div>
    )
  }

  const renderConfidenceBadge = (conf: ConfidenceLevel) => {
    switch (conf) {
      case 'high':
        return <span className="p-badge confidence-high" title="Mức độ đầy đủ của bằng chứng quan sát (Evidence Sufficiency): Đầy đủ">Mức bằng chứng: Đầy đủ</span>
      case 'moderate':
        return <span className="p-badge confidence-moderate" title="Mức độ đầy đủ của bằng chứng quan sát (Evidence Sufficiency): Trung bình">Mức bằng chứng: Trung bình</span>
      case 'low':
        return <span className="p-badge confidence-low" title="Mức độ đầy đủ của bằng chứng quan sát (Evidence Sufficiency): Thấp">Mức bằng chứng: Thấp</span>
      case 'insufficient':
      default:
        return <span className="p-badge confidence-insufficient" title="Mức độ đầy đủ của bằng chứng: Cần thêm dữ liệu quan sát">Chưa đủ dữ liệu quan sát</span>
    }
  }

  const renderStatusBadge = (status: PerformanceStatus) => {
    switch (status) {
      case 'needs_review':
        return <span className="p-badge status-needs-review">Cần ôn tập</span>
      case 'reinforcing':
        return <span className="p-badge status-reinforcing">Cần củng cố</span>
      case 'proficient':
        return <span className="p-badge status-proficient">Đạt mức luyện tập</span>
      case 'insufficient_data':
      default:
        return <span className="p-badge status-insufficient-data">Chưa đủ dữ liệu</span>
    }
  }

  const renderTrendIcon = (trend: PerformanceTrend) => {
    switch (trend) {
      case 'improving':
        return (
          <span className="p-trend-text" style={{ color: '#27ab83' }} title="Có xu hướng tiến bộ">
            <TrendingUp size={15} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Tiến bộ
          </span>
        )
      case 'declining':
        return (
          <span className="p-trend-text" style={{ color: '#e12d39' }} title="Điểm số có xu hướng giảm">
            <TrendingDown size={15} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Giảm
          </span>
        )
      case 'stable':
        return <span className="p-trend-text" style={{ color: '#486581' }}>Ổn định</span>
      case 'insufficient_data':
      default:
        return <span className="p-trend-text" style={{ color: '#829ab1' }}>Cần thêm lượt</span>
    }
  }

  return (
    <div className="p-analytics-root" data-testid="personalization-dashboard">
      {/* 1. Summary Strip (Zero fake metrics) */}
      <div className="p-summary-grid">
        <div className="p-summary-card">
          <div className="p-summary-header">
            <span>Lượt làm bài thật</span>
            <Award size={16} aria-hidden />
          </div>
          <div className="p-summary-value">{summary.totalSessions}</div>
          <div className="p-summary-note">Phiên luyện tập đã nộp hợp lệ</div>
        </div>

        <div className="p-summary-card">
          <div className="p-summary-header">
            <span>Câu hỏi phân biệt</span>
            <FileQuestion size={16} aria-hidden />
          </div>
          <div className="p-summary-value">{summary.uniqueQuestionsAnswered}</div>
          <div className="p-summary-note">Trên tổng {summary.totalQuestionsAnswered} lượt trả lời</div>
        </div>

        <div className="p-summary-card">
          <div className="p-summary-header">
            <span>Tỷ lệ điểm quan sát</span>
            <Sparkles size={16} aria-hidden />
          </div>
          <div className="p-summary-value">{Math.round(summary.overallScoreRatio * 100)}%</div>
          <div className="p-summary-note">Tính từ kết quả thực tế</div>
        </div>

        <div className="p-summary-card">
          <div className="p-summary-header">
            <span>Lỗ hổng kiến thức</span>
            <AlertTriangle size={16} aria-hidden />
          </div>
          <div className="p-summary-value">{summary.knowledgeGapsCount}</div>
          <div className="p-summary-note">
            {summary.skillsNeedingDataCount > 0
              ? `${summary.skillsNeedingDataCount} kỹ năng cần thêm dữ liệu`
              : 'Đủ dữ liệu cho các kỹ năng đã làm'}
          </div>
        </div>
      </div>

      {/* 2. Adaptive Learning Path (3-5 steps roadmap) */}
      {learningPath && learningPath.steps.length > 0 && (
        <section className="p-section-card" data-testid="adaptive-learning-path-section">
          <div className="p-section-head">
            <h2 className="p-section-title">
              <Compass size={20} aria-hidden /> Lộ trình học tập cá nhân hóa (Thực tế)
            </h2>
            <p className="p-section-desc">{learningPath.explanation}</p>
          </div>

          <div className="p-steps-timeline">
            {learningPath.steps.map((st, idx) => (
              <div key={st.id} className="p-step-row">
                <div className="p-step-badge-col">
                  <div className="p-step-num">{st.stepNumber}</div>
                  {idx < learningPath.steps.length - 1 && <div className="p-step-connector" />}
                </div>

                <div className="p-step-content">
                  <div className="p-step-top">
                    <h3 className="p-step-title">{st.title}</h3>
                    {st.badgeText && <span className="p-badge confidence-low">{st.badgeText}</span>}
                  </div>
                  <p className="p-step-obj">
                    <strong>Mục tiêu:</strong> {st.objective}
                  </p>
                  <p className="p-step-reason">Lý do: {st.reason}</p>
                  <div className="p-step-footer">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(st.targetRoute)}
                    >
                      <Play size={14} aria-hidden /> Bắt đầu bước này
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Knowledge Gaps (Evidence-based weaknesses) */}
      {gaps.length > 0 && (
        <section className="p-section-card" data-testid="knowledge-gaps-section">
          <div className="p-section-head">
            <h2 className="p-section-title">
              <AlertTriangle size={20} aria-hidden style={{ color: '#e53e3e' }} /> Lỗ hổng kiến thức nhận diện được
            </h2>
            <p className="p-section-desc">
              Hệ thống phát hiện các kỹ năng có câu trả lời chưa chính xác qua các bài luyện tập thực tế:
            </p>
          </div>

          <div className="p-gaps-list">
            {gaps.map((gap) => (
              <div
                key={gap.id}
                className={`p-gap-card gap-${gap.gapLevel}`}
                data-testid={`gap-card-${gap.skillId}`}
              >
                <div className="p-gap-top">
                  <h3 className="p-gap-title">{gap.skillName}</h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className={`p-badge severity-${gap.gapLevel}`}>
                      {gap.gapLevel === 'critical'
                        ? 'Cần khắc phục ngay'
                        : gap.gapLevel === 'moderate'
                          ? 'Cần củng cố'
                          : 'Lưu ý nhẹ'}
                    </span>
                    {renderConfidenceBadge(gap.confidenceLevel)}
                  </div>
                </div>

                <p className="p-gap-evidence">{gap.evidenceSummary}</p>

                <div className="p-gap-actions">
                  {gap.relatedLessonIds.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/subjects/math/lessons/${gap.relatedLessonIds[0]}`)}
                    >
                      <BookOpen size={14} aria-hidden /> Ôn bài học
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/practice?skillId=${gap.skillId}&limit=5`)}
                  >
                    <Play size={14} aria-hidden /> Luyện tập 5 câu
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAskAITutor(gap)}
                  >
                    <Bot size={14} aria-hidden /> Hỏi AI Tutor giải thích
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Skill Performances Table */}
      <section className="p-section-card" data-testid="skill-performance-section">
        <div className="p-section-head">
          <h2 className="p-section-title">
            <Award size={20} aria-hidden /> Đánh giá hiệu suất kỹ năng năng lực
          </h2>
          <p className="p-section-desc">
            Phân tích tỷ lệ điểm quan sát được, độ tin cậy thống kê và xu hướng theo dữ liệu làm bài thực tế:
          </p>
        </div>

        <div className="p-table-wrap">
          <table className="p-skills-table">
            <thead>
              <tr>
                <th>Kỹ năng</th>
                <th>Số câu phân biệt</th>
                <th>Tỷ lệ điểm quan sát</th>
                <th title="Evidence Sufficiency: Mức độ đầy đủ của bằng chứng quan sát">Mức độ bằng chứng</th>
                <th>Xu hướng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {performances.map((perf) => {
                const ratioPct = Math.round(perf.scoreRatio * 100)
                let fillClass = 'fill-mid'
                if (ratioPct < 60) fillClass = 'fill-low'
                else if (ratioPct >= 80) fillClass = 'fill-high'

                return (
                  <tr key={perf.skillId}>
                    <td>
                      <div className="p-skill-info">
                        <span className="p-skill-name">{perf.skillName}</span>
                        <span className="p-skill-code">{perf.skillId}</span>
                      </div>
                    </td>
                    <td>{perf.evidenceCount} câu</td>
                    <td>
                      <div className="p-ratio-wrap">
                        <div className="p-ratio-bar">
                          <div
                            className={`p-ratio-fill ${fillClass}`}
                            style={{ width: `${Math.min(100, ratioPct)}%` }}
                          />
                        </div>
                        <span className="p-ratio-val">{ratioPct}%</span>
                      </div>
                    </td>
                    <td>{renderConfidenceBadge(perf.confidenceLevel)}</td>
                    <td>{renderTrendIcon(perf.trend)}</td>
                    <td>{renderStatusBadge(perf.status)}</td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/practice?skillId=${perf.skillId}&limit=5`)}
                      >
                        Luyện tập
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Recommended Actions Grid */}
      {recommendations.length > 0 && (
        <section className="p-section-card" data-testid="recommendations-section">
          <div className="p-section-head">
            <h2 className="p-section-title">
              <Sparkles size={20} aria-hidden /> Đề xuất học tập sư phạm minh bạch
            </h2>
            <p className="p-section-desc">
              Các khuyến nghị được tạo tự động và xác định dựa trên kết quả bài làm:
            </p>
          </div>

          <div className="p-gaps-list">
            {recommendations.map((rec) => (
              <div key={rec.id} className="p-gap-card gap-minor" style={{ borderLeftColor: rec.priority === 'high' ? '#e53e3e' : '#3182ce' }}>
                <div className="p-gap-top">
                  <h3 className="p-gap-title">{rec.title}</h3>
                  <span className={`p-badge ${rec.priority === 'high' ? 'severity-critical' : 'confidence-moderate'}`}>
                    Ưu tiên: {rec.priority === 'high' ? 'Cao' : rec.priority === 'medium' ? 'Trung bình' : 'Tiêu chuẩn'}
                  </span>
                </div>
                <p className="p-gap-evidence">
                  <strong>Lý do:</strong> {rec.reason}
                </p>
                <p className="p-gap-evidence" style={{ color: '#627d98', fontSize: '0.8rem' }}>
                  <strong>Bằng chứng:</strong> {rec.evidence}
                </p>
                <div className="p-gap-actions">
                  {rec.actionType === 'review_lesson' && rec.targetLessonId && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/subjects/math/lessons/${rec.targetLessonId}`)}
                    >
                      <BookOpen size={14} aria-hidden /> Đọc lại bài học ngay
                    </Button>
                  )}
                  {(rec.actionType === 'practice_skill' ||
                    rec.actionType === 'diagnostic_practice' ||
                    rec.actionType === 'reinforcement') && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        navigate(
                          `/practice?skillId=${rec.practiceConfig?.skillId || rec.skillId}&limit=${rec.practiceConfig?.limit || 5}`
                        )
                      }
                    >
                      <Play size={14} aria-hidden /> Luyện tập 5 câu
                    </Button>
                  )}
                  {rec.actionType === 'continue_learning' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/subjects/math')}
                    >
                      <ArrowRight size={14} aria-hidden /> Xem bài học tiếp theo
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
