import React, { useEffect, useState, useMemo } from 'react'
import {
  Users,
  Search,
  Download,
  Eye,
  MoveRight,
  Award,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type { AdminClassItem, AdminStudentItem, StudentStatus } from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './TeacherPages.css'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const TeacherStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<AdminStudentItem[]>([])
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>('all')

  // Move Modal
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentItem | null>(null)
  const [targetClassId, setTargetClassId] = useState('')

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([classroomService.getStudents(), classroomService.getClasses()])
      .then(([stuList, clsList]) => {
        setStudents(stuList)
        setClasses(clsList)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    let active = true
    Promise.all([classroomService.getStudents(), classroomService.getClasses()])
      .then(([stuList, clsList]) => {
        if (active) {
          setStudents(stuList)
          setClasses(clsList)
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
  }, [])

  // KPI Calculations
  const totalStudents = students.length
  const onTrackCount = students.filter((s) => s.status === 'on-track').length
  const needsAttentionCount = students.filter((s) => s.status === 'needs-attention').length
  const systemAvgScore =
    totalStudents > 0
      ? Number((students.reduce((acc, s) => acc + s.averageScore, 0) / totalStudents).toFixed(1))
      : 0

  // Filtered List
  const filteredStudents = useMemo(() => {
    return students.filter((stu) => {
      const matchSearch =
        stu.name.toLowerCase().includes(search.toLowerCase()) ||
        stu.email.toLowerCase().includes(search.toLowerCase()) ||
        stu.code.toLowerCase().includes(search.toLowerCase())
      const matchClass = classFilter === 'all' || stu.classId === classFilter
      const matchGrade = gradeFilter === 'all' || stu.grade === gradeFilter
      const matchStatus = statusFilter === 'all' || stu.status === statusFilter
      return matchSearch && matchClass && matchGrade && matchStatus
    })
  }, [students, search, classFilter, gradeFilter, statusFilter])

  // Handle Move
  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent || !targetClassId) return
    const targetClass = classes.find((c) => c.id === targetClassId)
    if (!targetClass) return

    try {
      await classroomService.moveStudentClass(selectedStudent.id, targetClass.id, targetClass.name)
      await classroomService.addClassActivity(
        targetClass.id,
        'Tiếp nhận học viên chuyển lớp',
        `Học viên ${selectedStudent.name} (${selectedStudent.code}) đã được chuyển vào lớp`
      )
      showToast(`Đã chuyển học viên ${selectedStudent.name} sang lớp ${targetClass.name}`)
      setIsMoveOpen(false)
      setSelectedStudent(null)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Mã HV',
      'Họ và tên',
      'Email',
      'Số điện thoại',
      'Lớp',
      'Khối',
      'Tiến độ (%)',
      'Số bài hoàn thành',
      'Điểm TB',
      'Thời gian học (phút)',
      'Lần hoạt động cuối',
      'Trạng thái',
    ]

    const rows = filteredStudents.map((s) => [
      s.code,
      s.name,
      s.email,
      s.phone || '',
      s.className,
      s.grade,
      `${s.progress}%`,
      s.lessonsCompleted,
      s.averageScore,
      s.totalLearningMinutes,
      new Date(s.lastActive).toLocaleDateString('vi-VN'),
      s.status === 'on-track' ? 'Đang học tốt' : s.status === 'needs-attention' ? 'Cần hỗ trợ' : 'Ngừng hoạt động',
    ])

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((row) =>
          row
            .map((val) => {
              const str = String(val ?? '')
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
              }
              return str
            })
            .join(',')
        ),
      ].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Danh_sach_hoc_vien_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Đã xuất danh sách học viên (CSV) thành công')
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

      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Quản lý học viên</h1>
            <p className="staff-page-desc">
              Theo dõi hồ sơ, tiến độ và kết quả học tập của học viên thuộc các lớp giảng dạy.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              title="Xuất danh sách học viên ra file CSV"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={16} />
              <span>Xuất dữ liệu học viên (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tổng học viên</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{totalStudents}</span>
            <span className="kpi-comparison">Đã ghi danh</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Đang học tốt</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{onTrackCount}</span>
            <span className="kpi-comparison">Tiến độ & Điểm đạt chuẩn</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Cần hỗ trợ</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num" style={{ color: '#dc2626' }}>{needsAttentionCount}</span>
            <span className="kpi-comparison">Tiến độ &lt; 50% hoặc ĐTB &lt; 6.5</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Điểm trung bình</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{systemAvgScore}</span>
            <span className="kpi-comparison">Thang điểm 10</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-input-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm theo tên học viên, mã học viên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          aria-label="Lọc theo lớp học"
          className="admin-filter-select"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="all">Tất cả lớp học</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>

        <select
          aria-label="Lọc theo khối lớp"
          className="admin-filter-select"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
        >
          <option value="all">Tất cả khối lớp</option>
          <option value="Lớp 10">Lớp 10</option>
          <option value="Lớp 11">Lớp 11</option>
          <option value="Lớp 12">Lớp 12</option>
        </select>

        <select
          aria-label="Lọc theo trạng thái"
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | StudentStatus)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="on-track">Đang học tốt</option>
          <option value="needs-attention">Cần chú ý</option>
          <option value="idle">Ngừng hoạt động</option>
        </select>

        {(search || classFilter !== 'all' || gradeFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => {
              setSearch('')
              setClassFilter('all')
              setGradeFilter('all')
              setStatusFilter('all')
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Student List View: Desktop Table + Mobile Cards */}
      <div className="teacher-classes-wrapper">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            title="Không tìm thấy học viên nào"
            description="Hãy thử thay đổi điều kiện tìm kiếm hoặc chọn lớp học khác."
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="staff-table-wrapper teacher-desktop-table">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Mã HV</th>
                    <th>Học viên</th>
                    <th>Lớp học</th>
                    <th>Khối</th>
                    <th>Tiến độ</th>
                    <th>Bài đã xong</th>
                    <th>Điểm TB</th>
                    <th>Hoạt động cuối</th>
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
                        <div style={{ fontSize: '0.78rem', color: '#627d98' }}>{s.email}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{s.className}</span>
                      </td>
                      <td>
                        <span className="subject-badge-pill">{s.grade}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar-wrap" style={{ width: 60, height: 6 }}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${s.progress}%`,
                                background: s.progress < 50 ? '#dc2626' : '#10b981',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.progress}%</span>
                        </div>
                      </td>
                      <td>{s.lessonsCompleted} bài</td>
                      <td>
                        <strong
                          style={{
                            color: s.averageScore >= 8.0 ? '#047857' : s.averageScore < 6.5 ? '#dc2626' : '#d97706',
                          }}
                        >
                          {s.averageScore.toFixed(1)}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#627d98' }}>
                          {new Date(s.lastActive).toLocaleDateString('vi-VN')}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            s.status === 'on-track'
                              ? 'status-success'
                              : s.status === 'needs-attention'
                              ? 'status-danger'
                              : 'status-default'
                          }`}
                        >
                          {s.status === 'on-track'
                            ? 'Đang học tốt'
                            : s.status === 'needs-attention'
                            ? 'Cần chú ý'
                            : 'Ngừng học'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <Link
                            to={`/teacher/students/${s.id}`}
                            className="table-action-btn"
                            title="Xem chi tiết hồ sơ học viên"
                            aria-label={`Xem chi tiết hồ sơ ${s.name}`}
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => {
                              setSelectedStudent(s)
                              setTargetClassId(classes.find((c) => c.id !== s.classId)?.id || '')
                              setIsMoveOpen(true)
                            }}
                            title="Chuyển lớp cho học viên"
                            aria-label={`Chuyển lớp cho học viên ${s.name}`}
                          >
                            <MoveRight size={16} />
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
                        <span>{s.className}</span>
                        <span>•</span>
                        <span>Mã: <code>{s.code}</code></span>
                      </div>
                    </div>
                    <span
                      className={`status-badge ${
                        s.status === 'on-track'
                          ? 'status-success'
                          : s.status === 'needs-attention'
                          ? 'status-danger'
                          : 'status-default'
                      }`}
                    >
                      {s.status === 'on-track' ? 'Học tốt' : 'Cần chú ý'}
                    </span>
                  </div>

                  <div className="teacher-card-item-body">
                    <div className="teacher-card-stat">
                      <span className="teacher-stat-label">Tiến độ</span>
                      <strong className="teacher-stat-val">{s.progress}%</strong>
                    </div>
                    <div className="teacher-card-stat">
                      <span className="teacher-stat-label">Điểm TB</span>
                      <strong className="teacher-stat-val" style={{ color: s.averageScore >= 8 ? '#047857' : '#d97706' }}>
                        {s.averageScore.toFixed(1)}
                      </strong>
                    </div>
                    <div className="teacher-card-stat">
                      <span className="teacher-stat-label">Đã học</span>
                      <strong className="teacher-stat-val">{s.lessonsCompleted} bài</strong>
                    </div>
                  </div>

                  <div className="teacher-card-item-footer">
                    <Link
                      to={`/teacher/students/${s.id}`}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                    >
                      <Eye size={14} />
                      <span>Xem hồ sơ</span>
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedStudent(s)
                        setTargetClassId(classes.find((c) => c.id !== s.classId)?.id || '')
                        setIsMoveOpen(true)
                      }}
                      title="Chuyển lớp"
                    >
                      <MoveRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Chuyển Lớp */}
      {isMoveOpen && selectedStudent && (
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

            <form onSubmit={handleMoveSubmit}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, color: '#102a43' }}>{selectedStudent.name} ({selectedStudent.code})</div>
                  <div style={{ fontSize: '0.82rem', color: '#627d98' }}>Lớp hiện tại: {selectedStudent.className} ({selectedStudent.grade})</div>
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
                      .filter((c) => c.id !== selectedStudent.classId)
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
