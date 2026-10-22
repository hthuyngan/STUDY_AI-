import { Award, Bot, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import './LessonBottomBar.css'

export interface LessonBottomBarProps {
  lessonId: string
  lessonTitle: string
  courseId?: string
  subjectId?: string
  previousLessonId?: string
  nextLessonId?: string
  isCompleted?: boolean
  isAssessmentCompleted?: boolean
  onOpenAssessment?: () => void
}

export function LessonBottomBar({
  courseId,
  subjectId,
  lessonId,
  lessonTitle,
  previousLessonId,
  nextLessonId,
  isAssessmentCompleted,
  onOpenAssessment,
}: LessonBottomBarProps) {
  const navigate = useNavigate()

  const activeSubjectId =
    subjectId ||
    (courseId?.startsWith('phy')
      ? 'physics'
      : courseId?.startsWith('chem')
        ? 'chemistry'
        : courseId?.startsWith('eng')
          ? 'english'
          : 'math')

  const handleAskAI = () => {
    navigate(`/ai-tutor?lesson=${lessonId}&topic=${encodeURIComponent(lessonTitle)}`)
  }

  return (
    <div className="lesson-bottom-bar" role="toolbar" aria-label="Điều hướng bài học">
      {/* LEFT: Bài trước */}
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

      {/* CENTER: Hỏi AI về bài này */}
      <div className="bottom-bar-center">
        <Button
          variant="outline"
          icon={Bot}
          onClick={handleAskAI}
          className="ask-ai-btn"
        >
          Hỏi AI về bài này
        </Button>
      </div>

      {/* RIGHT: Primary CTA (Làm bài tập thu hoạch) & Bài tiếp */}
      <div className="bottom-bar-right">
        {onOpenAssessment && (
          <Button
            variant={isAssessmentCompleted ? 'outline' : 'primary'}
            icon={Award}
            onClick={onOpenAssessment}
            className="assessment-primary-cta"
          >
            {isAssessmentCompleted ? 'Bài tập thu hoạch' : 'Làm bài tập thu hoạch'}
          </Button>
        )}

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
