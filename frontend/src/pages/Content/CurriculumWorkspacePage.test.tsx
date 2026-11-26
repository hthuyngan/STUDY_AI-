import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CurriculumWorkspacePage } from './CurriculumWorkspacePage'

const listChapters = vi.fn()
const listLessons = vi.fn()
const createChapter = vi.fn()
const chapterAction = vi.fn()
const reorderChapters = vi.fn()
const reorderLessons = vi.fn()
const listEditions = vi.fn()

vi.mock('@/services/catalog.service', () => ({
  catalogService: {
    listGrades: vi.fn().mockResolvedValue({ items: [{ id: 'g1', code: '12', name: 'Khối 12' }], total: 1 }),
    listSubjects: vi.fn().mockResolvedValue({ items: [{ id: 's1', code: 'HIST', name: 'Lịch sử' }], total: 1 }),
    listCurricula: vi.fn().mockResolvedValue({ items: [{ id: 'c1', code: 'C1', name: 'CT Sử 12' }], total: 1 }),
    listSeries: vi.fn().mockResolvedValue({ items: [{ id: 'ts1', code: 'KNTT', name: 'Kết Nối' }], total: 1 }),
    listEditions: (...args: unknown[]) => listEditions(...args),
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
    reorderChapters: (...args: unknown[]) => reorderChapters(...args),
    reorderLessons: (...args: unknown[]) => reorderLessons(...args),
  },
}))

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-search">{location.search}</div>
}

describe('CurriculumWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listEditions.mockResolvedValue({ items: [{ id: 'ed-1', code: 'ED1', editionName: 'Bản chuẩn' }], total: 1 })
    listChapters.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
    listLessons.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
    reorderChapters.mockResolvedValue({ success: true })
    reorderLessons.mockResolvedValue({ success: true })
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

  it('surfaces catalog cascade error instead of silently showing empty state', async () => {
    listEditions.mockRejectedValueOnce({ status: 500, detail: 'Lỗi tải phiên bản' })
    render(
      <MemoryRouter initialEntries={['/content/curriculum']}>
        <CurriculumWorkspacePage />
      </MemoryRouter>
    )
    expect(await screen.findByText('Lỗi tải phiên bản')).toBeInTheDocument()
  })

  it('persists pageSize in URL and reorders chapters and lessons across full scope', async () => {
    const ch1 = {
      id: 'ch-1',
      subjectName: 'Lịch sử',
      code: 'CH01',
      title: 'Chương Một',
      description: '',
      orderIndex: 1,
      status: 'draft' as const,
      lessonCount: 3,
      rowVersion: 'cv1',
      updatedAt: '2026-11-25T00:00:00Z',
    }
    const ch2 = {
      id: 'ch-2',
      subjectName: 'Lịch sử',
      code: 'CH02',
      title: 'Chương Hai',
      description: '',
      orderIndex: 2,
      status: 'draft' as const,
      lessonCount: 0,
      rowVersion: 'cv2',
      updatedAt: '2026-11-25T00:00:00Z',
    }
    const l1 = {
      id: 'l-1',
      code: 'B01',
      title: 'Bài 1',
      slug: 'bai-1',
      orderIndex: 1,
      status: 'draft' as const,
      videos: [],
      rowVersion: 'lv1',
      updatedAt: '2026-11-25T00:00:00Z',
    }
    const l2 = {
      id: 'l-2',
      code: 'B02',
      title: 'Bài 2',
      slug: 'bai-2',
      orderIndex: 2,
      status: 'published' as const,
      videos: [],
      rowVersion: 'lv2',
      updatedAt: '2026-11-25T00:00:00Z',
    }
    const l3 = {
      id: 'l-3',
      code: 'B03',
      title: 'Bài 3',
      slug: 'bai-3',
      orderIndex: 3,
      status: 'draft' as const,
      videos: [],
      rowVersion: 'lv3',
      updatedAt: '2026-11-25T00:00:00Z',
    }

    listChapters.mockImplementation(async () => ({
      items: [ch1, ch2],
      total: 2,
      page: 1,
      pageSize: 20,
    }))
    listLessons.mockImplementation(async (query: Record<string, unknown>) => {
      // Full-scope reorder fetch asks for pageSize 100 without status filter
      if (query.pageSize === 100) {
        return { items: [l1, l2, l3], total: 3, page: 1, pageSize: 100 }
      }
      // Paged view on page 2 with pageSize 10 shows only l3
      return { items: [l3], total: 11, page: 2, pageSize: Number(query.pageSize ?? 10) }
    })

    render(
      <MemoryRouter initialEntries={['/content/curriculum?editionId=ed-1&chapterId=ch-1&page=2&pageSize=10']}>
        <LocationProbe />
        <CurriculumWorkspacePage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Bài 3')).toBeInTheDocument()

    // Reorder lesson l3 up even though it is the only visible item on page 2
    fireEvent.click(screen.getByRole('button', { name: 'Lên Bài 3' }))
    await waitFor(() =>
      expect(reorderLessons).toHaveBeenCalledWith({
        chapterId: 'ch-1',
        lessonIds: ['l-1', 'l-3', 'l-2'],
        rowVersions: { 'l-1': 'lv1', 'l-2': 'lv2', 'l-3': 'lv3' },
      })
    )

    // Reorder chapter ch1 down
    fireEvent.click(screen.getByRole('button', { name: 'Xuống chương Chương Một' }))
    await waitFor(() =>
      expect(reorderChapters).toHaveBeenCalledWith({
        curriculumEditionId: 'ed-1',
        chapterIds: ['ch-2', 'ch-1'],
        rowVersions: { 'ch-1': 'cv1', 'ch-2': 'cv2' },
      })
    )

    // Change pageSize via ManagementPagination
    fireEvent.change(screen.getByLabelText('Số dòng mỗi trang'), { target: { value: '50' } })
    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toContain('pageSize=50')
    })
  })
})
