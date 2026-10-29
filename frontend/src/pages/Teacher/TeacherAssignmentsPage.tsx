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
import './TeacherPages.css'
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
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Quản lý bài tập</h1>
            <p className="staff-page-desc">
              Giao bài tập nhiệm vụ, kiểm tra tiến độ nộp bài và đánh giá kết quả học tập của các lớp.
            </p>
          </div>
          <div className="admin-header-actions" style={{ display: 'flex', gap: 10 }}>
            <Link
              to="/teacher/assignments/new"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <FileText size={16} />
              <span>Trang tạo mới</span>
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              <span>Giao bài tập</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tổng số bài tập</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
              <FileText size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{totalAssignments}</span>
            <span className="kpi-comparison">Đã giao</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Đang mở nộp</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{activeCount}</span>
            <span className="kpi-comparison">Trong hạn hoàn thành</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Đã kết thúc</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(100, 116, 139, 0.08)', color: '#64748b' }}>
              <BookOpen size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{closedCount}</span>
            <span className="kpi-comparison">Đã khóa bài</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tỷ lệ nộp trung bình</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{avgSubmissionRate}%</span>
            <span className="kpi-comparison">{totalSubmissions}/{totalExpected} bài nộp</span>
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
            placeholder="Tìm theo tên bài tập, lớp hoặc môn học..."
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
              {c.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Lọc theo trạng thái bài tập"
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | AssignmentStatus)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang mở nộp</option>
          <option value="closed">Đã đóng</option>
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

      {/* Assignment List: Desktop Table + Mobile Cards */}
      <div className="teacher-classes-wrapper">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredAssignments.length === 0 ? (
          <EmptyState
            title="Chưa có bài tập nào"
            description="Hãy thử thay đổi điều kiện lọc hoặc tạo bài tập mới cho học sinh."
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="staff-table-wrapper teacher-desktop-table">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Tên bài tập</th>
                    <th>Lớp học</th>
                    <th>Môn học</th>
                    <th>Hạn nộp</th>
                    <th>Bài nộp</th>
                    <th>Điểm TB</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((asg) => {
                    const rate = asg.totalStudents > 0 ? Math.round((asg.submissionsCount / asg.totalStudents) * 100) : 0
                    return (
                      <tr key={asg.id}>
                        <td>
                          <Link
                            to={`/teacher/assignments/${asg.id}`}
                            className="font-medium text-navy-primary hover:underline"
                            style={{ fontWeight: 600, color: '#102a43' }}
                          >
                            {asg.title}
                          </Link>
                          {asg.lessonTitle && (
                            <div style={{ fontSize: '0.78rem', color: '#627d98', marginTop: 2 }}>
                              Trọng tâm: {asg.lessonTitle}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{asg.className}</span>
                        </td>
                        <td>
                          <span className="subject-badge-pill">{asg.subjectName}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                            <Calendar size={13} color="#627d98" />
                            <span>{new Date(asg.dueDate).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{asg.submissionsCount}/{asg.totalStudents}</span>
                            <span style={{ fontSize: '0.75rem', color: '#627d98' }}>({rate}%)</span>
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: asg.averageScore ? (asg.averageScore >= 8 ? '#047857' : '#d97706') : '#94a3b8' }}>
                            {asg.averageScore ? asg.averageScore.toFixed(1) : '—'}
                          </strong>
                        </td>
                        <td>
                          <span className={`status-badge ${asg.status === 'active' ? 'status-success' : 'status-default'}`}>
                            {asg.status === 'active' ? 'Đang mở' : 'Đã đóng'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                            <Link
                              to={`/teacher/assignments/${asg.id}`}
                              className="table-action-btn"
                              title="Xem danh sách bài nộp và chấm điểm"
                              aria-label={`Xem bài nộp và chấm điểm ${asg.title}`}
                            >
                              <Eye size={16} />
                            </Link>
                            <button
                              type="button"
                              className="table-action-btn"
                              onClick={() => handleOpenEdit(asg)}
                              title="Chỉnh sửa bài tập"
                              aria-label={`Chỉnh sửa bài tập ${asg.title}`}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="table-action-btn text-danger"
                              onClick={() => handleDelete(asg)}
                              title="Xóa bài tập"
                              aria-label={`Xóa bài tập ${asg.title}`}
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
            </div>

            {/* Mobile Cards List (<768px) */}
            <div className="teacher-mobile-cards-list">
              {filteredAssignments.map((asg) => {
                const rate = asg.totalStudents > 0 ? Math.round((asg.submissionsCount / asg.totalStudents) * 100) : 0
                return (
                  <div key={asg.id} className="teacher-card-item">
                    <div className="teacher-card-item-header">
                      <div>
                        <Link to={`/teacher/assignments/${asg.id}`} className="teacher-card-title">
                          {asg.title}
                        </Link>
                        <div className="teacher-card-meta-line">
                          <span>{asg.className}</span>
                          <span>•</span>
                          <span>{asg.subjectName}</span>
                        </div>
                      </div>
                      <span className={`status-badge ${asg.status === 'active' ? 'status-success' : 'status-default'}`}>
                        {asg.status === 'active' ? 'Đang mở' : 'Đã đóng'}
                      </span>
                    </div>

                    <div className="teacher-card-item-body">
                      <div className="teacher-card-stat">
                        <span className="teacher-stat-label">Hạn nộp</span>
                        <strong className="teacher-stat-val" style={{ fontSize: '0.85rem' }}>
                          {new Date(asg.dueDate).toLocaleDateString('vi-VN')}
                        </strong>
                      </div>
                      <div className="teacher-card-stat">
                        <span className="teacher-stat-label">Bài nộp</span>
                        <strong className="teacher-stat-val">{asg.submissionsCount}/{asg.totalStudents} ({rate}%)</strong>
                      </div>
                      <div className="teacher-card-stat">
                        <span className="teacher-stat-label">Điểm TB</span>
                        <strong className="teacher-stat-val">
                          {asg.averageScore ? asg.averageScore.toFixed(1) : '—'}
                        </strong>
                      </div>
                    </div>

                    <div className="teacher-card-item-footer">
                      <Link
                        to={`/teacher/assignments/${asg.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                      >
                        <Eye size={14} />
                        <span>Xem & Chấm bài</span>
                      </Link>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(asg)}
                        title="Sửa"
                        aria-label={`Chỉnh sửa ${asg.title}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm text-danger"
                        onClick={() => handleDelete(asg)}
                        title="Xóa"
                        aria-label={`Xóa ${asg.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal Dialog Tạo / Sửa Bài Tập */}
      {isModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3 className="modal-title">
                {editingAssignment ? 'Chỉnh sửa bài tập' : 'Giao bài tập mới'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="asg-title-input">
                    Tiêu đề bài tập <span className="text-danger">*</span>
                  </label>
                  <input
                    id="asg-title-input"
                    type="text"
                    className="form-input"
                    placeholder="VD: Bài tập Khảo sát hàm phân thức bậc nhất..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="asg-class-select">Lớp học giao bài</label>
                    <select
                      id="asg-class-select"
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
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="asg-subject-input">Môn học</label>
                    <input
                      id="asg-subject-input"
                      type="text"
                      className="form-input"
                      value={formData.subjectName}
                      onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1.5 }}>
                    <label className="form-label" htmlFor="asg-due-date">Hạn nộp bài</label>
                    <input
                      id="asg-due-date"
                      type="date"
                      className="form-input"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="asg-max-score">Thang điểm</label>
                    <input
                      id="asg-max-score"
                      type="number"
                      min={1}
                      max={100}
                      className="form-input"
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="asg-instructions-input">Hướng dẫn làm bài</label>
                  <textarea
                    id="asg-instructions-input"
                    className="form-input"
                    rows={3}
                    placeholder="Nhập yêu cầu làm bài hoặc tài liệu tham khảo..."
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
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
                  {editingAssignment ? 'Lưu thay đổi' : 'Giao bài tập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
