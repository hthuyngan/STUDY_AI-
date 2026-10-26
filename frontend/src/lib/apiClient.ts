/**
 * Lightweight, resilient HTTP client wrapper for StudyAI backend synchronization.
 */

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
}

const DEFAULT_TIMEOUT_MS = 8000

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

  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...restOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(fullUrl, {
      ...restOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
      },
    })

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
