import { Flame } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StickerIllustration } from '@/components/ui/StickerIllustration'

export interface CalendarStreakCardProps {
  streakDays?: number
  learnedDaysCount?: number
}

export function CalendarStreakCard({
  streakDays = 12,
  learnedDaysCount = 5,
}: CalendarStreakCardProps) {
  // Calendar days grid for October 2026 (or mock current month)
  // 31 days in October; day 19 is active today
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1)
  const todayDate = 19
  // Active study days in this month
  const studiedDates = new Set([2, 5, 6, 8, 9, 12, 13, 14, 15, 16, 17, 18, 19])

  // Weekdays header
  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

  // 7 days of current week streak dots (T2 to CN)
  const currentWeekDots = [
    { day: 'T2', completed: true },
    { day: 'T3', completed: true },
    { day: 'T4', completed: true },
    { day: 'T5', completed: true },
    { day: 'T6', completed: true },
    { day: 'T7', completed: false },
    { day: 'CN', completed: false },
  ]

  const headerAction = (
    <StickerIllustration
      name="calendar"
      size="sm"
      decorative
      className="calendar-header-sticker"
    />
  )

  return (
    <Card
      title="Tháng 10, 2026"
      subtitle="Lịch học tập cá nhân"
      action={headerAction}
      className="calendar-streak-card"
    >
      {/* Mini Calendar Grid */}
      <div className="mini-calendar-container" aria-label="Lịch tháng 10 năm 2026">
        <div className="calendar-weekdays-row" aria-hidden="true">
          {weekDays.map((wd) => (
            <span key={wd} className="weekday-col-header">
              {wd}
            </span>
          ))}
        </div>

        <div className="calendar-days-grid" role="grid" aria-label="Các ngày trong tháng">
          {/* Day 1 starts on Thursday (offset 3 days for T2, T3, T4) */}
          <span className="calendar-empty-cell" aria-hidden="true" />
          <span className="calendar-empty-cell" aria-hidden="true" />
          <span className="calendar-empty-cell" aria-hidden="true" />

          {daysInMonth.map((day) => {
            const isToday = day === todayDate
            const hasStudied = studiedDates.has(day)
            let cellClass = 'calendar-day-cell'
            if (isToday) cellClass += ' is-today'
            if (hasStudied) cellClass += ' has-studied'

            return (
              <div
                key={day}
                className={cellClass}
                aria-label={`Ngày ${day} tháng 10${isToday ? ' (Hôm nay)' : ''}${hasStudied ? ' (Đã học)' : ''}`}
              >
                <span className="day-number">{day}</span>
                {hasStudied && <span className="studied-dot" aria-hidden="true" />}
              </div>
            )
          })}
        </div>
      </div>

      <div className="calendar-card-divider" aria-hidden="true" />

      {/* Streak Section inside the same card */}
      <div className="streak-embed-section">
        <div className="streak-header-row">
          <div className="streak-title-wrap">
            <Flame size={18} className="streak-fire-icon" aria-hidden="true" />
            <span className="streak-heading">Chuỗi học tập</span>
          </div>
          <span className="streak-days-badge">{streakDays} ngày liên tiếp</span>
        </div>

        <div className="streak-dots-row" aria-label="Tiến độ học tuần này">
          {currentWeekDots.map((dot) => (
            <div
              key={dot.day}
              className={`streak-dot-item ${dot.completed ? 'is-completed' : 'is-pending'}`}
              title={`${dot.day}: ${dot.completed ? 'Đã học' : 'Chưa học'}`}
            >
              <span className="streak-dot-circle" aria-hidden="true" />
              <span className="streak-dot-day">{dot.day}</span>
            </div>
          ))}
        </div>

        <p className="streak-summary-text">
          Đã học <strong>{learnedDaysCount}/7 ngày</strong> tuần này. Giữ vững phong độ!
        </p>
      </div>
    </Card>
  )
}

export default CalendarStreakCard
