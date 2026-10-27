import React from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useTeacherClassDetail } from '@/hooks/useTeacher'
import { Progress } from '@/components/ui/Progress'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import './TeacherPages.css'
import '../Admin/AdminPages.css'

export const TeacherClassDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { classInfo, students, loading, error, refresh } = useTeacherClassDetail(
    id || ''
  )

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Skeleton height={32} width={240} style={{ marginBottom: 16 }} />
        <Skeleton height={300} />
      </div>
    )
  }

  if (error || !classInfo) {
    return (
      <PageErrorState
        title="Không thể kết nối máy chủ quản trị."
        description={error || 'Không tìm thấy lớp'}
        onRetry={refresh}
      />
    )
  }

  return (
    <div className="teacher-class-detail-page">
      <div style={{ marginBottom: 16 }}>
        <Link
          to="/teacher/classes"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.88rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách lớp</span>
        </Link>
      </div>

      <div className="staff-page-header">
        <h1 className="staff-page-title">{classInfo.name}</h1>
        <p className="staff-page-desc">
          {classInfo.grade} • Môn {classInfo.subject} • Sĩ số: {students.length} học sinh • Tiến độ trung bình: {classInfo.averageProgress}%
        </p>
      </div>

      <div className="staff-table-wrapper">
        <table className="staff-table" aria-label={`Danh sách học sinh ${classInfo.name}`}>
          <thead>
            <tr>
              <th scope="col">Học sinh</th>
              <th scope="col" style={{ width: '180px' }}>Tiến độ</th>
              <th scope="col" style={{ textAlign: 'center' }}>Bài hoàn thành</th>
              <th scope="col" style={{ textAlign: 'center' }}>Thu hoạch gần nhất</th>
              <th scope="col">Hoạt động cuối</th>
              <th scope="col">Trạng thái</th>
              <th scope="col" style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st) => (
              <tr key={st.id}>
                <td>
                  <div className="staff-user-cell">
                    <div className="staff-avatar-sm" aria-hidden="true">
                      {st.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="staff-user-name">{st.name}</div>
                      <div className="staff-user-email">{st.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Progress value={st.progress} size="sm" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '32px' }}>
                      {st.progress}%
                    </span>
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>
                  {st.lessonsCompleted}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: st.latestScore >= 80 ? '#047857' : st.latestScore >= 60 ? '#b45309' : '#dc2626',
                    }}
                  >
                    {st.latestScore}/100
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {new Date(st.lastActive).toLocaleDateString('vi-VN')}
                </td>
                <td>
                  <StatusBadge status={st.status} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <Link
                    to={`/teacher/students/${st.id}`}
                    className="staff-action-link"
                    aria-label={`Xem hồ sơ học tập của ${st.name}`}
                  >
                    <span>Học bạ</span>
                    <ArrowRight size={13} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
