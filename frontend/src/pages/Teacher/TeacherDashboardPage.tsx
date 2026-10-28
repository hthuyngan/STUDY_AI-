import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  GraduationCap,
  Users,
  Plus,
  BookOpen,
  Calendar,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type {
  AdminAssignmentItem,
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
  const [assignments, setAssignments] = useState<AdminAssignmentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      classroomService.getClasses(),
      classroomService.getSubmissions(),
      classroomService.getAlerts(),
      classroomService.getAssignments(),
    ])
      .then(([clsList, subsList, alertsList, asgList]) => {
        if (!active) return
        setClasses(clsList)
        setSubmissions(subsList)
        setAlerts(alertsList)
        setAssignments(asgList)
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
  const activeAssignments = assignments.filter((a) => a.status === 'active')

  return (
    <div className="teacher-dashboard-page">
      {/* Header */}
      <div className="staff-page-header">
        <div className="admin-prototype-badge">
          <span className="prototype-dot"></span>
          <span>TEACHER WORKSPACE • BÀN LÀM VIỆC</span>
        </div>
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Bàn làm việc Giáo viên</h1>
            <p className="staff-page-desc">
              Tổng quan tình hình giảng dạy, quản lý lớp học, theo dõi bài tập và hỗ trợ học sinh kịp thời.
            </p>
          </div>
          <div className="admin-header-actions">
            <Link to="/teacher/assignments/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              <span>Giao bài tập mới</span>
            </Link>
          </div>
        </div>
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
              label="Bài tập đang mở"
              value={activeAssignments.length}
              context="Đang trong thời hạn nộp"
              icon={BookOpen}
            />
            <StaffMetricCard
              label="Cần can thiệp hỗ trợ"
              value={activeAlerts.length}
              context="Cảnh báo tiến độ / điểm thấp"
              icon={AlertTriangle}
              trend={{ value: `${activeAlerts.length} học sinh`, isPositive: false }}
            />
          </>
        )}
      </div>

      {/* Main Operational Row 1: Classes Overview & Students Needing Attention */}
      <div className="teacher-split-grid" style={{ marginTop: 24 }}>
        {/* Classes Overview */}
        <div className="staff-card">
          <div className="staff-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="staff-card-title">Lớp học phụ trách & Tiến độ</h2>
            <Link to="/teacher/classes" className="teacher-card-link">
              Xem tất cả lớp ({classes.length}) &rarr;
            </Link>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton height={48} />
                <Skeleton height={48} />
                <Skeleton height={48} />
              </div>
            ) : classes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Chưa có lớp học nào được phân công.</p>
            ) : (
              <div className="teacher-compact-classes-list">
                {classes.slice(0, 4).map((cls) => (
                  <div key={cls.id} className="teacher-compact-class-item">
                    <div className="teacher-class-item-info">
                      <Link to={`/teacher/classes/${cls.id}`} className="teacher-class-item-name">
                        {cls.name}
                      </Link>
                      <div className="teacher-class-item-meta">
                        <span>{cls.grade}</span>
                        <span>•</span>
                        <span>Phòng {cls.room}</span>
                        <span>•</span>
                        <span>{cls.studentCount}/{cls.maxStudents} HS</span>
                      </div>
                    </div>
                    <div className="teacher-class-item-stats">
                      <div className="teacher-progress-inline">
                        <div className="teacher-progress-track">
                          <div
                            className="teacher-progress-fill"
                            style={{
                              width: `${cls.averageProgress}%`,
                              backgroundColor: cls.averageProgress < 60 ? '#dc2626' : '#10b981',
                            }}
                          />
                        </div>
                        <span className="teacher-progress-text">{cls.averageProgress}%</span>
                      </div>
                      <span className="teacher-score-pill">
                        ĐTB: <strong>{cls.averageScore.toFixed(1)}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Students Needing Attention */}
        <div className="staff-card">
          <div className="staff-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="staff-card-title">Học sinh cần chú ý can thiệp</h2>
            <Link to="/teacher/alerts" className="teacher-card-link">
              Hàng đợi xử lý ({activeAlerts.length}) &rarr;
            </Link>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <Skeleton height={120} />
            ) : activeAlerts.length === 0 ? (
              <div className="teacher-empty-quiet">
                <CheckSquare size={20} color="#047857" style={{ marginBottom: 6 }} />
                <p style={{ margin: 0, fontWeight: 500, color: '#102a43' }}>Tất cả học sinh đều đang học tập tốt!</p>
                <span style={{ fontSize: '0.8rem', color: '#627d98' }}>Không có cảnh báo trễ hạn hoặc điểm kém nào.</span>
              </div>
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
                        {alr.studentName} <span style={{ fontWeight: 400, color: '#627d98' }}>({alr.className})</span>
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

      {/* Main Operational Row 2: Assignments Due & Recent Submissions */}
      <div className="teacher-split-grid" style={{ marginTop: 24 }}>
        {/* Assignments Due */}
        <div className="staff-card">
          <div className="staff-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="staff-card-title">Bài tập đang mở & Sắp đến hạn</h2>
            <Link to="/teacher/assignments" className="teacher-card-link">
              Xem tất cả ({assignments.length}) &rarr;
            </Link>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton height={44} />
                <Skeleton height={44} />
              </div>
            ) : assignments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Chưa có bài tập nào được tạo.</p>
            ) : (
              <div className="teacher-compact-assignments-list">
                {assignments.slice(0, 4).map((asg) => {
                  const rate = asg.totalStudents > 0 ? Math.round((asg.submissionsCount / asg.totalStudents) * 100) : 0
                  return (
                    <div key={asg.id} className="teacher-assignment-row">
                      <div className="teacher-assignment-info">
                        <Link to={`/teacher/assignments/${asg.id}`} className="teacher-assignment-title">
                          {asg.title}
                        </Link>
                        <div className="teacher-assignment-submeta">
                          <span>{asg.className}</span>
                          <span>•</span>
                          <span>{asg.subjectName}</span>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} /> Hạn: {new Date(asg.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                      <div className="teacher-assignment-badge-group">
                        <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                          Nộp: {asg.submissionsCount}/{asg.totalStudents} ({rate}%)
                        </span>
                        <span className={`status-badge ${asg.status === 'active' ? 'status-success' : 'status-default'}`}>
                          {asg.status === 'active' ? 'Đang mở' : 'Đã đóng'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="staff-card">
          <div className="staff-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="staff-card-title">Bài làm nộp gần đây ({pendingSubs.length} chờ chấm)</h2>
            <Link to="/teacher/assignments" className="teacher-card-link">
              Xem sổ chấm &rarr;
            </Link>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                    {submissions.slice(0, 4).map((sub) => (
                      <tr key={sub.id}>
                        <td style={{ fontWeight: 600 }}>
                          <Link to={`/teacher/students/${sub.studentId}`} style={{ color: '#102A43', textDecoration: 'none' }}>
                            {sub.studentName}
                          </Link>
                        </td>
                        <td style={{ color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sub.assignmentTitle}
                        </td>
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
      </div>
    </div>
  )
}
