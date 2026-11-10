import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiError, apiClient, mapStatusToErrorCode, requestJson } from './apiClient'
import * as authSession from '@/auth/authSession'
import * as learnerConfig from '@/config/learner'

describe('apiClient & HTTP Error Handling Suite', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.spyOn(learnerConfig, 'getApiBaseUrl').mockReturnValue('http://localhost:8000')
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue(null)
    vi.spyOn(authSession, 'setAccessToken').mockImplementation(() => {})
    vi.spyOn(authSession, 'clearAuthSession').mockImplementation(() => {})
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('1. mapStatusToErrorCode ánh xạ chính xác HTTP status sang ApiErrorCode', () => {
    expect(mapStatusToErrorCode(401)).toBe('UNAUTHORIZED')
    expect(mapStatusToErrorCode(403)).toBe('FORBIDDEN')
    expect(mapStatusToErrorCode(404)).toBe('NOT_FOUND')
    expect(mapStatusToErrorCode(409)).toBe('CONFLICT')
    expect(mapStatusToErrorCode(422)).toBe('VALIDATION_ERROR')
    expect(mapStatusToErrorCode(408)).toBe('TIMEOUT')
    expect(mapStatusToErrorCode(500)).toBe('SERVER_ERROR')
    expect(mapStatusToErrorCode(503)).toBe('SERVER_ERROR')
    expect(mapStatusToErrorCode(0)).toBe('NETWORK_OFFLINE')
    expect(mapStatusToErrorCode(999)).toBe('UNKNOWN_ERROR')
  })

  it('2. Ném ApiError với code SERVER_ERROR khi backend trả 500', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: vi.fn().mockResolvedValue({ detail: 'Database error' }),
    } as unknown as Response)

    try {
      await apiClient.get('/api/v1/test')
      expect.unreachable('Should have thrown an ApiError')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(500)
      expect(apiErr.code).toBe('SERVER_ERROR')
      expect(apiErr.data).toEqual({ detail: 'Database error' })
    }
  })

  it('3. Ném ApiError với code NOT_FOUND khi endpoint không tồn tại (404)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: vi.fn().mockResolvedValue({ detail: 'Resource not found' }),
    } as unknown as Response)

    try {
      await apiClient.get('/api/v1/unknown')
      expect.unreachable('Should have thrown an ApiError')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(404)
      expect(apiErr.code).toBe('NOT_FOUND')
    }
  })

  it('4. Không tự động retry POST 401 khi không có Idempotency-Key (chống trùng lặp transaction)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: vi.fn().mockResolvedValue({ detail: 'Token expired' }),
    } as unknown as Response)

    globalThis.fetch = fetchMock

    try {
      await apiClient.post('/api/v1/attempts', { score: 10 })
      expect.unreachable('Should fail on 401 without retrying POST')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(401)
      expect(apiErr.code).toBe('UNAUTHORIZED')
      // Original non-idempotent POST is only called once (never retried)
      const attemptCalls = fetchMock.mock.calls.filter((call) =>
        String(call[0]).includes('/attempts')
      )
      expect(attemptCalls.length).toBe(1)
    }
  })

  it('5. Cho phép retry 401 khi request là GET và refresh token thành công', async () => {
    let callCount = 0
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++
      if (url.includes('/auth/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ accessToken: 'new-valid-token' }),
        })
      }
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({ detail: 'Expired' }),
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: 'secure data' }),
      })
    })

    const result = await apiClient.get<{ success: boolean; data: string }>('/api/v1/protected-data')
    expect(result.success).toBe(true)
    expect(result.data).toBe('secure data')
    expect(callCount).toBe(3) // 1st initial GET (401), 2nd refresh POST (200), 3rd retried GET (200)
  })

  it('6. Chuyển đổi timeout thành ApiError với mã 408 TIMEOUT', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const err = new DOMException('The user aborted a request.', 'AbortError')
      return Promise.reject(err)
    })

    try {
      await requestJson('/api/v1/slow', { timeoutMs: 50 })
      expect.unreachable('Should have timed out')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(408)
      expect(apiErr.code).toBe('TIMEOUT')
    }
  })

  it('7. postFormData gửi FormData và không ép header Content-Type thành application/json', async () => {
    let capturedHeaders: Headers | undefined
    let capturedBody: unknown
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedHeaders = init?.headers as Headers
      capturedBody = init?.body
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ uploaded: true }),
      })
    })

    const fd = new FormData()
    fd.append('testKey', 'testValue')
    const res = await apiClient.postFormData<{ uploaded: boolean }>('/api/v1/upload', fd)

    expect(res.uploaded).toBe(true)
    expect(capturedBody).toBe(fd)
    expect(capturedHeaders?.get('Content-Type')).toBeNull()
  })
})
