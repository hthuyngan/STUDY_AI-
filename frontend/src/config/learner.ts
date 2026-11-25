/**
 * Central learner identity and environment configuration for StudyAI.
 */

import { getCurrentIdentity } from '@/repositories/storageKeys'

/**
 * Sanitizes base API URL by trimming slashes and removing redundant /api/v1 suffixes
 * to prevent double path segments (e.g. http://localhost:5000/api/v1/api/v1/...).
 */
export function sanitizeApiUrl(rawUrl: string): string {
  let url = rawUrl.trim().replace(/\/+$/, '')
  if (url.endsWith('/api/v1')) {
    url = url.slice(0, -7)
  } else if (url.endsWith('/api')) {
    url = url.slice(0, -4)
  }
  return url.replace(/\/+$/, '')
}

/**
 * Get current learner ID.
 * Returns authenticated user ID when logged in, or stable semantic guest identity when in guest mode.
 */
export function getCurrentLearnerId(): string {
  return getCurrentIdentity()
}

export const STALE_API_BASE_STORAGE_KEY = 'study_ai_api_base_url'

/**
 * Removes any stale localStorage API base URL override so old E2E/local sessions
 * cannot hijack requests away from VITE_API_BASE_URL or the local Vite proxy.
 */
export function clearStaleApiBaseOverride(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const stale = localStorage.getItem(STALE_API_BASE_STORAGE_KEY)
    if (stale) {
      localStorage.removeItem(STALE_API_BASE_STORAGE_KEY)
      return stale
    }
  } catch {
    // Ignore localStorage access restrictions in private browsing
  }
  return null
}

/**
 * Get configured remote API base URL, stripped of trailing slashes.
 * Precedence:
 *   1. Explicit per-window runtime override (`window.__STUDY_AI_API_BASE_URL__`, non-persistent)
 *   2. Compile-time/environment configuration (`import.meta.env.VITE_API_BASE_URL`)
 *   3. Empty string (delegates to Vite `/api` proxy in local dev/preview)
 * Stale `localStorage` overrides (`study_ai_api_base_url`) are cleared and never used.
 */
export function getApiBaseUrl(): string {
  clearStaleApiBaseOverride()

  if (typeof window !== 'undefined') {
    const win = window as unknown as { __STUDY_AI_API_BASE_URL__?: string }
    if (win.__STUDY_AI_API_BASE_URL__) {
      return sanitizeApiUrl(win.__STUDY_AI_API_BASE_URL__)
    }
  }
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
  if (envUrl) {
    return sanitizeApiUrl(envUrl)
  }

  // When running locally under Vite dev or preview, empty string delegates to the Vite /api proxy
  return ''
}

/**
 * Check if remote backend persistence is configured.
 */
export function isRemoteApiConfigured(): boolean {
  if (getApiBaseUrl()) {
    return true
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return true
    }
  }
  return false
}
