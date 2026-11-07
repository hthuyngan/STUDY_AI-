/**
 * Lightweight, resilient HTTP client wrapper for StudyAI backend synchronization.
 * Handles in-memory Bearer token injection, HttpOnly cookie credentials,
 * single-inflight 401 token refresh with idempotent-safe retry policy,
 * and standardized error code mapping.
 */

import { clearAuthSession, getAccessToken, setAccessToken } from '@/auth/authSession'
import { getApiBaseUrl } from '@/config/learner'

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'NETWORK_OFFLINE'
  | 'UNKNOWN_ERROR'

export function mapStatusToErrorCode(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 422) return 'VALIDATION_ERROR'
  if (status === 408) return 'TIMEOUT'
  if (status >= 500 && status <= 599) return 'SERVER_ERROR'
  if (status === 0) return 'NETWORK_OFFLINE'
  return 'UNKNOWN_ERROR'
}

const VALID_ERROR_CODES: Set<string> = new Set([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_ERROR',
  'TIMEOUT',
  'SERVER_ERROR',
  'NETWORK_OFFLINE',
  'UNKNOWN_ERROR',
])

export class ApiError extends Error {
  status: number
  code: ApiErrorCode
  data?: unknown

  constructor(status: number, message: string, codeOrData?: ApiErrorCode | unknown, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    if (typeof codeOrData === 'string' && VALID_ERROR_CODES.has(codeOrData)) {
      this.code = codeOrData as ApiErrorCode
      this.data = data
    } else {
      this.code = mapStatusToErrorCode(status)
      this.data = data !== undefined ? data : codeOrData
    }
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

/**
 * Checks whether an HTTP request is safe to automatically retry upon 401 refresh.
 * Only idempotent methods (GET, HEAD, PUT, DELETE, OPTIONS) or requests with an Idempotency-Key
 * may be retried without risking duplicate non-idempotent server-side state creation.
 */
function isRequestIdempotent(method = 'GET', headers: Headers): boolean {
  const upperMethod = method.toUpperCase()
  if (['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'].includes(upperMethod)) {
    return true
  }
  // For POST/PATCH, retry is only safe if an Idempotency-Key is explicitly attached
  return headers.has('Idempotency-Key')
}

export async function requestJson<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    throw new ApiError(0, 'Remote API base URL is not configured', 'NETWORK_OFFLINE')
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const fullUrl = `${baseUrl}${normalizedPath}`

  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers = {},
    skipAuthRefresh = false,
    method = 'GET',
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
      method,
      credentials: 'include',
      signal: controller.signal,
      headers: requestHeaders,
    })

    // Handle 401 Unauthorized with single inflight refresh + retry policy
    if (res.status === 401 && !isAuthRoute && !skipAuthRefresh) {
      if (!activeRefreshPromise) {
        activeRefreshPromise = performTokenRefresh()
      }

      const newToken = await activeRefreshPromise
      if (newToken) {
        // Enforce idempotent-only retry rule: non-idempotent POSTs without Idempotency-Key will not auto-retry
        if (isRequestIdempotent(method, requestHeaders)) {
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
        mapStatusToErrorCode(res.status),
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
      throw new ApiError(408, `Request timed out after ${timeoutMs}ms`, 'TIMEOUT')
    }
    throw new ApiError(
      0,
      err instanceof Error ? err.message : 'Network error',
      'NETWORK_OFFLINE'
    )
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
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    requestJson<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, options?: RequestOptions) =>
    requestJson<T>(path, { ...options, method: 'DELETE' }),
  request: requestJson,
}
