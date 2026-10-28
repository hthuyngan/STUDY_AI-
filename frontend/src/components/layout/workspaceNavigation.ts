import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CheckSquare,
  FileCheck,
  FileText,
  GraduationCap,
  History,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Sliders,
  Users,
} from 'lucide-react'
import type { UserRole } from '@/auth/auth.types'

export interface WorkspaceNavItem {
  id: string
  label: string
  path: string
  icon: LucideIcon
  badge?: string | number
}

export interface WorkspaceNavGroup {
  id: string
  title: string
  items: WorkspaceNavItem[]
}

export interface WorkspaceConfig {
  role: UserRole
  name: string
  subLabel: string
  badgeText: string
  basePath: string
  groups: WorkspaceNavGroup[]
}

export const WORKSPACE_CONFIGS: Record<Exclude<UserRole, 'learner'>, WorkspaceConfig> = {
  admin: {
    role: 'admin',
    name: 'Quản trị hệ thống',
    subLabel: 'ADMIN',
    badgeText: 'Quản trị viên',
    basePath: '/admin',
    groups: [
      {
        id: 'overview',
        title: 'TỔNG QUAN',
        items: [
          {
            id: 'admin-dashboard',
            label: 'Bảng điều khiển',
            path: '/admin',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        id: 'users-staff',
        title: 'NGƯỜI DÙNG & NHÂN SỰ',
        items: [
          {
            id: 'admin-users',
            label: 'Danh sách người dùng',
            path: '/admin/users',
            icon: Users,
          },
          {
            id: 'admin-teachers',
            label: 'Quản lý nhân sự',
            path: '/admin/teachers',
            icon: GraduationCap,
          },
          {
            id: 'admin-roles',
            label: 'Phân quyền & Vai trò',
            path: '/admin/roles',
            icon: Shield,
          },
        ],
      },
      {
        id: 'monitoring',
        title: 'GIÁM SÁT & BÁO CÁO',
        items: [
          {
            id: 'admin-content-monitor',
            label: 'Giám sát nội dung',
            path: '/admin/content-monitor',
            icon: FileCheck,
            badge: 2,
          },
          {
            id: 'admin-support-monitor',
            label: 'Giám sát hỗ trợ',
            path: '/admin/support-monitor',
            icon: LifeBuoy,
            badge: 3,
          },
          {
            id: 'admin-reports',
            label: 'Báo cáo tổng hợp',
            path: '/admin/reports',
            icon: BarChart3,
          },
        ],
      },
      {
        id: 'operations',
        title: 'VẬN HÀNH HỆ THỐNG',
        items: [
          {
            id: 'admin-announcements',
            label: 'Thông báo hệ thống',
            path: '/admin/announcements',
            icon: Bell,
          },
          {
            id: 'admin-audit-logs',
            label: 'Nhật ký quản trị',
            path: '/admin/audit-logs',
            icon: Activity,
          },
          {
            id: 'admin-system',
            label: 'Trạng thái hệ thống',
            path: '/admin/system',
            icon: Sliders,
          },
          {
            id: 'admin-settings',
            label: 'Thiết lập vận hành',
            path: '/admin/settings',
            icon: Settings,
          },
        ],
      },
    ],
  },

  teacher: {
    role: 'teacher',
    name: 'Không gian giáo viên',
    subLabel: 'TEACHER',
    badgeText: 'Giáo viên',
    basePath: '/teacher',
    groups: [
      {
        id: 'overview',
        title: 'Tổng quan',
        items: [
          {
            id: 'teacher-dashboard',
            label: 'Bàn làm việc',
            path: '/teacher',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        id: 'teaching',
        title: 'Quản lý giảng dạy',
        items: [
          {
            id: 'teacher-classes',
            label: 'Lớp học',
            path: '/teacher/classes',
            icon: GraduationCap,
          },
          {
            id: 'teacher-students',
            label: 'Học viên',
            path: '/teacher/students',
            icon: Users,
          },
          {
            id: 'teacher-assignments',
            label: 'Bài tập',
            path: '/teacher/assignments',
            icon: FileText,
          },
        ],
      },
      {
        id: 'performance',
        title: 'Kết quả học tập',
        items: [
          {
            id: 'teacher-grades',
            label: 'Bảng điểm',
            path: '/teacher/grades',
            icon: Award,
          },
          {
            id: 'teacher-alerts',
            label: 'Cảnh báo học tập',
            path: '/teacher/alerts',
            icon: AlertTriangle,
            badge: 3,
          },
        ],
      },
    ],
  },

  content: {
    role: 'content',
    name: 'Quản lý nội dung',
    subLabel: 'CONTENT',
    badgeText: 'Nội dung',
    basePath: '/content',
    groups: [
      {
        id: 'overview',
        title: 'TỔNG QUAN',
        items: [
          {
            id: 'content-dashboard',
            label: 'Bảng nội dung',
            path: '/content',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        id: 'curriculum',
        title: 'GIÁO TRÌNH',
        items: [
          {
            id: 'content-subjects',
            label: 'Môn học',
            path: '/content/subjects',
            icon: BookOpen,
          },
          {
            id: 'content-chapters',
            label: 'Chương học',
            path: '/content/chapters',
            icon: Layers,
          },
          {
            id: 'content-lessons',
            label: 'Bài học',
            path: '/content/lessons',
            icon: FileText,
          },
        ],
      },
      {
        id: 'assessments-group',
        title: 'ĐÁNH GIÁ',
        items: [
          {
            id: 'content-assessments',
            label: 'Bài thu hoạch',
            path: '/content/assessments',
            icon: CheckSquare,
          },
        ],
      },
      {
        id: 'editorial',
        title: 'KIỂM DUYỆT',
        items: [
          {
            id: 'content-review',
            label: 'Hàng đợi duyệt',
            path: '/content/review',
            icon: FileCheck,
            badge: 2,
          },
          {
            id: 'content-publications',
            label: 'Lịch sử xuất bản',
            path: '/content/publications',
            icon: History,
          },
        ],
      },
    ],
  },

  support: {
    role: 'support',
    name: 'Trung tâm hỗ trợ',
    subLabel: 'SUPPORT',
    badgeText: 'Hỗ trợ',
    basePath: '/support',
    groups: [
      {
        id: 'overview',
        title: 'TỔNG QUAN',
        items: [
          {
            id: 'support-dashboard',
            label: 'Hàng chờ hỗ trợ',
            path: '/support',
            icon: LayoutDashboard,
          },
        ],
      },
      {
        id: 'tickets',
        title: 'HỖ TRỢ',
        items: [
          {
            id: 'support-tickets',
            label: 'Tất cả tickets',
            path: '/support/tickets',
            icon: MessageSquare,
            badge: 3,
          },
        ],
      },
      {
        id: 'users',
        title: 'NGƯỜI DÙNG',
        items: [
          {
            id: 'support-users',
            label: 'Tra cứu tài khoản',
            path: '/support/users',
            icon: Search,
          },
        ],
      },
    ],
  },
}

export function getWorkspaceConfig(role?: UserRole): WorkspaceConfig {
  if (role && role !== 'learner' && WORKSPACE_CONFIGS[role]) {
    return WORKSPACE_CONFIGS[role]
  }
  return WORKSPACE_CONFIGS.admin
}

export function getWorkspaceNavigation(role?: UserRole): WorkspaceNavGroup[] {
  return getWorkspaceConfig(role).groups
}

export const ROLE_LABELS: Record<UserRole, string> = {
  learner: 'Học viên',
  teacher: 'Giáo viên',
  content: 'Biên tập viên',
  support: 'Hỗ trợ viên',
  admin: 'Quản trị viên',
}
