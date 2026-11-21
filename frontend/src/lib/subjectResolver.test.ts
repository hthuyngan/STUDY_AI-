import { describe, expect, it } from 'vitest'
import {
  getCanonicalSubjectIdForGrade,
  getSubjectName,
  normalizeGrade,
  resolveSubject,
  resolveSubjectId,
} from './subjectResolver'

describe('subjectResolver', () => {
  describe('normalizeGrade', () => {
    it('normalizes grade 10 variants', () => {
      expect(normalizeGrade('10')).toBe('10')
      expect(normalizeGrade('Lớp 10')).toBe('10')
      expect(normalizeGrade('Toán 10')).toBe('10')
      expect(normalizeGrade('grade 10')).toBe('10')
    })

    it('normalizes grade 11 variants', () => {
      expect(normalizeGrade('11')).toBe('11')
      expect(normalizeGrade('Lớp 11')).toBe('11')
    })

    it('normalizes grade 12 variants', () => {
      expect(normalizeGrade('12')).toBe('12')
      expect(normalizeGrade('Lớp 12')).toBe('12')
    })

    it('returns null for unknown or empty input', () => {
      expect(normalizeGrade('')).toBeNull()
      expect(normalizeGrade(null)).toBeNull()
      expect(normalizeGrade(undefined)).toBeNull()
      expect(normalizeGrade('unknown')).toBeNull()
    })
  })

  describe('resolveSubjectId', () => {
    it('resolves explicit valid subjectId with highest priority', () => {
      expect(resolveSubjectId({ subjectId: 'sub_math10', grade: '12' })).toBe('sub_math10')
      expect(resolveSubjectId({ subjectId: 'sub_math11' })).toBe('sub_math11')
      expect(resolveSubjectId({ subjectId: 'sub_math12' })).toBe('sub_math12')
    })

    it('resolves from user grade when subjectId is not provided', () => {
      expect(resolveSubjectId({ grade: '10' })).toBe('sub_math10')
      expect(resolveSubjectId({ grade: 'Lớp 11' })).toBe('sub_math11')
      expect(resolveSubjectId({ grade: '12' })).toBe('sub_math12')
    })

    it('returns null and does NOT fallback to sub_math12 when unresolved', () => {
      expect(resolveSubjectId({})).toBeNull()
      expect(resolveSubjectId({ grade: null })).toBeNull()
      expect(resolveSubjectId({ grade: 'abc' })).toBeNull()
    })
  })

  describe('resolveSubject', () => {
    it('returns success: false when subject cannot be resolved', () => {
      const res = resolveSubject({})
      expect(res.success).toBe(false)
      expect(res.subjectId).toBeNull()
      expect(res.error).toBeDefined()
    })

    it('returns success: true with grade and name for grade 10', () => {
      const res = resolveSubject({ grade: '10' })
      expect(res.success).toBe(true)
      expect(res.subjectId).toBe('sub_math10')
      expect(res.grade).toBe('10')
      expect(res.subjectName).toBe('Toán học 10')
    })
  })

  describe('helpers', () => {
    it('returns canonical subject IDs', () => {
      expect(getCanonicalSubjectIdForGrade('10')).toBe('sub_math10')
      expect(getCanonicalSubjectIdForGrade('11')).toBe('sub_math11')
      expect(getCanonicalSubjectIdForGrade('12')).toBe('sub_math12')
    })

    it('returns friendly subject names', () => {
      expect(getSubjectName('sub_math10')).toBe('Toán học 10')
      expect(getSubjectName('sub_math11')).toBe('Toán học 11')
      expect(getSubjectName('sub_math12')).toBe('Toán học 12')
    })
  })
})
