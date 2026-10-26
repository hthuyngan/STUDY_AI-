/**
 * Central learner identity and environment configuration for StudyAI.
 */

const DEFAULT_LEARNER_ID = 'stu-001'

/**
 * Get current learner ID.
 * Centralized abstraction so future authentication phases can dynamically resolve user identity.
 */
export function getCurrentLearnerId(): string {
  return DEFAULT_LEARNER_ID
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
