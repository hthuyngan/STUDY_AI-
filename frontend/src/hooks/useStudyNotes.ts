import { useCallback, useEffect, useState } from 'react'
import {
  createStudyNote,
  createStudyNoteOnApi,
  deleteStudyNote,
  deleteStudyNoteOnApi,
  fetchStudyNotesFromApi,
  getNotesByLesson,
  getStudyNotes,
  isAuthenticated,
  searchStudyNotes,
  STUDY_NOTES_CHANGED_EVENT,
  updateStudyNote,
  updateStudyNoteOnApi,
} from '@/services/studyNotes.service'
import type { CreateNoteInput, StudyNote } from '@/types/studyNotes'

export function useStudyNotes(lessonId?: string) {
  const [notes, setNotes] = useState<StudyNote[]>(() =>
    lessonId ? getNotesByLesson(lessonId) : getStudyNotes()
  )
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (isAuthenticated()) {
      setLoading(true)
      setError(null)
      try {
        const remoteNotes = await fetchStudyNotesFromApi(lessonId ? { lessonId } : undefined)
        setNotes(remoteNotes)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tải ghi chú từ máy chủ.'
        setError(msg)
        // Fall back to local notes on failure
        setNotes(lessonId ? getNotesByLesson(lessonId) : getStudyNotes())
      } finally {
        setLoading(false)
      }
    } else {
      setNotes(lessonId ? getNotesByLesson(lessonId) : getStudyNotes())
    }
  }, [lessonId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const handleNotesChanged = () => {
      setNotes(lessonId ? getNotesByLesson(lessonId) : getStudyNotes())
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(STUDY_NOTES_CHANGED_EVENT, handleNotesChanged)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(STUDY_NOTES_CHANGED_EVENT, handleNotesChanged)
      }
    }
  }, [lessonId])

  const addNote = useCallback(async (input: CreateNoteInput) => {
    if (isAuthenticated()) {
      setLoading(true)
      setError(null)
      try {
        const created = await createStudyNoteOnApi(input)
        setNotes((prev) => [created, ...prev.filter((n) => n.id !== created.id)])
        return created
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi tạo ghi chú trên máy chủ.'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    }
    const created = createStudyNote(input)
    setNotes(lessonId ? getNotesByLesson(lessonId) : getStudyNotes())
    return created
  }, [lessonId])

  const editNote = useCallback(async (id: string, content: string) => {
    if (isAuthenticated()) {
      setLoading(true)
      setError(null)
      try {
        const updated = await updateStudyNoteOnApi(id, content)
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
        return updated
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật ghi chú trên máy chủ.'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    }
    const updated = updateStudyNote(id, content)
    setNotes(lessonId ? getNotesByLesson(lessonId) : getStudyNotes())
    return updated
  }, [lessonId])

  const removeNote = useCallback(async (id: string) => {
    if (isAuthenticated()) {
      setLoading(true)
      setError(null)
      try {
        await deleteStudyNoteOnApi(id)
        setNotes((prev) => prev.filter((n) => n.id !== id))
        return true
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi xóa ghi chú trên máy chủ.'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    }
    const success = deleteStudyNote(id)
    setNotes(lessonId ? getNotesByLesson(lessonId) : getStudyNotes())
    return success
  }, [lessonId])

  const search = useCallback((query: string, subjectFilter?: string) => {
    return searchStudyNotes(query, subjectFilter)
  }, [])

  return {
    notes,
    loading,
    error,
    refresh,
    addNote,
    editNote,
    removeNote,
    search,
  }
}
