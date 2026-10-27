import React from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  GraduationCap,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTeacherDashboard } from '@/hooks/useTeacher'
import { StaffMetricCard } from '@/components/ui/StaffMetricCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import './TeacherPages.css'
import '../Admin/AdminPages.css'

export const TeacherDashboardPage: React.FC = () => {
  const { data, loading, error, refresh } = useTeacherDashboard()

  if (error) {
    return (
      <PageErrorState
        title="Không thể kết nối máy chủ quản trị."
        description={error}
        onRetry={refresh}
      />
    )
  }

  return (
    <div className="teacher-dashboard-page">
      <div className="staff-page-header">
        <h1 className="staff-page-title">Bàn làm việc Giáo viên</h1>
        <p className="staff-page-desc">
          Theo dõi tiến độ học tập các lớp, giao nhiệm vụ và hỗ trợ học sinh kịp thời.
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
              label="Lớp phụ trách"
              value={data?.classesCount || 0}
              context="3 lớp phân công giảng dạy"
              icon={GraduationCap}
            />
            <StaffMetricCard
              label="Tổng số học sinh"
              value={data?.studentsCount || 0}
              context="Học sinh đang theo dõi"
              icon={Users}
            />
            <StaffMetricCard
              label="Bài tập đang giao"
              value={data?.activeAssignmentsCount || 0}
              context="Hạn nộp trong 7 ngày tới"
              icon={CheckSquare}
            />
            <StaffMetricCard
              label="Cần quan tâm"
              value={data?.studentsNeedingAttentionCount || 0}
              context="Chậm tiến độ hoặc điểm thấp"
              icon={AlertTriangle}
              trend={{ value: 'Cần nhắc nhở', isPositive: false }}
            />
          </>
        )}
      </div>

      {/* Split Grid */}
      <div className="staff-split-grid">
        {/* Left: Recent submissions */}
        <div className="staff-card">
          <div className="staff-card-header">
            <h2 className="staff-card-title">Bài làm thu hoạch nộp gần đây</h2>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton height={44} />
                <Skeleton height={44} />
                <Skeleton height={44} />
              </div>
            ) : data?.recentSubmissions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Chưa có bài nộp nào mới.</p>
            ) : (
              <div className="staff-table-wrapper" style={{ border: 'none' }}>
                <table className="staff-table" aria-label="Bài làm nộp gần đây">
                  <thead>
                    <tr>
                      <th scope="col">Học sinh</th>
                      <th scope="col">Lớp</th>
                      <th scope="col">Bài tập</th>
                      <th scope="col" style={{ textAlign: 'center' }}>Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentSubmissions.map((sub) => (
                      <tr key={sub.id}>
                        <td style={{ fontWeight: 600 }}>{sub.studentName}</td>
                        <td>{sub.className}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{sub.assignmentTitle}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: sub.score >= 80 ? '#047857' : '#b45309',
                            }}
                          >
                            {sub.score}/100
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
          <div className="staff-card-header">
            <h2 className="staff-card-title">Học sinh cần chú ý</h2>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <Skeleton height={80} />
            ) : (
              <div className="staff-attention-list">
                {data?.attentionStudents.map((st) => (
                  <Link
                    key={st.id}
                    to={`/teacher/students/${st.id}`}
                    className="staff-attention-item severity-medium"
                  >
                    <div className="staff-attention-header">
                      <span className="staff-attention-title">{st.name} ({st.className})</span>
                      <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <p className="staff-attention-desc">{st.reason}</p>
                    <span className="staff-attention-time">{st.lastActive}</span>
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
