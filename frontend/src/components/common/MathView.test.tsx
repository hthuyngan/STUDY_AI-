import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MathView } from './MathView'

describe('MathView Component & KaTeX Typography', () => {
  it('renders inline math with delimiters into KaTeX wrapper', () => {
    const { container } = render(<MathView math="$x^2 + y^2 = 1$" />)
    expect(container.querySelector('.katex-inline-wrapper')).toBeInTheDocument()
    expect(container.querySelector('.katex')).toBeInTheDocument()
  })

  it('renders block math with displayMode into responsive scrollable display wrapper', () => {
    const { container } = render(<MathView math="$$\int_0^1 f(x)dx = F(1) - F(0)$$" displayMode />)
    const displayWrapper = container.querySelector('.katex-display-wrapper')
    expect(displayWrapper).toBeInTheDocument()
    expect(container.querySelector('.katex-display')).toBeInTheDocument()
  })

  it('renders mixed Vietnamese prose and math without warnings or corrupted characters', () => {
    const { container } = render(
      <MathView math="Cho hàm số $y = f(x)$ xác định trên $\mathbb{R}$ và thỏa mãn $f'(x) = 0$ tại các điểm cực trị." />
    )
    expect(screen.getByText(/Cho hàm số/i)).toBeInTheDocument()
    expect(screen.getByText(/xác định trên/i)).toBeInTheDocument()
    expect(screen.getByText(/và thỏa mãn/i)).toBeInTheDocument()
    expect(container.querySelectorAll('.katex-inline-wrapper').length).toBe(3)
  })

  it('safely handles pure Vietnamese text inside delimiters as prose without feeding raw accents to KaTeX', () => {
    const { container } = render(<MathView math="$Đạo hàm & Cực trị hàm số$" />)
    expect(screen.getByText(/Đạo hàm & Cực trị hàm số/i)).toBeInTheDocument()
    expect(container.querySelector('.katex')).not.toBeInTheDocument()
  })

  it('falls back to plain text for un-delimited Vietnamese prose even when displayMode is requested', () => {
    const { container } = render(
      <MathView math="Khảo sát sự biến thiên và vẽ đồ thị hàm số bậc ba" displayMode />
    )
    expect(screen.getByText(/Khảo sát sự biến thiên và vẽ đồ thị/i)).toBeInTheDocument()
    expect(container.querySelector('.katex')).not.toBeInTheDocument()
  })

  it('wraps long formulas in horizontally scrollable container with thin scrollbar', () => {
    const longFormula = '$$f(x) = a_0 + \\sum_{n=1}^{\\infty} \\left( a_n \\cos\\frac{n\\pi x}{L} + b_n \\sin\\frac{n\\pi x}{L} \\right) + \\int_{-\\infty}^{\\infty} g(t) e^{-i\\omega t} dt$$'
    const { container } = render(<MathView math={longFormula} displayMode />)
    const region = container.querySelector('.math-view-display')
    expect(region).toBeInTheDocument()
    expect(region).toHaveAttribute('role', 'region')
  })
})
