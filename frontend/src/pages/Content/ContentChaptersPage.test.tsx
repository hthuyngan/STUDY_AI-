import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ContentChaptersPage } from './ContentChaptersPage'
import { educationService } from '@/services/education.service'
import type { CurriculumChapterItem, CurriculumSubjectItem } from '@/types/education'

const MOCK_SUBJECTS: CurriculumSubjectItem[] = [
  {
    id: 'sub_math12',
    name: 'Toán học 12',
    code: 'MATH12',
    grade: '12',
    icon: 'math',
    description: 'Chương trình Giải tích và Hình học 12',
    chapterCount: 2,
    lessonCount: 16,
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
    title: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
    description: 'Tính đơn điệu, cực trị và vẽ đồ thị hàm số.',
    order: 1,
    lessonsCount: 12,
    status: 'published',
    updatedAt: '2026-10-27T08:00:00Z',
  },
  {
    id: 'chp_math12_c2',
    subjectId: 'sub_math12',
    subjectName: 'Toán học 12',
    title: 'Chương 2: Hàm số lũy thừa, mũ và logarit',
    description: 'Lũy thừa, hàm mũ và phương trình logarit.',
    order: 2,
    lessonsCount: 0,
    status: 'draft',
    updatedAt: '2026-10-28T09:00:00Z',
  },
]

describe('ContentChaptersPage — Evondev Vertical Card Stack & Management Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(educationService, 'getSubjects').mockResolvedValue([...MOCK_SUBJECTS])
    vi.spyOn(educationService, 'getChapters').mockResolvedValue([...MOCK_CHAPTERS])
    vi.spyOn(educationService, 'createChapter').mockImplementation(async (input) => ({
      ...input,
      id: `chp_${Date.now()}`,
      lessonsCount: 0,
      updatedAt: new Date().toISOString(),
    }))
    vi.spyOn(educationService, 'updateChapter').mockImplementation(async (id, updates) => {
      const found = MOCK_CHAPTERS.find((c) => c.id === id)
      if (!found) return undefined
      return { ...found, ...updates, updatedAt: new Date().toISOString() }
    })
    vi.spyOn(educationService, 'deleteChapter').mockResolvedValue(true)
    vi.spyOn(educationService, 'reorderChapters').mockResolvedValue([...MOCK_CHAPTERS])
  })

  it('1. Renders page header, KPIs, breadcrumb, and vertical ordered card stack', async () => {
    render(
      <MemoryRouter initialEntries={['/content/chapters?subject=sub_math12']}>
        <Routes>
          <Route path="/content/chapters" element={<ContentChaptersPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Header & Breadcrumb
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Quản lý Chương học/i })).toBeInTheDocument()
    })
    expect(screen.getByText('Quản lý nội dung')).toBeInTheDocument()
    expect(screen.getByText('Môn học')).toBeInTheDocument()

    // 4 KPIs
    expect(screen.getByText('Tổng số chương')).toBeInTheDocument()
    expect(screen.getByText('Tổng bài học')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument() // lessons count in chapter 1

    // Vertical cards
    expect(screen.getByText(/Chương 1: Ứng dụng đạo hàm để khảo sát hàm số/i)).toBeInTheDocument()
    expect(screen.getByText(/Chương 2: Hàm số lũy thừa, mũ và logarit/i)).toBeInTheDocument()

    // Order numbers
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
  })

  it('2. Filters chapters by search query', async () => {
    render(
      <MemoryRouter initialEntries={['/content/chapters']}>
        <Routes>
          <Route path="/content/chapters" element={<ContentChaptersPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Chương 1: Ứng dụng đạo hàm/i)).toBeInTheDocument()
    })

    const searchInput = screen.getByLabelText(/Tìm kiếm chương học/i)
    fireEvent.change(searchInput, { target: { value: 'lũy thừa' } })

    // Chapter 2 should remain, Chapter 1 should be filtered out
    expect(screen.getByText(/Chương 2: Hàm số lũy thừa, mũ và logarit/i)).toBeInTheDocument()
    expect(screen.queryByText(/Chương 1: Ứng dụng đạo hàm/i)).not.toBeInTheDocument()
  })

  it('3. Filters chapters by status (Đang hoạt động / Tạm ẩn)', async () => {
    render(
      <MemoryRouter initialEntries={['/content/chapters']}>
        <Routes>
          <Route path="/content/chapters" element={<ContentChaptersPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Chương 1: Ứng dụng đạo hàm/i)).toBeInTheDocument()
    })

    const statusSelect = screen.getByLabelText(/Lọc theo trạng thái/i)
    fireEvent.change(statusSelect, { target: { value: 'inactive' } })

    // Only Chapter 2 (draft) should be displayed
    expect(screen.getByText(/Chương 2: Hàm số lũy thừa/i)).toBeInTheDocument()
    expect(screen.queryByText(/Chương 1: Ứng dụng đạo hàm/i)).not.toBeInTheDocument()
  })

  it('4. Opens Create Modal, validates title and creates new chapter', async () => {
    render(
      <MemoryRouter initialEntries={['/content/chapters?subject=sub_math12']}>
        <Routes>
          <Route path="/content/chapters" element={<ContentChaptersPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Thêm chương mới/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Thêm chương mới/i }))

    expect(screen.getByRole('heading', { level: 2, name: /Thêm chương học mới/i })).toBeInTheDocument()

    // Fill Title
    const titleInput = screen.getByPlaceholderText(/Ví dụ: Chương 1: Ứng dụng đạo hàm/i)
    fireEvent.change(titleInput, { target: { value: 'Chương 3: Nguyên hàm và Tích phân' } })

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Thêm chương học/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(educationService.createChapter).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Chương 3: Nguyên hàm và Tích phân',
          subjectId: 'sub_math12',
          status: 'published',
        })
      )
    })
  })

  it('5. Toggles chapter status with Ẩn/Hiện button', async () => {
    render(
      <MemoryRouter initialEntries={['/content/chapters']}>
        <Routes>
          <Route path="/content/chapters" element={<ContentChaptersPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Chương 1: Ứng dụng đạo hàm/i)).toBeInTheDocument()
    })

    // Chapter 1 is published, so button is 'Ẩn'
    const hideBtn = screen.getByLabelText(/Ẩn chương Chương 1/i)
    fireEvent.click(hideBtn)

    await waitFor(() => {
      expect(educationService.updateChapter).toHaveBeenCalledWith('chp_math12_c1', {
        status: 'draft',
      })
    })
  })

  it('6. Reorders chapter with Up/Down buttons and calls reorderChapters', async () => {
    render(
      <MemoryRouter initialEntries={['/content/chapters?subject=sub_math12']}>
        <Routes>
          <Route path="/content/chapters" element={<ContentChaptersPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Chương 1: Ứng dụng đạo hàm/i)).toBeInTheDocument()
    })

    // Down button on Chapter 1
    const downBtn = screen.getByLabelText(/Di chuyển chương "Chương 1: Ứng dụng đạo hàm để khảo sát hàm số" xuống dưới/i)
    fireEvent.click(downBtn)

    await waitFor(() => {
      expect(educationService.reorderChapters).toHaveBeenCalledWith(
        'sub_math12',
        ['chp_math12_c2', 'chp_math12_c1']
      )
    })
  })

  it('7. Blocks deletion when chapter contains lessons (> 0)', async () => {
    render(
      <MemoryRouter initialEntries={['/content/chapters']}>
        <Routes>
          <Route path="/content/chapters" element={<ContentChaptersPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Chương 1: Ứng dụng đạo hàm/i)).toBeInTheDocument()
    })

    // Chapter 1 has 12 lessons
    const deleteBtn = screen.getByLabelText(/Xóa chương Chương 1/i)
    fireEvent.click(deleteBtn)

    // Safety Alert Dialog should show up
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText(/Không thể xóa chương học/i)).toBeInTheDocument()
      expect(screen.getByText(/12 bài giảng đang hoạt động/i)).toBeInTheDocument()
    })

    // educationService.deleteChapter must NOT be called
    expect(educationService.deleteChapter).not.toHaveBeenCalled()
  })

  it('8. Confirms and deletes chapter when lessonsCount is 0', async () => {
    render(
      <MemoryRouter initialEntries={['/content/chapters']}>
        <Routes>
          <Route path="/content/chapters" element={<ContentChaptersPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Chương 2: Hàm số lũy thừa/i)).toBeInTheDocument()
    })

    // Chapter 2 has 0 lessons
    const deleteBtn = screen.getByLabelText(/Xóa chương Chương 2/i)
    fireEvent.click(deleteBtn)

    // Confirm Dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/Xác nhận xóa chương học/i)).toBeInTheDocument()
    })

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận xóa/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(educationService.deleteChapter).toHaveBeenCalledWith('chp_math12_c2')
    })
  })
})
