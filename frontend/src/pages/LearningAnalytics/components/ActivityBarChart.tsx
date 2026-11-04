import React from 'react'
import type { DailyActivityMetric } from '@/types/analytics'

interface ActivityBarChartProps {
  activities: DailyActivityMetric[]
  todayDateStr?: string
}

export const ActivityBarChart: React.FC<ActivityBarChartProps> = ({
  activities,
  todayDateStr,
}) => {
  const maxEvents = Math.max(1, ...activities.map((a) => a.eventCount))
  const today = todayDateStr || activities[activities.length - 1]?.date

  return (
    <div className="activity-chart-box">
      <div className="chart-header-row">
        <div>
          <h3 className="chart-heading">Nhịp điệu học tập 7 ngày qua</h3>
          <p className="chart-subtext">
            Dựa trên nhật ký sự kiện học tập thực tế (đọc lý thuyết, nộp bài thu hoạch, ôn tập ngắt quãng).
          </p>
        </div>
        <div className="chart-legend">
          <span className="legend-indicator active" /> Có hoạt động
          <span className="legend-indicator empty" /> Không có hoạt động
        </div>
      </div>

      <div className="chart-bars-container" role="region" aria-label="Biểu đồ hoạt động 7 ngày">
        {activities.map((act) => {
          const heightPct = act.eventCount > 0 ? Math.max(16, Math.round((act.eventCount / maxEvents) * 100)) : 6
          const isToday = act.date === today

          return (
            <div key={act.date} className={`chart-col ${isToday ? 'is-today' : ''}`}>
              <div className="col-bar-track">
                <div
                  className={`col-bar-fill ${act.hasActivity ? 'active' : 'empty'}`}
                  style={{ height: `${heightPct}%` }}
                  title={`${act.date}: ${act.eventCount} sự kiện (${act.studyTimeMinutes} phút học)`}
                  aria-label={`${act.dayLabel} (${act.date}): ${act.eventCount} sự kiện, ${act.studyTimeMinutes} phút`}
                >
                  {act.eventCount > 0 && <span className="bar-val-tooltip">{act.eventCount}</span>}
                </div>
              </div>
              <span className="col-label-day">{act.dayLabel}</span>
              <span className="col-label-date">{act.date.slice(5)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
