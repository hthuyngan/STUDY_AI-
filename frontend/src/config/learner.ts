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
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
  return envUrl.trim().replace(/\/+$/, '')
}

/**
 * Check if remote backend persistence is configured.
 */
export function isRemoteApiConfigured(): boolean {
  return Boolean(getApiBaseUrl())
}
