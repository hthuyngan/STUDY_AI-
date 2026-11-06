import React, { useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Sparkles,
  Tag,
} from 'lucide-react'
import { MathView } from '@/components/common/MathView'
import { MultipleChoiceItem } from './MultipleChoiceItem'
import { ShortAnswerItem } from './ShortAnswerItem'
import { TrueFalseGroupItem } from './TrueFalseGroupItem'
import type { QuestionItem } from '@/types/questionBank'
import './QuestionItemView.css'

interface QuestionItemViewProps {
  question: QuestionItem
  index?: number
  defaultShowExplanation?: boolean
  allowInteractivePreview?: boolean
  onAskAI?: (question: QuestionItem) => void
}

export const QuestionItemView: React.FC<QuestionItemViewProps> = ({
  question,
  index,
  defaultShowExplanation = false,
  allowInteractivePreview = true,
  onAskAI,
}) => {
  const [showExplanation, setShowExplanation] = useState(defaultShowExplanation)
  const [userMcqChoice, setUserMcqChoice] = useState<'A' | 'B' | 'C' | 'D' | undefined>()
  const [userTfgChoices, setUserTfgChoices] = useState<Record<string, boolean>>({})
  const [userSaInput, setUserSaInput] = useState('')

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case 'easy':
        return { label: 'Dễ', cls: 'diff-easy' }
      case 'medium':
        return { label: 'Trung bình', cls: 'diff-medium' }
      case 'hard':
        return { label: 'Khó', cls: 'diff-hard' }
      case 'very_hard':
        return { label: 'Rất khó', cls: 'diff-very-hard' }
      default:
        return { label: diff, cls: 'diff-medium' }
    }
  }

  const getCognitiveLabel = (cog: string) => {
    switch (cog) {
      case 'recognition':
        return 'Nhận biết'
      case 'comprehension':
        return 'Thông hiểu'
      case 'application':
        return 'Vận dụng'
      case 'high_application':
        return 'Vận dụng cao'
      default:
        return cog
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return { label: 'Trắc nghiệm 4 lựa chọn', cls: 'type-mcq' }
      case 'true_false_group':
        return { label: 'Đúng / Sai theo cụm (4 ý)', cls: 'type-tfg' }
      case 'short_answer':
        return { label: 'Trả lời ngắn', cls: 'type-sa' }
      default:
        return { label: type, cls: 'type-mcq' }
    }
  }

  const diffObj = getDifficultyLabel(question.difficulty)
  const typeObj = getTypeBadge(question.type)

  return (
    <div className="qb-question-card" id={`q-card-${question.id}`}>
      {/* Question Header */}
      <div className="qb-card-header">
        <div className="qb-header-meta">
          {index !== undefined && <span className="qb-index-badge">Câu {index + 1}</span>}
          <span className={`qb-type-badge ${typeObj.cls}`}>{typeObj.label}</span>
          <span className={`qb-diff-badge ${diffObj.cls}`}>{diffObj.label}</span>
          <span className="qb-cog-badge">{getCognitiveLabel(question.cognitiveLevel)}</span>
          <span className={`qb-status-badge status-${question.reviewStatus}`}>
            {question.reviewStatus === 'approved'
              ? 'Đã duyệt'
              : question.reviewStatus === 'needs_review'
                ? 'Chờ duyệt'
                : question.reviewStatus}
          </span>
        </div>

        <div className="qb-header-actions">
          {onAskAI && (
            <button
              type="button"
              className="qb-ask-ai-btn"
              onClick={() => onAskAI(question)}
              title="Hỏi AI Tutor trợ giúp câu hỏi này"
            >
              <Sparkles size={14} aria-hidden />
              <span>Hỏi AI</span>
            </button>
          )}
          <button
            type="button"
            className="qb-toggle-exp-btn"
            onClick={() => setShowExplanation((prev) => !prev)}
            aria-expanded={showExplanation}
          >
            <Lightbulb size={14} aria-hidden />
            <span>{showExplanation ? 'Ẩn lời giải' : 'Xem lời giải'}</span>
            {showExplanation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Question Stem (Math KaTeX supported) */}
      <div className="qb-card-stem">
        <MathView math={question.stem} />
      </div>

      {/* Interactive Item Body depending on Type */}
      <div className="qb-card-body">
        {question.type === 'multiple_choice' && (
          <MultipleChoiceItem
            question={question}
            showAnswer={showExplanation}
            selectedOption={userMcqChoice}
            onSelectOption={allowInteractivePreview ? setUserMcqChoice : undefined}
          />
        )}

        {question.type === 'true_false_group' && (
          <TrueFalseGroupItem
            question={question}
            showAnswer={showExplanation}
            userAnswers={userTfgChoices}
            onSelectAnswer={
              allowInteractivePreview
                ? (subId, val) =>
                    setUserTfgChoices((prev) => ({
                      ...prev,
                      [subId]: val,
                    }))
                : undefined
            }
          />
        )}

        {question.type === 'short_answer' && (
          <ShortAnswerItem
            question={question}
            showAnswer={showExplanation}
            userInput={userSaInput}
            onChangeInput={allowInteractivePreview ? setUserSaInput : undefined}
          />
        )}
      </div>

      {/* Detailed Step-by-Step Explanation Section */}
      {showExplanation && (
        <div className="qb-explanation-drawer">
          <div className="qb-explanation-header">
            <CheckCircle2 size={16} className="exp-icon" aria-hidden />
            <h4 className="exp-title">Hướng dẫn giải chi tiết (Từng bước)</h4>
          </div>
          <div className="qb-explanation-content">
            <MathView math={question.explanation} />
          </div>
          {question.reviewerNote && (
            <div className="qb-reviewer-note">
              <strong>Lưu ý kiểm duyệt:</strong> {question.reviewerNote}
            </div>
          )}
        </div>
      )}

      {/* Question Footer: Linked Skills & Source */}
      <div className="qb-card-footer">
        <div className="qb-skills-pills">
          <Tag size={12} aria-hidden />
          <span className="skills-label">Kỹ năng năng lực:</span>
          {question.skillIds.map((sk) => (
            <code key={sk} className="qb-skill-tag">
              {sk}
            </code>
          ))}
        </div>
        {question.source && (
          <div className="qb-source-text">
            <BookOpen size={12} aria-hidden />
            <span>Nguồn: {question.source}</span>
          </div>
        )}
      </div>
    </div>
  )
}
