import React, { useEffect, useState, useMemo } from 'react'
import {
  Users,
  Search,
  Download,
  Eye,
  MoveRight,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type { AdminClassItem, AdminStudentItem, StudentStatus } from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminStudentsPage: React.FC = () => {
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
        <div className="admin-prototype-badge">
          <span className="prototype-dot"></span>
          <span>ADMIN WORKSPACE • QUẢN LÝ GIẢNG DẠY</span>
        </div>
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Quản lý học viên</h1>
            <p className="staff-page-desc">
              Theo dõi hồ sơ, tiến độ và kết quả học tập của toàn bộ học viên trên nền tảng STUDY_AI.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              title="Xuất danh sách học viên ra file CSV"
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
            <span className="kpi-label">Đang học tích cực</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
              <Award size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{onTrackCount}</span>
            <span className="kpi-comparison">Tiến độ & điểm đạt chuẩn</span>
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
            <span className="kpi-num">{needsAttentionCount}</span>
            <span className="kpi-comparison" style={{ color: needsAttentionCount > 0 ? '#b91c1c' : '#047857' }}>
              {needsAttentionCount > 0 ? 'Có nguy cơ tụt lại' : 'Tất cả đạt chuẩn'}
            </span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Điểm trung bình toàn hệ</span>
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

      {/* Filters */}
      <div className="admin-filter-bar">
        <div className="admin-search-input-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm theo tên học viên, email hoặc mã HV..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="admin-filter-select"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          aria-label="Lọc theo lớp học"
        >
          <option value="all">Tất cả lớp học</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.grade})
            </option>
          ))}
        </select>

        <select
          className="admin-filter-select"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          aria-label="Lọc theo khối lớp"
        >
          <option value="all">Tất cả khối lớp</option>
          <option value="Lớp 10">Lớp 10</option>
          <option value="Lớp 11">Lớp 11</option>
          <option value="Lớp 12">Lớp 12</option>
        </select>

        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | StudentStatus)}
          aria-label="Lọc theo trạng thái"
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

      {/* Data Table */}
      <div className="staff-table-wrapper">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            title="Không tìm thấy học viên nào"
            description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
          />
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Học viên</th>
                <th>Lớp học</th>
                <th>Tiến độ tổng thể</th>
                <th>Bài đã hoàn thành</th>
                <th>Điểm TB</th>
                <th>Thời gian học</th>
                <th>Hoạt động gần nhất</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((stu) => {
                const initials = stu.name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(-2)
                  .join('')
                  .toUpperCase()

                return (
                  <tr key={stu.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#102a43',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <Link
                            to={`/admin/students/${stu.id}`}
                            className="font-medium text-navy-primary hover:underline"
                            style={{ fontWeight: 600, color: '#102a43' }}
                          >
                            {stu.name}
                          </Link>
                          <div style={{ fontSize: '0.78rem', color: '#627d98' }}>
                            <code>{stu.code}</code> • {stu.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong style={{ color: '#102a43', fontSize: '0.88rem' }}>{stu.className}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#627d98' }}>{stu.grade}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ minWidth: 100 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                          <span style={{ fontWeight: 600 }}>{stu.progress}%</span>
                        </div>
                        <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${stu.progress}%`,
                              height: '100%',
                              background: stu.progress >= 70 ? '#047857' : stu.progress >= 50 ? '#0284c7' : '#dc2626',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{stu.lessonsCompleted} bài</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: stu.averageScore >= 8 ? '#047857' : stu.averageScore >= 6.5 ? '#0284c7' : '#dc2626',
                        }}
                      >
                        {stu.averageScore > 0 ? stu.averageScore : '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: '#486581' }}>
                        <Clock size={13} />
                        <span>{Math.round(stu.totalLearningMinutes / 60)}h {stu.totalLearningMinutes % 60}p</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#627d98' }}>
                        {new Date(stu.lastActive).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          stu.status === 'on-track'
                            ? 'status-success'
                            : stu.status === 'needs-attention'
                            ? 'status-danger'
                            : 'status-default'
                        }`}
                      >
                        {stu.status === 'on-track' ? 'Đang học tốt' : stu.status === 'needs-attention' ? 'Cần chú ý' : 'Nghỉ'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <Link
                          to={`/admin/students/${stu.id}`}
                          className="table-action-btn"
                          title="Hồ sơ học tập"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => {
                            setSelectedStudent(stu)
                            setTargetClassId('')
                            setIsMoveOpen(true)
                          }}
                          title="Chuyển lớp"
                        >
                          <MoveRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Chuyển Lớp */}
      {isMoveOpen && selectedStudent && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 440 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Chuyển lớp cho học viên</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsMoveOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleMoveSubmit}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#334e68' }}>
                  Chuyển học viên: <strong>{selectedStudent.name}</strong> ({selectedStudent.code})
                </p>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6 }}>
                  Lớp hiện tại: <strong>{selectedStudent.className}</strong> ({selectedStudent.grade})
                </div>

                <div>
                  <label className="form-label" htmlFor="select-target-class">Chọn lớp mới <span className="text-danger">*</span></label>
                  <select
                    id="select-target-class"
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
                          {c.name} ({c.grade}) - Sĩ số hiện tại: {c.studentCount}
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
                  Xác nhận chuyển
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
