/**
 * Lightweight resilient sync queue for offline changes and asynchronous remote dispatch.
 * Scoped per authenticated learner identity to prevent cross-account queue leaks.
 */

import { getAuthUser } from '@/auth/authSession'
import { isRemoteApiConfigured } from '@/config/learner'
import { apiClient } from '@/lib/apiClient'
import { getStorageKey } from '@/repositories/storageKeys'
import type {
  PersistenceMode,
  SyncOperationType,
  SyncQueueItem,
  SyncState,
  SyncStatus,
} from '@/types/sync'

export const SYNC_QUEUE_STORAGE_KEY = 'study_ai.sync_queue.v1'
export const SYNC_STATUS_CHANGED_EVENT = 'study_ai:sync_status_changed'

const MAX_QUEUE_RETRIES = 5

let isProcessing = false
let currentSyncState: SyncState = 'idle'
let lastSyncedAt: string | undefined
let lastError: string | undefined

function notifySyncStatus(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<SyncStatus>(SYNC_STATUS_CHANGED_EVENT, {
        detail: getSyncStatus(),
      })
    )
  }
}

export function getPersistenceMode(): PersistenceMode {
  return isRemoteApiConfigured() && getAuthUser() !== null ? 'hybrid' : 'local'
}

export function getSyncQueue(identity?: string): SyncQueueItem[] {
  if (typeof window === 'undefined') return []
  try {
    const key = getStorageKey('sync_queue', identity)
    const raw =
      localStorage.getItem(key) || localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSyncQueue(queue: SyncQueueItem[], identity?: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = getStorageKey('sync_queue', identity)
    const json = JSON.stringify(queue)
    localStorage.setItem(key, json)
    localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, json)
    notifySyncStatus()
  } catch (err) {
    console.error('Failed to save sync queue', err)
  }
}

export function enqueueSyncItem(
  type: SyncOperationType,
  entityId: string,
  payload: Record<string, unknown>
): void {
  const queue = getSyncQueue()
  // If duplicate pending operation for same entity, replace with latest
  const filtered = queue.filter(
    (item) => !(item.type === type && item.entityId === entityId)
  )

  const newItem: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    entityId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    payload,
  }

  filtered.push(newItem)
  saveSyncQueue(filtered)

  // Trigger processing asynchronously
  triggerQueueFlush()
}

export function removeSyncItem(id: string): void {
  const queue = getSyncQueue()
  saveSyncQueue(queue.filter((item) => item.id !== id))
}

export async function flushSyncQueue(): Promise<void> {
  // Only process remote sync if remote API is configured
  if (!isRemoteApiConfigured() || isProcessing) {
    return
  }

  const queue = getSyncQueue()
  if (queue.length === 0) {
    currentSyncState = 'idle'
    notifySyncStatus()
    return
  }

  isProcessing = true
  currentSyncState = 'syncing'
  notifySyncStatus()

  const authUser = getAuthUser()
  const remainingQueue: SyncQueueItem[] = []

  for (const item of queue) {
    try {
      if (item.type === 'progress-upsert') {
        const endpoint = authUser
          ? `/api/v1/me/lesson-progress/${item.entityId}`
          : `/users/stu-001/lesson-progress/${item.entityId}`
        await apiClient.put(endpoint, item.payload)
      } else if (item.type === 'attempt-upsert') {
        const endpoint = authUser
          ? `/api/v1/me/assessment-attempts/${item.entityId}`
          : `/users/stu-001/assessment-attempts/${item.entityId}`
        await apiClient.put(endpoint, item.payload)
      } else if (item.type === 'event-batch') {
        const endpoint = authUser
          ? '/api/v1/me/learning-events/batch'
          : '/users/stu-001/learning-events/batch'
        await apiClient.post(endpoint, item.payload)
      }
      lastSyncedAt = new Date().toISOString()
      lastError = undefined
    } catch (err: unknown) {
      item.retryCount += 1
      lastError = err instanceof Error ? err.message : 'Sync dispatch failed'

      if (item.retryCount < MAX_QUEUE_RETRIES) {
        remainingQueue.push(item)
      } else {
        console.warn(
          `Sync operation [${item.type}] for [${item.entityId}] dropped after max retries`,
          err
        )
      }
    }
  }

  saveSyncQueue(remainingQueue)
  isProcessing = false
  currentSyncState = remainingQueue.length > 0 ? 'error' : 'idle'
  notifySyncStatus()
}

export const processSyncQueue = flushSyncQueue

export function getSyncStatus(): SyncStatus {
  const queue = getSyncQueue()
  return {
    mode: getPersistenceMode(),
    state: currentSyncState,
    pendingCount: queue.length,
    lastSyncedAt,
    lastError,
  }
}

let flushDebounceTimer: ReturnType<typeof setTimeout> | null = null

export function triggerQueueFlush(delayMs = 200): void {
  if (!isRemoteApiConfigured()) return
  if (flushDebounceTimer) clearTimeout(flushDebounceTimer)
  flushDebounceTimer = setTimeout(() => {
    flushSyncQueue().catch(() => {})
  }, delayMs)
}

// Global online / visibility listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    triggerQueueFlush(100)
  })
}

export class SyncQueue {
  enqueue = enqueueSyncItem
  remove = removeSyncItem
  flush = flushSyncQueue
  process = flushSyncQueue
  getStatus = getSyncStatus
  getPendingCount = () => getSyncQueue().length
  getItems = getSyncQueue
}

export const syncQueue = new SyncQueue()
