/**
 * Central learner identity and environment configuration for StudyAI.
 */

import { getCurrentIdentity } from '@/repositories/storageKeys'

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
      return win.__STUDY_AI_API_BASE_URL__.trim().replace(/\/+$/, '')
    }
    try {
      const localOverride = localStorage.getItem('study_ai_api_base_url')
      if (localOverride) {
        return localOverride.trim().replace(/\/+$/, '')
      }
    } catch {
      // Ignore localStorage access restrictions in private browsing
    }
  }
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
  return envUrl.trim().replace(/\/+$/, '')
}

/**
 * Check if remote backend persistence is configured.
 */
export function isRemoteApiConfigured(): boolean {
  return Boolean(getApiBaseUrl())
}
