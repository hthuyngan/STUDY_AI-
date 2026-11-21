import { describe, it, expect, vi, beforeEach } from 'vitest'
import { classroomService } from './classroom.service'
import { apiClient } from '@/lib/apiClient'
import * as authSession from '@/auth/authSession'

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('classroomService — Fail-Closed Authenticated Policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('when authenticated: getClasses propagates API failure and does NOT return mock fallback', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock-jwt-token')
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Server Error 500'))

    await expect(classroomService.getClasses()).rejects.toThrow('Server Error 500')
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/classrooms')
  })

  it('when authenticated: getClassById propagates 404/500 error and does NOT return mock class', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock-jwt-token')
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Not Found 404'))

    await expect(classroomService.getClassById('cls-123')).rejects.toThrow('Not Found 404')
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/classrooms/cls-123')
  })

  it('when authenticated: saveClass propagates error and does NOT write mock to localStorage', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock-jwt-token')
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Validation Error 422'))

    await expect(classroomService.saveClass({ name: 'Lớp Test', code: 'TEST12' })).rejects.toThrow('Validation Error 422')
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/classrooms', expect.any(Object))
  })

  it('when authenticated: getAssignments propagates API failure and does NOT return mock assignments', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock-jwt-token')
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Unauthorized 401'))

    await expect(classroomService.getAssignments()).rejects.toThrow('Unauthorized 401')
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/assignments')
  })

  it('when authenticated: saveAssignment propagates API failure and does NOT simulate mock success', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock-jwt-token')
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Forbidden 403'))

    await expect(classroomService.saveAssignment({ classId: 'cls-1', title: 'Bài 1' })).rejects.toThrow('Forbidden 403')
  })

  it('when authenticated: gradeSubmission propagates API failure and does NOT update local mock storage', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock-jwt-token')
    vi.mocked(apiClient.get).mockResolvedValue([
      { id: 'sub-1', assignmentId: 'asg-1', studentId: 'stu-1', content: 'test', status: 'pending', submittedAt: '2026-11-11T00:00:00Z' } as any,
    ])
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Database Connection Lost'))

    await expect(classroomService.gradeSubmission('sub-1', 9, 'Good job', 'Teacher', 'asg-1')).rejects.toThrow('Database Connection Lost')
  })

  it('when unauthenticated (guest demo): falls back to deterministic local mock data', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue(null)

    const classes = await classroomService.getClasses()
    expect(Array.isArray(classes)).toBe(true)
    expect(classes.length).toBeGreaterThan(0)
    expect(classes[0].id).toBe('cls-12a1')
  })

  it('when authenticated: getAlerts calls /api/v1/teacher/alerts and fails closed on error', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock-jwt-token')
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Server Error 500'))

    await expect(classroomService.getAlerts()).rejects.toThrow('Server Error 500')
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/teacher/alerts')
  })

  it('when authenticated: getClassActivities calls /api/v1/classrooms/{id}/activities', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock-jwt-token')
    vi.mocked(apiClient.get).mockResolvedValue([
      { id: 'act-1', classId: 'cls-101', action: 'test', detail: 'test activity', timestamp: '2026-11-21', actor: 'Teacher' },
    ])

    const res = await classroomService.getClassActivities('cls-101')
    expect(res).toHaveLength(1)
    expect(res[0].id).toBe('act-1')
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/classrooms/cls-101/activities')
  })

  it('when authenticated: getStudentAcademicDetail calls /api/v1/teacher/students/{id}/academic-detail', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock-jwt-token')
    vi.mocked(apiClient.get).mockResolvedValue({
      student: { id: 'stu-1', name: 'Nguyen Van A', email: 'a@test.com', grade: '10', className: '10A1' },
      overallProgress: 75,
      averageAssessmentScore: 80,
      recentLessons: [],
      assessmentAttempts: [],
      weakAreas: [],
    })

    const detail = await classroomService.getStudentAcademicDetail('stu-1')
    expect(detail).not.toBeNull()
    expect(detail!.name).toBe('Nguyen Van A')
    expect(detail!.recentLessons).toEqual([])
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/teacher/students/stu-1/academic-detail')
  })
})

