import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { TeacherDashboardPage } from './TeacherDashboardPage'
import { TeacherClassesPage } from './TeacherClassesPage'
import { TeacherClassDetailPage } from './TeacherClassDetailPage'
import { TeacherStudentsPage } from './TeacherStudentsPage'
import { TeacherStudentProfilePage } from './TeacherStudentProfilePage'
import { TeacherAssignmentsPage } from './TeacherAssignmentsPage'
import { TeacherCreateAssignmentPage } from './TeacherCreateAssignmentPage'
import { TeacherAssignmentDetailPage } from './TeacherAssignmentDetailPage'
import { TeacherGradesPage } from './TeacherGradesPage'
import { TeacherAlertsPage } from './TeacherAlertsPage'

// Mock useAuth
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'demo-teacher-id',
      email: 'teacher@studyai.edu.vn',
      fullName: 'ThS. Nguyễn Văn Hải',
      role: 'teacher',
    },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }),
}))

describe('Teacher Workspace UI & Interaction Suite', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('1. Teacher Dashboard renders metrics, classes, and operational sections', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher']}>
        <Routes>
          <Route path="/teacher" element={<TeacherDashboardPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Bàn làm việc Giáo viên')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Lớp học phụ trách')).toBeInTheDocument()
      expect(screen.getByText('Tổng số học sinh')).toBeInTheDocument()
      expect(screen.getByText('Bài tập đang mở')).toBeInTheDocument()
      expect(screen.getByText('Cần can thiệp hỗ trợ')).toBeInTheDocument()
      expect(screen.getByText('Lớp học phụ trách & Tiến độ')).toBeInTheDocument()
      expect(screen.getByText('Học sinh cần chú ý can thiệp')).toBeInTheDocument()
      expect(screen.getByText('Bài tập đang mở & Sắp đến hạn')).toBeInTheDocument()
    })
  })

  it('2. Teacher Classes renders class list, 4 KPIs and teacher filter', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher/classes']}>
        <Routes>
          <Route path="/teacher/classes" element={<TeacherClassesPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Quản lý lớp học')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Tổng số lớp học')).toBeInTheDocument()
      expect(screen.getByText('Tổng học viên')).toBeInTheDocument()
      expect(screen.getByText('Sĩ số trung bình')).toBeInTheDocument()
      expect(screen.getByText('Lớp cần chú ý')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Tìm theo tên lớp, mã lớp, giáo viên...')).toBeInTheDocument()
    })
  })

  it('3. Teacher Class Detail renders class metadata, tabs and student list', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher/classes/cls-12a1']}>
        <Routes>
          <Route path="/teacher/classes/:id" element={<TeacherClassDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Lớp 12A1')).toBeInTheDocument()
      expect(screen.getByText(/Học viên/)).toBeInTheDocument()
      expect(screen.getByText(/Bài tập/)).toBeInTheDocument()
      expect(screen.getByText(/Nhật ký lớp học/)).toBeInTheDocument()
    })
  })

  it('4. Teacher Students renders students list, search filter, and KPIs', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher/students']}>
        <Routes>
          <Route path="/teacher/students" element={<TeacherStudentsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Quản lý học viên')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Tổng học viên')).toBeInTheDocument()
      expect(screen.getAllByText('Đang học tốt').length).toBeGreaterThan(0)
      expect(screen.getByText('Cần hỗ trợ')).toBeInTheDocument()
      expect(screen.getByText('Điểm trung bình')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Tìm theo tên học viên, mã học viên hoặc email...')).toBeInTheDocument()
    })
  })

  it('5. Teacher Student Profile renders student identity hero and performance metrics', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher/students/stu-1']}>
        <Routes>
          <Route path="/teacher/students/:id" element={<TeacherStudentProfilePage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Minh Anh')).toBeInTheDocument()
      expect(screen.getByText('Tiến độ chung')).toBeInTheDocument()
      expect(screen.getByText('Điểm trung bình (GPA)')).toBeInTheDocument()
      expect(screen.getByText('Tổng quan năng lực')).toBeInTheDocument()
      expect(screen.getByText(/Tiến độ môn học/)).toBeInTheDocument()
    })
  })

  it('6. Teacher Assignments renders assignments list and 4 KPIs', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher/assignments']}>
        <Routes>
          <Route path="/teacher/assignments" element={<TeacherAssignmentsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Quản lý bài tập')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Tổng số bài tập')).toBeInTheDocument()
      expect(screen.getAllByText('Đang mở nộp').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Đã đóng').length).toBeGreaterThan(0)
      expect(screen.getByText('Tỷ lệ nộp trung bình')).toBeInTheDocument()
    })
  })

  it('7. Teacher Create Assignment form renders inputs and submit button', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher/assignments/new']}>
        <Routes>
          <Route path="/teacher/assignments/new" element={<TeacherCreateAssignmentPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Giao bài tập mới')).toBeInTheDocument()
    expect(screen.getByLabelText(/Tiêu đề bài tập/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Lớp học áp dụng/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Môn học/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Giao bài tập/ })).toBeInTheDocument()
  })

  it('8. Teacher Assignment Detail renders metadata and submissions table', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher/assignments/asg-1']}>
        <Routes>
          <Route path="/teacher/assignments/:id" element={<TeacherAssignmentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getAllByText('Khảo sát và vẽ đồ thị hàm phân thức').length).toBeGreaterThan(0)
      expect(screen.getByText('Thang điểm tối đa:')).toBeInTheDocument()
      expect(screen.getByText('Tỷ lệ bài nộp:')).toBeInTheDocument()
      expect(screen.getAllByText('Nguyễn Minh Anh').length).toBeGreaterThan(0)
    })
  })

  it('9. Teacher Grades renders gradebook KPIs and score distribution', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher/grades']}>
        <Routes>
          <Route path="/teacher/grades" element={<TeacherGradesPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Sổ điểm học tập')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Điểm TB toàn khóa')).toBeInTheDocument()
      expect(screen.getByText(/Tỷ lệ đạt chuẩn/)).toBeInTheDocument()
      expect(screen.getByText(/Tỷ lệ xuất sắc/)).toBeInTheDocument()
      expect(screen.getByText('Phổ điểm phân bố các lớp')).toBeInTheDocument()
    })
  })

  it('10. Teacher Alerts renders alerts queue, KPIs and resolve triggers', async () => {
    render(
      <MemoryRouter initialEntries={['/teacher/alerts']}>
        <Routes>
          <Route path="/teacher/alerts" element={<TeacherAlertsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Cảnh báo học tập')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Tổng cảnh báo')).toBeInTheDocument()
      expect(screen.getAllByText('Nghiêm trọng (Cao)').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Cần chú ý (Vừa)').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Đã giải quyết').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Đinh Trọng Phúc').length).toBeGreaterThan(0)
    })
  })
})
