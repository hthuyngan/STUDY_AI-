import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SupportDashboardPage } from './SupportDashboardPage'
import { SupportTicketsPage } from './SupportTicketsPage'
import { SupportTicketDetailPage } from './SupportTicketDetailPage'
import { SupportUsersPage } from './SupportUsersPage'
import { SupportUserDetailPage } from './SupportUserDetailPage'
import { supportService } from '@/services/support.service'

describe('Support Workspace UI & Interaction Suite', () => {
  beforeEach(() => {
    supportService._resetMockState()
  })

  it('1. Support Dashboard renders 4 KPIs, quick navigation and recent priority work queue', async () => {
    render(
      <MemoryRouter initialEntries={['/support']}>
        <SupportDashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /bàn làm việc hỗ trợ người dùng/i })).toBeInTheDocument()
      expect(screen.getByText('Yêu cầu đang mở')).toBeInTheDocument()
      expect(screen.getByText('Đang xử lý / Chờ')).toBeInTheDocument()
      expect(screen.getByText('Mức độ khẩn cấp (P1/P2)')).toBeInTheDocument()
      expect(screen.getByText('Đã giải quyết hôm nay')).toBeInTheDocument()
    })

    // Quick navigation buttons
    expect(screen.getByRole('link', { name: /xem hàng đợi ticket/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /tra cứu người dùng/i })).toBeInTheDocument()

    // Recent tickets work queue
    await waitFor(() => {
      expect(screen.getByText(/hàng đợi yêu cầu hỗ trợ ưu tiên/i)).toBeInTheDocument()
      expect(screen.getAllByText(/tiến độ làm bài thu hoạch không đồng bộ/i).length).toBeGreaterThan(0)
    })
  })

  it('2. Support Tickets renders ticket list, 4 KPIs, filters and search', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/support/tickets']}>
        <SupportTicketsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /yêu cầu hỗ trợ \(support tickets\)/i })).toBeInTheDocument()
      expect(screen.getByText('Tổng yêu cầu')).toBeInTheDocument()
      expect(screen.getByText('Chưa xử lý (Mới)')).toBeInTheDocument()
      expect(screen.getByText('Đang giải quyết')).toBeInTheDocument()
      expect(screen.getAllByText('Đã giải quyết').length).toBeGreaterThan(0)
    })

    // Search filter test
    const searchInput = screen.getByPlaceholderText(/tìm theo mã ticket, tiêu đề hoặc tên người gửi/i)
    await user.type(searchInput, 'đồng bộ')

    await waitFor(() => {
      expect(screen.getAllByText(/tiến độ làm bài thu hoạch không đồng bộ/i).length).toBeGreaterThan(0)
    })

    // Clear filter
    const clearBtn = screen.getByRole('button', { name: /xóa bộ lọc/i })
    await user.click(clearBtn)
    expect(searchInput).toHaveValue('')
  })

  it('3. Support Ticket Detail renders conversation thread, sends reply and switches to internal note', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/support/tickets/TK-4821']}>
        <Routes>
          <Route path="/support/tickets/:id" element={<SupportTicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('TK-4821')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /tiến độ làm bài thu hoạch không đồng bộ/i })).toBeInTheDocument()
    })

    // Check conversation messages
    expect(screen.getByText(/chào ban hỗ trợ, tối qua em có làm bài thu hoạch/i)).toBeInTheDocument()

    // Send a public reply
    const replyInput = screen.getByPlaceholderText(/nhập nội dung phản hồi hoặc hướng dẫn xử lý sự cố cho người dùng/i)
    await user.type(replyInput, 'Kỹ thuật viên đã kiểm tra và đồng bộ lại tiến trình học tập.')

    const sendBtn = screen.getByRole('button', { name: /gửi phản hồi/i })
    await user.click(sendBtn)

    await waitFor(() => {
      expect(screen.getByText('Kỹ thuật viên đã kiểm tra và đồng bộ lại tiến trình học tập.')).toBeInTheDocument()
    })

    // Switch to Internal Note mode
    const internalTab = screen.getByRole('button', { name: /ghi chú nội bộ/i })
    await user.click(internalTab)

    expect(screen.getByPlaceholderText(/nhập ghi chú kỹ thuật nội bộ/i)).toBeInTheDocument()
  })

  it('4. Support Users renders user lookup table and 4 KPIs', async () => {
    render(
      <MemoryRouter initialEntries={['/support/users']}>
        <SupportUsersPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /tra cứu & kỹ thuật người dùng/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Tổng người dùng')).toBeInTheDocument()
      expect(screen.getByText('Đã đồng bộ dữ liệu')).toBeInTheDocument()
      expect(screen.getByText('Chờ đồng bộ')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getAllByText('Nguyễn Minh Anh').length).toBeGreaterThan(0)
    })
  })

  it('5. Support User Detail renders technical diagnostic info and ticket history', async () => {
    render(
      <MemoryRouter initialEntries={['/support/users/usr-101']}>
        <Routes>
          <Route path="/support/users/:id" element={<SupportUserDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nguyễn Minh Anh' })).toBeInTheDocument()
      expect(screen.getByText(/study_ai\.usr-101\.v2/i)).toBeInTheDocument()
      expect(screen.getByText(/thông số chẩn đoán kỹ thuật/i)).toBeInTheDocument()
      expect(screen.getByText(/lịch sử yêu cầu hỗ trợ/i)).toBeInTheDocument()
    })
  })
})
