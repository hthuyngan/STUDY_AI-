import React, { useEffect, useState } from 'react'
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileQuestion,
  History,
  Play,
  RotateCw,
  Sparkles,
  Target,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { PracticeSetup } from '@/components/practice/PracticeSetup'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { practiceService } from '@/services/practice.service'
import { useSmartReview } from '@/hooks/useSmartReview'
import type { PracticeResult, PracticeSession, PracticeSetupConfig } from '@/types/practice'
import './PracticeHubPage.css'

export const PracticeHubPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const userGradeLabel = user?.grade ? `Toán ${user.grade}` : 'Toán 10–12'
  const initialTab = searchParams.get('tab') === 'mistakes'
    ? 'mistakes'
    : searchParams.get('tab') === 'history'
      ? 'history'
      : 'setup'
  const [activeTab, setActiveTab] = useState<'setup' | 'mistakes' | 'history'>(initialTab)
  const isExamMode = searchParams.get('mode') === 'exam'
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null)
  const [history, setHistory] = useState<PracticeResult[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const { items: reviewItems, dueItems } = useSmartReview()

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'mistakes' || tabParam === 'history' || tabParam === 'setup') {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      setLoading(true)
      try {
        const [active, hist] = await Promise.all([
          practiceService.getActiveSession(),
          practiceService.getHistory(),
        ])
        if (isMounted) {
          setActiveSession(active)
          setHistory(hist)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    init()
    return () => {
      isMounted = false
    }
  }, [])

  const handleStartSession = async (config: PracticeSetupConfig) => {
    try {
      const session = await practiceService.startSession({
        ...config,
        mode: isExamMode ? 'exam' : config.mode,
      })
      navigate(`/practice/session/${session.id}`)
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi khởi tạo bài luyện tập.')
    }
  }

  const handleResumeSession = () => {
    if (activeSession) {
      navigate(`/practice/session/${activeSession.id}`)
    }
  }

  const handleAbandonSession = async () => {
    if (activeSession && confirm('Bạn có chắc chắn muốn hủy bài làm dở này?')) {
      await practiceService.abandonSession(activeSession.id)
      setActiveSession(null)
    }
  }

  return (
    <div className="practice-hub-root">
      {/* Top Breadcrumb */}
      <div className="practice-hub-header">
        <Breadcrumb
          items={[
            { label: 'Học tập', to: '/dashboard' },
            { label: isExamMode ? 'Thi thử trực tuyến' : 'Luyện tập & Đánh giá năng lực' },
          ]}
        />
      </div>

      {/* Hero Header */}
      <div className="practice-hub-hero">
        <div className="hub-hero-badge">
          <Target size={14} aria-hidden />
          <span>{isExamMode ? 'CHẾ ĐỘ THI THỬ CHUẨN HOÁ · GDPT 2018' : 'HỆ THỐNG LUYỆN TẬP XÁC ĐỊNH · GDPT 2018'}</span>
        </div>
        <h1 className="hub-hero-title">
          {isExamMode ? `Thi thử trực tuyến môn ${userGradeLabel}` : `Luyện tập & Đánh giá năng lực ${userGradeLabel}`}
        </h1>
        <p className="hub-hero-desc">
          {isExamMode
            ? 'Kỳ thi thử mô phỏng theo cấu trúc đề thi tốt nghiệp THPT chuẩn GDPT 2018. Không xem đáp án trước trong lúc làm bài, tự động khóa nộp bài và phân tích kết quả sau khi hoàn thành.'
            : 'Làm bài tập thực tế từ Ngân hàng câu hỏi kiểm chứng, tự động lưu nháp, chấm điểm theo thang chuẩn GDPT 2018 và phân tích độ thành thạo theo từng kỹ năng năng lực.'}
        </p>
      </div>

      {/* Active Unfinished Session Banner (Resume prompt) */}
      {activeSession && (
        <div className="resume-session-banner">
          <div className="resume-banner-content">
            <Clock size={20} className="resume-icon" aria-hidden />
            <div>
              <h3 className="resume-title">Bạn có một bài luyện tập đang làm dở!</h3>
              <p className="resume-desc">
                Phiên làm bài gồm {activeSession.questionIds.length} câu đã được lưu nháp an toàn.
              </p>
            </div>
          </div>
          <div className="resume-actions">
            <Button variant="outline" size="sm" onClick={handleAbandonSession}>
              Hủy bài này
            </Button>
            <Button variant="primary" size="sm" icon={Play} onClick={handleResumeSession}>
              Tiếp tục làm bài
            </Button>
          </div>
        </div>
      )}

      {/* Hub Tabs Navigation */}
      <div className="practice-hub-tabs" role="tablist">
        <button
          type="button"
          className={`hub-tab-btn ${activeTab === 'setup' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('setup')
            setSearchParams({ tab: 'setup' })
          }}
          role="tab"
          aria-selected={activeTab === 'setup'}
        >
          <Target size={16} aria-hidden />
          <span>Tạo bài luyện tập mới</span>
        </button>

        <button
          type="button"
          className={`hub-tab-btn ${activeTab === 'mistakes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('mistakes')
            setSearchParams({ tab: 'mistakes' })
          }}
          role="tab"
          aria-selected={activeTab === 'mistakes'}
        >
          <RotateCw size={16} aria-hidden />
          <span>Ôn câu sai & Smart Review ({dueItems.length})</span>
        </button>

        <button
          type="button"
          className={`hub-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history')
            setSearchParams({ tab: 'history' })
          }}
          role="tab"
          aria-selected={activeTab === 'history'}
        >
          <History size={16} aria-hidden />
          <span>Lịch sử làm bài ({history.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="practice-hub-content">
        {loading ? (
          <Skeleton variant="rect" width="100%" height={320} />
        ) : activeTab === 'setup' ? (
          <div>
            {!isExamMode && (
              <div
                className="adaptive-practice-promo-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(99,102,241,0.06) 100%)',
                  border: '1px solid rgba(37,99,235,0.2)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'var(--color-primary, #2563EB)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={22} aria-hidden />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Luyện tập thích ứng thông minh (AI Adaptive Practice)
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      Tự động đo lường năng lực thực tế, ưu tiên câu hỏi nhận biết / thông hiểu nếu còn yếu và nâng dần câu vận dụng khi tiến bộ.
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  icon={Play}
                  onClick={() =>
                    handleStartSession({
                      subjectId: user?.grade === '10' ? 'sub_math10' : user?.grade === '11' ? 'sub_math11' : 'sub_math12',
                      mode: 'adaptive',
                      limit: 10,
                    })
                  }
                >
                  Bắt đầu luyện tập thích ứng (10 câu)
                </Button>
              </div>
            )}
            <PracticeSetup onStartSession={handleStartSession} />
          </div>
        ) : activeTab === 'mistakes' ? (
          /* Mistakes & Spaced Repetition View */
          <div className="practice-mistakes-container" style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary, #0F172A)' }}>
                  Ôn tập câu sai & Lặp lại ngắt quãng (Spaced Repetition)
                </h2>
                <p style={{ margin: 0, color: 'var(--text-secondary, #64748B)', fontSize: '0.9rem' }}>
                  Hệ thống Leitner 5 hộp tự động phân bố lịch ôn lại các câu hỏi đã trả lời sai để củng cố trí nhớ dài hạn.
                </p>
              </div>
              {dueItems.length > 0 && (
                <Button variant="primary" icon={Sparkles} onClick={() => navigate('/review')}>
                  Bắt đầu phiên ôn ({dueItems.length} mục)
                </Button>
              )}
            </div>

            {reviewItems.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Không có câu sai cần ôn!"
                description="Bạn chưa có câu hỏi nào bị làm sai cần ôn tập lại. Hãy tiếp tục duy trì phong độ tốt!"
                actionLabel="Tạo bài luyện tập mới"
                onAction={() => setActiveTab('setup')}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reviewItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      background: 'var(--surface-color, #FFFFFF)',
                      border: '1px solid var(--border-color, #E2E8F0)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, marginRight: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: item.status === 'overdue' ? '#FEE2E2' : item.status === 'due' ? '#FEF3C7' : '#E2E8F0',
                            color: item.status === 'overdue' ? '#DC2626' : item.status === 'due' ? '#D97706' : '#475569',
                          }}
                        >
                          {item.status === 'overdue' ? 'Quá hạn' : item.status === 'due' ? 'Đến hạn hôm nay' : 'Đã củng cố'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                          {item.subjectName} · Chu kỳ {item.intervalDays || 1} ngày
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 600, color: '#1E293B' }}>
                        {item.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                        {item.prompt}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/review?gapId=${encodeURIComponent(item.gapId || item.id)}`)}
                    >
                      Ôn lại
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* History View */
          <div className="practice-history-container">
            {history.length === 0 ? (
              <EmptyState
                icon={FileQuestion}
                title="Chưa có lượt làm bài nào"
                description="Bạn chưa thực hiện bài luyện tập nào. Hãy bắt đầu một lượt làm bài để ghi nhận điểm số và phân tích kỹ năng."
                actionLabel="Bắt đầu luyện tập ngay"
                onAction={() => setActiveTab('setup')}
              />
            ) : (
              <div className="history-list">
                {history.map((item) => {
                  const dateStr = new Date(item.submittedAt).toLocaleDateString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                  const durationMin = Math.floor(item.durationSeconds / 60)
                  const durationSec = item.durationSeconds % 60

                  return (
                    <div key={item.id} className="history-card">
                      <div className="history-main-info">
                        <div className="history-meta-top">
                          <span className="history-date">
                            <Calendar size={13} aria-hidden /> {dateStr}
                          </span>
                          <span className="history-divider">·</span>
                          <span className="history-duration">
                            <Clock size={13} aria-hidden /> {durationMin}p {durationSec}s
                          </span>
                          <span className="history-divider">·</span>
                          <span className="history-q-count">{item.totalQuestions} câu hỏi</span>
                        </div>

                        <h3 className="history-title">
                          Toán 12 · Luyện tập Đạo hàm & Khảo sát hàm số
                        </h3>

                        <div className="history-tags-row">
                          <span className="history-tag">Đúng: {item.correctCount} câu</span>
                          {item.partialCount > 0 && (
                            <span className="history-tag">Một phần: {item.partialCount} câu</span>
                          )}
                          <span className="history-tag">Sai: {item.incorrectCount} câu</span>
                          {item.unansweredCount > 0 && (
                            <span className="history-tag">Bỏ qua: {item.unansweredCount} câu</span>
                          )}
                        </div>
                      </div>

                      <div className="history-score-col">
                        <div className="history-score-box">
                          <span className="history-score-val">
                            {item.earnedPoints} <small>/ {item.maxPoints}</small>
                          </span>
                          <span className="history-score-pct">{item.percentage}%</span>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          icon={ArrowRight}
                          onClick={() => navigate(`/practice/result/${item.id}`)}
                        >
                          Xem lại
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PracticeHubPage
