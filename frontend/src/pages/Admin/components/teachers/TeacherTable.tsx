import React from 'react'
import {
  Eye,
  Edit2,
  CalendarCheck,
  Lock,
  Unlock,
  Star,
  ExternalLink,
  ArrowUpDown,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AdminTeacherItem } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'

export type TeacherSortField = 'name' | 'subject' | 'studentCount' | 'rating' | 'joinedAt'

export interface TeacherSort {
  field: TeacherSortField
  direction: 'asc' | 'desc'
}

export interface TeacherTableProps {
  teachers: AdminTeacherItem[]
  selectedIds: string[]
  onToggleSelectAll: (checked: boolean) => void
  onToggleSelectTeacher: (id: string, checked: boolean) => void
  selectedTeacherId: string | null
  onSelectTeacher: (teacher: AdminTeacherItem) => void
  onEditTeacher: (teacher: AdminTeacherItem) => void
  onChangeTeachingStatus: (teacher: AdminTeacherItem) => void
  onToggleLockAccount: (teacher: AdminTeacherItem) => void
  sort: TeacherSort
  onSortChange: (field: TeacherSortField) => void
}

export const TeacherTable: React.FC<TeacherTableProps> = ({
  teachers,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectTeacher,
  selectedTeacherId,
  onSelectTeacher,
  onEditTeacher,
  onChangeTeachingStatus,
  onToggleLockAccount,
  sort,
  onSortChange,
}) => {
  const isAllSelected = teachers.length > 0 && selectedIds.length === teachers.length

  const renderSortIndicator = (field: TeacherSortField) => {
    if (sort.field !== field) {
      return <ArrowUpDown size={12} className="teacher-sort-idle" aria-hidden="true" />
    }
    return (
      <span className="teacher-sort-active">
        {sort.direction === 'asc' ? '▲' : '▼'}
      </span>
    )
  }

  return (
    <div className="teacher-table-wrapper" role="region" aria-label="Bảng giáo viên">
      <table className="teacher-data-table" aria-label="Danh sách giáo viên hệ thống">
        <thead>
          <tr>
            <th className="th-checkbox">
              <input
                type="checkbox"
                className="admin-checkbox"
                checked={isAllSelected}
                onChange={(e) => onToggleSelectAll(e.target.checked)}
                aria-label="Chọn tất cả giáo viên trên trang"
              />
            </th>
            <th onClick={() => onSortChange('name')} className="th-sortable" style={{ cursor: 'pointer' }}>
              <div className="th-content">
                <span>Giáo viên</span>
                {renderSortIndicator('name')}
              </div>
            </th>
            <th onClick={() => onSortChange('subject')} className="th-sortable" style={{ cursor: 'pointer' }}>
              <div className="th-content">
                <span>Bộ môn</span>
                {renderSortIndicator('subject')}
              </div>
            </th>
            <th>Lớp phụ trách</th>
            <th
              onClick={() => onSortChange('studentCount')}
              className="th-sortable"
              style={{ textAlign: 'center', cursor: 'pointer' }}
            >
              <div className="th-content th-content-center">
                <span>Học sinh</span>
                {renderSortIndicator('studentCount')}
              </div>
            </th>
            <th
              onClick={() => onSortChange('rating')}
              className="th-sortable"
              style={{ textAlign: 'center', cursor: 'pointer' }}
            >
              <div className="th-content th-content-center">
                <span>Đánh giá</span>
                {renderSortIndicator('rating')}
              </div>
            </th>
            <th>Trạng thái</th>
            <th style={{ textAlign: 'right' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((tch) => {
            const isSelected = selectedIds.includes(tch.id)
            const isActiveRow = selectedTeacherId === tch.id
            const isLocked = tch.accountStatus === 'LOCKED'

            return (
              <tr
                key={tch.id}
                className={`${isSelected ? 'row-selected' : ''} ${isActiveRow ? 'row-active-drawer' : ''}`.trim()}
              >
                <td className="td-checkbox">
                  <input
                    type="checkbox"
                    className="admin-checkbox"
                    checked={isSelected}
                    onChange={(e) => onToggleSelectTeacher(tch.id, e.target.checked)}
                    aria-label={`Chọn giáo viên ${tch.name}`}
                  />
                </td>

                {/* Teacher Profile Cell */}
                <td className="td-teacher">
                  <div className="teacher-cell-wrap">
                    <div className="teacher-avatar" aria-hidden="true">
                      {tch.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="teacher-info">
                      <button
                        type="button"
                        className="teacher-name-link"
                        onClick={() => onSelectTeacher(tch)}
                        title={`Xem hồ sơ chi tiết ${tch.name}`}
                      >
                        {tch.name}
                      </button>
                      <span className="teacher-email">{tch.email}</span>
                    </div>
                  </div>
                </td>

                {/* Subject Badge */}
                <td>
                  <span className="teacher-subject-pill">{tch.subject}</span>
                </td>

                {/* Assigned Classes */}
                <td>
                  <div className="teacher-classes-chips">
                    {tch.classes && tch.classes.length > 0 ? (
                      tch.classes.map((cls) => (
                        <span key={cls} className="teacher-class-chip">
                          {cls}
                        </span>
                      ))
                    ) : (
                      <span className="teacher-class-empty">Chưa phân công</span>
                    )}
                  </div>
                </td>

                {/* Student Count */}
                <td style={{ textAlign: 'center' }}>
                  <span className="teacher-student-count">{tch.studentCount} em</span>
                </td>

                {/* Rating */}
                <td style={{ textAlign: 'center' }}>
                  <div className="teacher-rating-pill">
                    <Star size={12} fill="#f59e0b" color="#f59e0b" aria-hidden="true" />
                    <span>{tch.rating.toFixed(1)}</span>
                  </div>
                </td>

                {/* Status Badges */}
                <td>
                  <div className="teacher-status-badges">
                    <StatusBadge status={tch.status} />
                    {isLocked && (
                      <span className="teacher-locked-badge" title="Tài khoản đang bị khóa">
                        <Lock size={10} aria-hidden="true" />
                        <span>Đã khóa</span>
                      </span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td style={{ textAlign: 'right' }}>
                  <div className="teacher-action-buttons">
                    <button
                      type="button"
                      className="teacher-action-btn"
                      onClick={() => onSelectTeacher(tch)}
                      title="Xem hồ sơ chi tiết (Drawer)"
                      aria-label={`Xem hồ sơ ${tch.name}`}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      className="teacher-action-btn"
                      onClick={() => onEditTeacher(tch)}
                      title="Chỉnh sửa thông tin giáo viên"
                      aria-label={`Chỉnh sửa ${tch.name}`}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="teacher-action-btn"
                      onClick={() => onChangeTeachingStatus(tch)}
                      title="Đổi trạng thái giảng dạy"
                      aria-label={`Đổi trạng thái ${tch.name}`}
                    >
                      <CalendarCheck size={14} />
                    </button>
                    <button
                      type="button"
                      className={`teacher-action-btn ${isLocked ? 'teacher-action-unlock' : 'teacher-action-lock'}`}
                      onClick={() => onToggleLockAccount(tch)}
                      title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                      aria-label={isLocked ? `Mở khóa ${tch.name}` : `Khóa ${tch.name}`}
                    >
                      {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                    </button>
                    <Link
                      to="/teacher"
                      className="teacher-action-btn"
                      title="Chuyển đến Teacher Workspace"
                      aria-label={`Teacher Workspace ${tch.name}`}
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
