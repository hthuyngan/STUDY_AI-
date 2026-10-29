import React from 'react'

export interface TeacherSummaryKPIs {
  totalTeachers: number
  activeTeaching: number
  pendingOrLeave: number
  newTeachers: number
}

export interface TeacherSummaryStripProps {
  kpis: TeacherSummaryKPIs
}

export const TeacherSummaryStrip: React.FC<TeacherSummaryStripProps> = ({ kpis }) => {
  return (
    <div className="teacher-summary-strip" role="region" aria-label="Thống kê nhanh đội ngũ giáo viên">
      <div className="teacher-strip-item">
        <span className="teacher-strip-dot" style={{ backgroundColor: 'var(--navy-primary, #102a43)' }} />
        <div className="teacher-strip-content">
          <span className="teacher-strip-val">{kpis.totalTeachers.toLocaleString()}</span>
          <span className="teacher-strip-lbl">Tổng số giáo viên</span>
        </div>
      </div>

      <div className="teacher-strip-item">
        <span className="teacher-strip-dot" style={{ backgroundColor: '#16a34a' }} />
        <div className="teacher-strip-content">
          <span className="teacher-strip-val">{kpis.activeTeaching.toLocaleString()}</span>
          <span className="teacher-strip-lbl">Đang giảng dạy</span>
        </div>
      </div>

      <div className="teacher-strip-item">
        <span className="teacher-strip-dot" style={{ backgroundColor: '#d97706' }} />
        <div className="teacher-strip-content">
          <span className="teacher-strip-val">{kpis.pendingOrLeave.toLocaleString()}</span>
          <span className="teacher-strip-lbl">Tạm nghỉ / Chờ duyệt</span>
        </div>
      </div>

      <div className="teacher-strip-item">
        <span className="teacher-strip-dot" style={{ backgroundColor: '#0284c7' }} />
        <div className="teacher-strip-content">
          <span className="teacher-strip-val">{kpis.newTeachers.toLocaleString()}</span>
          <span className="teacher-strip-lbl">Giáo viên mới (30 ngày)</span>
        </div>
      </div>
    </div>
  )
}
