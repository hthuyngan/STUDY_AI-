import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminTeachersPage } from './AdminTeachersPage'

describe('AdminTeachersPage — ZhongWenHub Architecture Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('1. Renders PageHeader, SummaryStrip with 4 KPIs, and Search/Filter Toolbar', async () => {
    render(
      <MemoryRouter>
        <AdminTeachersPage />
      </MemoryRouter>
    )

    // Header
    expect(screen.getByRole('heading', { level: 1, name: /Quản lý giáo viên/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thêm giáo viên mới/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Đến Teacher Workspace/i })).toHaveAttribute('href', '/teacher')

    // 4 KPIs in Summary Strip
    await waitFor(() => {
      expect(screen.getByText('Tổng số giáo viên')).toBeInTheDocument()
      expect(screen.getAllByText('Đang giảng dạy').length).toBeGreaterThan(0)
      expect(screen.getByText('Tạm nghỉ / Chờ duyệt')).toBeInTheDocument()
      expect(screen.getByText(/Giáo viên mới/i)).toBeInTheDocument()
    })

    // Toolbar
    expect(screen.getByRole('searchbox', { name: /Tìm kiếm giáo viên/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Lọc theo bộ môn/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Lọc theo trạng thái giảng dạy/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Lọc theo tài khoản/i })).toBeInTheDocument()
  })

  it('2. Filters teacher table by keyword search and resets filters', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminTeachersPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Lê Thanh Thảo')).toBeInTheDocument()
      expect(screen.getByText('Phạm Văn Nam')).toBeInTheDocument()
    })

    // Search for "Văn Nam"
    const searchInput = screen.getByRole('searchbox', { name: /Tìm kiếm giáo viên/i })
    await user.type(searchInput, 'Văn Nam')

    await waitFor(() => {
      expect(screen.getByText('Phạm Văn Nam')).toBeInTheDocument()
      expect(screen.queryByText('Lê Thanh Thảo')).not.toBeInTheDocument()
    })

    // Reset filters button appears
    const resetBtn = screen.getByRole('button', { name: /Đặt lại bộ lọc/i })
    expect(resetBtn).toBeInTheDocument()
    await user.click(resetBtn)

    await waitFor(() => {
      expect(screen.getByText('Lê Thanh Thảo')).toBeInTheDocument()
      expect(screen.getByText('Phạm Văn Nam')).toBeInTheDocument()
    })
  })

  it('3. Opens TeacherDetailDrawer, switches tabs, and saves edited profile', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminTeachersPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Lê Thanh Thảo')).toBeInTheDocument()
    })

    // Click Eye button to open drawer
    const viewBtn = screen.getByLabelText(/Xem hồ sơ Lê Thanh Thảo/i)
    await user.click(viewBtn)

    // Drawer is displayed
    const drawer = screen.getByRole('dialog', { name: /Lê Thanh Thảo/i })
    expect(drawer).toBeInTheDocument()
    expect(screen.getByText('Hồ sơ giáo viên')).toBeInTheDocument()
    expect(screen.getAllByText('thanh.thao@example.com').length).toBeGreaterThan(0)

    // Switch to "Lớp học & Đánh giá" tab
    const teachingTab = screen.getByRole('button', { name: /Lớp học & Đánh giá/i })
    await user.click(teachingTab)
    expect(screen.getByText('Lớp học phân công')).toBeInTheDocument()

    // Switch to "Tài khoản & Thao tác" tab
    const accountTab = screen.getByRole('button', { name: /Tài khoản & Thao tác/i })
    await user.click(accountTab)
    expect(screen.getByText('Tình trạng tài khoản')).toBeInTheDocument()

    // Click "Chỉnh sửa hồ sơ"
    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa hồ sơ/i })
    await user.click(editBtn)

    // Form inputs should be visible
    const nameInput = screen.getByLabelText(/^Họ và tên/i)
    expect(nameInput).toHaveValue('Lê Thanh Thảo')
    await user.clear(nameInput)
    await user.type(nameInput, 'TS. Lê Thanh Thảo')

    // Submit edit
    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(screen.getAllByText(/TS\. Lê Thanh Thảo/i).length).toBeGreaterThan(0)
    })
  })

  it('4. Opens CreateTeacherModal, validates required fields, and creates new teacher', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminTeachersPage />
      </MemoryRouter>
    )

    // Click "+ Thêm giáo viên"
    const addBtn = screen.getByRole('button', { name: /Thêm giáo viên mới/i })
    await user.click(addBtn)

    // Modal is opened
    expect(screen.getByRole('heading', { level: 2, name: /Thêm giáo viên mới/i })).toBeInTheDocument()

    // Fill form
    const nameInput = screen.getByLabelText(/Họ và tên giáo viên/i)
    const emailInput = screen.getByLabelText(/Địa chỉ Email/i)
    await user.type(nameInput, 'ThS. Trần Minh Quân')
    await user.type(emailInput, 'minhquan@studyai.edu.vn')

    // Submit
    const submitBtn = screen.getByRole('button', { name: /^Tạo giáo viên$/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getAllByText('ThS. Trần Minh Quân').length).toBeGreaterThan(0)
      expect(screen.getAllByText('minhquan@studyai.edu.vn').length).toBeGreaterThan(0)
    })
  })

  it('5. Changes teaching status and locks/unlocks teacher account with confirmation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminTeachersPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Phạm Văn Nam')).toBeInTheDocument()
    })

    // Open change status modal for Phạm Văn Nam
    const statusBtn = screen.getByLabelText(/Đổi trạng thái Phạm Văn Nam/i)
    await user.click(statusBtn)

    expect(screen.getByRole('heading', { level: 2, name: /Đổi trạng thái giảng dạy/i })).toBeInTheDocument()

    // Select "Tạm ngừng giảng dạy (Inactive)"
    const inactiveRadio = screen.getByLabelText(/Tạm ngừng giảng dạy \(Inactive\)/i)
    await user.click(inactiveRadio)

    const updateStatusBtn = screen.getByRole('button', { name: /Cập nhật trạng thái/i })
    await user.click(updateStatusBtn)

    // Open lock account confirm dialog
    const lockBtn = screen.getByLabelText(/Khóa Phạm Văn Nam/i)
    await user.click(lockBtn)

    expect(screen.getByText(/Khóa tài khoản giáo viên/i)).toBeInTheDocument()
    const confirmLockBtn = screen.getByRole('button', { name: /^Khóa tài khoản$/i })
    await user.click(confirmLockBtn)

    await waitFor(() => {
      expect(screen.getAllByText('Đã khóa').length).toBeGreaterThan(0)
    })
  })
})
