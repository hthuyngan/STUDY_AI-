import React from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  BookOpen,
  GraduationCap,
  Headphones,
  CheckCircle2,
  LifeBuoy,
  Bell,
  ShieldCheck,
  Settings,
  ArrowRight,
} from 'lucide-react'
import './AdminComponents.css'

export interface QuickActionItem {
  id: string
  title: string
  description: string
  url: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: string
}

const DEFAULT_QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'users',
    title: 'Quản lý người dùng',
    description: 'Tra cứu danh sách, phân quyền và duyệt tài khoản mới.',
    url: '/admin/users',
    icon: Users,
    badge: 'Quản trị',
  },
  {
    id: 'curriculum',
    title: 'Quản lý giáo trình',
    description: 'Biên soạn nội dung bài học, định nghĩa và kiểm duyệt giáo trình.',
    url: '/content',
    icon: BookOpen,
    badge: 'Nội dung',
  },
  {
    id: 'teacher',
    title: 'Không gian giáo viên',
    description: 'Theo dõi các lớp học, tạo bài tập thu hoạch và xem kết quả.',
    url: '/teacher',
    icon: GraduationCap,
    badge: 'Giảng dạy',
  },
  {
    id: 'support',
    title: 'Trung tâm hỗ trợ',
    description: 'Xử lý các ticket khiếu nại, trợ giúp kỹ thuật và đồng bộ dữ liệu.',
    url: '/support',
    icon: Headphones,
    badge: 'Vận hành',
  },
  {
    id: 'approvals',
    title: 'Duyệt nội dung',
    description: 'Thẩm định bài học, tài liệu chờ duyệt và phát hành giáo trình.',
    url: '/admin/approvals',
    icon: CheckCircle2,
    badge: 'Kiểm soát',
  },
  {
    id: 'tickets',
    title: 'Yêu cầu hỗ trợ',
    description: 'Tiếp nhận sự cố kỹ thuật, học tập từ học viên và phân công xử lý.',
    url: '/admin/tickets',
    icon: LifeBuoy,
    badge: 'Vận hành',
  },
  {
    id: 'announcements',
    title: 'Thông báo hệ thống',
    description: 'Phát thanh tin tức khẩn, bảo trì và thông điệp tới toàn trường.',
    url: '/admin/announcements',
    icon: Bell,
    badge: 'Truyền thông',
  },
  {
    id: 'audit_logs',
    title: 'Nhật ký quản trị',
    description: 'Theo dõi lịch sử truy vết và thao tác quản trị viên trên hệ thống.',
    url: '/admin/audit-logs',
    icon: ShieldCheck,
    badge: 'Bảo mật',
  },
  {
    id: 'settings',
    title: 'Cấu hình vận hành',
    description: 'Thiết lập ngưỡng điểm liệt, quy tắc kiểm duyệt và dữ liệu mẫu.',
    url: '/admin/settings',
    icon: Settings,
    badge: 'Cấu hình',
  },
]

export const AdminQuickActions: React.FC = () => {
  return (
    <div className="admin-quick-actions-section">
      <div className="admin-quick-actions-header">
        <h2 className="staff-card-title">Lối tắt tác vụ điều hành</h2>
        <span className="admin-card-subtitle">
          Truy cập nhanh tới các không gian làm việc chuyên biệt
        </span>
      </div>

      <div className="admin-quick-actions-grid">
        {DEFAULT_QUICK_ACTIONS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              to={item.url}
              className="admin-quick-action-card"
              aria-label={`Truy cập ${item.title}`}
            >
              <div className="admin-quick-action-top">
                <div className="admin-quick-action-icon-wrap" aria-hidden="true">
                  <Icon size={20} />
                </div>
                {item.badge && (
                  <span className="admin-quick-action-badge">{item.badge}</span>
                )}
              </div>
              <div className="admin-quick-action-content">
                <h3 className="admin-quick-action-title">{item.title}</h3>
                <p className="admin-quick-action-desc">{item.description}</p>
              </div>
              <div className="admin-quick-action-arrow">
                <span>Vào không gian</span>
                <ArrowRight size={14} aria-hidden="true" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
