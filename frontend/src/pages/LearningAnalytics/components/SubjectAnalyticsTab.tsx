import React from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SubjectAnalyticsItem } from '@/types/analytics'

interface SubjectAnalyticsTabProps {
  subjects: SubjectAnalyticsItem[]
}

export const SubjectAnalyticsTab: React.FC<SubjectAnalyticsTabProps> = ({ subjects }) => {
  return (
    <div className="analytics-tab-subjects">
      <div className="subjects-analytics-header">
        <h3 className="section-title">Phân tích chuyên sâu 4 môn học THPT</h3>
        <p className="section-desc">
          Theo dõi mức độ hoàn thành giáo trình, điểm bài thu hoạch và các vùng kiến thức cần bổ trợ theo từng môn.
        </p>
      </div>

      <div className="subjects-analytics-grid">
        {subjects.map((subj) => {
          return (
            <div key={subj.subjectId} className="subject-analytics-card">
              {/* Header */}
              <div className="subject-card-header">
                <div className="subject-name-col">
                  <h4 className="subj-title">{subj.subjectName}</h4>
                  <span className="subj-lessons-count">
                    Đã học {subj.completedLessons}/{subj.totalLessons} bài ({subj.completionPercent}%)
                  </span>
                </div>
                <span className={`subj-status-badge ${subj.competencyLevel}`}>
                  {subj.competencyLevel === 'mastered' && 'Nắm vững'}
                  {subj.competencyLevel === 'reinforcing' && 'Đang tiến bộ'}
                  {subj.competencyLevel === 'needs-review' && 'Cần ôn luyện'}
                  {subj.competencyLevel === 'insufficient-data' && 'Chưa đánh giá'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="subj-progress-track" aria-hidden="true">
                <div
                  className="subj-progress-fill"
                  style={{ width: `${subj.completionPercent}%` }}
                />
              </div>

              {/* 3 Metrics Row */}
              <div className="subj-metrics-row">
                <div className="subj-metric">
                  <span className="metric-val">
                    {subj.assessmentAverageScore !== null ? `${subj.assessmentAverageScore}%` : 'N/A'}
                  </span>
                  <span className="metric-lbl">Điểm thu hoạch TB</span>
                </div>
                <div className="subj-metric">
                  <span className="metric-val">{subj.attemptCount}</span>
                  <span className="metric-lbl">Lần làm bài</span>
                </div>
                <div className="subj-metric">
                  <span className={`metric-val ${subj.activeGapsCount > 0 ? 'text-warning' : 'text-success'}`}>
                    {subj.activeGapsCount}
                  </span>
                  <span className="metric-lbl">Điểm cần củng cố</span>
                </div>
              </div>

              {/* Qualitative assessment & Recommendation */}
              <div className="subj-eval-box">
                <p className="eval-text">
                  <strong>Nhận định:</strong> {subj.qualitativeAssessment}
                </p>
                <p className="rec-text">
                  <strong>Gợi ý:</strong> {subj.recommendedAction}
                </p>
              </div>

              {/* Footer Actions */}
              <div className="subj-card-footer">
                <Link to={`/subjects/${subj.subjectId}`} className="btn btn-outline btn-sm">
                  <span>Vào môn học</span>
                  <ChevronRight size={14} aria-hidden />
                </Link>
                {subj.activeGapsCount > 0 ? (
                  <Link to="/knowledge-gaps" className="btn btn-primary btn-sm">
                    Ôn điểm yếu
                  </Link>
                ) : (
                  <Link to="/learning-path" className="btn btn-ghost btn-sm">
                    Xem lộ trình
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
