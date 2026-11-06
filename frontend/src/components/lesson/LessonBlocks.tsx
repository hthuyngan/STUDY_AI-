import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, BookMarked, Check, Lightbulb, Sparkles } from 'lucide-react'
import { MathView } from '@/components/common/MathView'
import type { ExampleItem, FormulaItem } from '@/types/lesson'
import './LessonBlocks.css'

export function LessonHeading({
  children,
  extra,
}: {
  children: ReactNode
  extra?: ReactNode
}) {
  return (
    <div className="lesson-heading-row">
      <h2 className="lesson-block-heading">{children}</h2>
      {extra && <div className="lesson-heading-extra">{extra}</div>}
    </div>
  )
}

export function LessonParagraph({ children }: { children: ReactNode }) {
  return <p className="lesson-block-paragraph">{children}</p>
}

export function DefinitionBlock({
  term,
  content,
  onAskAI,
}: {
  term: string
  content: string
  onAskAI?: (term: string, excerpt: string) => void
}) {
  return (
    <div className="definition-block">
      <div className="definition-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookMarked size={16} className="definition-icon" aria-hidden />
          <span className="definition-term">{term}</span>
        </div>
        {onAskAI && (
          <button
            type="button"
            className="block-contextual-ai-btn"
            onClick={() => onAskAI(term, content)}
            aria-label={`Hỏi AI giải thích định nghĩa ${term}`}
            title="Hỏi AI Tutor giải thích khái niệm này"
          >
            <Sparkles size={12} aria-hidden />
            <span>Hỏi AI</span>
          </button>
        )}
      </div>
      <p className="definition-content">{content}</p>
    </div>
  )
}

export function FormulaBlock({
  formula,
  onAskAI,
}: {
  formula: FormulaItem
  onAskAI?: (label: string, formulaStr: string) => void
}) {
  return (
    <div className="formula-block">
      <div className="formula-header-row">
        <div className="formula-label">{formula.label}</div>
        {onAskAI && (
          <button
            type="button"
            className="block-contextual-ai-btn"
            onClick={() => onAskAI(formula.label, formula.formula)}
            aria-label={`Hỏi AI giải thích công thức ${formula.label}`}
            title="Hỏi AI Tutor giải thích ý nghĩa và điều kiện áp dụng công thức này"
          >
            <Sparkles size={12} aria-hidden />
            <span>Giải thích công thức</span>
          </button>
        )}
      </div>

      <div className="formula-math-display" tabIndex={0}>
        <MathView math={formula.formula} displayMode />
      </div>

      {formula.note && (
        <div className="formula-note">
          <span className="formula-note-badge">Điều kiện áp dụng:</span> {formula.note}
        </div>
      )}
    </div>
  )
}

export function ExampleBlock({
  example,
  onAskAI,
}: {
  example: ExampleItem
  onAskAI?: (title: string, problem: string) => void
}) {
  return (
    <div className="example-block">
      <div className="example-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={16} className="example-icon" aria-hidden />
          <span className="example-title">{example.title}</span>
        </div>
        {onAskAI && (
          <button
            type="button"
            className="block-contextual-ai-btn"
            onClick={() => onAskAI(example.title, example.problem)}
            aria-label={`Hỏi AI hướng dẫn từng bước cho ${example.title}`}
            title="Hỏi AI Tutor hướng dẫn phương pháp giải cho bài toán này"
          >
            <Sparkles size={12} aria-hidden />
            <span>Hướng dẫn từng bước</span>
          </button>
        )}
      </div>

      <div className="example-problem">
        <strong>Bài toán: </strong>
        {example.problem}
      </div>

      <div className="example-solution">
        <span className="solution-label">Lời giải chi tiết:</span>
        <ol className="solution-steps-list">
          {example.solutionSteps.map((step) => (
            <li key={step.step} className="solution-step-item">
              <span className="step-num">Bước {step.step}:</span>
              <span className="step-text">{step.explanation}</span>
              {step.math && (
                <div className="step-math-box">
                  <MathView math={step.math} displayMode />
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="example-conclusion">
        <span className="conclusion-badge">Kết luận</span>
        <p className="conclusion-text">{example.conclusion}</p>
      </div>
    </div>
  )
}

export function CommonMistakesBlock({
  mistakes,
  onAskAI,
}: {
  mistakes: Array<{ title: string; mistake: string; correctExplanation: string }>
  onAskAI?: (title: string, detail: string) => void
}) {
  return (
    <div className="common-mistakes-block" role="region" aria-label="Bẫy đề thi và lỗi sai thường gặp">
      <div className="mistakes-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} className="mistakes-icon" aria-hidden />
          <span className="mistakes-title">Bẫy đề thi & Lỗi sai thường gặp</span>
        </div>
        {onAskAI && (
          <button
            type="button"
            className="block-contextual-ai-btn"
            onClick={() => onAskAI('Bẫy đề thi & Sai lầm thường gặp', mistakes.map((m) => m.title).join(', '))}
            aria-label="Hỏi AI cách tránh các bẫy đề thi này"
          >
            <Sparkles size={12} aria-hidden />
            <span>Hỏi mẹo tránh bẫy</span>
          </button>
        )}
      </div>

      <div className="mistakes-list">
        {mistakes.map((item, idx) => (
          <div key={idx} className="mistake-item-card">
            <h4 className="mistake-item-title">{item.title}</h4>
            <div className="mistake-comparison">
              <div className="mistake-wrong-box">
                <span className="tag-wrong">✗ Sai lầm hay gặp:</span>
                <p className="mistake-wrong-text">{item.mistake}</p>
              </div>
              <div className="mistake-correct-box">
                <span className="tag-correct">✓ Hiểu đúng chuẩn GDPT:</span>
                <p className="mistake-correct-text">{item.correctExplanation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ImportantNote({ notes }: { notes: string[] }) {
  return (
    <div className="important-note-block" role="note">
      <div className="note-header">
        <AlertCircle size={16} className="note-icon" aria-hidden />
        <span className="note-title">Lưu ý quan trọng khi làm bài</span>
      </div>
      <ul className="note-list">
        {notes.map((note, idx) => (
          <li key={idx} className="note-item">
            {note}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LessonSummaryBlock({
  points,
  onAskAI,
}: {
  points: string[]
  onAskAI?: () => void
}) {
  return (
    <div className="lesson-summary-block">
      <div className="summary-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} className="summary-icon" aria-hidden />
          <span className="summary-title">Tóm tắt kiến thức trọng tâm</span>
        </div>
        {onAskAI && (
          <button
            type="button"
            className="block-contextual-ai-btn"
            onClick={onAskAI}
            aria-label="Hỏi AI tóm tắt nhanh kiến thức"
          >
            <Sparkles size={12} aria-hidden />
            <span>Ôn tập nhanh với AI</span>
          </button>
        )}
      </div>
      <ul className="summary-list">
        {points.map((p, idx) => (
          <li key={idx} className="summary-item">
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}
