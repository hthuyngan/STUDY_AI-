import React, { useEffect, useState } from 'react'
import {
  ArrowRight,
  Calendar,
  Clock,
  FileQuestion,
  History,
  Play,
  Target,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PracticeSetup } from '@/components/practice/PracticeSetup'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { practiceService } from '@/services/practice.service'
import type { PracticeResult, PracticeSession, PracticeSetupConfig } from '@/types/practice'
import './PracticeHubPage.css'

export const PracticeHubPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'setup' | 'history'>('setup')
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null)
  const [history, setHistory] = useState<PracticeResult[]>([])
  const [loading, setLoading] = useState<boolean>(true)

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
      const session = await practiceService.startSession(config)
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
            { label: 'Luyện tập & Đánh giá năng lực' },
          ]}
        />
      </div>

      {/* Hero Header */}
      <div className="practice-hub-hero">
        <div className="hub-hero-badge">
          <Target size={14} aria-hidden />
          <span>HỆ THỐNG LUYỆN TẬP XÁC ĐỊNH · GDPT 2018</span>
        </div>
        <h1 className="hub-hero-title">Luyện tập & Đánh giá năng lực Toán 12</h1>
        <p className="hub-hero-desc">
          Làm bài tập thực tế từ Ngân hàng câu hỏi kiểm chứng, tự động lưu nháp, chấm điểm
          theo thang chuẩn GDPT 2018 và phân tích độ thành thạo theo từng kỹ năng năng lực.
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
          onClick={() => setActiveTab('setup')}
          role="tab"
          aria-selected={activeTab === 'setup'}
        >
          <Target size={16} aria-hidden />
          <span>Tạo bài luyện tập mới</span>
        </button>

        <button
          type="button"
          className={`hub-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
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
          <PracticeSetup onStartSession={handleStartSession} />
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
