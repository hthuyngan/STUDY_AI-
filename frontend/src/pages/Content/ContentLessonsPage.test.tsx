import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ContentLessonsPage } from './ContentLessonsPage'
import { educationService } from '@/services/education.service'
import type {
  CurriculumLessonItem,
  CurriculumSubjectItem,
  CurriculumChapterItem,
} from '@/types/education'

const MOCK_SUBJECTS: CurriculumSubjectItem[] = [
  {
    id: 'sub_math12',
    name: 'Toán học 12',
    code: 'MATH12',
    grade: '12',
    icon: 'math',
    description: 'Chương trình Giải tích và Hình học 12',
    chapterCount: 2,
    lessonCount: 12,
    assessmentCount: 10,
    publishedPercent: 100,
    status: 'published',
    updatedAt: '2026-10-27T08:00:00Z',
  },
]

const MOCK_CHAPTERS: CurriculumChapterItem[] = [
  {
    id: 'chp_math12_c1',
    subjectId: 'sub_math12',
    subjectName: 'Toán học 12',
    title: 'Chương 1: Ứng dụng đạo hàm',
    description: 'Tính đơn điệu và cực trị',
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
    chapterId: 'chp_math12_c1',
    chapterName: 'Chương 1: Ứng dụng đạo hàm',
    title: 'Tính đơn điệu của hàm số',
    order: 1,
    status: 'published',
    hasAssessment: true,
    videoCount: 1,
    authorName: 'Quản trị viên',
    updatedAt: '2026-10-27T08:00:00Z',
  },
  {
    id: 'les_2',
    subjectId: 'sub_math12',
    subjectName: 'Toán học 12',
    chapterId: 'chp_math12_c1',
    chapterName: 'Chương 1: Ứng dụng đạo hàm',
    title: 'Cực trị của hàm số',
    order: 2,
    status: 'draft',
    hasAssessment: false,
    videoCount: 0,
    authorName: 'Quản trị viên',
    updatedAt: '2026-10-28T09:00:00Z',
  },
]

describe('ContentLessonsPage — Regression & Data Loading Suite (FIX-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(educationService, 'getSubjects').mockResolvedValue([...MOCK_SUBJECTS])
    vi.spyOn(educationService, 'getChapters').mockResolvedValue([...MOCK_CHAPTERS])
    vi.spyOn(educationService, 'getLessons').mockResolvedValue([...MOCK_LESSONS])
    vi.spyOn(educationService, 'getTopics').mockResolvedValue([])
    vi.spyOn(educationService, 'getLessonVideos').mockResolvedValue([])
  })

  it('1. Loads and renders lessons list with unified loader mechanism', async () => {
    render(
      <MemoryRouter initialEntries={['/content/lessons']}>
        <Routes>
          <Route path="/content/lessons" element={<ContentLessonsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Quản lý bài học')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByText('Tính đơn điệu của hàm số').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Cực trị của hàm số').length).toBeGreaterThan(0)
    })

    expect(educationService.getSubjects).toHaveBeenCalledTimes(1)
    expect(educationService.getChapters).toHaveBeenCalledTimes(1)
    expect(educationService.getLessons).toHaveBeenCalledTimes(1)
  })

  it('2. Correctly renders error state and allows retry when API fails', async () => {
    vi.spyOn(educationService, 'getLessons').mockRejectedValueOnce(new Error('Network connection timeout'))

    render(
      <MemoryRouter initialEntries={['/content/lessons']}>
        <Routes>
          <Route path="/content/lessons" element={<ContentLessonsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Network connection timeout')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument()
    })

    // Click retry
    vi.spyOn(educationService, 'getLessons').mockResolvedValueOnce([...MOCK_LESSONS])
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }))

    await waitFor(() => {
      expect(screen.getAllByText('Tính đơn điệu của hàm số').length).toBeGreaterThan(0)
    })
  })

  it('3. Prevents race conditions and discards stale in-flight responses', async () => {
    let resolveFirstRequest: (value: CurriculumLessonItem[]) => void
    const slowPromise = new Promise<CurriculumLessonItem[]>((resolve) => {
      resolveFirstRequest = resolve
    })

    const fastLessons: CurriculumLessonItem[] = [
      {
        ...MOCK_LESSONS[0],
        id: 'les_fast',
        title: 'Bài học phản hồi nhanh',
      },
    ]

    // First call is slow, second call is fast
    vi.spyOn(educationService, 'getLessons')
      .mockReturnValueOnce(slowPromise)
      .mockResolvedValueOnce(fastLessons)

    render(
      <MemoryRouter initialEntries={['/content/lessons']}>
        <Routes>
          <Route path="/content/lessons" element={<ContentLessonsPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Trigger a second search request before the first resolves
    const searchInput = screen.getByPlaceholderText(/Tìm theo tiêu đề bài học/i)
    fireEvent.change(searchInput, { target: { value: 'nhanh' } })

    // Second request resolves fast
    await waitFor(() => {
      expect(screen.getAllByText('Bài học phản hồi nhanh').length).toBeGreaterThan(0)
    })

    // Now resolve the first (slow) request with stale data
    resolveFirstRequest!([
      {
        ...MOCK_LESSONS[0],
        id: 'les_stale',
        title: 'Bài học cũ bị trễ (Stale Data)',
      },
    ])

    // Wait a tick and ensure the stale data did NOT overwrite the fast response
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByText('Bài học cũ bị trễ (Stale Data)')).not.toBeInTheDocument()
    expect(screen.getAllByText('Bài học phản hồi nhanh').length).toBeGreaterThan(0)
  })
})
