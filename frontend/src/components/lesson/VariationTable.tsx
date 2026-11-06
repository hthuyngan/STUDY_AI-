import React from 'react'
import { Sparkles, Table as TableIcon } from 'lucide-react'
import { MathView } from '@/components/common/MathView'
import './VariationTable.css'

export interface VariationTableColumn {
  x: string // e.g. "-\\infty", "-1", "1", "+\\infty"
  yPrime: string // e.g. "-", "0", "+", "0", "-", "||"
  y: {
    value: string // e.g. "+\\infty", "-3", "1", "-\\infty"
    position?: 'top' | 'middle' | 'bottom'
    arrow?: 'up' | 'down' | 'none'
  }
}

export interface VariationTableProps {
  id?: string
  title: string
  functionMath?: string
  columns: VariationTableColumn[]
  note?: string
  onAskAI?: (title: string, contextSummary: string) => void
}

export const VariationTable: React.FC<VariationTableProps> = ({
  id,
  title,
  functionMath,
  columns,
  note,
  onAskAI,
}) => {
  const handleAskAI = () => {
    if (onAskAI) {
      const summary = `Bảng biến thiên ${title}: ${functionMath ? `Hàm số ${functionMath}. ` : ''}Các mốc x: ${columns.map((c) => c.x).join(', ')}.`
      onAskAI(title, summary)
    }
  }

  return (
    <div className="variation-table-card" id={id} tabIndex={0}>
      <div className="variation-table-header">
        <div className="variation-table-title-group">
          <TableIcon size={16} className="variation-table-icon" aria-hidden />
          <div className="variation-table-title-wrap">
            <span className="variation-table-badge">BẢNG BIẾN THIÊN</span>
            <h4 className="variation-table-title">{title}</h4>
            {functionMath && (
              <div className="variation-table-function">
                <MathView math={functionMath} inline />
              </div>
            )}
          </div>
        </div>

        {onAskAI && (
          <button
            type="button"
            className="variation-table-ai-btn"
            onClick={handleAskAI}
            aria-label={`Hỏi AI giải thích bảng biến thiên ${title}`}
            title="Hỏi AI Tutor phân tích bảng biến thiên này"
          >
            <Sparkles size={13} aria-hidden />
            <span>Phân tích BBT</span>
          </button>
        )}
      </div>

      <div className="variation-table-container" role="region" aria-label={`Bảng biến thiên ${title}`}>
        <table className="variation-table-grid">
          <tbody>
            {/* Row 1: x values */}
            <tr className="bbt-row-x">
              <th scope="row" className="bbt-header-cell">
                <MathView math="x" />
              </th>
              {columns.map((col, idx) => (
                <td key={`x-${idx}`} className="bbt-cell bbt-cell-x">
                  <MathView math={col.x} />
                </td>
              ))}
            </tr>

            {/* Row 2: y' (derivative signs) */}
            <tr className="bbt-row-yprime">
              <th scope="row" className="bbt-header-cell">
                <MathView math="y'" />
              </th>
              {columns.map((col, idx) => (
                <td key={`yp-${idx}`} className={`bbt-cell bbt-cell-yprime ${col.yPrime === '||' ? 'discontinuous' : ''}`}>
                  {col.yPrime === '||' ? <span className="double-bar">||</span> : <MathView math={col.yPrime} />}
                </td>
              ))}
            </tr>

            {/* Row 3: y (variation curve & values) */}
            <tr className="bbt-row-y">
              <th scope="row" className="bbt-header-cell">
                <MathView math="y" />
              </th>
              {columns.map((col, idx) => {
                const pos = col.y.position || 'middle'
                const arrow = col.y.arrow || 'none'
                return (
                  <td key={`y-${idx}`} className={`bbt-cell bbt-cell-y pos-${pos}`}>
                    <div className="bbt-y-content">
                      {arrow === 'up' && <span className="bbt-arrow up" aria-hidden>↗</span>}
                      {arrow === 'down' && <span className="bbt-arrow down" aria-hidden>↘</span>}
                      <span className="bbt-val">
                        <MathView math={col.y.value} />
                      </span>
                    </div>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {note && (
        <div className="variation-table-footer-note">
          <span className="note-label">Nhận xét:</span> {note}
        </div>
      )}
    </div>
  )
}

