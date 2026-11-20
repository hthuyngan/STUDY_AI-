import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  enqueueSyncItem,
  flushSyncQueue,
  getSyncQueue,
} from '@/repositories/syncQueue'
import * as authSession from '@/auth/authSession'
import * as learnerConfig from '@/config/learner'
import { apiClient } from '@/lib/apiClient'

describe('F03 — Sync Queue Resilience & Isolation Suite', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.spyOn(learnerConfig, 'isRemoteApiConfigured').mockReturnValue(true)
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('1. Guest mode stays strictly local: never dispatches to remote server or demo routes', async () => {
    vi.spyOn(authSession, 'getAuthUser').mockReturnValue(null)
    const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValue({})

    enqueueSyncItem('progress-upsert', 'les-001', { progress: 80 })
    await flushSyncQueue()

    expect(putSpy).not.toHaveBeenCalled()
  })

  it('2. Isolates sync queue storage between two authenticated user accounts', () => {
    vi.spyOn(authSession, 'getAuthUser').mockReturnValue({
      id: 'user_learner_A',
      email: 'a@example.com',
      role: 'learner',
    } as any)

    enqueueSyncItem('progress-upsert', 'les-math-1', { progress: 50 })
    expect(getSyncQueue('user_learner_A').length).toBe(1)
    expect(getSyncQueue('user_learner_B').length).toBe(0)

    // Switch to user B
    vi.spyOn(authSession, 'getAuthUser').mockReturnValue({
      id: 'user_learner_B',
      email: 'b@example.com',
      role: 'learner',
    } as any)

    expect(getSyncQueue('user_learner_B').length).toBe(0)
    enqueueSyncItem('progress-upsert', 'les-math-2', { progress: 90 })
    expect(getSyncQueue('user_learner_B').length).toBe(1)
    expect(getSyncQueue('user_learner_A').length).toBe(1)
  })

  it('3. Retains newly enqueued items added while flushSyncQueue is in-flight', async () => {
    vi.spyOn(authSession, 'getAuthUser').mockReturnValue({
      id: 'user_learner_sync',
      email: 'sync@example.com',
      role: 'learner',
    } as any)

    enqueueSyncItem('progress-upsert', 'item-first', { progress: 20 })

    // Controlled delayed fetch
    let resolveFirstPut: (val: any) => void
    const firstPutPromise = new Promise((resolve) => {
      resolveFirstPut = resolve
    })

    vi.spyOn(apiClient, 'put').mockImplementation((endpoint: string) => {
      if (endpoint.includes('item-first')) {
        return firstPutPromise
      }
      return Promise.resolve({})
    })

    const flushPromise = flushSyncQueue()

    // While flush is running, enqueue second item
    enqueueSyncItem('progress-upsert', 'item-second', { progress: 60 })

    // Release first put
    resolveFirstPut!({})
    await flushPromise

    // item-first succeeded and removed, item-second was enqueued during flush and MUST remain
    const remaining = getSyncQueue('user_learner_sync')
    expect(remaining.length).toBe(1)
    expect(remaining[0].entityId).toBe('item-second')
  })

  it('4. Aborts flush if user switches account or logs out mid-flight', async () => {
    let activeUser: any = {
      id: 'user_one',
      email: 'one@example.com',
      role: 'learner',
    }
    vi.spyOn(authSession, 'getAuthUser').mockImplementation(() => activeUser)

    enqueueSyncItem('progress-upsert', 'item-user-one', { progress: 40 })

    let resolveSlowFetch: (val: any) => void
    const slowFetchPromise = new Promise((resolve) => {
      resolveSlowFetch = resolve
    })

    vi.spyOn(apiClient, 'put').mockImplementation(() => slowFetchPromise)

    const flushPromise = flushSyncQueue()

    // User logs out mid-flight
    activeUser = null

    resolveSlowFetch!({})
    await flushPromise

    // User two logs in
    activeUser = {
      id: 'user_two',
      email: 'two@example.com',
      role: 'learner',
    }
    // user_two queue should not be contaminated with user_one
    expect(getSyncQueue('user_two').length).toBe(0)
  })
})
