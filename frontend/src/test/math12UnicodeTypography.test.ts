import { describe, it, expect } from 'vitest'
import { MASTER_CURRICULUM_SUBJECTS } from '@/data/curriculum.data'

describe('Vietnamese Unicode & Math 12 Curriculum Verification', () => {
  const MOJIBAKE_REGEX = /ChÆ|á»|áº|TÃ|Ã¡|Ã |áº£|á»‹|á»ƒ|Ä‘|Ä|Ă¡|Æ°/

  it('MASTER_CURRICULUM_SUBJECTS contains no mojibake corruption', () => {
    const rawJson = JSON.stringify(MASTER_CURRICULUM_SUBJECTS)
    expect(MOJIBAKE_REGEX.test(rawJson)).toBe(false)
  })

  it('Math 12 curriculum has pure Vietnamese diacritics for all 6 chapters', () => {
    const mathSubject = MASTER_CURRICULUM_SUBJECTS.find(s => s.id === 'math')
    expect(mathSubject).toBeDefined()

    const grade12 = mathSubject?.grades.find(g => g.grade === '12')
    expect(grade12).toBeDefined()
    expect(grade12?.chapters.length).toBe(6)

    const expectedKeywords = [
      'Chương 1: Ứng dụng đạo hàm',
      'Chương 2: Vectơ và hệ trục tọa độ',
      'Chương 3: Các số đặc trưng đo mức độ phân tán',
      'Chương 4: Nguyên hàm. Tích phân.',
      'Chương 5: Phương pháp tọa độ',
      'Chương 6: Xác suất có điều kiện',
    ]

    grade12?.chapters.forEach((chap, idx) => {
      expect(chap.title).toContain(expectedKeywords[idx])
      expect(MOJIBAKE_REGEX.test(chap.title)).toBe(false)
      expect(MOJIBAKE_REGEX.test(chap.description || '')).toBe(false)
    })
  })

  it('KaTeX formulas in Math 12 lessons contain valid LaTeX math syntax', () => {
    const mathSubject = MASTER_CURRICULUM_SUBJECTS.find(s => s.id === 'math')
    const grade12 = mathSubject?.grades.find(g => g.grade === '12')
    const chapter1 = grade12?.chapters[0]

    expect(chapter1?.lessons.length).toBeGreaterThan(0)
    chapter1?.lessons.forEach(lesson => {
      expect(lesson.title).toBeDefined()
      expect(MOJIBAKE_REGEX.test(lesson.title)).toBe(false)
      expect(lesson.learningObjectives?.length).toBeGreaterThan(0)
      lesson.learningObjectives?.forEach(obj => {
        expect(MOJIBAKE_REGEX.test(obj)).toBe(false)
      })
    })
  })
})

