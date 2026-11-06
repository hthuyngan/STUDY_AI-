import React from 'react'
import { MathView } from '@/components/common/MathView'
import type { TrueFalseGroupQuestion } from '@/types/questionBank'
import './QuestionItemView.css'

interface TrueFalseGroupItemProps {
  question: TrueFalseGroupQuestion
  showAnswer?: boolean
  userAnswers?: Record<string, boolean>
  onSelectAnswer?: (subItemId: string, value: boolean) => void
  disabled?: boolean
}

export const TrueFalseGroupItem: React.FC<TrueFalseGroupItemProps> = ({
  question,
  showAnswer = false,
  userAnswers = {},
  onSelectAnswer,
  disabled = false,
}) => {
  return (
    <div className="tfg-table-wrapper">
      <div className="tfg-instruction-banner">
        <span>Mỗi ý a, b, c, d dưới đây là một mệnh đề độc lập. Hãy chọn Đúng hoặc Sai:</span>
      </div>

      <div className="tfg-items-list">
        {question.subItems.map((sub) => {
          const userVal = userAnswers[sub.id]

          return (
            <div key={sub.id} className="tfg-row-card">
              <div className="tfg-statement-col">
                <span className="tfg-sub-id">{sub.id})</span>
                <div className="tfg-statement-text">
                  <MathView math={sub.statement} inline />
                </div>
              </div>

              <div className="tfg-action-col">
                <button
                  type="button"
                  className={`tfg-choice-pill ${userVal === true ? 'selected-true' : ''} ${
                    showAnswer && sub.isCorrect ? 'answer-correct-key' : ''
                  }`}
                  onClick={() => onSelectAnswer && onSelectAnswer(sub.id, true)}
                  disabled={disabled}
                  aria-pressed={userVal === true}
                >
                  Đúng
                </button>

                <button
                  type="button"
                  className={`tfg-choice-pill ${userVal === false ? 'selected-false' : ''} ${
                    showAnswer && !sub.isCorrect ? 'answer-correct-key' : ''
                  }`}
                  onClick={() => onSelectAnswer && onSelectAnswer(sub.id, false)}
                  disabled={disabled}
                  aria-pressed={userVal === false}
                >
                  Sai
                </button>
              </div>

              {showAnswer && sub.explanation && (
                <div className="tfg-sub-explanation">
                  <span className="sub-exp-label">
                    Đáp án chuẩn: <strong>{sub.isCorrect ? 'Đúng' : 'Sai'}</strong>.
                  </span>
                  <div className="sub-exp-text">
                    <MathView math={sub.explanation} inline />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
