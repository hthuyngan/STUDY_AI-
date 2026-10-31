import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateTeacherModal } from './CreateTeacherModal'

describe('CreateTeacherModal Component & Layout Suite', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Renders nothing when isOpen is false', () => {
    const { container } = render(
      <CreateTeacherModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('2. Renders modal header, 2-column grid, fields, and footer when isOpen is true', () => {
    render(
      <CreateTeacherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    // Header
    expect(screen.getByRole('heading', { level: 2, name: /Thêm giáo viên mới/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đóng hộp thoại/i })).toBeInTheDocument()

    // Required fields with labels above inputs
    expect(screen.getByLabelText(/Họ và tên giáo viên/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Địa chỉ Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Số điện thoại/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Bộ môn phụ trách/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Trạng thái giảng dạy/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Lớp phụ trách/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Kinh nghiệm \(năm\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Bằng cấp \/ Học vị/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Giới thiệu ngắn \/ Tiểu sử/i)).toBeInTheDocument()

    // Helper text for classes input
    expect(screen.getByText(/Nhập nhiều lớp, ngăn cách bằng dấu phẩy/i)).toBeInTheDocument()

    // Footer buttons
    expect(screen.getByRole('button', { name: /Hủy bỏ/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tạo giáo viên/i })).toBeInTheDocument()
  })

  it('3. Shows validation error when submitting with empty name or invalid email', async () => {
    const user = userEvent.setup()
    render(
      <CreateTeacherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    const submitBtn = screen.getByRole('button', { name: /Tạo giáo viên/i })

    // Submit with empty name
    await user.click(submitBtn)
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập họ và tên giáo viên.')
    expect(mockOnSubmit).not.toHaveBeenCalled()

    // Fill name but leave email empty or invalid
    const nameInput = screen.getByLabelText(/Họ và tên giáo viên/i)
    await user.type(nameInput, 'TS. Nguyễn Văn A')
    await user.click(submitBtn)
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập địa chỉ email hợp lệ.')
    expect(mockOnSubmit).not.toHaveBeenCalled()

    // Invalid email without @
    const emailInput = screen.getByLabelText(/Địa chỉ Email/i)
    await user.type(emailInput, 'invalid-email')
    await user.click(submitBtn)
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập địa chỉ email hợp lệ.')
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('4. Successfully submits valid teacher form and resets/closes modal', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockResolvedValueOnce(undefined)

    render(
      <CreateTeacherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    await user.type(screen.getByLabelText(/Họ và tên giáo viên/i), 'ThS. Trần Thị Mai')
    await user.type(screen.getByLabelText(/Địa chỉ Email/i), 'mai.tran@studyai.edu.vn')
    await user.type(screen.getByLabelText(/Số điện thoại/i), '0988 777 666')
    await user.selectOptions(screen.getByLabelText(/Bộ môn phụ trách/i), 'Vật lý 12')
    await user.clear(screen.getByLabelText(/Lớp phụ trách/i))
    await user.type(screen.getByLabelText(/Lớp phụ trách/i), '12 Lý 1, 12 Lý 2')
    await user.type(screen.getByLabelText(/Giới thiệu ngắn \/ Tiểu sử/i), 'Giáo viên phụ trách đội tuyển HSG.')

    const submitBtn = screen.getByRole('button', { name: /Tạo giáo viên/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ThS. Trần Thị Mai',
          email: 'mai.tran@studyai.edu.vn',
          phone: '0988 777 666',
          subject: 'Vật lý 12',
          classes: ['12 Lý 1', '12 Lý 2'],
          bio: 'Giáo viên phụ trách đội tuyển HSG.',
        })
      )
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('5. Closes modal on Escape key and Close/Cancel button clicks', async () => {
    const user = userEvent.setup()
    render(
      <CreateTeacherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalledTimes(1)

    // Click close button X
    const closeBtn = screen.getByRole('button', { name: /Đóng hộp thoại/i })
    await user.click(closeBtn)
    expect(mockOnClose).toHaveBeenCalledTimes(2)

    // Click Cancel button
    const cancelBtn = screen.getByRole('button', { name: /Hủy bỏ/i })
    await user.click(cancelBtn)
    expect(mockOnClose).toHaveBeenCalledTimes(3)
  })

  it('6. Handles submission failure gracefully and shows error alert', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockRejectedValueOnce(new Error('Email đã tồn tại trên hệ thống.'))

    render(
      <CreateTeacherModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    )

    await user.type(screen.getByLabelText(/Họ và tên giáo viên/i), 'ThS. Trần Thị Mai')
    await user.type(screen.getByLabelText(/Địa chỉ Email/i), 'duplicate@studyai.edu.vn')

    const submitBtn = screen.getByRole('button', { name: /Tạo giáo viên/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Email đã tồn tại trên hệ thống.')
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })
})
