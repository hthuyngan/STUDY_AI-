import React from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTeacherClasses } from '@/hooks/useTeacher'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import './TeacherPages.css'
import '../Admin/AdminPages.css'

export const TeacherClassesPage: React.FC = () => {
  const { classes, loading, error, refresh } = useTeacherClasses()

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
    <div className="teacher-classes-page">
      <div className="staff-page-header">
        <h1 className="staff-page-title">Danh sách lớp học</h1>
        <p className="staff-page-desc">
          Các lớp học được phân công giảng dạy môn Toán trong học kỳ hiện tại.
        </p>
      </div>

      <div className="teacher-classes-grid">
        {loading ? (
          <>
            <Skeleton height={140} />
            <Skeleton height={140} />
            <Skeleton height={140} />
          </>
        ) : (
          classes.map((cls) => (
            <Link
              key={cls.id}
              to={`/teacher/classes/${cls.id}`}
              className="teacher-class-card"
            >
              <div className="teacher-class-header">
                <div>
                  <h2 className="teacher-class-name">{cls.name}</h2>
                  <span className="teacher-class-subject">{cls.grade} • {cls.subject}</span>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tiến độ học trung bình</span>
                  <strong style={{ color: 'var(--text-main)' }}>{cls.averageProgress}%</strong>
                </div>
                <Progress value={cls.averageProgress} size="sm" />
              </div>

              <div className="teacher-class-meta">
                <span>
                  Sĩ số: <strong>{cls.studentCount}</strong> học sinh
                </span>
                <span>
                  Bài tập: <strong>{cls.activeAssignments}</strong> đang giao
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
