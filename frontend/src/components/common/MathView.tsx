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

/**
 * Normalizes math string:
 * 1. Separates glued Vietnamese words (e.g. 'bằngmấy' -> 'bằng mấy').
 * 2. Ensures spaces around delimiters '$' so formulas don't stick to words.
 * 3. Handles dangling / unclosed '$' delimiters cleanly.
 */
function normalizeMathText(text: string): string {
  if (!text || typeof text !== 'string') return ''

  let normalized = text

  // Fix common glued Vietnamese words
  normalized = normalized
    .replace(/bằngmấy/gi, 'bằng mấy')
    .replace(/làgì/gi, 'là gì')
    .replace(/ởđâu/gi, 'ở đâu')
    .replace(/baonhiêu/gi, 'bao nhiêu')

  // Ensure space before opening '$' if preceded by a letter or digit
  normalized = normalized.replace(/([a-zA-Z\u00C0-\u1EF90-9])\$(?!\$)/g, '$1 $')

  // Ensure space after closing '$' if followed by a letter or digit
  normalized = normalized.replace(/(?<!\$)\$([a-zA-Z\u00C0-\u1EF90-9])/g, '$ $1')

  // Handle unclosed dangling dollar signs
  const dollarMatches = normalized.match(/(?<!\\)\$/g)
  if (dollarMatches && dollarMatches.length % 2 !== 0) {
    if (normalized.trimEnd().endsWith('$')) {
      normalized = normalized.trimEnd().slice(0, -1)
    } else {
      const lastIdx = normalized.lastIndexOf('$')
      const after = normalized.slice(lastIdx + 1)
      if (!/[\\{}_^=+\-*/<>]/.test(after)) {
        normalized = normalized.slice(0, lastIdx) + ' ' + after
      } else {
        normalized = normalized + '$'
      }
    }
  }

  return normalized
}

const VIETNAMESE_ACCENT_REGEX = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i

function sanitizeMathToken(token: string): { isPureProse: boolean; formula: string } {
  const trimmed = token.trim()
  const hasAccents = VIETNAMESE_ACCENT_REGEX.test(trimmed)
  const hasMathSymbols = /[\\{}_^=+\-*/<>]|\d+/.test(trimmed)

  // If token is purely Vietnamese words without any math operators, it's prose, not a formula
  if (hasAccents && !hasMathSymbols) {
    return { isPureProse: true, formula: trimmed }
  }

  if (!hasAccents) {
    return { isPureProse: false, formula: trimmed }
  }

  // Wrap Vietnamese words/phrases inside the math formula with \text{...} if not already wrapped
  const formula = trimmed.replace(/(?<!\\text\{)([\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)*)(?!\})/gu, (segment) => {
    if (VIETNAMESE_ACCENT_REGEX.test(segment) && !segment.startsWith('\\')) {
      return `\\text{${segment}}`
    }
    return segment
  })

  return { isPureProse: false, formula }
}

export const MathView: React.FC<MathViewProps> = ({
  math,
  displayMode = false,
  inline = false,
  className = '',
  ariaLabel,
}) => {
  const isDisplay = displayMode && !inline

  const cleanText = useMemo(() => normalizeMathText(math), [math])

  // Delimiters detection
  const hasDelimiters = useMemo(() => {
    return (
      cleanText.includes('$') ||
      cleanText.includes('\\(') ||
      cleanText.includes('\\[')
    )
  }, [cleanText])

  // Check if text has LaTeX backslash command (like \frac, \sqrt, \alpha)
  const hasLatexCommands = useMemo(() => {
    return /\\[a-zA-Z]+/.test(cleanText)
  }, [cleanText])

  const renderedContent = useMemo(() => {
    if (!cleanText) return null

    // Case 1: Mixed text with $...$ or \(...\) or \[...\] delimiters
    if (hasDelimiters) {
      const parts: React.ReactNode[] = []
      const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g
      let lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = regex.exec(cleanText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanText.substring(lastIndex, match.index))
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

        const { isPureProse, formula: cleanFormula } = sanitizeMathToken(formula)
        if (isPureProse) {
          parts.push(cleanFormula)
          lastIndex = match.index + token.length
          continue
        }

        let html: string | null = null
        try {
          html = katex.renderToString(cleanFormula, {
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

      if (lastIndex < cleanText.length) {
        parts.push(cleanText.substring(lastIndex))
      }

      return parts
    }

    // Case 2: Pure math or display mode (explicit displayMode or contains LaTeX commands like \frac)
    if (isDisplay || hasLatexCommands) {
      const textWithoutTextMacros = cleanText.replace(/\\text\{[^}]*\}/g, '')
      const hasBareAccents = VIETNAMESE_ACCENT_REGEX.test(textWithoutTextMacros)

      // If it contains NO LaTeX commands and has bare accents and no math operators, it's plain text (not math)
      if (hasBareAccents && !hasLatexCommands && !/[=<>_{}^\\+\-*/]/.test(cleanText)) {
        return cleanText
      }

      let formulaToRender = cleanText.trim()
      if (hasBareAccents) {
        formulaToRender = formulaToRender.replace(/(?<!\\text\{)([\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)*)(?!\})/gu, (segment) => {
          if (VIETNAMESE_ACCENT_REGEX.test(segment) && !segment.startsWith('\\')) {
            return `\\text{${segment}}`
          }
          return segment
        })
      }

      let pureHtml: string | null = null
      try {
        pureHtml = katex.renderToString(formulaToRender, {
          displayMode: isDisplay,
          throwOnError: false,
        })
      } catch {
        pureHtml = null
      }

      if (pureHtml !== null) {
        return <span dangerouslySetInnerHTML={{ __html: pureHtml }} />
      }
    }

    // Case 3: Plain Vietnamese / text content (do NOT run through KaTeX to avoid mangling spaces & letters)
    return cleanText
  }, [cleanText, hasDelimiters, hasLatexCommands, isDisplay])

  if (isDisplay) {
    return (
      <div
        className={`math-view-display ${className}`}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel || `Công thức toán học: ${cleanText}`}
      >
        {renderedContent}
      </div>
    )
  }

  return (
    <span
      className={`math-view-inline ${className}`}
      role="text"
      aria-label={ariaLabel}
    >
      {renderedContent}
    </span>
  )
}
export default MathView
