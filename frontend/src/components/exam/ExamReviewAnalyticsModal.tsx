import React, { useEffect, useState } from 'react'
import {
  Award,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  RotateCw,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAiChat } from '@/context/AiChatContext'
import { learningAnalyticsService } from '@/services/learningAnalytics.service'
import type { ExamReviewAnalytics } from '@/types/learningAnalytics'

interface ExamReviewAnalyticsModalProps {
  sessionId: string
  isOpen: boolean
  onClose: () => void
}

export const ExamReviewAnalyticsModal: React.FC<ExamReviewAnalyticsModalProps> = ({
  sessionId,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate()
  const { openChat } = useAiChat()
  const [data, setData] = useState<ExamReviewAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen || !sessionId) return
    let isMounted = true

    const load = async () => {
      setLoading(true)
      try {
        const result = await learningAnalyticsService.getExamReviewAnalytics(sessionId)
        if (isMounted) setData(result)
      } catch {
        // Handled gracefully
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [sessionId, isOpen])

  if (!isOpen) return null

  const handleAskTutor = (topicName: string) => {
    openChat(
      {
        title: `Ôn tập thi thử: ${topicName}`,
        source: 'practice',
        subjectId: 'sub_math12',
        subjectName: 'Toán 12',
        lessonTitle: topicName,
      },
      `Thầy ơi, trong bài thi thử vừa rồi em bị sai câu hỏi thuộc chủ đề "${topicName}". Thầy hướng dẫn em phương pháp giải chuẩn và các lỗi cần tránh được không ạ?`
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award style={{ width: 24, height: 24, color: 'var(--primary-600)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Phân tích kết quả thi thử chi tiết</h3>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {data?.examTitle || 'Đề thi thử THPT Quốc gia'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <RotateCw className="animate-spin" style={{ margin: '0 auto 12px', width: 28, height: 28 }} />
            <p style={{ color: 'var(--text-secondary)' }}>Đang tính toán phân tích chuyên sâu...</p>
          </div>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Score Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Điểm số (Thang 10)</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: (data.scoreScaled ?? 0) >= 8 ? '#10b981' : (data.scoreScaled ?? 0) >= 5 ? 'var(--primary-600)' : '#ef4444' }}>
                  {(data.scoreScaled ?? 0).toFixed(2)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Số câu đúng</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 style={{ width: 20, height: 20 }} /> {data.correctCount}/{data.totalQuestions}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Số câu sai</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <XCircle style={{ width: 20, height: 20 }} /> {data.incorrectCount}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Thời gian làm</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {Math.round(data.timeSpentSeconds / 60)} phút
                </div>
              </div>
            </div>

            {/* Cognitive Level Breakdown */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.9375rem', fontWeight: 700 }}>Phân rã theo mức độ nhận thức GDPT 2018:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                {Object.entries(data.byCognitiveBreakdown).map(([key, stat]) => (
                  <div key={key} style={{ padding: '10px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stat.levelName || key}</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: '2px' }}>
                      {stat.accuracyPercent}%
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                      {stat.correctCount}/{stat.totalQuestions} câu
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chapter Breakdown */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.9375rem', fontWeight: 700 }}>Kết quả theo Chương:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {data.byChapterBreakdown.map((chp) => (
                  <div key={chp.chapterId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 500 }}>{chp.chapterTitle}</span>
                    <span style={{ fontWeight: 700 }}>{chp.completedLessons}/{chp.totalLessons} câu ({chp.averageMasteryScore}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mistake Topics & Contextual AI Tutor Button */}
            {data.mistakeTopics.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.9375rem', fontWeight: 700, color: '#ef4444' }}>
                  Chủ đề có câu trả lời sai (Hỏi AI Tutor giải thích):
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {data.mistakeTopics.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => handleAskTutor(topic)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        borderRadius: '20px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <HelpCircle style={{ width: 14, height: 14 }} /> {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Lessons */}
            {data.recommendedLessons.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.9375rem', fontWeight: 700 }}>Bài học đề xuất ôn tập:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.recommendedLessons.map((rec) => (
                    <div
                      key={rec.lessonId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: 'rgba(99, 102, 241, 0.06)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '8px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{rec.lessonTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{rec.reason}</div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={BookOpen}
                        onClick={() => {
                          onClose()
                          navigate(`/lessons/${rec.lessonId}`)
                        }}
                      >
                        Học lại bài này
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px' }}>Không có dữ liệu bài thi.</div>
        )}
      </div>
    </div>
  )
}
