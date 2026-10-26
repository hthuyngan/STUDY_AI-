/**
 * Lightweight resilient sync queue for offline changes and asynchronous remote dispatch.
 */

import { getCurrentLearnerId, isRemoteApiConfigured } from '@/config/learner'
import { apiClient } from '@/lib/apiClient'
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
  return isRemoteApiConfigured() ? 'hybrid' : 'local'
}

export function getSyncQueue(): SyncQueueItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSyncQueue(queue: SyncQueueItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue))
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

export function getSyncStatus(): SyncStatus {
  const queue = getSyncQueue()
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

  let state: SyncState = currentSyncState
  if (!isOnline) {
    state = 'offline'
  } else if (queue.length === 0 && state !== 'error') {
    state = 'synced'
  }

  return {
    state,
    mode: getPersistenceMode(),
    pendingCount: queue.length,
    lastSyncedAt,
    lastError,
  }
}

/**
 * Flush pending items in sync queue to backend.
 */
export async function flushSyncQueue(): Promise<void> {
  if (!isRemoteApiConfigured()) {
    currentSyncState = 'idle'
    return
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    currentSyncState = 'offline'
    notifySyncStatus()
    return
  }

  if (isProcessing) return
  isProcessing = true
  currentSyncState = 'syncing'
  notifySyncStatus()

  const userId = getCurrentLearnerId()
  const queue = getSyncQueue()

  try {
    for (const item of queue) {
      if (item.retryCount >= MAX_QUEUE_RETRIES) {
        continue
      }

      try {
        if (item.type === 'progress-upsert') {
          await apiClient.put(
            `/users/${userId}/lesson-progress/${item.entityId}`,
            item.payload
          )
        } else if (item.type === 'attempt-upsert') {
          await apiClient.put(
            `/users/${userId}/assessment-attempts/${item.entityId}`,
            item.payload
          )
        } else if (item.type === 'event-batch') {
          await apiClient.post(
            `/users/${userId}/learning-events/batch`,
            item.payload
          )
        }

        // Successfully synced
        removeSyncItem(item.id)
      } catch (itemErr: unknown) {
        item.retryCount += 1
        lastError =
          itemErr instanceof Error ? itemErr.message : 'Item sync failed'
        saveSyncQueue(queue)
      }
    }

    lastSyncedAt = new Date().toISOString()
    currentSyncState = getSyncQueue().length === 0 ? 'synced' : 'error'
  } catch (err: unknown) {
    currentSyncState = 'error'
    lastError = err instanceof Error ? err.message : 'Sync flush failed'
  } finally {
    isProcessing = false
    notifySyncStatus()
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
  getStatus = getSyncStatus
  getPendingCount = () => getSyncQueue().length
  getItems = getSyncQueue
}

export const syncQueue = new SyncQueue()
