import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  GraduationCap,
  Users,
  Award,
  BookOpen,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type {
  AdminClassItem,
  AdminLearningAlert,
  AdminSubmissionItem,
} from '@/types/classroom'
import { StaffMetricCard } from '@/components/ui/StaffMetricCard'
import { Skeleton } from '@/components/ui/Skeleton'
import './TeacherPages.css'
import '../Admin/AdminPages.css'

export const TeacherDashboardPage: React.FC = () => {
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([])
  const [alerts, setAlerts] = useState<AdminLearningAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      classroomService.getClasses(),
      classroomService.getSubmissions(),
      classroomService.getAlerts(),
    ])
      .then(([clsList, subsList, alertsList]) => {
        if (!active) return
        setClasses(clsList)
        setSubmissions(subsList)
        setAlerts(alertsList)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)
  const pendingSubs = submissions.filter((s) => s.status === 'pending')
  const activeAlerts = alerts.filter((a) => a.status !== 'resolved')

  return (
    <div className="teacher-dashboard-page">
      <div className="staff-page-header">
        <h1 className="staff-page-title">Bàn làm việc Giáo viên</h1>
        <p className="staff-page-desc">
          Theo dõi tiến độ học tập các lớp, giao bài tập nhiệm vụ và can thiệp hỗ trợ học sinh kịp thời.
        </p>
      </div>

      {/* 4 Compact Metrics */}
      <div className="staff-metric-grid">
        {loading ? (
          <>
            <Skeleton height={96} />
            <Skeleton height={96} />
            <Skeleton height={96} />
            <Skeleton height={96} />
          </>
        ) : (
          <>
            <StaffMetricCard
              label="Lớp học phụ trách"
              value={classes.length}
              context={`${classes.length} lớp đang giảng dạy`}
              icon={GraduationCap}
            />
            <StaffMetricCard
              label="Tổng số học sinh"
              value={totalStudents}
              context="Học sinh đang theo dõi"
              icon={Users}
            />
            <StaffMetricCard
              label="Bài nộp chờ chấm"
              value={pendingSubs.length}
              context="Cần phản hồi kết quả"
              icon={CheckSquare}
            />
            <StaffMetricCard
              label="Cảnh báo cần can thiệp"
              value={activeAlerts.length}
              context="Chậm tiến độ hoặc điểm thấp"
              icon={AlertTriangle}
              trend={{ value: `${activeAlerts.length} học sinh`, isPositive: false }}
            />
          </>
        )}
      </div>

      {/* Quick Action Navigation Buttons */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          margin: '20px 0',
        }}
      >
        <Link to="/teacher/classes" className="btn btn-secondary">
          <GraduationCap size={16} /> Danh sách lớp học
        </Link>
        <Link to="/teacher/students" className="btn btn-secondary">
          <Users size={16} /> Danh sách học viên
        </Link>
        <Link to="/teacher/assignments" className="btn btn-secondary">
          <BookOpen size={16} /> Quản lý bài tập
        </Link>
        <Link to="/teacher/grades" className="btn btn-secondary">
          <Award size={16} /> Sổ điểm lớp học
        </Link>
        <Link to="/teacher/alerts" className="btn btn-secondary">
          <AlertTriangle size={16} /> Cảnh báo học tập
        </Link>
      </div>

      {/* Split Grid */}
      <div className="staff-split-grid">
        {/* Left: Recent submissions */}
        <div className="staff-card">
          <div className="staff-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="staff-card-title">Bài làm thu hoạch nộp gần đây</h2>
            <Link to="/teacher/assignments" style={{ fontSize: '0.85rem', color: '#102A43', textDecoration: 'none', fontWeight: 600 }}>
              Xem tất cả &rarr;
            </Link>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton height={44} />
                <Skeleton height={44} />
                <Skeleton height={44} />
              </div>
            ) : submissions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Chưa có bài nộp nào mới.</p>
            ) : (
              <div className="staff-table-wrapper" style={{ border: 'none' }}>
                <table className="staff-table" aria-label="Bài làm nộp gần đây">
                  <thead>
                    <tr>
                      <th scope="col">Học sinh</th>
                      <th scope="col">Bài tập</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col" style={{ textAlign: 'center' }}>Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.slice(0, 5).map((sub) => (
                      <tr key={sub.id}>
                        <td style={{ fontWeight: 600 }}>
                          <Link to={`/teacher/students/${sub.studentId}`} style={{ color: '#102A43', textDecoration: 'none' }}>
                            {sub.studentName}
                          </Link>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{sub.assignmentTitle}</td>
                        <td>
                          <span className={`badge ${sub.status === 'graded' ? 'badge-success' : 'badge-warning'}`}>
                            {sub.status === 'graded' ? 'Đã chấm' : 'Chờ chấm'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: sub.score !== undefined && sub.score >= 8 ? '#047857' : '#b45309',
                            }}
                          >
                            {sub.score !== undefined ? `${sub.score}/10` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Students needing attention */}
        <div className="staff-card">
          <div className="staff-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="staff-card-title">Cảnh báo học sinh cần can thiệp</h2>
            <Link to="/teacher/alerts" style={{ fontSize: '0.85rem', color: '#102A43', textDecoration: 'none', fontWeight: 600 }}>
              Xem tất cả &rarr;
            </Link>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <Skeleton height={80} />
            ) : activeAlerts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Không có học sinh nào bị cảnh báo.</p>
            ) : (
              <div className="staff-attention-list">
                {activeAlerts.slice(0, 4).map((alr) => (
                  <Link
                    key={alr.id}
                    to={`/teacher/students/${alr.studentId}`}
                    className={`staff-attention-item ${alr.severity === 'high' ? 'severity-high' : 'severity-medium'}`}
                  >
                    <div className="staff-attention-header">
                      <span className="staff-attention-title">
                        {alr.studentName} ({alr.className})
                      </span>
                      <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <p className="staff-attention-desc">{alr.reason}</p>
                    <span className="staff-attention-time">{new Date(alr.detectedAt).toLocaleDateString('vi-VN')}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
