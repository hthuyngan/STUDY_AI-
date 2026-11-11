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

/**
 * Get configured remote API base URL, stripped of trailing slashes.
 * Supports compile-time VITE_API_BASE_URL, window runtime global, or localStorage override.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const win = window as unknown as { __STUDY_AI_API_BASE_URL__?: string }
    if (win.__STUDY_AI_API_BASE_URL__) {
      return sanitizeApiUrl(win.__STUDY_AI_API_BASE_URL__)
    }
    try {
      const localOverride = localStorage.getItem('study_ai_api_base_url')
      if (localOverride) {
        return sanitizeApiUrl(localOverride)
      }
    } catch {
      // Ignore localStorage access restrictions in private browsing
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
