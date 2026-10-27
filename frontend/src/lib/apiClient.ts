/**
 * Lightweight, resilient HTTP client wrapper for StudyAI backend synchronization.
 * Handles in-memory Bearer token injection, HttpOnly cookie credentials, and single-inflight 401 token refresh.
 */

import { clearAuthSession, getAccessToken, setAccessToken } from '@/auth/authSession'
import { getApiBaseUrl } from '@/config/learner'

export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number
  skipAuthRefresh?: boolean
}

const DEFAULT_TIMEOUT_MS = 8000

// Single inflight refresh promise to avoid multiple simultaneous refresh requests
let activeRefreshPromise: Promise<string | null> | null = null

async function performTokenRefresh(): Promise<string | null> {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) return null

  try {
    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
    })

    if (!res.ok) {
      clearAuthSession()
      return null
    }

    const data = (await res.json()) as { accessToken: string }
    if (data?.accessToken) {
      setAccessToken(data.accessToken)
      return data.accessToken
    }
    clearAuthSession()
    return null
  } catch {
    clearAuthSession()
    return null
  } finally {
    activeRefreshPromise = null
  }
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    throw new ApiError(0, 'Remote API base URL is not configured')
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const fullUrl = `${baseUrl}${normalizedPath}`

  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers = {},
    skipAuthRefresh = false,
    ...restOptions
  } = options

  const isAuthRoute =
    normalizedPath.includes('/auth/login') ||
    normalizedPath.includes('/auth/register') ||
    normalizedPath.includes('/auth/refresh')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const requestHeaders = new Headers(headers as HeadersInit)
  if (!requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json')
  }

  // Attach in-memory access token if present
  const memoryToken = getAccessToken()
  if (memoryToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${memoryToken}`)
  }

  try {
    const res = await fetch(fullUrl, {
      ...restOptions,
      credentials: 'include',
      signal: controller.signal,
      headers: requestHeaders,
    })

    // Handle 401 Unauthorized with single inflight refresh + single retry
    if (res.status === 401 && !isAuthRoute && !skipAuthRefresh) {
      if (!activeRefreshPromise) {
        activeRefreshPromise = performTokenRefresh()
      }

      const newToken = await activeRefreshPromise
      if (newToken) {
        // Retry the original request ONCE with new access token
        return requestJson<T>(path, {
          ...options,
          skipAuthRefresh: true,
          headers: {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          },
        })
      }
    }

    if (!res.ok) {
      let errorBody: unknown
      try {
        errorBody = await res.json()
      } catch {
        errorBody = await res.text()
      }
      throw new ApiError(
        res.status,
        `HTTP ${res.status}: ${res.statusText || 'Request failed'}`,
        errorBody
      )
    }

    if (res.status === 204) {
      return null as T
    }

    return (await res.json()) as T
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(408, `Request timed out after ${timeoutMs}ms`)
    }
    throw new ApiError(0, err instanceof Error ? err.message : 'Network error')
  } finally {
    clearTimeout(timeoutId)
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    requestJson<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    requestJson<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    requestJson<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, options?: RequestOptions) =>
    requestJson<T>(path, { ...options, method: 'DELETE' }),
  request: requestJson,
}
