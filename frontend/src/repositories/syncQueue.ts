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
    const targetId = identity || getAuthUser()?.id
    const key = getStorageKey('sync_queue', targetId)
    const raw = targetId
      ? localStorage.getItem(key)
      : localStorage.getItem(key) || localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSyncQueue(queue: SyncQueueItem[], identity?: string): void {
  if (typeof window === 'undefined') return
  try {
    const targetId = identity || getAuthUser()?.id
    const key = getStorageKey('sync_queue', targetId)
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
  const currentUserId = getAuthUser()?.id
  const queue = getSyncQueue(currentUserId)
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
  saveSyncQueue(filtered, currentUserId)

  // Trigger processing asynchronously
  triggerQueueFlush()
}

export function removeSyncItem(id: string): void {
  const currentUserId = getAuthUser()?.id
  const queue = getSyncQueue(currentUserId)
  saveSyncQueue(queue.filter((item) => item.id !== id), currentUserId)
}

export async function flushSyncQueue(): Promise<void> {
  // Only process remote sync if remote API is configured
  if (!isRemoteApiConfigured() || isProcessing) {
    return
  }

  const authUser = getAuthUser()
  // Guest mode stays local only; do not dispatch guest data to fake/demo server paths
  if (!authUser) {
    currentSyncState = 'idle'
    notifySyncStatus()
    return
  }

  const currentUserId = authUser.id
  const queue = getSyncQueue(currentUserId)
  if (queue.length === 0) {
    currentSyncState = 'idle'
    notifySyncStatus()
    return
  }

  isProcessing = true
  currentSyncState = 'syncing'
  notifySyncStatus()

  const succeededItemIds = new Set<string>()

  for (const item of queue) {
    // If user changed identity mid-flush, abort immediately to prevent cross-account writes
    if (getAuthUser()?.id !== currentUserId) {
      isProcessing = false
      return
    }

    try {
      if (item.type === 'progress-upsert') {
        await apiClient.put(`/api/v1/me/lesson-progress/${item.entityId}`, item.payload)
      } else if (item.type === 'attempt-upsert') {
        await apiClient.put(`/api/v1/me/assessment-attempts/${item.entityId}`, item.payload)
      } else if (item.type === 'event-batch') {
        await apiClient.post('/api/v1/me/learning-events/batch', item.payload)
      }
      succeededItemIds.add(item.id)
      lastSyncedAt = new Date().toISOString()
      lastError = undefined
    } catch (err: unknown) {
      item.retryCount += 1
      lastError = err instanceof Error ? err.message : 'Sync dispatch failed'

      if (item.retryCount >= MAX_QUEUE_RETRIES) {
        console.warn(
          `Sync operation [${item.type}] for [${item.entityId}] dropped after max retries`,
          err
        )
      }
    }
  }

  // Abort if identity switched during network calls
  if (getAuthUser()?.id !== currentUserId) {
    isProcessing = false
    return
  }

  // Preserve any items enqueued while flush was running; only remove succeeded ones
  const latestQueue = getSyncQueue(currentUserId)
  const updatedQueue = latestQueue
    .filter((item) => !succeededItemIds.has(item.id))
    .map((item) => {
      const processed = queue.find((q) => q.id === item.id)
      return processed ? { ...item, retryCount: processed.retryCount } : item
    })
    .filter((item) => item.retryCount < MAX_QUEUE_RETRIES)

  saveSyncQueue(updatedQueue, currentUserId)
  isProcessing = false
  currentSyncState = updatedQueue.length > 0 ? 'error' : 'idle'
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
