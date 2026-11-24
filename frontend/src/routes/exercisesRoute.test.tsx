import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PracticeHubPage } from '@/pages/Practice/PracticeHubPage'

// Mock services called by PracticeHubPage
vi.mock('@/services/practice.service', () => ({
  practiceService: {
    getActiveSession: vi.fn().mockResolvedValue(null),
    getDashboardStats: vi.fn().mockResolvedValue({
      totalQuestionsAnswered: 0,
      correctAnswers: 0,
      totalPracticeTimeMs: 0,
      accuracyRate: 0,
      streakDays: 0,
    }),
    getHistory: vi.fn().mockResolvedValue([]),
    getMistakes: vi.fn().mockResolvedValue([]),
    getQuestionCount: vi.fn().mockResolvedValue({ count: 10 }),
  },
}))

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'usr_test', displayName: 'Học sinh Test', grade: '12' },
    isAuthenticated: true,
    state: 'authenticated',
  }),
}))

describe('/exercises Route Alias Integrity', () => {
  it('renders PracticeHubPage when navigating to /exercises alias', async () => {
    render(
      <MemoryRouter initialEntries={['/exercises']}>
        <Routes>
          <Route path="/exercises" element={<PracticeHubPage />} />
          <Route path="/exercises/:exerciseId" element={<PracticeHubPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText(/Luyện tập & Đánh giá năng lực Toán 12/i)).toBeDefined()
    expect(screen.queryByText(/chưa có bài tập nào/i)).toBeNull()
  })

  it('renders PracticeHubPage when navigating to parameterized /exercises/:exerciseId', async () => {
    render(
      <MemoryRouter initialEntries={['/exercises/ex-123']}>
        <Routes>
          <Route path="/exercises" element={<PracticeHubPage />} />
          <Route path="/exercises/:exerciseId" element={<PracticeHubPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText(/Luyện tập & Đánh giá năng lực Toán 12/i)).toBeDefined()
  })
})
