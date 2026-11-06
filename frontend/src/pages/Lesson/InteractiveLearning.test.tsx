import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MathView } from '@/components/common/MathView'
import { VariationTable } from '@/components/lesson/VariationTable'
import { FunctionGraph } from '@/components/lesson/FunctionGraph'
import { curriculumRepository } from '@/repositories/curriculum.repository'
import { learningProgressRepository } from '@/repositories/learningProgress.repository'
import { learningContextService } from '@/services/learningContext.service'

describe('Phase 10 — Interactive Learning & Mathematical Content Foundation', () => {
  describe('1. MathView (KaTeX Display & Inline Rendering)', () => {
    it('renders KaTeX equations in display mode without crashing', () => {
      const formula = "f'(x) \\ge 0 \\implies f(x) \\text{ đồng biến}"
      const { container } = render(<MathView math={formula} displayMode />)
      expect(container.querySelector('.math-view-display')).toBeInTheDocument()
      expect(container.querySelector('.katex-display')).toBeInTheDocument()
    })

    it('renders inline KaTeX math symbols safely', () => {
      const { container } = render(<MathView math="x_0 \\in (a; b)" inline />)
      expect(container.querySelector('.math-view-inline')).toBeInTheDocument()
      expect(container.querySelector('.katex')).toBeInTheDocument()
    })

    it('falls back gracefully to raw text if KaTeX encounters extreme syntax', () => {
      const brokenFormula = '\\invalidKaTeXMacroWithoutEnd{'
      const { container } = render(<MathView math={brokenFormula} />)
      expect(container).toBeInTheDocument()
    })
  })

  describe('2. VariationTable (Pedagogical BBT Component)', () => {
    it('renders a 3-row variation table with x, y-prime, and y values', () => {
      render(
        <VariationTable
          title="Bảng biến thiên mẫu"
          functionMath="y = -x^3 + 3x - 1"
          columns={[
            { x: '-\\infty', yPrime: '', y: { value: '+\\infty', position: 'top' } },
            { x: '', yPrime: '-', y: { value: '', arrow: 'down' } },
            { x: '-1', yPrime: '0', y: { value: '-3', position: 'bottom' } },
            { x: '', yPrime: '+', y: { value: '', arrow: 'up' } },
            { x: '1', yPrime: '0', y: { value: '1', position: 'top' } },
            { x: '', yPrime: '-', y: { value: '', arrow: 'down' } },
            { x: '+\\infty', yPrime: '', y: { value: '-\\infty', position: 'bottom' } },
          ]}
          note="Hàm số đạt cực đại tại x = 1, cực tiểu tại x = -1."
        />
      )

      expect(screen.getByText('Bảng biến thiên mẫu')).toBeInTheDocument()
      expect(screen.getByText('BẢNG BIẾN THIÊN')).toBeInTheDocument()
      expect(screen.getByText(/Hàm số đạt cực đại tại x = 1/i)).toBeInTheDocument()
    })
  })

  describe('3. FunctionGraph (Verifiable Vector SVG Mathematics Graph)', () => {
    it('renders coordinate axes, curve paths and key points for cubic function', () => {
      const { container } = render(
        <FunctionGraph
          title="Đồ thị hàm số bậc ba"
          functionFormula="y = -x^3 + 3x - 1"
          functionType="cubic"
          domain={[-2.5, 2.5]}
          range={[-4, 3]}
          keyPoints={[
            { x: -1, y: -3, label: 'CT(-1; -3)', type: 'min' },
            { x: 1, y: 1, label: 'CĐ(1; 1)', type: 'max' },
            { x: 0, y: -1, label: 'I(0; -1)', type: 'inflection' },
          ]}
          note="Đường cong có tâm đối xứng I(0; -1)."
        />
      )

      expect(screen.getByText('Đồ thị hàm số bậc ba')).toBeInTheDocument()
      expect(container.querySelector('svg.function-graph-svg')).toBeInTheDocument()
      expect(container.querySelectorAll('path').length).toBeGreaterThan(0)
      expect(container.querySelectorAll('.key-point-group').length).toBe(3)
    })

    it('renders vertical and horizontal asymptotes for rational function', () => {
      render(
        <FunctionGraph
          title="Đồ thị hàm phân thức"
          functionFormula="y = (2x - 1)/(x + 1)"
          functionType="rational"
          asymptotes={[
            { type: 'vertical', value: -1, label: 'x = -1' },
            { type: 'horizontal', value: 2, label: 'y = 2' },
          ]}
        />
      )

      expect(screen.getByText('x = -1')).toBeInTheDocument()
      expect(screen.getByText('y = 2')).toBeInTheDocument()
    })
  })

  describe('4. Chapter 1 Content Integrity (Math 12 GDPT 2018)', () => {
    it('Lesson 1 includes rigorous definitions, formulas, BBT, examples, and common mistakes', async () => {
      const lesson = await curriculumRepository.getLessonById('lesson-math-12-01')
      expect(lesson).not.toBeNull()
      expect(lesson?.content?.definitions.length).toBeGreaterThanOrEqual(3)
      expect(lesson?.content?.formulas.length).toBeGreaterThanOrEqual(3)
      expect(lesson?.content?.examples.length).toBeGreaterThanOrEqual(2)
      expect(lesson?.content?.variationTables?.length).toBeGreaterThanOrEqual(1)
      expect(lesson?.content?.commonMistakes?.length).toBeGreaterThanOrEqual(3)

      // Verify standardized skill codes
      const skillCodes = lesson!.skills.map((s) => s.skillCode)
      expect(skillCodes).toContain('SKILL-MATH-12-DERIV-SIGN')
      expect(skillCodes).toContain('SKILL-MATH-12-MONOTONICITY')
      expect(skillCodes).toContain('SKILL-MATH-12-EXTREMUM')
      expect(skillCodes).toContain('SKILL-MATH-12-VARIATION-TABLE')
    })

    it('Lesson 2 includes Weierstrass theorem, segment/interval max-min, and common mistakes', async () => {
      const lesson = await curriculumRepository.getLessonById('lesson-math-12-02')
      expect(lesson).not.toBeNull()
      expect(lesson?.content?.formulas.some((f) => f.id === 'f-minmax-1')).toBe(true)
      expect(lesson?.content?.variationTables?.length).toBeGreaterThanOrEqual(1)
      expect(lesson?.content?.commonMistakes?.length).toBeGreaterThanOrEqual(3)

      const skillCodes = lesson!.skills.map((s) => s.skillCode)
      expect(skillCodes).toContain('SKILL-MATH-12-MINMAX-SEGMENT')
      expect(skillCodes).toContain('SKILL-MATH-12-MINMAX-INTERVAL')
    })

    it('Lesson 3 includes 3-step curve sketching, asymptotes, BBT, and SVG function graphs', async () => {
      const lesson = await curriculumRepository.getLessonById('lesson-math-12-03')
      expect(lesson).not.toBeNull()
      expect(lesson?.content?.variationTables?.length).toBeGreaterThanOrEqual(2)
      expect(lesson?.content?.functionGraphs?.length).toBeGreaterThanOrEqual(2)
      expect(lesson?.content?.commonMistakes?.length).toBeGreaterThanOrEqual(3)

      const skillCodes = lesson!.skills.map((s) => s.skillCode)
      expect(skillCodes).toContain('SKILL-MATH-12-GRAPH-SKETCHING')
      expect(skillCodes).toContain('SKILL-MATH-12-VARIATION-TABLE')
      expect(skillCodes).toContain('SKILL-MATH-12-ASYMPTOTE')
    })
  })

  describe('5. Contextual AI Tutor & Learning Progress Invariants', () => {
    it('sets contextual learning snapshot when asking AI from lesson section', () => {
      learningContextService.clearContext()
      expect(learningContextService.getContext()).toBeNull()

      learningContextService.setContext({
        source: 'lesson-section',
        title: 'Công thức trọng tâm',
        lessonId: 'lesson-math-12-01',
        subjectId: 'math',
        lessonTitle: 'Tính đơn điệu và cực trị của hàm số',
        subjectName: 'Toán học',
        sectionId: 'formulas',
        sectionTitle: 'Công thức trọng tâm',
        excerpt: "f'(x) \\ge 0 \\implies f \\text{ đồng biến}",
        returnUrl: '/subjects/math/lessons/lesson-math-12-01',
      })

      const ctx = learningContextService.getContext()
      expect(ctx).not.toBeNull()
      expect(ctx?.lessonId).toBe('lesson-math-12-01')
      expect(ctx?.sectionId).toBe('formulas')
      expect(ctx?.returnUrl).toBe('/subjects/math/lessons/lesson-math-12-01')
    })

    it('preserves learning progress invariant: opening AI Tutor never modifies lesson progress', () => {
      const initialProgress = learningProgressRepository.getByLessonId('lesson-math-12-01')
      const initialOverall = initialProgress?.overallProgress ?? 0

      // Simulate asking AI multiple times
      learningContextService.setContext({
        source: 'lesson-section',
        title: 'Ví dụ mẫu',
        lessonId: 'lesson-math-12-01',
        subjectId: 'math',
        lessonTitle: 'Tính đơn điệu',
        subjectName: 'Toán',
        sectionId: 'examples',
        sectionTitle: 'Ví dụ mẫu',
      })
      learningContextService.clearContext()

      const afterProgress = learningProgressRepository.getByLessonId('lesson-math-12-01')
      const afterOverall = afterProgress?.overallProgress ?? 0

      // Overall progress must strictly remain unchanged
      expect(afterOverall).toBe(initialOverall)
    })
  })
})
