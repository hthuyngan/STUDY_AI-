import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminApprovalsPage } from './AdminApprovalsPage'
import { AdminApprovalDetailPage } from './AdminApprovalDetailPage'
import { AdminPublicationsPage } from './AdminPublicationsPage'
import { AdminTicketsPage } from './AdminTicketsPage'
import { AdminTicketDetailPage } from './AdminTicketDetailPage'
import { AdminAnnouncementsPage } from './AdminAnnouncementsPage'
import { AdminAuditLogsPage } from './AdminAuditLogsPage'
import { AdminSettingsPage } from './AdminSettingsPage'
import { operationsService } from '@/services/operations.service'
import { supportService } from '@/services/support.service'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import * as useAuthModule from '@/auth/useAuth'

vi.mock('@/auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('Admin Workspace V5 — Operations, Content Approval & Quality Control Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    operationsService._resetMockState()
    supportService._resetMockState()
    window.confirm = () => true
    window.alert = vi.fn()
    window.prompt = () => 'v1.0'

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

  describe('1. Navigation V5 Expansion', () => {
    it('renders all navigation items for Kiểm soát nội dung, Vận hành & Hỗ trợ, and Cấu hình', () => {
      render(
        <MemoryRouter initialEntries={['/admin']}>
          <WorkspaceShell role="admin">
            <div>Dashboard Content</div>
          </WorkspaceShell>
        </MemoryRouter>
      )

      // Kiểm soát nội dung
      expect(screen.getByText('Kiểm soát nội dung')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /^phê duyệt nội dung$/i })).toHaveAttribute('href', '/admin/approvals')
      expect(screen.getByRole('link', { name: /^lịch sử xuất bản$/i })).toHaveAttribute('href', '/admin/publications')

      // Vận hành & Hỗ trợ
      expect(screen.getByText('Vận hành & Hỗ trợ')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /^yêu cầu hỗ trợ$/i })).toHaveAttribute('href', '/admin/tickets')
      expect(screen.getByRole('link', { name: /^thông báo hệ thống$/i })).toHaveAttribute('href', '/admin/announcements')
      expect(screen.getByRole('link', { name: /^nhật ký quản trị$/i })).toHaveAttribute('href', '/admin/audit-logs')

      // Cấu hình
      expect(screen.getByText('Cấu hình')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /^thiết lập vận hành$/i })).toHaveAttribute('href', '/admin/settings')
    })
  })

  describe('2. Quản lý phê duyệt nội dung (AdminApprovalsPage & Detail)', () => {
    it('renders 4 approval KPIs and approval items table', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/approvals']}>
          <AdminApprovalsPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /phê duyệt nội dung/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getAllByText('Chờ duyệt').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Đã duyệt').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Cần sửa / Từ chối').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Đã xuất bản').length).toBeGreaterThan(0)
      })

      // Check item in table
      await waitFor(() => {
        expect(screen.getByText(/Tiệm cận đứng và tiệm cận ngang của đồ thị hàm số/i)).toBeInTheDocument()
      })
    })

    it('navigates to detail page, shows 4 tabs and approves content item', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/approvals/apr-1']}>
          <Routes>
            <Route path="/admin/approvals/:approvalId" element={<AdminApprovalDetailPage />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /tiệm cận đứng và tiệm cận ngang của đồ thị hàm số/i })).toBeInTheDocument()
      })

      // Check 4 tab buttons
      expect(screen.getByRole('button', { name: /nội dung xem trước/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /thông tin xuất bản/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /nhận xét kiểm duyệt/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /lịch sử thay đổi/i })).toBeInTheDocument()

      // Click "Phê duyệt"
      const approveBtn = screen.getByRole('button', { name: /^phê duyệt$/i })
      await user.click(approveBtn)

      // Verified: status changed to Đã duyệt and Xuất bản button is available
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /xuất bản ngay/i })).toBeInTheDocument()
      })
    })

    it('requires feedback note when requesting changes', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/approvals/apr-2']}>
          <Routes>
            <Route path="/admin/approvals/:approvalId" element={<AdminApprovalDetailPage />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /bộ câu hỏi thu hoạch: tiệm cận đứng và tiệm cận ngang/i })).toBeInTheDocument()
      })

      const requestChangesBtn = screen.getByRole('button', { name: /yêu cầu sửa/i })
      await user.click(requestChangesBtn)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const noteInput = screen.getByLabelText(/nội dung yêu cầu chỉnh sửa/i)
      await user.type(noteInput, 'Cần bổ sung thêm ví dụ đồ thị hàm bậc 3.')

      const submitRequestBtn = screen.getByRole('button', { name: /gửi yêu cầu/i })
      await user.click(submitRequestBtn)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('3. Lịch sử xuất bản (AdminPublicationsPage)', () => {
    it('renders publication history table and rollback trigger', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/publications']}>
          <AdminPublicationsPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /lịch sử xuất bản/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText(/Khảo sát và vẽ đồ thị hàm phân thức/i)).toBeInTheDocument()
      })

      // Test Rollback trigger
      const rollbackBtns = screen.getAllByRole('button', { name: /khôi phục phiên bản trước/i })
      expect(rollbackBtns.length).toBeGreaterThan(0)
      await user.click(rollbackBtns[0])

      // Confirm toast notification is shown
      await waitFor(() => {
        expect(screen.getByText(/đã khôi phục/i)).toBeInTheDocument()
      })
    })
  })

  describe('4. Yêu cầu hỗ trợ (AdminTicketsPage & Detail)', () => {
    it('renders tickets list, KPI summary cards and filters', async () => {
      render(
        <MemoryRouter initialEntries={['/admin/tickets']}>
          <AdminTicketsPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /yêu cầu hỗ trợ/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText('Tổng yêu cầu')).toBeInTheDocument()
        expect(screen.getByText('Chưa xử lý (Mới)')).toBeInTheDocument()
        expect(screen.getByText('Đang giải quyết')).toBeInTheDocument()
        expect(screen.getAllByText('Đã giải quyết').length).toBeGreaterThan(0)
      })

      // Verify tickets from supportService are listed
      await waitFor(() => {
        expect(screen.getByText(/Tiến độ làm bài thu hoạch không đồng bộ sau khi mở máy tính khác/i)).toBeInTheDocument()
      })
    })

    it('navigates to ticket detail, sends a staff reply and assigns staff member', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/tickets/TK-4821']}>
          <Routes>
            <Route path="/admin/tickets/:ticketId" element={<AdminTicketDetailPage />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText(/Tiến độ làm bài thu hoạch không đồng bộ sau khi mở máy tính khác/i)).toBeInTheDocument()
      })

      // Send a reply
      const replyInput = screen.getByPlaceholderText(/nhập nội dung phản hồi hoặc hướng dẫn xử lý sự cố/i)
      await user.type(replyInput, 'Chào bạn, kỹ thuật viên đã kiểm tra và xử lý lỗi đồng bộ.')

      const sendBtn = screen.getByRole('button', { name: /gửi phản hồi/i })
      await user.click(sendBtn)

      await waitFor(() => {
        expect(screen.getByText('Chào bạn, kỹ thuật viên đã kiểm tra và xử lý lỗi đồng bộ.')).toBeInTheDocument()
      })

      // Change staff assignment
      const assigneeSelect = screen.getByLabelText(/nhân viên phụ trách/i)
      await user.selectOptions(assigneeSelect, 'Lê Hữu Phước')

      await waitFor(() => {
        expect(assigneeSelect).toHaveValue('Lê Hữu Phước')
      })
    })
  })

  describe('5. Thông báo hệ thống (AdminAnnouncementsPage)', () => {
    it('renders announcements list and creates a new announcement', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/announcements']}>
          <AdminAnnouncementsPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /thông báo hệ thống/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText('Bảo trì hệ thống định kỳ máy chủ học tập')).toBeInTheDocument()
      })

      // Click "Tạo thông báo mới"
      const createBtn = screen.getByRole('button', { name: /tạo thông báo mới/i })
      await user.click(createBtn)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      const titleInput = screen.getByLabelText(/tiêu đề thông báo/i)
      const contentInput = screen.getByLabelText(/nội dung thông báo/i)

      await user.type(titleInput, 'Kỳ thi thử THPT Quốc Gia năm 2026')
      await user.type(contentInput, 'Hệ thống mở cổng thi thử tự do cho tất cả học viên khối 12.')

      const modal = screen.getByRole('dialog')
      const saveBtn = within(modal).getByRole('button', { name: /tạo thông báo/i })
      await user.click(saveBtn)

      await waitFor(() => {
        expect(screen.getByText('Kỳ thi thử THPT Quốc Gia năm 2026')).toBeInTheDocument()
      })
    })
  })

  describe('6. Nhật ký quản trị (AdminAuditLogsPage)', () => {
    it('renders audit logs list and exports logs to CSV', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/audit-logs']}>
          <AdminAuditLogsPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /nhật ký quản trị \(audit logs\)/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getAllByText(/demo admin/i).length).toBeGreaterThan(0)
      })

      // Test CSV Export
      const exportBtn = screen.getByRole('button', { name: /xuất nhật ký/i })
      expect(exportBtn).toBeInTheDocument()
      await user.click(exportBtn)
    })
  })

  describe('7. Thiết lập vận hành (AdminSettingsPage)', () => {
    it('renders settings page, updates passing threshold and saves', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/settings']}>
          <AdminSettingsPage />
        </MemoryRouter>
      )

      expect(screen.getByRole('heading', { name: /thiết lập vận hành/i })).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByLabelText(/điểm tối thiểu đạt chuẩn/i)).toBeInTheDocument()
      })

      const passingScoreInput = screen.getByLabelText(/điểm tối thiểu đạt chuẩn/i)
      await user.clear(passingScoreInput)
      await user.type(passingScoreInput, '6.0')

      const saveBtn = screen.getByRole('button', { name: /lưu thay đổi cấu hình/i })
      await user.click(saveBtn)

      await waitFor(() => {
        expect(screen.getByText(/đã lưu thành công các thiết lập vận hành/i)).toBeInTheDocument()
      })
    })

    it('resets demo data to factory defaults when triggered', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/admin/settings']}>
          <AdminSettingsPage />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /xóa toàn bộ dữ liệu demo/i })).toBeInTheDocument()
      })

      const resetBtn = screen.getByRole('button', { name: /xóa toàn bộ dữ liệu demo/i })
      await user.click(resetBtn)

      await waitFor(() => {
        expect(screen.getByText(/đã đặt lại dữ liệu demo hệ thống/i)).toBeInTheDocument()
      })
    })
  })
})
