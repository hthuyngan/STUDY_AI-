import { Bot, Check, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import './LessonBottomBar.css'

export interface LessonBottomBarProps {
  courseId: string
  lessonId: string
  lessonTitle: string
  quizId?: string
  previousLessonId?: string
  nextLessonId?: string
  isCompleted?: boolean
  onComplete?: () => void
}

export function LessonBottomBar({
  courseId,
  lessonId,
  lessonTitle,
  quizId,
  previousLessonId,
  nextLessonId,
  isCompleted,
  onComplete,
}: LessonBottomBarProps) {
  const navigate = useNavigate()

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
            onClick={() => navigate(`/learn/${courseId}/${previousLessonId}`)}
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
            onClick={() => navigate(`/learn/${courseId}/${nextLessonId}`)}
          >
            <span>Bài tiếp</span>
            <ChevronRight size={16} aria-hidden />
          </Button>
        )}
      </div>
    </div>
  )
}
