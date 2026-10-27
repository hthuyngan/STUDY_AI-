export type UserRole = 'learner' | 'teacher' | 'content' | 'support' | 'admin'

export interface AuthUser {
  id: string
  email?: string
  displayName: string
  grade?: string
  role: UserRole
  createdAt: string
}

export type AuthState = 'initializing' | 'guest' | 'authenticated' | 'error'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  displayName: string
  grade?: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: AuthUser
}

export interface TokenRefreshResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user?: AuthUser
}

export interface AuthContextValue {
  user: AuthUser | null
  state: AuthState
  error: string | null
  isAuthenticated: boolean
  isGuest: boolean
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  register: (data: RegisterData) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshSession: () => Promise<boolean>
  migrationPending: boolean
  confirmMigration: () => Promise<void>
  declineMigration: () => void
}
