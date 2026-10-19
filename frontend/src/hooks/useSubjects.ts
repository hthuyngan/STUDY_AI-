import { useEffect, useState } from 'react'
import { getSubjectById, getSubjects } from '@/services/subjects.service'
import type { SubjectDetail, SubjectSummary } from '@/types/subject'

export function useSubjects() {
  const [subjects, setSubjects] = useState<SubjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubjects = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getSubjects()
      setSubjects(data)
    } catch {
      setError('Không thể tải danh sách môn học.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubjects()
  }, [])

  return { subjects, isLoading, error, reload: fetchSubjects }
}

export function useSubjectDetail(subjectId: string | undefined) {
  const [subject, setSubject] = useState<SubjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubject = async () => {
    if (!subjectId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getSubjectById(subjectId)
      if (!data) {
        setError('Không tìm thấy thông tin môn học.')
      } else {
        setSubject(data)
      }
    } catch {
      setError('Không thể tải chi tiết môn học.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSubject()
  }, [subjectId])

  return { subject, isLoading, error, reload: fetchSubject }
}
