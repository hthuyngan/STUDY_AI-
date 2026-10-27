/**
 * In-memory storage for short-lived access token and authenticated learner identity.
 * CRITICAL SECURITY RULE: NEVER write access tokens to localStorage, sessionStorage, or IndexedDB.
 */

import type { AuthUser } from './auth.types'

let inMemoryAccessToken: string | null = null
let inMemoryUser: AuthUser | null = null

export function getAccessToken(): string | null {
  return inMemoryAccessToken
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token
}

export function getAuthUser(): AuthUser | null {
  return inMemoryUser
}

export function setAuthUser(user: AuthUser | null): void {
  inMemoryUser = user
}

export function clearAuthSession(): void {
  inMemoryAccessToken = null
  inMemoryUser = null
}
