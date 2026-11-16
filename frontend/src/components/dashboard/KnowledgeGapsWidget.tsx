import React from 'react'
import { ArrowRight, Bot, CheckCircle2, Sparkles, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useKnowledgeGaps } from '@/hooks/useKnowledgeGaps'
import { useAiChat } from '@/context/AiChatContext'
import { learningContextService } from '@/services/learningContext.service'

export const KnowledgeGapsWidget: React.FC = () => {
  const navigate = useNavigate()
  const { openChat } = useAiChat()
  const { gaps, summary } = useKnowledgeGaps()

  const handleAskAI = (gap: any) => {
    const context = {
      source: 'knowledge-gap' as const,
      knowledgeGapId: gap.id,
      subjectId: gap.subjectId,
      subjectName: gap.subjectName,
      lessonId: gap.lessonId,
      lessonTitle: gap.lessonTitle,
      sectionId: gap.sectionId,
      sectionTitle: gap.sectionTitle,
      title: gap.title,
      excerpt: gap.questionPrompt || gap.explanation,
      returnUrl: '/dashboard',
    }
    learningContextService.setContext(context)
    openChat(context, `Em đang yếu phần "${gap.title}". Xin AI Tutor hướng dẫn giải và các bước ôn tập.`)
  }

  const handlePracticeWeakSkills = () => {
    navigate('/practice?tab=mistakes')
  }

  return (
    <Card
      title="Kỹ năng cần cải thiện"
      subtitle={
        summary.totalGaps > 0
          ? `${summary.highPriorityCount} kỹ năng ưu tiên cao · ${summary.totalGaps} điểm cần khắc phục`
          : 'Phát hiện từ kết quả luyện tập & trắc nghiệm'
      }
      action={
        <button
          type="button"
          className="card-link-action"
          onClick={handlePracticeWeakSkills}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <span>Ôn tập ngay</span>
          <ArrowRight size={14} aria-hidden />
        </button>
      }
      isFlushList
      className="knowledge-gaps-widget"
    >
      <div style={{ padding: '16px' }}>
        {gaps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: '#627D98' }}>
            <CheckCircle2 size={32} style={{ color: '#10B981', margin: '0 auto 8px' }} aria-hidden />
            <div style={{ fontWeight: 600, color: '#102A43', marginBottom: 4 }}>
              Không có lỗ hổng kiến thức nghiêm trọng!
            </div>
            <p style={{ fontSize: '0.875rem', margin: '0 0 12px' }}>
              Bạn đang nắm vững các bài học đã học. Hãy làm bài luyện tập mới để tiếp tục thử thách bản thân.
            </p>
            <Button size="sm" variant="outline" icon={Target} onClick={() => navigate('/practice')}>
              Luyện tập thêm
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {gaps.slice(0, 3).map((gap) => (
              <div
                key={gap.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: gap.severity === 'high' ? '#FEE2E2' : '#FEF3C7',
                        color: gap.severity === 'high' ? '#DC2626' : '#D97706',
                      }}
                    >
                      {gap.severity === 'high' ? 'Ưu tiên cao' : 'Cần củng cố'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {gap.subjectName} · {gap.lessonTitle}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#1E293B',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={gap.title}
                  >
                    {gap.title}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Bot}
                    onClick={() => handleAskAI(gap)}
                    title="Nhờ AI Tutor giải thích phương pháp"
                  >
                    Hỏi AI
                  </Button>
                </div>
              </div>
            ))}

            <div style={{ marginTop: '4px' }}>
              <Button
                variant="primary"
                fullWidth
                icon={Sparkles}
                onClick={handlePracticeWeakSkills}
              >
                Luyện tập khắc phục ({gaps.length} kỹ năng)
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
export default KnowledgeGapsWidget
