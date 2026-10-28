import React, { useEffect, useState, useMemo } from 'react'
import {
  Users,
  Search,
  Plus,
  Download,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  BookOpen,
  Filter,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type { AdminClassItem, ClassStatus } from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const TeacherClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ClassStatus>('all')
  const [teacherFilter, setTeacherFilter] = useState('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<AdminClassItem | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    grade: 'Lớp 12',
    homeroomTeacherName: 'ThS. Nguyễn Văn Hải',
    room: 'P.302',
    academicYear: '2025 - 2026',
    maxStudents: 40,
    description: '',
    status: 'active' as ClassStatus,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setFeedbackToast(msg)
    setTimeout(() => setFeedbackToast(null), 3500)
  }

  const loadClasses = () => {
    setLoading(true)
    classroomService
      .getClasses()
      .then((data) => {
        setClasses(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    let active = true
    classroomService
      .getClasses()
      .then((data) => {
        if (active) {
          setClasses(data)
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

  // Teacher list for demo selector
  const teacherList = useMemo(() => {
    const set = new Set<string>()
    classes.forEach((c) => {
      if (c.homeroomTeacherName) set.add(c.homeroomTeacherName)
    })
    return Array.from(set)
  }, [classes])

  // KPI Calculations
  const teacherFilteredClasses = useMemo(() => {
    if (teacherFilter === 'all') return classes
    return classes.filter((c) => c.homeroomTeacherName === teacherFilter)
  }, [classes, teacherFilter])

  const totalClasses = teacherFilteredClasses.length
  const totalStudents = teacherFilteredClasses.reduce((sum, c) => sum + c.studentCount, 0)
  const avgClassSize = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0
  const attentionClasses = teacherFilteredClasses.filter((c) => c.averageProgress < 60 || c.averageScore < 6.5).length

  // Filtered List
  const filteredClasses = useMemo(() => {
    return teacherFilteredClasses.filter((cls) => {
      const matchSearch =
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.homeroomTeacherName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchGrade = gradeFilter === 'all' || cls.grade === gradeFilter
      const matchStatus = statusFilter === 'all' || cls.status === statusFilter
      return matchSearch && matchGrade && matchStatus
    })
  }, [teacherFilteredClasses, searchTerm, gradeFilter, statusFilter])

  const handleOpenCreate = () => {
    setEditingClass(null)
    setFormData({
      code: '',
      name: '',
      grade: 'Lớp 12',
      homeroomTeacherName: teacherFilter !== 'all' ? teacherFilter : 'ThS. Nguyễn Văn Hải',
      room: 'P.302',
      academicYear: '2025 - 2026',
      maxStudents: 40,
      description: '',
      status: 'active',
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (cls: AdminClassItem) => {
    setEditingClass(cls)
    setFormData({
      code: cls.code,
      name: cls.name,
      grade: cls.grade,
      homeroomTeacherName: cls.homeroomTeacherName,
      room: cls.room || 'P.302',
      academicYear: cls.academicYear,
      maxStudents: cls.maxStudents,
      description: cls.description || '',
      status: cls.status,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim() || !formData.name.trim()) {
      setFormError('Vui lòng nhập đầy đủ mã lớp và tên lớp.')
      return
    }

    try {
      if (editingClass) {
        await classroomService.saveClass({
          ...editingClass,
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          grade: formData.grade,
          homeroomTeacherName: formData.homeroomTeacherName.trim(),
          room: formData.room.trim(),
          academicYear: formData.academicYear.trim(),
          maxStudents: Number(formData.maxStudents) || 40,
          description: formData.description.trim(),
          status: formData.status,
        })
        showToast(`Đã cập nhật lớp học "${formData.name}"`)
      } else {
        await classroomService.saveClass({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          grade: formData.grade,
          homeroomTeacherName: formData.homeroomTeacherName.trim(),
          room: formData.room.trim(),
          academicYear: formData.academicYear.trim(),
          maxStudents: Number(formData.maxStudents) || 40,
          description: formData.description.trim(),
          status: formData.status,
        })
        showToast(`Đã tạo lớp học mới "${formData.name}"`)
      }
      setIsModalOpen(false)
      loadClasses()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Lỗi khi lưu lớp học')
    }
  }

  const handleDeleteClass = async (cls: AdminClassItem) => {
    if (window.confirm(`Xác nhận xóa lớp học "${cls.name}" (${cls.code}) khỏi hệ thống?`)) {
      try {
        await classroomService.deleteClass(cls.id)
        showToast(`Đã xóa lớp học "${cls.name}"`)
        loadClasses()
      } catch (err: unknown) {
        if (err instanceof Error) alert(err.message)
      }
    }
  }

  const handleExportCSV = () => {
    const headers = ['Mã lớp', 'Tên lớp', 'Khối', 'Giáo viên CN', 'Phòng học', 'Sĩ số', 'Tiến độ TB (%)', 'Điểm TB', 'Trạng thái']
    const rows = filteredClasses.map((c) => [
      c.code,
      c.name,
      c.grade,
      c.homeroomTeacherName,
      c.room,
      `${c.studentCount}/${c.maxStudents}`,
      c.averageProgress,
      c.averageScore,
      c.status === 'active' ? 'Đang học' : 'Đã kết thúc',
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
    link.download = `Danh_sach_lop_hoc_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('Đã xuất file CSV danh sách lớp học thành công')
  }

  return (
    <div className="admin-page-container">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-prototype-badge">
          <span className="prototype-dot"></span>
          <span>TEACHER WORKSPACE • QUẢN LÝ GIẢNG DẠY</span>
        </div>
        <div className="admin-header-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: 4 }}>
              <Link to="/teacher">Giáo viên</Link>
              <span style={{ margin: '0 6px', color: '#94a3b8' }}>/</span>
              <span aria-current="page" style={{ color: '#102a43', fontWeight: 600 }}>Lớp học</span>
            </nav>
            <h1 className="staff-page-title">Quản lý lớp học (Classrooms)</h1>
            <p className="staff-page-desc">
              Theo dõi danh sách lớp phụ trách, giáo viên chủ nhiệm, sĩ số học viên và tiến độ học tập trung bình.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
            >
              <Download size={16} />
              <span>Xuất CSV</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              <span>Thêm lớp học</span>
            </button>
          </div>
        </div>
      </div>

      {/* Teacher Demo Filter Selector */}
      <div style={{ background: '#f8fafc', padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#102a43', fontWeight: 600, fontSize: '0.88rem' }}>
          <Filter size={15} color="#0284c7" />
          <span>Đang xem theo giáo viên:</span>
        </div>
        <select
          aria-label="Chọn hồ sơ giáo viên demo"
          className="admin-filter-select"
          style={{ minWidth: 240, background: '#fff' }}
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
        >
          <option value="all">Tất cả giáo viên (Toàn trường)</option>
          {teacherList.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {teacherFilter !== 'all' && (
          <span style={{ fontSize: '0.82rem', color: '#0284c7', background: 'rgba(2, 132, 199, 0.08)', padding: '2px 8px', borderRadius: 9999 }}>
            Đang lọc lớp phân công của {teacherFilter}
          </span>
        )}
      </div>

      {/* 4 KPIs */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tổng số lớp học</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
              <BookOpen size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{totalClasses}</span>
            <span className="kpi-comparison">Đang hoạt động</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tổng học viên</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{totalStudents}</span>
            <span className="kpi-comparison">Học viên chính thức</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Sĩ số trung bình</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{avgClassSize}</span>
            <span className="kpi-comparison">Học sinh / lớp</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Lớp cần chú ý</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num" style={{ color: '#dc2626' }}>{attentionClasses}</span>
            <span className="kpi-comparison">Điểm hoặc tiến độ thấp</span>
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
            placeholder="Tìm theo tên lớp, mã lớp, giáo viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ClassStatus)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="archived">Lưu trữ</option>
        </select>
      </div>

      {/* Classes Table */}
      <div className="staff-table-wrapper">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredClasses.length === 0 ? (
          <EmptyState
            title="Không tìm thấy lớp học nào"
            description="Hãy thử thay đổi điều kiện tìm kiếm hoặc tạo một lớp học mới."
          />
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Lớp học</th>
                <th>Khối lớp</th>
                <th>Giáo viên chủ nhiệm</th>
                <th>Sĩ số</th>
                <th>Tiến độ TB</th>
                <th>Điểm TB</th>
                <th>Bài tập mở</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((cls) => (
                <tr key={cls.id}>
                  <td>
                    <div>
                      <Link
                        to={`/teacher/classes/${cls.id}`}
                        className="font-medium text-navy-primary hover:underline"
                        style={{ fontWeight: 700, color: '#102a43' }}
                      >
                        {cls.name}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: '#627d98', marginTop: 2 }}>
                        Mã: <code>{cls.code}</code> • Phòng: {cls.room}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="subject-badge-pill">{cls.grade}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#334e68' }}>{cls.homeroomTeacherName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#627d98' }}>Năm học: {cls.academicYear}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {cls.studentCount} / {cls.maxStudents}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar-wrap" style={{ width: 60, height: 6 }}>
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${cls.averageProgress}%`,
                            background: cls.averageProgress < 60 ? '#dc2626' : '#10b981',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{cls.averageProgress}%</span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: cls.averageScore >= 8.0 ? '#047857' : cls.averageScore < 6.5 ? '#dc2626' : '#d97706',
                      }}
                    >
                      {cls.averageScore.toFixed(1)}
                    </span>
                  </td>
                  <td>
                    <span className="badge-count-link">
                      {cls.activeAssignments} bài
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${cls.status === 'active' ? 'status-success' : 'status-default'}`}>
                      {cls.status === 'active' ? 'Đang hoạt động' : 'Lưu trữ'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      <Link
                        to={`/teacher/classes/${cls.id}`}
                        className="table-action-btn"
                        title="Xem chi tiết lớp học"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => handleOpenEdit(cls)}
                        title="Chỉnh sửa lớp học"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="table-action-btn text-danger"
                        onClick={() => handleDeleteClass(cls)}
                        title="Xóa lớp học"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Dialog Tạo / Sửa Lớp Học */}
      {isModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3 className="modal-title">
                {editingClass ? 'Chỉnh sửa thông tin lớp học' : 'Tạo lớp học mới'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClass}>
              <div className="admin-modal-body">
                {formError && (
                  <div className="form-error-banner" style={{ marginBottom: 14 }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cls-code-input">
                      Mã lớp học <span className="text-danger">*</span>
                    </label>
                    <input
                      id="cls-code-input"
                      type="text"
                      className="form-input"
                      placeholder="VD: 12A1, 10B2..."
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="cls-name-input">
                      Tên lớp học <span className="text-danger">*</span>
                    </label>
                    <input
                      id="cls-name-input"
                      type="text"
                      className="form-input"
                      placeholder="VD: Lớp 12A1 Chuyên Toán"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cls-grade-select">
                      Khối lớp
                    </label>
                    <select
                      id="cls-grade-select"
                      className="form-input"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    >
                      <option value="Lớp 10">Lớp 10</option>
                      <option value="Lớp 11">Lớp 11</option>
                      <option value="Lớp 12">Lớp 12</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="cls-teacher-input">
                      Giáo viên chủ nhiệm
                    </label>
                    <input
                      id="cls-teacher-input"
                      type="text"
                      className="form-input"
                      placeholder="VD: ThS. Nguyễn Văn Hải"
                      value={formData.homeroomTeacherName}
                      onChange={(e) => setFormData({ ...formData, homeroomTeacherName: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cls-room-input">
                      Phòng học
                    </label>
                    <input
                      id="cls-room-input"
                      type="text"
                      className="form-input"
                      placeholder="VD: P.302, Khu B"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="cls-max-input">
                      Sĩ số tối đa
                    </label>
                    <input
                      id="cls-max-input"
                      type="number"
                      className="form-input"
                      min={10}
                      max={60}
                      value={formData.maxStudents}
                      onChange={(e) => setFormData({ ...formData, maxStudents: Number(e.target.value) || 40 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cls-desc-input">
                    Mô tả định hướng lớp
                  </label>
                  <textarea
                    id="cls-desc-input"
                    className="form-input"
                    rows={2}
                    placeholder="Mô tả định hướng môn chuyên, mục tiêu kỳ thi..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <Users size={16} />
                  <span>{editingClass ? 'Lưu thay đổi' : 'Tạo lớp học'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
