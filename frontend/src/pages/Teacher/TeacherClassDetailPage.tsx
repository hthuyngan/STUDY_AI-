import React, { useEffect, useState, useMemo } from 'react'
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Download,
  Eye,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type {
  AdminClassItem,
  AdminStudentItem,
  AdminAssignmentItem,
  ClassActivityItem,
} from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './TeacherPages.css'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const TeacherClassDetailPage: React.FC = () => {
  const { id: routeClassId, classId: paramClassId } = useParams<{ id?: string; classId?: string }>()
  const classId = routeClassId || paramClassId
  const [classData, setClassData] = useState<AdminClassItem | null>(null)
  const [students, setStudents] = useState<AdminStudentItem[]>([])
  const [assignments, setAssignments] = useState<AdminAssignmentItem[]>([])
  const [activities, setActivities] = useState<ClassActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'reports'>('students')

  // Add Student Dialog State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    email: '',
    phone: '',
    code: '',
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const reloadData = () => {
    if (!classId) return
    Promise.all([
      classroomService.getClassById(classId),
      classroomService.getStudentsByClass(classId),
      classroomService.getAssignmentsByClass(classId),
      classroomService.getClassActivities(classId),
    ])
      .then(([cls, stdList, asgList, actList]) => {
        setClassData(cls)
        setStudents(stdList)
        setAssignments(asgList)
        setActivities(actList)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!classId) return
    let active = true

    Promise.all([
      classroomService.getClassById(classId),
      classroomService.getStudentsByClass(classId),
      classroomService.getAssignmentsByClass(classId),
      classroomService.getClassActivities(classId),
    ])
      .then(([cls, stdList, asgList, actList]) => {
        if (!active) return
        setClassData(cls)
        setStudents(stdList)
        setAssignments(asgList)
        setActivities(actList)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        console.error(err)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [classId])

  const [studentSearch, setStudentSearch] = useState('')
  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(studentSearch.toLowerCase())
    )
  }, [students, studentSearch])

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classData) return
    if (!newStudentForm.name.trim() || !newStudentForm.email.trim()) {
      alert('Vui lòng nhập họ tên và email học viên')
      return
    }

    try {
      const generatedCode = newStudentForm.code.trim() || `HV-${Date.now().toString().slice(-5)}`
      await classroomService.addStudentToClass({
        name: newStudentForm.name.trim(),
        email: newStudentForm.email.trim(),
        phone: newStudentForm.phone.trim(),
        code: generatedCode,
        classId: classData.id,
        className: classData.name,
        grade: classData.grade,
        progress: 0,
        lessonsCompleted: 0,
        averageScore: 0,
        totalLearningMinutes: 0,
        lastActive: new Date().toISOString(),
        status: 'on-track',
      })
      showToast(`Đã thêm học viên "${newStudentForm.name.trim()}" vào lớp!`)
      setIsAddStudentOpen(false)
      setNewStudentForm({ name: '', email: '', phone: '', code: '' })
      reloadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  const handleRemoveStudent = async (student: AdminStudentItem) => {
    if (window.confirm(`Xác nhận rút học viên "${student.name}" ra khỏi lớp này?`)) {
      try {
        await classroomService.removeStudentFromClass(student.id)
        showToast(`Đã rút học viên "${student.name}" khỏi lớp!`)
        reloadData()
      } catch (err: unknown) {
        if (err instanceof Error) alert(err.message)
      }
    }
  }

  const handleExportCSV = () => {
    const headers = ['Mã học viên', 'Họ và tên', 'Email', 'Điểm trung bình', 'Tiến độ (%)', 'Bài đã học', 'Trạng thái']
    const rows = students.map((s) => [
      s.code,
      `"${s.name}"`,
      `"${s.email}"`,
      s.averageScore,
      `${s.progress}%`,
      s.lessonsCompleted,
      s.status === 'on-track' ? 'Đang học tốt' : s.status === 'needs-attention' ? 'Cần chú ý' : 'Ngừng hoạt động',
    ])
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Danh_sach_hoc_vien_${classData?.code || 'lop'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Đã xuất danh sách học viên của lớp thành công')
  }

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '32px' }}>
        <Skeleton height={40} />
        <div style={{ marginTop: 24 }}>
          <Skeleton height={200} />
        </div>
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="admin-page-container">
        <EmptyState
          title="Không tìm thấy lớp học"
          description="Lớp học này không tồn tại hoặc đã bị xóa khỏi hệ thống."
          actionLabel="Quay lại danh sách lớp học"
          onAction={() => window.history.back()}
        />
      </div>
    )
  }

  return (
    <div className="admin-page-container">
      {/* Toast */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="staff-page-header">
        <div style={{ marginBottom: 12 }}>
          <Link
            to="/teacher/classes"
            className="flex items-center gap-1.5 text-sm font-medium text-navy-primary hover:underline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#102a43', fontSize: '0.88rem' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại Quản lý lớp học</span>
          </Link>
        </div>

        <div className="admin-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="staff-page-title" style={{ margin: 0 }}>
                {classData.name}
              </h1>
              <span style={{ background: '#f1f5f9', color: '#102a43', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.85rem' }}>
                MÃ: {classData.code}
              </span>
              <span className={`status-badge ${classData.status === 'active' ? 'status-success' : 'status-default'}`}>
                {classData.status === 'active' ? 'Đang hoạt động' : 'Đã kết thúc'}
              </span>
            </div>
            <p className="staff-page-desc" style={{ marginTop: 6 }}>
              {classData.grade} • Giáo viên CN: <strong>{classData.homeroomTeacherName}</strong> • Phòng {classData.room} • Năm học {classData.academicYear}
            </p>
          </div>

          <div className="admin-header-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={15} />
              <span>Xuất danh sách</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsAddStudentOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={15} />
              <span>Thêm học viên</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs with Horizontal Scroll on Mobile - NO MULTI-ROW WRAP */}
      <div className="teacher-tabs-container">
        <div className="teacher-tabs-scroll">
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            Học viên ({students.length})
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            Bài tập ({assignments.length})
          </button>
          <button
            type="button"
            className={`teacher-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Nhật ký lớp học ({activities.length})
          </button>
        </div>
      </div>

      {/* Tab: Students */}
      {activeTab === 'students' && (
        <div>
          <div className="admin-filter-bar" style={{ marginBottom: 16 }}>
            <div className="admin-search-input-wrap">
              <input
                type="text"
                className="admin-search-input"
                placeholder="Tìm học viên theo họ tên, email hoặc mã..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="teacher-classes-wrapper">
            {filteredStudents.length === 0 ? (
              <EmptyState
                title="Chưa có học viên nào trong lớp"
                description="Bấm 'Thêm học viên' ở góc trên để phân học viên vào lớp học này."
              />
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="staff-table-wrapper teacher-desktop-table">
                  <table className="staff-table">
                    <thead>
                      <tr>
                        <th>Mã HV</th>
                        <th>Họ và tên</th>
                        <th>Email</th>
                        <th>Tiến độ</th>
                        <th>Bài đã hoàn thành</th>
                        <th>Điểm TB</th>
                        <th>Trạng thái</th>
                        <th style={{ textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s) => (
                        <tr key={s.id}>
                          <td><code>{s.code}</code></td>
                          <td>
                            <Link
                              to={`/teacher/students/${s.id}`}
                              className="font-medium text-navy-primary hover:underline"
                              style={{ fontWeight: 600, color: '#102a43' }}
                            >
                              {s.name}
                            </Link>
                          </td>
                          <td>{s.email}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 60, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${s.progress}%`, height: '100%', background: '#0284c7' }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.progress}%</span>
                            </div>
                          </td>
                          <td>{s.lessonsCompleted} bài</td>
                          <td>
                            <strong style={{ color: s.averageScore >= 8 ? '#047857' : s.averageScore >= 5 ? '#b45309' : '#dc2626' }}>
                              {s.averageScore.toFixed(1)}
                            </strong>
                          </td>
                          <td>
                            <span className={`status-badge ${s.status === 'on-track' ? 'status-success' : s.status === 'needs-attention' ? 'status-warning' : 'status-danger'}`}>
                              {s.status === 'on-track' ? 'Đang học tốt' : s.status === 'needs-attention' ? 'Cần chú ý' : 'Ngừng hoạt động'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                              <Link
                                to={`/teacher/students/${s.id}`}
                                className="table-action-btn"
                                title="Xem chi tiết học viên"
                              >
                                <Eye size={15} />
                              </Link>
                              <button
                                type="button"
                                className="table-action-btn text-danger"
                                onClick={() => handleRemoveStudent(s)}
                                title="Rút học viên khỏi lớp"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards List (<768px) */}
                <div className="teacher-mobile-cards-list">
                  {filteredStudents.map((s) => (
                    <div key={s.id} className="teacher-card-item">
                      <div className="teacher-card-item-header">
                        <div>
                          <Link to={`/teacher/students/${s.id}`} className="teacher-card-title">
                            {s.name}
                          </Link>
                          <div className="teacher-card-meta-line">
                            <span>Mã: <code>{s.code}</code></span>
                            <span>•</span>
                            <span>{s.email}</span>
                          </div>
                        </div>
                        <span className={`status-badge ${s.status === 'on-track' ? 'status-success' : s.status === 'needs-attention' ? 'status-warning' : 'status-danger'}`}>
                          {s.status === 'on-track' ? 'Đang học tốt' : 'Cần chú ý'}
                        </span>
                      </div>

                      <div className="teacher-card-item-body">
                        <div className="teacher-card-stat">
                          <span className="teacher-stat-label">Tiến độ</span>
                          <strong className="teacher-stat-val">{s.progress}%</strong>
                        </div>
                        <div className="teacher-card-stat">
                          <span className="teacher-stat-label">Đã học</span>
                          <strong className="teacher-stat-val">{s.lessonsCompleted} bài</strong>
                        </div>
                        <div className="teacher-card-stat">
                          <span className="teacher-stat-label">Điểm TB</span>
                          <strong className="teacher-stat-val" style={{ color: s.averageScore >= 8 ? '#047857' : '#d97706' }}>
                            {s.averageScore.toFixed(1)}
                          </strong>
                        </div>
                      </div>

                      <div className="teacher-card-item-footer">
                        <Link
                          to={`/teacher/students/${s.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                        >
                          <Eye size={14} />
                          <span>Hồ sơ học viên</span>
                        </Link>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm text-danger"
                          onClick={() => handleRemoveStudent(s)}
                          title="Rút khỏi lớp"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab: Assignments */}
      {activeTab === 'assignments' && (
        <div className="staff-table-wrapper">
          {assignments.length === 0 ? (
            <EmptyState
              title="Chưa có bài tập nào được giao cho lớp"
              description="Chuyển sang mục Bài tập để tạo bài tập mới cho lớp này."
            />
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Tên bài tập</th>
                  <th>Môn học</th>
                  <th>Hạn nộp</th>
                  <th>Tỷ lệ nộp bài</th>
                  <th>Điểm trung bình</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link
                        to={`/teacher/assignments/${a.id}`}
                        className="font-medium text-navy-primary hover:underline"
                        style={{ fontWeight: 600, color: '#102a43' }}
                      >
                        {a.title}
                      </Link>
                    </td>
                    <td>{a.subjectName}</td>
                    <td>{new Date(a.dueDate).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <span>{a.submissionsCount} / {a.totalStudents}</span>
                    </td>
                    <td>
                      <strong>{a.averageScore ? a.averageScore.toFixed(1) : '—'}</strong>
                    </td>
                    <td>
                      <span className={`status-badge ${a.status === 'active' ? 'status-success' : 'status-default'}`}>
                        {a.status === 'active' ? 'Đang mở' : 'Đã đóng'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/teacher/assignments/${a.id}`}
                        className="table-action-btn"
                        title="Xem bài nộp và chấm điểm"
                      >
                        <Eye size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Reports & Activities */}
      {activeTab === 'reports' && (
        <div className="admin-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#102a43', marginBottom: 14 }}>
            Nhật ký lớp học gần nhất
          </h3>
          {activities.length === 0 ? (
            <div style={{ color: '#627d98', fontStyle: 'italic' }}>Chưa ghi nhận sự kiện hoạt động nào.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activities.map((act) => (
                <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong style={{ color: '#102a43' }}>{act.action}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#627d98', marginTop: 2 }}>{act.detail}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#94a3b8' }}>
                    <div>{act.actor}</div>
                    <div>{new Date(act.timestamp).toLocaleString('vi-VN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Add Student */}
      {isAddStudentOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 440 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Thêm học viên vào lớp</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddStudentOpen(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudent}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label" htmlFor="new-stu-name">Họ và tên học viên <span className="text-danger">*</span></label>
                  <input
                    id="new-stu-name"
                    type="text"
                    className="form-input"
                    placeholder="Nguyễn Văn A"
                    value={newStudentForm.name}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="new-stu-email">Email liên hệ <span className="text-danger">*</span></label>
                  <input
                    id="new-stu-email"
                    type="email"
                    className="form-input"
                    placeholder="hocvien@example.com"
                    value={newStudentForm.email}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="new-stu-phone">Số điện thoại</label>
                  <input
                    id="new-stu-phone"
                    type="text"
                    className="form-input"
                    placeholder="0912 345 678"
                    value={newStudentForm.phone}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="new-stu-code">Mã số học viên</label>
                  <input
                    id="new-stu-code"
                    type="text"
                    className="form-input"
                    placeholder="Để trống để tự tạo (HV-xxxxx)"
                    value={newStudentForm.code}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, code: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddStudentOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Thêm học viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
