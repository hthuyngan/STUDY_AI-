import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { isRemoteApiConfigured } from '@/config/learner'
import {
  learningProgressRepository,
  assessmentAttemptRepository,
} from '@/repositories'
import { notifyLearningStateChanged } from '@/services/learningStateEvents'
import { authService } from './auth.service'
import type {
  AuthContextValue,
  AuthState,
  AuthUser,
  LoginCredentials,
  RegisterData,
} from './auth.types'
import { AuthContext } from './AuthContext'
import {
  clearAuthSession,
  setAccessToken,
  setAuthUser,
} from './authSession'

export interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>('initializing')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check initial session via rotating refresh cookie on app startup
  useEffect(() => {
    let isMounted = true

    async function checkSession() {
      // If remote backend API is not configured (e.g. GitHub Pages), enter guest mode immediately
      if (!isRemoteApiConfigured()) {
        if (isMounted) {
          clearAuthSession()
          setUser(null)
          setState('guest')
        }
        return
      }

      try {
        const response = await authService.refresh()
        if (!isMounted) return

        if (response?.accessToken && response.user) {
          setAccessToken(response.accessToken)
          setAuthUser(response.user)
          setUser(response.user)
          setState('authenticated')

          // Fetch user's actual learning progress from SQL Server
          await learningProgressRepository.fetchRemoteAll().catch(() => {})
          await assessmentAttemptRepository.fetchRemoteAll().catch(() => {})
          notifyLearningStateChanged()
        } else {
          clearAuthSession()
          setUser(null)
          setState('guest')
        }
      } catch {
        if (isMounted) {
          clearAuthSession()
          setUser(null)
          setState('guest')
        }
      }
    }

    void checkSession()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthUser> => {
      setError(null)
      try {
        const response = await authService.login(credentials)
        setAccessToken(response.accessToken)
        setAuthUser(response.user)
        setUser(response.user)
        setState('authenticated')

        // Fetch user's actual learning progress from SQL Server upon login
        await learningProgressRepository.fetchRemoteAll().catch(() => {})
        await assessmentAttemptRepository.fetchRemoteAll().catch(() => {})
        notifyLearningStateChanged()

        return response.user
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại.'
        setError(msg)
        throw err
      }
    },
    []
  )

  const register = useCallback(
    async (data: RegisterData): Promise<AuthUser> => {
      setError(null)
      try {
        const response = await authService.register(data)
        setAccessToken(response.accessToken)
        setAuthUser(response.user)
        setUser(response.user)
        setState('authenticated')

        // Fresh user: fetch remote progress and notify state
        await learningProgressRepository.fetchRemoteAll().catch(() => {})
        notifyLearningStateChanged()

        return response.user
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Tạo tài khoản thất bại.'
        setError(msg)
        throw err
      }
    },
    []
  )

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout()
    } finally {
      clearAuthSession()
      setUser(null)
      setState('guest')
      notifyLearningStateChanged()
    }
  }, [])

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!isRemoteApiConfigured()) return false
    try {
      const response = await authService.refresh()
      if (response?.accessToken && response.user) {
        setAccessToken(response.accessToken)
        setAuthUser(response.user)
        setUser(response.user)
        setState('authenticated')
        await learningProgressRepository.fetchRemoteAll().catch(() => {})
        await assessmentAttemptRepository.fetchRemoteAll().catch(() => {})
        notifyLearningStateChanged()
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  // Backward-compatible no-ops: Migration popup is permanently disabled
  const confirmMigration = useCallback(async (): Promise<void> => {}, [])
  const declineMigration = useCallback((): void => {}, [])

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      state,
      error,
      isAuthenticated: state === 'authenticated' && user !== null,
      isGuest: state === 'guest' || user === null,
      login,
      register,
      logout,
      refreshSession,
      migrationPending: false,
      confirmMigration,
      declineMigration,
    }),
    [
      user,
      state,
      error,
      login,
      register,
      logout,
      refreshSession,
      confirmMigration,
      declineMigration,
    ]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
