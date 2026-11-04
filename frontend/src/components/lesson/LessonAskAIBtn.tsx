import React from 'react'
import { Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { learningContextService } from '@/services/learningContext.service'
import type { TutorLearningContext } from '@/types/aiTutor'
import './LessonAskAIBtn.css'

export interface LessonAskAIBtnProps {
  lessonId: string
  subjectId: string
  lessonTitle: string
  subjectName: string
  sectionId: string
  sectionTitle: string
  excerpt?: string
}

export const LessonAskAIBtn: React.FC<LessonAskAIBtnProps> = ({
  lessonId,
  subjectId,
  lessonTitle,
  subjectName,
  sectionId,
  sectionTitle,
  excerpt,
}) => {
  const navigate = useNavigate()

  const handleAskAI = (e: React.MouseEvent) => {
    e.stopPropagation()
    const context: TutorLearningContext = {
      source: 'lesson-section',
      lessonId,
      subjectId,
      lessonTitle,
      subjectName,
      sectionId,
      sectionTitle,
      title: sectionTitle,
      excerpt: excerpt ? excerpt.slice(0, 200) : undefined,
      returnUrl: window.location.pathname,
    }

    learningContextService.setContext(context)
    navigate('/ai-tutor')
  }

  return (
    <button
      type="button"
      className="lesson-ask-ai-btn"
      onClick={handleAskAI}
      aria-label={`Hỏi AI về phần ${sectionTitle}`}
      title="Hỏi AI Tutor về phần kiến thức này"
    >
      <Sparkles size={14} className="ask-ai-sparkle-icon" aria-hidden />
      <span className="ask-ai-label">Hỏi AI</span>
    </button>
  )
}
