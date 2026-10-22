import { Bot, Check, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import './LessonBottomBar.css'

export interface LessonBottomBarProps {
  lessonId: string
  lessonTitle: string
  courseId?: string
  subjectId?: string
  quizId?: string
  previousLessonId?: string
  nextLessonId?: string
  isCompleted?: boolean
  onComplete?: () => void
}

export function LessonBottomBar({
  courseId,
  subjectId,
  lessonId,
  lessonTitle,
  quizId,
  previousLessonId,
  nextLessonId,
  isCompleted,
  onComplete,
}: LessonBottomBarProps) {
  const navigate = useNavigate()

  const activeSubjectId = subjectId || (courseId?.startsWith('phy') ? 'physics' : courseId?.startsWith('chem') ? 'chemistry' : courseId?.startsWith('eng') ? 'english' : 'math')

  const handleAskAI = () => {
    navigate(`/ai-tutor?lesson=${lessonId}&topic=${encodeURIComponent(lessonTitle)}`)
  }

  return (
    <div className="lesson-bottom-bar" role="toolbar" aria-label="Điều hướng bài học">
      <div className="bottom-bar-left">
        {previousLessonId ? (
          <Button
            variant="outline"
            icon={ChevronLeft}
            onClick={() => navigate(`/subjects/${activeSubjectId}/lessons/${previousLessonId}`)}
          >
            Bài trước
          </Button>
        ) : (
          <div />
        )}
      </div>

      <div className="bottom-bar-center">
        <Button
          variant="outline"
          icon={Bot}
          onClick={handleAskAI}
          className="ask-ai-btn"
        >
          Hỏi AI về bài này
        </Button>

        {quizId && (
          <Button
            variant="outline"
            icon={HelpCircle}
            onClick={() => navigate(`/quiz/${quizId}`)}
          >
            Làm bài trắc nghiệm
          </Button>
        )}

        <Button
          variant={isCompleted ? 'outline' : 'primary'}
          icon={Check}
          onClick={onComplete}
        >
          {isCompleted ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
        </Button>
      </div>

      <div className="bottom-bar-right">
        {nextLessonId && (
          <Button
            variant="outline"
            onClick={() => navigate(`/subjects/${activeSubjectId}/lessons/${nextLessonId}`)}
          >
            <span>Bài tiếp</span>
            <ChevronRight size={16} aria-hidden />
          </Button>
        )}
      </div>
    </div>
  )
}
