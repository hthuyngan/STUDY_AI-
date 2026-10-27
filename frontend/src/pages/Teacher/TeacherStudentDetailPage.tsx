import React from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useStudentAcademicDetail } from '@/hooks/useTeacher'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import './TeacherPages.css'
import '../Admin/AdminPages.css'

export const TeacherStudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { student, loading, error, refresh } = useStudentAcademicDetail(id || '')

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Skeleton height={32} width={240} style={{ marginBottom: 16 }} />
        <Skeleton height={260} />
      </div>
    )
  }

  if (error || !student) {
    return <PageErrorState description={error || 'Không tìm thấy hồ sơ học sinh'} onRetry={refresh} />
  }

  return (
    <div className="teacher-student-detail-page">
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
          <span>Quay lại lớp học</span>
        </Link>
      </div>

      <div className="staff-detail-grid">
        {/* Left: Academic Profile Summary */}
        <div className="staff-profile-card">
          <div className="staff-profile-avatar-lg">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <h2 className="staff-profile-name">{student.name}</h2>
          <div className="staff-profile-email">{student.email}</div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            {student.grade} • {student.className}
          </div>

          <div className="staff-profile-meta-list">
            <div className="staff-profile-meta-row">
              <span className="staff-profile-meta-label">Tổng thời gian học:</span>
              <span className="staff-profile-meta-val">
                {Math.floor(student.totalLearningMinutes / 60)}h {student.totalLearningMinutes % 60}p
              </span>
            </div>
            <div className="staff-profile-meta-row">
              <span className="staff-profile-meta-label">Tiến độ tổng quát:</span>
              <span className="staff-profile-meta-val">{student.overallProgress}%</span>
            </div>
            <div className="staff-profile-meta-row">
              <span className="staff-profile-meta-label">Điểm thu hoạch TB:</span>
              <span className="staff-profile-meta-val">{student.averageAssessmentScore}/100</span>
            </div>
          </div>
        </div>

        {/* Right: Detailed Academic Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Weak Areas */}
          {student.weakAreas.length > 0 && (
            <div className="staff-card" style={{ borderColor: 'rgba(220, 38, 38, 0.3)' }}>
              <div className="staff-card-header" style={{ background: 'rgba(220, 38, 38, 0.04)' }}>
                <h3 className="staff-card-title" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} />
                  <span>Chủ đề cần cải thiện & củng cố kiến thức</span>
                </h3>
              </div>
              <div className="staff-card-body">
                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {student.weakAreas.map((w, idx) => (
                    <li key={idx} style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Recent Lessons */}
          <div className="staff-card">
            <div className="staff-card-header">
              <h3 className="staff-card-title">Bài học tham gia gần đây</h3>
            </div>
            <div className="staff-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {student.recentLessons.map((l) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{l.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Hoạt động: {new Date(l.lastActive).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div style={{ width: '120px' }}>
                      <Progress value={l.progress} size="sm" />
                      <div style={{ fontSize: '0.75rem', textAlign: 'right', marginTop: 2 }}>{l.progress}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Assessment Attempts */}
          <div className="staff-card">
            <div className="staff-card-header">
              <h3 className="staff-card-title">Kết quả bài kiểm tra thu hoạch</h3>
            </div>
            <div className="staff-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {student.assessmentAttempts.map((att) => (
                  <div
                    key={att.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--bg-main)',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{att.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(att.date).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: att.passed ? '#047857' : '#dc2626' }}>
                        {att.score}/100
                      </span>
                      {att.passed ? (
                        <CheckCircle2 size={16} color="#047857" />
                      ) : (
                        <AlertCircle size={16} color="#dc2626" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
