import React from 'react'
import { ArrowRight, BookOpen, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { usePersonalization } from '@/hooks/usePersonalization'
import { resolveSubjectId } from '@/lib/subjectResolver'

export const AdaptiveLearningWidget: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: personalizationData } = usePersonalization()

  const path = personalizationData?.learningPath
  const nextStep = path?.steps?.find((s) => !s.isCompleted) || path?.steps?.[0]
  const userGradeLabel = user?.grade ? `Toán ${user.grade}` : 'Toán học'
  const defaultSubjectId = resolveSubjectId({ grade: user?.grade }) || 'sub_math10'

  const handleStartNextLesson = () => {
    if (nextStep) {
      if (nextStep.targetRoute) {
        navigate(nextStep.targetRoute)
      } else if (nextStep.lessonId) {
        const subjectId = (nextStep as any).subjectId || defaultSubjectId
        navigate(`/subjects/${subjectId}/lessons/${nextStep.lessonId}`)
      } else {
        navigate('/subjects')
      }
    } else {
      navigate('/subjects')
    }
  }

  return (
    <Card
      title="Học gì tiếp theo"
      subtitle="Đề xuất cá nhân hóa từ năng lực thực tế"
      action={
        <button
          type="button"
          className="card-link-action"
          onClick={() => navigate('/subjects')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <span>Khám phá môn học</span>
          <ArrowRight size={14} aria-hidden />
        </button>
      }
      className="adaptive-learning-widget"
    >
      <div style={{ padding: '16px' }}>
        {nextStep ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
              borderRadius: '8px',
              border: '1px solid #BFDBFE',
            }}
          >
            <div style={{ flex: 1, minWidth: 0, marginRight: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: '#DBEAFE',
                    color: '#1D4ED8',
                  }}
                >
                  {nextStep.badgeText || 'Đề xuất tối ưu'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Bước {nextStep.stepNumber} · {userGradeLabel}
                </span>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
                {nextStep.title}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
                {nextStep.objective || nextStep.reason || 'Củng cố kiến thức trọng tâm và làm bài tập trắc nghiệm vận dụng.'}
              </p>
            </div>

            <Button
              variant="primary"
              icon={Play}
              onClick={handleStartNextLesson}
              style={{ flexShrink: 0 }}
            >
              Học ngay
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={20} style={{ color: '#2563EB' }} />
              <span style={{ fontSize: '0.9rem', color: '#334155' }}>
                Chọn một môn học trong chương trình để hệ thống xây dựng lộ trình tiếp theo.
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/subjects')}>
              Chọn môn học
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
export default AdaptiveLearningWidget
