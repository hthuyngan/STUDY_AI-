import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ContentCurriculumPage } from './ContentCurriculumPage'
import { educationService } from '@/services/education.service'
import type {
  CurriculumSubjectItem,
  CurriculumChapterItem,
  CurriculumLessonItem,
} from '@/types/education'

const MOCK_SUBJECT: CurriculumSubjectItem = {
  id: 'sub_math12',
  name: 'Toán học 12',
  code: 'MATH12',
  grade: '12',
  icon: 'math',
  description: 'Chương trình Giải tích và Hình học 12',
  chapterCount: 1,
  lessonCount: 2,
  assessmentCount: 1,
  publishedPercent: 100,
  status: 'published',
  updatedAt: '2026-10-27T08:00:00Z',
}

const MOCK_CHAPTERS: CurriculumChapterItem[] = [
  {
    id: 'chp_1',
    subjectId: 'sub_math12',
    subjectName: 'Toán học 12',
    title: 'Chương 1: Ứng dụng đạo hàm',
    order: 1,
    lessonsCount: 2,
    status: 'published',
    updatedAt: '2026-10-27T08:00:00Z',
  },
]

const MOCK_LESSONS: CurriculumLessonItem[] = [
  {
    id: 'les_1',
    subjectId: 'sub_math12',
    subjectName: 'Toán học 12',
    chapterId: 'chp_1',
    chapterName: 'Chương 1: Ứng dụng đạo hàm',
    title: 'Tính đơn điệu của hàm số',
    order: 1,
    status: 'published',
    hasAssessment: true,
    authorName: 'Admin',
    updatedAt: '2026-10-27T08:00:00Z',
  },
]

describe('ContentCurriculumPage — Routing & Subject Validation Suite (FIX-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(educationService, 'getSubjects').mockResolvedValue([MOCK_SUBJECT])
    vi.spyOn(educationService, 'getSubjectById').mockImplementation(async (id) => {
      if (id === 'sub_math12' || id === 'MATH12') return MOCK_SUBJECT
      return undefined
    })
    vi.spyOn(educationService, 'getChapters').mockResolvedValue(MOCK_CHAPTERS)
    vi.spyOn(educationService, 'getLessons').mockResolvedValue(MOCK_LESSONS)
  })

  it('1. Renders curriculum details when valid subject ID is provided in route', async () => {
    render(
      <MemoryRouter initialEntries={['/content/subjects/sub_math12']}>
        <Routes>
          <Route path="/content/subjects/:id" element={<ContentCurriculumPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Giáo trình Toán học 12')).toBeInTheDocument()
      expect(screen.getAllByText('Chương 1: Ứng dụng đạo hàm').length).toBeGreaterThan(0)
      expect(screen.getByText('Tính đơn điệu của hàm số')).toBeInTheDocument()
    })
  })

  it('2. Shows error and does NOT fallback to first subject when invalid subject ID is provided', async () => {
    render(
      <MemoryRouter initialEntries={['/content/subjects/invalid_subject_id_999']}>
        <Routes>
          <Route path="/content/subjects/:id" element={<ContentCurriculumPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy môn học')).toBeInTheDocument()
      expect(screen.getByText(/Không tìm thấy môn học với mã hoặc ID "invalid_subject_id_999"/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Quay lại danh sách môn học/i })).toBeInTheDocument()
    })

    // Must NOT silently show Toán học 12
    expect(screen.queryByText('Giáo trình Toán học 12')).not.toBeInTheDocument()
  })

  it('3. Navigates correctly to chapter management and lesson management preserving subjectId', async () => {
    render(
      <MemoryRouter initialEntries={['/content/subjects/sub_math12']}>
        <Routes>
          <Route path="/content/subjects/:id" element={<ContentCurriculumPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Giáo trình Toán học 12')).toBeInTheDocument()
    })

    const chapterLink = screen.getByRole('link', { name: /Quản lý chương học/i })
    expect(chapterLink).toHaveAttribute('href', '/content/chapters?subjectId=sub_math12')

    const lessonLink = screen.getByRole('link', { name: /Xem tất cả bài học/i })
    expect(lessonLink).toHaveAttribute('href', '/content/lessons?subjectId=sub_math12')
  })
})
