import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CurriculumWorkspacePage } from './CurriculumWorkspacePage'

const listChapters = vi.fn()
const listLessons = vi.fn()
const createChapter = vi.fn()
const chapterAction = vi.fn()

vi.mock('@/services/catalog.service', () => ({
  catalogService: {
    listGrades: vi.fn().mockResolvedValue({ items: [{ id: 'g1', code: '12', name: 'Khối 12' }], total: 1 }),
    listSubjects: vi.fn().mockResolvedValue({ items: [{ id: 's1', code: 'HIST', name: 'Lịch sử' }], total: 1 }),
    listCurricula: vi.fn().mockResolvedValue({ items: [{ id: 'c1', code: 'C1', name: 'CT Sử 12' }], total: 1 }),
    listSeries: vi.fn().mockResolvedValue({ items: [{ id: 'ts1', code: 'KNTT', name: 'Kết Nối' }], total: 1 }),
    listEditions: vi.fn().mockResolvedValue({ items: [{ id: 'ed-1', code: 'ED1', editionName: 'Bản chuẩn' }], total: 1 }),
  },
}))

vi.mock('@/services/curriculumWorkspace.service', () => ({
  curriculumWorkspaceService: {
    listChapters: (...args: unknown[]) => listChapters(...args),
    listLessons: (...args: unknown[]) => listLessons(...args),
    createChapter: (...args: unknown[]) => createChapter(...args),
    updateChapter: vi.fn(),
    createLesson: vi.fn(),
    updateLesson: vi.fn(),
    chapterAction: (...args: unknown[]) => chapterAction(...args),
    lessonAction: vi.fn(),
    reorderChapters: vi.fn(),
    reorderLessons: vi.fn(),
  },
}))

describe('CurriculumWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listChapters.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
    listLessons.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
  })

  it('shows a truthful empty state and never fabricates chapters', async () => {
    render(
      <MemoryRouter initialEntries={['/content/curriculum?editionId=ed-1']}>
        <CurriculumWorkspacePage />
      </MemoryRouter>
    )
    expect(await screen.findByText('Giáo trình chưa có chương.')).toBeInTheDocument()
    expect(screen.queryByText(/Chương 1/)).not.toBeInTheDocument()
  })

  it('creates a chapter through the real workspace service and keeps form open on 409 conflict', async () => {
    createChapter.mockRejectedValueOnce({ status: 409, detail: 'Mã chương đã tồn tại.' })
    render(
      <MemoryRouter initialEntries={['/content/curriculum?editionId=ed-1']}>
        <CurriculumWorkspacePage />
      </MemoryRouter>
    )
    await screen.findByText('Giáo trình chưa có chương.')
    fireEvent.click(screen.getByRole('button', { name: 'Thêm chương' }))
    fireEvent.change(screen.getByLabelText('Mã'), { target: { value: 'CH01' } })
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Mở đầu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Mã chương đã tồn tại.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Biểu mẫu chương' })).toBeInTheDocument()

    createChapter.mockResolvedValueOnce({ id: 'chapter-1' })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    await waitFor(() =>
      expect(createChapter).toHaveBeenCalledWith(
        expect.objectContaining({ curriculumEditionId: 'ed-1', code: 'CH01', title: 'Mở đầu' })
      )
    )
  })

  it('shows filtered-empty reset action and retryable API error state', async () => {
    listChapters.mockResolvedValue({
      items: [
        {
          id: 'ch-1',
          subjectName: 'Lịch sử',
          code: 'CH01',
          title: 'Chương Sử',
          description: '',
          orderIndex: 1,
          status: 'published',
          lessonCount: 0,
          rowVersion: 'v1',
          updatedAt: '2026-11-25T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    render(
      <MemoryRouter initialEntries={['/content/curriculum?editionId=ed-1&chapterId=ch-1&q=nonexistent']}>
        <CurriculumWorkspacePage />
      </MemoryRouter>
    )
    expect(await screen.findByText('Không có bài học khớp bộ lọc.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xóa bộ lọc' })).toBeInTheDocument()

    listChapters.mockRejectedValueOnce({ status: 500, detail: 'Lỗi máy chủ' })
    fireEvent.click(screen.getByRole('button', { name: /Tải lại/ }))
    expect(await screen.findByText('Lỗi máy chủ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument()
  })
})
