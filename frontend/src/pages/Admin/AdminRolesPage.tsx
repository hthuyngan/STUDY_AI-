import React from 'react'
import { Check, X } from 'lucide-react'
import { ROLE_PERMISSIONS } from '@/auth/permissions'
import type { RolePermission } from '@/auth/permissions'
import type { UserRole } from '@/auth/auth.types'
import { ROLE_LABELS } from '@/components/layout/workspaceNavigation'
import './AdminPages.css'

interface PermissionRow {
  key: RolePermission
  label: string
  description: string
}

const PERMISSION_ROWS: PermissionRow[] = [
  {
    key: 'manage_users',
    label: 'Quản lý người dùng',
    description: 'Xem danh sách, đổi trạng thái và gán vai trò tài khoản.',
  },
  {
    key: 'manage_roles',
    label: 'Quản trị phân quyền',
    description: 'Quyền xem và điều chỉnh ma trận quyền hạn hệ thống.',
  },
  {
    key: 'view_system_metrics',
    label: 'Xem thông số hệ thống',
    description: 'Theo dõi độ trễ API, kết nối database và tình trạng hệ thống.',
  },
  {
    key: 'view_classes',
    label: 'Xem lớp học',
    description: 'Truy cập danh sách lớp học và danh sách học sinh theo lớp.',
  },
  {
    key: 'manage_assignments',
    label: 'Quản lý bài tập',
    description: 'Tạo bài tập, ấn định thời hạn nộp và theo dõi tỷ lệ hoàn thành.',
  },
  {
    key: 'view_student_progress',
    label: 'Xem tiến độ học tập',
    description: 'Xem tiến trình bài học và kết quả bài thu hoạch của học sinh.',
  },
  {
    key: 'manage_content',
    label: 'Soạn thảo nội dung',
    description: 'Tạo và cập nhật nội dung bài học, định nghĩa, công thức toán.',
  },
  {
    key: 'review_content',
    label: 'Kiểm duyệt nội dung',
    description: 'Đánh giá, phản hồi và phê duyệt bài học trong hàng đợi.',
  },
  {
    key: 'publish_content',
    label: 'Xuất bản giáo trình',
    description: 'Phát hành chính thức bài học lên chương trình của học viên.',
  },
  {
    key: 'manage_support_tickets',
    label: 'Xử lý ticket hỗ trợ',
    description: 'Tiếp nhận, phản hồi và cập nhật trạng thái yêu cầu người dùng.',
  },
  {
    key: 'view_user_support_profile',
    label: 'Tra cứu hồ sơ hỗ trợ',
    description: 'Tra cứu tài khoản và trạng thái đồng bộ khi giải quyết khiếu nại.',
  },
]

const ROLES: UserRole[] = ['learner', 'teacher', 'content', 'support', 'admin']

export const AdminRolesPage: React.FC = () => {
  return (
    <div className="admin-roles-page">
      <div className="staff-page-header">
        <h1 className="staff-page-title">Ma trận phân quyền & Vai trò</h1>
        <p className="staff-page-desc">
          Bảng phân quyền chi tiết cho 5 vai trò tích hợp sẵn trong hệ thống StudyAI.
        </p>
      </div>

      <div className="staff-table-wrapper">
        <table className="staff-table" aria-label="Ma trận phân quyền vai trò">
          <thead>
            <tr>
              <th scope="col" style={{ width: '320px' }}>Quyền hạn</th>
              {ROLES.map((r) => (
                <th key={r} scope="col" style={{ textAlign: 'center' }}>
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_ROWS.map((row) => (
              <tr key={row.key}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {row.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {row.description}
                  </div>
                </td>
                {ROLES.map((r) => {
                  const allowed = ROLE_PERMISSIONS[r].includes(row.key)
                  return (
                    <td key={r} style={{ textAlign: 'center' }}>
                      {allowed ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'rgba(4, 120, 87, 0.1)',
                            color: '#047857',
                          }}
                          aria-label={`Vai trò ${ROLE_LABELS[r]} có quyền ${row.label}`}
                        >
                          <Check size={14} />
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'rgba(98, 125, 152, 0.06)',
                            color: 'var(--border-subtle)',
                          }}
                          aria-label={`Vai trò ${ROLE_LABELS[r]} không có quyền ${row.label}`}
                        >
                          <X size={12} />
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
