import { useCallback, useEffect, useState } from 'react'
import { teacherService } from '@/services/teacher.service'
import type {
  ClassStudentItem,
  StudentAcademicDetail,
  TeacherAssignmentItem,
  TeacherClassItem,
} from '@/types/teacher'

export function useTeacherDashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof teacherService.getDashboardSummary>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await teacherService.getDashboardSummary()
      setData(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải bảng điều khiển giáo viên')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    teacherService
      .getDashboardSummary()
      .then((res) => {
        if (!isMounted) return
        setData(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải bảng điều khiển giáo viên')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { data, loading, error, refresh: load }
}

export function useTeacherClasses() {
  const [classes, setClasses] = useState<TeacherClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await teacherService.getClasses()
      setClasses(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách lớp học')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    teacherService
      .getClasses()
      .then((res) => {
        if (!isMounted) return
        setClasses(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách lớp học')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { classes, loading, error, refresh: load }
}

export function useTeacherClassDetail(classId: string) {
  const [classInfo, setClassInfo] = useState<TeacherClassItem | null>(null)
  const [students, setStudents] = useState<ClassStudentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, s] = await Promise.all([
        teacherService.getClassById(classId),
        teacherService.getClassStudents(classId),
      ])
      if (!c) {
        setError('Không tìm thấy lớp học')
      } else {
        setClassInfo(c)
        setStudents(s)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu lớp học')
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    let isMounted = true
    Promise.all([
      teacherService.getClassById(classId),
      teacherService.getClassStudents(classId),
    ])
      .then(([c, s]) => {
        if (!isMounted) return
        if (!c) {
          setError('Không tìm thấy lớp học')
        } else {
          setClassInfo(c)
          setStudents(s)
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu lớp học')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [classId])

  return { classInfo, students, loading, error, refresh: load }
}

export function useStudentAcademicDetail(studentId: string) {
  const [student, setStudent] = useState<StudentAcademicDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await teacherService.getStudentAcademicDetail(studentId)
      if (!res) {
        setError('Không tìm thấy học sinh')
      } else {
        setStudent(res)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải hồ sơ học tập')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    let isMounted = true
    teacherService
      .getStudentAcademicDetail(studentId)
      .then((res) => {
        if (!isMounted) return
        if (!res) {
          setError('Không tìm thấy học sinh')
        } else {
          setStudent(res)
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải hồ sơ học tập')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [studentId])

  return { student, loading, error, refresh: load }
}

export function useTeacherAssignments() {
  const [assignments, setAssignments] = useState<TeacherAssignmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await teacherService.getAssignments()
      setAssignments(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải bài tập')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    teacherService
      .getAssignments()
      .then((res) => {
        if (!isMounted) return
        setAssignments(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải bài tập')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const createAssignment = async (data: Omit<TeacherAssignmentItem, 'id' | 'submissionsCount' | 'status'>) => {
    const created = await teacherService.createAssignment(data)
    void load()
    return created
  }

  return { assignments, loading, error, createAssignment, refresh: load }
}
