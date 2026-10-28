import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminDashboardPage } from './AdminDashboardPage'
import { AdminUsersPage } from './AdminUsersPage'
import { AdminUserDetailPage } from './AdminUserDetailPage'
import { AdminRolesPage } from './AdminRolesPage'
import { AdminSystemPage } from './AdminSystemPage'
import { adminService } from '@/services/admin.service'

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

describe('Admin Workspace V2 UI Tests', () => {
  beforeEach(() => {
    adminService._resetMockState()
  })

  describe('AdminDashboardPage (5 Rows Layout)', () => {
    it('renders Row 1 (Header), Row 2 (4 Compact KPIs), Row 4 (Operations) and Row 5 (Quick Actions)', async () => {
      render(
        <MemoryRouter>
          <AdminDashboardPage />
        </MemoryRouter>
      )

      // Row 1
      expect(screen.getByText('Tổng quan hệ thống')).toBeInTheDocument()
      expect(screen.getByText(/Quản lý hoạt động, tài khoản và chất lượng học tập/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Chọn khoảng thời gian thống kê/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Xem báo cáo/i })).toBeInTheDocument()

      // Row 2 KPIs
      await waitFor(() => {
        expect(screen.getByText('Tổng người dùng')).toBeInTheDocument()
        expect(screen.getByText('Học viên đang hoạt động')).toBeInTheDocument()
        expect(screen.getByText('Bài học đã hoàn thành')).toBeInTheDocument()
        expect(screen.getByText('Yêu cầu cần xử lý')).toBeInTheDocument()
      })

      // Row 4 Operations
      expect(screen.getByText('Hoạt động gần đây')).toBeInTheDocument()
      expect(screen.getByText('Việc cần xử lý')).toBeInTheDocument()

      // Row 5 Quick Actions with real routes
      expect(screen.getByRole('link', { name: /Truy cập Quản lý người dùng/i })).toHaveAttribute('href', '/admin/users')
      expect(screen.getByRole('link', { name: /Truy cập Quản lý giáo trình/i })).toHaveAttribute('href', '/content')
      expect(screen.getByRole('link', { name: /Truy cập Không gian giáo viên/i })).toHaveAttribute('href', '/teacher')
      expect(screen.getByRole('link', { name: /Truy cập Trung tâm hỗ trợ/i })).toHaveAttribute('href', '/support')
    })

    it('opens and closes the report modal when clicking "Xem báo cáo"', async () => {
      render(
        <MemoryRouter>
          <AdminDashboardPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Tổng quan hệ thống')).toBeInTheDocument()
      })

      const reportBtn = screen.getByRole('button', { name: /Xem báo cáo/i })
      fireEvent.click(reportBtn)

      expect(screen.getByText('Báo cáo tổng kết điều hành hệ thống')).toBeInTheDocument()

      const closeBtn = screen.getByRole('button', { name: /Đóng báo cáo/i })
      fireEvent.click(closeBtn)

      expect(screen.queryByText('Báo cáo tổng kết điều hành hệ thống')).not.toBeInTheDocument()
    })
  })

  describe('AdminUsersPage (Search, Filter, Pagination, Add User, Bulk Actions, CSV)', () => {
    it('renders user table with pagination and filter controls', async () => {
      render(
        <MemoryRouter>
          <AdminUsersPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Quản lý người dùng')).toBeInTheDocument()
      })

      // Search input
      const searchInput = screen.getByLabelText(/Tìm kiếm người dùng/i)
      expect(searchInput).toBeInTheDocument()

      // Filter select elements
      expect(screen.getByLabelText(/Lọc theo vai trò/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Lọc theo trạng thái/i)).toBeInTheDocument()

      // Export CSV and Add user buttons
      expect(screen.getByLabelText(/Xuất CSV/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Thêm người dùng/i)).toBeInTheDocument()
    })

    it('filters user list when typing in search input', async () => {
      render(
        <MemoryRouter>
          <AdminUsersPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Minh Anh')).toBeInTheDocument()
      })

      const searchInput = screen.getByLabelText(/Tìm kiếm người dùng/i)
      fireEvent.change(searchInput, { target: { value: 'Gia Huy' } })

      await waitFor(() => {
        expect(screen.getByText('Trần Gia Huy')).toBeInTheDocument()
        expect(screen.queryByText('Nguyễn Minh Anh')).not.toBeInTheDocument()
      })
    })

    it('opens Add User dialog, fills form, and creates a demo user', async () => {
      render(
        <MemoryRouter>
          <AdminUsersPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Quản lý người dùng')).toBeInTheDocument()
      })

      const addBtn = screen.getByLabelText(/Thêm người dùng/i)
      fireEvent.click(addBtn)

      expect(screen.getByText('Thêm người dùng mới (Demo)')).toBeInTheDocument()

      const nameInput = screen.getByLabelText(/Họ và tên hiển thị/i)
      const emailInput = screen.getByLabelText(/Địa chỉ Email/i)

      fireEvent.change(nameInput, { target: { value: 'Lê Hoàng Long' } })
      fireEvent.change(emailInput, { target: { value: 'hoang.long@example.com' } })

      const submitBtn = screen.getByRole('button', { name: /Tạo tài khoản demo/i })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(screen.queryByText('Thêm người dùng mới (Demo)')).not.toBeInTheDocument()
        expect(screen.getByText('Lê Hoàng Long')).toBeInTheDocument()
      })
    })

    it('selects multiple accounts and displays bulk actions toolbar', async () => {
      render(
        <MemoryRouter>
          <AdminUsersPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Minh Anh')).toBeInTheDocument()
      })

      const selectAllCheckbox = screen.getByLabelText(/Chọn tất cả người dùng trên trang này/i)
      fireEvent.click(selectAllCheckbox)

      expect(screen.getByText(/Đã chọn/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Kích hoạt/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Khóa/i })).toBeInTheDocument()
    })
  })

  describe('AdminUserDetailPage (1/3 and 2/3 Layout with Tabs)', () => {
    it('renders profile card and tabs for learner with progress data', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/users/usr-101']}>
          <Routes>
            <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Nguyễn Minh Anh')).toBeInTheDocument()
      })

      // Cột trái: profile & actions
      expect(screen.getByRole('button', { name: /Đổi vai trò/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Khóa tài khoản/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Thu hồi phiên \(Mô phỏng\)/i })).toBeInTheDocument()

      // Tabs
      expect(screen.getByRole('tab', { name: /Tổng quan/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Tiến độ học tập/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Bài tập thu hoạch/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Nhật ký hoạt động/i })).toBeInTheDocument()

      // Switch to Progress tab
      fireEvent.click(screen.getByRole('tab', { name: /Tiến độ học tập/i }))
      expect(screen.getByText('Tiến trình theo môn học')).toBeInTheDocument()
      expect(screen.getByText('Toán học 12')).toBeInTheDocument()

      // Switch to Assessments tab
      fireEvent.click(screen.getByRole('tab', { name: /Bài tập thu hoạch/i }))
      expect(screen.getByText('Khảo sát hàm số & Cực trị')).toBeInTheDocument()
    })
  })

  describe('AdminRolesPage (Matrix & Simulation Sandbox)', () => {
    it('renders permission matrix, simulation sandbox, and role explanations', async () => {
      render(
        <MemoryRouter>
          <AdminRolesPage />
        </MemoryRouter>
      )

      expect(screen.getByText('Ma trận phân quyền & Vai trò')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Ma trận quyền chuẩn/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Mô phỏng cấu hình quyền/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Giải thích chi tiết 5 vai trò/i })).toBeInTheDocument()

      // Switch to simulator tab
      fireEvent.click(screen.getByRole('tab', { name: /Mô phỏng cấu hình quyền/i }))
      await waitFor(() => {
        expect(screen.getByText(/Chế độ mô phỏng cấu hình quyền \(Prototype Sandbox\)/i)).toBeInTheDocument()
      })

      // Switch to explanation tab
      fireEvent.click(screen.getByRole('tab', { name: /Giải thích chi tiết 5 vai trò/i }))
      expect(screen.getByText('Học viên (Learner)')).toBeInTheDocument()
      expect(screen.getByText('Giáo viên (Teacher)')).toBeInTheDocument()
      expect(screen.getByText('Quản trị viên (Admin)')).toBeInTheDocument()
    })
  })

  describe('AdminSystemPage (Honest Prototype Status)', () => {
    it('displays honest prototype mode indicator and module list', async () => {
      render(
        <MemoryRouter>
          <AdminSystemPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Trạng thái hệ thống & Hạ tầng')).toBeInTheDocument()
      })

      expect(screen.getByText('FE Prototype Standalone')).toBeInTheDocument()
      expect(screen.getByText(/Hệ thống đang chạy hoàn toàn ở chế độ/i)).toBeInTheDocument()
      expect(screen.getByText('Chưa nối máy chủ')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Đặt lại dữ liệu demo/i })).toBeInTheDocument()
      expect(screen.getByText('Các module giao diện đã triển khai')).toBeInTheDocument()
    })
  })
})
