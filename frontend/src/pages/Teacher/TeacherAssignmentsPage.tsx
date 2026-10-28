import React, { useEffect, useState, useMemo } from 'react'
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type {
  AdminAssignmentItem,
  AdminClassItem,
  AssignmentStatus,
} from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const TeacherAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<AdminAssignmentItem[]>([])
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all')

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<AdminAssignmentItem | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    classId: '',
    subjectName: 'Toán học 12',
    lessonTitle: '',
    dueDate: '',
    maxScore: 10,
    instructions: '',
    status: 'active' as AssignmentStatus,
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([classroomService.getAssignments(), classroomService.getClasses()])
      .then(([asgList, clsList]) => {
        setAssignments(asgList)
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
    Promise.all([classroomService.getAssignments(), classroomService.getClasses()])
      .then(([asgList, clsList]) => {
        if (active) {
          setAssignments(asgList)
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
  const totalAssignments = assignments.length
  const activeCount = assignments.filter((a) => a.status === 'active').length
  const closedCount = assignments.filter((a) => a.status === 'closed').length
  const totalSubmissions = assignments.reduce((acc, a) => acc + a.submissionsCount, 0)
  const totalExpected = assignments.reduce((acc, a) => acc + a.totalStudents, 0)
  const avgSubmissionRate = totalExpected > 0 ? Math.round((totalSubmissions / totalExpected) * 100) : 0

  // Filtered List
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.className.toLowerCase().includes(search.toLowerCase()) ||
        a.subjectName.toLowerCase().includes(search.toLowerCase())
      const matchClass = classFilter === 'all' || a.classId === classFilter
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      return matchSearch && matchClass && matchStatus
    })
  }, [assignments, search, classFilter, statusFilter])

  const handleOpenCreate = () => {
    setEditingAssignment(null)
    setFormData({
      title: '',
      classId: classes[0]?.id || 'cls-12a1',
      subjectName: 'Toán học 12',
      lessonTitle: '',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      maxScore: 10,
      instructions: '',
      status: 'active',
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (asg: AdminAssignmentItem) => {
    setEditingAssignment(asg)
    setFormData({
      title: asg.title,
      classId: asg.classId,
      subjectName: asg.subjectName,
      lessonTitle: asg.lessonTitle || '',
      dueDate: asg.dueDate ? asg.dueDate.slice(0, 10) : '',
      maxScore: asg.maxScore,
      instructions: asg.instructions || '',
      status: asg.status,
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('Vui lòng nhập tiêu đề bài tập')
      return
    }

    const selectedCls = classes.find((c) => c.id === formData.classId)
    const className = selectedCls ? selectedCls.name : 'Lớp 12A1'

    try {
      if (editingAssignment) {
        await classroomService.saveAssignment({
          ...editingAssignment,
          ...formData,
          className,
        })
        showToast(`Đã cập nhật bài tập: ${formData.title}`)
      } else {
        await classroomService.saveAssignment({
          ...formData,
          className,
          totalStudents: selectedCls ? selectedCls.studentCount || 35 : 35,
        })
        showToast(`Đã tạo thành công bài tập mới: ${formData.title}`)
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  const handleDelete = async (asg: AdminAssignmentItem) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bài tập "${asg.title}"?`)) {
      try {
        await classroomService.deleteAssignment(asg.id)
        showToast(`Đã xóa bài tập: ${asg.title}`)
        loadData()
      } catch (err: unknown) {
        if (err instanceof Error) alert(err.message)
      }
    }
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
            <h1 className="staff-page-title">Quản lý bài tập</h1>
            <p className="staff-page-desc">
              Tạo, theo dõi và quản lý việc giao bài tập tự luyện và thu hoạch cho các lớp học.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              <span>Tạo bài tập mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tổng bài tập</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
              <FileText size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{totalAssignments}</span>
            <span className="kpi-comparison">Trên toàn hệ thống</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Đang mở nộp</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{activeCount}</span>
            <span className="kpi-comparison">Còn trong thời hạn</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Đã kết thúc</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(98, 125, 152, 0.08)', color: '#627d98' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{closedCount}</span>
            <span className="kpi-comparison">Hết hạn nộp</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tỷ lệ nộp trung bình</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
              <BookOpen size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{avgSubmissionRate}%</span>
            <span className="kpi-comparison">Bài nộp / Sĩ số</span>
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
            placeholder="Tìm theo tiêu đề bài tập hoặc lớp học..."
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | AssignmentStatus)}
          aria-label="Lọc theo trạng thái"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang mở</option>
          <option value="closed">Đã kết thúc</option>
        </select>

        {(search || classFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => {
              setSearch('')
              setClassFilter('all')
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
        ) : filteredAssignments.length === 0 ? (
          <EmptyState
            title="Không tìm thấy bài tập nào"
            description="Tạo bài tập mới để giao cho học sinh ôn luyện kiến thức."
            actionLabel="Tạo bài tập mới"
            onAction={handleOpenCreate}
          />
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Tiêu đề bài tập</th>
                <th>Lớp áp dụng</th>
                <th>Môn học & Bài học</th>
                <th>Hạn nộp</th>
                <th>Tỷ lệ nộp bài</th>
                <th>Điểm TB</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((asg) => {
                const subRate = Math.min(100, Math.round((asg.submissionsCount / asg.totalStudents) * 100))
                return (
                  <tr key={asg.id}>
                    <td>
                      <div>
                        <Link
                          to={`/teacher/assignments/${asg.id}`}
                          className="font-medium text-navy-primary hover:underline"
                          style={{ fontWeight: 600, color: '#102a43' }}
                        >
                          {asg.title}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <span className="status-badge status-default" style={{ fontWeight: 600 }}>
                        {asg.className}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#102a43' }}>{asg.subjectName}</strong>
                        {asg.lessonTitle && (
                          <div style={{ fontSize: '0.78rem', color: '#627d98' }}>
                            {asg.lessonTitle}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <Calendar size={14} color="#627d98" />
                        <span>{new Date(asg.dueDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ minWidth: 100 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                          <span>{asg.submissionsCount} / {asg.totalStudents}</span>
                          <span style={{ fontWeight: 600 }}>{subRate}%</span>
                        </div>
                        <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${subRate}%`,
                              height: '100%',
                              background: subRate >= 70 ? '#047857' : subRate >= 40 ? '#0284c7' : '#dc2626',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: asg.averageScore ? '#047857' : '#627d98' }}>
                        {asg.averageScore ? asg.averageScore : '—'}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-badge ${asg.status === 'active' ? 'status-success' : 'status-default'}`}>
                        {asg.status === 'active' ? 'Đang mở' : 'Đã kết thúc'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <Link
                          to={`/teacher/assignments/${asg.id}`}
                          className="table-action-btn"
                          title="Xem bài nộp"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => handleOpenEdit(asg)}
                          title="Chỉnh sửa bài tập"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="table-action-btn text-danger"
                          onClick={() => handleDelete(asg)}
                          title="Xóa bài tập"
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

      {/* Modal Tạo / Sửa bài tập */}
      {isModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 520 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">{editingAssignment ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label" htmlFor="asg-title">Tiêu đề bài tập <span className="text-danger">*</span></label>
                  <input
                    id="asg-title"
                    type="text"
                    className="form-input"
                    placeholder="VD: Khảo sát và vẽ đồ thị hàm số"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" htmlFor="asg-class">Lớp học áp dụng <span className="text-danger">*</span></label>
                    <select
                      id="asg-class"
                      className="form-input"
                      value={formData.classId}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.grade})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="asg-subject">Môn học</label>
                    <input
                      id="asg-subject"
                      type="text"
                      className="form-input"
                      value={formData.subjectName}
                      onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" htmlFor="asg-duedate">Hạn nộp</label>
                    <input
                      id="asg-duedate"
                      type="date"
                      className="form-input"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label" htmlFor="asg-maxscore">Thang điểm tối đa</label>
                    <input
                      id="asg-maxscore"
                      type="number"
                      className="form-input"
                      min={1}
                      max={100}
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" htmlFor="asg-instructions">Hướng dẫn làm bài</label>
                  <textarea
                    id="asg-instructions"
                    className="form-input"
                    rows={3}
                    placeholder="Nhập hướng dẫn, yêu cầu trình bày hoặc định dạng tệp nộp..."
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="asg-status">Trạng thái</label>
                  <select
                    id="asg-status"
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AssignmentStatus })}
                  >
                    <option value="active">Đang mở nộp</option>
                    <option value="closed">Đã kết thúc</option>
                  </select>
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
                  {editingAssignment ? 'Lưu thay đổi' : 'Tạo bài tập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
