import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ContentSubjectsPage } from './ContentSubjectsPage'
import { educationService } from '@/services/education.service'
import type { CurriculumSubjectItem } from '@/types/education'

const MOCK_SUBJECTS: CurriculumSubjectItem[] = [
  {
    id: 'sub_math12',
    name: 'Toán học 12',
    code: 'MATH12',
    grade: 'Lớp 12',
    icon: 'math',
    description: 'Chương trình Giải tích và Hình học không gian chuẩn Bộ GD&ĐT bám sát kỳ thi THPT.',
    chapterCount: 4,
    lessonCount: 16,
    assessmentCount: 16,
    publishedPercent: 100,
    status: 'published',
    updatedAt: '2026-10-27T08:00:00Z',
  },
  {
    id: 'sub_phys12',
    name: 'Vật lý 12',
    code: 'PHYS12',
    grade: 'Lớp 12',
    icon: 'physics',
    description: 'Dao động cơ học, sóng cơ và vật lý hạt nhân.',
    chapterCount: 3,
    lessonCount: 12,
    assessmentCount: 10,
    publishedPercent: 0,
    status: 'draft',
    updatedAt: '2026-10-25T14:30:00Z',
  },
]

describe('ContentSubjectsPage — Evondev Card Grid & Management Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(educationService, 'getSubjects').mockResolvedValue([...MOCK_SUBJECTS])
    vi.spyOn(educationService, 'createSubject').mockImplementation(async (input) => ({
      ...input,
      id: `sub_${input.code.toLowerCase()}`,
      chapterCount: 0,
      lessonCount: 0,
      assessmentCount: 0,
      publishedPercent: input.status === 'published' ? 100 : 0,
      updatedAt: new Date().toISOString(),
    }))
    vi.spyOn(educationService, 'updateSubject').mockImplementation(async (id, updates) => {
      const found = MOCK_SUBJECTS.find((s) => s.id === id)
      if (!found) return undefined
      return { ...found, ...updates, updatedAt: new Date().toISOString() }
    })
    vi.spyOn(educationService, 'deleteSubject').mockResolvedValue(true)
  })

  it('1. Renders page header, KPIs, and card grid with SVG icons and stats', async () => {
    render(
      <MemoryRouter initialEntries={['/content/subjects']}>
        <Routes>
          <Route path="/content/subjects" element={<ContentSubjectsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Quản lý môn học')).toBeInTheDocument()
    expect(screen.getByText('Thêm môn học')).toBeInTheDocument()

    await waitFor(() => {
      // Check Subject cards rendered in card grid
      expect(screen.getByText('Toán học 12')).toBeInTheDocument()
      expect(screen.getByText('MATH12')).toBeInTheDocument()
      expect(screen.getByText('Vật lý 12')).toBeInTheDocument()
      expect(screen.getByText('PHYS12')).toBeInTheDocument()

      // Check stats
      expect(screen.getByText('4')).toBeInTheDocument() // chapters
      expect(screen.getByText('16')).toBeInTheDocument() // lessons

      // Check status pills
      expect(screen.getAllByText('Đang hoạt động').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Tạm ẩn')).toBeInTheDocument()

      // Check manage buttons
      const mathManageLink = screen.getByTitle('Quản lý chương và bài giảng môn Toán học 12')
      expect(mathManageLink).toHaveAttribute('href', '/content/subjects/sub_math12')
    })
  })

  it('2. Filters subjects by search keyword and status', async () => {
    render(
      <MemoryRouter initialEntries={['/content/subjects']}>
        <Routes>
          <Route path="/content/subjects" element={<ContentSubjectsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Toán học 12')).toBeInTheDocument()
      expect(screen.getByText('Vật lý 12')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Tìm theo tên môn, mã môn...')
    fireEvent.change(searchInput, { target: { value: 'PHYS' } })

    expect(screen.queryByText('Toán học 12')).not.toBeInTheDocument()
    expect(screen.getByText('Vật lý 12')).toBeInTheDocument()

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } })
    expect(screen.getByText('Toán học 12')).toBeInTheDocument()

    // Filter by status: draft
    const statusSelect = screen.getByLabelText('Lọc theo trạng thái')
    fireEvent.change(statusSelect, { target: { value: 'draft' } })

    expect(screen.queryByText('Toán học 12')).not.toBeInTheDocument()
    expect(screen.getByText('Vật lý 12')).toBeInTheDocument()
  })

  it('3. Opens Add Subject modal with visual SVG picker and submits successfully', async () => {
    render(
      <MemoryRouter initialEntries={['/content/subjects']}>
        <Routes>
          <Route path="/content/subjects" element={<ContentSubjectsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Thêm môn học')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Thêm môn học'))

    expect(screen.getByRole('heading', { name: 'Thêm môn học mới' })).toBeInTheDocument()

    // Fill form
    const nameInput = screen.getByPlaceholderText('VD: Toán học 12, Vật lý 12...')
    const codeInput = screen.getByPlaceholderText('VD: MATH12, PHYS12...')
    fireEvent.change(nameInput, { target: { value: 'Hóa học 12' } })
    fireEvent.change(codeInput, { target: { value: 'CHEM12' } })

    // Select Visual SVG: Hóa học
    const chemIconBtn = screen.getByRole('radio', { name: /Chọn biểu tượng Hóa học/i })
    fireEvent.click(chemIconBtn)
    expect(chemIconBtn).toHaveClass('is-selected')

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Tạo môn học' })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(educationService.createSubject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Hóa học 12',
          code: 'CHEM12',
          icon: 'chemistry',
          status: 'published',
        })
      )
    })
  })

  it('4. Allows quick toggle of active / draft status from card', async () => {
    render(
      <MemoryRouter initialEntries={['/content/subjects']}>
        <Routes>
          <Route path="/content/subjects" element={<ContentSubjectsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Toán học 12')).toBeInTheDocument()
    })

    // Click quick toggle for Math 12 (currently published -> toggle to draft)
    const toggleBtn = screen.getByRole('button', { name: /Tạm ẩn môn Toán học 12/i })
    fireEvent.click(toggleBtn)

    await waitFor(() => {
      expect(educationService.updateSubject).toHaveBeenCalledWith('sub_math12', {
        status: 'draft',
      })
    })
  })

  it('5. Opens delete confirmation dialog and calls deleteSubject on confirm', async () => {
    render(
      <MemoryRouter initialEntries={['/content/subjects']}>
        <Routes>
          <Route path="/content/subjects" element={<ContentSubjectsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Vật lý 12')).toBeInTheDocument()
    })

    const deleteBtn = screen.getByRole('button', { name: /Xóa môn Vật lý 12/i })
    fireEvent.click(deleteBtn)

    expect(screen.getByText('Xác nhận xóa môn học')).toBeInTheDocument()
    expect(screen.getByText(/Bạn có chắc chắn muốn xóa môn học "Vật lý 12"/i)).toBeInTheDocument()

    // Confirm delete
    const confirmBtn = screen.getByRole('button', { name: 'Xóa môn học' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(educationService.deleteSubject).toHaveBeenCalledWith('sub_phys12')
    })
  })
})
