import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'
import * as authHook from '@/auth/useAuth'
import * as dashboardHook from '@/hooks/useDashboard'

vi.mock('@/auth/useAuth')
vi.mock('@/hooks/useDashboard')

describe('DashboardPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders guest landing with zero personal metrics and login CTA when unauthenticated', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      clearSession: vi.fn(),
    })

    vi.mocked(dashboardHook.useDashboard).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      reload: vi.fn(),
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('guest-dashboard')).toBeInTheDocument()
    expect(screen.getByText(/Chào mừng bạn đến với STUDY_AI/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đăng nhập để theo dõi học tập/i })).toBeInTheDocument()
    expect(screen.queryByText(/Bảng xếp hạng/i)).not.toBeInTheDocument()
  })

  it('renders learner dashboard without mock competition or leaderboard widget', () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      isAuthenticated: true,
      user: {
        id: 'usr_01',
        email: 'learner@studyai.edu.vn',
        displayName: 'Nguyễn Văn A',
        role: 'learner',
        grade: '12',
      },
      token: 'jwt_test',
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      clearSession: vi.fn(),
    })

    vi.mocked(dashboardHook.useDashboard).mockReturnValue({
      data: {
        user: {
          id: 'usr_01',
          name: 'Nguyễn Văn A',
          greetingName: 'A',
          avatar: '',
          grade: 'Lớp 12',
        },
        stats: {
          streakDays: 3,
          longestStreak: 3,
          totalXP: 0,
          weeklyMinutes: 45,
          completedLessonsCount: 2,
        },
        activity: {
          points: [],
          weeklyHours: 0.8,
          increasePercent: 0,
        },
        dailyGoals: {
          bonusXP: 0,
          items: [],
        },
        continueLessons: [],
        subjects: [],
        recentActivities: [
          {
            id: 'act_1',
            userAvatar: '',
            userName: 'Nguyễn Văn A',
            action: 'hoàn thành luyện tập',
            targetName: 'Toán 12',
            targetUrl: '/practice/hub?subjectId=sub_math12',
            subjectOrModule: 'Toán 12',
            timeAgo: '10:00',
          },
        ],
        leaderboard: [],
      },
      isLoading: false,
      error: null,
      reload: vi.fn(),
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    expect(screen.queryByTestId('guest-dashboard')).not.toBeInTheDocument()
    expect(screen.getAllByText(/Nguyễn Văn A/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Hoạt động gần đây')).toBeInTheDocument()
    expect(screen.queryByText(/Bảng xếp hạng/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Xem toàn bộ bảng xếp hạng/i)).not.toBeInTheDocument()
  })
})
