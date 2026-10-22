import './AssessmentQuestionNav.css'

export interface AssessmentQuestionNavProps {
  totalQuestions: number
  currentIndex: number
  answeredIndices: number[]
  onSelectIndex: (index: number) => void
}

export function AssessmentQuestionNav({
  totalQuestions,
  currentIndex,
  answeredIndices,
  onSelectIndex,
}: AssessmentQuestionNavProps) {
  return (
    <nav className="assessment-question-nav" aria-label="Danh sách câu hỏi">
      <div className="question-nav-grid">
        {Array.from({ length: totalQuestions }).map((_, idx) => {
          const isCurrent = idx === currentIndex
          const isAnswered = answeredIndices.includes(idx)
          let stateClass = 'unanswered'
          if (isCurrent) stateClass = 'current'
          else if (isAnswered) stateClass = 'answered'

          return (
            <button
              key={idx}
              type="button"
              className={`question-nav-btn ${stateClass}`}
              onClick={() => onSelectIndex(idx)}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Câu ${idx + 1}${isAnswered ? ', đã trả lời' : ', chưa trả lời'}`}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
