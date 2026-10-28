import React, { useEffect, useState, useMemo } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  MoveRight,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type {
  AdminClassItem,
  AdminGradeRecord,
  AdminStudentItem,
  AdminSubmissionItem,
} from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './TeacherPages.css'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

type ProfileTab = 'overview' | 'subjects' | 'assignments' | 'grades'

export const TeacherStudentProfilePage: React.FC = () => {
  const { id: paramId, studentId: routeId } = useParams<{ id?: string; studentId?: string }>()
  const studentId = paramId || routeId
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')

  const [student, setStudent] = useState<AdminStudentItem | null>(null)
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([])
  const [grades, setGrades] = useState<AdminGradeRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Move Modal
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [targetClassId, setTargetClassId] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    if (!studentId) return
    setLoading(true)
    Promise.all([
      classroomService.getStudentById(studentId),
      classroomService.getClasses(),
      classroomService.getSubmissions(),
      classroomService.getAllGrades(),
    ])
      .then(([stu, clsList, subList, grdList]) => {
        setStudent(stu)
        setClasses(clsList)
        setSubmissions(subList.filter((s) => s.studentId === studentId))
        setGrades(grdList.filter((g) => g.studentId === studentId))
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!studentId) return
    let active = true
    Promise.all([
      classroomService.getStudentById(studentId),
      classroomService.getClasses(),
      classroomService.getSubmissions(),
      classroomService.getAllGrades(),
    ])
      .then(([stu, clsList, subList, grdList]) => {
        if (active) {
          setStudent(stu)
          setClasses(clsList)
          setSubmissions(subList.filter((s) => s.studentId === studentId))
          setGrades(grdList.filter((g) => g.studentId === studentId))
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [studentId])

  // Handle Move Student
  const handleMoveClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student || !targetClassId) return
    const targetClass = classes.find((c) => c.id === targetClassId)
    if (!targetClass) return

    try {
      await classroomService.moveStudentClass(student.id, targetClass.id, targetClass.name)
      showToast(`Đã chuyển học viên ${student.name} sang lớp ${targetClass.name}`)
      setIsMoveOpen(false)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  // Subjects progress for the student
  const studentSubjects = useMemo(() => {
    if (!student) return []
    return [
      {
        id: 'sub-math-12',
        name: 'Toán học 12',
        lessonsCompleted: student.lessonsCompleted,
        totalLessons: 24,
        progress: student.progress,
        score: student.averageScore,
        status: student.progress >= 70 ? 'Tốt' : 'Cần cố gắng',
      },
      {
        id: 'sub-phys-12',
        name: 'Vật lý 12',
        lessonsCompleted: Math.max(2, student.lessonsCompleted - 4),
        totalLessons: 20,
        progress: Math.max(20, student.progress - 15),
        score: Number((student.averageScore * 0.95).toFixed(1)),
        status: 'Đạt chuẩn',
      },
      {
        id: 'sub-chem-12',
        name: 'Hóa học 12',
        lessonsCompleted: Math.max(3, student.lessonsCompleted - 5),
        totalLessons: 22,
        progress: Math.max(15, student.progress - 20),
        score: Number((student.averageScore * 0.9).toFixed(1)),
        status: 'Đạt chuẩn',
      },
    ]
  }, [student])

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '32px' }}>
        <Skeleton height={40} width={250} />
        <div style={{ marginTop: 24 }}>
          <Skeleton height={200} />
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="admin-page-container">
        <EmptyState
          title="Không tìm thấy học viên"
          description="Hồ sơ học viên không tồn tại trong hệ thống hoặc đã bị xóa."
          actionLabel="Quay lại danh sách học viên"
          onAction={() => window.history.back()}
        />
      </div>
    )
  }

  const initials = student.name
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <div className="admin-page-container">
      {/* Toast */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Header */}
      <div style={{ marginBottom: 16 }}>
        <Link
          to="/teacher/students"
          className="flex items-center gap-1.5 text-sm font-medium text-navy-primary hover:underline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#102a43', fontSize: '0.88rem' }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại Quản lý học viên</span>
        </Link>
      </div>

      {/* Primary Identity Card (Section 26 & 27: Student name is strongest identity, single card surface) */}
      <div className="teacher-profile-hero-card">
        <div className="teacher-profile-hero-left">
          <div className="teacher-profile-avatar">
            {initials}
          </div>
          <div className="teacher-profile-main-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="teacher-profile-name">{student.name}</h1>
              <span className="teacher-code-pill">{student.code}</span>
              <span
                className={`status-badge ${
                  student.status === 'on-track'
                    ? 'status-success'
                    : student.status === 'needs-attention'
                    ? 'status-danger'
                    : 'status-default'
                }`}
              >
                {student.status === 'on-track' ? 'Đang học tốt' : student.status === 'needs-attention' ? 'Cần chú ý' : 'Ngừng hoạt động'}
              </span>
            </div>
            <div className="teacher-profile-sub-meta">
              <span>Lớp: <strong>{student.className}</strong> ({student.grade})</span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Mail size={13} /> {student.email}
              </span>
              {student.phone && (
                <>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={13} /> {student.phone}
                  </span>
                </>
              )}
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Clock size={13} /> Hoạt động: {new Date(student.lastActive).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
        </div>

        <div className="teacher-profile-hero-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setTargetClassId(classes.find((c) => c.id !== student.classId)?.id || '')
              setIsMoveOpen(true)
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <MoveRight size={14} />
            <span>Chuyển lớp</span>
          </button>
        </div>
      </div>

      {/* Compact Metrics Row */}
      <div className="teacher-stats-strip">
        <div className="teacher-stat-strip-box">
          <span className="teacher-strip-label">Tiến độ chung</span>
          <strong className="teacher-strip-value">{student.progress}%</strong>
          <div className="teacher-strip-bar">
            <div style={{ width: `${student.progress}%`, height: '100%', background: '#0284c7' }} />
          </div>
        </div>

        <div className="teacher-stat-strip-box">
          <span className="teacher-strip-label">Điểm trung bình (GPA)</span>
          <strong className="teacher-strip-value" style={{ color: student.averageScore >= 8 ? '#047857' : '#d97706' }}>
            {student.averageScore.toFixed(1)} / 10
          </strong>
          <span className="teacher-strip-sub">
            {student.averageScore >= 8 ? 'Xếp loại Giỏi' : student.averageScore >= 6.5 ? 'Xếp loại Khá' : 'Trung bình'}
          </span>
        </div>

        <div className="teacher-stat-strip-box">
          <span className="teacher-strip-label">Bài học hoàn thành</span>
          <strong className="teacher-strip-value">{student.lessonsCompleted}</strong>
          <span className="teacher-strip-sub">Bài học trong học kỳ</span>
        </div>

        <div className="teacher-stat-strip-box">
          <span className="teacher-strip-label">Thời gian học tập</span>
          <strong className="teacher-strip-value">{Math.round(student.totalLearningMinutes / 60)} giờ</strong>
          <span className="teacher-strip-sub">{student.totalLearningMinutes} phút trên hệ thống</span>
        </div>
      </div>

      {/* Tabs with Horizontal Scroll - NO MULTI-ROW WRAP */}
      <div className="teacher-tabs-container" style={{ marginTop: 20 }}>
        <div className="teacher-tabs-scroll">
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Tổng quan năng lực
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => setActiveTab('subjects')}
          >
            Tiến độ môn học ({studentSubjects.length})
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            Bài tập đã giao ({submissions.length})
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === 'grades' ? 'active' : ''}`}
            onClick={() => setActiveTab('grades')}
          >
            Sổ điểm ({grades.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div className="admin-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#102a43', marginBottom: 14 }}>
              Thế mạnh học tập
            </h3>
            {student.strengths && student.strengths.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {student.strengths.map((str, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: '#ecfdf5',
                      color: '#047857',
                      border: '1px solid #a7f3d0',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    ✓ {str}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#627d98', fontSize: '0.88rem' }}>
                Đang học đều các dạng bài, nắm chắc kiến thức cơ bản.
              </p>
            )}
          </div>

          <div className="admin-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#102a43', marginBottom: 14 }}>
              Khu vực cần lưu ý & Củng cố
            </h3>
            {student.weakAreas && student.weakAreas.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {student.weakAreas.map((w, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: '#fffbeb',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    ⚠ {w}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#047857', fontSize: '0.88rem' }}>
                Học sinh chưa ghi nhận lỗ hổng kiến thức nghiêm trọng nào.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Subjects */}
      {activeTab === 'subjects' && (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Môn học</th>
                <th>Bài học hoàn thành</th>
                <th>Tiến độ chương trình</th>
                <th>Điểm đánh giá</th>
                <th>Đánh giá tổng quát</th>
              </tr>
            </thead>
            <tbody>
              {studentSubjects.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <strong style={{ color: '#102a43' }}>{sub.name}</strong>
                  </td>
                  <td>{sub.lessonsCompleted} / {sub.totalLessons} bài</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar-wrap" style={{ width: 80, height: 6 }}>
                        <div className="progress-bar-fill" style={{ width: `${sub.progress}%`, background: '#0284c7' }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{sub.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: sub.score >= 8 ? '#047857' : '#d97706' }}>
                      {sub.score.toFixed(1)}
                    </strong>
                  </td>
                  <td>
                    <span className={`status-badge ${sub.score >= 8 ? 'status-success' : 'status-default'}`}>
                      {sub.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Assignments */}
      {activeTab === 'assignments' && (
        <div className="staff-table-wrapper">
          {submissions.length === 0 ? (
            <EmptyState
              title="Chưa có bài nộp nào"
              description="Học viên chưa có bài tập nộp trong thời gian này."
            />
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Tên bài tập</th>
                  <th>Thời gian nộp</th>
                  <th>Điểm số</th>
                  <th>Trạng thái</th>
                  <th>Nhận xét của giáo viên</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <Link
                        to={`/teacher/assignments/${sub.assignmentId}`}
                        className="font-medium text-navy-primary hover:underline"
                        style={{ fontWeight: 600, color: '#102a43' }}
                      >
                        {sub.assignmentTitle}
                      </Link>
                    </td>
                    <td>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : '—'}</td>
                    <td>
                      <strong>{sub.score !== undefined ? `${sub.score} / ${sub.maxScore}` : '—'}</strong>
                    </td>
                    <td>
                      <span className={`status-badge ${sub.status === 'graded' ? 'status-success' : 'status-warning'}`}>
                        {sub.status === 'graded' ? 'Đã chấm' : 'Chờ chấm'}
                      </span>
                    </td>
                    <td style={{ color: '#627d98', fontSize: '0.85rem' }}>
                      {sub.feedback || 'Chưa có nhận xét'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 4: Grades */}
      {activeTab === 'grades' && (
        <div className="staff-table-wrapper">
          {grades.length === 0 ? (
            <EmptyState
              title="Chưa có điểm bài kiểm tra"
              description="Học viên chưa hoàn thành bài kiểm tra hoặc bài thu hoạch nào."
            />
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Nội dung đánh giá</th>
                  <th>Môn học</th>
                  <th>Hình thức</th>
                  <th>Điểm số</th>
                  <th>Kết quả</th>
                  <th>Ngày làm bài</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grd) => (
                  <tr key={grd.id}>
                    <td>
                      <strong style={{ color: '#102a43' }}>{grd.activityTitle}</strong>
                    </td>
                    <td>{grd.subjectName}</td>
                    <td>
                      <span className="subject-badge-pill">
                        {grd.activityType === 'assignment' ? 'Bài tập về nhà' : 'Thu hoạch'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: grd.score >= 8 ? '#047857' : grd.score >= 5 ? '#d97706' : '#dc2626' }}>
                        {grd.score.toFixed(1)} / {grd.maxScore}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-badge ${grd.passed ? 'status-success' : 'status-danger'}`}>
                        {grd.passed ? 'Đạt' : 'Chưa đạt'}
                      </span>
                    </td>
                    <td>{new Date(grd.date).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Move Class Modal */}
      {isMoveOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 440 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Chuyển lớp học viên</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsMoveOpen(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMoveClass}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, color: '#102a43' }}>{student.name} ({student.code})</div>
                  <div style={{ fontSize: '0.82rem', color: '#627d98' }}>Lớp hiện tại: {student.className}</div>
                </div>

                <div>
                  <label className="form-label" htmlFor="target-class-select">
                    Chọn lớp chuyển đến <span className="text-danger">*</span>
                  </label>
                  <select
                    id="target-class-select"
                    className="form-input"
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classes
                      .filter((c) => c.id !== student.classId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.grade} - Sĩ số: {c.studentCount}/{c.maxStudents})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsMoveOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!targetClassId}
                >
                  Xác nhận chuyển lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
