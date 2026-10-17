import { Check, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { WeeklyGoalData } from '@/types/dashboard'

interface WeeklyGoalCardProps {
  goal: WeeklyGoalData
}

export function WeeklyGoalCard({ goal }: WeeklyGoalCardProps) {
  return (
    <section className="weekly-goal-card" aria-labelledby="weekly-goal-heading">
      <div className="section-header-row">
        <div>
          <h2 id="weekly-goal-heading" className="section-heading-title">
            Mục tiêu tuần
          </h2>
          <p className="weekly-goal-subtitle">
            Học <strong className="font-semibold text-text">{goal.completedDays} / {goal.totalDays} ngày</strong> trong tuần này
          </p>
        </div>

        <Link to="/achievements" className="section-see-all-link">
          <span>Chi tiết</span>
          <ChevronRight size={14} aria-hidden />
        </Link>
      </div>

      <div className="weekly-days-row" role="group" aria-label="Lịch sử các ngày trong tuần">
        {goal.days.map((d) => (
          <div
            key={d.dayLabel}
            className={`weekly-day-cell ${d.completed ? 'is-completed' : ''} ${d.isToday ? 'is-today' : ''}`}
            aria-label={`${d.dayLabel}: ${d.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}${d.isToday ? ' (Hôm nay)' : ''}`}
          >
            <div className="day-indicator-circle">
              {d.completed ? (
                <Check size={14} className="day-check-icon" aria-hidden />
              ) : (
                <span className="day-pending-dot" aria-hidden />
              )}
            </div>
            <span className="day-label-text">{d.dayLabel}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
