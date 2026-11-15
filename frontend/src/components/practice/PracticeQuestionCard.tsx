import React, { useState } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { MathView } from '@/components/common/MathView'
import { aiTutorService } from '@/services/aiTutor.service'
import type { HintResponse } from '@/types/aiTutor'
import type { QuestionItem } from '@/types/questionBank'
import type {
  MultipleChoiceAnswer,
  ShortAnswerAnswer,
  StudentAnswer,
  TrueFalseGroupAnswer,
} from '@/types/practice'
import './PracticeQuestionCard.css'

interface PracticeQuestionCardProps {
  question: QuestionItem
  index: number
  totalCount: number
  answer?: StudentAnswer | null
  onAnswerChange: (answer: StudentAnswer) => void
  disabled?: boolean
  sessionId?: string
  mode?: string
}

export const PracticeQuestionCard: React.FC<PracticeQuestionCardProps> = ({
  question,
  index,
  totalCount,
  answer,
  onAnswerChange,
  disabled = false,
  sessionId,
  mode,
}) => {
  // Local state for Short Answer to prevent jarring re-renders while typing
  const [localInput, setLocalInput] = useState<string>(
    answer?.questionType === 'short_answer' ? (answer as ShortAnswerAnswer).rawInput : ''
  )

  // AI Hint Ladder state
  const [showHints, setShowHints] = useState<boolean>(false)
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3>(1)
  const [hintData, setHintData] = useState<HintResponse | null>(null)
  const [hintLoading, setHintLoading] = useState<boolean>(false)
  const [hintError, setHintError] = useState<string | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const isExamMode = mode === 'exam' || mode === 'test'

  const cancelHintRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setHintLoading(false)
      setHintError('Đã hủy yêu cầu tải gợi ý.')
    }
  }

  const fetchHint = async (level: 1 | 2 | 3) => {
    setHintLevel(level)
    setHintLoading(true)
    setHintError(null)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await aiTutorService.getHintLadder(
        question.id,
        level,
        answer ? JSON.stringify(answer) : undefined,
        sessionId,
        mode
      )
      if (!controller.signal.aborted) {
        setHintData(res)
      }
    } catch (err: any) {
      if (controller.signal.aborted) return
      const msg = err?.message || ''
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        setHintError('Hệ thống AI đang bị giới hạn tần suất (Rate Limit - 429). Vui lòng thử lại sau giây lát.')
      } else if (msg.toLowerCase().includes('timeout') || msg.includes('quá thời gian')) {
        setHintError('Thời gian phản hồi AI vượt quá giới hạn chờ (Timeout). Vui lòng thử lại.')
      } else {
        setHintError(msg || 'Không thể tải gợi ý vào lúc này.')
      }
    } finally {
      if (!controller.signal.aborted) {
        setHintLoading(false)
        abortControllerRef.current = null
      }
    }
  }

  const toggleHintDrawer = () => {
    const next = !showHints
    setShowHints(next)
    if (next && !hintData && !hintLoading) {
      fetchHint(1)
    }
  }

  const handleMcqSelect = (optionId: 'A' | 'B' | 'C' | 'D') => {
    if (disabled) return
    const newAnswer: MultipleChoiceAnswer = {
      questionType: 'multiple_choice',
      selectedOption: optionId,
    }
    onAnswerChange(newAnswer)
  }

  const handleTfgSelect = (subId: 'a' | 'b' | 'c' | 'd', value: boolean) => {
    if (disabled) return
    const currentSub =
      answer?.questionType === 'true_false_group'
        ? { ...(answer as TrueFalseGroupAnswer).subItemAnswers }
        : { a: null, b: null, c: null, d: null }

    currentSub[subId] = value

    const newAnswer: TrueFalseGroupAnswer = {
      questionType: 'true_false_group',
      subItemAnswers: currentSub,
    }
    onAnswerChange(newAnswer)
  }

  const handleSaChange = (val: string) => {
    setLocalInput(val)
    const newAnswer: ShortAnswerAnswer = {
      questionType: 'short_answer',
      rawInput: val,
    }
    onAnswerChange(newAnswer)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Trắc nghiệm 4 lựa chọn (MCQ)'
      case 'true_false_group':
        return 'Đúng / Sai theo cụm (4 nhận định)'
      case 'short_answer':
        return 'Điền đáp án ngắn'
      default:
        return type
    }
  }

  return (
    <div className="practice-question-card" id={`practice-q-${question.id}`}>
      {/* Question Header */}
      <div className="practice-q-header">
        <div className="practice-q-meta">
          <span className="practice-q-number">
            Câu {index + 1} / {totalCount}
          </span>
          <span className="practice-q-type-badge">{getTypeLabel(question.type)}</span>
          <span className="practice-q-diff-badge">Độ khó: {question.difficulty}</span>
        </div>
      </div>

      {/* Question Stem (KaTeX supported) */}
      <div className="practice-q-stem">
        <MathView math={question.stem} />
      </div>

      {/* Interactive Answer Input based on Type */}
      <div className="practice-q-body">
        {/* Type A: Multiple Choice */}
        {question.type === 'multiple_choice' && (
          <div className="practice-mcq-grid" role="radiogroup" aria-label="Phương án lựa chọn">
            {question.options.map((opt) => {
              const selectedOption =
                answer?.questionType === 'multiple_choice'
                  ? (answer as MultipleChoiceAnswer).selectedOption
                  : null
              const isSelected = selectedOption === opt.id

              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`practice-mcq-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleMcqSelect(opt.id)}
                  disabled={disabled}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <div className="practice-mcq-badge">
                    <span>{opt.id}</span>
                  </div>
                  <div className="practice-mcq-text">
                    <MathView math={opt.text} inline />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Type B: True / False Group (4 sub-items) */}
        {question.type === 'true_false_group' && (
          <div className="practice-tfg-container">
            <div className="practice-tfg-banner">
              <span>Mỗi ý a, b, c, d là một mệnh đề độc lập. Chọn Đúng hoặc Sai cho từng ý:</span>
            </div>
            <div className="practice-tfg-list">
              {question.subItems.map((sub) => {
                const subAnswers =
                  answer?.questionType === 'true_false_group'
                    ? (answer as TrueFalseGroupAnswer).subItemAnswers
                    : { a: null, b: null, c: null, d: null }
                const currentVal = subAnswers[sub.id]

                return (
                  <div key={sub.id} className="practice-tfg-row">
                    <div className="practice-tfg-statement">
                      <strong className="practice-tfg-id">{sub.id})</strong>
                      <div className="practice-tfg-math">
                        <MathView math={sub.statement} inline />
                      </div>
                    </div>

                    <div className="practice-tfg-pills">
                      <button
                        type="button"
                        className={`practice-choice-pill ${currentVal === true ? 'active-true' : ''}`}
                        onClick={() => handleTfgSelect(sub.id, true)}
                        disabled={disabled}
                        aria-pressed={currentVal === true}
                      >
                        Đúng
                      </button>
                      <button
                        type="button"
                        className={`practice-choice-pill ${currentVal === false ? 'active-false' : ''}`}
                        onClick={() => handleTfgSelect(sub.id, false)}
                        disabled={disabled}
                        aria-pressed={currentVal === false}
                      >
                        Sai
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Type C: Short Answer */}
        {question.type === 'short_answer' && (
          <div className="practice-sa-container">
            <label htmlFor={`sa-input-${question.id}`} className="practice-sa-label">
              Nhập đáp án số học hoặc kết quả rút gọn:
            </label>
            <div className="practice-sa-input-wrap">
              <input
                id={`sa-input-${question.id}`}
                type="text"
                className="practice-sa-input"
                placeholder="Ví dụ: 3, -1/2, 4.5..."
                value={localInput}
                onChange={(e) => handleSaChange(e.target.value)}
                onKeyDown={(e) => {
                  // Invariant: Prevent accidentally submitting practice session when pressing Enter in input field
                  if (e.key === 'Enter') {
                    e.preventDefault()
                  }
                }}
                disabled={disabled}
                autoComplete="off"
              />
              {question.unit && <span className="practice-sa-unit">{question.unit}</span>}
            </div>
            <p className="practice-sa-hint">
              * Gợi ý: Có thể nhập số nguyên, số thập phân (dấu phẩy hoặc dấu chấm) hoặc phân số (a/b).
            </p>
          </div>
        )}
      </div>

      {/* Socratic AI Hint Ladder Section */}
      {!isExamMode && (
        <div className="practice-hint-ladder-container">
          <div className="practice-hint-header">
            <button
              type="button"
              className="practice-hint-toggle-btn"
              onClick={toggleHintDrawer}
              aria-expanded={showHints}
            >
              <Lightbulb className="hint-btn-icon" size={16} />
              <span>Gợi ý Socratic (AI Hint)</span>
              {showHints ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <span className="practice-hint-mode-badge">3 Cấp độ tư duy</span>
          </div>

          {showHints && (
            <div className="practice-hint-drawer" role="region" aria-label="Gợi ý AI">
              <div className="hint-ladder-pills">
                <button
                  type="button"
                  className={`hint-ladder-pill ${hintLevel === 1 ? 'active' : ''}`}
                  onClick={() => fetchHint(1)}
                  disabled={hintLoading}
                >
                  <Sparkles size={14} />
                  <span>Cấp 1: Định hướng</span>
                </button>
                <button
                  type="button"
                  className={`hint-ladder-pill ${hintLevel === 2 ? 'active' : ''}`}
                  onClick={() => fetchHint(2)}
                  disabled={hintLoading}
                >
                  <span>Cấp 2: Phương pháp</span>
                </button>
                <button
                  type="button"
                  className={`hint-ladder-pill ${hintLevel === 3 ? 'active' : ''}`}
                  onClick={() => fetchHint(3)}
                  disabled={hintLoading}
                >
                  <span>Cấp 3: Bước then chốt</span>
                </button>
              </div>

              {hintLoading && (
                <div className="hint-loading-state" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Loader2 className="spinner" size={18} />
                    <span>AI Tutor đang phân tích bài toán và tạo gợi ý...</span>
                  </div>
                  <button
                    type="button"
                    onClick={cancelHintRequest}
                    style={{ fontSize: '0.78rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', color: '#475569' }}
                  >
                    Hủy
                  </button>
                </div>
              )}

              {hintError && (
                <div className="hint-error-state">
                  <AlertCircle size={16} />
                  <span>{hintError}</span>
                  <button type="button" onClick={() => fetchHint(hintLevel)} className="hint-retry-btn">
                    Thử lại
                  </button>
                </div>
              )}

              {!hintLoading && !hintError && hintData && (
                <div className="hint-result-box">
                  <div className="hint-title-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{hintData.hintLevelName}</strong>
                    {hintData.isFallback ? (
                      <span className="hint-fallback-badge" style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>
                        Quy tắc Socratic Fallback
                      </span>
                    ) : (
                      <span className="hint-live-badge" style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>
                        AI Live: {hintData.provider || 'OpenAI'}
                      </span>
                    )}
                  </div>
                  <div className="hint-text-body">
                    <MathView math={hintData.hintText} />
                  </div>
                  {hintData.suggestedNextSteps && hintData.suggestedNextSteps.length > 0 && (
                    <div className="hint-steps-list">
                      <span className="hint-steps-label">Các bước tiếp theo nên làm:</span>
                      <ul>
                        {hintData.suggestedNextSteps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
