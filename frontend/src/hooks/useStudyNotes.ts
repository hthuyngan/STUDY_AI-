import { useCallback, useEffect, useState } from 'react'
import {
  createStudyNote,
  deleteStudyNote,
  getNotesByLesson,
  getStudyNotes,
  searchStudyNotes,
  STUDY_NOTES_CHANGED_EVENT,
  updateStudyNote,
} from '@/services/studyNotes.service'
import type { CreateNoteInput, StudyNote } from '@/types/studyNotes'

export function useStudyNotes(lessonId?: string) {
  const [notes, setNotes] = useState<StudyNote[]>(() =>
    lessonId ? getNotesByLesson(lessonId) : getStudyNotes()
  )

  const refresh = useCallback(() => {
    if (lessonId) {
      setNotes(getNotesByLesson(lessonId))
    } else {
      setNotes(getStudyNotes())
    }
  }, [lessonId])

  useEffect(() => {
    const handleNotesChanged = () => {
      refresh()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(STUDY_NOTES_CHANGED_EVENT, handleNotesChanged)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(STUDY_NOTES_CHANGED_EVENT, handleNotesChanged)
      }
    }
  }, [refresh])

  const addNote = useCallback((input: CreateNoteInput) => {
    const created = createStudyNote(input)
    refresh()
    return created
  }, [refresh])

  const editNote = useCallback((id: string, content: string) => {
    const updated = updateStudyNote(id, content)
    refresh()
    return updated
  }, [refresh])

  const removeNote = useCallback((id: string) => {
    const success = deleteStudyNote(id)
    refresh()
    return success
  }, [refresh])

  const search = useCallback((query: string, subjectFilter?: string) => {
    return searchStudyNotes(query, subjectFilter)
  }, [])

  return {
    notes,
    refresh,
    addNote,
    editNote,
    removeNote,
    search,
  }
}
