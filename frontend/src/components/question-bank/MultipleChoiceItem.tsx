import React from 'react'
import { MathView } from '@/components/common/MathView'
import type { MultipleChoiceQuestion } from '@/types/questionBank'
import './QuestionItemView.css'

interface MultipleChoiceItemProps {
  question: MultipleChoiceQuestion
  showAnswer?: boolean
  selectedOption?: string
  onSelectOption?: (optionId: 'A' | 'B' | 'C' | 'D') => void
  disabled?: boolean
}

export const MultipleChoiceItem: React.FC<MultipleChoiceItemProps> = ({
  question,
  showAnswer = false,
  selectedOption,
  onSelectOption,
  disabled = false,
}) => {
  return (
    <div className="mcq-options-container" role="radiogroup" aria-label="Phương án lựa chọn">
      {question.options.map((opt) => {
        const isSelected = selectedOption === opt.id
        const isCorrect = question.correctAnswer === opt.id

        let itemStateClass = ''
        if (showAnswer) {
          if (isCorrect) itemStateClass = 'state-correct'
          else if (isSelected && !isCorrect) itemStateClass = 'state-incorrect'
        } else if (isSelected) {
          itemStateClass = 'state-selected'
        }

        return (
          <button
            key={opt.id}
            type="button"
            className={`mcq-option-button ${itemStateClass}`}
            onClick={() => onSelectOption && onSelectOption(opt.id)}
            disabled={disabled}
            aria-checked={isSelected}
            role="radio"
          >
            <div className="mcq-option-badge">
              <span>{opt.id}</span>
            </div>
            <div className="mcq-option-text">
              <MathView math={opt.text} inline />
            </div>
            {showAnswer && isCorrect && (
              <span className="mcq-status-tag tag-correct">Đáp án đúng</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
