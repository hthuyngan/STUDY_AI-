import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  setAccessToken,
  getAccessToken,
  clearAuthSession,
  setAuthUser,
  getAuthUser,
} from './authSession'
import {
  getCurrentIdentity,
  getStorageKey,
  migrateLegacyStorageToGuest,
  hasGuestLearningData,
  getGuestLearningDataBundle,
} from '@/repositories/storageKeys'
import {
  LocalLearningProgressRepository,
  LocalAssessmentAttemptRepository,
  LocalLearningEventsRepository,
} from '@/repositories'
import * as learnerConfig from '@/config/learner'
import type { LessonProgressState } from '@/types/assessment'

describe('Auth Session & Token Memory Security', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    clearAuthSession()
  })

  it('stores access token in memory only and never writes to localStorage or sessionStorage', () => {
    const testToken = 'header.payload.signature_mock_access_token'
    setAccessToken(testToken)

    expect(getAccessToken()).toBe(testToken)
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(sessionStorage.getItem('token')).toBeNull()
    expect(sessionStorage.getItem('accessToken')).toBeNull()
  })

  it('clears access token and auth user upon clearAuthSession()', () => {
    setAccessToken('some_token')
    setAuthUser({
      id: 'usr-123',
      email: 'learner@example.com',
      displayName: 'Minh',
      role: 'learner',
      grade: 'Lớp 10',
      createdAt: new Date().toISOString(),
    })

    expect(getAccessToken()).toBeTruthy()
    expect(getAuthUser()).toBeTruthy()

    clearAuthSession()

    expect(getAccessToken()).toBeNull()
    expect(getAuthUser()).toBeNull()
  })
})

describe('Identity-Aware Namespaced Storage & Cross-User Isolation', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAuthSession()
  })

  it('generates a stable guest identity when no user is logged in', () => {
    const guestId1 = getCurrentIdentity()
    expect(guestId1).toMatch(/^guest_/)

    const guestId2 = getCurrentIdentity()
    expect(guestId1).toBe(guestId2)
  })

  it('switches identity to authenticated user id when logged in', () => {
    const guestId = getCurrentIdentity()
    expect(guestId).toMatch(/^guest_/)

    setAuthUser({
      id: 'usr_alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      role: 'learner',
      grade: '10',
      createdAt: new Date().toISOString(),
    })
    expect(getCurrentIdentity()).toBe('usr_alice')

    // Scoped keys are strictly isolated
    const aliceKey = getStorageKey('lesson_progress', 'usr_alice')
    const bobKey = getStorageKey('lesson_progress', 'usr_bob')
    const guestKey = getStorageKey('lesson_progress', guestId)

    expect(aliceKey).not.toBe(bobKey)
    expect(aliceKey).not.toBe(guestKey)
    expect(aliceKey).toBe('study_ai.usr_alice.lesson_progress.v2')
    expect(bobKey).toBe('study_ai.usr_bob.lesson_progress.v2')
    expect(guestKey).toBe(`study_ai.${guestId}.lesson_progress.v2`)
  })

  it('prevents User B from accessing User A local learning progress', () => {
    const repo = new LocalLearningProgressRepository()

    // 1. User Alice logs in and saves progress
    setAuthUser({
      id: 'user_alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      role: 'learner',
      grade: '10',
      createdAt: new Date().toISOString(),
    })
    const aliceProgress: LessonProgressState = {
      lessonId: 'lesson-math-08',
      subjectId: 'math',
      contentProgress: 100,
      overallProgress: 100,
      assessmentStatus: 'completed',
      completedSectionIds: ['sec-1', 'sec-2'],
      updatedAt: '2026-10-27T10:00:00Z',
    }
    repo.save(aliceProgress)

    expect(repo.getByLessonId('lesson-math-08')).toEqual(aliceProgress)
    expect(repo.getAll()['lesson-math-08']).toEqual(aliceProgress)

    // 2. Alice logs out, Bob logs in
    setAuthUser({
      id: 'user_bob',
      email: 'bob@example.com',
      displayName: 'Bob',
      role: 'learner',
      grade: '10',
      createdAt: new Date().toISOString(),
    })
    expect(repo.getByLessonId('lesson-math-08')).toBeNull()
    expect(Object.keys(repo.getAll()).length).toBe(0)

    // 3. Bob saves his own progress
    const bobProgress: LessonProgressState = {
      lessonId: 'lesson-math-08',
      subjectId: 'math',
      contentProgress: 25,
      overallProgress: 25,
      assessmentStatus: 'incomplete',
      completedSectionIds: ['sec-1'],
      updatedAt: '2026-10-27T11:00:00Z',
    }
    repo.save(bobProgress)

    expect(repo.getByLessonId('lesson-math-08')?.overallProgress).toBe(25)

    // 4. Switch back to Alice: Alice progress remains intact
    setAuthUser({
      id: 'user_alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      role: 'learner',
      grade: '10',
      createdAt: new Date().toISOString(),
    })
    expect(repo.getByLessonId('lesson-math-08')?.overallProgress).toBe(100)
  })
})

describe('Legacy v1 to Guest Namespace Migration', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAuthSession()
  })

  it('migrates legacy v1 storage into guest namespace without data loss', () => {
    const legacyProgress: Record<string, LessonProgressState> = {
      'lesson-phy-01': {
        lessonId: 'lesson-phy-01',
        subjectId: 'physics',
        contentProgress: 75,
        overallProgress: 75,
        assessmentStatus: 'incomplete',
        completedSectionIds: ['sec-1'],
        updatedAt: '2026-10-26T12:00:00Z',
      },
    }

    localStorage.setItem(
      'study_ai.lesson_progress.v1',
      JSON.stringify(legacyProgress)
    )

    migrateLegacyStorageToGuest()

    const guestId = getCurrentIdentity()
    const guestProgressKey = getStorageKey('lesson_progress', guestId)
    const migratedRaw = localStorage.getItem(guestProgressKey)

    expect(migratedRaw).toBeTruthy()
    const parsed = JSON.parse(migratedRaw!)
    expect(parsed['lesson-phy-01'].contentProgress).toBe(75)
  })
})

describe('Guest Learning Data Detection and Bundling', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAuthSession()
  })

  it('detects guest learning data when guest has progress or attempts', () => {
    expect(hasGuestLearningData()).toBe(false)

    const progressRepo = new LocalLearningProgressRepository()
    progressRepo.save({
      lessonId: 'lesson-chem-01',
      subjectId: 'chemistry',
      contentProgress: 50,
      overallProgress: 50,
      assessmentStatus: 'incomplete',
      completedSectionIds: ['sec-1'],
      updatedAt: '2026-10-27T12:00:00Z',
    })

    expect(hasGuestLearningData()).toBe(true)

    const bundle = getGuestLearningDataBundle()
    expect(bundle).not.toBeNull()
    expect(bundle.lessonProgress['lesson-chem-01']).toBeTruthy()
    expect(bundle.lessonProgress['lesson-chem-01'].contentProgress).toBe(50)
  })
})

describe('Guest-Local Mode without Remote API', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAuthSession()
    vi.spyOn(learnerConfig, 'isRemoteApiConfigured').mockReturnValue(false)
  })

  it('operates completely offline in guest-local mode without throwing or making network calls', () => {
    const repo = new LocalLearningProgressRepository()
    const attemptRepo = new LocalAssessmentAttemptRepository()
    const eventsRepo = new LocalLearningEventsRepository()

    expect(() => {
      repo.save({
        lessonId: 'lesson-lit-01',
        subjectId: 'literature',
        contentProgress: 100,
        overallProgress: 100,
        assessmentStatus: 'completed',
        completedSectionIds: ['sec-1'],
        updatedAt: new Date().toISOString(),
      })

      attemptRepo.save({
        id: 'att-guest-1',
        learnerId: 'guest-local',
        assessmentId: 'asm-lit-1',
        lessonId: 'lesson-lit-01',
        subjectId: 'literature',
        chapterId: 'ch-1',
        attemptNumber: 1,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        status: 'completed',
        completionStatus: 'completed',
        successStatus: 'passed',
        progressMeasure: 1,
        scoreRaw: 90,
        scoreMin: 0,
        scoreMax: 100,
        scoreScaled: 0.9,
        sessionTimeMs: 120000,
        currentQuestionId: 'q-1',
        responses: {},
        events: [],
      })

      eventsRepo.append({
        id: 'evt-guest-1',
        lessonId: 'lesson-lit-01',
        subjectId: 'literature',
        timestamp: new Date().toISOString(),
        type: 'lesson_section_completed',
        schemaVersion: 1,
      })
    }).not.toThrow()

    expect(repo.getByLessonId('lesson-lit-01')?.contentProgress).toBe(100)
    expect(attemptRepo.getById('att-guest-1')?.scoreRaw).toBe(90)
    expect(eventsRepo.getAll().length).toBe(1)
  })
})
