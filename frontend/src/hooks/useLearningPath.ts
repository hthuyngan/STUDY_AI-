import { useCallback, useEffect, useState } from 'react'
import { getLearningPath } from '@/services/learningPath.service'
import type { LearningPathData } from '@/types/learningPath'

export function useLearningPath() {
  const [learningPath, setLearningPath] = useState<LearningPathData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getLearningPath()
      setLearningPath(data)
    } catch {
      setError('Lỗi khi tải lộ trình học tập cá nhân.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    getLearningPath()
      .then((data) => {
        if (!isMounted) return
        setLearningPath(data)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Lỗi khi tải lộ trình học tập cá nhân.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { learningPath, isLoading, error, reload }
}
