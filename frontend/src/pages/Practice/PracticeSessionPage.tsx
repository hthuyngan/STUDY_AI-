import React, { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Send,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { PracticeQuestionCard } from '@/components/practice/PracticeQuestionCard'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { practiceService } from '@/services/practice.service'
import { questionBankService } from '@/services/questionBank.service'
import type { PracticeSession, StudentAnswer } from '@/types/practice'
import type { QuestionItem } from '@/types/questionBank'
import './PracticeSessionPage.css'

export const PracticeSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<PracticeSession | null>(null)
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Submit confirmation modal state
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      if (!sessionId) {
        if (isMounted) {
          setError('Thiếu mã phiên làm bài.')
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setError(null)

      try {
        const sess = await practiceService.getSessionById(sessionId)
        if (!sess) {
          if (isMounted) {
            setError(`Không tìm thấy phiên làm bài với mã "${sessionId}".`)
          }
          return
        }

        // If session is already submitted, navigate directly to its result
        if (sess.status === 'submitted' && sess.resultId) {
          navigate(`/practice/result/${sess.resultId}`, { replace: true })
          return
        }

        // Retrieve all questions for this session
        const loadedQuestions: QuestionItem[] = []
        for (const qId of sess.questionIds) {
          const q = await questionBankService.getQuestionById(qId)
          if (q) {
            loadedQuestions.push(q)
          }
        }

        if (isMounted) {
          setSession(sess)
          setQuestions(loadedQuestions)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Lỗi khi tải phiên làm bài.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      isMounted = false
    }
  }, [sessionId, navigate])

  // Handle student answering
  const handleAnswerChange = async (ans: StudentAnswer) => {
    if (!session || !currentQuestion) return

    // Optimistic UI update
    const updatedAnswers = {
      ...session.answers,
      [currentQuestion.id]: ans,
    }
    setSession({
      ...session,
      answers: updatedAnswers,
    })

    // Auto-save persistence to repository
    try {
      await practiceService.saveAnswer(session.id, currentQuestion.id, ans)
    } catch (e) {
      console.error('Auto-save error:', e)
    }
  }

  // Handle session submission
  const handleConfirmSubmit = async () => {
    if (!session || submitting) return
    setSubmitting(true)

    try {
      const result = await practiceService.submitSession(session.id)
      setIsSubmitConfirmOpen(false)
      navigate(`/practice/result/${result.id}`)
    } catch (err: any) {
      alert(`Lỗi nộp bài: ${err?.message || 'Vui lòng thử lại.'}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="practice-session-root">
        <Skeleton variant="text" width={240} height={20} />
        <div style={{ marginTop: 20 }}>
          <Skeleton variant="rect" width="100%" height={260} />
        </div>
      </div>
    )
  }

  if (error || !session || questions.length === 0) {
    return (
      <div className="practice-session-root">
        <Breadcrumb
          items={[
            { label: 'Học tập', to: '/dashboard' },
            { label: 'Luyện tập', to: '/exercises' },
            { label: 'Phiên làm bài' },
          ]}
        />
        <PageErrorState description={error || 'Phiên làm bài không khả dụng.'} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]

  // Count answered questions
  let answeredCount = 0
  for (const q of questions) {
    const ans = session.answers[q.id]
    if (ans) {
      if (ans.questionType === 'multiple_choice' && ans.selectedOption !== null) {
        answeredCount++
      } else if (ans.questionType === 'true_false_group') {
        const hasChoice = Object.values(ans.subItemAnswers).some((v) => v !== null)
        if (hasChoice) answeredCount++
      } else if (ans.questionType === 'short_answer' && ans.rawInput.trim() !== '') {
        answeredCount++
      }
    }
  }

  const unansweredCount = questions.length - answeredCount

  return (
    <div className="practice-session-root">
      {/* Top Breadcrumb & Status Bar */}
      <div className="session-top-nav">
        <Breadcrumb
          items={[
            { label: 'Học tập', to: '/dashboard' },
            { label: 'Luyện tập', to: '/exercises' },
            { label: `Phiên làm bài (${session.questionIds.length} câu)` },
          ]}
        />
        <div className="session-status-badge">
          <Clock size={14} aria-hidden />
          <span>Đang làm bài · Tự động lưu nháp</span>
        </div>
      </div>

      {/* Progress & Question Palette Grid */}
      <div className="session-palette-card">
        <div className="palette-header">
          <span className="palette-title">Tiến độ bài làm:</span>
          <span className="palette-counter">
            Đã làm: <strong>{answeredCount}</strong> / {questions.length} câu
          </span>
        </div>

        <div className="palette-grid">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIndex
            const ans = session.answers[q.id]
            let isAnswered = false
            if (ans) {
              if (ans.questionType === 'multiple_choice') isAnswered = ans.selectedOption !== null
              else if (ans.questionType === 'true_false_group') {
                isAnswered = Object.values(ans.subItemAnswers).some((v) => v !== null)
              } else if (ans.questionType === 'short_answer') {
                isAnswered = ans.rawInput.trim() !== ''
              }
            }

            return (
              <button
                key={q.id}
                type="button"
                className={`palette-num-btn ${isCurrent ? 'current' : ''} ${
                  isAnswered ? 'answered' : ''
                }`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Câu ${idx + 1}: ${isAnswered ? 'Đã làm' : 'Chưa làm'}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Question Card */}
      {currentQuestion && (
        <PracticeQuestionCard
          question={currentQuestion}
          index={currentIndex}
          totalCount={questions.length}
          answer={session.answers[currentQuestion.id] || null}
          onAnswerChange={handleAnswerChange}
        />
      )}

      {/* Bottom Navigation & Submit Bar */}
      <div className="session-bottom-bar">
        <div className="nav-step-buttons">
          <Button
            variant="outline"
            icon={ArrowLeft}
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          >
            Câu trước
          </Button>

          <Button
            variant="outline"
            icon={ArrowRight}
            disabled={currentIndex === questions.length - 1}
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
          >
            Câu tiếp theo
          </Button>
        </div>

        <div className="submit-action-wrap">
          <Button
            variant="primary"
            icon={Send}
            onClick={() => setIsSubmitConfirmOpen(true)}
          >
            Nộp bài
          </Button>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isSubmitConfirmOpen}
        title="Xác nhận nộp bài luyện tập"
        message={
          unansweredCount > 0
            ? `Bạn vẫn còn ${unansweredCount} câu chưa hoàn thành. Sau khi nộp bài, bạn sẽ không thể chỉnh sửa đáp án được nữa. Bạn có chắc chắn muốn nộp bài?`
            : 'Bạn đã hoàn thành tất cả các câu hỏi! Bạn có muốn nộp bài để xem điểm và hướng dẫn giải chi tiết?'
        }
        confirmText={submitting ? 'Đang chấm điểm...' : 'Xác nhận nộp'}
        cancelText="Kiểm tra lại"
        variant={unansweredCount > 0 ? 'warning' : 'primary'}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setIsSubmitConfirmOpen(false)}
      />
    </div>
  )
}

export default PracticeSessionPage
