/**
 * Types for StudyAI remote/local persistence, offline sync queue, and sync status.
 */

export type PersistenceMode = 'local' | 'remote' | 'hybrid'

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

export type SyncOperationType =
  | 'progress-upsert'
  | 'attempt-upsert'
  | 'event-batch'

export interface SyncQueueItem {
  id: string
  type: SyncOperationType
  entityId: string
  createdAt: string // ISO 8601
  retryCount: number
  payload: Record<string, unknown>
}

export interface SyncStatus {
  state: SyncState
  mode: PersistenceMode
  pendingCount: number
  lastSyncedAt?: string
  lastError?: string
}

export interface BootstrapSyncResponse {
  status: string
  progressSynced: number
  attemptsSynced: number
  eventsSynced: number
  message?: string
}
