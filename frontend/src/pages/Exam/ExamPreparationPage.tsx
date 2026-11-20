import React, { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Clock,
  Compass,
  FileQuestion,
  History,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ExamRevisionDashboard } from '@/components/exam/ExamRevisionDashboard'
import { ExamReviewAnalyticsModal } from '@/components/exam/ExamReviewAnalyticsModal'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { practiceService } from '@/services/practice.service'
import { examPrepService } from '@/services/examPrep.service'
import type { PracticeResult } from '@/types/practice'
import './ExamPreparationPage.css'

const SUBJECT_OPTIONS = [
  { id: 'sub_math10', label: 'Toán học 10' },
  { id: 'sub_math11', label: 'Toán học 11' },
  { id: 'sub_math12', label: 'Toán học 12' },
  { id: 'sub_physics12', label: 'Vật lý 12' },
  { id: 'sub_chemistry12', label: 'Hóa học 12' },
  { id: 'sub_english12', label: 'Tiếng Anh 12' },
]

export const ExamPreparationPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [selectedSubject, setSelectedSubject] = useState<string>(
    searchParams.get('subject') || 'sub_math12'
  )
  const [activeTab, setActiveTab] = useState<'hub' | 'history'>(
    searchParams.get('tab') === 'history' ? 'history' : 'hub'
  )

  const [examHistory, setExamHistory] = useState<PracticeResult[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedAnalyticsSessionId, setSelectedAnalyticsSessionId] = useState<string | null>(null)

  const loadExamHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const allHistory = await practiceService.getHistory()
      // Filter for exam sessions or recent submissions
      const exams = allHistory.filter((item) => (item as any).mode === 'exam' || item.maxPoints >= 10)
      setExamHistory(exams.length > 0 ? exams : allHistory)
    } catch {
      setExamHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'history') {
      setActiveTab('history')
    } else {
      setActiveTab('hub')
    }
  }, [searchParams])

  useEffect(() => {
    if (activeTab === 'history') {
      loadExamHistory()
    }
  }, [activeTab, selectedSubject, loadExamHistory])

  const handleStartExam = async (blueprintId: string) => {
    try {
      // 1. Fetch blueprint configuration to honor specific duration and question count
      let durationMinutes = 90
      let totalQuestions = 40
      let subjectId = selectedSubject

      try {
        const bp = await examPrepService.getBlueprintById(blueprintId)
        if (bp) {
          durationMinutes = bp.durationMinutes || durationMinutes
          totalQuestions = bp.totalQuestions || totalQuestions
          subjectId = bp.subjectId || subjectId
        }
      } catch {
        // Fallback to defaults if blueprint metadata cannot be preloaded
      }

      const session = await practiceService.startSession({
        mode: 'exam',
        subjectId,
        limit: totalQuestions,
        timeLimitMinutes: durationMinutes,
        blueprintId,
      })
      navigate(`/practice/session/${session.id}`)
    } catch {
      // Fallback navigation to practice hub with exam mode
      navigate(`/practice?mode=exam&blueprint=${blueprintId}&subject=${selectedSubject}`)
    }
  }

  return (
    <div className="exam-prep-page">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Trang chủ', to: '/dashboard' },
          { label: 'Luyện thi chuẩn GDPT 2018' },
        ]}
      />

      {/* Header */}
      <div className="exam-prep-header">
        <h1 className="exam-prep-title flex items-center gap-2">
          <Trophy className="text-amber-500 w-8 h-8" />
          Trung tâm Luyện thi & Ôn luyện Đề GDPT 2018
        </h1>
        <p className="exam-prep-subtitle">
          Thi thử theo cấu trúc ma trận 40 câu, phân tích nhận thức Bloom taxonomy, ôn câu sai ngắt quãng và lộ trình bứt phá điểm thi tốt nghiệp.
        </p>
      </div>

      {/* Subject Filter Bar */}
      <div className="exam-prep-filter-bar">
        <div className="exam-prep-subject-pills">
          {SUBJECT_OPTIONS.map((sub) => (
            <button
              key={sub.id}
              type="button"
              className={`exam-prep-subject-pill ${selectedSubject === sub.id ? 'is-active' : ''}`}
              onClick={() => {
                setSelectedSubject(sub.id)
                setSearchParams((prev) => {
                  prev.set('subject', sub.id)
                  return prev
                })
              }}
            >
              <Compass size={14} />
              {sub.label}
            </button>
          ))}
        </div>

        {/* Top-level Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`exam-prep-tab ${activeTab === 'hub' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('hub')
              setSearchParams((prev) => {
                prev.delete('tab')
                return prev
              })
            }}
          >
            <Sparkles size={16} />
            Đề thi & Ôn luyện AI
          </button>
          <button
            type="button"
            className={`exam-prep-tab ${activeTab === 'history' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('history')
              setSearchParams((prev) => {
                prev.set('tab', 'history')
                return prev
              })
            }}
          >
            <History size={16} />
            Lịch sử thi
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'hub' ? (
        <ExamRevisionDashboard
          subjectId={selectedSubject}
          onStartExam={handleStartExam}
        />
      ) : (
        <div className="exam-prep-history-view">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium">Đang tải lịch sử thi thử...</p>
            </div>
          ) : examHistory.length === 0 ? (
            <EmptyState
              icon={FileQuestion}
              title="Chưa có lượt thi thử nào"
              description="Hãy bắt đầu một đề thi chuẩn GDPT 2018 (40 câu) để phân tích năng lực và dự đoán điểm thi."
              actionLabel="Chọn đề thi thử ngay"
              onAction={() => setActiveTab('hub')}
            />
          ) : (
            <div className="exam-prep-history-grid">
              {examHistory.map((item) => {
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
                  <div key={item.id} className="exam-history-card">
                    <div className="exam-history-left">
                      <div className="exam-history-meta">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} /> {dateStr}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {durationMin}p {durationSec}s
                        </span>
                        <span>·</span>
                        <span>{item.totalQuestions} câu hỏi</span>
                      </div>
                      <h3 className="exam-history-title">
                        Đề thi thử GDPT 2018 · {SUBJECT_OPTIONS.find((s) => s.id === selectedSubject)?.label || 'Toán học 12'}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="text-emerald-600 font-medium">
                          ✓ {item.correctCount} đúng
                        </span>
                        <span className="text-rose-600 font-medium">
                          ✗ {item.incorrectCount} sai
                        </span>
                        <span>Điểm số: {item.earnedPoints} / {item.maxPoints} ({item.percentage}%)</span>
                      </div>
                    </div>

                    <div className="exam-history-right">
                      <div className="text-right">
                        <div className="exam-history-score">{item.percentage}%</div>
                        <span className="text-xs text-slate-400">Tỷ lệ chính xác</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAnalyticsSessionId(item.id)}
                        >
                          Phân tích nhận thức
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/practice/result/${item.id}`)}
                        >
                          Xem bài làm
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Cognitive Review Analytics Modal */}
      {selectedAnalyticsSessionId && (
        <ExamReviewAnalyticsModal
          sessionId={selectedAnalyticsSessionId}
          isOpen={!!selectedAnalyticsSessionId}
          onClose={() => setSelectedAnalyticsSessionId(null)}
        />
      )}
    </div>
  )
}

export default ExamPreparationPage
