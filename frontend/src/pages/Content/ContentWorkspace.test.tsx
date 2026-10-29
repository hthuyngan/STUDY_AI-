import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ContentDashboardPage } from './ContentDashboardPage'
import { ContentSubjectsPage } from './ContentSubjectsPage'
import { ContentChaptersPage } from './ContentChaptersPage'
import { ContentLessonsPage } from './ContentLessonsPage'
import { ContentAssessmentsPage } from './ContentAssessmentsPage'
import { ContentReviewPage } from './ContentReviewPage'
import { ContentPublicationsPage } from './ContentPublicationsPage'

// Mock useAuth
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'demo-content-id',
      email: 'editor@studyai.edu.vn',
      fullName: 'Biên tập viên Demo',
      role: 'content',
    },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }),
}))

describe('Content Workspace UI & Interaction Suite', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('1. Content Dashboard renders metrics, review queue and lessons', async () => {
    render(
      <MemoryRouter initialEntries={['/content']}>
        <Routes>
          <Route path="/content" element={<ContentDashboardPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Biên tập & Xuất bản Giáo trình')).toBeInTheDocument()
      expect(screen.getByText('Bài học bản nháp')).toBeInTheDocument()
      expect(screen.getByText('Chờ duyệt chất lượng')).toBeInTheDocument()
      expect(screen.getByText('Hàng đợi kiểm duyệt nội dung')).toBeInTheDocument()
    })
  })

  it('2. Content Chapters renders page title, add button, filter toolbar and table', async () => {
    render(
      <MemoryRouter initialEntries={['/content/chapters']}>
        <Routes>
          <Route path="/content/chapters" element={<ContentChaptersPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Quản lý chương học')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Thêm chương học')).toBeInTheDocument()
      expect(screen.getByLabelText('Chọn môn học để xem chương')).toBeInTheDocument()
      expect(screen.getByText('Tên chương học')).toBeInTheDocument()
      expect(screen.getByText('Số bài học')).toBeInTheDocument()
    })
  })

  it('3. Content Subjects renders subject list and create button', async () => {
    render(
      <MemoryRouter initialEntries={['/content/subjects']}>
        <Routes>
          <Route path="/content/subjects" element={<ContentSubjectsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/Quản lý môn học/)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Thêm môn học')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Tìm theo tên môn, mã môn...')).toBeInTheDocument()
    })
  })

  it('4. Content Lessons renders lessons table and filters', async () => {
    render(
      <MemoryRouter initialEntries={['/content/lessons']}>
        <Routes>
          <Route path="/content/lessons" element={<ContentLessonsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Quản lý bài học')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Tạo bài học')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Tìm theo tiêu đề bài học hoặc tác giả...')).toBeInTheDocument()
    })
  })

  it('5. Content Assessments renders assessment items and question management', async () => {
    render(
      <MemoryRouter initialEntries={['/content/assessments']}>
        <Routes>
          <Route path="/content/assessments" element={<ContentAssessmentsPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Quản lý bài thu hoạch')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Tạo bài thu hoạch')).toBeInTheDocument()
    })
  })

  it('6. Content Review renders approval queue and KPIs', async () => {
    render(
      <MemoryRouter initialEntries={['/content/review']}>
        <Routes>
          <Route path="/content/review" element={<ContentReviewPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Phê duyệt nội dung')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText('Chờ duyệt').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Đã duyệt').length).toBeGreaterThan(0)
    })
  })

  it('7. Content Publications renders publication records', async () => {
    render(
      <MemoryRouter initialEntries={['/content/publications']}>
        <Routes>
          <Route path="/content/publications" element={<ContentPublicationsPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Lịch sử xuất bản')).toBeInTheDocument()
    })
  })
})
