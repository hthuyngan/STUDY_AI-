import { Check, Circle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StickerIllustration } from '@/components/ui/StickerIllustration'
import type { WeeklyPlanDay } from '@/types/dashboard'

export interface WeeklyPlanCardProps {
  plan?: WeeklyPlanDay[]
}

const DEFAULT_PLAN: WeeklyPlanDay[] = [
  { id: 'wp-1', day: 'T2', status: 'completed', subject: 'Toán' },
  { id: 'wp-2', day: 'T3', status: 'completed', subject: 'Vật lý' },
  { id: 'wp-3', day: 'T4', status: 'completed', subject: 'Anh' },
  { id: 'wp-4', day: 'T5', status: 'completed', subject: 'Hóa' },
  { id: 'wp-5', day: 'T6', status: 'completed', subject: 'Toán' },
  { id: 'wp-6', day: 'T7', status: 'current', subject: 'Quiz' },
  { id: 'wp-7', day: 'CN', status: 'upcoming', subject: 'Review' },
]

export function WeeklyPlanCard({ plan = DEFAULT_PLAN }: WeeklyPlanCardProps) {
  const completedCount = plan.filter((p) => p.status === 'completed').length
  const totalCount = plan.length

  const headerAction = (
    <div className="weekly-plan-header-action">
      <span className="weekly-plan-badge">{completedCount} / {totalCount} hoàn thành</span>
      <StickerIllustration name="goal" size="sm" decorative className="weekly-plan-sticker" />
    </div>
  )

  return (
    <Card
      title="Lộ trình tuần này"
      subtitle="Kế hoạch phân bổ môn học theo từng ngày trong tuần"
      action={headerAction}
      className="weekly-plan-card"
    >
      <div className="weekly-plan-notebook-row" role="region" aria-label="Lịch trình học 7 ngày trong tuần">
        {plan.map((item) => {
          const isDone = item.status === 'completed'
          const isCurrent = item.status === 'current'
          let statusModifier = 'is-upcoming'
          if (isDone) statusModifier = 'is-completed'
          if (isCurrent) statusModifier = 'is-current'

          return (
            <div key={item.id} className={`weekly-plan-col ${statusModifier}`}>
              <span className="plan-day-name">{item.day}</span>

              <div className="plan-status-marker" aria-label={isDone ? 'Đã hoàn thành' : isCurrent ? 'Hôm nay' : 'Sắp tới'}>
                {isDone ? (
                  <Check size={16} className="plan-check-icon" aria-hidden="true" />
                ) : isCurrent ? (
                  <span className="plan-current-dot" aria-hidden="true" />
                ) : (
                  <Circle size={14} className="plan-pending-icon" aria-hidden="true" />
                )}
              </div>

              <span className="plan-subject-name">{item.subject}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default WeeklyPlanCard
