import React, { useState } from 'react'
import { MathView } from '@/components/common/MathView'
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
}

export const PracticeQuestionCard: React.FC<PracticeQuestionCardProps> = ({
  question,
  index,
  totalCount,
  answer,
  onAnswerChange,
  disabled = false,
}) => {
  // Local state for Short Answer to prevent jarring re-renders while typing
  const [localInput, setLocalInput] = useState<string>(
    answer?.questionType === 'short_answer' ? (answer as ShortAnswerAnswer).rawInput : ''
  )

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
    </div>
  )
}
