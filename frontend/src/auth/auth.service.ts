import { getApiBaseUrl, isRemoteApiConfigured } from '@/config/learner'
import { ApiError } from '@/lib/apiClient'
import type {
  AuthResponse,
  AuthUser,
  LoginCredentials,
  RegisterData,
  TokenRefreshResponse,
} from './auth.types'

async function requestAuthApi<T>(
  endpoint: string,
  method = 'POST',
  body?: unknown,
  accessToken?: string | null
): Promise<T> {
  if (!isRemoteApiConfigured()) {
    throw new ApiError(0, 'Remote API base URL is not configured')
  }

  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let errorData: unknown
    try {
      errorData = await res.json()
    } catch {
      errorData = await res.text()
    }

    const detailMsg =
      typeof errorData === 'object' && errorData !== null && 'detail' in errorData
        ? String((errorData as { detail: unknown }).detail)
        : res.statusText || 'Authentication request failed'

    throw new ApiError(res.status, detailMsg, errorData)
  }

  if (res.status === 204) {
    return null as T
  }

  return (await res.json()) as T
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    return requestAuthApi<AuthResponse>('/api/v1/auth/register', 'POST', data)
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return requestAuthApi<AuthResponse>('/api/v1/auth/login', 'POST', credentials)
  },

  async refresh(): Promise<TokenRefreshResponse> {
    return requestAuthApi<TokenRefreshResponse>('/api/v1/auth/refresh', 'POST')
  },

  async logout(): Promise<void> {
    if (!isRemoteApiConfigured()) return
    try {
      await requestAuthApi<{ message: string }>('/api/v1/auth/logout', 'POST')
    } catch {
      // Best-effort logout: ignore network failures during local clear
    }
  },

  async getMe(accessToken: string): Promise<AuthUser> {
    return requestAuthApi<AuthUser>('/api/v1/auth/me', 'GET', undefined, accessToken)
  },
}
