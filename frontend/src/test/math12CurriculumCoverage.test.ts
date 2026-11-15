import { describe, expect, it } from 'vitest'
import { MASTER_CURRICULUM_SUBJECTS } from '@/data/curriculum.data'

/**
 * 1. Danh mục tham chiếu đã xác minh từ Khan Academy (Verified Reference Inventory)
 */
export interface VerifiedKhanItem {
  chapterOrder: number
  chapterTitle: string
  topicOrder: number
  topicTitle: string
  lessonOrder: number
  lessonTitle: string
  contentType: 'video' | 'article' | 'exercise' | 'test'
  sourceUrl: string
  videoAvailable: boolean
  licenseStatus: string
}

export const VERIFIED_KHAN_MATH12_INVENTORY: VerifiedKhanItem[] = [
  // Chương 1: Đạo hàm & Khảo sát hàm số (Verified items)
  {
    chapterOrder: 1,
    chapterTitle: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
    topicOrder: 1,
    topicTitle: 'Tính đơn điệu của hàm số',
    lessonOrder: 1,
    lessonTitle: 'Khái niệm đồng biến, nghịch biến & dấu đạo hàm',
    contentType: 'video',
    sourceUrl: 'https://vi.khanacademy.org/math/toan-lop-12-viet-nam',
    videoAvailable: true,
    licenseStatus: 'khan_copyright',
  },
  {
    chapterOrder: 1,
    chapterTitle: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
    topicOrder: 1,
    topicTitle: 'Tính đơn điệu của hàm số',
    lessonOrder: 2,
    lessonTitle: 'Quy tắc xét tính đơn điệu của hàm số',
    contentType: 'article',
    sourceUrl: 'https://vi.khanacademy.org/math/toan-lop-12-viet-nam',
    videoAvailable: false,
    licenseStatus: 'open_ref',
  },
  {
    chapterOrder: 1,
    chapterTitle: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
    topicOrder: 1,
    topicTitle: 'Tính đơn điệu của hàm số',
    lessonOrder: 3,
    lessonTitle: 'Luyện tập: Xét tính đơn điệu hàm số',
    contentType: 'exercise',
    sourceUrl: 'https://vi.khanacademy.org/math/toan-lop-12-viet-nam',
    videoAvailable: false,
    licenseStatus: 'khan_exercise',
  },
  {
    chapterOrder: 1,
    chapterTitle: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
    topicOrder: 2,
    topicTitle: 'Cực trị của hàm số',
    lessonOrder: 4,
    lessonTitle: 'Định nghĩa cực đại và cực tiểu',
    contentType: 'video',
    sourceUrl: 'https://vi.khanacademy.org/math/toan-lop-12-viet-nam',
    videoAvailable: true,
    licenseStatus: 'khan_copyright',
  },
  {
    chapterOrder: 1,
    chapterTitle: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
    topicOrder: 2,
    topicTitle: 'Cực trị của hàm số',
    lessonOrder: 5,
    lessonTitle: 'Điều kiện cần và đủ để hàm số có cực trị',
    contentType: 'article',
    sourceUrl: 'https://vi.khanacademy.org/math/toan-lop-12-viet-nam',
    videoAvailable: false,
    licenseStatus: 'open_ref',
  },
  {
    chapterOrder: 1,
    chapterTitle: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
    topicOrder: 2,
    topicTitle: 'Cực trị của hàm số',
    lessonOrder: 6,
    lessonTitle: 'Luyện tập: Tìm điểm cực trị của đồ thị hàm số',
    contentType: 'exercise',
    sourceUrl: 'https://vi.khanacademy.org/math/toan-lop-12-viet-nam',
    videoAvailable: false,
    licenseStatus: 'khan_exercise',
  },
  {
    chapterOrder: 1,
    chapterTitle: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
    topicOrder: 3,
    topicTitle: 'Giá trị lớn nhất và giá trị nhỏ nhất của hàm số',
    lessonOrder: 7,
    lessonTitle: 'Khái niệm GTLN và GTNN của hàm số',
    contentType: 'video',
    sourceUrl: 'https://vi.khanacademy.org/math/toan-lop-12-viet-nam',
    videoAvailable: true,
    licenseStatus: 'khan_copyright',
  },
  {
    chapterOrder: 1,
    chapterTitle: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
    topicOrder: 3,
    topicTitle: 'Giá trị lớn nhất và giá trị nhỏ nhất của hàm số',
    lessonOrder: 8,
    lessonTitle: 'Phương pháp tìm GTLN, GTNN trên đoạn [a; b]',
    contentType: 'article',
    sourceUrl: 'https://vi.khanacademy.org/math/toan-lop-12-viet-nam',
    videoAvailable: false,
    licenseStatus: 'open_ref',
  },
  {
    chapterOrder: 1,
    chapterTitle: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
    topicOrder: 3,
    topicTitle: 'Giá trị lớn nhất và giá trị nhỏ nhất của hàm số',
    lessonOrder: 9,
    lessonTitle: 'Luyện tập: Bài toán tối ưu thực tế',
    contentType: 'exercise',
    sourceUrl: 'https://vi.khanacademy.org/math/toan-lop-12-viet-nam',
    videoAvailable: false,
    licenseStatus: 'khan_exercise',
  },
  {
    chapterOrder: 1,
    chapterTitle: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
    topicOrder: 4,
    topicTitle: 'Khảo sát và vẽ đồ thị hàm số',
    lessonOrder: 10,
    lessonTitle: 'Sơ đồ tổng quát khảo sát hàm số',
    contentType: 'video',
    sourceUrl: 'https://vi.khanacademy.org/math/toan-lop-12-viet-nam',
    videoAvailable: true,
    licenseStatus: 'khan_copyright',
  },
]

describe('Math 12 Curriculum & Khan Academy Audit Verification', () => {
  const mathSubject = MASTER_CURRICULUM_SUBJECTS.find((s) => s.id === 'math')
  const grade12 = mathSubject?.grades.find((g) => g.grade === '12')
  const chapters = grade12?.chapters || []

  it('1. Verifies Math 12 structure contains all core GDPT 2018 & Khan reference chapters', () => {
    expect(mathSubject).toBeDefined()
    expect(grade12).toBeDefined()
    expect(chapters.length).toBeGreaterThanOrEqual(4)

    // Check Chapter 1
    const chap1 = chapters.find((c) => c.chapterNumber === 1)
    expect(chap1).toBeDefined()
    expect(chap1?.title).toContain('Ứng dụng đạo hàm')

    // Check Chapter 2 (Vectơ & Tọa độ không gian)
    const chap2 = chapters.find((c) => c.chapterNumber === 2)
    expect(chap2).toBeDefined()
    expect(chap2?.title).toContain('Vectơ và hệ trục tọa độ trong không gian')

    // Check Chapter 4 (Nguyên hàm & Tích phân)
    const chapIntegral = chapters.find((c) => c.title.includes('Nguyên hàm') && c.title.includes('Tích phân'))
    expect(chapIntegral).toBeDefined()

    // Check Chapter (Xác suất có điều kiện)
    const chapProb = chapters.find((c) => c.title.includes('Xác suất có điều kiện'))
    expect(chapProb).toBeDefined()
  })

  it('2. Verifies Chapter 1 has structured topics and rich lessons', () => {
    const chap1 = chapters.find((c) => c.chapterNumber === 1)
    expect(chap1?.topics).toBeDefined()
    expect(chap1?.topics?.length).toBeGreaterThanOrEqual(3)

    const lessons = chap1?.lessons || []
    expect(lessons.length).toBeGreaterThanOrEqual(3)

    lessons.forEach((l) => {
      expect(l.topicId).toBeDefined()
      expect(l.topicTitle).toBeDefined()
      expect(l.learningObjectives.length).toBeGreaterThan(0)
      expect(l.skills.length).toBeGreaterThan(0)
      expect(l.durationMinutes).toBeGreaterThan(0)
    })
  })

  it('3. Verifies Video & Copyright Invariants (No fake videos, clean fallback to Khan Academy)', () => {
    const chap1 = chapters.find((c) => c.chapterNumber === 1)
    const lessons = chap1?.lessons || []

    lessons.forEach((l) => {
      // Must have video metadata
      expect(l.video).toBeDefined()
      // If no embeddable video, must NOT pretend to have one
      if (!l.video?.videoUrl && !l.video?.youtubeId) {
        expect(l.video?.hasVideo).toBe(false)
        // Must provide valid reference URL to Khan Academy
        expect(l.video?.sourceReferenceUrl).toContain('khanacademy.org')
      }
    })
  })

  it('4. Calculates and asserts Curriculum Coverage metrics against verified inventory', () => {
    const uniqueVerifiedChapters = new Set(VERIFIED_KHAN_MATH12_INVENTORY.map((i) => i.chapterOrder)).size
    const uniqueVerifiedTopics = new Set(VERIFIED_KHAN_MATH12_INVENTORY.map((i) => i.topicOrder)).size
    const verifiedVideoItems = VERIFIED_KHAN_MATH12_INVENTORY.filter((i) => i.videoAvailable).length

    // Calculate coverage metrics
    const chap1 = chapters.find((c) => c.chapterNumber === 1)
    const importedChapters = chapters.length >= 1 ? 1 : 0
    const importedTopics = chap1?.topics?.length || 0
    const importedLessons = chap1?.lessons?.length || 0

    const chapterCoverage = importedChapters / uniqueVerifiedChapters
    const topicCoverage = importedTopics / uniqueVerifiedTopics
    const validVideoLinksCount = chap1?.lessons.filter((l) => l.video?.sourceReferenceUrl?.includes('khanacademy.org')).length || 0
    const videoLinkCoverage = validVideoLinksCount / verifiedVideoItems

    expect(importedLessons).toBeGreaterThan(0)
    expect(chapterCoverage).toBeGreaterThan(0)
    expect(topicCoverage).toBeGreaterThan(0)
    expect(videoLinkCoverage).toBeGreaterThan(0)

    // Ensure we do NOT falsely report 100% full copyrighted video download
    expect(chap1?.lessons.every((l) => l.video?.provider === 'khan_ref')).toBe(true)
  })

  it('5. Ensures draft content is marked draft and not prematurely published without audit', () => {
    // Draft chapters (like chap 2, 3, 4, 5, 6) must be 'preview' or 'draft', not 'available'
    const previewChapters = chapters.filter((c) => c.chapterNumber > 1)
    previewChapters.forEach((c) => {
      expect(c.availability).toBe('preview')
    })
  })
})

