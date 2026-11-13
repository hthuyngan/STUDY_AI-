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

  // Check if string contains mixed text with $...$ delimiters
  const hasDelimiters = typeof math === 'string' && (math.includes('$') || math.includes('\\(') || math.includes('\\['))

  const renderedContent = useMemo(() => {
    if (!math) return null

    if (hasDelimiters) {
      const parts: React.ReactNode[] = []
      const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g
      let lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = regex.exec(math)) !== null) {
        if (match.index > lastIndex) {
          parts.push(math.substring(lastIndex, match.index))
        }
        const token = match[0]
        let formula = ''
        let isBlock = false

        if (token.startsWith('$$') && token.endsWith('$$')) {
          formula = token.slice(2, -2)
          isBlock = true
        } else if (token.startsWith('\\[') && token.endsWith('\\]')) {
          formula = token.slice(2, -2)
          isBlock = true
        } else if (token.startsWith('$') && token.endsWith('$')) {
          formula = token.slice(1, -1)
          isBlock = false
        } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
          formula = token.slice(2, -2)
          isBlock = false
        }

        let html: string | null = null
        try {
          html = katex.renderToString(formula.trim(), {
            displayMode: isBlock || isDisplay,
            throwOnError: false,
          })
        } catch {
          html = null
        }

        if (html !== null) {
          parts.push(
            <span
              key={`math-${match.index}`}
              className={isBlock ? 'katex-display-wrapper' : 'katex-inline-wrapper'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        } else {
          parts.push(token)
        }

        lastIndex = match.index + token.length
      }

      if (lastIndex < math.length) {
        parts.push(math.substring(lastIndex))
      }

      return parts
    }

    // Pure math formula
    let pureHtml: string | null = null
    try {
      pureHtml = katex.renderToString(math.trim(), {
        displayMode: isDisplay,
        throwOnError: false,
      })
    } catch {
      pureHtml = null
    }

    if (pureHtml !== null) {
      return <span dangerouslySetInnerHTML={{ __html: pureHtml }} />
    }
    return math
  }, [math, hasDelimiters, isDisplay])

  if (isDisplay) {
    return (
      <div
        className={`math-view-display ${className}`}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel || `Công thức toán học: ${math}`}
      >
        {renderedContent}
      </div>
    )
  }

  return (
    <span
      className={`math-view-inline ${className}`}
      role="math"
      aria-label={ariaLabel || math}
    >
      {renderedContent}
    </span>
  )
}
