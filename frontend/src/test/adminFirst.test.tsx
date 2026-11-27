import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AdminDetailDrawer } from '@/components/admin/ui/AdminDetailDrawer'
import { AdminDashboardPage } from '@/pages/Admin/AdminDashboardPage'
import { AdminApiManagementMockupPage } from '@/pages/Admin/AdminApiManagementMockupPage'
import { AdminSubscriptionsMockupPage } from '@/pages/Admin/AdminSubscriptionsMockupPage'
import { AdminTicketsPage } from '@/pages/Admin/AdminTicketsPage'
import { SupportCenterPage } from '@/pages/Support/SupportCenterPage'
import { adminService } from '@/services/admin.service'
import { supportService } from '@/services/support.service'

describe('Admin First Fullstack Pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('AdminDashboardPage renders real metrics without fake percentages and shows honest unavailable state for subscriptions', async () => {
    vi.spyOn(adminService, 'getMetrics').mockResolvedValue({
      totalUsers: 120,
      activeLearners: 95,
      newUsersInRange: 14,
      activeLearnersInRange: 62,
      staffAccounts: 25,
      completedLessonsTotal: 410,
      practiceSessionsInRange: 88,
      assessmentAttemptsInRange: 31,
      aiRequestsInRange: 250,
      aiTotalTokensInRange: 180000,
      aiErrorCountInRange: 2,
      aiErrorRatePercent: 0.8,
      openSupportTicketsCount: 3,
      subscriptionsModuleAvailable: false,
      activeSubscriptionsCount: null,
      actualRevenueVnd: null,
      timezone: 'Asia/Bangkok',
      systemStatus: 'healthy',
      apiLatencyMs: 12,
      databaseStatus: 'connected',
      frontendVersion: '1.0.0',
      backendVersion: '1.0.0',
      environment: 'Testing',
      isPrototypeMode: false,
    })
    vi.spyOn(adminService, 'getAttentionItems').mockResolvedValue([])
    vi.spyOn(adminService, 'getRecentActivities').mockResolvedValue([])
    vi.spyOn(adminService, 'getAnalytics').mockResolvedValue({
      trends: [
        {
          date: '27/11',
          label: '27/11',
          completedLessons: 12,
          activeUsers: 40,
          assessments: 5,
          practiceSessions: 14,
          aiRequests: 35,
          aiErrors: 0,
        },
      ],
      roleDistribution: [
        { name: 'Học viên', key: 'learner', count: 95, percentage: 79, color: '#1D4ED8' },
      ],
      statusDistribution: [
        { name: 'Hoạt động', key: 'active', count: 120, percentage: 100, color: '#16A34A' },
      ],
    })

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('120')).toBeInTheDocument()
    })
    expect(screen.getByText('250')).toBeInTheDocument()
    expect(screen.getByText('0.8%')).toBeInTheDocument()
    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument()
    expect(screen.queryByText('+12.4% so với kỳ trước')).not.toBeInTheDocument()
  })

  it('ADM-04 and ADM-05 mockup pages display design approval banners and illustrative plans', () => {
    render(
      <MemoryRouter>
        <AdminApiManagementMockupPage />
        <AdminSubscriptionsMockupPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/BẢN MẪU THIẾT KẾ ADM-04/i)).toBeInTheDocument()
    expect(screen.getByText(/BẢN MẪU THIẾT KẾ ADM-05/i)).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('Plus')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })

  it('AdminTicketsPage and SupportCenterPage render empty states cleanly', async () => {
    vi.spyOn(supportService, 'listAdminTickets').mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 15,
      total: 0,
      totalPages: 0,
    })
    vi.spyOn(supportService, 'listMyTickets').mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    })

    render(
      <MemoryRouter>
        <AdminTicketsPage />
        <SupportCenterPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Chưa có yêu cầu hỗ trợ nào')).toBeInTheDocument()
      expect(screen.getByText('Bạn chưa có yêu cầu hỗ trợ nào')).toBeInTheDocument()
    })
  })

  it('AdminDetailDrawer traps Tab focus and restores focus on close', async () => {
    const Harness = () => {
      const [open, setOpen] = useState(false)
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Mở ngăn
          </button>
          <AdminDetailDrawer open={open} onClose={() => setOpen(false)} title="Chi tiết">
            <button type="button">Nút cuối</button>
          </AdminDetailDrawer>
        </div>
      )
    }

    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Mở ngăn' })
    trigger.focus()
    fireEvent.click(trigger)

    const closeBtn = await screen.findByRole('button', { name: 'Đóng chi tiết' })
    const lastBtn = screen.getByRole('button', { name: 'Nút cuối' })
    expect(document.activeElement).toBe(closeBtn)

    lastBtn.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(closeBtn)

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(document.activeElement).toBe(trigger)
    })
  })

  it('AdminTicketsPage ignores stale out-of-order list and detail responses', async () => {
    let resolveFirstList!: (val: Awaited<ReturnType<typeof supportService.listAdminTickets>>) => void
    let resolveSecondList!: (val: Awaited<ReturnType<typeof supportService.listAdminTickets>>) => void

    const listSpy = vi.spyOn(supportService, 'listAdminTickets')
      .mockImplementationOnce(() => new Promise((res) => { resolveFirstList = res }))
      .mockImplementationOnce(() => new Promise((res) => { resolveSecondList = res }))

    render(
      <MemoryRouter>
        <AdminTicketsPage />
      </MemoryRouter>
    )

    const searchInput = screen.getByLabelText('Tìm kiếm ticket')
    fireEvent.change(searchInput, { target: { value: 'NEW' } })

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(2)
    })

    resolveSecondList({
      items: [{
        id: 't-new',
        ticketCode: 'TK-NEW',
        userId: 'u1',
        userName: 'Học sinh Mới',
        userEmail: 'new@studyai.test',
        subject: 'Ticket mới nhất',
        category: 'TECHNICAL',
        priority: 'HIGH',
        status: 'OPEN',
        assignedToUserId: null,
        assignedToName: null,
        messageCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null,
        closedAt: null,
      }],
      page: 1,
      pageSize: 15,
      total: 1,
      totalPages: 1,
    })

    await waitFor(() => {
      expect(screen.getByText('Ticket mới nhất')).toBeInTheDocument()
    })

    resolveFirstList({
      items: [{
        id: 't-old',
        ticketCode: 'TK-OLD',
        userId: 'u2',
        userName: 'Học sinh Cũ',
        userEmail: 'old@studyai.test',
        subject: 'Ticket cũ bị trễ',
        category: 'TECHNICAL',
        priority: 'LOW',
        status: 'OPEN',
        assignedToUserId: null,
        assignedToName: null,
        messageCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null,
        closedAt: null,
      }],
      page: 1,
      pageSize: 15,
      total: 1,
      totalPages: 1,
    })

    await waitFor(() => {
      expect(screen.getByText('Ticket mới nhất')).toBeInTheDocument()
      expect(screen.queryByText('Ticket cũ bị trễ')).not.toBeInTheDocument()
    })
  })
})
