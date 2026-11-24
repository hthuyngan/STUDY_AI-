import { apiClient } from '@/lib/apiClient'
import { getAccessToken } from '@/auth/authSession'
import type { CreateNoteInput, StudyNote } from '@/types/studyNotes'

export const STUDY_NOTES_STORAGE_KEY = 'study_ai.study_notes.v1'
export const NOTES_CHANGED_EVENT = 'study_ai:notes_changed'

interface StoredNotesSchema {
  version: number
  notes: StudyNote[]
}

function generateNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `note_${crypto.randomUUID()}`
  }
  return `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function loadStoredData(): StudyNote[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STUDY_NOTES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredNotesSchema | StudyNote[]

    if (Array.isArray(parsed)) {
      return parsed
    }
    if (parsed && Array.isArray(parsed.notes)) {
      return parsed.notes
    }
    return []
  } catch (err) {
    console.error('Failed to load study notes from localStorage', err)
    return []
  }
}

function persistNotes(notes: StudyNote[]): void {
  if (typeof window === 'undefined') return
  try {
    const data: StoredNotesSchema = {
      version: 1,
      notes,
    }
    localStorage.setItem(STUDY_NOTES_STORAGE_KEY, JSON.stringify(data))
    window.dispatchEvent(new CustomEvent(NOTES_CHANGED_EVENT, { detail: { count: notes.length } }))
  } catch (err) {
    console.error('Failed to persist study notes to localStorage', err)
  }
}

export function isAuthenticated(): boolean {
  return typeof window !== 'undefined' && Boolean(getAccessToken())
}

export async function fetchStudyNotesFromApi(filter?: {
  lessonId?: string
  subjectId?: string
  search?: string
}): Promise<StudyNote[]> {
  const params = new URLSearchParams()
  if (filter?.lessonId) params.append('lessonId', filter.lessonId)
  if (filter?.subjectId) params.append('subjectId', filter.subjectId)
  if (filter?.search) params.append('search', filter.search)

  const query = params.toString() ? `?${params.toString()}` : ''
  const notes = await apiClient.get<StudyNote[]>(`/api/v1/me/notes${query}`)
  if (Array.isArray(notes)) {
    persistNotes(notes)
    return notes
  }
  return []
}

export async function createStudyNoteOnApi(input: CreateNoteInput): Promise<StudyNote> {
  const created = await apiClient.post<StudyNote>('/api/v1/me/notes', input)
  const current = loadStoredData()
  persistNotes([created, ...current.filter((n) => n.id !== created.id)])
  return created
}

export async function updateStudyNoteOnApi(id: string, content: string): Promise<StudyNote> {
  const updated = await apiClient.put<StudyNote>(`/api/v1/me/notes/${id}`, { content })
  const current = loadStoredData()
  persistNotes(current.map((n) => (n.id === id ? updated : n)))
  return updated
}

export async function deleteStudyNoteOnApi(id: string): Promise<boolean> {
  await apiClient.delete(`/api/v1/me/notes/${id}`)
  const current = loadStoredData()
  persistNotes(current.filter((n) => n.id !== id))
  return true
}

export const studyNotesService = {
  getNotes(filter?: { lessonId?: string; subjectId?: string; search?: string }): StudyNote[] {
    const all = loadStoredData()
    let result = [...all]

    if (filter?.lessonId) {
      result = result.filter((n) => n.lessonId === filter.lessonId)
    }

    if (filter?.subjectId) {
      result = result.filter((n) => n.subjectId === filter.subjectId)
    }

    if (filter?.search) {
      const q = filter.search.trim().toLowerCase()
      result = result.filter(
        (n) =>
          n.content.toLowerCase().includes(q) ||
          n.lessonTitle.toLowerCase().includes(q) ||
          (n.sectionTitle && n.sectionTitle.toLowerCase().includes(q))
      )
    }

    return result.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  },

  getNoteById(id: string): StudyNote | null {
    const all = loadStoredData()
    return all.find((n) => n.id === id) || null
  },

  createNote(input: CreateNoteInput): StudyNote {
    const trimmed = input.content.trim()
    if (!trimmed) {
      throw new Error('Nội dung ghi chú không được để trống.')
    }

    const now = new Date().toISOString()
    const newNote: StudyNote = {
      id: generateNoteId(),
      lessonId: input.lessonId,
      subjectId: input.subjectId,
      lessonTitle: input.lessonTitle || 'Bài học',
      subjectName: input.subjectName || 'Môn học',
      sectionId: input.sectionId,
      sectionTitle: input.sectionTitle,
      content: trimmed,
      createdAt: now,
      updatedAt: now,
    }

    const current = loadStoredData()
    const updated = [newNote, ...current]
    persistNotes(updated)

    if (isAuthenticated()) {
      createStudyNoteOnApi(input).catch((err) => {
        console.error('Failed to sync study note to backend', err)
      })
    }

    return newNote
  },

  updateNote(id: string, content: string): StudyNote | null {
    const trimmed = content.trim()
    if (!trimmed) {
      throw new Error('Nội dung ghi chú không được để trống.')
    }

    const current = loadStoredData()
    let updatedNote: StudyNote | null = null

    const updated = current.map((n) => {
      if (n.id === id) {
        updatedNote = {
          ...n,
          content: trimmed,
          updatedAt: new Date().toISOString(),
        }
        return updatedNote
      }
      return n
    })

    if (updatedNote) {
      persistNotes(updated)
      if (isAuthenticated()) {
        updateStudyNoteOnApi(id, trimmed).catch((err) => {
          console.error('Failed to sync updated study note to backend', err)
        })
      }
    }
    return updatedNote
  },

  deleteNote(id: string): boolean {
    const current = loadStoredData()
    const filtered = current.filter((n) => n.id !== id)
    if (filtered.length !== current.length) {
      persistNotes(filtered)
      if (isAuthenticated()) {
        deleteStudyNoteOnApi(id).catch((err) => {
          console.error('Failed to delete study note on backend', err)
        })
      }
      return true
    }
    return false
  },

  getNotesCount(filter?: { lessonId?: string; subjectId?: string }): number {
    return this.getNotes(filter).length
  },
}

export const STUDY_NOTES_CHANGED_EVENT = NOTES_CHANGED_EVENT

export const getStudyNotes = (filter?: { lessonId?: string; subjectId?: string; search?: string }) =>
  studyNotesService.getNotes(filter)

export const getNotesByLesson = (lessonId: string) =>
  studyNotesService.getNotes({ lessonId })

export const getStudyNoteById = (id: string) =>
  studyNotesService.getNoteById(id)

export const createStudyNote = (input: CreateNoteInput) =>
  studyNotesService.createNote(input)

export const updateStudyNote = (id: string, content: string) =>
  studyNotesService.updateNote(id, content)

export const deleteStudyNote = (id: string) =>
  studyNotesService.deleteNote(id)

export const searchStudyNotes = (query: string, subjectFilter?: string) =>
  studyNotesService.getNotes({
    search: query,
    subjectId: subjectFilter && subjectFilter !== 'all' ? subjectFilter : undefined,
  })
