import React, { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import './MathView.css'

export interface MathViewProps {
  math: string
  displayMode?: boolean
  inline?: boolean
  className?: string
  ariaLabel?: string
}

export const MathView: React.FC<MathViewProps> = ({
  math,
  displayMode = false,
  inline = false,
  className = '',
  ariaLabel,
}) => {
  const isDisplay = displayMode && !inline
  const renderedHtml = useMemo(() => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: isDisplay,
        throwOnError: false,
      })
    } catch {
      return math
    }
  }, [math, isDisplay])

  if (isDisplay) {
    return (
      <div
        className={`math-view-display ${className}`}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel || `Công thức toán học: ${math}`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    )
  }

  return (
    <span
      className={`math-view-inline ${className}`}
      role="math"
      aria-label={ariaLabel || math}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  )
}

