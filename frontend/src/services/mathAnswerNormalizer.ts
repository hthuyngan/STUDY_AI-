/**
 * Math Answer Normalizer & Equality Evaluator
 * Safely normalizes and compares short-answer mathematical inputs without using eval().
 * Handles Vietnamese decimal commas, spaces, negative signs, fraction notations, and equivalent numerical forms.
 */

export interface NormalizedMathResult {
  raw: string
  normalized: string
  numericValue: number | null
  isFraction: boolean
}

/**
 * Standardizes raw user text or answer string:
 * - Trims leading/trailing whitespace
 * - Replaces full-width / unicode minus signs (–, —, −) with standard hyphen (-)
 * - Normalizes comma decimal separators into dots (e.g. "3,5" -> "3.5") when applicable
 * - Removes non-significant whitespace around operators (e.g. " 1 / 2 " -> "1/2")
 */
export function normalizeMathString(input: string): string {
  if (!input) return ''

  let s = input.trim()

  // Replace unicode minus characters with standard ASCII minus
  s = s.replace(/[\u2212\u2013\u2014]/g, '-')

  // Remove multiple spaces
  s = s.replace(/\s+/g, ' ')

  // Standardize fraction slash
  s = s.replace(/\s*\/\s*/g, '/')

  // Standardize decimal comma to dot if surrounded by digits (e.g. "3,14" -> "3.14")
  s = s.replace(/(\d+),(\d+)/g, '$1.$2')

  // Remove trailing decimal zeroes in standard decimals (e.g. "4.00" -> "4", "2.50" -> "2.5")
  if (/^-?\d+\.\d+$/.test(s)) {
    s = s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
  }

  return s
}

/**
 * Safely parses a string into a number if it is an integer, decimal, or simple fraction (a/b).
 * Returns null if the expression is invalid or cannot be deterministically evaluated without arbitrary code execution.
 */
export function parseMathValue(input: string): number | null {
  const s = normalizeMathString(input)
  if (!s) return null

  // Case 1: Pure integer or decimal number
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const val = Number(s)
    return Number.isFinite(val) ? val : null
  }

  // Case 2: Simple irreducible or reducible fraction a/b (e.g., "1/2", "-3/4", "10/5")
  const fractionMatch = /^(-?\d+)\/(-?\d+)$/.exec(s)
  if (fractionMatch) {
    const num = Number(fractionMatch[1])
    const den = Number(fractionMatch[2])
    if (den === 0 || !Number.isFinite(num) || !Number.isFinite(den)) return null
    return num / den
  }

  return null
}

/**
 * Checks whether user response matches accepted answers:
 * 1. Literal normalized string match
 * 2. Numeric equivalence within numerical precision (tolerance)
 */
export function isMathAnswerCorrect(
  userInput: string,
  acceptedAnswers: string[],
  tolerance?: number
): boolean {
  if (!userInput || acceptedAnswers.length === 0) return false

  const normalizedUser = normalizeMathString(userInput)
  const userNum = parseMathValue(userInput)

  for (const accepted of acceptedAnswers) {
    const normalizedAccepted = normalizeMathString(accepted)

    // Check direct normalized string match
    if (normalizedUser === normalizedAccepted) {
      return true
    }

    // Check numerical equivalence if both parse into valid numbers
    const acceptedNum = parseMathValue(accepted)
    if (userNum !== null && acceptedNum !== null) {
      if (typeof tolerance === 'number' && Number.isFinite(tolerance)) {
        if (Math.abs(userNum - acceptedNum) <= tolerance) {
          return true
        }
      } else {
        // Strict exact numeric equality when no tolerance is declared in question metadata
        if (userNum === acceptedNum) {
          return true
        }
      }
    }
  }

  return false
}
