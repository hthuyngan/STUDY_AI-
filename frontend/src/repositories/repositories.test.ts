import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LocalLearningProgressRepository,
  LocalAssessmentAttemptRepository,
  LocalLearningEventsRepository,
  HybridLearningProgressRepository,
  RemoteLearningProgressRepository,
  SyncQueue,
  SYNC_QUEUE_STORAGE_KEY,
  BACKEND_BOOTSTRAP_MARKER_KEY,
  performBootstrapSyncIfAvailable,
} from './index'
import type { LearningAttempt, LearningEvent, LessonProgressState } from '@/types/assessment'
import * as apiClientModule from '@/lib/apiClient'
import * as learnerConfigModule from '@/config/learner'

describe('Local Repositories', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('saves and retrieves lesson progress locally', () => {
    const repo = new LocalLearningProgressRepository()
    const sample: LessonProgressState = {
      lessonId: 'lesson-math-08',
      subjectId: 'math',
      contentProgress: 80,
      overallProgress: 80,
      assessmentStatus: 'not-attempted',
      completedSectionIds: ['sec-1', 'sec-2'],
      updatedAt: '2026-10-26T10:00:00Z',
    }

    repo.save(sample)
    const retrieved = repo.getByLessonId('lesson-math-08')
    expect(retrieved).toEqual(sample)
    expect(repo.getAll()['lesson-math-08']).toEqual(sample)
  })

  it('saves and retrieves assessment attempts locally without losing history', () => {
    const repo = new LocalAssessmentAttemptRepository()
    const attempt1: LearningAttempt = {
      id: 'att-001',
      learnerId: 'stu-001',
      assessmentId: 'asm-01',
      lessonId: 'lesson-math-08',
      subjectId: 'math',
      chapterId: 'ch-01',
      attemptNumber: 1,
      startedAt: '2026-10-26T10:00:00Z',
      lastActivityAt: '2026-10-26T10:05:00Z',
      status: 'in-progress',
      completionStatus: 'incomplete',
      successStatus: 'unknown',
      progressMeasure: 0.5,
      scoreRaw: 0,
      scoreMin: 0,
      scoreMax: 100,
      scoreScaled: 0,
      sessionTimeMs: 300000,
      currentQuestionId: 'q-1',
      responses: {},
      events: [],
    }

    const attempt2: LearningAttempt = {
      ...attempt1,
      id: 'att-002',
      attemptNumber: 2,
      status: 'completed',
      completionStatus: 'completed',
      successStatus: 'passed',
      scoreRaw: 100,
      scoreScaled: 1,
    }

    repo.save(attempt1)
    repo.save(attempt2)

    const all = repo.getAll()
    expect(all.length).toBe(2)
    expect(repo.getById('att-001')?.id).toBe('att-001')
    expect(repo.getById('att-002')?.id).toBe('att-002')
  })

  it('appends and caps learning events locally', () => {
    const repo = new LocalLearningEventsRepository()
    const sampleEvent: LearningEvent = {
      id: 'evt-001',
      lessonId: 'lesson-math-08',
      subjectId: 'math',
      timestamp: '2026-10-26T10:00:00Z',
      type: 'lesson_section_completed',
      payload: { sectionId: 'sec-1' },
      schemaVersion: 1,
    }

    repo.append(sampleEvent)
    expect(repo.getAll().length).toBe(1)
    expect(repo.getAll()[0].id).toBe('evt-001')
  })
})

describe('SyncQueue and Offline Safety', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.spyOn(learnerConfigModule, 'isRemoteApiConfigured').mockReturnValue(true)
  })

  it('enqueues items and persists to localStorage', () => {
    const queue = new SyncQueue()
    queue.enqueue('progress-upsert', 'lesson-math-08', { lessonId: 'lesson-math-08' })

    const raw = localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)
    expect(raw).toBeTruthy()
    const items = JSON.parse(raw!)
    expect(items.length).toBe(1)
    expect(items[0].entityId).toBe('lesson-math-08')
    expect(queue.getPendingCount()).toBe(1)
  })

  it('flushes queue and deletes items upon successful remote sync', async () => {
    const queue = new SyncQueue()
    queue.enqueue('progress-upsert', 'lesson-math-08', { lessonId: 'lesson-math-08' })

    const putSpy = vi.spyOn(apiClientModule.apiClient, 'put').mockResolvedValue({})

    await queue.flush()

    expect(putSpy).toHaveBeenCalled()
    expect(queue.getPendingCount()).toBe(0)
  })

  it('retains queued items and increments retry count upon network error', async () => {
    const queue = new SyncQueue()
    queue.enqueue('progress-upsert', 'lesson-math-08', { lessonId: 'lesson-math-08' })

    vi.spyOn(apiClientModule.apiClient, 'put').mockRejectedValue(new Error('Network error'))

    await queue.flush()

    expect(queue.getPendingCount()).toBe(1)
    const raw = localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)
    const items = JSON.parse(raw!)
    expect(items[0].retryCount).toBe(1)
  })
})

describe('Hybrid Learning Progress Repository', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.spyOn(learnerConfigModule, 'isRemoteApiConfigured').mockReturnValue(true)
  })

  it('saves locally immediately even if remote sync fails or throws', () => {
    const local = new LocalLearningProgressRepository()
    const remote = new RemoteLearningProgressRepository()
    const queue = new SyncQueue()
    const hybrid = new HybridLearningProgressRepository(local, remote, queue)

    vi.spyOn(remote, 'save').mockRejectedValue(new Error('Backend offline'))
    const queueSpy = vi.spyOn(queue, 'enqueue')

    const sample: LessonProgressState = {
      lessonId: 'lesson-math-08',
      subjectId: 'math',
      contentProgress: 50,
      overallProgress: 50,
      assessmentStatus: 'not-attempted',
      completedSectionIds: ['sec-1'],
      updatedAt: '2026-10-26T10:00:00Z',
    }

    // Save should return immediately without throwing
    expect(() => hybrid.save(sample)).not.toThrow()

    // Local state is updated immediately
    expect(local.getByLessonId('lesson-math-08')).toEqual(sample)

    // Queued for background/retry sync
    expect(queueSpy).toHaveBeenCalledWith('progress-upsert', 'lesson-math-08', sample)
  })
})

describe('Bootstrap Sync Migration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('does nothing when remote API is disabled', async () => {
    vi.spyOn(learnerConfigModule, 'isRemoteApiConfigured').mockReturnValue(false)
    const postSpy = vi.spyOn(apiClientModule.apiClient, 'post')

    const result = await performBootstrapSyncIfAvailable()
    expect(result).toBeNull()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('performs bootstrap POST and sets marker when API is enabled and marker is absent', async () => {
    vi.spyOn(learnerConfigModule, 'isRemoteApiConfigured').mockReturnValue(true)
    const postSpy = vi.spyOn(apiClientModule.apiClient, 'post').mockResolvedValue({
      status: 'ok',
      progressSynced: 1,
      attemptsSynced: 0,
      eventsSynced: 0,
      message: 'Bootstrap sync complete',
    })

    // Seed local item so bootstrap has data to send
    const localRepo = new LocalLearningProgressRepository()
    localRepo.save({
      lessonId: 'lesson-math-08',
      subjectId: 'math',
      contentProgress: 80,
      overallProgress: 80,
      assessmentStatus: 'not-attempted',
      completedSectionIds: ['sec-1'],
      updatedAt: '2026-10-26T10:00:00Z',
    })

    const result = await performBootstrapSyncIfAvailable()
    expect(result).not.toBeNull()
    expect(postSpy).toHaveBeenCalled()
    expect(localStorage.getItem(BACKEND_BOOTSTRAP_MARKER_KEY)).toBe('true')
  })

  it('skips bootstrap if marker already exists', async () => {
    vi.spyOn(learnerConfigModule, 'isRemoteApiConfigured').mockReturnValue(true)
    localStorage.setItem(BACKEND_BOOTSTRAP_MARKER_KEY, 'true')
    const postSpy = vi.spyOn(apiClientModule.apiClient, 'post')

    const result = await performBootstrapSyncIfAvailable()
    expect(result).toBeNull()
    expect(postSpy).not.toHaveBeenCalled()
  })
})
