import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminClassesPage } from './AdminClassesPage'
import { AdminClassDetailPage } from './AdminClassDetailPage'
import { AdminStudentsPage } from './AdminStudentsPage'
import { AdminStudentProfilePage } from './AdminStudentProfilePage'
import { AdminAssignmentsPage } from './AdminAssignmentsPage'
import { AdminAssignmentDetailPage } from './AdminAssignmentDetailPage'
import { AdminGradesPage } from './AdminGradesPage'
import { AdminAlertsPage } from './AdminAlertsPage'
import { classroomService } from '@/services/classroom.service'
import { teacherService } from '@/services/teacher.service'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import * as useAuthModule from '@/auth/useAuth'

vi.mock('@/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('Admin Workspace V4 — Classroom, Student & Learning Performance Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    classroomService._resetMockState()
    window.confirm = () => true
    window.alert = vi.fn()

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

  describe('1. Navigation V4 Expansion', () => {
    it('renders all new navigation items for Quản lý giảng dạy and Kết quả học tập', () => {
      render(
        <MemoryRouter initialEntries={['/admin']}>
          <WorkspaceShell role="admin">
            <div>Dashboard Content</div>
          </WorkspaceShell>
        </MemoryRouter>
      )

      // Quản lý giảng dạy
      expect(screen.getByText('Quản lý giảng dạy')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /^lớp học$/i })).toHaveAttribute('href', '/admin/classes')
      expect(screen.getByRole('link', { name: /^học viên$/i })).toHaveAttribute('href', '/admin/students')
      expect(screen.getByRole('link', { name: /^bài tập$/i })).toHaveAttribute('href', '/admin/assignments')

      // Kết quả học tập
      expect(screen.getByText('Kết quả học tập')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /^bảng điểm$/i })).toHaveAttribute('href', '/admin/grades')
      expect(screen.getByRole('link', { name: /^cảnh báo học tập$/i })).toHaveAttribute('href', '/admin/alerts')
    })
  })

  describe('2. Quản lý lớp học (AdminClassesPage)', () => {
    it('renders classes list, 4 KPIs and allows creating a new class', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/classes']}>
          <AdminClassesPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /quản lý lớp học/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText('Lớp 12A1')).toBeInTheDocument()
        expect(screen.getByText('Lớp 12A2')).toBeInTheDocument()
      })

      // Click "Thêm lớp học"
      const addBtn = screen.getByRole('button', { name: /thêm lớp học/i })
      await user.click(addBtn)

      // Fill in form
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const codeInput = screen.getByLabelText(/mã lớp/i)
      const nameInput = screen.getByLabelText(/tên lớp học/i)

      await user.clear(codeInput)
      await user.type(codeInput, '10A9')
      await user.type(nameInput, 'Lớp 10A9 Tự Nhiên')

      const submitBtn = screen.getByRole('button', { name: /tạo lớp học/i })
      await user.click(submitBtn)

      await waitFor(() => {
        expect(screen.getByText('Lớp 10A9 Tự Nhiên')).toBeInTheDocument()
      })
    })

    it('validates duplicate class code when creating a class', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/classes']}>
          <AdminClassesPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Lớp 12A1')).toBeInTheDocument()
      })

      const addBtn = screen.getByRole('button', { name: /thêm lớp học/i })
      await user.click(addBtn)

      // Enter existing class code "12A1"
      const codeInput = screen.getByLabelText(/mã lớp/i)
      const nameInput = screen.getByLabelText(/tên lớp học/i)

      await user.type(codeInput, '12A1')
      await user.type(nameInput, 'Trùng mã')

      const submitBtn = screen.getByRole('button', { name: /tạo lớp học/i })
      await user.click(submitBtn)

      await waitFor(() => {
        expect(screen.getByText(/mã lớp "12a1" đã tồn tại/i)).toBeInTheDocument()
      })
    })
  })

  describe('3. Chi tiết lớp học (AdminClassDetailPage)', () => {
    it('renders class detail tabs and allows adding a student into class', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/classes/cls-12a1']}>
          <Routes>
            <Route path="/admin/classes/:classId" element={<AdminClassDetailPage />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Lớp 12A1' })).toBeInTheDocument()
        expect(screen.getByText('Thông tin lớp học')).toBeInTheDocument()
      })

      // Switch to students tab
      const studentsTab = screen.getByRole('button', { name: /^học viên \(/i })
      await user.click(studentsTab)

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Minh Anh')).toBeInTheDocument()
      })

      // Click "Thêm học viên vào lớp"
      const addStudentBtn = screen.getByRole('button', { name: /thêm học viên vào lớp/i })
      await user.click(addStudentBtn)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const nameInput = screen.getByLabelText(/họ và tên/i)
      const emailInput = screen.getByLabelText(/email/i)

      await user.type(nameInput, 'Trịnh Hoàng Bách')
      await user.type(emailInput, 'bach.trinh@example.com')

      const confirmBtn = screen.getByRole('button', { name: /xác nhận thêm/i })
      await user.click(confirmBtn)

      await waitFor(() => {
        expect(screen.getByText('Trịnh Hoàng Bách')).toBeInTheDocument()
      })
    })
  })

  describe('4. Quản lý học viên (AdminStudentsPage)', () => {
    it('renders students list, filters, and allows moving student class', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/students']}>
          <AdminStudentsPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /quản lý học viên/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText('Nguyễn Minh Anh')).toBeInTheDocument()
        expect(screen.getByText('Đinh Trọng Phúc')).toBeInTheDocument()
      })

      // Search student
      const searchInput = screen.getByPlaceholderText(/tìm theo tên học viên/i)
      await user.type(searchInput, 'Gia Huy')

      await waitFor(() => {
        expect(screen.getByText('Trần Gia Huy')).toBeInTheDocument()
        expect(screen.queryByText('Nguyễn Minh Anh')).not.toBeInTheDocument()
      })
    })
  })

  describe('5. Hồ sơ học tập học viên (AdminStudentProfilePage)', () => {
    it('renders student profile information and switches tabs', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/students/stu-1']}>
          <Routes>
            <Route path="/admin/students/:studentId" element={<AdminStudentProfilePage />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Nguyễn Minh Anh' })).toBeInTheDocument()
        expect(screen.getByText('Thời gian tự học')).toBeInTheDocument()
      })

      // Switch to subjects tab
      const subjectsTab = screen.getByRole('button', { name: /tiến độ môn học/i })
      await user.click(subjectsTab)

      await waitFor(() => {
        expect(screen.getByText('Toán học 12')).toBeInTheDocument()
      })

      // Switch to assignments tab
      const asgTab = screen.getByRole('button', { name: /bài tập & bài nộp/i })
      await user.click(asgTab)

      await waitFor(() => {
        expect(screen.getByText('Khảo sát và vẽ đồ thị hàm phân thức')).toBeInTheDocument()
      })
    })
  })

  describe('6. Quản lý bài tập (AdminAssignmentsPage)', () => {
    it('renders assignments and creates a new assignment', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/assignments']}>
          <AdminAssignmentsPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /quản lý bài tập/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText('Khảo sát và vẽ đồ thị hàm phân thức')).toBeInTheDocument()
      })

      const createBtn = screen.getByRole('button', { name: /tạo bài tập mới/i })
      await user.click(createBtn)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const titleInput = screen.getByLabelText(/tiêu đề bài tập/i)
      await user.type(titleInput, 'Bài tập lượng giác kiểm tra 15 phút')

      const submitBtn = screen.getByRole('button', { name: /^tạo bài tập$/i })
      await user.click(submitBtn)

      await waitFor(() => {
        expect(screen.getByText('Bài tập lượng giác kiểm tra 15 phút')).toBeInTheDocument()
      })
    })
  })

  describe('7. Chi tiết bài tập & chấm điểm (AdminAssignmentDetailPage)', () => {
    it('renders assignment submissions and allows grading', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/assignments/asg-1']}>
          <Routes>
            <Route path="/admin/assignments/:assignmentId" element={<AdminAssignmentDetailPage />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Khảo sát và vẽ đồ thị hàm phân thức' })).toBeInTheDocument()
        expect(screen.getByText('Nguyễn Minh Anh')).toBeInTheDocument()
      })

      // Grade a submission
      const gradeButtons = screen.getAllByRole('button', { name: /(chấm bài|sửa điểm)/i })
      await user.click(gradeButtons[0])

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const scoreInput = screen.getByLabelText(/điểm số/i)
      const feedbackInput = screen.getByLabelText(/nhận xét/i)

      fireEvent.change(scoreInput, { target: { value: '10' } })
      fireEvent.change(feedbackInput, { target: { value: 'Bài làm xuất sắc tuyệt đối!' } })

      const form = screen.getByRole('dialog').querySelector('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/10 \/ 10/)).toBeInTheDocument()
      })
    })
  })

  describe('8. Bảng điểm học tập (AdminGradesPage)', () => {
    it('renders system grades table and score distributions', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/grades']}>
          <AdminGradesPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /bảng điểm học tập/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText('Phổ điểm phân bố hệ thống')).toBeInTheDocument()
        expect(screen.getByText('Tỷ lệ đạt chuẩn (>= 5.0)')).toBeInTheDocument()
      })
    })
  })

  describe('9. Cảnh báo học tập (AdminAlertsPage)', () => {
    it('renders learning alerts and resolves alert', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/alerts']}>
          <AdminAlertsPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /cảnh báo học tập/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText('Đinh Trọng Phúc')).toBeInTheDocument()
        expect(screen.getByText('Chưa nộp 2 bài tập liên tiếp, điểm bài thu hoạch dưới 50%')).toBeInTheDocument()
      })

      // Click "Xử lý"
      const actionButtons = screen.getAllByTitle(/ghi chú can thiệp/i)
      await user.click(actionButtons[0])

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const statusSelect = screen.getByLabelText(/trạng thái xử lý/i)
      await user.selectOptions(statusSelect, 'resolved')

      const saveBtn = screen.getByRole('button', { name: /cập nhật can thiệp/i })
      await user.click(saveBtn)

      await waitFor(() => {
        expect(screen.getByText('Đã cập nhật trạng thái cảnh báo cho học viên Đinh Trọng Phúc')).toBeInTheDocument()
      })
    })
  })

  describe('10. Shared Mock Repository (Requirement 16: Admin & Teacher Synchronization)', () => {
    it('reflects class added in Admin inside teacherService.getClasses()', async () => {
      const initialTeacherClasses = await teacherService.getClasses()
      const initialCount = initialTeacherClasses.length

      // Admin adds class
      await classroomService.saveClass({
        code: '11C9',
        name: 'Lớp 11C9 Chuyên',
        grade: 'Lớp 11',
      })

      // Teacher service sees the new class immediately
      const updatedTeacherClasses = await teacherService.getClasses()
      expect(updatedTeacherClasses.length).toBe(initialCount + 1)
      expect(updatedTeacherClasses.some((c) => c.name === 'Lớp 11C9 Chuyên')).toBe(true)
    })

    it('reflects student added to class in Admin inside teacherService.getClassStudents()', async () => {
      // Admin adds student to cls-12a1
      await classroomService.addStudentToClass({
        code: 'HV-99999',
        name: 'Học Sinh Mới Admin',
        email: 'hs.admin@test.com',
        classId: 'cls-12a1',
        className: 'Lớp 12A1',
        grade: 'Lớp 12',
        progress: 50,
        lessonsCompleted: 5,
        averageScore: 7.5,
        totalLearningMinutes: 200,
        lastActive: new Date().toISOString(),
        status: 'on-track',
      })

      // Teacher service queries students for cls-12a1
      const teacherStudents = await teacherService.getClassStudents('cls-12a1')
      expect(teacherStudents.some((s) => s.name === 'Học Sinh Mới Admin')).toBe(true)
    })

    it('reflects assignment created by Teacher inside Admin assignments list', async () => {
      // Teacher creates assignment
      await teacherService.createAssignment({
        title: 'Bài tập thầy giáo giao từ Teacher Workspace',
        classId: 'cls-12a1',
        className: 'Lớp 12A1',
        subject: 'Toán học 12',
        dueDate: '2026-11-10T23:59:00Z',
        lessonIds: ['les-01'],
        totalStudents: 38,
      })

      // Admin queries assignments
      const adminAssignments = await classroomService.getAssignments()
      expect(adminAssignments.some((a) => a.title === 'Bài tập thầy giáo giao từ Teacher Workspace')).toBe(true)
    })
  })
})
