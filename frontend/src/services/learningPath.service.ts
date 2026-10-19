import { mockLearningPath } from '@/data/learningPath.mock'
import type { LearningPathData } from '@/types/learningPath'

export async function getLearningPath(): Promise<LearningPathData> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  return { ...mockLearningPath }
}
