import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ContentCatalogPage } from './ContentCatalogPage'
import { catalogService } from '@/services/catalog.service'

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'usr_admin', email: 'admin@studyai.internal', role: 'admin', displayName: 'Admin' },
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}))

vi.mock('@/services/catalog.service', () => ({
  catalogService: {
    listGrades: vi.fn(),
    createGrade: vi.fn(),
    updateGrade: vi.fn(),
    archiveGrade: vi.fn(),
    reactivateGrade: vi.fn(),
    listSubjects: vi.fn(),
    createSubject: vi.fn(),
    updateSubject: vi.fn(),
    archiveSubject: vi.fn(),
    reactivateSubject: vi.fn(),
    listCurricula: vi.fn(),
    createCurriculum: vi.fn(),
    updateCurriculum: vi.fn(),
    archiveCurriculum: vi.fn(),
    reactivateCurriculum: vi.fn(),
    listSeries: vi.fn(),
    createSeries: vi.fn(),
    updateSeries: vi.fn(),
    archiveSeries: vi.fn(),
    reactivateSeries: vi.fn(),
    listEditions: vi.fn(),
    createEdition: vi.fn(),
    updateEdition: vi.fn(),
    archiveEdition: vi.fn(),
    reactivateEdition: vi.fn(),
  },
}))

function renderCatalog(initialEntry = '/content/catalog') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/content/catalog" element={<ContentCatalogPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ContentCatalogPage (P01 Multi-Subject Catalog Shell)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders honest empty state when server returns 0 subjects (no mock fallback)', async () => {
    vi.mocked(catalogService.listSubjects).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })

    renderCatalog()

    await waitFor(() => {
      expect(screen.getByText('Chưa có môn học nào')).toBeInTheDocument()
    })
    expect(screen.queryByText(/Toán 12/i)).not.toBeInTheDocument()
  })

  it('renders 403 forbidden error state and retry path without fallback data', async () => {
    vi.mocked(catalogService.listSubjects).mockRejectedValue({
      status: 403,
      message: 'Forbidden',
    })

    renderCatalog()

    await waitFor(() => {
      expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument()
  })

  it('renders server-paginated multi-subject catalog and switches tabs with URL params', async () => {
    const user = userEvent.setup()
    vi.mocked(catalogService.listSubjects).mockResolvedValue({
      items: [
        {
          id: 'subj_1',
          code: 'HIST',
          name: 'Lịch sử',
          description: 'Lịch sử THPT',
          status: 'draft',
          rowVersion: 'AAAA',
          createdAt: '2026-11-25T00:00:00Z',
          updatedAt: '2026-11-25T00:00:00Z',
        },
        {
          id: 'subj_2',
          code: 'BIO',
          name: 'Sinh học',
          description: 'Sinh học THPT',
          status: 'published',
          rowVersion: 'BBBB',
          createdAt: '2026-11-25T00:00:00Z',
          updatedAt: '2026-11-25T00:00:00Z',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    })
    vi.mocked(catalogService.listGrades).mockResolvedValue({
      items: [
        {
          id: 'grd_1',
          code: '10',
          name: 'Khối 10',
          orderIndex: 10,
          status: 'draft',
          rowVersion: 'CCCC',
          createdAt: '2026-11-25T00:00:00Z',
          updatedAt: '2026-11-25T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })

    renderCatalog()

    await waitFor(() => {
      expect(screen.getByText('Lịch sử')).toBeInTheDocument()
      expect(screen.getByText('Sinh học')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Khối lớp' }))
    await waitFor(() => {
      expect(catalogService.listGrades).toHaveBeenCalled()
      expect(screen.getByText('Khối 10')).toBeInTheDocument()
    })
  })

  it('preserves user input and keeps dialog open on 409 conflict during create', async () => {
    const user = userEvent.setup()
    vi.mocked(catalogService.listSubjects).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })
    vi.mocked(catalogService.listGrades).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 })
    vi.mocked(catalogService.listCurricula).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 })
    vi.mocked(catalogService.listSeries).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 })
    vi.mocked(catalogService.createSubject).mockRejectedValue({
      status: 409,
      detail: "Mã môn học 'HIST' đã tồn tại.",
    })

    renderCatalog()

    await waitFor(() => {
      expect(screen.getByText('Chưa có môn học nào')).toBeInTheDocument()
    })

    await user.click(screen.getAllByRole('button', { name: /Tạo môn học/i })[0])
    await user.type(screen.getByLabelText(/Mã chuẩn/i), 'HIST')
    await user.type(screen.getByLabelText(/Tên hiển thị/i), 'Lịch sử')
    await user.click(screen.getByRole('button', { name: /Tạo bản nháp/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent("Mã môn học 'HIST' đã tồn tại.")
    })
    // Input is preserved and dialog stays open
    expect((screen.getByLabelText(/Mã chuẩn/i) as HTMLInputElement).value).toBe('HIST')
    expect((screen.getByLabelText(/Tên hiển thị/i) as HTMLInputElement).value).toBe('Lịch sử')
  })
})
