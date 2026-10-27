import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { isRemoteApiConfigured } from '@/config/learner'
import {
  performAuthenticatedBootstrapSync,
} from '@/repositories/bootstrapSync'
import {
  getGuestLearningDataBundle,
  getStorageKey,
  hasGuestLearningData,
} from '@/repositories/storageKeys'
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
  getAuthUser,
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
  const [migrationPending, setMigrationPending] = useState<boolean>(false)

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

  const checkAndPromptMigration = useCallback((authenticatedUser: AuthUser) => {
    if (typeof window === 'undefined') return
    const decisionKey = getStorageKey('guest_migration_decision', authenticatedUser.id)
    const existingDecision = localStorage.getItem(decisionKey)

    if (!existingDecision && hasGuestLearningData()) {
      setMigrationPending(true)
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
        notifyLearningStateChanged()

        checkAndPromptMigration(response.user)
        return response.user
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại.'
        setError(msg)
        throw err
      }
    },
    [checkAndPromptMigration]
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
        notifyLearningStateChanged()

        checkAndPromptMigration(response.user)
        return response.user
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Tạo tài khoản thất bại.'
        setError(msg)
        throw err
      }
    },
    [checkAndPromptMigration]
  )

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout()
    } finally {
      clearAuthSession()
      setUser(null)
      setState('guest')
      setMigrationPending(false)
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
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const confirmMigration = useCallback(async (): Promise<void> => {
    const currentUser = getAuthUser()
    if (!currentUser) {
      setMigrationPending(false)
      return
    }

    try {
      const bundle = getGuestLearningDataBundle()
      await performAuthenticatedBootstrapSync(bundle)
      const decisionKey = getStorageKey('guest_migration_decision', currentUser.id)
      localStorage.setItem(decisionKey, 'migrated')
      notifyLearningStateChanged()
    } catch (err) {
      console.error('Failed to migrate guest progress to account', err)
    } finally {
      setMigrationPending(false)
    }
  }, [])

  const declineMigration = useCallback((): void => {
    const currentUser = getAuthUser()
    if (currentUser) {
      const decisionKey = getStorageKey('guest_migration_decision', currentUser.id)
      localStorage.setItem(decisionKey, 'declined')
      notifyLearningStateChanged()
    }
    setMigrationPending(false)
  }, [])

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
      migrationPending,
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
      migrationPending,
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

