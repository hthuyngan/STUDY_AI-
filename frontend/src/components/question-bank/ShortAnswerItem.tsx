import React, { useState } from 'react'
import { MathView } from '@/components/common/MathView'
import type { ShortAnswerQuestion } from '@/types/questionBank'
import './QuestionItemView.css'

interface ShortAnswerItemProps {
  question: ShortAnswerQuestion
  showAnswer?: boolean
  userInput?: string
  onChangeInput?: (value: string) => void
  disabled?: boolean
}

export const ShortAnswerItem: React.FC<ShortAnswerItemProps> = ({
  question,
  showAnswer = false,
  userInput = '',
  onChangeInput,
  disabled = false,
}) => {
  const [localVal, setLocalVal] = useState(userInput)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e.target.value)
    if (onChangeInput) {
      onChangeInput(e.target.value)
    }
  }

  return (
    <div className="short-answer-wrapper">
      <div className="sa-input-row">
        <label htmlFor={`input-${question.id}`} className="sa-input-label">
          Nhập đáp án số học hoặc kết quả rút gọn:
        </label>
        <div className="sa-input-field-group">
          <input
            id={`input-${question.id}`}
            type="text"
            className="sa-text-input"
            placeholder="Ví dụ: 3, -1/2, 4.5..."
            value={userInput || localVal}
            onChange={handleChange}
            disabled={disabled}
            autoComplete="off"
          />
          {question.unit && <span className="sa-unit-badge">{question.unit}</span>}
        </div>
      </div>

      {showAnswer && (
        <div className="sa-answer-display-box">
          <div className="sa-key-title">Đáp án chuẩn chấp nhận:</div>
          <div className="sa-key-val">
            <MathView math={question.displayAnswer} inline />
          </div>
          <div className="sa-variants-text">
            Chấp nhận các biến thể số học: <code>{question.acceptedAnswers.join(' | ')}</code>
          </div>
        </div>
      )}
    </div>
  )
}
