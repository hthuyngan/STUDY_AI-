import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createStudyNote,
  deleteStudyNote,
  getNotesByLesson,
  getStudyNotes,
  searchStudyNotes,
  STUDY_NOTES_STORAGE_KEY,
  updateStudyNote,
} from './studyNotes.service'

describe('studyNotes.service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates and retrieves study notes with versioned schema', () => {
    const note = createStudyNote({
      lessonId: 'les-math-12-01',
      subjectId: 'math',
      lessonTitle: 'Bài 01 · Đơn điệu hàm số',
      subjectName: 'Toán học',
      sectionId: 'definitions',
      sectionTitle: 'Định nghĩa cơ bản',
      content: 'Cần chú ý dấu đạo hàm cấp 1 đổi dấu khi qua nghiệm.',
    })

    expect(note.id).toMatch(/^note_/)
    expect(note.content).toBe('Cần chú ý dấu đạo hàm cấp 1 đổi dấu khi qua nghiệm.')
    expect(note.sectionId).toBe('definitions')

    const storedRaw = localStorage.getItem(STUDY_NOTES_STORAGE_KEY)
    expect(storedRaw).toBeTruthy()
    const parsed = JSON.parse(storedRaw!)
    expect(parsed.version).toBe(1)
    expect(parsed.notes.length).toBe(1)

    const allNotes = getStudyNotes()
    expect(allNotes.length).toBe(1)
    expect(allNotes[0].id).toBe(note.id)
  })

  it('filters notes by lessonId', () => {
    createStudyNote({
      lessonId: 'les-math-01',
      subjectId: 'math',
      lessonTitle: 'Toán 1',
      subjectName: 'Toán học',
      content: 'Ghi chú Toán 1',
    })

    createStudyNote({
      lessonId: 'les-phy-01',
      subjectId: 'physics',
      lessonTitle: 'Lý 1',
      subjectName: 'Vật lý',
      content: 'Ghi chú Lý 1',
    })

    const mathNotes = getNotesByLesson('les-math-01')
    expect(mathNotes.length).toBe(1)
    expect(mathNotes[0].lessonId).toBe('les-math-01')

    const phyNotes = getNotesByLesson('les-phy-01')
    expect(phyNotes.length).toBe(1)
    expect(phyNotes[0].lessonId).toBe('les-phy-01')
  })

  it('updates note content and maintains timestamp', () => {
    const note = createStudyNote({
      lessonId: 'les-math-01',
      subjectId: 'math',
      lessonTitle: 'Toán 1',
      subjectName: 'Toán học',
      content: 'Nội dung cũ',
    })

    const updated = updateStudyNote(note.id, 'Nội dung mới đã sửa')
    expect(updated).not.toBeNull()
    expect(updated!.content).toBe('Nội dung mới đã sửa')
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(note.createdAt).getTime()
    )

    const reloaded = getStudyNotes()
    expect(reloaded[0].content).toBe('Nội dung mới đã sửa')
  })

  it('deletes note successfully', () => {
    const note = createStudyNote({
      lessonId: 'les-math-01',
      subjectId: 'math',
      lessonTitle: 'Toán 1',
      subjectName: 'Toán học',
      content: 'Nội dung sẽ xóa',
    })

    expect(getStudyNotes().length).toBe(1)
    const success = deleteStudyNote(note.id)
    expect(success).toBe(true)
    expect(getStudyNotes().length).toBe(0)
  })

  it('searches notes by query and subject filter', () => {
    createStudyNote({
      lessonId: 'les-math-01',
      subjectId: 'math',
      lessonTitle: 'Đạo hàm',
      subjectName: 'Toán học',
      content: 'Quy tắc L-Hopital',
    })

    createStudyNote({
      lessonId: 'les-phy-01',
      subjectId: 'physics',
      lessonTitle: 'Dao động cơ',
      subjectName: 'Vật lý',
      content: 'Công thức con lắc đơn',
    })

    const resultsMath = searchStudyNotes('Hopital', 'math')
    expect(resultsMath.length).toBe(1)
    expect(resultsMath[0].subjectId).toBe('math')

    const resultsPhy = searchStudyNotes('con lắc', 'physics')
    expect(resultsPhy.length).toBe(1)

    const resultsNone = searchStudyNotes('không tồn tại')
    expect(resultsNone.length).toBe(0)
  })

  describe('API integration', () => {
    it('fetches notes from API and persists to local cache', async () => {
      const mockNotes = [
        {
          id: 'note_api_1',
          lessonId: 'les_1',
          subjectId: 'sub_math10',
          lessonTitle: 'Toán 10',
          subjectName: 'Toán học 10',
          content: 'Ghi chú từ API',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      const { apiClient } = await import('@/lib/apiClient')
      const { fetchStudyNotesFromApi } = await import('./studyNotes.service')
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockNotes)

      const result = await fetchStudyNotesFromApi({ lessonId: 'les_1' })
      expect(result).toEqual(mockNotes)
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/me/notes?lessonId=les_1')
      expect(getStudyNotes().length).toBe(1)
    })

    it('propagates API error when creating note fails', async () => {
      const { apiClient } = await import('@/lib/apiClient')
      const { createStudyNoteOnApi } = await import('./studyNotes.service')
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network error 500'))

      await expect(
        createStudyNoteOnApi({
          lessonId: 'les_1',
          subjectId: 'sub_math10',
          lessonTitle: 'Toán 10',
          subjectName: 'Toán học 10',
          content: 'Nội dung lỗi',
        })
      ).rejects.toThrow('Network error 500')
    })
  })
})

