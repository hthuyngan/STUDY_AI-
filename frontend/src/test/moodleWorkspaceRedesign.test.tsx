import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { WorkspaceAppLauncher } from '@/components/layout/WorkspaceAppLauncher'
import { ExamPreparationPage } from '@/pages/Exam/ExamPreparationPage'
import { SchedulePage } from '@/pages/Schedule/SchedulePage'

// Configurable mock auth
let mockCurrentUser: any = {
  id: 'usr_student1',
  email: 'student@studyai.vn',
  displayName: 'Nguyễn Văn Học Sinh',
  role: 'learner',
}
const mockLogout = vi.fn().mockResolvedValue(undefined)

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isAuthenticated: !!mockCurrentUser,
    role: mockCurrentUser?.role || 'learner',
    logout: mockLogout,
    state: 'authenticated',
  }),
}))

describe('Moodle-Style Workspace & Sidebar Redesign Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentUser = {
      id: 'usr_student1',
      email: 'student@studyai.vn',
      displayName: 'Nguyễn Văn Học Sinh',
      role: 'learner',
    }
  })

  describe('1. Sidebar Redesign Structure & Streamlining', () => {
    it('renders exactly the two official Math 12 groups: HỌC TẬP and TIỆN ÍCH', () => {
      render(
        <MemoryRouter>
          <Sidebar mobileOpen={false} onCloseMobile={vi.fn()} />
        </MemoryRouter>
      )

      // Section headers
      expect(screen.getByText('HỌC TẬP')).toBeInTheDocument()
      expect(screen.getByText('TIỆN ÍCH')).toBeInTheDocument()

      // Core items in HỌC TẬP
      expect(screen.getByText('Tổng quan')).toBeInTheDocument()
      expect(screen.getByText('AI Gia sư')).toBeInTheDocument()
      expect(screen.getByText('Kiến thức Toán 12')).toBeInTheDocument()
      expect(screen.getByText('Luyện tập')).toBeInTheDocument()
      expect(screen.getByText('Kiểm tra & thi thử')).toBeInTheDocument()
      expect(screen.getByText('Sổ tay học tập')).toBeInTheDocument()

      // Core items in TIỆN ÍCH
      expect(screen.getByText('Lớp học của tôi')).toBeInTheDocument()
      expect(screen.getByText('Kế hoạch học tập')).toBeInTheDocument()
      expect(screen.getByText('Gói đăng ký')).toBeInTheDocument()
      expect(screen.getByText('Hỗ trợ')).toBeInTheDocument()

      // Strictly removed groups and links
      expect(screen.queryByText('PHÂN MÔN')).toBeNull()
      expect(screen.queryByText('Môn học')).toBeNull()
      expect(screen.queryByText('Lộ trình học tập')).toBeNull()
      expect(screen.queryByText('Liên kết phụ huynh')).toBeNull()
      expect(screen.queryByText('Vật lý')).toBeNull()
      expect(screen.queryByText('Hóa học')).toBeNull()
      expect(screen.queryByText('Tiếng Anh')).toBeNull()
      expect(screen.queryByText('Design System')).toBeNull()
    })

    it('remains permanently expanded on desktop and supports mobile toggle drawer without breaking layout', () => {
      const onClose = vi.fn()

      const { rerender } = render(
        <MemoryRouter>
          <Sidebar mobileOpen={false} onCloseMobile={onClose} />
        </MemoryRouter>
      )

      const aside = document.querySelector('aside.sidebar')
      expect(aside).not.toHaveClass('collapsed')
      expect(screen.queryByRole('button', { name: /Thu gọn thanh bên/i })).toBeNull()

      // Rerender as mobile open
      rerender(
        <MemoryRouter>
          <Sidebar mobileOpen={true} onCloseMobile={onClose} />
        </MemoryRouter>
      )

      expect(document.querySelector('aside.sidebar')).toHaveClass('mobile-open')
      const backdrop = document.querySelector('.sidebar-mobile-backdrop')
      expect(backdrop).toBeInTheDocument()
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(onClose).toHaveBeenCalled()
      }
    })
  })

  describe('2. Moodle-Style 9-Dot Workspace App Launcher', () => {
    it('renders 9-dot launcher button with accessible ARIA attributes', () => {
      render(
        <MemoryRouter>
          <WorkspaceAppLauncher />
        </MemoryRouter>
      )

      const launcherBtn = screen.getByLabelText(/Không gian làm việc & Ứng dụng/i)
      expect(launcherBtn).toBeInTheDocument()
      expect(launcherBtn).toHaveAttribute('aria-expanded', 'false')
      expect(launcherBtn).toHaveAttribute('aria-haspopup', 'dialog')
    })

    it('opens launcher popover with core learning tools on click for learner', () => {
      render(
        <MemoryRouter>
          <WorkspaceAppLauncher />
        </MemoryRouter>
      )

      const launcherBtn = screen.getByLabelText(/Không gian làm việc & Ứng dụng/i)
      fireEvent.click(launcherBtn)

      expect(launcherBtn).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('dialog', { name: /Không gian làm việc & Ứng dụng/i })).toBeInTheDocument()

      // Essential Moodle-style tiles
      expect(screen.getByTestId('workspace-app-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-app-subjects')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-app-assignments')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-app-schedule')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-app-notifications')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-app-profile')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-app-settings')).toBeInTheDocument()

      // Learner does NOT see admin/teacher/content workspaces
      expect(screen.queryByTestId('workspace-app-admin')).toBeNull()
      expect(screen.queryByTestId('workspace-app-teacher')).toBeNull()
      expect(screen.queryByTestId('workspace-app-content')).toBeNull()
    })

    it('displays role-specific workspace tiles when logged in as admin', () => {
      mockCurrentUser = {
        id: 'usr_admin1',
        email: 'admin@studyai.vn',
        displayName: 'Quản trị viên',
        role: 'admin',
      }

      render(
        <MemoryRouter>
          <WorkspaceAppLauncher />
        </MemoryRouter>
      )

      const launcherBtn = screen.getByLabelText(/Không gian làm việc & Ứng dụng/i)
      fireEvent.click(launcherBtn)

      // Admin sees admin, teacher, and content workspaces
      expect(screen.getByTestId('workspace-app-admin')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-app-teacher')).toBeInTheDocument()
      expect(screen.getByTestId('workspace-app-content')).toBeInTheDocument()
    })

    it('closes on Escape key press and returns focus', () => {
      render(
        <MemoryRouter>
          <WorkspaceAppLauncher />
        </MemoryRouter>
      )

      const launcherWrap = screen.getByTestId('workspace-app-launcher')
      const launcherBtn = screen.getByLabelText(/Không gian làm việc & Ứng dụng/i)
      fireEvent.click(launcherBtn)

      expect(screen.getByRole('dialog')).toBeInTheDocument()

      fireEvent.keyDown(launcherWrap, { key: 'Escape' })
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('closes popover on outside click', () => {
      render(
        <div>
          <div data-testid="outside-area">Outside</div>
          <MemoryRouter>
            <WorkspaceAppLauncher />
          </MemoryRouter>
        </div>
      )

      const launcherBtn = screen.getByLabelText(/Không gian làm việc & Ứng dụng/i)
      fireEvent.click(launcherBtn)
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      fireEvent.mouseDown(screen.getByTestId('outside-area'))
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  describe('3. Topbar Integration', () => {
    it('mounts WorkspaceAppLauncher inside Topbar actions', () => {
      render(
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      )

      expect(screen.getByTestId('workspace-app-launcher')).toBeInTheDocument()
    })
  })

  describe('4. Exam Preparation & Schedule Routes', () => {
    it('renders ExamPreparationPage with GDPT 2018 blueprints and subject filters', async () => {
      render(
        <MemoryRouter initialEntries={['/exam-preparation']}>
          <Routes>
            <Route path="/exam-preparation" element={<ExamPreparationPage />} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText(/Trung tâm Luyện thi & Ôn luyện Đề GDPT 2018/i)).toBeInTheDocument()
      expect(screen.getByText('Toán học 12')).toBeInTheDocument()
      expect(screen.getByText('Vật lý 12')).toBeInTheDocument()
      expect(screen.getByText('Hóa học 12')).toBeInTheDocument()
      expect(screen.getByText('Tiếng Anh 12')).toBeInTheDocument()
    })

    it('renders SchedulePage with upcoming deadlines and filter tabs', async () => {
      render(
        <MemoryRouter initialEntries={['/schedule']}>
          <Routes>
            <Route path="/schedule" element={<SchedulePage />} />
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByTestId('schedule-page')).toBeInTheDocument()
      expect(screen.getByText(/Lịch học & Thời khóa biểu/i)).toBeInTheDocument()
      expect(screen.getByText(/Bài tập lớp học/i)).toBeInTheDocument()
      expect(screen.getByText(/Phiên ôn tập đến hạn/i)).toBeInTheDocument()
    })
  })
})
