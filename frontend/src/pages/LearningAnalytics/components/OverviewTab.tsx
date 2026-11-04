import React from 'react'
import {
  BookOpen,
  Award,
  AlertTriangle,
  RotateCcw,
  Clock,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActivityBarChart } from './ActivityBarChart'
import type {
  AssessmentTrendItem,
  DailyActivityMetric,
  StudentAnalyticsSummary,
} from '@/types/analytics'

interface OverviewTabProps {
  summary: StudentAnalyticsSummary
  dailyActivities: DailyActivityMetric[]
  assessmentTrends: AssessmentTrendItem[]
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  summary,
  dailyActivities,
  assessmentTrends,
}) => {
  const recentTrends = [...assessmentTrends].reverse().slice(0, 5)

  return (
    <div className="analytics-tab-overview">
      {/* 1. Summary 5 KPIs Strip */}
      <div className="analytics-kpi-grid">
        <div className="kpi-metric-card">
          <div className="kpi-icon-wrap primary">
            <BookOpen size={20} aria-hidden />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{summary.totalLessonsCompleted}</span>
            <span className="kpi-label">Bài hoàn thành</span>
            <span className="kpi-subtext">/{summary.totalLessonsAvailable} bài giáo trình</span>
          </div>
        </div>

        <div className="kpi-metric-card">
          <div className="kpi-icon-wrap success">
            <Award size={20} aria-hidden />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">
              {summary.averageAssessmentScore !== null ? `${summary.averageAssessmentScore}%` : 'Chưa có'}
            </span>
            <span className="kpi-label">Điểm thu hoạch TB</span>
            <span className="kpi-subtext">
              {summary.assessmentAttemptsCount > 0
                ? `${summary.assessmentAttemptsCount} lần nộp bài`
                : 'Chưa làm bài kiểm tra'}
            </span>
          </div>
        </div>

        <div className="kpi-metric-card">
          <div className="kpi-icon-wrap warning">
            <AlertTriangle size={20} aria-hidden />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{summary.activeKnowledgeGapsCount}</span>
            <span className="kpi-label">Điểm cần củng cố</span>
            <span className="kpi-subtext">
              {summary.masteredGapsCount > 0 ? `Đã vững ${summary.masteredGapsCount} điểm` : 'Từ bài làm sai'}
            </span>
          </div>
        </div>

        <div className="kpi-metric-card">
          <div className="kpi-icon-wrap info">
            <RotateCcw size={20} aria-hidden />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{summary.totalReviewSessionsCompleted}</span>
            <span className="kpi-label">Lượt ôn ngắt quãng</span>
            <span className="kpi-subtext">Spaced Repetition</span>
          </div>
        </div>

        <div className="kpi-metric-card">
          <div className="kpi-icon-wrap accent">
            <Clock size={20} aria-hidden />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{summary.estimatedStudyTimeMinutes}</span>
            <span className="kpi-label">Phút học tập</span>
            <span className="kpi-subtext">Thời gian thực tế</span>
          </div>
        </div>
      </div>

      {/* 2. Activity Chart */}
      <ActivityBarChart activities={dailyActivities} />

      {/* 3. Assessment Trends & Quality Control */}
      <div className="overview-split-row">
        {/* Recent Harvest Assessment Results */}
        <div className="overview-panel">
          <div className="panel-header">
            <div className="panel-title-wrap">
              <TrendingUp size={18} className="panel-icon text-primary" aria-hidden />
              <h3 className="panel-title">Kết quả bài tập thu hoạch gần nhất</h3>
            </div>
            <Link to="/learning-path" className="panel-link">
              Lộ trình học <ExternalLink size={13} aria-hidden />
            </Link>
          </div>

          {recentTrends.length === 0 ? (
            <div className="panel-empty-state">
              <p className="empty-text">Chưa ghi nhận kết quả bài thu hoạch nào.</p>
              <Link to="/learning-path" className="btn btn-outline btn-sm">
                Vào học và làm bài thu hoạch
              </Link>
            </div>
          ) : (
            <div className="recent-attempts-table-wrap">
              <table className="recent-attempts-table">
                <thead>
                  <tr>
                    <th>Bài học</th>
                    <th>Môn</th>
                    <th>Lần làm</th>
                    <th>Điểm số</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrends.map((att) => (
                    <tr key={att.attemptId}>
                      <td className="col-lesson-title font-medium">{att.lessonTitle}</td>
                      <td>
                        <span className="subject-pill-tag">{att.subjectName}</span>
                      </td>
                      <td className="text-muted">#{att.attemptNumber}</td>
                      <td>
                        <span className={`score-badge ${att.isPassing ? 'pass' : 'fail'}`}>
                          {att.scorePercent}%
                        </span>
                      </td>
                      <td>
                        {att.isPassing ? (
                          <span className="status-tag success">
                            <CheckCircle2 size={13} aria-hidden /> Đạt chuẩn
                          </span>
                        ) : (
                          <span className="status-tag warning">
                            <AlertTriangle size={13} aria-hidden /> Cần ôn lại
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Insight & Recommendation Card */}
        <div className="overview-panel recommendation-panel">
          <div className="panel-header">
            <h3 className="panel-title">Định hướng củng cố năng lực</h3>
          </div>
          <div className="recommendation-content">
            <p className="recommendation-lead">
              Hệ thống theo dõi thực chứng: Kết quả thu hoạch và chu kỳ ôn tập ngắt quãng Spaced Repetition là căn cứ duy nhất để xác định độ thành thục kiến thức.
            </p>
            <div className="recommendation-item">
              <span className="rec-num">1</span>
              <div>
                <strong>Ôn tập kiến thức hổng:</strong>
                <p>
                  {summary.activeKnowledgeGapsCount > 0
                    ? `Hiện có ${summary.activeKnowledgeGapsCount} điểm kiến thức cần củng cố trong sổ tay.`
                    : 'Tuyệt vời! Bạn không còn điểm kiến thức yếu nào chưa được xử lý.'}
                </p>
              </div>
            </div>
            <div className="recommendation-item">
              <span className="rec-num">2</span>
              <div>
                <strong>Chu kỳ ghi nhớ dài hạn:</strong>
                <p>
                  Ôn đúng các ngày giãn cách (1 → 3 → 7 → 14 → 30 ngày) để chuyển kiến thức vào trí nhớ vĩnh viễn.
                </p>
              </div>
            </div>
            <div className="panel-cta-row">
              <Link to="/knowledge-gaps" className="btn btn-outline btn-sm">
                Xem Sổ tay kiến thức
              </Link>
              <Link to="/review" className="btn btn-primary btn-sm">
                Ôn tập hôm nay
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

