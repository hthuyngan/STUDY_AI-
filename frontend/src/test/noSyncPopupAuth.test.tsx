import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { AuthProvider } from '@/auth/AuthProvider'
import { useAuth } from '@/auth/useAuth'
import { clearAuthSession, setAuthUser } from '@/auth/authSession'
import { authService } from '@/auth/auth.service'
import { learningProgressRepository } from '@/repositories/learningProgress.repository'
import { LocalLearningProgressRepository } from '@/repositories/learningProgress.repository'
import { getStorageKey } from '@/repositories/storageKeys'
import type { LessonProgressState } from '@/types/assessment'

// Helper component that consumes useAuth and renders status
const AuthTestConsumer: React.FC = () => {
  const { user, isAuthenticated, migrationPending, login, logout } = useAuth()

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'guest'}</div>
      <div data-testid="user-id">{user?.id || 'none'}</div>
      <div data-testid="migration-pending">{migrationPending ? 'true' : 'false'}</div>
      <button
        onClick={() =>
          login({ email: 'learner@studyai.internal', password: 'Password@123' })
        }
      >
        Login
      </button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}

describe('ANTIGRAVITY — No Sync Popup & Clean Progress State Suite', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    clearAuthSession()
    vi.clearAllMocks()
  })

  it('1. Ensures migrationPending is NEVER true on initial load, even if guest learning data exists', async () => {
    // Seed legacy guest progress into localStorage
    localStorage.setItem(
      'study_ai.lesson_progress.v1',
      JSON.stringify({
        'les_math12_c1_b1': {
          lessonId: 'les_math12_c1_b1',
          subjectId: 'sub_math12',
          contentProgress: 100,
          overallProgress: 100,
          assessmentStatus: 'completed',
          completedSectionIds: ['intro'],
          updatedAt: '2026-11-15T00:00:00Z',
        },
      })
    )

    // Mock refresh to return guest
    vi.spyOn(authService, 'refresh').mockRejectedValue(new Error('No session'))

    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('guest')
    })

    // migrationPending MUST be false
    expect(screen.getByTestId('migration-pending').textContent).toBe('false')
    // No popup title anywhere in the DOM
    expect(screen.queryByText(/Bạn có tiến độ học tập trên thiết bị này/i)).toBeNull()
    expect(screen.queryByText(/Đồng bộ vào tài khoản/i)).toBeNull()
    expect(screen.queryByText(/Giữ riêng trên thiết bị/i)).toBeNull()
  })

  it('2. Login fetches progress from server and NEVER triggers sync popup', async () => {
    // Seed guest data
    localStorage.setItem(
      'study_ai.lesson_progress.v1',
      JSON.stringify({
        'guest_lesson': { lessonId: 'guest_lesson', contentProgress: 50 },
      })
    )

    const mockServerUser = {
      id: 'usr_math_learner_01',
      email: 'learner@studyai.internal',
      displayName: 'Nguyễn Văn A',
      role: 'learner' as const,
      createdAt: '2026-11-01T00:00:00Z',
    }

    vi.spyOn(authService, 'login').mockResolvedValue({
      accessToken: 'mock_jwt_token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: mockServerUser,
    })

    const fetchRemoteSpy = vi
      .spyOn(learningProgressRepository, 'fetchRemoteAll')
      .mockImplementation(async () => {
        // Mock server returning the user's progress
        const serverProgress: Record<string, LessonProgressState> = {
          'les_math12_c1_b1': {
            lessonId: 'les_math12_c1_b1',
            subjectId: 'sub_math12',
            contentProgress: 100,
            overallProgress: 100,
            assessmentStatus: 'completed',
            completedSectionIds: ['intro', 'formulas'],
            updatedAt: '2026-11-15T10:00:00Z',
          },
        }
        localStorage.setItem(
          getStorageKey('lesson_progress', 'usr_math_learner_01'),
          JSON.stringify(serverProgress)
        )
        return serverProgress
      })

    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    )

    // Click login
    screen.getByText('Login').click()

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('authenticated')
      expect(screen.getByTestId('user-id').textContent).toBe('usr_math_learner_01')
    })

    // Verified: Server fetch was invoked for this user
    expect(fetchRemoteSpy).toHaveBeenCalled()

    // Verified: migrationPending remains false
    expect(screen.getByTestId('migration-pending').textContent).toBe('false')

    // Verified: Zero popup text in DOM
    expect(screen.queryByText(/Bạn có tiến độ học tập trên thiết bị này/i)).toBeNull()
    expect(screen.queryByText(/Đồng bộ vào tài khoản/i)).toBeNull()

    // Verified: User has their server progress loaded in their namespaced storage
    const userStorage = localStorage.getItem(
      getStorageKey('lesson_progress', 'usr_math_learner_01')
    )
    expect(userStorage).toContain('les_math12_c1_b1')
    // Guest data was NOT deleted from the device
    expect(localStorage.getItem('study_ai.lesson_progress.v1')).toBeTruthy()
  })

  it('3. Two different users on same browser do not mix learning progress', () => {
    const repo = new LocalLearningProgressRepository()

    // User 1 logs in
    setAuthUser({
      id: 'usr_student_alpha',
      displayName: 'Học sinh Alpha',
      role: 'learner',
      createdAt: '2026-11-01T00:00:00Z',
    })

    repo.save({
      lessonId: 'les_math12_c1_b1',
      subjectId: 'sub_math12',
      contentProgress: 100,
      overallProgress: 100,
      assessmentStatus: 'completed',
      completedSectionIds: ['intro'],
      updatedAt: '2026-11-15T01:00:00Z',
    })

    expect(repo.getByLessonId('les_math12_c1_b1')?.overallProgress).toBe(100)

    // User 1 logs out
    clearAuthSession()
    expect(repo.getByLessonId('les_math12_c1_b1')).toBeNull()

    // User 2 logs in
    setAuthUser({
      id: 'usr_student_beta',
      displayName: 'Học sinh Beta',
      role: 'learner',
      createdAt: '2026-11-01T00:00:00Z',
    })

    // User 2 must see fresh empty progress, NOT User 1's progress
    expect(repo.getByLessonId('les_math12_c1_b1')).toBeNull()
    expect(Object.keys(repo.getAll()).length).toBe(0)

    // User 2 records partial progress
    repo.save({
      lessonId: 'les_math12_c1_b1',
      subjectId: 'sub_math12',
      contentProgress: 40,
      overallProgress: 40,
      assessmentStatus: 'incomplete',
      completedSectionIds: ['intro'],
      updatedAt: '2026-11-15T02:00:00Z',
    })

    expect(repo.getByLessonId('les_math12_c1_b1')?.overallProgress).toBe(40)

    // Switch back to User 1
    setAuthUser({
      id: 'usr_student_alpha',
      displayName: 'Học sinh Alpha',
      role: 'learner',
      createdAt: '2026-11-01T00:00:00Z',
    })

    // User 1's 100% progress is completely preserved without overwrite
    expect(repo.getByLessonId('les_math12_c1_b1')?.overallProgress).toBe(100)
  })

  it('4. Logged-in user does NOT adopt legacy global progress into their account', () => {
    // Legacy progress in old unnamespaced key
    localStorage.setItem(
      'study_ai.lesson_progress.v1',
      JSON.stringify({
        'les_legacy_ghost': {
          lessonId: 'les_legacy_ghost',
          overallProgress: 99,
        },
      })
    )

    // User logs in with no prior local data
    setAuthUser({
      id: 'usr_new_student',
      displayName: 'Học sinh Mới',
      role: 'learner',
      createdAt: '2026-11-01T00:00:00Z',
    })

    const repo = new LocalLearningProgressRepository()
    // Must NOT inherit the ghost legacy progress
    expect(repo.getAll()).toEqual({})
    expect(repo.getByLessonId('les_legacy_ghost')).toBeNull()

    // Legacy data is still safely preserved in localStorage (not wiped)
    expect(localStorage.getItem('study_ai.lesson_progress.v1')).toBeTruthy()
  })

  it('5. Admin and Content Manager login without any migration popup', async () => {
    const adminUser = {
      id: 'usr_admin_01',
      email: 'admin@studyai.internal',
      displayName: 'Quản trị viên Hệ thống',
      role: 'admin' as const,
      createdAt: '2026-11-01T00:00:00Z',
    }

    vi.spyOn(authService, 'login').mockResolvedValue({
      accessToken: 'admin_token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: adminUser,
    })

    render(
      <AuthProvider>
        <AuthTestConsumer />
      </AuthProvider>
    )

    screen.getByText('Login').click()

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('authenticated')
      expect(screen.getByTestId('user-id').textContent).toBe('usr_admin_01')
      expect(screen.getByTestId('migration-pending').textContent).toBe('false')
    })

    expect(screen.queryByText(/Bạn có tiến độ học tập trên thiết bị này/i)).toBeNull()
  })
})
