import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AchievementsPage } from './AchievementsPage'
import { Sidebar } from '@/components/layout/Sidebar'
import * as useAuthModule from '@/auth/useAuth'
import * as useSupportingModule from '@/hooks/useSupporting'

describe('AchievementsPage & Learner Navigation Visibility Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders guest gate when user is not authenticated', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
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

    vi.spyOn(useSupportingModule, 'useAchievements').mockReturnValue({
      achievements: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    })

    vi.spyOn(useSupportingModule, 'useUserProfile').mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    })

    render(
      <MemoryRouter>
        <AchievementsPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('guest-achievements-gate')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng đăng nhập')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument()
  })

  it('renders truthful unavailable notice when authenticated and achievements are not yet persisted', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'usr-01',
        email: 'learner@studyai.edu.vn',
        displayName: 'Học viên Toán 12',
        role: 'student',
      } as any,
      state: 'authenticated',
      isAuthenticated: true,
      isGuest: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
      migrationPending: false,
      confirmMigration: vi.fn(),
      declineMigration: vi.fn(),
    })

    vi.spyOn(useSupportingModule, 'useAchievements').mockReturnValue({
      achievements: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
    })

    vi.spyOn(useSupportingModule, 'useUserProfile').mockReturnValue({
      profile: {
        id: 'usr-01',
        name: 'Học viên Toán 12',
        avatar: '',
        grade: 'Lớp 12',
        school: '',
        studyGoal: '',
        streakDays: 3,
        totalXP: 0,
        studyHours: 1.5,
        completedLessons: 4,
        subjectStats: [],
      },
      isLoading: false,
      error: null,
      reload: vi.fn(),
    })

    render(
      <MemoryRouter>
        <AchievementsPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('achievements-unavailable-card')).toBeInTheDocument()
    expect(
      screen.getByText('Tính năng Huy hiệu & Thành tích đang kết nối hệ thống')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Hệ thống không tạo huy hiệu mẫu và sẽ hiển thị thành tích chính thức/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /luyện tập ngay/i })).toBeInTheDocument()
  })

  it('ensures learner Sidebar navigation does not expose an achievements link', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )

    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).not.toContain('/achievements')
  })
})
