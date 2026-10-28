import React, { useEffect, useState, useCallback } from 'react'
import {
  GraduationCap,
  Search,
  ExternalLink,
  Star,
  Users,
  BookOpen,
  Calendar,
  Mail,
  X,
  ArrowRight,
  Eye,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { educationService } from '@/services/education.service'
import type { AdminTeacherItem } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminTeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<AdminTeacherItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Profile Modal State
  const [selectedTeacher, setSelectedTeacher] = useState<AdminTeacherItem | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    educationService
      .getTeachers({
        subject: subjectFilter,
        status: statusFilter,
        search,
      })
      .then((data) => {
        setTeachers(data)
        setLoading(false)
      })
  }, [subjectFilter, statusFilter, search])

  useEffect(() => {
    let active = true
    educationService
      .getTeachers({
        subject: subjectFilter,
        status: statusFilter,
        search,
      })
      .then((data) => {
        if (active) {
          setTeachers(data)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [subjectFilter, statusFilter, search])

  // Summary Metrics
  const totalTeachers = teachers.length
  const activeTeachers = teachers.filter((t) => t.status === 'active').length
  const totalStudents = teachers.reduce((acc, t) => acc + (t.studentCount || 0), 0)
  const avgRating = (
    teachers.reduce((acc, t) => acc + (t.rating || 0), 0) / (totalTeachers || 1)
  ).toFixed(2)

  return (
    <div className="staff-page">
      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-header-row">
          <div>
            <div className="admin-prototype-badge">
              <span className="prototype-dot" />
              <span>Dữ liệu mô phỏng · Lưu cục bộ</span>
            </div>
            <h1 className="staff-page-title">Quản lý giáo viên</h1>
            <p className="staff-page-desc">
              Quản trị đội ngũ giáo viên, bộ môn chuyên môn, phân công lớp giảng dạy và kết nối nhanh sang Teacher Workspace.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={loadData}
              aria-label="Làm mới danh sách giáo viên"
            >
              Làm mới
            </button>
            <Link
              to="/teacher"
              className="admin-btn-primary"
              title="Truy cập không gian làm việc của giáo viên"
              aria-label="Đến Teacher Workspace"
            >
              <span>Teacher Workspace</span>
              <ExternalLink size={15} />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="admin-education-summary-grid">
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Tổng số giáo viên</span>
            <GraduationCap size={18} className="admin-kpi-icon" />
          </div>
          <div className="admin-kpi-value">{totalTeachers}</div>
          <div className="admin-kpi-comparison">Đội ngũ giảng dạy hệ thống</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Đang giảng dạy</span>
            <Users size={18} className="admin-kpi-icon" />
          </div>
          <div className="admin-kpi-value">{activeTeachers}</div>
          <div className="admin-kpi-comparison">Trạng thái tài khoản Active</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Học sinh phụ trách</span>
            <BookOpen size={18} className="admin-kpi-icon" />
          </div>
          <div className="admin-kpi-value">{totalStudents}</div>
          <div className="admin-kpi-comparison">Tổng quy mô học sinh các lớp</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Đánh giá trung bình</span>
            <Star size={18} className="admin-kpi-icon" style={{ color: '#f59e0b' }} />
          </div>
          <div className="admin-kpi-value">{avgRating} / 5.0</div>
          <div className="admin-kpi-comparison">Phản hồi chất lượng học viên</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-toolbar" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div className="admin-search-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="search"
            placeholder="Tìm theo tên giáo viên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
            aria-label="Tìm kiếm giáo viên"
          />
        </div>

        <div className="admin-filter-group" style={{ gap: '8px' }}>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="admin-select"
            aria-label="Lọc theo bộ môn"
          >
            <option value="all">Tất cả bộ môn</option>
            <option value="Toán học">Toán học</option>
            <option value="Vật lý">Vật lý</option>
            <option value="Hóa học">Hóa học</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-select"
            aria-label="Lọc trạng thái hoạt động"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động (Active)</option>
            <option value="pending">Chờ phê duyệt</option>
            <option value="inactive">Tạm dừng</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      {loading ? (
        <div className="admin-table-container">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '16px' }}>
              <Skeleton width="100%" height="40px" />
            </div>
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <EmptyState
          title="Không tìm thấy giáo viên nào"
          description="Thử thay đổi bộ lọc tìm kiếm hoặc kiểm tra danh sách tài khoản."
          icon={GraduationCap}
        />
      ) : (
        <div className="admin-table-container">
          <table className="admin-table" aria-label="Bảng danh sách giáo viên">
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Bộ môn phụ trách</th>
                <th>Lớp giảng dạy</th>
                <th style={{ textAlign: 'center' }}>Số học sinh</th>
                <th style={{ textAlign: 'center' }}>Đánh giá</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((tch) => (
                <tr key={tch.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'var(--navy-primary, #102a43)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        {tch.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main, #102a43)' }}>
                          {tch.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #627d98)' }}>
                          {tch.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="admin-badge-role">{tch.subject}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {tch.classes.map((cls) => (
                        <span key={cls} className="admin-teacher-badge">
                          {cls}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{tch.studentCount} em</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <Star size={13} fill="#f59e0b" color="#f59e0b" />
                      <span>{tch.rating}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={tch.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="admin-btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', gap: '4px' }}
                        onClick={() => setSelectedTeacher(tch)}
                        title="Xem hồ sơ giáo viên"
                        aria-label={`Xem hồ sơ ${tch.name}`}
                      >
                        <Eye size={13} />
                        <span>Hồ sơ</span>
                      </button>
                      <Link
                        to="/teacher"
                        className="admin-btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', gap: '4px' }}
                        title="Mở Teacher Workspace"
                        aria-label={`Teacher Workspace ${tch.name}`}
                      >
                        <ExternalLink size={13} />
                        <span>Workspace</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TEACHER PROFILE MODAL */}
      {selectedTeacher && (
        <div className="admin-dialog-backdrop" onClick={() => setSelectedTeacher(null)}>
          <div
            className="admin-dialog-card"
            style={{ maxWidth: '520px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-modal-title"
          >
            <div className="admin-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="admin-form-icon-wrap">
                  <GraduationCap size={16} />
                </span>
                <h2 id="teacher-modal-title" className="admin-dialog-title">
                  Hồ sơ giáo viên
                </h2>
              </div>
              <button
                type="button"
                className="admin-dialog-close"
                onClick={() => setSelectedTeacher(null)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <div className="admin-dialog-body" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'var(--navy-primary, #102a43)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                  }}
                >
                  {selectedTeacher.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main, #102a43)' }}>
                    {selectedTeacher.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span className="admin-badge-role">{selectedTeacher.subject}</span>
                    <StatusBadge status={selectedTeacher.status} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={15} style={{ color: 'var(--text-muted, #627d98)' }} />
                  <span style={{ color: 'var(--text-muted, #627d98)' }}>Email:</span>
                  <strong style={{ color: 'var(--text-main, #102a43)' }}>{selectedTeacher.email}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} style={{ color: 'var(--text-muted, #627d98)' }} />
                  <span style={{ color: 'var(--text-muted, #627d98)' }}>Ngày tham gia:</span>
                  <strong>{new Date(selectedTeacher.joinedAt).toLocaleDateString('vi-VN')}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={15} style={{ color: '#f59e0b' }} />
                  <span style={{ color: 'var(--text-muted, #627d98)' }}>Đánh giá chất lượng:</span>
                  <strong>{selectedTeacher.rating} / 5.0 (Rất tốt)</strong>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <span style={{ color: 'var(--text-muted, #627d98)', display: 'block', marginBottom: '6px' }}>
                    Các lớp học phụ trách:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedTeacher.classes.map((c) => (
                      <span
                        key={c}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(16, 42, 67, 0.08)',
                          color: 'var(--navy-primary, #102a43)',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-dialog-footer">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setSelectedTeacher(null)}
              >
                Đóng
              </button>
              <Link
                to="/teacher"
                className="admin-btn-primary"
                onClick={() => setSelectedTeacher(null)}
              >
                <span>Chuyển đến Teacher Workspace</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
