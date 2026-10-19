import { CheckCircle2, Circle, Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import type { DailyGoalsData } from '@/types/dashboard'

export interface DailyGoalsCardProps {
  data: DailyGoalsData
}

export function DailyGoalsCard({ data }: DailyGoalsCardProps) {
  const completedCount = data.items.filter((item) => item.completed).length
  const totalCount = data.items.length

  const actionHeader = (
    <span className="daily-goals-count">
      {completedCount} / {totalCount} hoàn thành
    </span>
  )

  const footerContent = (
    <div className="daily-goals-bonus-footer">
      <Zap size={15} className="bonus-zap-icon" aria-hidden />
      <span>Hoàn thành tất cả để nhận <strong>+{data.bonusXP} XP</strong> hôm nay</span>
    </div>
  )

  return (
    <Card
      title="Mục tiêu hôm nay"
      subtitle="Chỉ tiêu rèn luyện hàng ngày"
      action={actionHeader}
      footer={footerContent}
      className="daily-goals-card"
    >
      <div className="daily-goals-list">
        {data.items.map((goal) => {
          const percentage = Math.min(
            Math.round((goal.current / goal.target) * 100),
            100,
          )

          return (
            <div
              key={goal.id}
              className={`daily-goal-item ${goal.completed ? 'completed' : ''}`}
            >
              <div className="goal-item-top">
                <div className="goal-status-title">
                  {goal.completed ? (
                    <CheckCircle2
                      size={16}
                      className="goal-icon-completed"
                      aria-label="Đã hoàn thành"
                    />
                  ) : (
                    <Circle
                      size={16}
                      className="goal-icon-pending"
                      aria-label="Chưa hoàn thành"
                    />
                  )}
                  <span className="goal-title">{goal.title}</span>
                </div>
                <span className="goal-metric">
                  {goal.completed ? '100%' : `${goal.current} / ${goal.target} ${goal.unit}`}
                </span>
              </div>

              <Progress
                value={percentage}
                height={6}
                color={goal.completed ? 'var(--color-success)' : 'var(--color-primary)'}
              />
            </div>
          )
        })}
      </div>

      {/* Weekly Goal Progress */}
      <div className="weekly-goal-section">
        <div className="weekly-goal-header">
          <span className="weekly-goal-title">Mục tiêu tuần</span>
          <span className="weekly-goal-badge">5 / 7 ngày</span>
        </div>
        <div className="weekly-days-row">
          {[
            { day: 'T2', done: true },
            { day: 'T3', done: true },
            { day: 'T4', done: true },
            { day: 'T5', done: true },
            { day: 'T6', done: true },
            { day: 'T7', done: false },
            { day: 'CN', done: false },
          ].map((d) => (
            <div key={d.day} className={`weekly-day-box ${d.done ? 'is-done' : ''}`}>
              <span className="day-name">{d.day}</span>
              <span className="day-mark" aria-hidden>{d.done ? '✓' : '○'}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
