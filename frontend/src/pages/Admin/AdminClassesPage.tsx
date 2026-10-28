import React, { useEffect, useState, useMemo } from 'react'
import {
  School,
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
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type { AdminClassItem, ClassStatus } from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ClassStatus>('all')

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

  // KPI Calculations
  const totalClasses = classes.length
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0)
  const avgClassSize = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0
  const attentionClasses = classes.filter((c) => c.averageProgress < 60 || c.averageScore < 6.5).length

  // Filtered List
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchSearch =
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.homeroomTeacherName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchGrade = gradeFilter === 'all' || cls.grade === gradeFilter
      const matchStatus = statusFilter === 'all' || cls.status === statusFilter
      return matchSearch && matchGrade && matchStatus
    })
  }, [classes, searchTerm, gradeFilter, statusFilter])

  const handleOpenCreate = () => {
    setEditingClass(null)
    setFormData({
      code: '',
      name: '',
      grade: 'Lớp 12',
      homeroomTeacherName: 'ThS. Nguyễn Văn Hải',
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
      room: cls.room,
      academicYear: cls.academicYear,
      maxStudents: cls.maxStudents,
      description: cls.description || '',
      status: cls.status,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim()) {
      setFormError('Vui lòng nhập mã lớp học')
      return
    }
    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập tên lớp học')
      return
    }

    try {
      if (editingClass) {
        await classroomService.saveClass({
          ...editingClass,
          ...formData,
        })
        showToast(`Đã cập nhật thông tin lớp: ${formData.name}`)
      } else {
        await classroomService.saveClass(formData)
        showToast(`Đã tạo thành công lớp học mới: ${formData.name}`)
      }
      setIsModalOpen(false)
      loadClasses()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('Đã có lỗi xảy ra khi lưu lớp học')
      }
    }
  }

  const handleDelete = async (cls: AdminClassItem) => {
    if (cls.studentCount > 0) {
      alert(`Không thể xóa lớp "${cls.name}" vì vẫn còn ${cls.studentCount} học viên. Vui lòng chuyển học viên trước.`)
      return
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa lớp học "${cls.name}" (${cls.code})?`)) {
      try {
        await classroomService.deleteClass(cls.id)
        showToast(`Đã xóa lớp: ${cls.name}`)
        loadClasses()
      } catch (err: unknown) {
        if (err instanceof Error) {
          alert(err.message)
        }
      }
    }
  }

  const handleExportCSV = () => {
    const headers = ['Mã lớp', 'Tên lớp', 'Khối', 'Giáo viên phụ trách', 'Phòng học', 'Sĩ số', 'Sĩ số tối đa', 'Tiến độ TB (%)', 'Điểm TB', 'Trạng thái']
    const rows = filteredClasses.map((c) => [
      c.code,
      c.name,
      c.grade,
      c.homeroomTeacherName,
      c.room,
      c.studentCount,
      c.maxStudents,
      `${c.averageProgress}%`,
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
      {/* Toast */}
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
          <span>ADMIN WORKSPACE • QUẢN LÝ GIẢNG DẠY</span>
        </div>
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Quản lý lớp học</h1>
            <p className="staff-page-desc">
              Theo dõi và tổ chức các lớp học trên STUDY_AI, kiểm soát sĩ số, giáo viên phụ trách và chất lượng đào tạo.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportCSV}
              title="Xuất bảng dữ liệu ra file CSV"
            >
              <Download size={16} />
              <span>Xuất danh sách</span>
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

      {/* 4 KPIs Compact */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tổng số lớp</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
              <School size={20} />
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
            <span className="kpi-comparison">Trong toàn bộ lớp</span>
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
            <span className="kpi-comparison">HV / lớp</span>
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
            <span className="kpi-num">{attentionClasses}</span>
            <span className="kpi-comparison" style={{ color: attentionClasses > 0 ? '#b91c1c' : '#047857' }}>
              {attentionClasses > 0 ? 'Tiến độ hoặc điểm TB thấp' : 'Tất cả đạt chuẩn'}
            </span>
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
            placeholder="Tìm theo tên lớp, mã lớp hoặc giáo viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ClassStatus)}
          aria-label="Lọc theo trạng thái"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang học</option>
          <option value="completed">Đã kết thúc</option>
        </select>

        {(searchTerm || gradeFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => {
              setSearchTerm('')
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
        ) : filteredClasses.length === 0 ? (
          <EmptyState
            title="Không tìm thấy lớp học nào"
            description="Thử thay đổi từ khóa tìm kiếm hoặc tạo thêm lớp học mới."
            actionLabel="Tạo lớp học mới"
            onAction={handleOpenCreate}
          />
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Lớp học</th>
                <th>Khối</th>
                <th>Giáo viên phụ trách</th>
                <th>Sĩ số (Hiện tại / Tối đa)</th>
                <th>Tiến độ TB</th>
                <th>Điểm TB</th>
                <th>Bài tập mở</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((cls) => {
                const occupancyRate = Math.min(100, Math.round((cls.studentCount / cls.maxStudents) * 100))
                return (
                  <tr key={cls.id}>
                    <td>
                      <div>
                        <Link
                          to={`/admin/classes/${cls.id}`}
                          className="font-medium text-navy-primary hover:underline"
                          style={{ fontWeight: 600, color: '#102a43' }}
                        >
                          {cls.name}
                        </Link>
                        <div style={{ fontSize: '0.78rem', color: '#627d98' }}>
                          Mã: <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 4 }}>{cls.code}</code> • Phòng {cls.room}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="status-badge status-default">{cls.grade}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#334e68' }}>
                        {cls.homeroomTeacherName}
                      </span>
                    </td>
                    <td>
                      <div style={{ minWidth: 120 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                          <span>{cls.studentCount} / {cls.maxStudents}</span>
                          <span style={{ color: occupancyRate >= 90 ? '#b91c1c' : '#627d98' }}>{occupancyRate}%</span>
                        </div>
                        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${occupancyRate}%`,
                              height: '100%',
                              background: occupancyRate >= 90 ? '#dc2626' : '#0284c7',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ minWidth: 110 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{cls.averageProgress}%</span>
                        </div>
                        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${cls.averageProgress}%`,
                              height: '100%',
                              background: cls.averageProgress >= 70 ? '#047857' : cls.averageProgress >= 50 ? '#f59e0b' : '#dc2626',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: cls.averageScore >= 8 ? '#047857' : cls.averageScore >= 6.5 ? '#0284c7' : '#b91c1c',
                        }}
                      >
                        {cls.averageScore > 0 ? cls.averageScore : '—'}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge status-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={13} />
                        {cls.activeAssignments} bài
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${cls.status === 'active' ? 'status-success' : 'status-default'}`}>
                        {cls.status === 'active' ? 'Đang học' : 'Đã kết thúc'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <Link
                          to={`/admin/classes/${cls.id}`}
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
                          onClick={() => handleDelete(cls)}
                          title="Xóa lớp học"
                        >
                          <Trash2 size={16} />
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

      {/* Modal Thêm / Chỉnh sửa Lớp học */}
      {isModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 540 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">{editingClass ? 'Chỉnh sửa thông tin lớp học' : 'Thêm lớp học mới'}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {formError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(220, 38, 38, 0.08)',
                      color: '#b91c1c',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" htmlFor="class-code">Mã lớp <span className="text-danger">*</span></label>
                    <input
                      id="class-code"
                      type="text"
                      className="form-input"
                      placeholder="VD: 12A1"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" htmlFor="class-name">Tên lớp học <span className="text-danger">*</span></label>
                    <input
                      id="class-name"
                      type="text"
                      className="form-input"
                      placeholder="VD: Lớp 12A1"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" htmlFor="class-grade">Khối lớp</label>
                    <select
                      id="class-grade"
                      className="form-input"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    >
                      <option value="Lớp 10">Lớp 10</option>
                      <option value="Lớp 11">Lớp 11</option>
                      <option value="Lớp 12">Lớp 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="class-max">Sĩ số tối đa</label>
                    <input
                      id="class-max"
                      type="number"
                      className="form-input"
                      min={10}
                      max={60}
                      value={formData.maxStudents}
                      onChange={(e) => setFormData({ ...formData, maxStudents: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" htmlFor="class-teacher">Giáo viên phụ trách</label>
                    <input
                      id="class-teacher"
                      type="text"
                      className="form-input"
                      placeholder="Tên giáo viên"
                      value={formData.homeroomTeacherName}
                      onChange={(e) => setFormData({ ...formData, homeroomTeacherName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label" htmlFor="class-room">Phòng học</label>
                    <input
                      id="class-room"
                      type="text"
                      className="form-input"
                      placeholder="VD: P.302"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" htmlFor="class-year">Năm học</label>
                    <input
                      id="class-year"
                      type="text"
                      className="form-input"
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label" htmlFor="class-status">Trạng thái</label>
                    <select
                      id="class-status"
                      className="form-input"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ClassStatus })}
                    >
                      <option value="active">Đang học</option>
                      <option value="completed">Đã kết thúc</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label" htmlFor="class-desc">Mô tả hoặc định hướng lớp</label>
                  <textarea
                    id="class-desc"
                    className="form-input"
                    rows={2}
                    placeholder="Mô tả ngắn về lớp học..."
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
                  {editingClass ? 'Lưu thay đổi' : 'Tạo lớp học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
