import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Award,
  BookOpen,
  ChevronRight,
  Flame,
  HelpCircle,
  Play,
  RotateCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAiChat } from '@/context/useAiChat'
import { learningAnalyticsService } from '@/services/learningAnalytics.service'
import type {
  AiLearningReport,
  LearningAnalyticsOverview,
  LearningRisk,
} from '@/types/learningAnalytics'

interface IntelligentAnalyticsDashboardProps {
  subjectId?: string
}

export const IntelligentAnalyticsDashboard: React.FC<IntelligentAnalyticsDashboardProps> = ({
  subjectId = 'sub_math12',
}) => {
  const navigate = useNavigate()
  const { openChat } = useAiChat()

  const [overview, setOverview] = useState<LearningAnalyticsOverview | null>(null)
  const [risks, setRisks] = useState<LearningRisk[]>([])
  const [report, setReport] = useState<AiLearningReport | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('all')

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [ovData, riskData] = await Promise.all([
          learningAnalyticsService.getAnalyticsOverview(subjectId, timeframe),
          learningAnalyticsService.getLearningRisks(subjectId),
        ])
        if (active) {
          setOverview(ovData)
          setRisks(riskData)
        }
      } catch {
        if (active) {
          setOverview(null)
          setRisks([])
          setLoadError('Không thể tải dữ liệu phân tích học tập từ máy chủ.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    fetchData()
    return () => {
      active = false
    }
  }, [subjectId, timeframe])

  const handleOpenAiReport = async () => {
    setShowReportModal(true)
    if (!report) {
      setReportError(null)
      try {
        const rep = await learningAnalyticsService.getAiLearningReport(subjectId)
        setReport(rep)
      } catch {
        setReportError('Không thể tải báo cáo AI từ máy chủ.')
      }
    }
  }

  const handleAskCoach = (topicName?: string) => {
    const prompt = topicName
      ? `Thầy ơi, em muốn hỏi về phần "${topicName}" và cách khắc phục lỗi sai trong bài này.`
      : `Thầy ơi, dựa vào kết quả học tập của em, hôm nay em nên tập trung học và ôn tập phần nào?`

    openChat(
      {
        title: topicName ? `Khắc phục: ${topicName}` : 'Tư vấn lộ trình học tập',
        source: 'knowledge-gap',
        subjectId: 'sub_math12',
        subjectName: 'Toán 12',
        lessonTitle: topicName || 'Học tập thích ứng',
      },
      prompt
    )
  }

  if (loading && !overview) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RotateCw className="animate-spin" style={{ margin: '0 auto 12px', width: 28, height: 28 }} />
        <p>Đang tổng hợp dữ liệu phân tích học tập thông minh...</p>
      </div>
    )
  }

  if (loadError && !overview) {
    return (
      <div role="alert" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <AlertTriangle style={{ margin: '0 auto 12px', width: 28, height: 28, color: '#f59e0b' }} />
        <p>{loadError}</p>
      </div>
    )
  }

  return (
    <div className="intelligent-analytics-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ─────────────────────────────────────────────────────────────────────────────
          KHU VỰC A: TỔNG QUAN HỌC TẬP (KPI METRICS)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
              Phân tích năng lực & Đánh giá thông minh (Toán 12)
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Dữ liệu được cập nhật tự động sau mỗi phiên làm bài và kiểm tra.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '2px' }}>
              {(['7d', '30d', 'all'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    border: 'none',
                    background: timeframe === tf ? 'var(--primary-600)' : 'transparent',
                    color: timeframe === tf ? '#ffffff' : 'var(--text-secondary)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tf === '7d' ? '7 ngày' : tf === '30d' ? '30 ngày' : 'Tất cả'}
                </button>
              ))}
            </div>

            <Button variant="secondary" icon={Sparkles} onClick={handleOpenAiReport}>
              Báo cáo AI
            </Button>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <BookOpen style={{ width: 18, height: 18, color: 'var(--primary-600)' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tiến độ chương trình</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {overview?.curriculumProgressPercent || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Chuẩn GDPT 2018 (Toán 12)
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Target style={{ width: 18, height: 18, color: '#10b981' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Năng lực thực tế</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {overview?.overallMasteryScore || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Xếp loại: <strong>{overview?.currentMasteryLabel}</strong>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <TrendingUp style={{ width: 18, height: 18, color: '#6366f1' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tỷ lệ chính xác</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {overview?.overallAccuracyPercent || 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {overview?.totalCorrect || 0}/{overview?.totalQuestionsAttempted || 0} câu đã làm
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Flame style={{ width: 18, height: 18, color: '#f59e0b' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Chuỗi học tập</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {overview?.reviewFrequency?.activeStreakDays ?? 0} ngày
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {overview?.reviewFrequency?.sessionsLast7Days ?? 0} phiên trong 7 ngày
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          KHU VỰC B: PHÂN TÍCH NĂNG LỰC THEO CHƯƠNG & CHỦ ĐỀ
      ───────────────────────────────────────────────────────────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Chapter Progress */}
        <div style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>
            Năng lực theo Chương học
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {overview?.chapterMasteries.map((chp) => (
              <div key={chp.chapterId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.875rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{chp.chapterTitle}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{chp.averageMasteryScore}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, chp.averageMasteryScore || 0)}%`,
                      background: chp.averageMasteryScore >= 70 ? '#10b981' : chp.averageMasteryScore >= 50 ? '#6366f1' : '#f59e0b',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
            {(!overview?.chapterMasteries || overview.chapterMasteries.length === 0) && (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px' }}>
                Chưa có dữ liệu chương học.
              </div>
            )}
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>
            Chủ đề mạnh & Điểm cần củng cố
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Strengths */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.05em' }}>
                ĐIỂM MẠNH (≥ 70% THÀNH THẠO)
              </span>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {overview?.topStrengths.map((st) => (
                  <div key={st.topicId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '6px 10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 500 }}>{st.topicName}</span>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>{st.masteryScore}%</span>
                  </div>
                ))}
                {(!overview?.topStrengths || overview.topStrengths.length === 0) && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Đang tích lũy lượt luyện tập để xác định điểm mạnh.</div>
                )}
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#ef4444', letterSpacing: '0.05em' }}>
                CẦN CỦNG CỐ (&lt; 60% HOẶC CHƯA ĐẠT)
              </span>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {overview?.topWeaknesses.map((wk) => (
                  <div
                    key={wk.topicId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.875rem',
                      padding: '6px 10px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500 }}>{wk.topicName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>({wk.statusLabel})</span>
                    </div>
                    <button
                      onClick={() => handleAskCoach(wk.topicName)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--primary-600)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      Hỏi AI <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))}
                {(!overview?.topWeaknesses || overview.topWeaknesses.length === 0) && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Chưa phát hiện lỗ hổng lớn. Phong độ rất tốt!</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          KHU VỰC C: CẢNH BÁO NGUY CƠ HỌC TẬP (LEARNING RISK DETECTION)
      ───────────────────────────────────────────────────────────────────────────── */}
      {risks.length > 0 && (
        <section style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle style={{ width: 20, height: 20, color: '#f59e0b' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Cảnh báo nguy cơ học tập ({risks.length} phát hiện)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {risks.map((risk) => (
              <div
                key={risk.id}
                style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${risk.riskLevel === 'high' ? '#ef4444' : '#f59e0b'}`,
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {risk.title}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {risk.rootCauseEvidence}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 600 }}>
                  👉 {risk.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          KHU VỰC D: ĐỀ XUẤT HÀNH ĐỘNG & THI THỬ MA TRẬN
      ───────────────────────────────────────────────────────────────────────────── */}
      <section style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)' }}>
            Luyện tập thích ứng cá nhân hóa
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Hệ thống tự động chọn câu hỏi từ ngân hàng 16,000+ câu theo ma trận năng lực thực tế của bạn.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              variant="primary"
              icon={Play}
              onClick={() => navigate('/practice?mode=adaptive')}
            >
              Luyện thích ứng ngay
            </Button>
            <Button
              variant="secondary"
              icon={HelpCircle}
              onClick={() => handleAskCoach()}
            >
              Hỏi AI Coach
            </Button>
          </div>
        </div>

        <div style={{ flex: '1 1 320px', padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)' }}>
            Thi thử chuẩn ma trận tốt nghiệp THPT
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Đề thi 50 câu (90 phút) chuẩn phân bổ GDPT 2018: 40% Nhận biết, 30% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao.
          </p>
          <Button
            variant="secondary"
            icon={Award}
            onClick={() => navigate('/practice?tab=setup&mode=exam')}
          >
            Vào phòng thi thử (50 câu)
          </Button>
        </div>
      </section>

      {/* AI Report Modal */}
      {showReportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setShowReportModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid var(--border-color)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles style={{ width: 22, height: 22, color: 'var(--primary-600)' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Báo cáo học tập thông minh (AI Learning Report)</h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {report ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.875rem' }}>
                  <strong>Đánh giá tổng thể:</strong> {report.overallEvaluation}
                </div>

                <div style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', borderLeft: '4px solid var(--primary-600)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '6px', color: 'var(--primary-600)' }}>
                    Nhận xét sư phạm từ AI Tutor ({report.provider}):
                  </div>
                  <div style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                    {report.pedagogicalNarrative}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.9375rem', fontWeight: 700 }}>Mục tiêu học tập đề xuất:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {report.recommendedGoals.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.9375rem', fontWeight: 700 }}>Kế hoạch ôn tập ngắn hạn:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {report.shortTermStudyPlan.map((s, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.8125rem' }}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : reportError ? (
              <div role="alert" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                {reportError}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <RotateCw className="animate-spin" style={{ margin: '0 auto 8px', width: 24, height: 24 }} />
                <p>Đang tải báo cáo học tập...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
