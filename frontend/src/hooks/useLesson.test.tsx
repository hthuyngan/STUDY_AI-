import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useLesson } from './useLesson'

vi.mock('@/services/curriculum.service', () => ({
  curriculumService: {
    getLesson: vi.fn().mockResolvedValue({
      id: 'lesson-math-08',
      chapterId: 'chap-1',
      chapterTitle: 'Chương 1',
      subjectId: 'math-12',
      subjectName: 'Toán học',
      title: 'Bài 8: Khảo sát hàm số',
      orderIndex: 8,
      introduction: 'Mở đầu bài học',
      definitions: ['Định nghĩa 1: Khảo sát hàm số'],
      formulas: ['y = ax^3 + bx^2 + cx + d'],
      examples: ['Ví dụ 1: Khảo sát hàm số'],
      importantNotes: ['Lưu ý tập xác định'],
      summaryPoints: ['Tổng kết các bước'],
    }),
    getSubjectChapters: vi.fn().mockResolvedValue([
      {
        id: 'chap-1',
        title: 'Chương 1: Khảo sát hàm số',
        lessons: [
          { id: 'lesson-math-08', title: 'Bài 8: Khảo sát hàm số', orderIndex: 8, status: 'published' },
        ],
      },
    ]),
  },
}))

describe('useLesson Hook', () => {
  it('loads lesson and outline data successfully', async () => {
    const { result } = renderHook(() => useLesson('math-12', 'lesson-math-08'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.lesson).not.toBeNull()
    expect(result.current.lesson?.id).toBe('lesson-math-08')
    expect(result.current.outline.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('handles toggling bookmark and completing lesson', async () => {
    const { result } = renderHook(() => useLesson('math-12', 'lesson-math-08'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const initialBookmark = result.current.isBookmarked
    await act(async () => {
      await result.current.toggleBookmark()
    })
    expect(result.current.isBookmarked).toBe(!initialBookmark)

    await act(async () => {
      await result.current.completeLesson()
    })
    expect(result.current.isCompleted).toBe(true)
  })
})
