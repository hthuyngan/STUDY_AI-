import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  clearStaleApiBaseOverride,
  getApiBaseUrl,
  sanitizeApiUrl,
  STALE_API_BASE_STORAGE_KEY,
} from './learner'

describe('learner API base URL config & stale localStorage override guard', () => {
  beforeEach(() => {
    localStorage.clear()
    delete (window as unknown as { __STUDY_AI_API_BASE_URL__?: string }).__STUDY_AI_API_BASE_URL__
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    localStorage.clear()
    delete (window as unknown as { __STUDY_AI_API_BASE_URL__?: string }).__STUDY_AI_API_BASE_URL__
    vi.unstubAllEnvs()
  })

  it('ignores and removes stale localStorage study_ai_api_base_url overrides', () => {
    localStorage.setItem(STALE_API_BASE_STORAGE_KEY, 'http://localhost:59999/api/v1')
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/api/v1')

    const resolved = getApiBaseUrl()

    expect(resolved).toBe('http://localhost:8000')
    expect(localStorage.getItem(STALE_API_BASE_STORAGE_KEY)).toBeNull()
  })

  it('delegates to Vite proxy (empty string) when VITE_API_BASE_URL is empty even if stale localStorage exists', () => {
    localStorage.setItem(STALE_API_BASE_STORAGE_KEY, 'http://127.0.0.1:5299')
    vi.stubEnv('VITE_API_BASE_URL', '')

    expect(getApiBaseUrl()).toBe('')
    expect(localStorage.getItem(STALE_API_BASE_STORAGE_KEY)).toBeNull()
  })

  it('prefers explicit per-window runtime URL over VITE_API_BASE_URL and cleans stale localStorage', () => {
    localStorage.setItem(STALE_API_BASE_STORAGE_KEY, 'http://localhost:5111')
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/api/v1')
    ;(window as unknown as { __STUDY_AI_API_BASE_URL__?: string }).__STUDY_AI_API_BASE_URL__ =
      'http://127.0.0.1:5298/api/v1/'

    expect(getApiBaseUrl()).toBe('http://127.0.0.1:5298')
    expect(localStorage.getItem(STALE_API_BASE_STORAGE_KEY)).toBeNull()
  })

  it('clearStaleApiBaseOverride returns removed stale value or null', () => {
    expect(clearStaleApiBaseOverride()).toBeNull()
    localStorage.setItem(STALE_API_BASE_STORAGE_KEY, 'http://localhost:9999')
    expect(clearStaleApiBaseOverride()).toBe('http://localhost:9999')
    expect(localStorage.getItem(STALE_API_BASE_STORAGE_KEY)).toBeNull()
  })

  it('sanitizeApiUrl strips trailing /api and /api/v1 suffixes', () => {
    expect(sanitizeApiUrl('http://localhost:8000/api/v1/')).toBe('http://localhost:8000')
    expect(sanitizeApiUrl('http://localhost:8000/api/')).toBe('http://localhost:8000')
  })
})
