import type { ReactNode } from 'react'
import { AlertCircle, BookMarked, Check, Lightbulb } from 'lucide-react'
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

export function DefinitionBlock({ term, content }: { term: string; content: string }) {
  return (
    <div className="definition-block">
      <div className="definition-header">
        <BookMarked size={16} className="definition-icon" aria-hidden />
        <span className="definition-term">{term}</span>
      </div>
      <p className="definition-content">{content}</p>
    </div>
  )
}

export function FormulaBlock({ formula }: { formula: FormulaItem }) {
  return (
    <div className="formula-block">
      <div className="formula-label">{formula.label}</div>
      <div className="formula-math-display" tabIndex={0}>
        <code>{formula.formula}</code>
      </div>
      {formula.note && <div className="formula-note">{formula.note}</div>}
    </div>
  )
}

export function ExampleBlock({ example }: { example: ExampleItem }) {
  return (
    <div className="example-block">
      <div className="example-header">
        <Lightbulb size={16} className="example-icon" aria-hidden />
        <span className="example-title">{example.title}</span>
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
                  <code>{step.math}</code>
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

export function LessonSummaryBlock({ points }: { points: string[] }) {
  return (
    <div className="lesson-summary-block">
      <div className="summary-header">
        <Check size={16} className="summary-icon" aria-hidden />
        <span className="summary-title">Tóm tắt ghi nhớ</span>
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
