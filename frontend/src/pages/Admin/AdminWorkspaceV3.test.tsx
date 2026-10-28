import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminSubjectsPage } from './AdminSubjectsPage'
import { AdminChaptersPage } from './AdminChaptersPage'
import { AdminLessonsPage } from './AdminLessonsPage'
import { AdminAssessmentsPage } from './AdminAssessmentsPage'
import { AdminTeachersPage } from './AdminTeachersPage'
import { AdminReportsPage } from './AdminReportsPage'
import { educationService } from '@/services/education.service'
import { contentService } from '@/services/content.service'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import * as useAuthModule from '@/auth/useAuth'

vi.mock('@/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="mock-responsive-container" style={{ width: 600, height: 300 }}>
        {children}
      </div>
    ),
  }
})

describe('Admin Workspace V3 — Education Management Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    educationService._resetEducationMockState()
    window.confirm = () => true

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      state: 'guest',
      isAuthenticated: false,
      isGuest: true,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      migrationPending: false,
      confirmMigration: vi.fn(),
      declineMigration: vi.fn(),
    })
  })

  describe('1. Admin Navigation V3 Expansion', () => {
    it('renders all new navigation items for Quản lý học tập, Nhân sự và Báo cáo', () => {
      render(
        <MemoryRouter initialEntries={['/admin']}>
          <WorkspaceShell role="admin">
            <div>Dashboard Content</div>
          </WorkspaceShell>
        </MemoryRouter>
      )

      expect(screen.getByRole('link', { name: /Môn học/i })).toHaveAttribute('href', '/admin/subjects')
      expect(screen.getByRole('link', { name: /Chương học/i })).toHaveAttribute('href', '/admin/chapters')
      expect(screen.getByRole('link', { name: /Bài học/i })).toHaveAttribute('href', '/admin/lessons')
      expect(screen.getByRole('link', { name: /Bài thu hoạch/i })).toHaveAttribute('href', '/admin/assessments')
      expect(screen.getByRole('link', { name: /Giáo viên/i })).toHaveAttribute('href', '/admin/teachers')
      expect(screen.getByRole('link', { name: /Báo cáo học tập/i })).toHaveAttribute('href', '/admin/reports')
    })
  })

  describe('2. Quản lý môn học (AdminSubjectsPage)', () => {
    it('renders subjects list and allows searching', async () => {
      render(
        <MemoryRouter>
          <AdminSubjectsPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Toán học 12')).toBeInTheDocument()
        expect(screen.getByText('Vật lý 12')).toBeInTheDocument()
        expect(screen.getByText('Hóa học 12')).toBeInTheDocument()
      })

      // Search
      const searchInput = screen.getByLabelText(/Tìm kiếm môn học/i)
      fireEvent.change(searchInput, { target: { value: 'Toán' } })

      expect(screen.getByText('Toán học 12')).toBeInTheDocument()
      expect(screen.queryByText('Hóa học 12')).not.toBeInTheDocument()
    })

    it('creates a new subject demo via modal dialog and updates list', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <AdminSubjectsPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Toán học 12')).toBeInTheDocument()
      })

      // Click "Thêm môn học"
      await user.click(screen.getByRole('button', { name: /Thêm môn học/i }))

      // Dialog opens
      expect(screen.getByText('Thêm môn học mới')).toBeInTheDocument()

      // Fill form
      await user.type(screen.getByLabelText(/Tên môn học/i), 'Sinh học 12')
      await user.type(screen.getByLabelText(/Mã môn học/i), 'BIO-12')
      await user.type(screen.getByLabelText(/Mô tả/i), 'Di truyền học và tiến hóa.')

      // Submit
      await user.click(screen.getByRole('button', { name: /Tạo môn học/i }))

      await waitFor(() => {
        expect(screen.getByText('Sinh học 12')).toBeInTheDocument()
        expect(screen.getByText('BIO-12')).toBeInTheDocument()
      })
    })

    it('deletes a subject demo after confirmation', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <AdminSubjectsPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Toán học 12')).toBeInTheDocument()
      })

      const deleteBtns = screen.getAllByLabelText(/Xóa/i)
      await user.click(deleteBtns[0])

      await waitFor(() => {
        expect(screen.getByText(/Đã xóa môn học/i)).toBeInTheDocument()
      })
    })
  })

  describe('3. Quản lý chương (AdminChaptersPage)', () => {
    it('renders chapters list and filters by subject', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/chapters?subject=math']}>
          <AdminChaptersPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText(/Chương 1: Ứng dụng đạo hàm/i)).toBeInTheDocument()
        expect(screen.getByText(/Chương 2: Hàm số lũy thừa/i)).toBeInTheDocument()
      })
    })

    it('creates a new chapter demo via dialog', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <AdminChaptersPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Chương 1: Ứng dụng đạo hàm để khảo sát hàm số')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Thêm chương học/i }))
      expect(screen.getByText('Thêm chương học mới')).toBeInTheDocument()

      await user.type(screen.getByLabelText(/Tên chương học/i), 'Chương 5: Hình học giải tích')
      await user.click(screen.getByRole('button', { name: /^Thêm chương$/i }))

      await waitFor(() => {
        expect(screen.getAllByText(/Chương 5: Hình học giải tích/i).length).toBeGreaterThan(0)
      })
    })
  })

  describe('4. Quản lý bài học (AdminLessonsPage)', () => {
    it('renders lessons table and handles fast status transition', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <AdminLessonsPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Khảo sát và vẽ đồ thị hàm phân thức bậc nhất / bậc nhất')).toBeInTheDocument()
      })

      // Change status of published item to draft ("Về nháp")
      const revertBtn = screen.getByRole('button', { name: /Chuyển nháp Khảo sát và vẽ đồ thị/i })
      await user.click(revertBtn)

      await waitFor(() => {
        expect(screen.getByText(/Đã chuyển bài.*sang trạng thái: Bản nháp/i)).toBeInTheDocument()
      })
    })

    it('creates a new lesson demo', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <AdminLessonsPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText(/Khảo sát và vẽ đồ thị/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Tạo bài học mới/i }))
      expect(screen.getByText('Tạo bài học mới')).toBeInTheDocument()

      await user.type(screen.getByLabelText(/Tên bài học/i), 'Giá trị lớn nhất và nhỏ nhất của hàm số')
      await user.click(screen.getByRole('button', { name: /^Tạo bài học$/i }))

      await waitFor(() => {
        expect(screen.getByText('Giá trị lớn nhất và nhỏ nhất của hàm số')).toBeInTheDocument()
      })
    })
  })

  describe('5. Quản lý bài thu hoạch (AdminAssessmentsPage)', () => {
    it('renders assessments list and opens preview modal', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <AdminAssessmentsPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Khảo sát và vẽ đồ thị hàm phân thức')).toBeInTheDocument()
      })

      // Click "Xem trước"
      const previewBtn = screen.getByLabelText(/Xem trước Khảo sát và vẽ đồ thị/i)
      await user.click(previewBtn)

      // Modal opens
      await waitFor(() => {
        expect(screen.getByText(/Xem trước: Khảo sát và vẽ đồ thị/i)).toBeInTheDocument()
        expect(screen.getByText(/Đồ thị hàm phân thức y = \(ax \+ b\) \/ \(cx \+ d\)/i)).toBeInTheDocument()
      })

      // Close modal using close button
      const closeBtns = screen.getAllByRole('button', { name: /Đóng/i })
      await user.click(closeBtns[0])
      expect(screen.queryByText(/Xem trước: Khảo sát và vẽ đồ thị/i)).not.toBeInTheDocument()
    })

    it('adds a new question demo to an assessment', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <AdminAssessmentsPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Khảo sát và vẽ đồ thị hàm phân thức')).toBeInTheDocument()
      })

      const addQBtn = screen.getByLabelText(/Thêm câu hỏi Khảo sát và vẽ đồ thị/i)
      await user.click(addQBtn)

      expect(screen.getByText('Thêm câu hỏi trắc nghiệm')).toBeInTheDocument()

      await user.type(screen.getByLabelText(/Nội dung câu hỏi/i), 'Hàm số y = x^4 - 2x^2 có bao nhiêu điểm cực trị?')
      await user.type(screen.getByLabelText(/Đáp án A/i), '1')
      await user.type(screen.getByLabelText(/Đáp án B/i), '3')

      await user.click(screen.getByRole('button', { name: /Lưu câu hỏi/i }))

      await waitFor(() => {
        expect(screen.getByText(/Đã bổ sung câu hỏi trắc nghiệm/i)).toBeInTheDocument()
      })
    })
  })

  describe('6. Quản lý giáo viên (AdminTeachersPage)', () => {
    it('renders teachers list, summary KPIs, and opens profile modal', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <AdminTeachersPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Lê Thanh Thảo')).toBeInTheDocument()
        expect(screen.getByText('Phạm Văn Nam')).toBeInTheDocument()
        expect(screen.getByText('Tổng số giáo viên')).toBeInTheDocument()
      })

      // Click "Hồ sơ"
      const profileBtn = screen.getByLabelText(/Xem hồ sơ Lê Thanh Thảo/i)
      await user.click(profileBtn)

      // Profile modal displays
      expect(screen.getByText('Hồ sơ giáo viên')).toBeInTheDocument()
      expect(screen.getAllByText('thanh.thao@example.com').length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Teacher Workspace/i).length).toBeGreaterThan(0)
    })
  })

  describe('7. Báo cáo học tập (AdminReportsPage)', () => {
    it('renders 5 KPI cards and handles timeframe filtering', async () => {
      render(
        <MemoryRouter>
          <AdminReportsPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Tổng học viên')).toBeInTheDocument()
        expect(screen.getByText('Học viên hoạt động')).toBeInTheDocument()
        expect(screen.getByText('Bài học hoàn thành')).toBeInTheDocument()
        expect(screen.getByText('Tỷ lệ hoàn thành')).toBeInTheDocument()
        expect(screen.getByText('Điểm thu hoạch TB')).toBeInTheDocument()
      })

      // Change timeframe filter
      const timeframeSelect = screen.getByLabelText(/Chọn khoảng thời gian/i)
      fireEvent.change(timeframeSelect, { target: { value: '7d' } })

      await waitFor(() => {
        expect(screen.getByText('Hoạt động học tập theo thời gian')).toBeInTheDocument()
      })
    })
  })

  describe('8. Shared Mock Repository (Admin & Content Sync)', () => {
    it('synchronizes updates between Admin education service and Content workspace service', async () => {
      // 1. Check initial lessons from Content service
      const contentLessonsBefore = await contentService.getLessons()
      const mathLesson = contentLessonsBefore.find((l) => l.id === 'lesson-math-08')
      expect(mathLesson).toBeDefined()
      expect(mathLesson?.status).toBe('published')

      // 2. Admin changes status to 'in-review'
      await educationService.changeLessonStatus('lesson-math-08', 'in-review')

      // 3. Content service immediately sees 'in-review'
      const contentLessonsAfter = await contentService.getLessons()
      const updatedMathLesson = contentLessonsAfter.find((l) => l.id === 'lesson-math-08')
      expect(updatedMathLesson?.status).toBe('in-review')

      // 4. Admin creates a new lesson
      const created = await educationService.createLesson({
        title: 'Tích phân từng phần',
        subjectId: 'math',
        subjectName: 'Toán học 12',
        chapterId: 'ch-03',
        chapterName: 'Chương 3',
        status: 'published',
        authorName: 'Admin Synchronizer',
        hasAssessment: false,
      })

      // 5. Content service immediately sees the new lesson
      const contentLessonsWithNew = await contentService.getLessons()
      expect(contentLessonsWithNew.some((l) => l.id === created.id)).toBe(true)
    })
  })
})
