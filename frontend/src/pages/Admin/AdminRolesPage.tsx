import React, { useState } from 'react'
import {
  Check,
  X,
  Shield,
  RotateCcw,
  GraduationCap,
  Briefcase,
  BookOpen,
  Headphones,
  SlidersHorizontal,
  Info,
} from 'lucide-react'
import { ROLE_PERMISSIONS } from '@/auth/permissions'
import type { RolePermission } from '@/auth/permissions'
import type { UserRole } from '@/auth/auth.types'
import { ROLE_LABELS } from '@/components/layout/workspaceNavigation'
import { useAdminRolesSimulation } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

interface PermissionRow {
  key: RolePermission
  label: string
  description: string
  category: 'Quản trị & Hệ thống' | 'Giảng dạy & Lớp học' | 'Nội dung & Giáo trình' | 'Hỗ trợ khách hàng'
}

const PERMISSION_ROWS: PermissionRow[] = [
  {
    key: 'manage_users',
    label: 'Quản lý người dùng',
    description: 'Xem danh sách, đổi trạng thái và gán vai trò tài khoản.',
    category: 'Quản trị & Hệ thống',
  },
  {
    key: 'manage_roles',
    label: 'Quản trị phân quyền',
    description: 'Quyền xem và điều chỉnh ma trận quyền hạn hệ thống.',
    category: 'Quản trị & Hệ thống',
  },
  {
    key: 'view_system_metrics',
    label: 'Xem thông số hệ thống',
    description: 'Theo dõi độ trễ API, kết nối database và tình trạng hệ thống.',
    category: 'Quản trị & Hệ thống',
  },
  {
    key: 'view_classes',
    label: 'Xem lớp học',
    description: 'Truy cập danh sách lớp học và danh sách học sinh theo lớp.',
    category: 'Giảng dạy & Lớp học',
  },
  {
    key: 'manage_assignments',
    label: 'Quản lý bài tập',
    description: 'Tạo bài tập, ấn định thời hạn nộp và theo dõi tỷ lệ hoàn thành.',
    category: 'Giảng dạy & Lớp học',
  },
  {
    key: 'view_student_progress',
    label: 'Xem tiến độ học tập',
    description: 'Xem tiến trình bài học và kết quả bài thu hoạch của học sinh.',
    category: 'Giảng dạy & Lớp học',
  },
  {
    key: 'manage_content',
    label: 'Soạn thảo nội dung',
    description: 'Tạo và cập nhật nội dung bài học, định nghĩa, công thức toán.',
    category: 'Nội dung & Giáo trình',
  },
  {
    key: 'review_content',
    label: 'Kiểm duyệt nội dung',
    description: 'Đánh giá, phản hồi và phê duyệt bài học trong hàng đợi.',
    category: 'Nội dung & Giáo trình',
  },
  {
    key: 'publish_content',
    label: 'Xuất bản giáo trình',
    description: 'Phát hành chính thức bài học lên chương trình của học viên.',
    category: 'Nội dung & Giáo trình',
  },
  {
    key: 'manage_support_tickets',
    label: 'Xử lý ticket hỗ trợ',
    description: 'Tiếp nhận, phản hồi và cập nhật trạng thái yêu cầu người dùng.',
    category: 'Hỗ trợ khách hàng',
  },
  {
    key: 'view_user_support_profile',
    label: 'Tra cứu hồ sơ hỗ trợ',
    description: 'Tra cứu tài khoản và trạng thái đồng bộ khi giải quyết khiếu nại.',
    category: 'Hỗ trợ khách hàng',
  },
]

const ROLES: UserRole[] = ['learner', 'teacher', 'content', 'support', 'admin']

interface RoleDetailInfo {
  role: UserRole
  icon: React.ComponentType<{ size?: number }>
  title: string
  scope: string
  accessRoutes: string
  description: string
}

const ROLE_DETAILS: RoleDetailInfo[] = [
  {
    role: 'learner',
    icon: GraduationCap,
    title: 'Học viên (Learner)',
    scope: 'Giao diện học viên',
    accessRoutes: '/dashboard, /subjects, /ai-tutor, /quiz',
    description: 'Truy cập các khóa học Toán 12, hỏi đáp trợ lý AI Tutor, làm bài luyện tập và kiểm tra thu hoạch.',
  },
  {
    role: 'teacher',
    icon: Briefcase,
    title: 'Giáo viên (Teacher)',
    scope: 'Không gian giảng dạy',
    accessRoutes: '/teacher, /teacher/classes, /teacher/assignments',
    description: 'Quản lý danh sách lớp học được phân công, giao bài tập thu hoạch, chấm điểm và theo dõi tiến độ học sinh.',
  },
  {
    role: 'content',
    icon: BookOpen,
    title: 'Biên soạn nội dung (Content)',
    scope: 'Không gian giáo trình',
    accessRoutes: '/content, /content/curriculum, /content/review',
    description: 'Biên soạn giáo án, nội dung đa phương tiện, công thức toán LaTeX và gửi kiểm duyệt xuất bản.',
  },
  {
    role: 'support',
    icon: Headphones,
    title: 'Hỗ trợ kỹ thuật (Support)',
    scope: 'Trung tâm hỗ trợ',
    accessRoutes: '/support, /support/tickets, /support/users',
    description: 'Tiếp nhận ticket từ học sinh/phụ huynh, tra cứu trạng thái đồng bộ ngoại tuyến và xử lý sự cố tài khoản.',
  },
  {
    role: 'admin',
    icon: Shield,
    title: 'Quản trị viên (Admin)',
    scope: 'Toàn quyền hệ thống',
    accessRoutes: '/admin, /admin/users, /admin/roles, /admin/system',
    description: 'Giám sát toàn bộ hoạt động nền tảng STUDY_AI, quản lý tài khoản người dùng, phân quyền và cấu hình vận hành.',
  },
]

export const AdminRolesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'simulator' | 'explanation'>('matrix')
  const { permissionsMap, loading, togglePermission, resetDefaults } = useAdminRolesSimulation()

  return (
    <div className="admin-roles-page">
      {/* Page Header */}
      <div className="admin-header-row">
        <div className="staff-page-header" style={{ marginBottom: 0 }}>
          <h1 className="staff-page-title">Ma trận phân quyền & Vai trò</h1>
          <p className="staff-page-desc">
            Phân định quyền hạn cho 5 vai trò hệ thống và mô phỏng chính sách truy cập STUDY_AI.
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="admin-roles-tabs" role="tablist" style={{ marginTop: '20px', marginBottom: '20px' }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'matrix'}
          className={`admin-tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          <Shield size={15} />
          <span>Ma trận quyền chuẩn</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'simulator'}
          className={`admin-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          <SlidersHorizontal size={15} />
          <span>Mô phỏng cấu hình quyền (Sandbox)</span>
          <span className="admin-tab-pill">Demo</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'explanation'}
          className={`admin-tab-btn ${activeTab === 'explanation' ? 'active' : ''}`}
          onClick={() => setActiveTab('explanation')}
        >
          <Info size={15} />
          <span>Giải thích chi tiết 5 vai trò</span>
        </button>
      </div>

      {/* Tab 1: Standard Matrix */}
      {activeTab === 'matrix' && (
        <div className="staff-table-wrapper">
          <table className="staff-table" aria-label="Ma trận phân quyền vai trò chuẩn">
            <thead>
              <tr>
                <th scope="col" style={{ width: '340px' }}>Quyền hạn</th>
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
                            className="role-perm-check"
                            aria-label={`Vai trò ${ROLE_LABELS[r]} có quyền ${row.label}`}
                          >
                            <Check size={14} />
                          </span>
                        ) : (
                          <span
                            className="role-perm-cross"
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
      )}

      {/* Tab 2: Interactive Simulation Sandbox */}
      {activeTab === 'simulator' && (
        <div className="admin-roles-simulator-section">
          {/* Simulation disclaimer banner */}
          <div className="admin-sandbox-notice">
            <Info size={18} className="sandbox-notice-icon" />
            <div>
              <div className="sandbox-notice-title">Chế độ mô phỏng cấu hình quyền (Prototype Sandbox)</div>
              <div className="sandbox-notice-desc">
                Bạn có thể bấm trực tiếp vào từng ô để kích hoạt hoặc hủy kích hoạt quyền demo.
                Các thay đổi được lưu tạm thời vào <code>localStorage</code> và <strong>không ảnh hưởng đến cơ chế phân quyền bảo mật của backend</strong>.
              </div>
            </div>
            <Button
              variant="outline"
              icon={RotateCcw}
              onClick={resetDefaults}
              style={{ marginLeft: 'auto', flexShrink: 0 }}
            >
              Đặt lại mặc định
            </Button>
          </div>

          <div className="staff-table-wrapper" style={{ marginTop: '16px' }}>
            {loading || !permissionsMap ? (
              <div style={{ padding: '24px' }}>
                <Skeleton height={40} style={{ marginBottom: 8 }} />
                <Skeleton height={40} />
              </div>
            ) : (
              <table className="staff-table" aria-label="Bảng mô phỏng cấu hình phân quyền">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '340px' }}>Quyền hạn</th>
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
                        const allowed = (permissionsMap[r] || []).includes(row.key)
                        return (
                          <td key={r} style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={`role-sim-toggle-btn ${allowed ? 'enabled' : 'disabled'}`}
                              onClick={() => togglePermission(r, row.key)}
                              aria-pressed={allowed}
                              aria-label={`Bật/tắt quyền ${row.label} cho ${ROLE_LABELS[r]}`}
                              title={`Bấm để ${allowed ? 'hủy' : 'cấp'} quyền`}
                            >
                              {allowed ? <Check size={14} /> : <X size={12} />}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Roles Explanation Cards */}
      {activeTab === 'explanation' && (
        <div className="admin-roles-cards-grid">
          {ROLE_DETAILS.map((info) => {
            const Icon = info.icon
            return (
              <div key={info.role} className="staff-card admin-role-card">
                <div className="admin-role-card-header">
                  <div className="admin-role-icon-box" aria-hidden="true">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="admin-role-card-title">{info.title}</h3>
                    <span className="admin-role-scope-badge">{info.scope}</span>
                  </div>
                </div>

                <div className="admin-role-card-body">
                  <p className="admin-role-desc">{info.description}</p>

                  <div className="admin-role-routes-box">
                    <span className="routes-label">Các tuyến đường truy cập chính:</span>
                    <code>{info.accessRoutes}</code>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
