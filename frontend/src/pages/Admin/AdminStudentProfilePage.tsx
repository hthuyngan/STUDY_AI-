import React, { useEffect, useState, useMemo } from 'react'
import {
  ArrowLeft,
  Users,
  Award,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Shield,
  MoveRight,
  AlertTriangle,
  FileText,
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
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

type ProfileTab = 'overview' | 'subjects' | 'assignments' | 'grades' | 'activities'

export const AdminStudentProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>()
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

  // Mock subjects progress for the student
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
          description="Hồ sơ học viên không tồn tại trong hệ thống."
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

      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link
          to="/admin/students"
          className="flex items-center gap-1.5 text-sm font-medium text-navy-primary hover:underline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#102a43', fontSize: '0.88rem' }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại Quản lý học viên</span>
        </Link>
      </div>

      {/* Profile Header Card */}
      <div
        className="admin-card"
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '24px',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#102a43',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.4rem',
                border: '3px solid #FFF9EA',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#102a43', margin: 0 }}>
                  {student.name}
                </h1>
                <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  {student.code}
                </code>
                <span
                  className={`status-badge ${
                    student.status === 'on-track'
                      ? 'status-success'
                      : student.status === 'needs-attention'
                      ? 'status-danger'
                      : 'status-default'
                  }`}
                >
                  {student.status === 'on-track' ? 'Đang học tốt' : student.status === 'needs-attention' ? 'Cần hỗ trợ' : 'Nghỉ'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: '0.88rem', color: '#627d98', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={14} />
                  {student.email}
                </span>
                {student.phone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={14} />
                    {student.phone}
                  </span>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Users size={14} />
                  Lớp: <strong>{student.className}</strong> ({student.grade})
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setTargetClassId('')
                setIsMoveOpen(true)
              }}
            >
              <MoveRight size={16} />
              <span>Đổi lớp học</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Tabs Nav */}
      <div className="admin-roles-tabs" style={{ marginBottom: 24, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('overview')}
        >
          Tổng quan hồ sơ
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'subjects' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('subjects')}
        >
          Tiến độ môn học
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'assignments' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('assignments')}
        >
          Bài tập & Bài nộp
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'grades' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('grades')}
        >
          Bảng điểm chi tiết
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'activities' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('activities')}
        >
          Nhật ký học tập
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 4 KPIs */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Thời gian tự học</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num">{Math.round(student.totalLearningMinutes / 60)} giờ</span>
                <span className="kpi-comparison">{student.totalLearningMinutes % 60} phút tương tác</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Tiến độ tổng thể</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
                  <Award size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num">{student.progress}%</span>
                <span className="kpi-comparison">{student.lessonsCompleted} bài hoàn thành</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Điểm TB học tập</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
                  <Award size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num">{student.averageScore}</span>
                <span className="kpi-comparison">Thang điểm 10</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-top-row">
                <span className="kpi-label">Xếp loại hiện tại</span>
                <div className="kpi-icon-wrap" style={{ background: 'rgba(244, 185, 66, 0.15)', color: '#b45309' }}>
                  <Shield size={18} />
                </div>
              </div>
              <div className="kpi-value-row">
                <span className="kpi-num" style={{ fontSize: '1.25rem' }}>
                  {student.averageScore >= 8 ? 'Học sinh Giỏi' : student.averageScore >= 6.5 ? 'Học sinh Khá' : 'Cần cố gắng'}
                </span>
                <span className="kpi-comparison">{student.status === 'on-track' ? 'Duy trì phong độ' : 'Cần kèm cặp'}</span>
              </div>
            </div>
          </div>

          {/* Strengths & Weak Areas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#047857', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={18} />
                <span>Điểm mạnh & Ưu thế học tập</span>
              </h3>
              {student.strengths && student.strengths.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem', color: '#334e68' }}>
                  {student.strengths.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#627d98', fontSize: '0.88rem' }}>
                  Học viên đang duy trì tiến độ cơ bản trên tất cả các học phần.
                </p>
              )}
            </div>

            <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#b91c1c', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={18} />
                <span>Kiến thức yếu & Cần hỗ trợ can thiệp</span>
              </h3>
              {student.weakAreas && student.weakAreas.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem', color: '#b91c1c' }}>
                  {student.weakAreas.map((wk, i) => (
                    <li key={i}>{wk}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#047857', fontSize: '0.88rem' }}>
                  Không phát hiện lỗ hổng kiến thức nghiêm trọng trong kỳ học này.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBJECTS */}
      {activeTab === 'subjects' && (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Môn học</th>
                <th>Tiến độ hoàn thành</th>
                <th>Số bài đã học</th>
                <th>Điểm đánh giá</th>
                <th>Đánh giá trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {studentSubjects.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <strong style={{ color: '#102a43' }}>{sub.name}</strong>
                  </td>
                  <td>
                    <div style={{ minWidth: 140 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                        <span>{sub.progress}%</span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${sub.progress}%`, height: '100%', background: '#0284c7' }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    {sub.lessonsCompleted} / {sub.totalLessons} bài học
                  </td>
                  <td>
                    <strong style={{ color: sub.score >= 8 ? '#047857' : sub.score >= 6.5 ? '#0284c7' : '#dc2626' }}>
                      {sub.score}
                    </strong>
                  </td>
                  <td>
                    <span className="status-badge status-success">{sub.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="staff-table-wrapper">
          {submissions.length === 0 ? (
            <EmptyState
              title="Chưa có bài tập nào đã nộp"
              description="Học viên chưa có bài tập nộp trong danh mục bài tập của lớp."
            />
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Tiêu đề bài tập</th>
                  <th>Thời gian nộp</th>
                  <th>Điểm số</th>
                  <th>Nhận xét của giáo viên</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <strong style={{ color: '#102a43' }}>{sub.assignmentTitle}</strong>
                    </td>
                    <td>
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : 'Chưa nộp'}
                    </td>
                    <td>
                      <strong style={{ color: sub.score && sub.score >= 8 ? '#047857' : '#0284c7' }}>
                        {sub.score !== undefined ? `${sub.score} / ${sub.maxScore}` : 'Chưa chấm'}
                      </strong>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <span style={{ fontSize: '0.85rem', color: '#334e68' }}>
                        {sub.feedback || 'Chưa có nhận xét'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          sub.status === 'graded'
                            ? 'status-success'
                            : sub.status === 'pending'
                            ? 'status-warning'
                            : 'status-danger'
                        }`}
                      >
                        {sub.status === 'graded' ? 'Đã chấm' : sub.status === 'pending' ? 'Chờ chấm' : 'Chưa nộp'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 4: GRADES */}
      {activeTab === 'grades' && (
        <div className="staff-table-wrapper">
          {grades.length === 0 ? (
            <EmptyState
              title="Chưa có bảng điểm"
              description="Chưa có kết quả kiểm tra hoặc bài thu hoạch cho học viên này."
            />
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Bài kiểm tra / Thu hoạch</th>
                  <th>Môn học</th>
                  <th>Loại bài</th>
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
                      <span className="status-badge status-default">
                        {grd.activityType === 'assignment' ? 'Bài tập' : 'Thu hoạch'}
                      </span>
                    </td>
                    <td>
                      <strong
                        style={{
                          fontSize: '0.95rem',
                          color: grd.score >= 8 ? '#047857' : grd.score >= 6.5 ? '#0284c7' : '#dc2626',
                        }}
                      >
                        {grd.score} / {grd.maxScore}
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

      {/* TAB 5: ACTIVITIES */}
      {activeTab === 'activities' && (
        <div style={{ maxWidth: 640 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#102a43', marginBottom: 16 }}>
            Nhật ký truy cập và tương tác học tập
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '14px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', gap: 12 }}>
              <Clock size={16} color="#047857" style={{ marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#102a43' }}>Đăng nhập và hoàn thành bài học Toán 12</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#627d98' }}>
                  {new Date(student.lastActive).toLocaleString('vi-VN')} • Bài: Khảo sát và vẽ đồ thị hàm số
                </p>
              </div>
            </div>
            <div style={{ padding: '14px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', gap: 12 }}>
              <FileText size={16} color="#0284c7" style={{ marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#102a43' }}>Nộp bài tập trực tuyến</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#627d98' }}>
                  Bài tập phương trình phân thức • Điểm số ghi nhận: {student.averageScore}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ĐỔI LỚP */}
      {isMoveOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 440 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Đổi lớp học cho {student.name}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsMoveOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMoveClass}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334e68' }}>
                  Học viên hiện đang thuộc lớp <strong>{student.className}</strong>.
                </p>

                <div>
                  <label className="form-label" htmlFor="new-class-select">Chọn lớp học mới <span className="text-danger">*</span></label>
                  <select
                    id="new-class-select"
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
                          {c.name} ({c.grade}) - Sĩ số: {c.studentCount}
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
                  Xác nhận đổi lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
