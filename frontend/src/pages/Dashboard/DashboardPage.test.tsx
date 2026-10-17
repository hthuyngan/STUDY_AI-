import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'

describe('DashboardPage — Learning Home', () => {
  it('renders top greeting, primary learning card, and bottom navigation', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    // Wait for mock data load
    await waitFor(() => {
      expect(screen.getByText(/Chào buổi sáng/i)).toBeInTheDocument()
    })

    // 1. Primary Learning Card
    expect(screen.getByText('TIẾP TỤC HỌC')).toBeInTheDocument()
    expect(screen.getByText('Khảo sát sự biến thiên & Vẽ đồ thị hàm số')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tiếp tục bài học/i })).toBeInTheDocument()

    // 2. Explore Subjects
    expect(screen.getByText('Khám phá môn học')).toBeInTheDocument()
    expect(screen.getByText('Toán')).toBeInTheDocument()
    expect(screen.getAllByText('Vật lý').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Hóa học').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Tiếng Anh').length).toBeGreaterThanOrEqual(1)

    // 3. Progress Overview
    expect(screen.getByText('Tiến độ của tôi')).toBeInTheDocument()
    expect(screen.getByText(/68 bài/i)).toBeInTheDocument()
    expect(screen.getByText(/12 ngày/i)).toBeInTheDocument()
    expect(screen.getByText(/2,450 XP/i)).toBeInTheDocument()

    // 4. Weekly Goal
    expect(screen.getByText('Mục tiêu tuần')).toBeInTheDocument()
    expect(screen.getByText(/5 \/ 7 ngày/i)).toBeInTheDocument()

    // 5. Recommended For You & AI Tutor presence
    expect(screen.getByText('Đề xuất cho bạn')).toBeInTheDocument()
    expect(screen.getByText('Hệ Mặt Trời & Chuyển động thiên thể')).toBeInTheDocument()
    expect(screen.getByText('Luyện tập giải bài khó cùng AI Tutor')).toBeInTheDocument()

    // 6. Bottom Navigation
    const nav = screen.getByRole('navigation', { name: /điều hướng chính/i })
    expect(nav).toBeInTheDocument()
    expect(screen.getByText('Trang chủ')).toBeInTheDocument()
    expect(screen.getByText('Khóa học')).toBeInTheDocument()
    expect(screen.getAllByText('AI Tutor').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Thành tích')).toBeInTheDocument()
  })

  it('allows toggling light/dark theme from top header', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Chào buổi sáng/i)).toBeInTheDocument()
    })

    const themeToggleBtn = screen.getByRole('button', { name: /chuyển sang giao diện/i })
    expect(themeToggleBtn).toBeInTheDocument()

    fireEvent.click(themeToggleBtn)
    expect(document.documentElement.getAttribute('data-theme')).toBeTruthy()
  })
})
